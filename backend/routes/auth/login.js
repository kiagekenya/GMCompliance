// routes/auth/login.js
//
// POST /api/auth/login

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Operator = require('../../models/Operator');
const asyncHandler = require('../../utils/asyncHandler');

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const operator = await Operator.findOne({ email: (email || '').toLowerCase() });
  if (!operator) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const passwordMatches = await bcrypt.compare(password || '', operator.passwordHash);
  if (!passwordMatches) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (!operator.subscriptionActive) {
    return res.status(403).json({ error: 'Subscription is not active. Contact Galaxy Midstream Services.' });
  }

  const token = jwt.sign(
    { operatorId: operator._id, role: operator.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    operator: { id: operator._id, companyName: operator.companyName, email: operator.email, role: operator.role },
  });
});

module.exports = login;
