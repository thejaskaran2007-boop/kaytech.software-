/**
 * Kaytech DB Check Script
 * Run: node server/scripts/check-db.js
 * Tests the Supabase connection and checks if all required tables exist.
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const REQUIRED_TABLES = ['projects', 'boq_items', 'budget_items', 'materials', 'labour_log', 'activity_log'];

async function main() {
  console.log('\n🔍 Kaytech DB Connection Check\n');

  // 1. Connection test
  try {
    const res = await pool.query('SELECT NOW() AS now');
    console.log('✅ Connected to Supabase at:', res.rows[0].now);
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }

  // 2. Table check
  const res = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
  );
  const existingTables = res.rows.map(r => r.table_name);
  console.log('\n📋 Tables in public schema:', existingTables.join(', ') || '(none)');

  const missing = REQUIRED_TABLES.filter(t => !existingTables.includes(t));
  if (missing.length > 0) {
    console.log('\n⚠️  Missing tables:', missing.join(', '));
    console.log('   → Run server/schema.sql in Supabase SQL Editor to create them.\n');
  } else {
    console.log('\n✅ All required tables exist!\n');
  }

  // 3. Row counts
  console.log('📊 Row counts:');
  for (const table of REQUIRED_TABLES) {
    if (existingTables.includes(table)) {
      const r = await pool.query(`SELECT COUNT(*) AS cnt FROM ${table}`);
      console.log(`   ${table}: ${r.rows[0].cnt} rows`);
    }
  }

  await pool.end();
  console.log('\nDone.\n');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
