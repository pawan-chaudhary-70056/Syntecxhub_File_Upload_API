const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Syntecxhub File / Image Upload API',
    version: '1.0.0',
    description:
      'File/Image Upload API built for the Syntecxhub Back-End Development Week 1 task. ' +
      'Uploads are validated, processed with Sharp, stored on disk, and their metadata is saved in MongoDB.',
  },
  servers: [
    {
      url: (process.env.BASE_URL || 'http://localhost:5000').replace(/\/+$/, ''),
      description: 'API server',
    },
  ],
  tags: [
    { name: 'Health', description: 'Service health checks' },
    { name: 'Uploads', description: 'Image upload and metadata operations' },
    { name: 'Files', description: 'Publicly served optimized images and thumbnails' },
  ],
  paths: {
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Returns API uptime and the MongoDB connection state.',
        responses: {
          200: {
            description: 'API is healthy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
        },
      },
    },
    '/api/uploads': {
      post: {
        tags: ['Uploads'],
        summary: 'Upload and process an image',
        description:
          'Accepts one image via multipart/form-data. The image is signature-checked, ' +
          'optimized to WebP, and a 200x200 WebP thumbnail is generated.',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['image'],
                properties: {
                  image: {
                    type: 'string',
                    format: 'binary',
                    description:
                      'JPEG, PNG, WebP, or GIF image. Maximum size is configured by MAX_FILE_SIZE (2 MB by default).',
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Image uploaded and processed successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UploadResponse' },
              },
            },
          },
          400: {
            description:
              'Missing file, unsupported type, invalid signature, corrupted image, or file too large',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          429: {
            description: 'Upload rate limit exceeded',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          500: {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      get: {
        tags: ['Uploads'],
        summary: 'List uploads',
        description: 'Returns paginated upload metadata, newest first.',
        parameters: [
          {
            name: 'page',
            in: 'query',
            description: 'Page number (starts at 1)',
            required: false,
            schema: { type: 'integer', minimum: 1, default: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Items per page (maximum 50)',
            required: false,
            schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
          },
          {
            name: 'mimetype',
            in: 'query',
            description: 'Filter by original image MIME type',
            required: false,
            schema: {
              type: 'string',
              enum: [
                'image/jpeg',
                'image/png',
                'image/webp',
                'image/gif',
              ],
            },
          },
        ],
        responses: {
          200: {
            description: 'Paginated uploads',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UploadListResponse' },
              },
            },
          },
          400: {
            description: 'Invalid pagination or mimetype filter',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/uploads/{id}': {
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'MongoDB ObjectId of the upload',
          schema: { type: 'string', example: '6712a1f3c9e77b0012a4b6d1' },
        },
      ],
      get: {
        tags: ['Uploads'],
        summary: 'Get one upload',
        responses: {
          200: {
            description: 'Upload metadata',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UploadResponse' },
              },
            },
          },
          400: {
            description: 'Invalid ObjectId',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          404: {
            description: 'Upload not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Uploads'],
        summary: 'Delete an upload',
        description:
          'Deletes the MongoDB record, the original file, the optimized image, and the thumbnail.',
        responses: {
          200: {
            description: 'Upload deleted',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DeleteResponse' },
              },
            },
          },
          400: {
            description: 'Invalid ObjectId',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          404: {
            description: 'Upload not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/uploads/optimized/{filename}': {
      get: {
        tags: ['Files'],
        summary: 'Serve optimized image',
        parameters: [
          {
            name: 'filename',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'Optimized WebP image',
            content: {
              'image/webp': {
                schema: { type: 'string', format: 'binary' },
              },
            },
          },
          404: { description: 'Image not found' },
        },
      },
    },
    '/uploads/thumbnails/{filename}': {
      get: {
        tags: ['Files'],
        summary: 'Serve image thumbnail',
        parameters: [
          {
            name: 'filename',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'WebP thumbnail',
            content: {
              'image/webp': {
                schema: { type: 'string', format: 'binary' },
              },
            },
          },
          404: { description: 'Thumbnail not found' },
        },
      },
    },
  },
  components: {
    schemas: {
      Upload: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '6712a1f3c9e77b0012a4b6d1' },
          originalName: { type: 'string', example: 'profile.png' },
          filename: {
            type: 'string',
            example:
              '1730123456789-4f1c2d8e-9a3b-4c5d-8e7f-1a2b3c4d5e6f.png',
          },
          url: {
            type: 'string',
            format: 'uri',
            example:
              'http://localhost:5000/uploads/optimized/1730123456789-4f1c2d8e-9a3b-4c5d-8e7f-1a2b3c4d5e6f.webp',
          },
          thumbnailUrl: {
            type: 'string',
            format: 'uri',
            example:
              'http://localhost:5000/uploads/thumbnails/1730123456789-4f1c2d8e-9a3b-4c5d-8e7f-1a2b3c4d5e6f.webp',
          },
          relativeUrl: {
            type: 'string',
            example:
              '/uploads/optimized/1730123456789-4f1c2d8e-9a3b-4c5d-8e7f-1a2b3c4d5e6f.webp',
          },
          relativeThumbnailUrl: {
            type: 'string',
            example:
              '/uploads/thumbnails/1730123456789-4f1c2d8e-9a3b-4c5d-8e7f-1a2b3c4d5e6f.webp',
          },
          mimetype: {
            type: 'string',
            enum: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
          },
          format: { type: 'string', example: 'png' },
          width: { type: 'integer', example: 1200 },
          height: { type: 'integer', example: 800 },
          size: { type: 'integer', example: 245678 },
          optimizedSize: { type: 'integer', example: 102345 },
          thumbnailSize: { type: 'integer', example: 8456 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      UploadResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: {
            type: 'string',
            example: 'Image uploaded and processed successfully',
          },
          data: { $ref: '#/components/schemas/Upload' },
        },
      },
      UploadListResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Uploads fetched successfully' },
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/Upload' },
          },
          pagination: { $ref: '#/components/schemas/Pagination' },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          total: { type: 'integer', example: 42 },
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 10 },
          totalPages: { type: 'integer', example: 5 },
          hasNextPage: { type: 'boolean', example: true },
          hasPrevPage: { type: 'boolean', example: false },
        },
      },
      DeleteResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Upload deleted successfully' },
          data: {
            type: 'object',
            properties: {
              id: { type: 'string', example: '6712a1f3c9e77b0012a4b6d1' },
            },
          },
        },
      },
      HealthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'API is healthy' },
          data: {
            type: 'object',
            properties: {
              uptime: { type: 'number', example: 123.45 },
              timestamp: { type: 'string', format: 'date-time' },
              database: { type: 'string', example: 'connected' },
            },
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: {
            type: 'string',
            example: 'File is too large. Maximum allowed size is 2 MB.',
          },
          errors: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
    },
  },
};

module.exports = openapiSpec;
