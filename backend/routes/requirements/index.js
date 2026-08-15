// routes/requirements/index.js
// Mounted at /api/requirements in server.js.

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/clerkAuth');

const getSuggestedRequirements = require('./getSuggestedRequirements');
const getCategories = require('./getCategories');

router.use(requireAuth);
router.get('/suggested', getSuggestedRequirements);
router.get('/categories', getCategories);

module.exports = router;
