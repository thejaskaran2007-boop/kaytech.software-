const { contextBridge, ipcRenderer } = require('electron');

const api = (channel, ...args) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld('kaytech', {
  // Window
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Projects
  projects: {
    getAll: () => api('projects:getAll'),
    getById: (id) => api('projects:getById', id),
    create: (data) => api('projects:create', data),
    update: (data) => api('projects:update', data),
    delete: (id) => api('projects:delete', id),
  },

  // BOQ
  boq: {
    getByProject: (id) => api('boq:getByProject', id),
    create: (data) => api('boq:create', data),
    update: (data) => api('boq:update', data),
    delete: (id) => api('boq:delete', id),
    bulkCreate: (data) => api('boq:bulkCreate', data),
  },

  // Budget
  budget: {
    getByProject: (id) => api('budget:getByProject', id),
    create: (data) => api('budget:create', data),
    update: (data) => api('budget:update', data),
    delete: (id) => api('budget:delete', id),
  },

  // Materials
  materials: {
    getByProject: (id) => api('materials:getByProject', id),
    create: (data) => api('materials:create', data),
    update: (data) => api('materials:update', data),
    delete: (id) => api('materials:delete', id),
  },

  // Labour
  labour: {
    getByProject: (id) => api('labour:getByProject', id),
    create: (data) => api('labour:create', data),
    update: (data) => api('labour:update', data),
    delete: (id) => api('labour:delete', id),
  },

  // Dashboard
  dashboard: {
    getStats: () => api('dashboard:getStats'),
  },

  // Activity
  activity: {
    getRecent: () => api('activity:getRecent'),
  },
});
