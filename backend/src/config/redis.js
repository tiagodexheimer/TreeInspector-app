const redis = require('redis');
const logger = require('../utils/logger');

// Cliente Redis
let redisClient = null;

// Configuração do Redis
const redisConfig = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    connectTimeout: 60000,
    lazyConnect: true,
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.error('Redis: Máximo de tentativas de reconexão atingido');
        return new Error('Redis connection failed');
      }
      return Math.min(retries * 50, 1000);
    }
  },
  // Configurações de performance
  database: 0,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxRetriesPerRequest: null,
  lazyConnect: true
};

// Função para conectar ao Redis
async function connectRedis() {
  try {
    if (redisClient && redisClient.isOpen) {
      return redisClient;
    }

    redisClient = redis.createClient(redisConfig);

    // Event listeners
    redisClient.on('connect', () => {
      logger.info('Redis: Conectando...');
    });

    redisClient.on('ready', () => {
      logger.info('Redis: Pronto para uso');
    });

    redisClient.on('error', (error) => {
      logger.error('Redis: Erro de conexão:', error);
    });

    redisClient.on('end', () => {
      logger.warn('Redis: Conexão encerrada');
    });

    redisClient.on('reconnecting', () => {
      logger.info('Redis: Tentando reconectar...');
    });

    // Conectar
    await redisClient.connect();
    
    // Testar conexão
    await redisClient.ping();
    logger.info('Redis: Conexão estabelecida com sucesso');

    return redisClient;
  } catch (error) {
    logger.error('Redis: Erro ao conectar:', error);
    throw error;
  }
}

// Função para desconectar
async function disconnectRedis() {
  try {
    if (redisClient && redisClient.isOpen) {
      await redisClient.quit();
      logger.info('Redis: Desconectado');
    }
  } catch (error) {
    logger.error('Redis: Erro ao desconectar:', error);
  }
}

// Função para testar conexão
async function testRedisConnection() {
  try {
    if (!redisClient || !redisClient.isOpen) {
      return false;
    }
    await redisClient.ping();
    return true;
  } catch (error) {
    logger.error('Redis: Erro no teste de conexão:', error);
    return false;
  }
}

// ==============================================
// FUNÇÕES DE CACHE
// ==============================================

// Função para definir cache
async function setCache(key, value, ttl = 3600) {
  try {
    if (!redisClient || !redisClient.isOpen) {
      logger.warn('Redis: Cliente não conectado, ignorando cache set');
      return false;
    }

    const serializedValue = JSON.stringify(value);
    await redisClient.setEx(key, ttl, serializedValue);
    logger.debug(`Redis: Cache definido para chave: ${key}`);
    return true;
  } catch (error) {
    logger.error('Redis: Erro ao definir cache:', error);
    return false;
  }
}

// Função para obter cache
async function getCache(key) {
  try {
    if (!redisClient || !redisClient.isOpen) {
      logger.warn('Redis: Cliente não conectado, ignorando cache get');
      return null;
    }

    const value = await redisClient.get(key);
    if (value) {
      logger.debug(`Redis: Cache encontrado para chave: ${key}`);
      return JSON.parse(value);
    }
    return null;
  } catch (error) {
    logger.error('Redis: Erro ao obter cache:', error);
    return null;
  }
}

// Função para deletar cache
async function deleteCache(key) {
  try {
    if (!redisClient || !redisClient.isOpen) {
      logger.warn('Redis: Cliente não conectado, ignorando cache delete');
      return false;
    }

    const result = await redisClient.del(key);
    logger.debug(`Redis: Cache deletado para chave: ${key}`);
    return result > 0;
  } catch (error) {
    logger.error('Redis: Erro ao deletar cache:', error);
    return false;
  }
}

// Função para deletar múltiplas chaves por padrão
async function deleteCachePattern(pattern) {
  try {
    if (!redisClient || !redisClient.isOpen) {
      logger.warn('Redis: Cliente não conectado, ignorando cache pattern delete');
      return 0;
    }

    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      const result = await redisClient.del(keys);
      logger.debug(`Redis: ${result} chaves deletadas com padrão: ${pattern}`);
      return result;
    }
    return 0;
  } catch (error) {
    logger.error('Redis: Erro ao deletar cache por padrão:', error);
    return 0;
  }
}

