# Setup Guide — Syntecxhub File Upload API

Step-by-step setup instructions for the **File / Image Upload API** (Back-End Development Week 1 — Project 3).

This guide covers:

- Local development with Node.js + MongoDB
- MongoDB Atlas connection
- Environment configuration
- Running the API and Swagger docs
- Postman and `curl` testing
- Automated tests
- Docker + Docker Compose
- GitHub and internship submission

---

## 1. Prerequisites

Install/check these first:

| Tool | Minimum version | Check |
|---|---|---|
| Node.js | 18+ (20 or 22 recommended) | `node -v` |
| npm | 9+ | `npm -v` |
| MongoDB | 6+ local **or** Atlas | `mongod --version` / Atlas |
| Git | any recent | `git --version` |
| Postman | optional | — |
| Docker | optional | `docker --version` |

> Sharp (image processing library) installs prebuilt binaries automatically. No system-level image library is required.

---

## 2. Quick Start (TL;DR)

If Node.js and MongoDB are already installed and running:

```bash
cd /home/bh_in_ew/mark2/intern/Syntecxhub/Syntecxhub_File_Upload_API
npm install
cp .env.example .env
# Edit .env if your MongoDB URI is different
npm run dev
```

Open:

- API health: `http://localhost:5000/api/health`
- Swagger docs: `http://localhost:5000/api-docs`

---

## 3. Step-by-Step Setup

### Step 1 — Go to the project folder

```bash
cd /home/bh_in_ew/mark2/intern/Syntecxhub/Syntecxhub_File_Upload_API
```

If you cloned from GitHub:

```bash
git clone https://github.com/<your-username>/Syntecxhub_File_Upload_API.git
cd Syntecxhub_File_Upload_API
```

---

### Step 2 — Check Node.js and npm

```bash
node -v
npm -v
```

Expected: Node 18 or newer.

If Node is not installed:

- Download from https://nodejs.org (LTS)
- Or use `nvm`:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 20
nvm use 20
```

---

### Step 3 — Install dependencies

```bash
npm install
```

This installs:

- `express`, `mongoose`, `mongodb` driver
- `multer` for multipart uploads
- `sharp` for image processing
- `swagger-ui-express` for API docs
- `helmet`, `cors`, `express-rate-limit`, `morgan`, `dotenv`
- Dev tools: `nodemon`, `supertest`

If installation fails, delete `node_modules` and `package-lock.json`, then retry:

```bash
rm -rf node_modules package-lock.json
npm install
```

---

### Step 4 — Start MongoDB

Choose **one** option.

#### Option A — Local MongoDB (Linux)

If MongoDB is installed as a service:

```bash
sudo systemctl start mongod
sudo systemctl enable mongod
```

Verify:

```bash
mongosh --quiet --eval "db.runCommand({ ping: 1 }).ok"
```

Expected output: `1`

Connection string for `.env`:

```env
MONGO_URI=mongodb://127.0.0.1:27017/syntecxhub_upload
```

#### Option B — MongoDB with Docker (easiest)

```bash
docker run -d \
  --name syntecxhub-mongo \
  -p 27017:27017 \
  -v syntecxhub-mongo-data:/data/db \
  mongo:7
```

Verify:

```bash
docker exec syntecxhub-mongo mongosh --quiet --eval "db.runCommand({ ping: 1 }).ok"
```

Connection string:

```env
MONGO_URI=mongodb://127.0.0.1:27017/syntecxhub_upload
```

Stop it later with:

```bash
docker stop syntecxhub-mongo
```

#### Option C — MongoDB Atlas (cloud)

1. Create a free account at https://www.mongodb.com/atlas
2. Create a free **M0** cluster
3. Create a database user (username + password)
4. Under **Network Access**, allow your IP address (or `0.0.0.0/0` for local development only)
5. Click **Connect → Drivers** and copy the connection string

Add the database name `syntecxhub_upload` before the query string:

```env
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/syntecxhub_upload?retryWrites=true&w=majority
```

Replace `<username>` and `<password>` with your Atlas credentials. If your password contains special characters, URL-encode it.

---

### Step 5 — Create the environment file

```bash
cp .env.example .env
```

Open `.env` and adjust values:

```env
PORT=5000
NODE_ENV=development

MONGO_URI=mongodb://127.0.0.1:27017/syntecxhub_upload
BASE_URL=http://localhost:5000
CORS_ORIGIN=*

UPLOAD_DIR=uploads
MAX_FILE_SIZE=2097152

