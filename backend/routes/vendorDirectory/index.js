// routes/vendorDirectory/index.js
// Mounted at /api/vendor-directory in server.js - the operator's side of the
// vendor marketplace: browsing vendor profiles and managing connection
// requests. Behind the normal operator requireAuth (not requireVendorAuth -
// this is the operator, not vendor, half of the marketplace).

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/clerkAuth');

const listVendorDirectory = require('./list');
const { listRequests, createRequest, respondToRequest } = require('./requests');

router.use(requireAuth);

router.get('/', listVendorDirectory);
router.get('/requests', listRequests);
router.post('/requests', createRequest);
router.patch('/requests/:id', respondToRequest);

module.exports = router;
