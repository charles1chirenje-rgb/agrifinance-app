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
  const neighbourA = await repo.create('users', {
    name: 'Rudo Chikwanha', email: 'rudo@chiredzi-farms.co.zw', password: passwordHash,
    role: 'user', farmName: 'Chikwanha Farm', currency: 'USD'
  });
  const neighbourB = await repo.create('users', {
    name: 'Tapiwa Ndlovu', email: 'tapiwa@lowveld-agri.co.zw', password: passwordHash,
    role: 'user', farmName: 'Lowveld Agri Co-op', currency: 'USD'
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

  // --- Community marketplace: gives the board some life on first visit ---
  const listings = [
    { userId: manager._id, sellerName: manager.name, farmName: manager.farmName,
      category: 'produce', dealType: 'sell', title: '30 bags of sugar cane (freshly cut)',
      description: 'Cut this week from the North Field. Can arrange transport within Chiredzi.',
      quantity: 30, unit: '50kg bags', price: 18, currency: 'USD', location: 'Chiredzi', status: 'active' },
    { userId: neighbourA._id, sellerName: neighbourA.name, farmName: neighbourA.farmName,
      category: 'livestock', dealType: 'sell', title: '3 weaner goats, healthy and vaccinated',
      description: 'Boer cross weaners, dewormed and vaccinated last month.',
      quantity: 3, unit: 'head', price: 45, currency: 'USD', location: 'Chiredzi', status: 'active' },
    { userId: neighbourB._id, sellerName: neighbourB.name, farmName: neighbourB.farmName,
      category: 'inputs', dealType: 'buy', title: 'Looking for Compound D fertilizer, 10x 50kg',
      description: 'Need it before the next rains — happy to collect.',
      quantity: 10, unit: '50kg bags', price: 0, currency: 'USD', location: 'Triangle', status: 'active' },
    { userId: neighbourA._id, sellerName: neighbourA.name, farmName: neighbourA.farmName,
      category: 'equipment', dealType: 'barter', title: 'Knapsack sprayer for seed maize',
      description: 'Barely-used 16L knapsack sprayer, would swap for a few bags of certified seed maize.',
      quantity: 1, unit: 'unit', price: 0, currency: 'USD', location: 'Hippo Valley', status: 'active' },
    { userId: manager._id, sellerName: manager.name, farmName: manager.farmName,
      category: 'labour', dealType: 'sell', title: 'Two casual hands available for harvest week',
      description: 'Experienced with cane cutting and loading, available for hire next week.',
      quantity: 2, unit: 'people', price: 12, currency: 'USD', location: 'Chiredzi', status: 'active' }
  ];
  for (const l of listings) await repo.create('listings', l);

  // --- Community knowledge feed ---
  await repo.create('posts', {
    userId: neighbourB._id, authorName: neighbourB.name, farmName: neighbourB.farmName,
    tag: 'alert', title: 'Fall armyworm spotted on young maize near the river plots',
    body: 'Found early signs on the lower leaves this morning — check yours before it spreads. Started spraying at first light.',
    likes: [manager._id], replies: [
      { userId: neighbourA._id, name: neighbourA.name, text: 'Thanks for the heads up, checking my fields now.', date: new Date().toISOString() }
    ]
  });
  await repo.create('posts', {
    userId: neighbourA._id, authorName: neighbourA.name, farmName: neighbourA.farmName,
    tag: 'tip', title: 'Pfumvudza plots doing well with mulching this season',
    body: 'Mulched with dry grass right after planting and moisture held up noticeably better through the dry spell in June.',
    likes: [manager._id, neighbourB._id], replies: []
  });
  await repo.create('posts', {
    userId: manager._id, authorName: manager.name, farmName: manager.farmName,
    tag: 'success', title: 'Cane yield up on the North Field this cycle',
    body: 'Switched fertilizer timing based on the growth-stage tracking in here and came out ahead of last season\'s tonnage.',
    likes: [neighbourA._id], replies: []
  });
  await repo.create('posts', {
    userId: neighbourB._id, authorName: neighbourB.name, farmName: neighbourB.farmName,
    tag: 'question', title: 'Best time to start winter wheat seedbeds this year?',
    body: 'Rains have been a bit unpredictable — anyone started theirs yet, or holding off another week or two?',
    likes: [], replies: []
  });

  console.log('Done. Demo accounts:');
  console.log('  Admin  -> owner@farm54.co.zw   / secret123');
  console.log('  User   -> manager@farm54.co.zw / secret123');
  console.log('  Neighbour accounts (community/marketplace flavour) also use / secret123');
}

seed().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
