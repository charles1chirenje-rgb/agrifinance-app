const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ---- Mobile & Cross-Origin Friendly CORS Setup ----
app.use(cors({
  origin: true, // Dynamically mirror request origin
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Explicitly answer HTTP OPTIONS preflight requests for mobile WebKit
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---- API routes ----
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/loans', require('./routes/loans'));
app.use('/api/crops', require('./routes/crops'));
app.use('/api/livestock', require('./routes/livestock'));
app.use('/api/forecast', require('./routes/forecast'));
app.use('/api/roi', require('./routes/roi'));
app.use('/api/events', require('./routes/events'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/assistant', require('./routes/assistant'));
app.use('/api/weather', require('./routes/weather'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/export', require('./routes/export'));

app.get('/api/health', (req, res) => {
  const { USE_MONGO } = require('./db');
  res.json({ status: 'ok', mode: USE_MONGO ? 'mongodb' : 'local-json', time: new Date().toISOString() });
});

// ---- Static frontend (client) ----
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

module.exports = app;