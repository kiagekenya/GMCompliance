// server.js
//
// Entry point. Loads env vars, connects to Mongo, mounts every route folder,
// and starts listening. CORS is configured explicitly against FRONTEND_ORIGIN
// - the default cors() with no options usually works, but being explicit
// here avoids the exact "No Access-Control-Allow-Origin header" error seen
// during frontend integration, and makes it obvious what's allowed.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { recalculateAllStatuses } = require('./services/schedulingEngine');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/requirements', require('./routes/requirements'));
app.use('/api/compliance-items', require('./routes/complianceItems'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/vendors', require('./routes/vendors'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// must be registered LAST, after every route
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () =>
    console.log(`Galaxy Compliance backend running on port ${PORT}`),
  );

  // The "engine" step from the flow diagram: re-check every item's status
  // once a day, so items entering their Action Window flip to 'due'
  // automatically even if nobody touches the app that day.
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  setInterval(() => {
    recalculateAllStatuses()
      .then(({ checked, updated }) => console.log(`Daily status check: ${checked} checked, ${updated} updated`))
      .catch((err) => console.error('Daily status check failed:', err));
  }, ONE_DAY_MS);
});
