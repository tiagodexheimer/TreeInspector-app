const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

// Configuração do Sequelize
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  },
  logging: process.env.NODE_ENV === 'development' ? 
    (msg) => logger.debug(msg) : false,
  
  // Pool de conexões
  pool: {
    max: 20,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  
  // Configurações de performance
  define: {
    timestamps: true,
    underscored: false,
    freezeTableName: true
  },
  
  // Timezone
  timezone: '-03:00' // Brasília
});

// Função para conectar ao banco
async function connectDatabase() {
  try {
    await sequelize.authenticate();
    logger.info('Conexão com PostgreSQL estabelecida com sucesso');
    
    // Verificar se PostGIS está disponível
    const [results] = await sequelize.query("SELECT PostGIS_Version();");
    if (results && results.length > 0) {
      logger.info(`PostGIS versão: ${results[0].postgis_version}`);
    }
    
    return sequelize;
  } catch (error) {
    logger.error('Erro ao conectar com PostgreSQL:', error);
    throw error;
  }
}

// Função para sincronizar modelos (apenas em desenvolvimento)
async function syncDatabase(force = false) {
  try {
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ force });
      logger.info(`Banco sincronizado ${force ? '(force)' : ''}`);
    } else {
      logger.warn('Sync não executado em produção. Use migrações.');
    }
  } catch (error) {
    logger.error('Erro ao sincronizar banco:', error);
    throw error;
  }
}

// Função para testar conexão
async function testConnection() {
  try {
    await sequelize.authenticate();
    return true;
  } catch (error) {
    logger.error('Erro na conexão:', error);
    return false;
  }
}

// Função para executar query raw
async function executeQuery(query, replacements = {}) {
  try {
    const [results, metadata] = await sequelize.query(query, {
      replacements,
      type: Sequelize.QueryTypes.SELECT
    });
    return results;
  } catch (error) {
    logger.error('Erro ao executar query:', error);
    throw error;
  }
}

// Função para executar transação
async function executeTransaction(callback) {
  const transaction = await sequelize.transaction();
  
  try {
    const result = await callback(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    logger.error('Transação revertida:', error);
    throw error;
  }
}

// Função para backup (desenvolvimento)
async function createBackup() {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Backup só disponível em desenvolvimento');
  }
  
  const { exec } = require('child_process');
  const path = require('path');
  const fs = require('fs').promises;
  
  const backupDir = path.join(__dirname, '../../backups');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);
  
  try {
    // Criar diretório se não existir
    await fs.mkdir(backupDir, { recursive: true });
    
    // Executar pg_dump
    const command = `pg_dump ${process.env.DATABASE_URL} > ${backupFile}`;
    
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          logger.error('Erro no backup:', error);
          reject(error);
        } else {
          logger.info(`Backup criado: ${backupFile}`);
          resolve(backupFile);
        }
      });
    });
  } catch (error) {
    logger.error('Erro ao criar backup:', error);
    throw error;
  }
}

// Função para estatísticas do banco
async function getDatabaseStats() {
  try {
    const stats = await executeQuery(`
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_tuples,
        n_dead_tup as dead_tuples,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze
      FROM pg_stat_user_tables 
      ORDER BY n_live_tup DESC;
    `);
    
    return stats;
  } catch (error) {
    logger.error('Erro ao obter estatísticas:', error);
    throw error;
  }
}

// Função para verificar saúde do banco
async function checkDatabaseHealth() {
  try {
    const health = {
      connected: false,
      version: null,
      postgis_version: null,
      active_connections: 0,
      database_size: null,
      last_check: new Date().toISOString()
    };
    
    // Testar conexão
    health.connected = await testConnection();
    
    if (health.connected) {
      // Versão PostgreSQL
      const [versionResult] = await executeQuery('SELECT version();');
      health.version = versionResult.version;
      
      // Versão PostGIS
      const [postgisResult] = await executeQuery('SELECT PostGIS_Version();');
      health.postgis_version = postgisResult.postgis_version;
      
      // Conexões ativas
      const [connectionsResult] = await executeQuery(`
        SELECT count(*) as active_connections 
        FROM pg_stat_activity 
        WHERE state = 'active';
      `);
      health.active_connections = parseInt(connectionsResult.active_connections);
      
      // Tamanho do banco
      const [sizeResult] = await executeQuery(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as database_size;
      `);
      health.database_size = sizeResult.database_size;
    }
    
    return health;
  } catch (error) {
    logger.error('Erro ao verificar saúde do banco:', error);
    return {
      connected: false,
      error: error.message,
      last_check: new Date().toISOString()
    };
  }
}

module.exports = {
  sequelize,
  connectDatabase,
  syncDatabase,
  testConnection,
  executeQuery,
  executeTransaction,
  createBackup,
  getDatabaseStats,
  checkDatabaseHealth
};