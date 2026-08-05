// routes/public/index.js
// Mounted at /api/public in server.js. NOTHING in this router requires
// authentication - that's the entire point (assignees may have no account).
// Security instead comes from the upload token itself being an
// unguessable 48-character random string, generated fresh per assignment.

const express = require('express');
const router = express.Router();
const { createUploadMiddleware } = require('../../utils/evidenceStorage');

const getUploadInfo = require('./getUploadInfo');
const submitUpload = require('./submitUpload');

// Destination is keyed by the token itself (synchronously available from
// the URL, no DB lookup needed before multer's destination callback runs).
const publicUpload = createUploadMiddleware((req) => `public/${req.params.token}`);

router.get('/upload/:token', getUploadInfo);
router.post('/upload/:token', publicUpload.array('files'), submitUpload);

module.exports = router;
