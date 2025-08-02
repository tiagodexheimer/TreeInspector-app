const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');

const { asyncHandler, validateSchema, ValidationError, AuthenticationError } = require('../middleware/errorHandler');
const { setSession, deleteSession } = require('../config/redis');
const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

// Rate limiting específico para autenticação
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas por IP
  message: {
    success: false,
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Schemas de validação
const loginSchema = {
  email: body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email deve ser válido'),
  senha: body('senha')
    .isLength({ min: 6 })
    .withMessage('Senha deve ter pelo menos 6 caracteres')
};

const registerSchema = {
  nome: body('nome')
    .isLength({ min: 2, max: 100 })
    .trim()
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
  email: body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email deve ser válido'),
  senha: body('senha')
    .isLength({ min: 6, max: 128 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Senha deve ter pelo menos 6 caracteres, incluindo maiúscula, minúscula e número'),
  papel: body('papel')
    .optional()
    .isIn(['admin', 'inspetor', 'visualizador'])
    .withMessage('Papel deve ser admin, inspetor ou visualizador')
};

const refreshTokenSchema = {
  refreshToken: body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token é obrigatório')
};

// Funções auxiliares
function generateTokens(user) {
  const payload = {
    id_usuario: user.id_usuario,
    email: user.email,
    nome: user.nome,
    papel: user.papel
  };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    issuer: 'treeinspector-api',
    audience: 'treeinspector-app'
  });

  const refreshToken = jwt.sign(
    { id_usuario: user.id_usuario },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      issuer: 'treeinspector-api',
      audience: 'treeinspector-app'
    }
  );

  return { accessToken, refreshToken };
}

async function findUserByEmail(email) {
  const users = await executeQuery(
    'SELECT * FROM usuarios WHERE email = $1 AND ativo = true',
    [email]
  );
  return users[0] || null;
}

async function findUserById(id) {
  const users = await executeQuery(
    'SELECT * FROM usuarios WHERE id_usuario = $1 AND ativo = true',
    [id]
  );
  return users[0] || null;
}

async function createUser(userData) {
  const { nome, email, senha, papel = 'inspetor' } = userData;
  
  // Verificar se email já existe
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new ValidationError('Email já está em uso');
  }

  // Hash da senha
  const senhaHash = await bcrypt.hash(senha, 12);

  // Inserir usuário
  const result = await executeQuery(`
    INSERT INTO usuarios (nome, email, senha_hash, papel)
    VALUES ($1, $2, $3, $4)
    RETURNING id_usuario, nome, email, papel, created_at
  `, [nome, email, senhaHash, papel]);

  return result[0];
}

async function updateLastLogin(userId) {
  await executeQuery(
    'UPDATE usuarios SET ultimo_login = NOW() WHERE id_usuario = $1',
    [userId]
  );
}

