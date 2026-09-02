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
const getProfile = require('./getProfile');
const saveProfile = require('./saveProfile');
const getServiceCategories = require('./getServiceCategories');
const getOperators = require('./getOperators');
const { listRequests, createRequest, respondToRequest } = require('./requests');
const startCollaboration = require('./startCollaboration');
const requestDueDate = require('./requestDueDate');
const submitForReview = require('./submitForReview');

const taskUpload = createUploadMiddleware((req) => `items/${req.params.id}`);

router.use(requireVendorAuth);

router.get('/me', getMe);
router.get('/tasks', getTasks);
router.patch('/tasks/:id', updateTask);
router.post('/tasks/:id/evidence', taskUpload.array('files'), uploadEvidence);
router.post('/tasks/:id/request-due-date', requestDueDate);
router.post('/tasks/:id/submit', submitForReview);

// Marketplace: the vendor's own profile, the operator list with compliance
// gaps, and the two-way connection-request inbox. See VENDOR_PORTAL.md.
router.get('/profile', getProfile);
router.put('/profile', saveProfile);
router.get('/service-categories', getServiceCategories);
router.get('/operators', getOperators);
router.get('/requests', listRequests);
router.post('/requests', createRequest);
router.patch('/requests/:id', respondToRequest);
router.post('/requests/:id/start-collaboration', startCollaboration);

module.exports = router;
