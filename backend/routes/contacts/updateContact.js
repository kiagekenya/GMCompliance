// routes/contacts/updateContact.js
// PATCH /api/contacts/:id

const Contact = require('../../models/Contact');
const asyncHandler = require('../../utils/asyncHandler');

const EDITABLE_FIELDS = ['fullName', 'title', 'email', 'phone', 'escalationLevel', 'accessRole'];

const updateContact = asyncHandler(async (req, res) => {
  const contact = await Contact.findOne({ _id: req.params.id, operatorId: req.operatorId });
  if (!contact) return res.status(404).json({ error: 'Contact not found' });

  for (const field of EDITABLE_FIELDS) {
    if (req.body[field] !== undefined) contact[field] = req.body[field];
  }

  await contact.save();
  res.json(contact);
});

module.exports = updateContact;
