const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Criar diretório de logs se não existir
const logDir = path.join(__dirname, '../../logs');
require('fs').mkdirSync(logDir, { recursive: true });

// Configuração de cores para console
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Formato personalizado para logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Formato para console (desenvolvimento)
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    // Adicionar stack trace se for erro
    if (stack) {
      log += `\n${stack}`;
    }
    
    // Adicionar metadados se existirem
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Configuração de transports
const transports = [];

// Console transport (sempre ativo em desenvolvimento)
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: process.env.LOG_LEVEL || 'debug'
    })
  );
}

// File transport para todos os logs
transports.push(
  new DailyRotateFile({
    filename: path.join(logDir, 'app-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    format: logFormat,
    level: 'info'
  })
);

// File transport para erros
transports.push(
  new DailyRotateFile({
    filename: path.join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    format: logFormat,
    level: 'error'
  })
);

// File transport para debug (apenas em desenvolvimento)
if (process.env.NODE_ENV === 'development') {
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, 'debug-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '10m',
      maxFiles: '7d',
      format: logFormat,
      level: 'debug'
    })
  );
}

// Criar logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'treeinspector-api',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  },
  transports,
  // Não sair em caso de erro
  exitOnError: false
});

// Função para log de requisições HTTP
logger.http = (message, meta = {}) => {
  logger.log('http', message, meta);
};

// Função para log de banco de dados
logger.db = (message, meta = {}) => {
  logger.info(`[DB] ${message}`, meta);
};

// Função para log de cache
logger.cache = (message, meta = {}) => {
  logger.debug(`[CACHE] ${message}`, meta);
};

// Função para log de autenticação
logger.auth = (message, meta = {}) => {
  logger.info(`[AUTH] ${message}`, meta);
};

// Função para log de sync
logger.sync = (message, meta = {}) => {
  logger.info(`[SYNC] ${message}`, meta);
};

// Função para log de API externa
logger.external = (message, meta = {}) => {
  logger.info(`[EXTERNAL] ${message}`, meta);
};

// Função para log de performance
logger.performance = (message, duration, meta = {}) => {
  logger.info(`[PERF] ${message} (${duration}ms)`, meta);
};

// Função para log de segurança
logger.security = (message, meta = {}) => {
  logger.warn(`[SECURITY] ${message}`, meta);
};

// Função para log estruturado
logger.structured = (level, message, data = {}) => {
  logger.log(level, message, {
    ...data,
    timestamp: new Date().toISOString(),
    pid: process.pid
  });
};

// Middleware para capturar logs não tratados
if (process.env.NODE_ENV === 'production') {
  // Capturar uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // Dar tempo para escrever o log antes de sair
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  // Capturar unhandled rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection:', {
      reason: reason,
      promise: promise,
      timestamp: new Date().toISOString()
    });
  });
}

// Função para criar child logger com contexto
logger.child = (context) => {
  return {
    error: (message, meta = {}) => logger.error(message, { ...context, ...meta }),
    warn: (message, meta = {}) => logger.warn(message, { ...context, ...meta }),
    info: (message, meta = {}) => logger.info(message, { ...context, ...meta }),
    http: (message, meta = {}) => logger.http(message, { ...context, ...meta }),
    debug: (message, meta = {}) => logger.debug(message, { ...context, ...meta }),
    db: (message, meta = {}) => logger.db(message, { ...context, ...meta }),
    cache: (message, meta = {}) => logger.cache(message, { ...context, ...meta }),
    auth: (message, meta = {}) => logger.auth(message, { ...context, ...meta }),
    sync: (message, meta = {}) => logger.sync(message, { ...context, ...meta }),
    external: (message, meta = {}) => logger.external(message, { ...context, ...meta }),
    performance: (message, duration, meta = {}) => logger.performance(message, duration, { ...context, ...meta }),
    security: (message, meta = {}) => logger.security(message, { ...context, ...meta })
  };
};

// Função para medir tempo de execução
logger.time = (label) => {
  const start = Date.now();
  
  return {
    end: (message = label) => {
      const duration = Date.now() - start;
      logger.performance(message, duration);
      return duration;
    }
  };
};

// Função para log de startup
logger.startup = (message, meta = {}) => {
  logger.info(`🚀 ${message}`, meta);
};

// Função para log de shutdown
logger.shutdown = (message, meta = {}) => {
  logger.info(`🛑 ${message}`, meta);
};

// Função para limpar logs antigos (utilitário)
logger.cleanup = async (days = 30) => {
  const fs = require('fs').promises;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  try {
    const files = await fs.readdir(logDir);
    
    for (const file of files) {
      const filePath = path.join(logDir, file);
      const stats = await fs.stat(filePath);
      
      if (stats.mtime < cutoffDate) {
        await fs.unlink(filePath);
        logger.info(`Log antigo removido: ${file}`);
      }
    }
  } catch (error) {
    logger.error('Erro ao limpar logs antigos:', error);
  }
};

// Exportar logger
module.exports = logger;