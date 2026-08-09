const mongoose = require('mongoose');

const LivestockSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  species: { type: String, enum: ['cattle', 'goat', 'other'], required: true },
  tagId: { type: String, required: true },
  count: { type: Number, default: 1 },
  healthStatus: { type: String, enum: ['healthy', 'sick', 'under_treatment', 'deceased', 'sold'], default: 'healthy' },
  acquiredDate: { type: String, required: true },
  acquisitionCost: { type: Number, default: 0 },
  saleValue: { type: Number, default: null },
  saleDate: { type: String, default: null },
  notes: [{ text: String, date: String }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Livestock || mongoose.model('Livestock', LivestockSchema);
