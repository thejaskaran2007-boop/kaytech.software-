const router = require('express').Router();
const { query } = require('../db');

async function audit(action, table, recordId, details) {
  await query(
    `INSERT INTO activity_log (action, table_name, record_id, details) VALUES ($1, $2, $3, $4)`,
    [action, table, recordId, JSON.stringify(details)]
  );
}

// GET /api/materials/:projectId
router.get('/:projectId', async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM materials WHERE project_id = $1 ORDER BY category, name',
      [req.params.projectId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/materials
router.post('/', async (req, res, next) => {
  try {
    const { project_id, name, category, unit, qty_ordered, qty_received, qty_used, unit_rate, supplier, date, remarks } = req.body;
    const { rows } = await query(
      `INSERT INTO materials (project_id, name, category, unit, qty_ordered, qty_received, qty_used, unit_rate, supplier, date, remarks)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [project_id, name, category || 'General', unit || 'Nos', qty_ordered || 0, qty_received || 0, qty_used || 0, unit_rate || 0, supplier, date, remarks]
    );
    await audit('CREATE', 'materials', rows[0].id, req.body);
    res.status(201).json({ id: rows[0].id });
  } catch (err) { next(err); }
});

// PUT /api/materials/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name, category, unit, qty_ordered, qty_received, qty_used, unit_rate, supplier, date, remarks } = req.body;
    await query(
      `UPDATE materials
       SET name=$1, category=$2, unit=$3, qty_ordered=$4, qty_received=$5,
           qty_used=$6, unit_rate=$7, supplier=$8, date=$9, remarks=$10
       WHERE id=$11`,
      [name, category, unit, qty_ordered, qty_received, qty_used, unit_rate, supplier, date, remarks, req.params.id]
    );
    await audit('UPDATE', 'materials', req.params.id, req.body);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /api/materials/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await query('DELETE FROM materials WHERE id = $1', [req.params.id]);
    await audit('DELETE', 'materials', req.params.id, {});
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
