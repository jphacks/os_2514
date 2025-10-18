const Logger = require('./Logger');

class AppError extends Error {
  constructor(statusCode, message, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'AppError';
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(400, message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

class NotFoundError extends AppError {
  constructor(resource) {
    super(404, `${resource} not found`, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

class GameError extends AppError {
  constructor(message) {
    super(400, message, 'GAME_ERROR');
    this.name = 'GameError';
  }
}

class DatabaseError extends AppError {
  constructor(message) {
    super(500, message, 'DATABASE_ERROR');
    this.name = 'DatabaseError';
  }
}

const errorHandler = (err, req, res, next) => {
  Logger.error('Request error', {
    path: req.path,
    method: req.method,
    error: err.message,
    code: err.code,
  });

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
    });
  }

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
};

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  GameError,
  DatabaseError,
  errorHandler,
};