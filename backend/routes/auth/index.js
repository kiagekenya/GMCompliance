// routes/auth/index.js
// Mounted at /api/auth in server.js. Both routes require a valid Clerk
// session token - there's no public signup/login endpoint anymore, since
// Clerk's hosted UI handles that entirely on the frontend.

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/clerkAuth');

const me = require('./me');
const updateCompany = require('./updateCompany');

router.use(requireAuth);
router.get('/me', me);
router.patch('/company', updateCompany);

module.exports = router;
