/**
 * Mock API for browser development (when Electron is not available).
 * Uses localStorage so data PERSISTS across refreshes.
 * In production Electron, window.kaytech is provided by preload.js via contextBridge (real SQLite).
 */

// ─── localStorage-backed DB ───────────────────────────────────────────────────
const STORAGE_KEY = 'kaytech_db';

function loadDB() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return { projects: [], boq: [], budget: [], materials: [], labour: [], _idCounter: 1 };
}

function saveDB(db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    console.warn('[Kaytech] localStorage save failed:', e);
  }
}

// Load persisted data on startup
let mockDB = loadDB();

const newId = () => {
  const id = mockDB._idCounter++;
  saveDB(mockDB);
  return id;
};

const persist = () => saveDB(mockDB);

// ─── Mock API ─────────────────────────────────────────────────────────────────
const mockApi = {
  minimize: () => {},
  maximize: () => {},
  close: () => {},

  projects: {
    getAll: async () => mockDB.projects.map(p => ({
      ...p,
      boq_total: mockDB.boq.filter(b => b.project_id === p.id).reduce((s, b) => s + ((b.quantity * b.rate) || 0), 0),
      spent: mockDB.budget.filter(b => b.project_id === p.id).reduce((s, b) => s + (b.actual_amount || 0), 0),
    })),
    getById: async (id) => mockDB.projects.find(p => p.id === id),
    create: async (data) => {
      const id = newId();
      mockDB.projects.push({ ...data, id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      persist();
      return id;
    },
    update: async ({ id, ...data }) => {
      const idx = mockDB.projects.findIndex(p => p.id === id);
      if (idx !== -1) mockDB.projects[idx] = { ...mockDB.projects[idx], ...data, id, updated_at: new Date().toISOString() };
      persist();
    },
    delete: async (id) => {
      mockDB.projects  = mockDB.projects.filter(p => p.id !== id);
      mockDB.boq       = mockDB.boq.filter(b => b.project_id !== id);
      mockDB.budget    = mockDB.budget.filter(b => b.project_id !== id);
      mockDB.materials = mockDB.materials.filter(m => m.project_id !== id);
      mockDB.labour    = mockDB.labour.filter(l => l.project_id !== id);
      persist();
    },
  },

  boq: {
    getByProject: async (pid) => mockDB.boq.filter(b => b.project_id === pid),
    create: async (data) => {
      const id = newId();
      const amount = (data.quantity || 0) * (data.rate || 0);
      const tax = data.tax_value || 0;
      mockDB.boq.push({ ...data, id, amount, total_amount: amount + tax, created_at: new Date().toISOString() });
      persist();
      return id;
    },
    update: async ({ id, ...data }) => {
      const idx = mockDB.boq.findIndex(b => b.id === id);
      if (idx !== -1) {
        const amount = (data.quantity || 0) * (data.rate || 0);
        const tax = data.tax_value || 0;
        mockDB.boq[idx] = { ...mockDB.boq[idx], ...data, id, amount, total_amount: amount + tax };
      }
      persist();
    },
    delete: async (id) => { mockDB.boq = mockDB.boq.filter(b => b.id !== id); persist(); },
    bulkCreate: async ({ projectId, items }) => {
      items.forEach(item => {
        const amount = (item.quantity || 0) * (item.rate || 0);
        const tax = item.tax_value || 0;
        mockDB.boq.push({ ...item, id: newId(), project_id: projectId, amount, total_amount: amount + tax });
      });
      persist();
    },
  },

  budget: {
    getByProject: async (pid) => mockDB.budget.filter(b => b.project_id === pid),
    create: async (data) => {
      const id = newId();
      mockDB.budget.push({ ...data, id, created_at: new Date().toISOString() });
      persist();
      return id;
    },
    update: async ({ id, ...data }) => {
      const idx = mockDB.budget.findIndex(b => b.id === id);
      if (idx !== -1) mockDB.budget[idx] = { ...mockDB.budget[idx], ...data, id };
      persist();
    },
    delete: async (id) => { mockDB.budget = mockDB.budget.filter(b => b.id !== id); persist(); },
  },

  materials: {
    getByProject: async (pid) => mockDB.materials.filter(m => m.project_id === pid),
    create: async (data) => {
      const id = newId();
      mockDB.materials.push({ ...data, id, created_at: new Date().toISOString() });
      persist();
      return id;
    },
    update: async ({ id, ...data }) => {
      const idx = mockDB.materials.findIndex(m => m.id === id);
      if (idx !== -1) mockDB.materials[idx] = { ...mockDB.materials[idx], ...data, id };
      persist();
    },
    delete: async (id) => { mockDB.materials = mockDB.materials.filter(m => m.id !== id); persist(); },
  },

  labour: {
    getByProject: async (pid) => mockDB.labour.filter(l => l.project_id === pid),
    create: async (data) => {
      const id = newId();
      mockDB.labour.push({ ...data, id, wages: (data.hours || 0) * (data.rate_per_hour || 0), created_at: new Date().toISOString() });
      persist();
      return id;
    },
    update: async ({ id, ...data }) => {
      const idx = mockDB.labour.findIndex(l => l.id === id);
      if (idx !== -1) mockDB.labour[idx] = { ...mockDB.labour[idx], ...data, id, wages: (data.hours || 0) * (data.rate_per_hour || 0) };
      persist();
    },
    delete: async (id) => { mockDB.labour = mockDB.labour.filter(l => l.id !== id); persist(); },
  },

  dashboard: {
    getStats: async () => {
      const totalProjects     = mockDB.projects.length;
      const activeProjects    = mockDB.projects.filter(p => p.status === 'Active').length;
      const totalContractValue = mockDB.projects.reduce((s, p) => s + (p.contract_value || 0), 0);
      const totalSpent        = mockDB.budget.reduce((s, b) => s + (b.actual_amount || 0), 0);
      const statusMap = {};
      mockDB.projects.forEach(p => { statusMap[p.status] = (statusMap[p.status] || 0) + 1; });
      const projectsByStatus  = Object.entries(statusMap).map(([status, count]) => ({ status, count }));
      const recentProjects    = [...mockDB.projects].sort((a, b) => b.id - a.id).slice(0, 5);
      const catMap = {};
      mockDB.budget.forEach(b => {
        if (!catMap[b.category]) catMap[b.category] = { budgeted: 0, actual: 0 };
        catMap[b.category].budgeted += b.budgeted_amount || 0;
        catMap[b.category].actual   += b.actual_amount  || 0;
      });
      const budgetByCategory = Object.entries(catMap).map(([category, v]) => ({ category, ...v }));
      return { totalProjects, activeProjects, totalContractValue, totalSpent, projectsByStatus, recentProjects, budgetByCategory };
    },
  },

  activity: {
    getRecent: async () => [],
  },
};

// ─── Install fallback if Electron context is missing ─────────────────────────
if (!window.kaytech) {
  window.kaytech = mockApi;
  console.info('[Kaytech] Running in browser mode — data persisted to localStorage.');
}
