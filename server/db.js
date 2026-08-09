/**
 * AgriFinance data layer
 * -----------------------
 * Two modes, chosen automatically:
 *
 *  1. MONGO MODE  - if process.env.MONGODB_URI is set, Mongoose connects to
 *     MongoDB Atlas (recommended for the live Vercel deployment, since
 *     Vercel's filesystem is read-only/ephemeral in production).
 *
 *  2. LOCAL MODE  - if no MONGODB_URI is set, a JSON file (server/data/db.json)
 *     via lowdb is used instead. Zero setup - perfect for running the project
 *     locally, for demos, and for the diploma defense/marking process.
 *
 * Every route file talks to the small store.* API below, so the rest of the
 * app never needs to know which mode is active.
 */
const path = require('path');
const fs = require('fs');
const { v4: uuid } = require('uuid');

const USE_MONGO = !!process.env.MONGODB_URI;

let mongooseModels = null;
let lowdbInstance = null;

function initLocal() {
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
    events: [], // audit / activity feed powering the "live" dashboards
    listings: [], // community marketplace: produce/inputs/equipment for sale or barter
    posts: [] // community knowledge feed: tips, questions, alerts, success stories
  }).write();
  lowdbInstance = db;
}

function initMongo() {
  const mongoose = require('mongoose');
  mongoose.set('strictQuery', true);
  mongoose.connect(process.env.MONGODB_URI).catch((err) => {
    console.error('MongoDB connection error:', err.message);
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

if (USE_MONGO) initMongo();
else initLocal();

// ---------------------------------------------------------------------------
// Generic collection helpers (used only in LOCAL mode)
// ---------------------------------------------------------------------------
function collection(name) {
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
      lowdbInstance.get(name).find({ _id: id }).assign({ ...patch, updatedAt: new Date().toISOString() }).write();
      return lowdbInstance.get(name).find({ _id: id }).cloneDeep().value();
    },
    removeById: (id) => {
      lowdbInstance.get(name).remove({ _id: id }).write();
      return true;
    }
  };
}

module.exports = {
  USE_MONGO,
  mongooseModels,
  collections: USE_MONGO ? null : {
    users: collection('users'),
    transactions: collection('transactions'),
    loans: collection('loans'),
    crops: collection('crops'),
    livestock: collection('livestock'),
    events: collection('events'),
    listings: collection('listings'),
    posts: collection('posts')
  }
};
