const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');

// ─── Database Setup ────────────────────────────────────────────────────────────
const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'kaytech.db');
let db;

function initDatabase() {
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      client TEXT,
      location TEXT,
      status TEXT DEFAULT 'Planning',
      start_date TEXT,
      end_date TEXT,
      contract_value REAL DEFAULT 0,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS boq_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      section TEXT DEFAULT 'General',
      item_no TEXT,
      description TEXT NOT NULL,
      unit TEXT DEFAULT 'LS',
      quantity REAL DEFAULT 0,
      rate REAL DEFAULT 0,
      amount REAL GENERATED ALWAYS AS (quantity * rate) STORED,
      date TEXT,
      invoice_no TEXT,
      grade TEXT,
      tax_value REAL DEFAULT 0,
      total_amount REAL GENERATED ALWAYS AS ((quantity * rate) + tax_value) STORED,
      remarks TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS budget_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      budgeted_amount REAL DEFAULT 0,
      actual_amount REAL DEFAULT 0,
      vendor TEXT,
      invoice_no TEXT,
      date TEXT,
      remarks TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'General',
      unit TEXT DEFAULT 'Nos',
      qty_ordered REAL DEFAULT 0,
      qty_received REAL DEFAULT 0,
      qty_used REAL DEFAULT 0,
      unit_rate REAL DEFAULT 0,
      supplier TEXT,
      date TEXT,
      remarks TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS labour_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      worker_name TEXT NOT NULL,
      role TEXT DEFAULT 'Labour',
      hours REAL DEFAULT 8,
      rate_per_hour REAL DEFAULT 0,
      wages REAL GENERATED ALWAYS AS (hours * rate_per_hour) STORED,
      attendance TEXT DEFAULT 'Present',
      remarks TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      table_name TEXT,
      record_id INTEGER,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

// ─── Window Setup ──────────────────────────────────────────────────────────────
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0d1117',
    icon: path.join(__dirname, '../public/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  initDatabase();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (db) db.close();
  if (process.platform !== 'darwin') app.quit();
});

// ─── Window Controls ───────────────────────────────────────────────────────────
ipcMain.on('window-minimize', () => mainWindow.minimize());
ipcMain.on('window-maximize', () => {
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});
ipcMain.on('window-close', () => mainWindow.close());

// ─── Audit Log Helper ─────────────────────────────────────────────────────────
function auditLog(action, table, recordId, details) {
  db.prepare(`INSERT INTO activity_log (action, table_name, record_id, details) VALUES (?, ?, ?, ?)`).run(action, table, recordId, JSON.stringify(details));
}

// ─── Projects IPC ─────────────────────────────────────────────────────────────
ipcMain.handle('projects:getAll', () => {
  return db.prepare(`SELECT p.*, 
    (SELECT COALESCE(SUM(amount),0) FROM boq_items WHERE project_id = p.id) as boq_total,
    (SELECT COALESCE(SUM(actual_amount),0) FROM budget_items WHERE project_id = p.id) as spent
    FROM projects p ORDER BY created_at DESC`).all();
});
ipcMain.handle('projects:getById', (_, id) => {
  return db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
});
ipcMain.handle('projects:create', (_, data) => {
  const stmt = db.prepare(`INSERT INTO projects (name, client, location, status, start_date, end_date, contract_value, description) VALUES (@name, @client, @location, @status, @start_date, @end_date, @contract_value, @description)`);
  const result = stmt.run(data);
  auditLog('CREATE', 'projects', result.lastInsertRowid, data);
  return result.lastInsertRowid;
});
ipcMain.handle('projects:update', (_, { id, ...data }) => {
  db.prepare(`UPDATE projects SET name=@name, client=@client, location=@location, status=@status, start_date=@start_date, end_date=@end_date, contract_value=@contract_value, description=@description, updated_at=datetime('now') WHERE id=@id`).run({ id, ...data });
  auditLog('UPDATE', 'projects', id, data);
});
ipcMain.handle('projects:delete', (_, id) => {
  db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  auditLog('DELETE', 'projects', id, {});
});

// ─── BOQ IPC ──────────────────────────────────────────────────────────────────
ipcMain.handle('boq:getByProject', (_, projectId) => {
  return db.prepare('SELECT * FROM boq_items WHERE project_id = ? ORDER BY section, item_no').all(projectId);
});
ipcMain.handle('boq:create', (_, data) => {
  const stmt = db.prepare(`INSERT INTO boq_items (project_id, section, item_no, description, unit, quantity, rate, date, invoice_no, grade, tax_value, remarks) VALUES (@project_id, @section, @item_no, @description, @unit, @quantity, @rate, @date, @invoice_no, @grade, @tax_value, @remarks)`);
  const result = stmt.run(data);
  auditLog('CREATE', 'boq_items', result.lastInsertRowid, data);
  return result.lastInsertRowid;
});
ipcMain.handle('boq:update', (_, { id, ...data }) => {
  db.prepare(`UPDATE boq_items SET section=@section, item_no=@item_no, description=@description, unit=@unit, quantity=@quantity, rate=@rate, date=@date, invoice_no=@invoice_no, grade=@grade, tax_value=@tax_value, remarks=@remarks WHERE id=@id`).run({ id, ...data });
  auditLog('UPDATE', 'boq_items', id, data);
});
ipcMain.handle('boq:delete', (_, id) => {
  db.prepare('DELETE FROM boq_items WHERE id = ?').run(id);
  auditLog('DELETE', 'boq_items', id, {});
});
ipcMain.handle('boq:bulkCreate', (_, { projectId, items }) => {
  const insert = db.prepare(`INSERT INTO boq_items (project_id, section, item_no, description, unit, quantity, rate, remarks) VALUES (@project_id, @section, @item_no, @description, @unit, @quantity, @rate, @remarks)`);
  const insertMany = db.transaction((rows) => { for (const row of rows) insert.run({ project_id: projectId, ...row }); });
  insertMany(items);
});

