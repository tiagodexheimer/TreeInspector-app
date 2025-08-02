const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('express-async-errors');
require('dotenv').config();

const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');

// --- MODIFICAÇÃO PRINCIPAL ---
// Importamos agora o sequelize e as funções de conexão diretamente
// do ficheiro de configuração unificado.
const { sequelize, testConnection } = require('./config/database');
const { connectRedis, redisClient } = require('./config/redis');

const app = express();
const PORT = process.env.PORT || 3000;

// ==============================================
// MIDDLEWARE DE SEGURANÇA
// ==============================================
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
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
app.use(compression());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static('uploads'));

// ==============================================
// ROTAS DA API E HEALTH CHECK
// ==============================================
app.use('/api', routes);

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
// INICIALIZAÇÃO DO SERVIDOR (CORRIGIDO)
// ==============================================
async function startServer() {
  try {
    // Conectar ao banco de dados usando a função importada
    await testConnection();

    // Conectar ao Redis
    await connectRedis();

    const server = app.listen(PORT, () => {
      logger.info(`🚀 Servidor TreeInspector rodando na porta ${PORT}`);
      logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🌐 API URL: http://localhost:${PORT}/api`);
      logger.info(`❤️  Health Check: http://localhost:${PORT}/api/health`);
      
      if (process.env.NODE_ENV === 'development') {
        logger.info(`📚 Swagger Docs: http://localhost:${PORT}/api/docs`);
      }
    });

    const gracefulShutdown = (signal) => {
      logger.info(`\n🛑 Recebido sinal ${signal}. Iniciando shutdown graceful...`);
      
      server.close(async () => {
        logger.info('✅ Servidor HTTP fechado');
        try {
          // Fechar a conexão do Sequelize importado
          await sequelize.close();
          logger.info('✅ Conexão PostgreSQL fechada');

          // Fechar a conexão do Redis
          if (redisClient && redisClient.isOpen) {
            await redisClient.quit();
            logger.info('✅ Conexão Redis fechada');
          }

          logger.info('👋 Shutdown completo. Até logo!');
          process.exit(0);
        } catch (error) {
          logger.error('❌ Erro durante shutdown:', error);
          process.exit(1);
        }
      });

      setTimeout(() => {
        logger.error('⚠️  Forçando shutdown após timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
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

if (require.main === module) {
  startServer();
}

module.exports = app;