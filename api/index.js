// Vercel serverless entrypoint for the existing Express API.
const serverless = require('serverless-http');
const { app } = require('../dist/server.cjs');

module.exports = serverless(app);
