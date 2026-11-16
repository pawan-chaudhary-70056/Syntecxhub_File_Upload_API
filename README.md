# Syntecxhub File Upload API

Back-End Development Week 1 — **Project 3: File / Image Upload API**

A production-minded REST API that accepts image uploads with Multer, stores file metadata in MongoDB, serves the uploaded images, and applies multiple layers of validation and security.

Built for the **Syntecxhub Back-End Development Internship** using:

`Node.js` · `Express` · `MongoDB` · `Mongoose` · `Multer` · `Postman`

---

## Features

- Upload a single image using `multipart/form-data` (`image` field)
- Store `originalName`, `filename`, `path`, `url`, `mimetype`, `size`, and timestamps in MongoDB
- Serve uploaded images from `/uploads/:filename`
- List uploads with pagination and MIME-type filtering
- Fetch a single upload by ID
- Delete an upload from both MongoDB and disk
- Automatic cleanup when validation or database writes fail
- Centralised error handling with consistent JSON responses
- Postman collection included for testing

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (v18+) |
| Framework | Express.js |
| Database | MongoDB |
| ODM | Mongoose |
| File upload | Multer (disk storage) |
| API testing | Postman |
| Security | Helmet, CORS, express-rate-limit, magic-byte validation |

---

## Project Structure

```
Syntecxhub_File_Upload_API/
├── src/
│   ├── config/
│   │   ├── db.js                   # MongoDB connection
│   │   └── upload.js               # Upload constants (dir, size, MIME types)
│   ├── models/
│   │   └── Upload.js               # File metadata schema
│   ├── controllers/
│   │   └── upload.controller.js    # Upload, list, get, delete logic
│   ├── routes/
│   │   └── upload.routes.js        # /api/uploads routes
│   ├── middleware/
│   │   ├── upload.middleware.js    # Multer config + signature verification
│   │   ├── error.middleware.js     # Central error handler
│   │   ├── notFound.middleware.js  # 404 handler
│   │   └── rateLimit.middleware.js # API + upload rate limits
│   ├── utils/
│   │   ├── ApiError.js             # Custom HTTP error class
│   │   ├── asyncHandler.js         # Async error wrapper
│   │   └── fileSignature.js        # Magic-byte image validation
│   ├── app.js                      # Express app and middleware
│   └── server.js                   # DB connection and server startup
├── uploads/                        # Uploaded images (gitignored)
│   └── .gitkeep
├── postman/
│   └── Syntecxhub_File_Upload_API.postman_collection.json
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## Getting Started

### 1. Prerequisites

- Node.js v18 or newer
- MongoDB running locally **or** a MongoDB Atlas connection string
- Postman (optional, for testing)

### 2. Install dependencies

```bash
cd Syntecxhub_File_Upload_API
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Then edit `.env`:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/syntecxhub_upload
BASE_URL=http://localhost:5000
CORS_ORIGIN=*
UPLOAD_DIR=uploads
MAX_FILE_SIZE=2097152
```

| Variable | Description |
|---|---|
| `PORT` | Port the API listens on |
| `NODE_ENV` | `development` or `production` |
| `MONGO_URI` | MongoDB local or Atlas connection string |
| `BASE_URL` | Public base URL used to build absolute image URLs |
| `CORS_ORIGIN` | Comma-separated allowed origins, or `*` |
| `UPLOAD_DIR` | Folder where images are stored |
| `MAX_FILE_SIZE` | Maximum upload size in bytes (default 2 MB) |

### 4. Start MongoDB

Local:

```bash
mongod --dbpath /path/to/your/mongodb-data
```

Or use a MongoDB Atlas cluster and put its URI in `MONGO_URI`.

### 5. Run the server

```bash
# development (nodemon)
npm run dev

# production
npm start
```

Health check:

```bash
curl http://localhost:5000/api/health
```

---

## API Endpoints

Base URL: `http://localhost:5000`

| Method | Endpoint | Description | Success |
|---|---|---|---|
| `GET` | `/api/health` | Health check | `200` |
| `POST` | `/api/uploads` | Upload an image (field: `image`) | `201` |
| `GET` | `/api/uploads` | List uploads with pagination | `200` |
| `GET` | `/api/uploads/:id` | Get one upload's metadata | `200` |
| `GET` | `/uploads/:filename` | Serve the uploaded image | `200` |
| `DELETE` | `/api/uploads/:id` | Delete metadata + file | `200` |

### List query parameters

| Parameter | Default | Description |
|---|---|---|
| `page` | `1` | Page number |
| `limit` | `10` | Items per page (max 50) |
| `mimetype` | – | Filter by `image/jpeg`, `image/png`, `image/webp`, or `image/gif` |

Example: `GET /api/uploads?page=1&limit=10&mimetype=image/png`

---

## Example Requests

### Upload an image

```bash
curl -X POST http://localhost:5000/api/uploads \
  -F "image=@/path/to/photo.png"
```

Success response (`201`):

```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "data": {
    "id": "6712a1f3c9e77b0012a4b6d1",
    "originalName": "photo.png",
    "filename": "1730123456789-4f1c2d8e-9a3b-4c5d-8e7f-1a2b3c4d5e6f.png",
    "url": "http://localhost:5000/uploads/1730123456789-...png",
    "relativeUrl": "/uploads/1730123456789-...png",
    "mimetype": "image/png",
    "size": 24567,
    "createdAt": "2026-11-16T10:00:00.000Z",
    "updatedAt": "2026-11-16T10:00:00.000Z"
  }
}
```

