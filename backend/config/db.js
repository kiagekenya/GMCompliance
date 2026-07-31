// config/db.js
//
// One job: open the Mongoose connection once at server start, using
// MONGO_URI from .env. Every model/route just imports mongoose directly
// and relies on this connection already being open.

const mongoose = require('mongoose');

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected:', mongoose.connection.host);
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
