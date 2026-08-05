// seed/seedDatabase.js
//
// Run once (npm run seed) to load the master rulebook into MongoDB.
// Upserts by title instead of wipe-and-reinsert, so re-running this after a
// catalog edit (e.g. fixing a smart filter expression) UPDATES existing
// RegulatoryRequirement documents in place rather than deleting and
// recreating them with new _ids. That matters because every operator's
// ComplianceItem.requirementId points at these _ids - a delete+reinsert
// would silently orphan every operator's already-confirmed calendar the
// next time this script runs, even though it never touches the
// ComplianceItem collection directly.

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

  const result = await RegulatoryRequirement.bulkWrite(
    catalog.map((item) => ({
      updateOne: {
        filter: { title: item.title },
        update: { $set: item },
        upsert: true,
      },
    }))
  );

  console.log(`Seeded ${catalog.length} regulatory requirements (${result.upsertedCount} new, ${result.modifiedCount} updated, ${catalog.length - result.upsertedCount - result.modifiedCount} unchanged).`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