// ==============================================
// ROTAS DE AUTENTICAÇÃO
// ==============================================

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Registrar novo usuário
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *               - email
 *               - senha
 *             properties:
 *               nome:
 *                 type: string
 *                 example: "João Silva"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "joao@email.com"
 *               senha:
 *                 type: string
 *                 minLength: 6
 *                 example: "MinhaSenh@123"
 *               papel:
 *                 type: string
 *                 enum: [admin, inspetor, visualizador]
 *                 default: inspetor
 *                 example: "inspetor"
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id_usuario:
 *                           type: integer
 *                         nome:
 *                           type: string
 *                         email:
 *                           type: string
 *                         papel:
 *                           type: string
 *                     token:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       400:
 *         description: Dados inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register', 
  authLimiter,
  Object.values(registerSchema),
  asyncHandler(async (req, res) => {
    const { nome, email, senha, papel } = req.body;

    logger.auth('Tentativa de registro:', { email, papel });

    // Criar usuário
    const user = await createUser({ nome, email, senha, papel });

    // Gerar tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Salvar sessão
    await setSession(refreshToken, {
      userId: user.id_usuario,
      email: user.email,
      papel: user.papel
    }, 7 * 24 * 60 * 60); // 7 dias

    logger.auth('Usuário registrado com sucesso:', { 
      userId: user.id_usuario, 
      email: user.email 
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id_usuario: user.id_usuario,
          nome: user.nome,
          email: user.email,
          papel: user.papel
        },
        token: accessToken,
        refreshToken
      },
      message: 'Usuário criado com sucesso'
    });
  })
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Autenticar usuário
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - senha
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "joao@email.com"
 *               senha:
 *                 type: string
 *                 example: "MinhaSenh@123"
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id_usuario:
 *                           type: integer
 *                         nome:
 *                           type: string
 *                         email:
 *                           type: string
 *                         papel:
 *                           type: string
 *                     token:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       401:
 *         description: Credenciais inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login',
  authLimiter,
  Object.values(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, senha } = req.body;

    logger.auth('Tentativa de login:', { email, ip: req.ip });

    // Buscar usuário
    const user = await findUserByEmail(email);
    if (!user) {
      logger.security('Tentativa de login com email inexistente:', { email, ip: req.ip });
      throw new AuthenticationError('Email ou senha incorretos');
    }

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, user.senha_hash);
    if (!senhaValida) {
      logger.security('Tentativa de login com senha incorreta:', { 
        email, 
        userId: user.id_usuario, 
        ip: req.ip 
      });
      throw new AuthenticationError('Email ou senha incorretos');
    }

    // Atualizar último login
    await updateLastLogin(user.id_usuario);

    // Gerar tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Salvar sessão
    await setSession(refreshToken, {
      userId: user.id_usuario,
      email: user.email,
      papel: user.papel
    }, 7 * 24 * 60 * 60); // 7 dias

    logger.auth('Login realizado com sucesso:', { 
      userId: user.id_usuario, 
      email: user.email 
    });

    res.json({
      success: true,
      data: {
        user: {
          id_usuario: user.id_usuario,
          nome: user.nome,
          email: user.email,
          papel: user.papel
        },
        token: accessToken,
        refreshToken
      },
      message: 'Login realizado com sucesso'
    });
  })
);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Renovar token de acesso
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Token renovado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       401:
 *         description: Refresh token inválido
 */
router.post('/refresh',
  Object.values(refreshTokenSchema),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    try {
      // Verificar refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
      
      // Buscar usuário
      const user = await findUserById(decoded.id_usuario);
      if (!user) {
        throw new AuthenticationError('Usuário não encontrado');
      }

      // Gerar novos tokens
      const tokens = generateTokens(user);

      // Remover sessão antiga e criar nova
      await deleteSession(refreshToken);
      await setSession(tokens.refreshToken, {
        userId: user.id_usuario,
        email: user.email,
        papel: user.papel
      }, 7 * 24 * 60 * 60);

      logger.auth('Token renovado:', { userId: user.id_usuario });

      res.json({
        success: true,
        data: {
          token: tokens.accessToken,
          refreshToken: tokens.refreshToken
        }
      });

    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AuthenticationError('Refresh token expirado');
      }
      throw new AuthenticationError('Refresh token inválido');
    }
  })
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Fazer logout
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Logout realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
router.post('/logout',
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    const userId = req.user?.id_usuario;

    if (refreshToken) {
      await deleteSession(refreshToken);
    }

    logger.auth('Logout realizado:', { userId });

    res.json({
      success: true,
      message: 'Logout realizado com sucesso'
    });
  })
);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Obter dados do usuário atual
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Dados do usuário
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id_usuario:
 *                           type: integer
 *                         nome:
 *                           type: string
 *                         email:
 *                           type: string
 *                         papel:
 *                           type: string
 *                         ultimo_login:
 *                           type: string
 *                         created_at:
 *                           type: string
 */
router.get('/me',
  require('../middleware/auth'),
  asyncHandler(async (req, res) => {
    const user = await findUserById(req.user.id_usuario);
    
    if (!user) {
      throw new AuthenticationError('Usuário não encontrado');
    }

    res.json({
      success: true,
      data: {
        user: {
          id_usuario: user.id_usuario,
          nome: user.nome,
          email: user.email,
          papel: user.papel,
          ultimo_login: user.ultimo_login,
          created_at: user.created_at
        }
      }
    });
  })
);

module.exports = router;