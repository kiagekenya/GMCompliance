// routes/vendorPortal/index.js
// Mounted at /api/vendor-portal in server.js. Everything here requires
// requireVendorAuth (see middleware/vendorAuth.js) - a completely separate
// identity from the operator-side requireAuth used everywhere else.

const express = require('express');
const router = express.Router();
const { requireVendorAuth } = require('../../middleware/vendorAuth');
const { createUploadMiddleware } = require('../../utils/evidenceStorage');

const getMe = require('./getMe');
const getTasks = require('./getTasks');
const updateTask = require('./updateTask');
const uploadEvidence = require('./uploadEvidence');

const taskUpload = createUploadMiddleware((req) => `items/${req.params.id}`);

router.use(requireVendorAuth);

router.get('/me', getMe);
router.get('/tasks', getTasks);
router.patch('/tasks/:id', updateTask);
router.post('/tasks/:id/evidence', taskUpload.array('files'), uploadEvidence);

module.exports = router;
