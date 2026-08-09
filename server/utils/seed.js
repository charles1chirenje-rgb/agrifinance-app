/**
 * Seeds demo data for Farm 54 so the app can be explored immediately.
 * Run with: npm run seed
 * Safe to run against LOCAL mode (JSON file) or MongoDB (set MONGODB_URI first).
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const repo = require('../repo');

async function seed() {
  console.log('Seeding AgriFinance demo data for Farm 54...');

  const passwordHash = await bcrypt.hash('secret123', 10);

  const admin = await repo.create('users', {
    name: 'Tendai Moyo', email: 'owner@farm54.co.zw', password: passwordHash,
    role: 'admin', farmName: 'Farm 54', currency: 'USD'
  });
  const manager = await repo.create('users', {
    name: 'Farm Manager', email: 'manager@farm54.co.zw', password: passwordHash,
    role: 'user', farmName: 'Farm 54', currency: 'USD'
  });

  const cane = await repo.create('crops', {
    userId: manager._id, name: 'Sugar Cane', plotName: 'North Field', areaHectares: 12,
    stage: 'vegetative', plantedDate: '2025-10-01', expectedHarvestDate: '2026-09-01',
    expectedYieldTonnes: 150, actualYieldTonnes: null, investment: 8000, status: 'active', notes: []
  });
  const cattle = await repo.create('livestock', {
    userId: manager._id, species: 'cattle', tagId: 'C-014', count: 5,
    healthStatus: 'healthy', acquiredDate: '2025-06-01', acquisitionCost: 3000,
    saleValue: null, saleDate: null, notes: []
  });

  const months = ['2026-05', '2026-06', '2026-07'];
  const incomes = [4000, 5200, 6100];
  const expenses = [1200, 600, 900];
  for (let i = 0; i < months.length; i++) {
    await repo.create('transactions', {
      userId: manager._id, type: 'income', category: 'Cane Sales', enterprise: 'general',
      linkedId: null, amount: incomes[i], currency: 'USD', date: `${months[i]}-20`, note: ''
    });
    await repo.create('transactions', {
      userId: manager._id, type: 'expense', category: i === 0 ? 'Fertilizer' : 'Fuel',
      enterprise: 'crop', linkedId: cane._id, amount: expenses[i], currency: 'USD',
      date: `${months[i]}-10`, note: ''
    });
  }

  await repo.create('loans', {
    userId: manager._id, lender: 'Agribank', principal: 5000, interestRate: 8,
    amountRepaid: 1000, dueDate: '2026-12-01', status: 'active', purpose: 'Seasonal inputs'
  });

  console.log('Done. Demo accounts:');
  console.log('  Admin  -> owner@farm54.co.zw   / secret123');
  console.log('  User   -> manager@farm54.co.zw / secret123');
}

seed().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