// ─── Budget IPC ───────────────────────────────────────────────────────────────
ipcMain.handle('budget:getByProject', (_, projectId) => {
  return db.prepare('SELECT * FROM budget_items WHERE project_id = ? ORDER BY category, created_at').all(projectId);
});
ipcMain.handle('budget:create', (_, data) => {
  const stmt = db.prepare(`INSERT INTO budget_items (project_id, category, description, budgeted_amount, actual_amount, vendor, invoice_no, date, remarks) VALUES (@project_id, @category, @description, @budgeted_amount, @actual_amount, @vendor, @invoice_no, @date, @remarks)`);
  const result = stmt.run(data);
  auditLog('CREATE', 'budget_items', result.lastInsertRowid, data);
  return result.lastInsertRowid;
});
ipcMain.handle('budget:update', (_, { id, ...data }) => {
  db.prepare(`UPDATE budget_items SET category=@category, description=@description, budgeted_amount=@budgeted_amount, actual_amount=@actual_amount, vendor=@vendor, invoice_no=@invoice_no, date=@date, remarks=@remarks WHERE id=@id`).run({ id, ...data });
  auditLog('UPDATE', 'budget_items', id, data);
});
ipcMain.handle('budget:delete', (_, id) => {
  db.prepare('DELETE FROM budget_items WHERE id = ?').run(id);
  auditLog('DELETE', 'budget_items', id, {});
});

// ─── Materials IPC ────────────────────────────────────────────────────────────
ipcMain.handle('materials:getByProject', (_, projectId) => {
  return db.prepare('SELECT * FROM materials WHERE project_id = ? ORDER BY category, name').all(projectId);
});
ipcMain.handle('materials:create', (_, data) => {
  const stmt = db.prepare(`INSERT INTO materials (project_id, name, category, unit, qty_ordered, qty_received, qty_used, unit_rate, supplier, date, remarks) VALUES (@project_id, @name, @category, @unit, @qty_ordered, @qty_received, @qty_used, @unit_rate, @supplier, @date, @remarks)`);
  const result = stmt.run(data);
  auditLog('CREATE', 'materials', result.lastInsertRowid, data);
  return result.lastInsertRowid;
});
ipcMain.handle('materials:update', (_, { id, ...data }) => {
  db.prepare(`UPDATE materials SET name=@name, category=@category, unit=@unit, qty_ordered=@qty_ordered, qty_received=@qty_received, qty_used=@qty_used, unit_rate=@unit_rate, supplier=@supplier, date=@date, remarks=@remarks WHERE id=@id`).run({ id, ...data });
  auditLog('UPDATE', 'materials', id, data);
});
ipcMain.handle('materials:delete', (_, id) => {
  db.prepare('DELETE FROM materials WHERE id = ?').run(id);
  auditLog('DELETE', 'materials', id, {});
});

// ─── Labour IPC ───────────────────────────────────────────────────────────────
ipcMain.handle('labour:getByProject', (_, projectId) => {
  return db.prepare('SELECT * FROM labour_log WHERE project_id = ? ORDER BY date DESC').all(projectId);
});
ipcMain.handle('labour:create', (_, data) => {
  const stmt = db.prepare(`INSERT INTO labour_log (project_id, date, worker_name, role, hours, rate_per_hour, attendance, remarks) VALUES (@project_id, @date, @worker_name, @role, @hours, @rate_per_hour, @attendance, @remarks)`);
  const result = stmt.run(data);
  auditLog('CREATE', 'labour_log', result.lastInsertRowid, data);
  return result.lastInsertRowid;
});
ipcMain.handle('labour:update', (_, { id, ...data }) => {
  db.prepare(`UPDATE labour_log SET date=@date, worker_name=@worker_name, role=@role, hours=@hours, rate_per_hour=@rate_per_hour, attendance=@attendance, remarks=@remarks WHERE id=@id`).run({ id, ...data });
  auditLog('UPDATE', 'labour_log', id, data);
});
ipcMain.handle('labour:delete', (_, id) => {
  db.prepare('DELETE FROM labour_log WHERE id = ?').run(id);
  auditLog('DELETE', 'labour_log', id, {});
});

// ─── Dashboard IPC ────────────────────────────────────────────────────────────
ipcMain.handle('dashboard:getStats', () => {
  const totalProjects = db.prepare('SELECT COUNT(*) as count FROM projects').get().count;
  const activeProjects = db.prepare("SELECT COUNT(*) as count FROM projects WHERE status='Active'").get().count;
  const totalContractValue = db.prepare('SELECT COALESCE(SUM(contract_value),0) as total FROM projects').get().total;
  const totalSpent = db.prepare('SELECT COALESCE(SUM(actual_amount),0) as total FROM budget_items').get().total;
  const projectsByStatus = db.prepare('SELECT status, COUNT(*) as count FROM projects GROUP BY status').all();
  const recentProjects = db.prepare('SELECT * FROM projects ORDER BY created_at DESC LIMIT 5').all();
  const budgetByCategory = db.prepare('SELECT category, SUM(budgeted_amount) as budgeted, SUM(actual_amount) as actual FROM budget_items GROUP BY category').all();
  return { totalProjects, activeProjects, totalContractValue, totalSpent, projectsByStatus, recentProjects, budgetByCategory };
});

// ─── Activity Log IPC ─────────────────────────────────────────────────────────
ipcMain.handle('activity:getRecent', () => {
  return db.prepare('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 50').all();
});