// Função para verificar se chave existe
async function existsCache(key) {
  try {
    if (!redisClient || !redisClient.isOpen) {
      return false;
    }

    const exists = await redisClient.exists(key);
    return exists === 1;
  } catch (error) {
    logger.error('Redis: Erro ao verificar existência:', error);
    return false;
  }
}

// Função para definir TTL
async function setTTL(key, ttl) {
  try {
    if (!redisClient || !redisClient.isOpen) {
      return false;
    }

    const result = await redisClient.expire(key, ttl);
    return result === 1;
  } catch (error) {
    logger.error('Redis: Erro ao definir TTL:', error);
    return false;
  }
}

// ==============================================
// FUNÇÕES DE SESSÃO
// ==============================================

// Função para definir sessão
async function setSession(sessionId, data, ttl = 86400) {
  const key = `session:${sessionId}`;
  return await setCache(key, data, ttl);
}

// Função para obter sessão
async function getSession(sessionId) {
  const key = `session:${sessionId}`;
  return await getCache(key);
}

// Função para deletar sessão
async function deleteSession(sessionId) {
  const key = `session:${sessionId}`;
  return await deleteCache(key);
}

// ==============================================
// FUNÇÕES DE RATE LIMITING
// ==============================================

// Função para rate limiting
async function checkRateLimit(key, limit, window) {
  try {
    if (!redisClient || !redisClient.isOpen) {
      return { allowed: true, remaining: limit };
    }

    const current = await redisClient.incr(key);
    
    if (current === 1) {
      await redisClient.expire(key, window);
    }

    const remaining = Math.max(0, limit - current);
    const allowed = current <= limit;

    return { allowed, remaining, current };
  } catch (error) {
    logger.error('Redis: Erro no rate limiting:', error);
    return { allowed: true, remaining: limit };
  }
}

// ==============================================
// FUNÇÕES DE MONITORAMENTO
// ==============================================

// Função para obter estatísticas
async function getRedisStats() {
  try {
    if (!redisClient || !redisClient.isOpen) {
      return null;
    }

    const info = await redisClient.info();
    const dbSize = await redisClient.dbSize();
    
    return {
      connected: true,
      database_size: dbSize,
      info: info,
      last_check: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Redis: Erro ao obter estatísticas:', error);
    return {
      connected: false,
      error: error.message,
      last_check: new Date().toISOString()
    };
  }
}

// Função para verificar saúde do Redis
async function checkRedisHealth() {
  try {
    const isConnected = await testRedisConnection();
    
    if (!isConnected) {
      return {
        status: 'unhealthy',
        connected: false,
        last_check: new Date().toISOString()
      };
    }

    const stats = await getRedisStats();
    
    return {
      status: 'healthy',
      connected: true,
      database_size: stats.database_size,
      last_check: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Redis: Erro ao verificar saúde:', error);
    return {
      status: 'unhealthy',
      connected: false,
      error: error.message,
      last_check: new Date().toISOString()
    };
  }
}

// ==============================================
// MIDDLEWARE DE CACHE
// ==============================================

// Middleware para cache de resposta
function cacheMiddleware(ttl = 300) {
  return async (req, res, next) => {
    // Só cachear GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `cache:${req.originalUrl}`;
    
    try {
      const cachedResponse = await getCache(cacheKey);
      
      if (cachedResponse) {
        logger.debug(`Cache hit: ${cacheKey}`);
        return res.json(cachedResponse);
      }

      // Interceptar res.json para cachear a resposta
      const originalJson = res.json;
      res.json = function(data) {
        // Só cachear respostas de sucesso
        if (res.statusCode === 200 && data.success) {
          setCache(cacheKey, data, ttl).catch(error => {
            logger.error('Erro ao cachear resposta:', error);
          });
        }
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('Erro no middleware de cache:', error);
      next();
    }
  };
}

module.exports = {
  redisClient,
  connectRedis,
  disconnectRedis,
  testRedisConnection,
  setCache,
  getCache,
  deleteCache,
  deleteCachePattern,
  existsCache,
  setTTL,
  setSession,
  getSession,
  deleteSession,
  checkRateLimit,
  getRedisStats,
  checkRedisHealth,
  cacheMiddleware
};