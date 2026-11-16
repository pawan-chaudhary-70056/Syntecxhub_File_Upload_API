const path = require('path');

/**
 * Central upload configuration.
 * Values come from environment variables with safe defaults.
 */
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || 'uploads');
const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE) || 2 * 1024 * 1024;

/**
 * Allowed image MIME types mapped to their allowed file extensions.
 * Both the MIME type and the extension must match, and the real file
 * signature is verified after Multer writes the file to disk.
 */
const ALLOWED_IMAGE_TYPES = new Map([
  ['image/jpeg', ['.jpg', '.jpeg']],
  ['image/png', ['.png']],
  ['image/webp', ['.webp']],
  ['image/gif', ['.gif']],
]);

const ALLOWED_MIME_TYPES = [...ALLOWED_IMAGE_TYPES.keys()];

module.exports = {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  UPLOAD_DIR,
};
