// routes/auth/updateCompany.js
//
// PATCH /api/auth/company
// Clerk owns identity (name, email, password) but knows nothing about the
// pipeline company itself. SystemInit's Step 1 calls this once to fill in
// companyName/county/location on the auto-created Operator record.

const Operator = require('../../models/Operator');
const asyncHandler = require('../../utils/asyncHandler');

const EDITABLE_FIELDS = ['companyName', 'county', 'location'];

const updateCompany = asyncHandler(async (req, res) => {
  for (const field of EDITABLE_FIELDS) {
    if (req.body[field] !== undefined) req.operator[field] = req.body[field];
  }
  await req.operator.save();
  res.json({ operator: req.operator });
});

module.exports = updateCompany;
