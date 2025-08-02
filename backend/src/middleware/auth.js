const jwt = require('jsonwebtoken');
const { AuthenticationError, AuthorizationError } = require('./errorHandler');
const { getSession } = require('../config/redis');
const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');

// Middleware de autenticação
async function authenticate(req, res, next) {
  try {
    // Extrair token do header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Token de acesso requerido');
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    // Verificar e decodificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verificar se usuário ainda existe e está ativo
    const users = await executeQuery(
      'SELECT id_usuario, nome, email, papel, ativo FROM usuarios WHERE id_usuario = $1',
      [decoded.id_usuario]
    );

    const user = users[0];
    if (!user) {
      throw new AuthenticationError('Usuário não encontrado');
    }

    if (!user.ativo) {
      throw new AuthenticationError('Usuário desativado');
    }

    // Adicionar dados do usuário à requisição
    req.user = {
      id_usuario: user.id_usuario,
      nome: user.nome,
      email: user.email,
      papel: user.papel
    };

    // Log da autenticação
    logger.auth('Usuário autenticado:', {
      userId: user.id_usuario,
      email: user.email,
      endpoint: req.originalUrl,
      method: req.method
    });

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new AuthenticationError('Token inválido'));
    } else if (error.name === 'TokenExpiredError') {
      next(new AuthenticationError('Token expirado'));
    } else if (error.name === 'NotBeforeError') {
      next(new AuthenticationError('Token ainda não é válido'));
    } else {
      next(error);
    }
  }
}

// Middleware de autorização por papel
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('Usuário não autenticado'));
    }

    if (!allowedRoles.includes(req.user.papel)) {
      logger.security('Tentativa de acesso não autorizado:', {
        userId: req.user.id_usuario,
        userRole: req.user.papel,
        requiredRoles: allowedRoles,
        endpoint: req.originalUrl,
        method: req.method
      });

      return next(new AuthorizationError(
        `Acesso negado. Papéis permitidos: ${allowedRoles.join(', ')}`
      ));
    }

    next();
  };
}

// Middleware para verificar se é o próprio usuário ou admin
function authorizeOwnerOrAdmin(userIdParam = 'id') {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('Usuário não autenticado'));
    }

    const targetUserId = parseInt(req.params[userIdParam]);
    const currentUserId = req.user.id_usuario;
    const isAdmin = req.user.papel === 'admin';

    if (!isAdmin && currentUserId !== targetUserId) {
      logger.security('Tentativa de acesso a dados de outro usuário:', {
        currentUserId,
        targetUserId,
        endpoint: req.originalUrl,
        method: req.method
      });

      return next(new AuthorizationError(
        'Você só pode acessar seus próprios dados'
      ));
    }

    next();
  };
}

// Middleware opcional de autenticação (não falha se não houver token)
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continua sem autenticação
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verificar se usuário existe
    const users = await executeQuery(
      'SELECT id_usuario, nome, email, papel, ativo FROM usuarios WHERE id_usuario = $1',
      [decoded.id_usuario]
    );

    const user = users[0];
    if (user && user.ativo) {
      req.user = {
        id_usuario: user.id_usuario,
        nome: user.nome,
        email: user.email,
        papel: user.papel
      };
    }

    next();
  } catch (error) {
    // Em caso de erro, continua sem autenticação
    next();
  }
}

// Middleware para verificar permissões específicas
function checkPermission(permission) {
  const rolePermissions = {
    admin: [
      'users:read', 'users:write', 'users:delete',
      'trees:read', 'trees:write', 'trees:delete',
      'inspections:read', 'inspections:write', 'inspections:delete',
      'species:read', 'species:write', 'species:delete',
      'reports:read', 'reports:write', 'reports:delete',
      'system:read', 'system:write'
    ],
    inspetor: [
      'trees:read', 'trees:write',
      'inspections:read', 'inspections:write',
      'species:read',
      'reports:read', 'reports:write',
      'sync:read', 'sync:write'
    ],
    visualizador: [
      'trees:read',
      'inspections:read',
      'species:read',
      'reports:read'
    ]
  };

  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('Usuário não autenticado'));
    }

    const userPermissions = rolePermissions[req.user.papel] || [];
    
    if (!userPermissions.includes(permission)) {
      logger.security('Permissão negada:', {
        userId: req.user.id_usuario,
        userRole: req.user.papel,
        requiredPermission: permission,
        endpoint: req.originalUrl,
        method: req.method
      });

      return next(new AuthorizationError(
        `Permissão '${permission}' requerida`
      ));
    }

    next();
  };
}

// Middleware para rate limiting por usuário
function userRateLimit(maxRequests = 100, windowMs = 15 * 60 * 1000) {
  const { checkRateLimit } = require('../config/redis');
  
  return async (req, res, next) => {
    if (!req.user) {
      return next();
    }

    try {
      const key = `rate_limit:user:${req.user.id_usuario}`;
      const window = Math.floor(windowMs / 1000);
      
      const result = await checkRateLimit(key, maxRequests, window);
      
      // Adicionar headers de rate limit
      res.set({
        'X-RateLimit-Limit': maxRequests,
        'X-RateLimit-Remaining': result.remaining,
        'X-RateLimit-Reset': new Date(Date.now() + windowMs).toISOString()
      });

      if (!result.allowed) {
        logger.security('Rate limit excedido por usuário:', {
          userId: req.user.id_usuario,
          current: result.current,
          limit: maxRequests
        });

        return next(new AuthorizationError(
          'Limite de requisições por usuário excedido'
        ));
      }

      next();
    } catch (error) {
      // Em caso de erro no Redis, permitir a requisição
      logger.error('Erro no rate limiting por usuário:', error);
      next();
    }
  };
}

// Middleware para log de auditoria
function auditLog(action) {
  return async (req, res, next) => {
    if (!req.user) {
      return next();
    }

    // Interceptar res.json para capturar o resultado
    const originalJson = res.json;
    res.json = function(data) {
      // Log da ação após resposta
      setImmediate(() => {
        logger.auth('Ação auditada:', {
          userId: req.user.id_usuario,
          action,
          endpoint: req.originalUrl,
          method: req.method,
          success: data.success,
          statusCode: res.statusCode,
          timestamp: new Date().toISOString()
        });
      });

      return originalJson.call(this, data);
    };

    next();
  };
}

// Middleware para verificar se usuário pode acessar árvore específica
async function canAccessTree(req, res, next) {
  try {
    if (!req.user) {
      return next(new AuthenticationError('Usuário não autenticado'));
    }

    // Admins podem acessar qualquer árvore
    if (req.user.papel === 'admin') {
      return next();
    }

    const treeId = req.params.id || req.body.id_arvore;
    
    if (!treeId) {
      return next();
    }

    // Verificar se usuário criou a árvore ou fez alguma inspeção nela
    const access = await executeQuery(`
      SELECT 1 FROM arvores a
      WHERE a.id_arvore = $1 
      AND (
        a.id_usuario_criador = $2 
        OR EXISTS (
          SELECT 1 FROM inspecoes i 
          WHERE i.id_arvore = a.id_arvore 
          AND i.id_usuario = $2
        )
      )
    `, [treeId, req.user.id_usuario]);

    if (access.length === 0) {
      return next(new AuthorizationError(
        'Você não tem permissão para acessar esta árvore'
      ));
    }

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  authenticate,
  authorize,
  authorizeOwnerOrAdmin,
  optionalAuth,
  checkPermission,
  userRateLimit,
  auditLog,
  canAccessTree
};