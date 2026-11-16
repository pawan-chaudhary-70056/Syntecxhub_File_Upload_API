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
    path: {
      type: String,
      required: [true, 'File path is required'],
      trim: true,
    },
    url: {
      type: String,
      required: [true, 'File URL is required'],
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
    size: {
      type: Number,
      required: [true, 'File size is required'],
      min: [1, 'File size must be greater than zero'],
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
