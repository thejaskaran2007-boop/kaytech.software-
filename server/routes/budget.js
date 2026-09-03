const router = require('express').Router();
const { query } = require('../db');

async function audit(action, table, recordId, details) {
  await query(
    `INSERT INTO activity_log (action, table_name, record_id, details) VALUES ($1, $2, $3, $4)`,
    [action, table, recordId, JSON.stringify(details)]
  );
}

// GET /api/budget/:projectId
router.get('/:projectId', async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM budget_items WHERE project_id = $1 ORDER BY category, created_at',
      [req.params.projectId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/budget
router.post('/', async (req, res, next) => {
  try {
    const { project_id, category, description, budgeted_amount, actual_amount, vendor, invoice_no, date, remarks } = req.body;
    const { rows } = await query(
      `INSERT INTO budget_items (project_id, category, description, budgeted_amount, actual_amount, vendor, invoice_no, date, remarks)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [project_id, category, description, budgeted_amount || 0, actual_amount || 0, vendor, invoice_no, date, remarks]
    );
    await audit('CREATE', 'budget_items', rows[0].id, req.body);
    res.status(201).json({ id: rows[0].id });
  } catch (err) { next(err); }
});

// PUT /api/budget/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { category, description, budgeted_amount, actual_amount, vendor, invoice_no, date, remarks } = req.body;
    await query(
      `UPDATE budget_items
       SET category=$1, description=$2, budgeted_amount=$3, actual_amount=$4,
           vendor=$5, invoice_no=$6, date=$7, remarks=$8
       WHERE id=$9`,
      [category, description, budgeted_amount, actual_amount, vendor, invoice_no, date, remarks, req.params.id]
    );
    await audit('UPDATE', 'budget_items', req.params.id, req.body);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /api/budget/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await query('DELETE FROM budget_items WHERE id = $1', [req.params.id]);
    await audit('DELETE', 'budget_items', req.params.id, {});
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
