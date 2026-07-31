// routes/contacts/deleteContact.js
// DELETE /api/contacts/:id
//
// The requirements doc requires at least 2 contacts at all times (a field/
// office person and a manager), so we block deletion if it would drop below 2.

const Contact = require('../../models/Contact');
const asyncHandler = require('../../utils/asyncHandler');

const MIN_CONTACTS = 2;

const deleteContact = asyncHandler(async (req, res) => {
  const count = await Contact.countDocuments({ operatorId: req.operatorId });
  if (count <= MIN_CONTACTS) {
    return res.status(422).json({ error: `At least ${MIN_CONTACTS} contacts are required at all times` });
  }

  const deleted = await Contact.findOneAndDelete({ _id: req.params.id, operatorId: req.operatorId });
  if (!deleted) return res.status(404).json({ error: 'Contact not found' });

  res.json({ deleted: true });
});

module.exports = deleteContact;
