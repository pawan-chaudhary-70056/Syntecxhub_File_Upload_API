const multer = require('multer');
const ApiError = require('../utils/ApiError');
const { MAX_FILE_SIZE } = require('../config/upload');

/**
 * Central error handler.
 * Converts Multer, Mongoose, and MongoDB errors into clean JSON
 * responses and never exposes stack traces in production.
 */
function errorHandler(err, req, res, next) {
  let error = err;

  if (err instanceof multer.MulterError) {
    const maxSizeMb = Math.round(MAX_FILE_SIZE / (1024 * 1024));

    const multerMessages = {
      LIMIT_FILE_SIZE: `File is too large. Maximum allowed size is ${maxSizeMb} MB.`,
      LIMIT_FILE_COUNT: 'Only one file can be uploaded at a time.',
      LIMIT_UNEXPECTED_FILE:
        'Unexpected file field. Use "image" as the form-data field name.',
      LIMIT_PART_COUNT: 'Multipart form contains too many parts.',
      LIMIT_FIELD_COUNT: 'Multipart form contains too many fields.',
    };

    error = new ApiError(
      400,
      multerMessages[err.code] || `Upload failed: ${err.message}`
    );
  } else if (err.name === 'CastError') {
    error = new ApiError(400, `Invalid ${err.path}: ${err.value}`);
  } else if (err.name === 'ValidationError') {
    error = new ApiError(
      400,
      'Validation failed',
      Object.values(err.errors).map((item) => item.message)
    );
  } else if (err.code === 11000) {
    error = new ApiError(
      409,
      'A record with these values already exists.',
      Object.keys(err.keyValue || {})
    );
  } else if (!(err instanceof ApiError)) {
    error = new ApiError(
      err.statusCode || 500,
      err.message || 'Internal server error'
    );
  }

  if (process.env.NODE_ENV !== 'test') {
    console.error(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`,
      err
    );
  }

  const response = {
    success: false,
    message: error.message,
  };

  if (error.errors && error.errors.length) {
    response.errors = error.errors;
  }

  // Stack traces are logged server-side only. They are never returned
  // to clients, regardless of environment, to avoid leaking internals.
  res.status(error.statusCode || 500).json(response);
}

module.exports = errorHandler;
