const mongoose = require('mongoose');

const ListingSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  sellerName: { type: String, required: true },
  farmName: { type: String, default: '' },
  category: { type: String, enum: ['produce', 'livestock', 'inputs', 'equipment', 'labour'], default: 'produce' },
  dealType: { type: String, enum: ['sell', 'buy', 'barter'], default: 'sell' },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  quantity: { type: Number, default: 0 },
  unit: { type: String, default: '' },
  price: { type: Number, default: 0 },
  currency: { type: String, enum: ['USD', 'ZiG'], default: 'USD' },
  location: { type: String, default: '' },
  status: { type: String, enum: ['active', 'fulfilled', 'expired'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Listing || mongoose.model('Listing', ListingSchema);
