import React, { useState, useEffect } from 'react';
import { useToast, Modal, ConfirmDialog, Field, formatCurrency, formatNum, EmptyState } from '../components/ui';
import api from '../api';

const ROLES = ['Site Engineer', 'Supervisor', 'Mason', 'Carpenter', 'Electrician', 'Plumber', 'Painter', 'Helper', 'Labour', 'Welder', 'Driver'];
const ATTENDANCE = ['Present', 'Half Day', 'Absent', 'Holiday'];
const EMPTY_FORM = { date: new Date().toISOString().split('T')[0], worker_name: '', role: 'Labour', hours: '8', rate_per_hour: '', attendance: 'Present', remarks: '' };

function validate(form) {
  const errors = {};
  if (!form.worker_name.trim()) errors.worker_name = 'Worker name is required';
  if (!form.date) errors.date = 'Date is required';
  if (form.hours === '' || isNaN(Number(form.hours)) || Number(form.hours) < 0 || Number(form.hours) > 24) errors.hours = 'Hours must be 0–24';
  if (form.rate_per_hour !== '' && (isNaN(Number(form.rate_per_hour)) || Number(form.rate_per_hour) < 0)) errors.rate_per_hour = 'Must be a valid number';
  return errors;
}

export default function Labour({ project }) {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const load = async () => {
    const data = await api.labour.getByProject(project.id);
    setItems(data);
  };

  useEffect(() => { load(); }, [project.id]);

  const openCreate = () => { setForm(EMPTY_FORM); setErrors({}); setEditing(null); setShowModal(true); };
  const openEdit = (item) => {
    setForm({ ...item, hours: String(item.hours || ''), rate_per_hour: String(item.rate_per_hour || '') });
    setErrors({}); setEditing(item.id); setShowModal(true);
  };

  const handleChange = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: undefined }));
  };

  const handleSubmit = async () => {
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const payload = { ...form, project_id: project.id, hours: Number(form.hours) || 0, rate_per_hour: Number(form.rate_per_hour) || 0 };
    if (editing) {
      await api.labour.update({ id: editing, ...payload });
      toast('Labour entry updated');
    } else {
      await api.labour.create(payload);
      toast('Labour entry added');
    }
    setShowModal(false);
    load();
  };

  const handleDelete = async () => {
    await api.labour.delete(deleteTarget.id);
    toast('Entry deleted', 'error');
    setDeleteTarget(null);
    load();
  };

  const filtered = items.filter(i => {
    const matchSearch = !search || i.worker_name.toLowerCase().includes(search.toLowerCase()) || i.role.toLowerCase().includes(search.toLowerCase());
    const matchDate = !filterDate || i.date === filterDate;
    return matchSearch && matchDate;
  });

  const totalWages = filtered.reduce((s, i) => s + (i.wages || 0), 0);
  const totalHours = filtered.reduce((s, i) => s + (i.hours || 0), 0);
  const presentCount = filtered.filter(i => i.attendance === 'Present').length;

  const attClasses = { Present: 'badge-active', 'Half Day': 'badge-hold', Absent: 'badge-warning', Holiday: 'badge-planning' };

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <div className="page-title">👷 Labour Log</div>
          <div className="page-subtitle">{project.name} · {items.length} entries</div>
        </div>
        <div className="page-actions">
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input placeholder="Search workers…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <input className="form-input" type="date" style={{ width: 150 }} value={filterDate} onChange={e => setFilterDate(e.target.value)} title="Filter by date" />
          {filterDate && <button className="btn btn-ghost btn-sm" onClick={() => setFilterDate('')}>✕ Clear</button>}
          <button className="btn btn-primary" onClick={openCreate}>+ Add Entry</button>
        </div>
      </div>

      <div className="page-content">
        {/* Summary */}
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
          <div className="kpi-card" style={{ '--kpi-color': 'var(--accent)' }}>
            <div className="kpi-icon">💰</div>
            <div className="kpi-label">Total Wages</div>
            <div className="kpi-value currency">{formatCurrency(totalWages)}</div>
          </div>
          <div className="kpi-card" style={{ '--kpi-color': 'var(--blue)' }}>
            <div className="kpi-icon">⏱️</div>
            <div className="kpi-label">Total Hours</div>
            <div className="kpi-value">{formatNum(totalHours, 0)} <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>hrs</span></div>
          </div>
          <div className="kpi-card" style={{ '--kpi-color': 'var(--green)' }}>
            <div className="kpi-icon">✅</div>
            <div className="kpi-label">Present Entries</div>
            <div className="kpi-value">{presentCount}</div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon="👷" title="No labour entries yet" desc="Log daily worker attendance, hours worked, and wages to track your manpower costs." action={<button className="btn btn-primary" onClick={openCreate}>+ Add Entry</button>} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Worker Name</th>
                  <th>Role</th>
                  <th>Attendance</th>
                  <th style={{ textAlign: 'right' }}>Hours</th>
                  <th style={{ textAlign: 'right' }}>Rate/hr (₹)</th>
                  <th style={{ textAlign: 'right' }}>Wages (₹)</th>
                  <th>Remarks</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id}>
                    <td className="mono muted" style={{ fontSize: 12 }}>{item.date}</td>
                    <td style={{ fontWeight: 500 }}>{item.worker_name}</td>
                    <td className="muted" style={{ fontSize: 12 }}>{item.role}</td>
                    <td><span className={`badge ${attClasses[item.attendance] || 'badge-planning'}`}>{item.attendance}</span></td>
                    <td className="mono" style={{ textAlign: 'right' }}>{formatNum(item.hours, 1)}</td>
                    <td className="currency-cell">{formatNum(item.rate_per_hour, 2)}</td>
                    <td className="currency-cell" style={{ fontWeight: 600, color: 'var(--accent)' }}>{formatNum(item.wages, 2)}</td>
                    <td className="muted" style={{ fontSize: 11 }}>{item.remarks || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(item)}>✏️</button>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setDeleteTarget(item)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="tfoot-row">
                  <td colSpan={4}>Total</td>
                  <td className="mono" style={{ textAlign: 'right' }}>{formatNum(totalHours, 1)}</td>
                  <td></td>
                  <td className="currency-cell amount-total">{formatCurrency(totalWages)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? '✏️ Edit Labour Entry' : '+ Add Labour Entry'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit}>{editing ? 'Save Changes' : 'Add Entry'}</button>
          </>
        }
      >
        <div className="form-grid" style={{ gap: 14 }}>
          <div className="form-grid form-grid-2">
            <Field label="Date" required error={errors.date}>
              <input className={`form-input ${errors.date ? 'error' : ''}`} type="date" value={form.date} onChange={e => handleChange('date', e.target.value)} />
            </Field>
            <Field label="Attendance">
              <select className="form-select" value={form.attendance} onChange={e => handleChange('attendance', e.target.value)}>
                {ATTENDANCE.map(a => <option key={a}>{a}</option>)}
              </select>
            </Field>
            <Field label="Worker Name" required error={errors.worker_name}>
              <input className={`form-input ${errors.worker_name ? 'error' : ''}`} placeholder="Full name" value={form.worker_name} onChange={e => handleChange('worker_name', e.target.value)} />
            </Field>
            <Field label="Role / Designation">
              <select className="form-select" value={form.role} onChange={e => handleChange('role', e.target.value)}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Hours Worked" required error={errors.hours}>
              <input className={`form-input ${errors.hours ? 'error' : ''}`} type="number" min="0" max="24" step="0.5" placeholder="8" value={form.hours} onChange={e => handleChange('hours', e.target.value)} />
            </Field>
            <Field label="Rate per Hour (₹)" error={errors.rate_per_hour}>
              <input className={`form-input ${errors.rate_per_hour ? 'error' : ''}`} type="number" min="0" step="0.01" placeholder="0.00" value={form.rate_per_hour} onChange={e => handleChange('rate_per_hour', e.target.value)} />
            </Field>
          </div>
          {form.hours && form.rate_per_hour && (
            <div style={{ background: 'var(--accent-light)', border: '1px solid var(--border-accent)', borderRadius: 'var(--radius-md)', padding: '10px 14px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Calculated Wages</span>
              <span className="amount-total">{formatCurrency(Number(form.hours) * Number(form.rate_per_hour))}</span>
            </div>
          )}
          <Field label="Remarks">
            <input className="form-input" placeholder="Notes…" value={form.remarks} onChange={e => handleChange('remarks', e.target.value)} />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Labour Entry?"
        message={`Entry for "${deleteTarget?.worker_name}" on ${deleteTarget?.date} will be deleted.`}
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
