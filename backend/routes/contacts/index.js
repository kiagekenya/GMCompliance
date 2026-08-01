// routes/contacts/index.js
// Mounted at /api/contacts in server.js.

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../../middleware/clerkAuth');

const listContacts = require('./listContacts');
const addContact = require('./addContact');
const updateContact = require('./updateContact');
const deleteContact = require('./deleteContact');

router.use(requireAuth);

router.get('/', listContacts);
router.post('/', requireRole('admin'), addContact);
router.patch('/:id', requireRole('admin'), updateContact);
router.delete('/:id', requireRole('admin'), deleteContact);

module.exports = router;
