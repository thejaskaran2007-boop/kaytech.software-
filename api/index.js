/**
 * Vercel Serverless Function entry point.
 * Routes all /api/* requests through the shared Express app.
 */
const app = require('../server/app');
module.exports = app;
