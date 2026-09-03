const router = require('express').Router();
const { query } = require('../db');

async function audit(action, table, recordId, details) {
  await query(
    `INSERT INTO activity_log (action, table_name, record_id, details) VALUES ($1, $2, $3, $4)`,
    [action, table, recordId, JSON.stringify(details)]
  );
}

// GET /api/boq/:projectId
router.get('/:projectId', async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM boq_items WHERE project_id = $1 ORDER BY section, item_no',
      [req.params.projectId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/boq
router.post('/', async (req, res, next) => {
  try {
    const { project_id, section, item_no, description, unit, quantity, rate, date, invoice_no, grade, tax_value, remarks } = req.body;
    const { rows } = await query(
      `INSERT INTO boq_items (project_id, section, item_no, description, unit, quantity, rate, date, invoice_no, grade, tax_value, remarks)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [project_id, section, item_no, description, unit, quantity, rate, date, invoice_no, grade, tax_value || 0, remarks]
    );
    await audit('CREATE', 'boq_items', rows[0].id, req.body);
    res.status(201).json({ id: rows[0].id });
  } catch (err) { next(err); }
});

// PUT /api/boq/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { section, item_no, description, unit, quantity, rate, date, invoice_no, grade, tax_value, remarks } = req.body;
    await query(
      `UPDATE boq_items
       SET section=$1, item_no=$2, description=$3, unit=$4,
           quantity=$5, rate=$6, date=$7, invoice_no=$8,
           grade=$9, tax_value=$10, remarks=$11
       WHERE id=$12`,
      [section, item_no, description, unit, quantity, rate, date, invoice_no, grade, tax_value || 0, remarks, req.params.id]
    );
    await audit('UPDATE', 'boq_items', req.params.id, req.body);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /api/boq/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await query('DELETE FROM boq_items WHERE id = $1', [req.params.id]);
    await audit('DELETE', 'boq_items', req.params.id, {});
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/boq/bulk
router.post('/bulk', async (req, res, next) => {
  try {
    const { projectId, items } = req.body;
    for (const item of items) {
      await query(
        `INSERT INTO boq_items (project_id, section, item_no, description, unit, quantity, rate, remarks)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [projectId, item.section, item.item_no, item.description, item.unit, item.quantity, item.rate, item.remarks]
      );
    }
    res.status(201).json({ ok: true, count: items.length });
  } catch (err) { next(err); }
});

module.exports = router;
