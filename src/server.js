require('dotenv').config();

const mongoose = require('mongoose');
const app = require('./app');
const connectDB = require('./config/db');

const PORT = Number(process.env.PORT) || 5000;

let server;

async function startServer() {
  await connectDB();

  server = app.listen(PORT, () => {
    console.log(
      `Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`
    );
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });

  const shutdown = async (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);

    if (!server) {
      await mongoose.connection.close();
      process.exit(0);
    }

    server.close(async () => {
      await mongoose.connection.close();
      console.log('HTTP server and MongoDB connection closed.');
      process.exit(0);
    });

    // Force exit if graceful shutdown hangs.
    setTimeout(() => {
      console.error('Forced shutdown after timeout.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

startServer().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});
