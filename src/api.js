/**
 * Kaytech REST API client
 * -----------------------
 * Replaces the Electron IPC bridge (window.kaytech) and the localStorage
 * mockApi. All data now flows through the Express server → Supabase PostgreSQL.
 *
 * Base URL is read from the VITE_API_URL env var (default: http://localhost:3001/api).
 * Set VITE_API_URL in .env for production deployments.
 */

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// ─── HTTP helpers ─────────────────────────────────────────────────────────────
async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} → ${res.status} ${res.statusText}`);
  return res.json();
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status} ${res.statusText}`);
  return res.json();
}

async function put(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${path} → ${res.status} ${res.statusText}`);
  return res.json();
}

async function del(path) {
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE ${path} → ${res.status} ${res.statusText}`);
  return res.json();
}

// ─── API surface (mirrors the old window.kaytech shape) ──────────────────────
const api = {
  // Window controls (Electron-only, no-ops in web mode)
  minimize: () => window.kaytech?.minimize?.(),
  maximize: () => window.kaytech?.maximize?.(),
  close:    () => window.kaytech?.close?.(),

  projects: {
    getAll:   ()       => get('/projects'),
    getById:  (id)     => get(`/projects/${id}`),
    create:   (data)   => post('/projects', data).then(r => r.id),
    update:   ({ id, ...data }) => put(`/projects/${id}`, data),
    delete:   (id)     => del(`/projects/${id}`),
  },

  boq: {
    getByProject: (projectId)        => get(`/boq/${projectId}`),
    create:       (data)             => post('/boq', data).then(r => r.id),
    update:       ({ id, ...data })  => put(`/boq/${id}`, data),
    delete:       (id)               => del(`/boq/${id}`),
    bulkCreate:   (data)             => post('/boq/bulk', data),
  },

  budget: {
    getByProject: (projectId)        => get(`/budget/${projectId}`),
    create:       (data)             => post('/budget', data).then(r => r.id),
    update:       ({ id, ...data })  => put(`/budget/${id}`, data),
    delete:       (id)               => del(`/budget/${id}`),
  },

  materials: {
    getByProject: (projectId)        => get(`/materials/${projectId}`),
    create:       (data)             => post('/materials', data).then(r => r.id),
    update:       ({ id, ...data })  => put(`/materials/${id}`, data),
    delete:       (id)               => del(`/materials/${id}`),
  },

  labour: {
    getByProject: (projectId)        => get(`/labour/${projectId}`),
    create:       (data)             => post('/labour', data).then(r => r.id),
    update:       ({ id, ...data })  => put(`/labour/${id}`, data),
    delete:       (id)               => del(`/labour/${id}`),
  },

  dashboard: {
    getStats: () => get('/dashboard/stats'),
  },

  activity: {
    getRecent: () => get('/activity/recent'),
  },
};

export default api;
