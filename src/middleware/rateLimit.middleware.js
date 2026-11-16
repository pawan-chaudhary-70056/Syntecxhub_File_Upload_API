const rateLimit = require('express-rate-limit');

const rateLimitResponse = (message) => ({
  success: false,
  message,
});

// General API protection.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: rateLimitResponse(
    'Too many requests from this IP. Please try again after 15 minutes.'
  ),
});

// Uploads are more expensive, so they get a stricter limit.
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: rateLimitResponse(
    'Too many uploads from this IP. Please try again after 15 minutes.'
  ),
});

module.exports = { apiLimiter, uploadLimiter };
