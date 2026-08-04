// routes/contacts/addContact.js
// POST /api/contacts
//
// The requirements doc specifies: minimum 2 contacts (at least a field/office
// person and a manager), maximum 10. We only enforce the ceiling here -
// the floor of 2 is enforced in deleteContact.js instead, since you can't
// know you're "below 2" until someone tries to go below it.

const Contact = require('../../models/Contact');
const asyncHandler = require('../../utils/asyncHandler');

const MAX_CONTACTS = 10;

const addContact = asyncHandler(async (req, res) => {
  const { fullName, title, email, phone, escalationLevel, accessRole } = req.body;

  if (!fullName || !email || !phone || escalationLevel === undefined) {
    console.warn(`[contacts] operator ${req.operatorId}: rejected - missing required field`, req.body);
    return res.status(422).json({ error: 'fullName, email, phone, and escalationLevel are required' });
  }

  const existingCount = await Contact.countDocuments({ operatorId: req.operatorId });
  if (existingCount >= MAX_CONTACTS) {
    return res.status(422).json({ error: `Maximum of ${MAX_CONTACTS} contacts reached` });
  }

  const contact = await Contact.create({
    operatorId: req.operatorId, fullName, title, email, phone, escalationLevel, accessRole,
  });

  console.log(`[contacts] operator ${req.operatorId}: added contact ${contact.fullName} (level ${contact.escalationLevel})`);
  res.status(201).json(contact);
});

module.exports = addContact;
