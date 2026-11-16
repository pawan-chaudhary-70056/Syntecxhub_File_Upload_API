const ApiError = require('../utils/ApiError');

/**
 * Catch-all for unknown routes.
 */
function notFound(req, res, next) {
  next(new ApiError(404, `Route ${req.method} ${req.originalUrl} not found`));
}

module.exports = notFound;
