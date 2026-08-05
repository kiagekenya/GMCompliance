// utils/evidenceStorage.js
//
// Shared plumbing for real evidence file storage, used by both upload
// routes (routes/public/submitUpload.js, routes/complianceItems/
// uploadEvidence.js) and the serving route (routes/evidence/serveEvidence.js).
//
// Files live on local disk under backend/uploads/ (already gitignored).
// The DB only ever stores a relative path (storedName) plus metadata -
// never raw bytes, never a web-servable static path. Access control at
// read time lives entirely in serveEvidence.js (ownership check against
// the requesting operator), not in this file.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
const MAX_FILES_PER_REQUEST = 5;

// Denylist at upload time (defense in depth) - anything that could execute
// or render as active content if ever mishandled downstream.
const DANGEROUS_EXTENSIONS = ['.exe', '.bat', '.sh', '.cmd', '.html', '.htm', '.svg', '.js', '.mjs'];

// Allowlist at SERVE time - only these get "Content-Disposition: inline"
// (rendered in-browser). Anything else forces a download instead, even if
// the upload itself was allowed - this is the real defense against a
// stored-XSS style attack via a mislabeled upload (e.g. an anonymous public
// upload claiming to be text/html or image/svg+xml, later opened inline by
// an authenticated admin).
const INLINE_SAFE_MIME_TYPES = [
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'application/pdf',
  'text/plain',
];

function sanitizeFilename(originalName) {
  const base = path.basename(originalName || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
  return base || 'file';
}

function isDangerousExtension(originalName) {
  const ext = path.extname(originalName || '').toLowerCase();
  return DANGEROUS_EXTENSIONS.includes(ext);
}

function isInlineSafe(mimeType) {
  return INLINE_SAFE_MIME_TYPES.includes(mimeType);
}

// destinationSubdirFn(req) -> string, e.g. `public/${req.params.token}` or
// `items/${req.params.id}` - resolved per-request so each upload route can
// key its own folder without this module needing to know about tokens vs
// item ids.
function createUploadMiddleware(destinationSubdirFn) {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(UPLOADS_ROOT, destinationSubdirFn(req));
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      cb(null, `${crypto.randomUUID()}-${sanitizeFilename(file.originalname)}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE_BYTES, files: MAX_FILES_PER_REQUEST },
    fileFilter: (req, file, cb) => {
      if (isDangerousExtension(file.originalname)) {
        const err = new Error(`File type not allowed: ${path.extname(file.originalname)}`);
        err.status = 422;
        return cb(err);
      }
      cb(null, true);
    },
  });
}

// Builds the object stored in pendingEvidenceUrls/completedEvidenceUrls -
// storedName is relative to UPLOADS_ROOT so it survives an evidenceStorage
// path relocation without needing a data migration.
function buildEvidenceEntry(file, destinationSubdir, uploadedBy) {
  return {
    originalName: file.originalname,
    storedName: path.join(destinationSubdir, file.filename),
    mimeType: file.mimetype,
    size: file.size,
    uploadedBy,
    uploadedAt: new Date(),
  };
}

module.exports = {
  UPLOADS_ROOT,
  sanitizeFilename,
  isInlineSafe,
  createUploadMiddleware,
  buildEvidenceEntry,
};