IMAGE_MAX_WIDTH=1920
IMAGE_MAX_HEIGHT=1920
THUMBNAIL_SIZE=200
WEBP_QUALITY=82
MAX_IMAGE_PIXELS=268402689
```

| Variable | Meaning |
|---|---|
| `PORT` | API port |
| `NODE_ENV` | `development` / `production` / `test` |
| `MONGO_URI` | MongoDB local or Atlas connection string |
| `BASE_URL` | Public base URL used to build absolute image URLs |
| `CORS_ORIGIN` | Comma-separated allowed origins, or `*` |
| `UPLOAD_DIR` | Root folder for uploads |
| `MAX_FILE_SIZE` | Max upload size in bytes (2 MB default) |
| `IMAGE_MAX_WIDTH` | Max width of optimized image |
| `IMAGE_MAX_HEIGHT` | Max height of optimized image |
| `THUMBNAIL_SIZE` | Thumbnail width/height |
| `WEBP_QUALITY` | WebP quality (1–100) |
| `MAX_IMAGE_PIXELS` | Decompression-bomb protection limit |

> `.env` is gitignored. Never commit it. `.env.example` is safe to commit.

---

### Step 6 — Start the API

Development mode (auto-restart with nodemon):

```bash
npm run dev
```

Production mode:

```bash
npm start
```

Expected output:

```
MongoDB connected: 127.0.0.1/syntecxhub_upload
Server running in development mode on port 5000
Health check: http://localhost:5000/api/health
```

Keep this terminal open. Use a second terminal for tests/curl.

---

### Step 7 — Verify the health endpoint

```bash
curl http://localhost:5000/api/health
```

Expected:

```json
{
  "success": true,
  "message": "API is healthy",
  "data": {
    "uptime": 12.34,
    "timestamp": "2026-11-16T10:00:00.000Z",
    "database": "connected"
  }
}
```

If `database` is not `connected`, MongoDB is not running or `MONGO_URI` is wrong.

---

### Step 8 — Open Swagger API docs

```
http://localhost:5000/api-docs
```

Raw OpenAPI document:

```
http://localhost:5000/api-docs.json
```

From Swagger UI you can:

- See every endpoint and schema
- Upload an image using **POST /api/uploads → Try it out**
- Test list/get/delete endpoints

---

### Step 9 — Test with Postman

1. Open Postman.
2. Click **Import**.
3. Select:

   ```
   postman/Syntecxhub_File_Upload_API.postman_collection.json
   ```

4. Confirm the collection variable:

   ```
   baseUrl = http://localhost:5000
   ```

5. Run the requests in order:

   | Request | Expected |
   |---|---|
   | Health Check | `200` |
   | Upload Image | `201` |
   | List Uploads | `200` |
   | Get Upload by ID | `200` |
   | Serve Optimized Image | `200` |
   | Serve Thumbnail | `200` |
   | Delete Upload | `200` |

6. For **Upload Image**, select a JPEG, PNG, WebP, or GIF file (max 2 MB) in the form-data body. The field name must be `image`.

The upload request automatically saves:

- `uploadId`
- `optimizedPath`
- `thumbnailPath`
- `originalFilename`

so the other requests can use them.

Negative tests are included:

- No file
- Wrong field name (`file` instead of `image`)
- Non-image file
- Invalid ObjectId
- Missing upload
- Unknown route

---

### Step 10 — Test with curl (optional)

Upload:

```bash
curl -X POST http://localhost:5000/api/uploads \
  -F "image=@/path/to/photo.jpg"
