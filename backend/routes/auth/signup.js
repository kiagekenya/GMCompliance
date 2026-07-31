// routes/auth/signup.js
//
// POST /api/auth/signup
// Creates the Operator account. Email verification and subscription
// activation are left as flags for a separate admin/Galaxy-staff process
// (per the requirements doc, Galaxy sets subscription duration manually).

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Operator = require('../../models/Operator');
const asyncHandler = require('../../utils/asyncHandler');

const signup = asyncHandler(async (req, res) => {
  const { companyName, email, password, county, location } = req.body;

  if (!companyName || !email || !password) {
    return res.status(422).json({ error: 'companyName, email, and password are required' });
  }

  const existing = await Operator.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const operator = await Operator.create({
    companyName, email, passwordHash, county, location,
  });

  const token = jwt.sign(
    { operatorId: operator._id, role: operator.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.status(201).json({
    token,
    operator: { id: operator._id, companyName: operator.companyName, email: operator.email, role: operator.role },
  });
});

module.exports = signup;
