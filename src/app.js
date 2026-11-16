const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const swaggerUi = require('swagger-ui-express');

const uploadRoutes = require('./routes/upload.routes');
const notFound = require('./middleware/notFound.middleware');
const errorHandler = require('./middleware/error.middleware');
const { apiLimiter } = require('./middleware/rateLimit.middleware');
const { OPTIMIZED_DIR, THUMBNAILS_DIR } = require('./config/upload');
const openapiSpec = require('./docs/openapi');

const app = express();

// Do not advertise the framework in response headers.
app.disable('x-powered-by');

const allowedOrigins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Security headers. cross-origin is needed so hosted images can be
// embedded by an allowed frontend.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    maxAge: 86400,
  })
);

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Small body limit: this API accepts files through multipart/form-data,
// not large JSON payloads.
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Only the processed WebP files are public. Originals stay private on disk.
const staticOptions = {
  dotfiles: 'deny',
  index: false,
  maxAge: '1d',
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; img-src 'self'"
    );
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  },
};

app.use(
  '/uploads/optimized',
  express.static(OPTIMIZED_DIR, staticOptions)
);
app.use(
  '/uploads/thumbnails',
  express.static(THUMBNAILS_DIR, staticOptions)
);

// Swagger UI needs inline scripts/styles, so this route overrides the
// stricter Helmet CSP for the docs page only.
const docsCsp = [
  "default-src 'self'",
  "img-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
].join('; ');

app.get('/api-docs.json', (req, res) => {
  res.status(200).json(openapiSpec);
});

app.use(
  '/api-docs',
  (req, res, next) => {
    res.setHeader('Content-Security-Policy', docsCsp);
    next();
  },
  swaggerUi.serve,
  swaggerUi.setup(openapiSpec, {
    customSiteTitle: 'Syntecxhub File Upload API Docs',
    swaggerOptions: {
      validatorUrl: null,
      persistAuthorization: true,
    },
  })
);

app.get('/api/health', (req, res) => {
  const dbStates = [
    'disconnected',
    'connected',
    'connecting',
    'disconnecting',
  ];

  res.status(200).json({
    success: true,
    message: 'API is healthy',
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: dbStates[mongoose.connection.readyState] || 'unknown',
    },
  });
});

// Browsers request /favicon.ico automatically. The API does not ship a
// favicon, so return 204 instead of logging a noisy 404.
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

app.use('/api', apiLimiter);
app.use('/api/uploads', uploadRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
