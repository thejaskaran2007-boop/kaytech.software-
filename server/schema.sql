-- ============================================================
--  Kaytech Construction Software — PostgreSQL Schema
--  Run this ONCE in Supabase → SQL Editor → New Query
-- ============================================================

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  client         TEXT,
  location       TEXT,
  status         TEXT DEFAULT 'Planning',
  start_date     TEXT,
  end_date       TEXT,
  contract_value NUMERIC DEFAULT 0,
  description    TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Bill of Quantities
CREATE TABLE IF NOT EXISTS boq_items (
  id          SERIAL PRIMARY KEY,
  project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  section     TEXT DEFAULT 'General',
  item_no     TEXT,
  description TEXT NOT NULL,
  unit        TEXT DEFAULT 'LS',
  quantity    NUMERIC DEFAULT 0,
  rate        NUMERIC DEFAULT 0,
  date        TEXT,
  invoice_no  TEXT,
  grade       TEXT,
  tax_value   NUMERIC DEFAULT 0,
  remarks     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Budget Items
CREATE TABLE IF NOT EXISTS budget_items (
  id               SERIAL PRIMARY KEY,
  project_id       INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category         TEXT NOT NULL,
  description      TEXT NOT NULL,
  budgeted_amount  NUMERIC DEFAULT 0,
  actual_amount    NUMERIC DEFAULT 0,
  vendor           TEXT,
  invoice_no       TEXT,
  date             TEXT,
  remarks          TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Materials
CREATE TABLE IF NOT EXISTS materials (
  id            SERIAL PRIMARY KEY,
  project_id    INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  category      TEXT DEFAULT 'General',
  unit          TEXT DEFAULT 'Nos',
  qty_ordered   NUMERIC DEFAULT 0,
  qty_received  NUMERIC DEFAULT 0,
  qty_used      NUMERIC DEFAULT 0,
  unit_rate     NUMERIC DEFAULT 0,
  supplier      TEXT,
  date          TEXT,
  remarks       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Labour Log
CREATE TABLE IF NOT EXISTS labour_log (
  id             SERIAL PRIMARY KEY,
  project_id     INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  date           TEXT NOT NULL,
  worker_name    TEXT NOT NULL,
  role           TEXT DEFAULT 'Labour',
  hours          NUMERIC DEFAULT 8,
  rate_per_hour  NUMERIC DEFAULT 0,
  attendance     TEXT DEFAULT 'Present',
  remarks        TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Activity / Audit Log
CREATE TABLE IF NOT EXISTS activity_log (
  id          SERIAL PRIMARY KEY,
  action      TEXT NOT NULL,
  table_name  TEXT,
  record_id   INTEGER,
  details     JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_boq_project      ON boq_items(project_id);
CREATE INDEX IF NOT EXISTS idx_budget_project   ON budget_items(project_id);
CREATE INDEX IF NOT EXISTS idx_materials_project ON materials(project_id);
CREATE INDEX IF NOT EXISTS idx_labour_project   ON labour_log(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC);
