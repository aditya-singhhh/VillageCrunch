const path = require('path');
const fs = require('fs');

/**
 * All user/admin uploaded files live under ONE configurable root so it can be
 * mounted as a persistent volume (Docker, VM disk, etc.). It is deliberately
 * outside the frontend build output, which is wiped on every deploy.
 */
const UPLOAD_ROOT = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads'));

const dirs = {
  products: path.join(UPLOAD_ROOT, 'Product_Images'),
  reviews: path.join(UPLOAD_ROOT, 'Review_Images'),
  support: path.join(UPLOAD_ROOT, 'support-images'),
};
Object.values(dirs).forEach((d) => fs.mkdirSync(d, { recursive: true }));

// The file extension is derived from the verified MIME type, never from the
// client-supplied filename (which could be ".html"/".svg" and become stored XSS).
const ALLOWED_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const imageFileFilter = (req, file, cb) => {
  if (ALLOWED_TYPES[file.mimetype]) return cb(null, true);
  cb(new Error('Only JPEG, PNG, WebP or GIF images are allowed'));
};

const safeExtension = (file) => ALLOWED_TYPES[file.mimetype] || '.bin';

/**
 * Map a stored image reference (e.g. "/Product_Images/x.jpg" or a full URL that
 * contains that segment) to an absolute path INSIDE `dir`, or null if the value
 * is external / not managed by us. Prevents path traversal on delete.
 */
const managedImagePath = (imageRef, urlSegment, dir) => {
  const ref = String(imageRef || '').split('?')[0];
  const marker = `/${urlSegment}/`;
  const idx = ref.indexOf(marker);
  if (idx === -1) return null;
  const name = path.basename(ref.slice(idx + marker.length));
  if (!name || name === '.' || name === '..') return null;
  const full = path.join(dir, name);
  return full.startsWith(dir + path.sep) ? full : null;
};

module.exports = { UPLOAD_ROOT, dirs, imageFileFilter, safeExtension, managedImagePath };
