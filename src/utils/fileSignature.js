const fs = require('fs/promises');

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

/**
 * Magic-byte validators.
 * A spoofed Content-Type or file extension is not enough - the actual
 * bytes of the file must match a real image format.
 */
const signatures = {
  'image/jpeg': (buffer) =>
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff,

  'image/png': (buffer) =>
    buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_SIGNATURE),

  'image/gif': (buffer) => {
    if (buffer.length < 6) return false;
    const header = buffer.subarray(0, 6).toString('ascii');
    return header === 'GIF87a' || header === 'GIF89a';
  },

  'image/webp': (buffer) =>
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP',
};

/**
 * Reads the first bytes of an uploaded file and verifies that its
 * content matches a supported image format.
 *
 * @param {string} filePath Absolute path of the uploaded file.
 * @param {string} mimetype Declared MIME type of the upload.
 * @returns {Promise<boolean>}
 */
async function hasValidImageSignature(filePath, mimetype) {
  const check = signatures[mimetype];
  if (!check) return false;

  const handle = await fs.open(filePath, 'r');

  try {
    const buffer = Buffer.alloc(12);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    return check(buffer.subarray(0, bytesRead));
  } finally {
    await handle.close();
  }
}

module.exports = { hasValidImageSignature };
