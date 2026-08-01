// routes/vendors/index.js
// Mounted at /api/vendors in server.js.

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../../middleware/clerkAuth');

const listVendors = require('./listVendors');
const addVendor = require('./addVendor');
const updateVendor = require('./updateVendor');
const deleteVendor = require('./deleteVendor');

router.use(requireAuth);

router.get('/', listVendors);
router.post('/', requireRole('admin', 'editor'), addVendor);
router.patch('/:id', requireRole('admin', 'editor'), updateVendor);
router.delete('/:id', requireRole('admin', 'editor'), deleteVendor);

module.exports = router;
