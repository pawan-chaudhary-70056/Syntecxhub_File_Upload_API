const mongoose = require('mongoose');

/**
 * Connect to MongoDB using Mongoose.
 * Fails fast with a clear message if MONGO_URI is missing.
 */
async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error('MONGO_URI is not defined. Add it to your .env file.');
  }

  mongoose.set('strictQuery', true);

  const connection = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  console.log(
    `MongoDB connected: ${connection.connection.host}/${connection.connection.name}`
  );

  return connection;
}

module.exports = connectDB;
