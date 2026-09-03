import React, { useState, useEffect } from 'react';
import { useToast, Modal, ConfirmDialog, Field, formatCurrency, StatusBadge, EmptyState, ProgressBar } from '../components/ui';
import api from '../api';

const STATUS_OPTIONS = ['Planning', 'Active', 'On Hold', 'Completed'];
const EMPTY_FORM = { name: '', client: '', location: '', status: 'Planning', start_date: '', end_date: '', contract_value: '', description: '' };

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Project name is required';
  if (!form.client.trim()) errors.client = 'Client name is required';
  if (form.start_date && form.end_date && form.end_date < form.start_date)
    errors.end_date = 'End date must be after start date';
  if (form.contract_value && isNaN(Number(form.contract_value)))
    errors.contract_value = 'Must be a number';
  return errors;
}

export default function Projects({ onSelect }) {
  const toast = useToast();
  const [projects, setProjects] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await api.projects.getAll();
    setProjects(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(EMPTY_FORM); setErrors({}); setEditing(null); setShowModal(true); };
  const openEdit = (p, e) => { e.stopPropagation(); setForm({ ...p, contract_value: p.contract_value || '' }); setErrors({}); setEditing(p.id); setShowModal(true); };

  const handleChange = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: undefined }));
  };

  const handleSubmit = async () => {
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const payload = { ...form, contract_value: Number(form.contract_value) || 0 };
    if (editing) {
      await api.projects.update({ id: editing, ...payload });
      toast('Project updated successfully');
    } else {
      await api.projects.create(payload);
      toast('Project created successfully');
    }
    setShowModal(false);
    load();
  };

  const handleDelete = async () => {
    await api.projects.delete(deleteTarget.id);
    toast(`"${deleteTarget.name}" deleted`, 'error');
    setDeleteTarget(null);
    load();
  };

  const filtered = projects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.client || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'All' || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">🏗️ Projects</div>
          <div className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''} total</div>
        </div>
        <div className="page-actions">
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input placeholder="Search projects…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-select" style={{ width: 130 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="All">All Status</option>
            {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
          <button className="btn btn-primary" onClick={openCreate}>+ New Project</button>
        </div>
      </div>

      {/* Content */}
      <div className="page-content">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div style={{ color: 'var(--text-muted)' }}>Loading…</div>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="🏗️"
            title="No projects yet"
            desc="Create your first project to get started tracking costs, BOQ, and labour."
            action={<button className="btn btn-primary" onClick={openCreate}>+ Create Project</button>}
          />
        ) : (
          <div className="project-cards-grid">
            {filtered.map(p => {
              const spent = p.spent || 0;
              const budget = p.contract_value || 0;
              const boqTotal = p.boq_total || 0;
              return (
                <div key={p.id} className="project-card" onClick={() => onSelect(p)}>
                  <div className="project-actions">
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={e => openEdit(p, e)} data-tooltip="Edit">✏️</button>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={e => { e.stopPropagation(); setDeleteTarget(p); }} data-tooltip="Delete">🗑️</button>
                  </div>
                  <div className="project-card-top">
                    <div>
                      <div className="project-card-name">{p.name}</div>
                      <div className="project-card-client">📍 {p.client || '—'} {p.location ? `· ${p.location}` : ''}</div>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="project-card-meta">
                    <div className="project-card-meta-item">Contract <br /><span>{budget > 0 ? formatCurrency(budget) : '—'}</span></div>
                    <div className="project-card-meta-item">BOQ Total <br /><span>{boqTotal > 0 ? formatCurrency(boqTotal) : '—'}</span></div>
                    <div className="project-card-meta-item">Start <br /><span>{p.start_date || '—'}</span></div>
                    <div className="project-card-meta-item">End <br /><span>{p.end_date || '—'}</span></div>
                  </div>
                  {budget > 0 && (
                    <div className="project-progress">
                      <div className="project-progress-label">
                        <span>Spent: {formatCurrency(spent)}</span>
                        <span>{budget > 0 ? ((spent / budget) * 100).toFixed(1) : 0}%</span>
                      </div>
                      <ProgressBar value={spent} max={budget} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? '✏️ Edit Project' : '+ New Project'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit}>{editing ? 'Save Changes' : 'Create Project'}</button>
          </>
        }
      >
        <div className="form-grid form-grid-2" style={{ gap: 14 }}>
          <Field label="Project Name" required error={errors.name} style={{ gridColumn: '1/-1' }}>
            <input className={`form-input ${errors.name ? 'error' : ''}`} placeholder="e.g. Residential Complex Block A" value={form.name} onChange={e => handleChange('name', e.target.value)} />
          </Field>
          <Field label="Client Name" required error={errors.client}>
            <input className={`form-input ${errors.client ? 'error' : ''}`} placeholder="Client / Owner" value={form.client} onChange={e => handleChange('client', e.target.value)} />
          </Field>
          <Field label="Location">
            <input className="form-input" placeholder="City, Site Address" value={form.location} onChange={e => handleChange('location', e.target.value)} />
          </Field>
          <Field label="Status">
            <select className="form-select" value={form.status} onChange={e => handleChange('status', e.target.value)}>
              {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Contract Value (₹)" error={errors.contract_value}>
            <input className={`form-input ${errors.contract_value ? 'error' : ''}`} type="number" min="0" placeholder="0.00" value={form.contract_value} onChange={e => handleChange('contract_value', e.target.value)} />
          </Field>
          <Field label="Start Date">
            <input className="form-input" type="date" value={form.start_date} onChange={e => handleChange('start_date', e.target.value)} />
          </Field>
          <Field label="End Date" error={errors.end_date}>
            <input className={`form-input ${errors.end_date ? 'error' : ''}`} type="date" value={form.end_date} onChange={e => handleChange('end_date', e.target.value)} />
          </Field>
          <div style={{ gridColumn: '1/-1' }}>
            <Field label="Description / Notes">
              <textarea className="form-textarea" placeholder="Project scope, notes…" value={form.description} onChange={e => handleChange('description', e.target.value)} />
            </Field>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Project?"
        message={`"${deleteTarget?.name}" and all its data (BOQ, budget, labour) will be permanently deleted.`}
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
