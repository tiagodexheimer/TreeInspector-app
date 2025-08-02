const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('express-async-errors');
require('dotenv').config();

const logger = require('./utils/logger');
const { connectDatabase } = require('./config/database');
const { connectRedis } = require('./config/redis');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// ==============================================
// MIDDLEWARE DE SEGURANÇA
// ==============================================

// Helmet para headers de segurança
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // máximo 100 requests por IP
  message: {
    success: false,
    error: 'Muitas requisições. Tente novamente em alguns minutos.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// ==============================================
// MIDDLEWARE GERAL
// ==============================================

// Compressão
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

// Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir arquivos estáticos (uploads)
app.use('/uploads', express.static('uploads'));

// ==============================================
// HEALTH CHECK
// ==============================================

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'TreeInspector API está funcionando',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// ==============================================
// ROTAS DA API
// ==============================================

app.use('/api', routes);

// Rota 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint não encontrado',
    code: 'ENDPOINT_NOT_FOUND',
    path: req.originalUrl,
    method: req.method
  });
});

// ==============================================
// MIDDLEWARE DE ERRO
// ==============================================

app.use(errorHandler);

// ==============================================
// INICIALIZAÇÃO DO SERVIDOR
// ==============================================

async function startServer() {
  try {
    // Conectar ao banco de dados
    await connectDatabase();
    logger.info('✅ Conectado ao PostgreSQL');

    // Conectar ao Redis
    await connectRedis();
    logger.info('✅ Conectado ao Redis');

    // Iniciar servidor
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Servidor TreeInspector rodando na porta ${PORT}`);
      logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🌐 API URL: http://localhost:${PORT}/api`);
      logger.info(`❤️  Health Check: http://localhost:${PORT}/api/health`);
      
      if (process.env.NODE_ENV === 'development') {
        logger.info(`📚 Swagger Docs: http://localhost:${PORT}/api/docs`);
      }
    });

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      logger.info(`\n🛑 Recebido sinal ${signal}. Iniciando shutdown graceful...`);
      
      server.close(async () => {
        logger.info('✅ Servidor HTTP fechado');
        
        try {
          // Fechar conexões do banco
          const { sequelize } = require('./config/database');
          await sequelize.close();
          logger.info('✅ Conexão PostgreSQL fechada');

          // Fechar conexão Redis
          const { redisClient } = require('./config/redis');
          await redisClient.quit();
          logger.info('✅ Conexão Redis fechada');

          logger.info('👋 Shutdown completo. Até logo!');
          process.exit(0);
        } catch (error) {
          logger.error('❌ Erro durante shutdown:', error);
          process.exit(1);
        }
      });

      // Forçar shutdown após 30 segundos
      setTimeout(() => {
        logger.error('⚠️  Forçando shutdown após timeout');
        process.exit(1);
      }, 30000);
    };

    // Handlers para sinais de shutdown
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handler para erros não capturados
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });

    process.on('uncaughtException', (error) => {
      logger.error('❌ Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

  } catch (error) {
    logger.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

// Iniciar servidor apenas se não estiver sendo importado para testes
if (require.main === module) {
  startServer();
}

module.exports = app;