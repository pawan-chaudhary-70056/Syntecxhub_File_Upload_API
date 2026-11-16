const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');
const ApiError = require('./ApiError');
const {
  MAX_IMAGE_HEIGHT,
  MAX_IMAGE_PIXELS,
  MAX_IMAGE_WIDTH,
  OPTIMIZED_DIR,
  THUMBNAIL_SIZE,
  THUMBNAILS_DIR,
  WEBP_QUALITY,
} = require('../config/upload');

/**
 * Deletes the given files. Missing files are ignored so cleanup is safe
 * to call more than once.
 */
async function removeFiles(filePaths = []) {
  await Promise.all(
    filePaths.filter(Boolean).map((filePath) =>
      fs.unlink(filePath).catch((error) => {
        if (error.code !== 'ENOENT') throw error;
      })
    )
  );
}

/**
 * Processes an uploaded image with Sharp:
 * - auto-rotates using EXIF orientation, then strips metadata (including GPS)
 * - resizes to fit within IMAGE_MAX_WIDTH x IMAGE_MAX_HEIGHT
 * - converts to optimized WebP
 * - generates a square WebP thumbnail
 * - rejects decompression bombs via limitInputPixels
 *
 * @param {string} originalPath Absolute path of the validated original.
 * @param {string} storedFilename Multer-generated filename.
 * @returns {Promise<object>} Paths, URLs, dimensions, and sizes.
 */
async function processImage(originalPath, storedFilename) {
  const baseName = path.parse(storedFilename).name;
  const optimizedFilename = `${baseName}.webp`;
  const thumbnailFilename = `${baseName}.webp`;
  const optimizedPath = path.join(OPTIMIZED_DIR, optimizedFilename);
  const thumbnailPath = path.join(THUMBNAILS_DIR, thumbnailFilename);

  try {
    const metadata = await sharp(originalPath, {
      limitInputPixels: MAX_IMAGE_PIXELS,
      failOn: 'error',
    }).metadata();

    if (!metadata.width || !metadata.height) {
      throw new ApiError(400, 'The uploaded file is not a readable image.');
    }

    // Sharp strips EXIF/metadata by default. Calling .rotate() applies the
    // EXIF orientation before the metadata is removed.
    await sharp(originalPath, {
      limitInputPixels: MAX_IMAGE_PIXELS,
      failOn: 'error',
    })
      .rotate()
      .resize({
        width: MAX_IMAGE_WIDTH,
        height: MAX_IMAGE_HEIGHT,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .toFile(optimizedPath);

    await sharp(originalPath, {
      limitInputPixels: MAX_IMAGE_PIXELS,
      failOn: 'error',
    })
      .rotate()
      .resize({
        width: THUMBNAIL_SIZE,
        height: THUMBNAIL_SIZE,
        fit: 'cover',
        position: 'centre',
      })
      .webp({ quality: 75, effort: 4 })
      .toFile(thumbnailPath);

    const [optimizedMetadata, optimizedStats, thumbnailStats] = await Promise.all([
      sharp(optimizedPath).metadata(),
      fs.stat(optimizedPath),
      fs.stat(thumbnailPath),
    ]);

    return {
      optimizedPath,
      thumbnailPath,
      optimizedUrl: `/uploads/optimized/${optimizedFilename}`,
      thumbnailUrl: `/uploads/thumbnails/${thumbnailFilename}`,
      width: optimizedMetadata.width,
      height: optimizedMetadata.height,
      format: metadata.format,
      optimizedSize: optimizedStats.size,
      thumbnailSize: thumbnailStats.size,
    };
  } catch (error) {
    await removeFiles([optimizedPath, thumbnailPath]).catch(() => {});

    if (error instanceof ApiError) throw error;

    if (process.env.NODE_ENV !== 'test') {
      console.error('Image processing failed:', error.message);
    }

    throw new ApiError(
      400,
      'Could not process the image. The file may be corrupted or too large.'
    );
  }
}

module.exports = { processImage, removeFiles };
