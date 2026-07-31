// routes/requirements/index.js
// Mounted at /api/requirements in server.js.

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');

const getSuggestedRequirements = require('./getSuggestedRequirements');

router.use(requireAuth);
router.get('/suggested', getSuggestedRequirements);

module.exports = router;
