// routes/contacts/listContacts.js
// GET /api/contacts

const Contact = require('../../models/Contact');
const asyncHandler = require('../../utils/asyncHandler');

const listContacts = asyncHandler(async (req, res) => {
  const contacts = await Contact.find({ operatorId: req.operatorId }).sort({ escalationLevel: 1 });
  res.json({ contacts });
});

module.exports = listContacts;
