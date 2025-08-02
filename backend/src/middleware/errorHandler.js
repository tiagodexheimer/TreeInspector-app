const { StatusCodes } = require('http-status-codes');
const logger = require('../utils/logger');

// Classe para erros customizados
class AppError extends Error {
  constructor(message, statusCode = StatusCodes.INTERNAL_SERVER_ERROR, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Classe para erros de validação
class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, StatusCodes.BAD_REQUEST, 'VALIDATION_ERROR');
    this.details = details;
  }
}

// Classe para erros de autenticação
class AuthenticationError extends AppError {
  constructor(message = 'Token de acesso inválido ou expirado') {
    super(message, StatusCodes.UNAUTHORIZED, 'AUTHENTICATION_ERROR');
  }
}

// Classe para erros de autorização
class AuthorizationError extends AppError {
  constructor(message = 'Permissão insuficiente para acessar este recurso') {
    super(message, StatusCodes.FORBIDDEN, 'AUTHORIZATION_ERROR');
  }
}

// Classe para erros de recurso não encontrado
class NotFoundError extends AppError {
  constructor(message = 'Recurso não encontrado') {
    super(message, StatusCodes.NOT_FOUND, 'RESOURCE_NOT_FOUND');
  }
}

// Classe para erros de conflito
class ConflictError extends AppError {
  constructor(message = 'Conflito com o estado atual do recurso') {
    super(message, StatusCodes.CONFLICT, 'RESOURCE_CONFLICT');
  }
}

// Classe para erros de rate limiting
class RateLimitError extends AppError {
  constructor(message = 'Muitas requisições. Tente novamente mais tarde') {
    super(message, StatusCodes.TOO_MANY_REQUESTS, 'RATE_LIMIT_EXCEEDED');
  }
}

// Função para tratar erros do Sequelize
function handleSequelizeError(error) {
  const { name, message } = error;
  
  switch (name) {
    case 'SequelizeValidationError':
      const validationErrors = error.errors.map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));
      
      return new ValidationError('Dados inválidos', validationErrors);
      
    case 'SequelizeUniqueConstraintError':
      const field = error.errors[0]?.path || 'campo';
      return new ConflictError(`${field} já existe no sistema`);
      
    case 'SequelizeForeignKeyConstraintError':
      return new ValidationError('Referência inválida para recurso relacionado');
      
    case 'SequelizeConnectionError':
    case 'SequelizeConnectionRefusedError':
      logger.error('Erro de conexão com banco de dados:', error);
      return new AppError('Erro interno do servidor', StatusCodes.INTERNAL_SERVER_ERROR, 'DATABASE_ERROR');
      
    case 'SequelizeTimeoutError':
      return new AppError('Timeout na operação do banco de dados', StatusCodes.REQUEST_TIMEOUT, 'DATABASE_TIMEOUT');
      
    default:
      logger.error('Erro não tratado do Sequelize:', error);
      return new AppError('Erro interno do servidor', StatusCodes.INTERNAL_SERVER_ERROR, 'DATABASE_ERROR');
  }
}

// Função para tratar erros de validação do Joi
function handleJoiError(error) {
  const validationErrors = error.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message,
    value: detail.context?.value
  }));
  
  return new ValidationError('Dados de entrada inválidos', validationErrors);
}

// Função para tratar erros do JWT
function handleJWTError(error) {
  const { name, message } = error;
  
  switch (name) {
    case 'JsonWebTokenError':
      return new AuthenticationError('Token inválido');
      
    case 'TokenExpiredError':
      return new AuthenticationError('Token expirado');
      
    case 'NotBeforeError':
      return new AuthenticationError('Token ainda não é válido');
      
    default:
      return new AuthenticationError('Erro de autenticação');
  }
}

// Função para tratar erros do Multer (upload)
function handleMulterError(error) {
  const { code, message } = error;
  
  switch (code) {
    case 'LIMIT_FILE_SIZE':
      return new ValidationError('Arquivo muito grande');
      
    case 'LIMIT_FILE_COUNT':
      return new ValidationError('Muitos arquivos enviados');
      
    case 'LIMIT_UNEXPECTED_FILE':
      return new ValidationError('Campo de arquivo inesperado');
      
    default:
      return new ValidationError(`Erro no upload: ${message}`);
  }
}

// Middleware principal de tratamento de erros
function errorHandler(error, req, res, next) {
  let err = error;
  
  // Log do erro original
  logger.error('Erro capturado:', {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id_usuario,
    timestamp: new Date().toISOString()
  });
  
  // Tratar diferentes tipos de erro
  if (error.name?.startsWith('Sequelize')) {
    err = handleSequelizeError(error);
  } else if (error.isJoi) {
    err = handleJoiError(error);
  } else if (error.name?.includes('JsonWebToken') || error.name?.includes('Token')) {
    err = handleJWTError(error);
  } else if (error.code?.startsWith('LIMIT_')) {
    err = handleMulterError(error);
  } else if (error.code === 'ENOENT') {
    err = new NotFoundError('Arquivo não encontrado');
  } else if (error.code === 'EACCES') {
    err = new AppError('Permissão negada para acessar arquivo', StatusCodes.FORBIDDEN, 'FILE_ACCESS_DENIED');
  } else if (error.type === 'entity.parse.failed') {
    err = new ValidationError('JSON inválido no corpo da requisição');
  } else if (error.type === 'entity.too.large') {
    err = new ValidationError('Corpo da requisição muito grande');
  }
  
  // Se não é um erro operacional conhecido, criar um genérico
  if (!err.isOperational) {
    err = new AppError(
      process.env.NODE_ENV === 'production' ? 'Erro interno do servidor' : error.message,
      StatusCodes.INTERNAL_SERVER_ERROR,
      'INTERNAL_ERROR'
    );
  }
  
  // Preparar resposta de erro
  const errorResponse = {
    success: false,
    error: err.message,
    code: err.code,
    timestamp: new Date().toISOString()
  };
  
  // Adicionar detalhes em desenvolvimento ou para erros de validação
  if (process.env.NODE_ENV === 'development' || err instanceof ValidationError) {
    if (err.details) {
      errorResponse.details = err.details;
    }
    
    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = error.stack;
    }
  }
  
  // Log adicional para erros críticos
  if (err.statusCode >= 500) {
    logger.error('Erro crítico:', {
      error: errorResponse,
      originalError: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
  }
  
  // Enviar resposta
  res.status(err.statusCode).json(errorResponse);
}

// Middleware para capturar erros 404
function notFoundHandler(req, res, next) {
  const error = new NotFoundError(`Rota ${req.method} ${req.originalUrl} não encontrada`);
  next(error);
}

// Middleware para capturar erros assíncronos
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Middleware para validar schema Joi
function validateSchema(schema, property = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      return next(error);
    }
    
    req[property] = value;
    next();
  };
}

// Middleware para tratar timeout de requisição
function timeoutHandler(timeout = 30000) {
  return (req, res, next) => {
    const timer = setTimeout(() => {
      const error = new AppError(
        'Timeout na requisição',
        StatusCodes.REQUEST_TIMEOUT,
        'REQUEST_TIMEOUT'
      );
      next(error);
    }, timeout);
    
    res.on('finish', () => {
      clearTimeout(timer);
    });
    
    res.on('close', () => {
      clearTimeout(timer);
    });
    
    next();
  };
}

module.exports = {
  // Classes de erro
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  
  // Middlewares
  errorHandler,
  notFoundHandler,
  asyncHandler,
  validateSchema,
  timeoutHandler,
  
  // Funções auxiliares
  handleSequelizeError,
  handleJoiError,
  handleJWTError,
  handleMulterError
};