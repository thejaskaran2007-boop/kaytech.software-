/**
 * Local development server entry point.
 * For Vercel, see /api/index.js instead.
 */
require('dotenv').config();
const app  = require('./app');
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`✅ Kaytech API server running on http://localhost:${PORT}`);
  console.log(`   Database: ${process.env.DATABASE_URL ? 'Supabase PostgreSQL' : '⚠️  DATABASE_URL not set!'}`);
});
