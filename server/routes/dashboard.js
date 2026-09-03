const router = require('express').Router();
const { query } = require('../db');

// GET /api/dashboard/stats
router.get('/stats', async (req, res, next) => {
  try {
    const [
      { rows: [{ count: totalProjects }] },
      { rows: [{ count: activeProjects }] },
      { rows: [{ total: totalContractValue }] },
      { rows: [{ total: totalSpent }] },
      { rows: projectsByStatus },
      { rows: recentProjects },
      { rows: budgetByCategory },
    ] = await Promise.all([
      query(`SELECT COUNT(*) AS count FROM projects`),
      query(`SELECT COUNT(*) AS count FROM projects WHERE status = 'Active'`),
      query(`SELECT COALESCE(SUM(contract_value), 0) AS total FROM projects`),
      query(`SELECT COALESCE(SUM(actual_amount), 0) AS total FROM budget_items`),
      query(`SELECT status, COUNT(*) AS count FROM projects GROUP BY status ORDER BY status`),
      query(`SELECT * FROM projects ORDER BY created_at DESC LIMIT 5`),
      query(`SELECT category, SUM(budgeted_amount) AS budgeted, SUM(actual_amount) AS actual FROM budget_items GROUP BY category ORDER BY category`),
    ]);

    res.json({
      totalProjects: Number(totalProjects),
      activeProjects: Number(activeProjects),
      totalContractValue: Number(totalContractValue),
      totalSpent: Number(totalSpent),
      projectsByStatus: projectsByStatus.map(r => ({ status: r.status, count: Number(r.count) })),
      recentProjects,
      budgetByCategory: budgetByCategory.map(r => ({
        category: r.category,
        budgeted: Number(r.budgeted),
        actual: Number(r.actual),
      })),
    });
  } catch (err) { next(err); }
});

module.exports = router;
