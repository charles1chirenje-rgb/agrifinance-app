const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  entity: { type: String, required: true },
  entityId: { type: String, required: true },
  action: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Event || mongoose.model('Event', EventSchema);
