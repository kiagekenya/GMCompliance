// routes/complianceItems/index.js
// Mounted at /api/compliance-items in server.js.

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../../middleware/clerkAuth');

const confirmItems = require('./confirmItems');
const getItems = require('./getItems');
const getArchive = require('./getArchive');
const updateItemStatus = require('./updateItemStatus');
const completeItem = require('./completeItem');

router.use(requireAuth);

router.get('/', getItems);
router.get('/archive', getArchive);
router.post('/confirm', requireRole('admin', 'editor'), confirmItems);
router.patch('/:id', requireRole('admin', 'editor'), updateItemStatus);
router.post('/:id/complete', requireRole('admin', 'editor'), completeItem);

module.exports = router;
