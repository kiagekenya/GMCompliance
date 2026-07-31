// routes/auth/index.js
//
// Combines the individual auth route functions into one router.
// Mounted at /api/auth in server.js.

const express = require('express');
const router = express.Router();

const signup = require('./signup');
const login = require('./login');

router.post('/signup', signup);
router.post('/login', login);

module.exports = router;
