import React, { useState, useEffect } from 'react';
import { useToast, Modal, ConfirmDialog, Field, formatCurrency, formatNum, EmptyState } from '../components/ui';
import api from '../api';

const UNITS = ['Bags', 'Nos', 'MT', 'Kg', 'Litre', 'Sqm', 'Cum', 'Rmt', 'Set', 'Sheets', 'Box'];
const CATEGORIES = ['Cement & Concrete', 'Steel & Rebar', 'Bricks & Blocks', 'Sand & Aggregate', 'Timber & Wood', 'Electrical', 'Plumbing', 'Paint & Finish', 'Tiles & Flooring', 'Miscellaneous'];
const EMPTY_FORM = { name: '', category: 'Cement & Concrete', unit: 'Bags', qty_ordered: '', qty_received: '', qty_used: '', unit_rate: '', supplier: '', date: '', remarks: '' };

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Material name is required';
  for (const k of ['qty_ordered', 'qty_received', 'qty_used', 'unit_rate']) {
    if (form[k] !== '' && (isNaN(Number(form[k])) || Number(form[k]) < 0)) errors[k] = 'Must be a valid number ≥ 0';
  }
  return errors;
}

export default function Materials({ project }) {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');

  const load = async () => {
    const data = await api.materials.getByProject(project.id);
    setItems(data);
  };

  useEffect(() => { load(); }, [project.id]);

  const openCreate = () => { setForm(EMPTY_FORM); setErrors({}); setEditing(null); setShowModal(true); };
  const openEdit = (item) => {
    setForm({ ...item, qty_ordered: String(item.qty_ordered || ''), qty_received: String(item.qty_received || ''), qty_used: String(item.qty_used || ''), unit_rate: String(item.unit_rate || '') });
    setErrors({}); setEditing(item.id); setShowModal(true);
  };

  const handleChange = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: undefined }));
  };

  const handleSubmit = async () => {
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const payload = {
      ...form, project_id: project.id,
      qty_ordered: Number(form.qty_ordered) || 0,
      qty_received: Number(form.qty_received) || 0,
      qty_used: Number(form.qty_used) || 0,
      unit_rate: Number(form.unit_rate) || 0,
    };
    if (editing) {
      await api.materials.update({ id: editing, ...payload });
      toast('Material updated');
    } else {
      await api.materials.create(payload);
      toast('Material added');
    }
    setShowModal(false);
    load();
  };

  const handleDelete = async () => {
    await api.materials.delete(deleteTarget.id);
    toast('Material deleted', 'error');
    setDeleteTarget(null);
    load();
  };

  const filtered = items.filter(i => {
    const matchCat = filterCat === 'All' || i.category === filterCat;
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) || (i.supplier || '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const totalCost = filtered.reduce((s, i) => s + ((i.qty_ordered || 0) * (i.unit_rate || 0)), 0);

  const getStockStatus = (item) => {
    const pending = (item.qty_ordered || 0) - (item.qty_received || 0);
    const balance = (item.qty_received || 0) - (item.qty_used || 0);
    if (balance < 0) return { label: 'Over-used', cls: 'badge-warning' };
    if (pending > 0) return { label: `${formatNum(pending, 2)} pending`, cls: 'badge-hold' };
    return { label: 'Received', cls: 'badge-ok' };
  };

  const usedCats = [...new Set(items.map(i => i.category))];

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <div className="page-title">📦 Material & Inventory</div>
          <div className="page-subtitle">{project.name} · {items.length} materials · Est. Cost: <strong style={{ color: 'var(--accent)' }}>{formatCurrency(totalCost)}</strong></div>
        </div>
        <div className="page-actions">
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input placeholder="Search materials…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-select" style={{ width: 170 }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="All">All Categories</option>
            {usedCats.map(c => <option key={c}>{c}</option>)}
          </select>
          <button className="btn btn-primary" onClick={openCreate}>+ Add Material</button>
        </div>
      </div>

      <div className="page-content">
        {filtered.length === 0 ? (
          <EmptyState icon="📦" title="No materials tracked" desc="Add materials to track ordered, received and used quantities with auto cost calculation." action={<button className="btn btn-primary" onClick={openCreate}>+ Add Material</button>} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Category</th>
                  <th>Unit</th>
                  <th style={{ textAlign: 'right' }}>Ordered</th>
                  <th style={{ textAlign: 'right' }}>Received</th>
                  <th style={{ textAlign: 'right' }}>Used</th>
                  <th style={{ textAlign: 'right' }}>Balance</th>
                  <th style={{ textAlign: 'right' }}>Rate (₹)</th>
                  <th style={{ textAlign: 'right' }}>Total Cost (₹)</th>
                  <th>Status</th>
                  <th>Supplier</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => {
                  const balance = (item.qty_received || 0) - (item.qty_used || 0);
                  const cost = (item.qty_ordered || 0) * (item.unit_rate || 0);
                  const status = getStockStatus(item);
                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 500 }}>{item.name}</td>
                      <td className="muted" style={{ fontSize: 11 }}>{item.category}</td>
                      <td className="muted">{item.unit}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>{formatNum(item.qty_ordered, 2)}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>{formatNum(item.qty_received, 2)}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>{formatNum(item.qty_used, 2)}</td>
                      <td className="mono" style={{ textAlign: 'right', color: balance < 0 ? 'var(--red)' : 'var(--green)', fontWeight: 600 }}>
                        {formatNum(balance, 2)}
                      </td>
                      <td className="currency-cell">{formatNum(item.unit_rate, 2)}</td>
                      <td className="currency-cell">{formatNum(cost, 2)}</td>
                      <td><span className={`badge ${status.cls}`}>{status.label}</span></td>
                      <td className="muted" style={{ fontSize: 11 }}>{item.supplier || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(item)}>✏️</button>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setDeleteTarget(item)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="tfoot-row">
                  <td colSpan={8} style={{ textAlign: 'right' }}>Estimated Total Cost</td>
                  <td className="currency-cell amount-total">{formatCurrency(totalCost)}</td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? '✏️ Edit Material' : '+ Add Material'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit}>{editing ? 'Save Changes' : 'Add Material'}</button>
          </>
        }
      >
        <div className="form-grid" style={{ gap: 14 }}>
          <div className="form-grid form-grid-2">
            <Field label="Material Name" required error={errors.name}>
              <input className={`form-input ${errors.name ? 'error' : ''}`} placeholder="e.g. OPC Cement 53 Grade" value={form.name} onChange={e => handleChange('name', e.target.value)} />
            </Field>
            <Field label="Category">
              <select className="form-select" value={form.category} onChange={e => handleChange('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Unit">
              <select className="form-select" value={form.unit} onChange={e => handleChange('unit', e.target.value)}>
                {UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </Field>
            <Field label="Unit Rate (₹)" error={errors.unit_rate}>
              <input className={`form-input ${errors.unit_rate ? 'error' : ''}`} type="number" min="0" step="0.01" placeholder="0.00" value={form.unit_rate} onChange={e => handleChange('unit_rate', e.target.value)} />
            </Field>
          </div>
          <div className="form-grid form-grid-3">
            <Field label="Qty Ordered" error={errors.qty_ordered}>
              <input className={`form-input ${errors.qty_ordered ? 'error' : ''}`} type="number" min="0" step="0.01" placeholder="0" value={form.qty_ordered} onChange={e => handleChange('qty_ordered', e.target.value)} />
            </Field>
            <Field label="Qty Received" error={errors.qty_received}>
              <input className={`form-input ${errors.qty_received ? 'error' : ''}`} type="number" min="0" step="0.01" placeholder="0" value={form.qty_received} onChange={e => handleChange('qty_received', e.target.value)} />
            </Field>
            <Field label="Qty Used" error={errors.qty_used}>
              <input className={`form-input ${errors.qty_used ? 'error' : ''}`} type="number" min="0" step="0.01" placeholder="0" value={form.qty_used} onChange={e => handleChange('qty_used', e.target.value)} />
            </Field>
          </div>
          <div className="form-grid form-grid-2">
            <Field label="Supplier">
              <input className="form-input" placeholder="Supplier name" value={form.supplier} onChange={e => handleChange('supplier', e.target.value)} />
            </Field>
            <Field label="Date">
              <input className="form-input" type="date" value={form.date} onChange={e => handleChange('date', e.target.value)} />
            </Field>
          </div>
          <Field label="Remarks">
            <input className="form-input" placeholder="Notes…" value={form.remarks} onChange={e => handleChange('remarks', e.target.value)} />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Material?"
        message={`"${deleteTarget?.name}" will be permanently deleted.`}
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
