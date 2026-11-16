const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const mongoose = require('mongoose');
const request = require('supertest');
const sharp = require('sharp');

// Configure the app before requiring it so config/upload.js picks up the
// temporary upload directory.
const TEST_UPLOAD_DIR = fs.mkdtempSync(
  path.join(os.tmpdir(), 'syntecxhub-upload-test-')
);

process.env.NODE_ENV = 'test';
process.env.UPLOAD_DIR = TEST_UPLOAD_DIR;
process.env.BASE_URL = 'http://localhost:5000';
process.env.MAX_FILE_SIZE = String(2 * 1024 * 1024);
process.env.MONGO_URI =
  process.env.MONGO_URI ||
  'mongodb://127.0.0.1:27017/syntecxhub_upload_test';

const app = require('../src/app');
const Upload = require('../src/models/Upload');
const {
  OPTIMIZED_DIR,
  ORIGINALS_DIR,
  THUMBNAILS_DIR,
} = require('../src/config/upload');

// Generated with Sharp in the before() hook so it is guaranteed to be
// a fully valid, decodable PNG.
let PNG_BUFFER;

function pngFile(filename = 'valid.png') {
  return { filename, contentType: 'image/png' };
}

function uploadValidImage() {
  return request(app)
    .post('/api/uploads')
    .attach('image', PNG_BUFFER, pngFile());
}

before(async () => {
  PNG_BUFFER = await sharp({
    create: {
      width: 2,
      height: 2,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
  });
});

after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  fs.rmSync(TEST_UPLOAD_DIR, { recursive: true, force: true });
});

beforeEach(async () => {
  await Upload.deleteMany({});

  for (const directory of [ORIGINALS_DIR, OPTIMIZED_DIR, THUMBNAILS_DIR]) {
    fs.rmSync(directory, { recursive: true, force: true });
    fs.mkdirSync(directory, { recursive: true });
  }
});

test('GET /api/health reports a healthy API', async () => {
  const res = await request(app).get('/api/health');

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.database, 'connected');
});

test('POST /api/uploads stores metadata and creates optimized image + thumbnail', async () => {
  const res = await uploadValidImage();

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);

  const data = res.body.data;
  assert.match(data.url, /\/uploads\/optimized\/.+\.webp$/);
  assert.match(data.thumbnailUrl, /\/uploads\/thumbnails\/.+\.webp$/);
  assert.equal(data.mimetype, 'image/png');
  assert.equal(data.format, 'png');
  assert.equal(data.width, 2);
  assert.equal(data.height, 2);
  assert.ok(data.size > 0);
  assert.ok(data.optimizedSize > 0);
  assert.ok(data.thumbnailSize > 0);
  assert.equal(Object.hasOwn(data, 'path'), false);

  const record = await Upload.findById(data.id).lean();
  assert.ok(record);
  assert.ok(fs.existsSync(record.path));
  assert.ok(fs.existsSync(record.optimizedPath));
  assert.ok(fs.existsSync(record.thumbnailPath));
});

test('GET /api/uploads returns paginated metadata', async () => {
  await uploadValidImage();

  const res = await request(app).get('/api/uploads?page=1&limit=5');

  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, 1);
  assert.equal(res.body.pagination.total, 1);
  assert.equal(res.body.pagination.page, 1);
  assert.equal(res.body.pagination.limit, 5);
  assert.equal(res.body.pagination.totalPages, 1);
});

test('GET /api/uploads/:id returns metadata and serves optimized image + thumbnail', async () => {
  const uploadRes = await uploadValidImage();
  const data = uploadRes.body.data;

  const getRes = await request(app).get(`/api/uploads/${data.id}`);
  assert.equal(getRes.status, 200);
  assert.equal(getRes.body.data.id, data.id);

  const optimized = await request(app).get(new URL(data.url).pathname);
  assert.equal(optimized.status, 200);
  assert.match(optimized.headers['content-type'], /image\/webp/);

  const thumbnail = await request(app).get(new URL(data.thumbnailUrl).pathname);
  assert.equal(thumbnail.status, 200);
  assert.match(thumbnail.headers['content-type'], /image\/webp/);
});

test('original files are not publicly served', async () => {
  const uploadRes = await uploadValidImage();
  const record = await Upload.findById(uploadRes.body.data.id).lean();

  const res = await request(app).get(`/uploads/originals/${record.filename}`);
  assert.equal(res.status, 404);
});

test('DELETE /api/uploads/:id removes the record and all three files', async () => {
  const uploadRes = await uploadValidImage();
  const data = uploadRes.body.data;
  const record = await Upload.findById(data.id).lean();

  const deleteRes = await request(app).delete(`/api/uploads/${data.id}`);
  assert.equal(deleteRes.status, 200);
  assert.equal(await Upload.findById(data.id), null);
  assert.equal(fs.existsSync(record.path), false);
  assert.equal(fs.existsSync(record.optimizedPath), false);
  assert.equal(fs.existsSync(record.thumbnailPath), false);

  const getRes = await request(app).get(`/api/uploads/${data.id}`);
  assert.equal(getRes.status, 404);
});

test('rejects a text file with a spoofed image MIME type', async () => {
  const res = await request(app)
    .post('/api/uploads')
    .attach('image', Buffer.from('definitely not an image'), pngFile('fake.png'));

  assert.equal(res.status, 400);
  assert.match(res.body.message, /does not match a supported image format/i);
});

test('rejects non-image MIME types', async () => {
  const res = await request(app)
    .post('/api/uploads')
    .attach('image', Buffer.from('hello'), {
      filename: 'notes.txt',
      contentType: 'text/plain',
    });

  assert.equal(res.status, 400);
  assert.match(res.body.message, /unsupported file type/i);
});

test('rejects files larger than MAX_FILE_SIZE', async () => {
  const bigBuffer = Buffer.alloc(3 * 1024 * 1024, 1);

  const res = await request(app)
    .post('/api/uploads')
    .attach('image', bigBuffer, pngFile('big.png'));

  assert.equal(res.status, 400);
  assert.match(res.body.message, /too large/i);
});

test('rejects missing files and wrong field names', async () => {
  const noFile = await request(app).post('/api/uploads');
  assert.equal(noFile.status, 400);

  const wrongField = await request(app)
    .post('/api/uploads')
    .attach('file', PNG_BUFFER, pngFile());

  assert.equal(wrongField.status, 400);
  assert.match(wrongField.body.message, /image/i);
});

test('returns 400 for invalid ids and 404 for missing uploads', async () => {
  const invalid = await request(app).get('/api/uploads/not-a-valid-id');
  assert.equal(invalid.status, 400);

  const missing = await request(app).get(
    '/api/uploads/000000000000000000000000'
  );
  assert.equal(missing.status, 404);
});

test('serves Swagger UI and the OpenAPI document', async () => {
  const spec = await request(app).get('/api-docs.json');
  assert.equal(spec.status, 200);
  assert.equal(spec.body.openapi, '3.0.3');

  const docs = await request(app).get('/api-docs/');
  assert.equal(docs.status, 200);
  assert.match(docs.headers['content-type'], /text\/html/);
});
