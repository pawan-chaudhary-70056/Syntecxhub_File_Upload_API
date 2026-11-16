const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const ApiError = require('../utils/ApiError');
const { hasValidImageSignature } = require('../utils/fileSignature');
const {
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE,
  OPTIMIZED_DIR,
  ORIGINALS_DIR,
  THUMBNAILS_DIR,
} = require('../config/upload');

// Ensure all storage folders exist before Multer or Sharp writes to them.
for (const directory of [ORIGINALS_DIR, OPTIMIZED_DIR, THUMBNAILS_DIR]) {
  fs.mkdirSync(directory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, ORIGINALS_DIR),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    // Random UUID + timestamp prevents filename collisions and makes
    // uploaded files unguessable.
    const uniqueName = `${Date.now()}-${crypto.randomUUID()}${extension}`;
    cb(null, uniqueName);
  },
});

/**
 * First line of defence:
 * - only known image MIME types are accepted
 * - the extension must match the declared MIME type
 */
function fileFilter(req, file, cb) {
  const allowedExtensions = ALLOWED_IMAGE_TYPES.get(file.mimetype);
  const extension = path.extname(file.originalname).toLowerCase();

  if (!allowedExtensions) {
    return cb(
      new ApiError(
        400,
        `Unsupported file type "${file.mimetype}". Allowed types: JPEG, PNG, WebP, GIF.`
      )
    );
  }

  if (!allowedExtensions.includes(extension)) {
    return cb(
      new ApiError(
        400,
        `File extension "${extension}" does not match the declared MIME type "${file.mimetype}".`
      )
    );
  }

  return cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
    fields: 5,
    parts: 10,
  },
});

const uploadSingleImage = upload.single('image');

/**
 * Second line of defence:
 * Verifies the real magic bytes of the uploaded file. A renamed .exe or
 * a text file with a spoofed image/png Content-Type is rejected and
 * removed from disk.
 */
async function verifyImageSignature(req, res, next) {
  if (!req.file) return next();

  try {
    const isValid = await hasValidImageSignature(
      req.file.path,
      req.file.mimetype
    );

    if (!isValid) {
      await fs.promises.unlink(req.file.path).catch(() => {});
      return next(
        new ApiError(
          400,
          'The uploaded file content does not match a supported image format.'
        )
      );
    }

    return next();
  } catch (error) {
    await fs.promises.unlink(req.file.path).catch(() => {});
    return next(error);
  }
}

module.exports = {
  uploadSingleImage,
  verifyImageSignature,
};
