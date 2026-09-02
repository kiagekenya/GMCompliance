// routes/complianceItems/index.js
// Mounted at /api/compliance-items in server.js.

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../../middleware/clerkAuth');
const { createUploadMiddleware } = require('../../utils/evidenceStorage');

const confirmItems = require('./confirmItems');
const getItems = require('./getItems');
const getArchive = require('./getArchive');
const updateItemStatus = require('./updateItemStatus');
const completeItem = require('./completeItem');
const runStatusCheck = require('./runStatusCheck');
const setFrequency = require('./setFrequency');
const uploadEvidence = require('./uploadEvidence');
const { proposeBaselineDate, confirmBaselineDate, clearBaselineDate } = require('./baselineDate');

// Destination keyed by the compliance item id - req.operatorId is already
// set by requireAuth (mounted below) by the time this runs.
const itemUpload = createUploadMiddleware((req) => `items/${req.params.id}`);

router.use(requireAuth);

router.get('/', getItems);
router.get('/archive', getArchive);
router.post('/confirm', requireRole('admin', 'editor'), confirmItems);
router.patch('/:id', requireRole('admin', 'editor'), updateItemStatus);
router.post('/:id/complete', requireRole('admin', 'editor'), completeItem);
router.post('/:id/set-frequency', requireRole('admin', 'editor'), setFrequency);
router.post('/:id/baseline-date', requireRole('admin', 'editor'), proposeBaselineDate);
router.post('/:id/baseline-date/confirm', requireRole('admin', 'editor'), confirmBaselineDate);
router.delete('/:id/baseline-date', requireRole('admin', 'editor'), clearBaselineDate);
router.post('/:id/evidence', requireRole('admin', 'editor'), itemUpload.array('files'), uploadEvidence);
router.post('/run-status-check', requireRole('admin'), runStatusCheck);

module.exports = router;
