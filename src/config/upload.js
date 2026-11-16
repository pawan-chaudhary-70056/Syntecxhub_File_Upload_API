const path = require('path');

/**
 * Central upload configuration.
 * Values come from environment variables with safe defaults.
 */
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || 'uploads');
const ORIGINALS_DIR = path.join(UPLOAD_DIR, 'originals');
const OPTIMIZED_DIR = path.join(UPLOAD_DIR, 'optimized');
const THUMBNAILS_DIR = path.join(UPLOAD_DIR, 'thumbnails');

const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE) || 2 * 1024 * 1024;

// Image processing defaults.
const MAX_IMAGE_WIDTH = Number(process.env.IMAGE_MAX_WIDTH) || 1920;
const MAX_IMAGE_HEIGHT = Number(process.env.IMAGE_MAX_HEIGHT) || 1920;
const THUMBNAIL_SIZE = Number(process.env.THUMBNAIL_SIZE) || 200;
const WEBP_QUALITY = Number(process.env.WEBP_QUALITY) || 82;

// 16383 x 16383 pixels. Prevents decompression-bomb attacks while
// still allowing very large, legitimate photos.
const MAX_IMAGE_PIXELS = Number(process.env.MAX_IMAGE_PIXELS) || 268402689;

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
  MAX_IMAGE_HEIGHT,
  MAX_IMAGE_PIXELS,
  MAX_IMAGE_WIDTH,
  OPTIMIZED_DIR,
  ORIGINALS_DIR,
  THUMBNAIL_SIZE,
  THUMBNAILS_DIR,
  UPLOAD_DIR,
  WEBP_QUALITY,
};
