const express = require('express');
const {
  createUpload,
  listUploads,
  getUploadById,
  deleteUpload,
} = require('../controllers/upload.controller');
const {
  uploadSingleImage,
  verifyImageSignature,
} = require('../middleware/upload.middleware');
const { uploadLimiter } = require('../middleware/rateLimit.middleware');

const router = express.Router();

router
  .route('/')
  .post(uploadLimiter, uploadSingleImage, verifyImageSignature, createUpload)
  .get(listUploads);

router.route('/:id').get(getUploadById).delete(deleteUpload);

module.exports = router;
