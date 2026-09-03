const router = require('express').Router();
const { query } = require('../db');

// GET /api/activity/recent
router.get('/recent', async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 50'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
