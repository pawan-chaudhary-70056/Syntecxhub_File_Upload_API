# Syntecxhub File Upload API

Back-End Development Week 1 — **Project 3: File / Image Upload API**

A production-minded REST API that accepts image uploads with Multer, validates and processes them with Sharp, stores metadata in MongoDB, and serves optimized WebP images plus thumbnails.

Built for the **Syntecxhub Back-End Development Internship** using:

`Node.js` · `Express` · `MongoDB` · `Mongoose` · `Multer` · `Sharp` · `Swagger` · `Postman` · `Docker`

---

## Highlights

- Image upload via `multipart/form-data` (`image` field)
- **Sharp processing** — auto-rotate, resize, WebP conversion, thumbnail generation, EXIF/GPS stripping
- **Decompression-bomb protection** via pixel limits
- Metadata stored in MongoDB — filename, paths, URLs, dimensions, format, sizes
- Optimized image and thumbnail serving
- Pagination and MIME-type filtering
- Delete removes the database record and all three files
- Multi-layer file validation — MIME, extension, magic bytes
- Swagger UI at `/api-docs`
- Automated tests with Node's test runner + Supertest
- GitHub Actions CI
- Docker + Docker Compose
- Helmet, CORS, rate limiting, safe static serving, centralised error handling

> Full setup instructions: **[setup.md](setup.md)**

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express.js |
| Database | MongoDB |
| ODM | Mongoose |
| Upload | Multer (disk storage) |
| Image processing | Sharp |
| API docs | Swagger UI / OpenAPI 3.0 |
| Testing | Node test runner + Supertest |
| Security | Helmet, CORS, express-rate-limit, magic-byte validation |
| DevOps | Docker, Docker Compose, GitHub Actions |

---

## Project Structure

```
Syntecxhub_File_Upload_API/
├── src/
│   ├── config/
│   │   ├── db.js                   # MongoDB connection
│   │   └── upload.js               # Upload + image processing constants
│   ├── controllers/
│   │   └── upload.controller.js    # Upload, list, get, delete
│   ├── docs/
│   │   └── openapi.js              # OpenAPI 3.0 specification
│   ├── middleware/
│   │   ├── upload.middleware.js    # Multer + magic-byte verification
│   │   ├── error.middleware.js     # Central error handler
│   │   ├── notFound.middleware.js  # 404 handler
│   │   └── rateLimit.middleware.js # API + upload rate limits
│   ├── models/
│   │   └── Upload.js               # File metadata schema
│   ├── routes/
│   │   └── upload.routes.js        # /api/uploads routes
│   ├── utils/
│   │   ├── ApiError.js             # Custom HTTP error
│   │   ├── asyncHandler.js         # Async error wrapper
│   │   ├── fileSignature.js        # Magic-byte validation
│   │   └── imageProcessor.js       # Sharp processing + thumbnails
│   ├── app.js
│   └── server.js
├── tests/
│   └── upload.test.js              # API integration tests
├── postman/
│   └── Syntecxhub_File_Upload_API.postman_collection.json
├── uploads/
│   ├── originals/                  # Private originals (gitignored)
│   ├── optimized/                  # Public WebP images (gitignored)
│   └── thumbnails/                 # Public WebP thumbnails (gitignored)
├── .github/workflows/ci.yml
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── setup.md
```

---

## Quick Start

```bash
cd Syntecxhub_File_Upload_API
npm install
cp .env.example .env
# Edit .env if your MongoDB URI is different
npm run dev
```

- Health: `http://localhost:5000/api/health`
- Swagger: `http://localhost:5000/api-docs`

See **[setup.md](setup.md)** for MongoDB, Atlas, Docker, Postman, tests, and troubleshooting.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | API port |
| `NODE_ENV` | `development` | Environment |
| `MONGO_URI` | — | MongoDB local or Atlas URI |
| `BASE_URL` | `http://localhost:5000` | Base URL for absolute image URLs |
| `CORS_ORIGIN` | `*` | Comma-separated allowed origins |
| `UPLOAD_DIR` | `uploads` | Upload root directory |
| `MAX_FILE_SIZE` | `2097152` | Max upload size in bytes (2 MB) |
| `IMAGE_MAX_WIDTH` | `1920` | Optimized image max width |
| `IMAGE_MAX_HEIGHT` | `1920` | Optimized image max height |
| `THUMBNAIL_SIZE` | `200` | Thumbnail width/height |
| `WEBP_QUALITY` | `82` | WebP quality (1–100) |
| `MAX_IMAGE_PIXELS` | `268402689` | Pixel limit (decompression-bomb protection) |

---

## API Endpoints

| Method | Endpoint | Description | Success |
|---|---|---|---|
| `GET` | `/api/health` | Health check | `200` |
| `POST` | `/api/uploads` | Upload an image (field: `image`) | `201` |
| `GET` | `/api/uploads` | List uploads with pagination | `200` |
| `GET` | `/api/uploads/:id` | Get one upload's metadata | `200` |
| `GET` | `/uploads/optimized/:filename` | Serve optimized WebP image | `200` |
| `GET` | `/uploads/thumbnails/:filename` | Serve WebP thumbnail | `200` |
| `DELETE` | `/api/uploads/:id` | Delete metadata + all files | `200` |
| `GET` | `/api-docs` | Swagger UI | `200` |
| `GET` | `/api-docs.json` | OpenAPI JSON | `200` |

### List query parameters

| Parameter | Default | Description |
|---|---|---|
| `page` | `1` | Page number |
| `limit` | `10` | Items per page (max 50) |
| `mimetype` | – | Filter by `image/jpeg`, `image/png`, `image/webp`, or `image/gif` |

