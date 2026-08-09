/**
 * Unified repository.
 * Route files call repo.create('crops', {...}), repo.list('crops', {farmerId}),
 * etc. Internally this dispatches to Mongoose or lowdb depending on db.USE_MONGO,
 * so a single codebase supports both a MongoDB Atlas production deployment
 * and a zero-config local JSON-file demo mode.
 */
const { USE_MONGO, mongooseModels, collections } = require('./db');

const modelMap = () => ({
  users: mongooseModels && mongooseModels.User,
  transactions: mongooseModels && mongooseModels.Transaction,
  loans: mongooseModels && mongooseModels.Loan,
  crops: mongooseModels && mongooseModels.Crop,
  livestock: mongooseModels && mongooseModels.Livestock,
  events: mongooseModels && mongooseModels.Event,
  listings: mongooseModels && mongooseModels.Listing,
  posts: mongooseModels && mongooseModels.Post
});

function toPlain(doc) {
  if (!doc) return doc;
  if (typeof doc.toObject === 'function') {
    const obj = doc.toObject();
    obj._id = obj._id.toString();
    return obj;
  }
  return doc;
}

async function create(entity, data) {
  if (USE_MONGO) {
    const Model = modelMap()[entity];
    const doc = await Model.create(data);
    return toPlain(doc);
  }
  return collections[entity].insert(data);
}

async function list(entity, filter = {}) {
  if (USE_MONGO) {
    const Model = modelMap()[entity];
    const docs = await Model.find(filter).sort({ createdAt: -1 });
    return docs.map(toPlain);
  }
  const items = Object.keys(filter).length
    ? collections[entity].filter(filter)
    : collections[entity].all();
  return items.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function findOne(entity, filter) {
  if (USE_MONGO) {
    const Model = modelMap()[entity];
    const doc = await Model.findOne(filter);
    return toPlain(doc);
  }
  return collections[entity].find(filter);
}

async function findById(entity, id) {
  return findOne(entity, USE_MONGO ? { _id: id } : { _id: id });
}

async function updateById(entity, id, patch) {
  if (USE_MONGO) {
    const Model = modelMap()[entity];
    const doc = await Model.findByIdAndUpdate(id, patch, { new: true });
    return toPlain(doc);
  }
  return collections[entity].updateById(id, patch);
}

async function removeById(entity, id) {
  if (USE_MONGO) {
    const Model = modelMap()[entity];
    await Model.findByIdAndDelete(id);
    return true;
  }
  return collections[entity].removeById(id);
}

module.exports = { create, list, findOne, findById, updateById, removeById };
