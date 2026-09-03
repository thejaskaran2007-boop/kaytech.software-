/**
 * Kaytech Express App (shared between local dev server and Vercel serverless)
 * Exported without calling .listen() so Vercel can wrap it as a function.
 */
require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const projectsRouter  = require('./routes/projects');
const boqRouter       = require('./routes/boq');
const budgetRouter    = require('./routes/budget');
const materialsRouter = require('./routes/materials');
const labourRouter    = require('./routes/labour');
const dashboardRouter = require('./routes/dashboard');
const activityRouter  = require('./routes/activity');

const app = express();

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/projects',  projectsRouter);
app.use('/api/boq',       boqRouter);
app.use('/api/budget',    budgetRouter);
app.use('/api/materials', materialsRouter);
app.use('/api/labour',    labourRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/activity',  activityRouter);

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[Server] Unhandled error:', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