### List uploads

```bash
curl "http://localhost:5000/api/uploads?page=1&limit=10"
```

```json
{
  "success": true,
  "message": "Uploads fetched successfully",
  "data": [],
  "pagination": {
    "total": 0,
    "page": 1,
    "limit": 10,
    "totalPages": 0,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

### Get one upload

```bash
curl http://localhost:5000/api/uploads/<id>
```

### Serve the image

```bash
curl http://localhost:5000/uploads/<filename>
```

### Delete an upload

```bash
curl -X DELETE http://localhost:5000/api/uploads/<id>
```

```json
{
  "success": true,
  "message": "Upload deleted successfully",
  "data": {
    "id": "6712a1f3c9e77b0012a4b6d1"
  }
}
```

---

## Error Response Format

All errors use the same shape:

```json
{
  "success": false,
  "message": "File is too large. Maximum allowed size is 2 MB."
}
```

Validation errors can also include an `errors` array:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "Original file name is required"
  ]
}
```

| Status | Meaning |
|---|---|
| `400` | Validation error, invalid ID, wrong file type, oversized file |
| `404` | Upload or route not found |
| `409` | Duplicate record |
| `429` | Rate limit exceeded |
| `500` | Internal server error |

---

## Security Measures

This project goes beyond the minimum upload requirement:

1. **MIME-type allow-list** — only JPEG, PNG, WebP, and GIF are accepted.
2. **Extension/MIME match** — `photo.png` with `image/jpeg` is rejected.
3. **Magic-byte validation** — the real file signature is checked after upload; a renamed non-image file is rejected and deleted.
4. **File size limit** — configurable, 2 MB by default.
5. **Single-file limit** — extra files are rejected by Multer.
6. **Unguessable filenames** — timestamp + UUID, no original filename on disk.
7. **Original filename sanitisation** — path separators and unsafe characters are removed.
8. **Path-traversal protection** — deletion only works inside `UPLOAD_DIR`.
9. **Safe static serving** — `express.static` with `dotfiles: 'deny'`, `index: false`, and `nosniff`.
10. **Security headers** — Helmet (CSP, HSTS, X-Frame-Options, etc.).
11. **Rate limiting** — 300 API requests / 15 min; 30 uploads / 15 min.
12. **CORS allow-list** — configurable with `CORS_ORIGIN`.
13. **Small JSON body limit** — 10 KB, because uploads use multipart.
14. **No internal details leaked** — stack traces are logged server-side only and the absolute filesystem path is never returned in API responses.
15. **Orphan-file cleanup** — failed DB writes and invalid signatures remove the uploaded file.
16. **Graceful shutdown** — closes HTTP and MongoDB connections on `SIGINT` / `SIGTERM`.

---

## Postman

Import this collection into Postman:

```
postman/Syntecxhub_File_Upload_API.postman_collection.json
```

The collection includes:

- Health check
- Image upload (automatically saves the returned ID as `uploadId`)
- List uploads
- Get upload by ID
- Delete upload
- Negative tests (no file, wrong field, non-image, invalid ID, missing resource)

Set the `baseUrl` collection variable if your server runs on a different port.

---

## Testing Checklist

- [x] `POST /api/uploads` with a valid JPEG/PNG/WebP/GIF returns `201`
- [x] Uploaded file appears in `uploads/`
- [x] Metadata appears in MongoDB
- [x] `GET /uploads/:filename` serves the image
- [x] `GET /api/uploads` returns paginated results
- [x] `GET /api/uploads/:id` returns metadata
- [x] `DELETE /api/uploads/:id` removes DB record and disk file
- [x] Non-image file returns `400`
- [x] Renamed non-image with image MIME type returns `400`
- [x] File over the size limit returns `400`
- [x] Missing file / wrong field name returns `400`
- [x] Invalid ObjectId returns `400`
- [x] Missing resource returns `404`
- [x] Rate limit returns `429` after too many uploads

---

## Week 1 Task Mapping

| PDF Requirement | Implementation |
|---|---|
| Accept file/image uploads | `POST /api/uploads` |
| Use Multer for multipart/form-data | `src/middleware/upload.middleware.js` |
| Store metadata (filename, path, URL) in MongoDB | `src/models/Upload.js` |
| Serve images or return URLs | `/uploads/:filename` + absolute `url` in responses |
| Validate file type (images only) | MIME + extension allow-list |
| Set size limits | `MAX_FILE_SIZE` (2 MB default) |

---

## Troubleshooting

**`MongoDB connected` does not appear**
- Make sure `mongod` is running or `MONGO_URI` is correct.
- For Atlas, allow your IP address in the network access settings.

**`EADDRINUSE`**
- Port 5000 is already in use. Change `PORT` in `.env`.

**Upload fails with `LIMIT_UNEXPECTED_FILE`**
- Use the field name `image` in Postman's form-data body.

**Image URL does not open**
- Confirm `BASE_URL` matches the host/port where the API is running.

**Uploaded files are missing**
- They are intentionally gitignored. The folder keeps `.gitkeep` so it exists after cloning.

---

## License

MIT
