const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const authRoutes = require('./auth');
const treesRoutes = require('./trees');
const inspectionsRoutes = require('./inspections');
const speciesRoutes = require('./species');
const usersRoutes = require('./users');
const reportsRoutes = require('./reports');
const syncRoutes = require('./sync');
const systemRoutes = require('./system');

const { cacheMiddleware } = require('../config/redis');
const logger = require('../utils/logger');

const router = express.Router();

// ==============================================
// SWAGGER DOCUMENTATION
// ==============================================

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TreeInspector API',
      version: '1.0.0',
      description: 'API REST para o sistema TreeInspector - Plataforma de inspeção de árvores',
      contact: {
        name: 'TreeInspector Team',
        email: 'suporte@treeinspector.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://api.treeinspector.com/api'
          : `http://localhost:${process.env.PORT || 3000}/api`,
        description: process.env.NODE_ENV === 'production' ? 'Servidor de Produção' : 'Servidor de Desenvolvimento'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtido através do endpoint de login'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              example: 'Mensagem de erro'
            },
            code: {
              type: 'string',
              example: 'ERROR_CODE'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-20T15:00:00Z'
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              description: 'Dados da resposta'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-20T15:00:00Z'
            }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              example: 1
            },
            limit: {
              type: 'integer',
              example: 20
            },
            total: {
              type: 'integer',
              example: 150
            },
            totalPages: {
              type: 'integer',
              example: 8
            }
          }
        },
        Location: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['Point'],
              example: 'Point'
            },
            coordinates: {
              type: 'array',
              items: {
                type: 'number'
              },
              minItems: 2,
              maxItems: 2,
              example: [-46.6333, -23.5505]
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.js'] // Caminho para os arquivos com anotações Swagger
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Servir documentação Swagger apenas em desenvolvimento
if (process.env.NODE_ENV === 'development' || process.env.ENABLE_SWAGGER === 'true') {
  router.use('/docs', swaggerUi.serve);
  router.get('/docs', swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'TreeInspector API Documentation'
  }));
  
  // Endpoint para obter spec JSON
  router.get('/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  
  logger.info('📚 Swagger documentation available at /api/docs');
}

// ==============================================
// MIDDLEWARE DE LOG PARA ROTAS
// ==============================================

router.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id_usuario || null
    };
    
    if (res.statusCode >= 400) {
      logger.error('Request failed:', logData);
    } else {
      logger.http('Request completed:', logData);
    }
  });
  
  next();
});

// ==============================================
// ROTAS DA API
// ==============================================

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Verificar saúde da API
 *     tags: [System]
 *     security: []
 *     responses:
 *       200:
 *         description: API funcionando normalmente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "TreeInspector API está funcionando"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 environment:
 *                   type: string
 *                   example: "development"
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'TreeInspector API está funcionando',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Rotas de autenticação (sem cache)
router.use('/auth', authRoutes);

// Rotas de árvores (com cache para GET)
router.use('/trees', treesRoutes);

// Rotas de inspeções (sem cache por serem dados dinâmicos)
router.use('/inspections', inspectionsRoutes);

// Rotas de espécies (com cache longo para GET)
router.use('/species', speciesRoutes);

// Rotas de usuários (sem cache)
router.use('/users', usersRoutes);

// Rotas de relatórios (sem cache)
router.use('/reports', reportsRoutes);

// Rotas de sincronização (sem cache)
router.use('/sync', syncRoutes);

// Rotas do sistema (com cache curto)
router.use('/system', systemRoutes);

// ==============================================
// ROTAS DE INFORMAÇÃO
// ==============================================

/**
 * @swagger
 * /info:
 *   get:
 *     summary: Informações da API
 *     tags: [System]
 *     security: []
 *     responses:
 *       200:
 *         description: Informações da API
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
 *                     name:
 *                       type: string
 *                     version:
 *                       type: string
 *                     description:
 *                       type: string
 *                     environment:
 *                       type: string
 *                     uptime:
 *                       type: string
 *                     endpoints:
 *                       type: array
 *                       items:
 *                         type: string
 */
router.get('/info', cacheMiddleware(300), (req, res) => {
  const uptime = process.uptime();
  const uptimeString = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`;
  
  res.json({
    success: true,
    data: {
      name: 'TreeInspector API',
      version: process.env.npm_package_version || '1.0.0',
      description: 'API REST para o sistema TreeInspector - Plataforma de inspeção de árvores',
      environment: process.env.NODE_ENV || 'development',
      uptime: uptimeString,
      endpoints: [
        'GET /api/health - Verificar saúde da API',
        'GET /api/info - Informações da API',
        'POST /api/auth/login - Autenticação',
        'GET /api/trees - Listar árvores',
        'POST /api/inspections - Criar inspeção',
        'GET /api/species - Listar espécies',
        'POST /api/sync/upload - Sincronizar dados',
        'GET /api/reports - Listar relatórios'
      ]
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * @swagger
 * /version:
 *   get:
 *     summary: Versão da API
 *     tags: [System]
 *     security: []
 *     responses:
 *       200:
 *         description: Versão da API
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 version:
 *                   type: string
 *                 build:
 *                   type: string
 *                 timestamp:
 *                   type: string
 */
router.get('/version', cacheMiddleware(3600), (req, res) => {
  res.json({
    success: true,
    version: process.env.npm_package_version || '1.0.0',
    build: process.env.BUILD_NUMBER || 'development',
    timestamp: new Date().toISOString()
  });
});

// ==============================================
// MIDDLEWARE DE ESTATÍSTICAS
// ==============================================

// Contador de requisições por endpoint
const requestStats = new Map();

router.use((req, res, next) => {
  const endpoint = `${req.method} ${req.route?.path || req.path}`;
  const current = requestStats.get(endpoint) || 0;
  requestStats.set(endpoint, current + 1);
  next();
});

/**
 * @swagger
 * /stats:
 *   get:
 *     summary: Estatísticas da API
 *     tags: [System]
 *     security: []
 *     responses:
 *       200:
 *         description: Estatísticas de uso da API
 */
router.get('/stats', cacheMiddleware(60), (req, res) => {
  const stats = Object.fromEntries(requestStats);
  const totalRequests = Array.from(requestStats.values()).reduce((sum, count) => sum + count, 0);
  
  res.json({
    success: true,
    data: {
      totalRequests,
      endpointStats: stats,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString()
    }
  });
});

module.exports = router;