Example: `GET /api/uploads?page=1&limit=10&mimetype=image/png`

---

## Upload Example

```bash
curl -X POST http://localhost:5000/api/uploads \
  -F "image=@/path/to/photo.jpg"
```

Response (`201`):

```json
{
  "success": true,
  "message": "Image uploaded and processed successfully",
  "data": {
    "id": "6712a1f3c9e77b0012a4b6d1",
    "originalName": "photo.jpg",
    "filename": "1730123456789-4f1c2d8e-9a3b-4c5d-8e7f-1a2b3c4d5e6f.jpg",
    "url": "http://localhost:5000/uploads/optimized/1730123456789-...webp",
    "thumbnailUrl": "http://localhost:5000/uploads/thumbnails/1730123456789-...webp",
    "relativeUrl": "/uploads/optimized/1730123456789-...webp",
    "relativeThumbnailUrl": "/uploads/thumbnails/1730123456789-...webp",
    "mimetype": "image/jpeg",
    "format": "jpeg",
    "width": 1920,
    "height": 1280,
    "size": 245678,
    "optimizedSize": 102345,
    "thumbnailSize": 8456,
    "createdAt": "2026-11-16T10:00:00.000Z",
    "updatedAt": "2026-11-16T10:00:00.000Z"
  }
}
```

The original file is stored privately at `uploads/originals/` and is **not** publicly served. Only the optimized WebP and thumbnail are exposed.

---

## Image Processing Pipeline

1. Multer writes the file to `uploads/originals/`.
2. Magic bytes are verified.
3. Sharp reads image metadata.
4. EXIF orientation is applied with `.rotate()`.
5. The image is resized to fit within `IMAGE_MAX_WIDTH` × `IMAGE_MAX_HEIGHT`.
6. It is converted to WebP at `WEBP_QUALITY`.
7. A `THUMBNAIL_SIZE` × `THUMBNAIL_SIZE` WebP thumbnail is generated.
8. EXIF/GPS metadata is stripped by Sharp.
9. Metadata is saved in MongoDB.
10. If anything fails, uploaded files are cleaned up.

> Animated GIFs are processed from their first frame and served as a static WebP.

---

## Security Measures

1. **MIME-type allow-list** — JPEG, PNG, WebP, GIF only.
2. **Extension/MIME match** — mismatches are rejected.
3. **Magic-byte validation** — renamed non-image files are rejected and deleted.
4. **File size limit** — configurable, 2 MB by default.
5. **Single-file limit** — extra files are rejected by Multer.
6. **Decompression-bomb protection** — `MAX_IMAGE_PIXELS` limits decoded pixels.
7. **EXIF/GPS stripping** — Sharp removes metadata from output images.
8. **Unguessable filenames** — timestamp + UUID; original filename is not used on disk.
9. **Original files are private** — only `optimized/` and `thumbnails/` are served.
10. **Path-traversal protection** — delete checks that files are inside `UPLOAD_DIR`.
11. **Safe static serving** — `dotfiles: 'deny'`, `index: false`, `nosniff`.
12. **Security headers** — Helmet (CSP, HSTS, X-Frame-Options, etc.).
13. **Rate limiting** — 300 API requests / 15 min; 30 uploads / 15 min.
14. **CORS allow-list** — configurable with `CORS_ORIGIN`.
15. **Small JSON body limit** — 10 KB.
16. **No internal details leaked** — no stack traces or absolute filesystem paths in API responses.
17. **Orphan-file cleanup** — failed DB writes, invalid signatures, and failed processing remove files.
18. **Graceful shutdown** — closes HTTP and MongoDB connections on `SIGINT` / `SIGTERM`.

---

## Testing

### Automated tests

MongoDB must be running. Tests use `syntecxhub_upload_test`.

```bash
npm test
```

Covers upload success, Sharp output, thumbnails, metadata, pagination, get/delete, originals not public, validation failures, oversized files, invalid IDs, and Swagger.

### Postman

Import:

```
postman/Syntecxhub_File_Upload_API.postman_collection.json
```

The collection includes positive and negative tests. Upload field name: `image`.

### CI

GitHub Actions runs `npm ci` + `npm test` against a MongoDB 7 service container:

```
.github/workflows/ci.yml
```

---

## Docker

```bash
docker compose up --build
```

API: `http://localhost:5000`

MongoDB is internal to the Compose network (not published on the host). Open a shell with:

```bash
docker compose exec mongo mongosh
```

Stop:

```bash
docker compose down
```

Remove volumes:

```bash
docker compose down -v
```

Change `BASE_URL` and `CORS_ORIGIN` in `docker-compose.yml` before deploying.

---

## Week 1 Task Mapping

| PDF Requirement | Implementation |
|---|---|
| Accept file/image uploads | `POST /api/uploads` |
| Use Multer for multipart/form-data | `src/middleware/upload.middleware.js` |
| Store metadata (filename, path, URL) in MongoDB | `src/models/Upload.js` |
| Serve images or return URLs | `/uploads/optimized` + `/uploads/thumbnails` + absolute URLs |
| Validate file type (images only) | MIME + extension + magic bytes |
| Set size limits | `MAX_FILE_SIZE` (2 MB default) |

**Extras:** Sharp optimization, thumbnails, EXIF stripping, Swagger, automated tests, CI, Docker.

---

## Troubleshooting

See **[setup.md](setup.md#4-troubleshooting)** for:

- MongoDB connection errors
- Port already in use
- `LIMIT_UNEXPECTED_FILE`
- Unsupported file types
- Sharp installation issues
- Docker permissions
- Swagger issues
- Atlas authentication

---

## License

MIT
