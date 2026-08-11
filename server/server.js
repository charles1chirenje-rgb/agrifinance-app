const app = require('./app');

const PORT = process.env.PORT || 3000;

// Only start the listener if NOT running on Vercel
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`AgriFinance server running at http://localhost:${PORT}`);
  });
}

// Export the Express app for Vercel
module.exports = app;