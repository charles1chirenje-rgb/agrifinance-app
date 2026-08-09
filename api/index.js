// Vercel serverless entry point. Vercel's Node.js builder can host an
// Express app directly - every request under /api/* is routed here by
// vercel.json, and this file simply exports the same `app` used for local
// development in server/server.js.
const app = require('../server/app');

module.exports = app;