```

List:

```bash
curl "http://localhost:5000/api/uploads?page=1&limit=10"
```

Get one:

```bash
curl http://localhost:5000/api/uploads/<id>
```

Serve optimized image:

```bash
curl -o optimized.webp http://localhost:5000/uploads/optimized/<filename>.webp
```

Delete:

```bash
curl -X DELETE http://localhost:5000/api/uploads/<id>
```

---

### Step 11 — Run automated tests

Make sure MongoDB is running first. Tests use a separate database:

```
syntecxhub_upload_test
```

Run:

```bash
npm test
```

Expected result:

```
# pass ...
# fail 0
```

Override the test database if needed:

```bash
MONGO_URI=mongodb://127.0.0.1:27017/my_test_db npm test
```

The tests cover:

- Health endpoint
- Upload success + Sharp processing + thumbnail creation
- Metadata persistence in MongoDB
- Pagination
- Get by ID
- Serving optimized image and thumbnail
- Originals not publicly accessible
- Delete (database + all files)
- Fake image / wrong MIME / oversized file
- Missing file / wrong field name
- Invalid and missing IDs
- Swagger UI and OpenAPI JSON

---

### Step 12 — Run with Docker Compose (optional)

This starts both the API and MongoDB.

```bash
docker compose up --build
```

Open:

```
http://localhost:5000/api/health
http://localhost:5000/api-docs
```

MongoDB is **not** exposed on the host, so it cannot conflict with a local `mongod` on port 27017. To open a Mongo shell inside the container:

```bash
docker compose exec mongo mongosh
```

Stop:

```bash
docker compose down
```

Stop and delete database + uploaded files:

```bash
docker compose down -v
```

Rebuild after code changes:

```bash
docker compose up --build
```

> Before deploying, change `BASE_URL` in `docker-compose.yml` to your public domain, and set `CORS_ORIGIN` to your frontend origin instead of `*`.

---

### Step 13 — Push to GitHub

Create a new public repository named:

```
Syntecxhub_File_Upload_API
```

Then:

```bash
git branch -M main
git remote add origin https://github.com/<your-username>/Syntecxhub_File_Upload_API.git
git push -u origin main
```

Verify that `.env` is **not** in the repository:

```bash
git ls-files | grep "^\.env$"
```

Expected: no output.

---

### Step 14 — Internship submission checklist

- [ ] API runs locally
- [ ] All automated tests pass (`npm test`)
- [ ] Postman collection tested
- [ ] Swagger docs open at `/api-docs`
- [ ] GitHub repo public and pushed
- [ ] README + `setup.md` included
- [ ] `.env.example` included; `.env` excluded
- [ ] LinkedIn post published with **@Syntecxhub** mention
- [ ] Official Submission Form filled before the deadline

---

## 4. Troubleshooting

### `MongooseServerSelectionError` / `ECONNREFUSED 127.0.0.1:27017`

MongoDB is not running.

```bash
sudo systemctl start mongod
# or
docker start syntecxhub-mongo
```

### `EADDRINUSE: address already in use :::5000`

Another process is using port 5000.

```bash
# Find it
sudo lsof -i :5000

# Or change the port in .env
PORT=5001
```

If you are switching between `npm run dev` and `docker compose up`, stop the local server first. Docker publishes port 5000.

### Docker Compose and local MongoDB both use 27017

The Compose file intentionally does **not** publish MongoDB's port, so no conflict is possible. Use:

```bash
docker compose exec mongo mongosh
```

If you want host access from MongoDB Compass, add this under the `mongo` service:

```yaml
ports:
  - "27017:27017"
```

Then stop your local MongoDB first.

### `MONGO_URI is not defined`

You did not create `.env`, or you started the server from the wrong folder.

```bash
cp .env.example .env
```

### Upload fails with `LIMIT_UNEXPECTED_FILE`

The form-data field is not named `image`.

Correct:

```
image = <selected file>
```

Wrong:

```
file = <selected file>
```

### Upload fails with "Unsupported file type"

Only these are allowed:

- JPEG (`.jpg`, `.jpeg`)
- PNG (`.png`)
- WebP (`.webp`)
- GIF (`.gif`)

### Upload fails with "does not match a supported image format"

The file extension/MIME type says image, but the actual bytes are not a valid image. This is the magic-byte security check working correctly.

### Upload fails with "File is too large"

Increase `MAX_FILE_SIZE` in `.env` (bytes) and restart the server.

### `sharp` installation error

```bash
npm rebuild sharp
```

Make sure Node.js is 18+ (20/22 recommended).

### Permission denied when writing uploads

```bash
mkdir -p uploads/originals uploads/optimized uploads/thumbnails
chmod -R u+rwX uploads
```

For Docker bind mounts, make sure the container user can write to the mounted folder.

### Swagger page is blank

- Open `http://localhost:5000/api-docs/` (with trailing slash).
- Check the browser console for CSP errors.
- Confirm the server is running and `/api-docs.json` returns JSON.

### Atlas authentication failed

- Verify the username/password in `MONGO_URI`.
- URL-encode special characters in the password.
- Confirm your IP is allowed under **Network Access**.

---

## 5. Folder Overview

```
Syntecxhub_File_Upload_API/
├── src/
│   ├── config/          # DB + upload constants
│   ├── controllers/     # Request handlers
│   ├── docs/            # OpenAPI/Swagger spec
│   ├── middleware/      # Multer, errors, 404, rate limits
│   ├── models/          # Mongoose schemas
│   ├── routes/          # Express routes
│   ├── utils/           # ApiError, async wrapper, signatures, Sharp
│   ├── app.js
│   └── server.js
├── tests/               # Automated API tests
├── postman/             # Postman collection
├── uploads/             # originals/, optimized/, thumbnails/
├── .github/workflows/   # GitHub Actions CI
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── README.md
└── setup.md
```

---

## 6. Useful Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start with nodemon |
| `npm start` | Start normally |
| `npm test` | Run automated tests |
| `docker compose up --build` | Start API + MongoDB in Docker |
| `docker compose down` | Stop Docker services |
| `docker compose down -v` | Stop and delete volumes |
| `curl localhost:5000/api/health` | Health check |
| `mongosh` | Open MongoDB shell |
