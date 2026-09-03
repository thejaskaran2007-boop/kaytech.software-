const router = require('express').Router();
const { query } = require('../db');

async function audit(action, table, recordId, details) {
  await query(
    `INSERT INTO activity_log (action, table_name, record_id, details) VALUES ($1, $2, $3, $4)`,
    [action, table, recordId, JSON.stringify(details)]
  );
}

// GET /api/labour/:projectId
router.get('/:projectId', async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM labour_log WHERE project_id = $1 ORDER BY date DESC',
      [req.params.projectId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/labour
router.post('/', async (req, res, next) => {
  try {
    const { project_id, date, worker_name, role, hours, rate_per_hour, attendance, remarks } = req.body;
    const { rows } = await query(
      `INSERT INTO labour_log (project_id, date, worker_name, role, hours, rate_per_hour, attendance, remarks)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [project_id, date, worker_name, role || 'Labour', hours || 8, rate_per_hour || 0, attendance || 'Present', remarks]
    );
    await audit('CREATE', 'labour_log', rows[0].id, req.body);
    res.status(201).json({ id: rows[0].id });
  } catch (err) { next(err); }
});

// PUT /api/labour/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { date, worker_name, role, hours, rate_per_hour, attendance, remarks } = req.body;
    await query(
      `UPDATE labour_log
       SET date=$1, worker_name=$2, role=$3, hours=$4,
           rate_per_hour=$5, attendance=$6, remarks=$7
       WHERE id=$8`,
      [date, worker_name, role, hours, rate_per_hour, attendance, remarks, req.params.id]
    );
    await audit('UPDATE', 'labour_log', req.params.id, req.body);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /api/labour/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await query('DELETE FROM labour_log WHERE id = $1', [req.params.id]);
    await audit('DELETE', 'labour_log', req.params.id, {});
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
