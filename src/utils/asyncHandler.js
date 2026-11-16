/**
 * Wraps an async Express handler so rejected promises are forwarded
 * to the central error handler instead of crashing the process.
 */
const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

module.exports = asyncHandler;
