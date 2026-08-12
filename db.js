/**
 * AgriFinance data layer
 * -----------------------
 * Two modes, chosen automatically:
 *
 *  1. MONGO MODE  - if process.env.MONGODB_URI is set, Mongoose connects to
 *     MongoDB Atlas. Includes a connection timeout guard for serverless.
 *
 *  2. LOCAL MODE  - if no MONGODB_URI is set (or if connection fails/times out),
 *     a JSON file (server/data/db.json) via lowdb is used instead.
 */
const path = require('path');
const fs = require('fs');
const { v4: uuid } = require('uuid');

// Allow forcing local mode via env if needed
const USE_MONGO = !!process.env.MONGODB_URI && process.env.FORCE_LOCAL !== 'true';

let mongooseModels = null;
let lowdbInstance = null;
let dbPromise = null;

function initLocal() {
  if (lowdbInstance) return;
  const low = require('lowdb');
  const FileSync = require('lowdb/adapters/FileSync');
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const adapter = new FileSync(path.join(dataDir, 'db.json'));
  const db = low(adapter);
  db.defaults({
    users: [],
    transactions: [],
    loans: [],
    crops: [],
    livestock: [],
    events: [],
    listings: [],
    posts: []
  }).write();
  lowdbInstance = db;
}

function initMongo() {
  const mongoose = require('mongoose');
  mongoose.set('strictQuery', true);
  
  // Wrap connection with a strict timeout so serverless never hangs indefinitely
  dbPromise = Promise.race([
    mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('MongoDB connection timeout')), 5000))
  ]).catch((err) => {
    console.warn('MongoDB connection failed or timed out, falling back to local lowdb mode:', err.message);
    // Fall back to local mode gracefully if MongoDB is unreachable
    initLocal();
    return null;
  });

  mongooseModels = {
    User: require('./models/User'),
    Transaction: require('./models/Transaction'),
    Loan: require('./models/Loan'),
    Crop: require('./models/Crop'),
    Livestock: require('./models/Livestock'),
    Event: require('./models/Event'),
    Listing: require('./models/Listing'),
    Post: require('./models/Post')
  };
}

if (USE_MONGO) {
  initMongo();
} else {
  initLocal();
}

// Generic collection helpers (used in LOCAL mode)
function collection(name) {
  if (!lowdbInstance) initLocal();
  return {
    all: () => lowdbInstance.get(name).cloneDeep().value(),
    find: (predicate) => lowdbInstance.get(name).find(predicate).cloneDeep().value(),
    filter: (predicate) => lowdbInstance.get(name).filter(predicate).cloneDeep().value(),
    insert: (doc) => {
      const record = { _id: uuid(), createdAt: new Date().toISOString(), ...doc };
      lowdbInstance.get(name).push(record).write();
      return record;
    },
    updateById: (id, patch) => {
      const target = lowdbInstance.get(name).find({ _id: id });
      if (!target.value()) return null;
      target.assign({ ...patch, updatedAt: new Date().toISOString() }).write();
      return target.cloneDeep().value();
    },
    removeById: (id) => {
      lowdbInstance.get(name).remove({ _id: id }).write();
      return true;
    }
  };
}

module.exports = {
  get USE_MONGO() {
    // If mongo failed and fell back to local, reflect that dynamically
    return USE_MONGO && lowdbInstance === null;
  },
  dbPromise,
  get mongooseModels() {
    return mongooseModels;
  },
  get collections() {
    if (!lowdbInstance) initLocal();
    return {
      users: collection('users'),
      transactions: collection('transactions'),
      loans: collection('loans'),
      crops: collection('crops'),
      livestock: collection('livestock'),
      events: collection('events'),
      listings: collection('listings'),
      posts: collection('posts')
    };
  }
};