// routes/public/index.js
// Mounted at /api/public in server.js. NOTHING in this router requires
// authentication - that's the entire point (assignees may have no account).
// Security instead comes from the upload token itself being an
// unguessable 48-character random string, generated fresh per assignment.

const express = require('express');
const router = express.Router();

const getUploadInfo = require('./getUploadInfo');
const submitUpload = require('./submitUpload');

router.get('/upload/:token', getUploadInfo);
router.post('/upload/:token', submitUpload);

module.exports = router;
