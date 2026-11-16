const mongoose = require('mongoose');
const { ALLOWED_MIME_TYPES } = require('../config/upload');

const uploadSchema = new mongoose.Schema(
  {
    originalName: {
      type: String,
      required: [true, 'Original file name is required'],
      trim: true,
      maxlength: [255, 'Original file name cannot exceed 255 characters'],
    },
    filename: {
      type: String,
      required: [true, 'Stored file name is required'],
      unique: true,
      trim: true,
    },
    // Original file on disk. Never exposed through the public API.
    path: {
      type: String,
      required: [true, 'File path is required'],
      trim: true,
    },
    // Optimized WebP and thumbnail paths on disk. Never exposed publicly.
    optimizedPath: {
      type: String,
      required: [true, 'Optimized file path is required'],
      trim: true,
    },
    thumbnailPath: {
      type: String,
      required: [true, 'Thumbnail file path is required'],
      trim: true,
    },
    // Relative public URLs.
    url: {
      type: String,
      required: [true, 'File URL is required'],
      trim: true,
    },
    thumbnailUrl: {
      type: String,
      required: [true, 'Thumbnail URL is required'],
      trim: true,
    },
    mimetype: {
      type: String,
      required: [true, 'File MIME type is required'],
      enum: {
        values: ALLOWED_MIME_TYPES,
        message: 'Unsupported image type: {VALUE}',
      },
    },
    format: {
      type: String,
      required: [true, 'Image format is required'],
      trim: true,
    },
    width: {
      type: Number,
      required: [true, 'Image width is required'],
      min: [1, 'Image width must be greater than zero'],
    },
    height: {
      type: Number,
      required: [true, 'Image height is required'],
      min: [1, 'Image height must be greater than zero'],
    },
    // Original upload size.
    size: {
      type: Number,
      required: [true, 'File size is required'],
      min: [1, 'File size must be greater than zero'],
    },
    optimizedSize: {
      type: Number,
      required: [true, 'Optimized file size is required'],
      min: [1, 'Optimized file size must be greater than zero'],
    },
    thumbnailSize: {
      type: Number,
      required: [true, 'Thumbnail file size is required'],
      min: [1, 'Thumbnail file size must be greater than zero'],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Newest uploads first for listing endpoints.
uploadSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Upload', uploadSchema);
