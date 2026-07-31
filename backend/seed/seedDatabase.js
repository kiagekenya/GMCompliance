// seed/seedDatabase.js
//
// Run once (npm run seed) to load the master rulebook into MongoDB.
// Safe to re-run: it wipes and reloads RegulatoryRequirement only - never
// touches Operator, PipelineProfile, or ComplianceItem data.

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const RegulatoryRequirement = require('../models/RegulatoryRequirement');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected. Seeding regulatory catalog...');

  const seedPath = path.join(__dirname, 'regulatory_catalog_seed.json');
  const catalog = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));

  await RegulatoryRequirement.deleteMany({});
  const created = await RegulatoryRequirement.insertMany(catalog);

  console.log(`Seeded ${created.length} regulatory requirements.`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
