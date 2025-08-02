const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log do erro
  logger.error('Error Handler:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  // Erro de validação do Mongoose
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = {
      success: false,
      error: 'Dados inválidos',
      details: message,
      code: 'VALIDATION_ERROR'
    };
    return res.status(400).json(error);
  }

  // Erro de cast do Mongoose (ID inválido)
  if (err.name === 'CastError') {
    error = {
      success: false,
      error: 'Recurso não encontrado',
      code: 'RESOURCE_NOT_FOUND'
    };
    return res.status(404).json(error);
  }

  // Erro de duplicação (código 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = {
      success: false,
      error: `${field} já existe`,
      code: 'DUPLICATE_FIELD'
    };
    return res.status(400).json(error);
  }

  // Erro padrão
  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Erro interno do servidor',
    code: error.code || 'INTERNAL_SERVER_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;