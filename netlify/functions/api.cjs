const serverless = require('serverless-http');
const { app } = require('../../dist/server.cjs');

// Netlify invokes this function for REST requests. Long-lived SSE is not
// suitable for the platform; the client uses its reconnect/polling fallback.
module.exports.handler = serverless(app);
