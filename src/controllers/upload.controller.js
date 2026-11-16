const fs = require('fs/promises');
const path = require('path');
const mongoose = require('mongoose');
const Upload = require('../models/Upload');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { processImage, removeFiles } = require('../utils/imageProcessor');
const { ALLOWED_MIME_TYPES, UPLOAD_DIR } = require('../config/upload');

/**
 * Builds the public base URL from BASE_URL or the current request.
 */
function getBaseUrl(req) {
  const configured = process.env.BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  return `${req.protocol}://${req.get('host')}`;
}

/**
 * Shapes a database record for API responses and adds absolute URLs.
 * The database stores relative URLs so the API can move between hosts.
 * Internal filesystem paths are deliberately not exposed.
 */
function toPublicUpload(upload, req) {
  const baseUrl = getBaseUrl(req);

  return {
    id: upload._id,
    originalName: upload.originalName,
    filename: upload.filename,
    url: `${baseUrl}${upload.url}`,
    thumbnailUrl: `${baseUrl}${upload.thumbnailUrl}`,
    relativeUrl: upload.url,
    relativeThumbnailUrl: upload.thumbnailUrl,
    mimetype: upload.mimetype,
    format: upload.format,
    width: upload.width,
    height: upload.height,
    size: upload.size,
    optimizedSize: upload.optimizedSize,
    thumbnailSize: upload.thumbnailSize,
    createdAt: upload.createdAt,
    updatedAt: upload.updatedAt,
  };
}

/**
 * Removes directory components and unsafe characters from the original
 * client-supplied filename before storing it in MongoDB.
 */
function sanitizeOriginalName(name) {
  const basename = path.basename(String(name || '').replace(/\\/g, '/'));
  const sanitized = basename.replace(/[^\w.\- ]/g, '_').slice(0, 255);
  return sanitized || 'unnamed';
}

/**
 * Deletes files from disk, but only if they are inside UPLOAD_DIR.
 * This prevents a tampered database record from deleting arbitrary files.
 */
async function removeFilesFromDisk(filePaths) {
  const uploadRoot = `${UPLOAD_DIR}${path.sep}`;

  for (const filePath of filePaths.filter(Boolean)) {
    const resolvedPath = path.resolve(filePath);

    if (!resolvedPath.startsWith(uploadRoot)) {
      throw new ApiError(
        500,
        'Refusing to delete a file outside the upload directory.'
      );
    }

    await fs.unlink(resolvedPath).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
}

/**
 * POST /api/uploads
 * Multer stores the validated original on disk. Sharp creates an optimized
 * WebP image and a thumbnail, then the metadata is saved in MongoDB.
 */
const createUpload = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(
      400,
      'No file uploaded. Send the image using the "image" form-data field.'
    );
  }

  let processed;

  try {
    processed = await processImage(req.file.path, req.file.filename);
  } catch (error) {
    // Do not leave an unprocessed original behind.
    await removeFiles([req.file.path]).catch(() => {});
    throw error;
  }

  const uploadData = {
    originalName: sanitizeOriginalName(req.file.originalname),
    filename: req.file.filename,
    path: req.file.path,
    optimizedPath: processed.optimizedPath,
    thumbnailPath: processed.thumbnailPath,
    url: processed.optimizedUrl,
    thumbnailUrl: processed.thumbnailUrl,
    mimetype: req.file.mimetype,
    format: processed.format,
    width: processed.width,
    height: processed.height,
    size: req.file.size,
    optimizedSize: processed.optimizedSize,
    thumbnailSize: processed.thumbnailSize,
  };

  try {
    const upload = await Upload.create(uploadData);

    res.status(201).json({
      success: true,
      message: 'Image uploaded and processed successfully',
      data: toPublicUpload(upload, req),
    });
  } catch (error) {
    // If metadata could not be saved, do not leave orphan files behind.
    await removeFiles([
      req.file.path,
      processed.optimizedPath,
      processed.thumbnailPath,
    ]).catch(() => {});
    throw error;
  }
});

/**
 * GET /api/uploads?page=1&limit=10&mimetype=image/png
 */
const listUploads = asyncHandler(async (req, res) => {
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(
    Math.max(Number.parseInt(req.query.limit, 10) || 10, 1),
    50
  );

  const filter = {};

  if (req.query.mimetype) {
    if (!ALLOWED_MIME_TYPES.includes(req.query.mimetype)) {
      throw new ApiError(
        400,
        `Invalid mimetype filter. Allowed values: ${ALLOWED_MIME_TYPES.join(', ')}`
      );
    }

    filter.mimetype = req.query.mimetype;
  }

  const [total, uploads] = await Promise.all([
    Upload.countDocuments(filter),
    Upload.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  const totalPages = Math.ceil(total / limit);

  res.status(200).json({
    success: true,
    message: 'Uploads fetched successfully',
    data: uploads.map((upload) => toPublicUpload(upload, req)),
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
});

/**
 * GET /api/uploads/:id
 */
const getUploadById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, `Invalid upload id: ${id}`);
  }

  const upload = await Upload.findById(id).lean();

  if (!upload) {
    throw new ApiError(404, `Upload with id ${id} not found`);
  }

  res.status(200).json({
    success: true,
    message: 'Upload fetched successfully',
    data: toPublicUpload(upload, req),
  });
});

/**
 * DELETE /api/uploads/:id
 * Removes the MongoDB record, the original, the optimized image, and
 * the thumbnail from disk.
 */
const deleteUpload = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, `Invalid upload id: ${id}`);
  }

  const upload = await Upload.findById(id);

  if (!upload) {
    throw new ApiError(404, `Upload with id ${id} not found`);
  }

  await removeFilesFromDisk([
    upload.path,
    upload.optimizedPath,
    upload.thumbnailPath,
  ]);
  await upload.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Upload deleted successfully',
    data: { id },
  });
});

module.exports = {
  createUpload,
  listUploads,
  getUploadById,
  deleteUpload,
};
