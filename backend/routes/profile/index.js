// routes/profile/index.js
// Mounted at /api/profile in server.js. All routes here require auth.

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/clerkAuth');

const getProfile = require('./getProfile');
const saveProfile = require('./saveProfile');

router.use(requireAuth);
router.get('/', getProfile);
router.post('/', saveProfile);

module.exports = router;
