require('dotenv').config({
  path: process.env.NODE_ENV === 'development' ? '.env.development' : '.env'
});
const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

// 1. Objeto de configuração base
const config = {
  url: process.env.DATABASE_URL,
  dialect: 'postgres',
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? { require: true, rejectUnauthorized: false } : false
  },
  logging: (msg) => logger.db(msg),
  pool: {
    max: 20,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true
  },
  timezone: '-03:00'
};

// 2. Instância do Sequelize para ser usada pela aplicação
const sequelize = new Sequelize(config.url, config);

// 3. Funções auxiliares que usam a instância do Sequelize
async function executeQuery(query, replacements = {}) {
  try {
    const [results] = await sequelize.query(query, {
      replacements,
      type: Sequelize.QueryTypes.SELECT
    });
    return results;
  } catch (error) {
    logger.error('Erro ao executar query:', error);
    throw error;
  }
}

async function testConnection() {
    try {
        await sequelize.authenticate();
        logger.info('✅ Conexão com PostgreSQL estabelecida com sucesso.');
        return true;
    } catch (error) {
        logger.error('❌ Erro ao conectar com PostgreSQL:', error);
        if (process.env.NODE_ENV === 'development') {
            logger.warn('⚠️  Modo desenvolvimento: Continuando sem PostgreSQL');
            return true; // Permite continuar em desenvolvimento
        }
        return false;
    }
}

// 4. Exporta tudo!
module.exports = {
  // Configuração para a sequelize-cli
  development: config,
  test: config,
  production: config,

  // Utilitários para a sua aplicação
  sequelize,
  testConnection,
  executeQuery
  // Adicione aqui outras funções do seu ficheiro original se precisar
};