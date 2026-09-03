const router = require('express').Router();
const { query } = require('../db');

// ─── Audit log helper ────────────────────────────────────────────────────────
async function audit(action, table, recordId, details) {
  await query(
    `INSERT INTO activity_log (action, table_name, record_id, details) VALUES ($1, $2, $3, $4)`,
    [action, table, recordId, JSON.stringify(details)]
  );
}

// GET /api/projects
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT p.*,
        COALESCE((SELECT SUM(quantity * rate) FROM boq_items WHERE project_id = p.id), 0) AS boq_total,
        COALESCE((SELECT SUM(actual_amount)  FROM budget_items WHERE project_id = p.id), 0) AS spent
      FROM projects p
      ORDER BY p.created_at DESC
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/projects/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// POST /api/projects
router.post('/', async (req, res, next) => {
  try {
    const { name, client, location, status, start_date, end_date, contract_value, description } = req.body;
    const { rows } = await query(
      `INSERT INTO projects (name, client, location, status, start_date, end_date, contract_value, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [name, client, location, status || 'Planning', start_date, end_date, contract_value || 0, description]
    );
    await audit('CREATE', 'projects', rows[0].id, req.body);
    res.status(201).json({ id: rows[0].id });
  } catch (err) { next(err); }
});

// PUT /api/projects/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name, client, location, status, start_date, end_date, contract_value, description } = req.body;
    await query(
      `UPDATE projects
       SET name=$1, client=$2, location=$3, status=$4,
           start_date=$5, end_date=$6, contract_value=$7,
           description=$8, updated_at=NOW()
       WHERE id=$9`,
      [name, client, location, status, start_date, end_date, contract_value, description, req.params.id]
    );
    await audit('UPDATE', 'projects', req.params.id, req.body);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /api/projects/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await query('DELETE FROM projects WHERE id = $1', [req.params.id]);
    await audit('DELETE', 'projects', req.params.id, {});
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
