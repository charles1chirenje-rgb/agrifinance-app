const mongoose = require('mongoose');

const CropSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  plotName: { type: String, default: '' },
  areaHectares: { type: Number, default: 0 },
  stage: {
    type: String,
    enum: ['planted', 'germination', 'vegetative', 'flowering', 'maturing', 'harvested'],
    default: 'planted'
  },
  plantedDate: { type: String, required: true },
  expectedHarvestDate: { type: String, default: '' },
  expectedYieldTonnes: { type: Number, default: 0 },
  actualYieldTonnes: { type: Number, default: null },
  investment: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'harvested', 'lost'], default: 'active' },
  notes: [{ text: String, date: String }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Crop || mongoose.model('Crop', CropSchema);
