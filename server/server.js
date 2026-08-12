const app = require('./app');

const PORT = process.env.PORT || 3000;

// Only call app.listen if we are running locally (not required on Vercel serverless)
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Export app for Vercel serverless deployment
module.exports = app;