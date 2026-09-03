import React, { useState, useEffect } from 'react';
import { useToast, Modal, ConfirmDialog, Field, formatCurrency, formatNum, EmptyState } from '../components/ui';
import api from '../api';

const CATEGORIES = ['Civil & Structure', 'Electrical', 'Plumbing', 'Finishing', 'Equipment', 'Labour', 'Subcontractor', 'Overheads', 'Miscellaneous'];
const EMPTY_FORM = { category: 'Civil & Structure', description: '', budgeted_amount: '', actual_amount: '', vendor: '', invoice_no: '', date: '', remarks: '' };

function validate(form) {
  const errors = {};
  if (!form.description.trim()) errors.description = 'Description is required';
  if (!form.category) errors.category = 'Category is required';
  if (form.budgeted_amount !== '' && isNaN(Number(form.budgeted_amount))) errors.budgeted_amount = 'Must be a number';
  if (form.actual_amount !== '' && isNaN(Number(form.actual_amount))) errors.actual_amount = 'Must be a number';
  return errors;
}

export default function Budget({ project }) {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');

  const load = async () => {
    const data = await api.budget.getByProject(project.id);
    setItems(data);
  };

  useEffect(() => { load(); }, [project.id]);

  const openCreate = () => { setForm(EMPTY_FORM); setErrors({}); setEditing(null); setShowModal(true); };
  const openEdit = (item) => {
    setForm({ ...item, budgeted_amount: String(item.budgeted_amount || ''), actual_amount: String(item.actual_amount || '') });
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
      budgeted_amount: Number(form.budgeted_amount) || 0,
      actual_amount: Number(form.actual_amount) || 0,
    };
    if (editing) {
      await api.budget.update({ id: editing, ...payload });
      toast('Budget entry updated');
    } else {
      await api.budget.create(payload);
      toast('Budget entry added');
    }
    setShowModal(false);
    load();
  };

  const handleDelete = async () => {
    await api.budget.delete(deleteTarget.id);
    toast('Entry deleted', 'error');
    setDeleteTarget(null);
    load();
  };

  const usedCategories = [...new Set(items.map(i => i.category))];
  const filtered = items.filter(i => {
    const matchCat = activeCategory === 'All' || i.category === activeCategory;
    const matchSearch = !search || i.description.toLowerCase().includes(search.toLowerCase()) || (i.vendor || '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const totalBudgeted = filtered.reduce((s, i) => s + (i.budgeted_amount || 0), 0);
  const totalActual = filtered.reduce((s, i) => s + (i.actual_amount || 0), 0);
  const variance = totalBudgeted - totalActual;
  const varPct = totalBudgeted > 0 ? ((totalActual / totalBudgeted) * 100).toFixed(1) : 0;

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <div className="page-title">💰 Budget & Cost Tracker</div>
          <div className="page-subtitle">{project.name} · {items.length} entries</div>
        </div>
        <div className="page-actions">
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input placeholder="Search entries…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={openCreate}>+ Add Entry</button>
        </div>
      </div>

      <div className="page-content">
        {/* KPI Summary */}
        <div className="kpi-grid" style={{ marginBottom: 20, gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className="kpi-card" style={{ '--kpi-color': 'var(--blue)' }}>
            <div className="kpi-icon">📦</div>
            <div className="kpi-label">Total Budgeted</div>
            <div className="kpi-value currency">{formatCurrency(totalBudgeted)}</div>
          </div>
          <div className="kpi-card" style={{ '--kpi-color': 'var(--accent)' }}>
            <div className="kpi-icon">💸</div>
            <div className="kpi-label">Total Spent</div>
            <div className="kpi-value currency">{formatCurrency(totalActual)}</div>
            <div className="kpi-sub">{varPct}% of budget used</div>
          </div>
          <div className="kpi-card" style={{ '--kpi-color': variance >= 0 ? 'var(--green)' : 'var(--red)' }}>
            <div className="kpi-icon">{variance >= 0 ? '✅' : '⚠️'}</div>
            <div className="kpi-label">Variance</div>
            <div className="kpi-value currency" style={{ color: variance >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {variance >= 0 ? '+' : ''}{formatCurrency(variance)}
            </div>
            <div className="kpi-sub">{variance >= 0 ? 'Under budget' : 'Over budget!'}</div>
          </div>
        </div>

        {/* Category Tabs */}
        {usedCategories.length > 0 && (
          <div className="tabs">
            <button className={`tab-btn ${activeCategory === 'All' ? 'active' : ''}`} onClick={() => setActiveCategory('All')}>All ({items.length})</button>
            {usedCategories.map(c => (
              <button key={c} className={`tab-btn ${activeCategory === c ? 'active' : ''}`} onClick={() => setActiveCategory(c)}>
                {c} ({items.filter(i => i.category === c).length})
              </button>
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState icon="💰" title="No budget entries yet" desc="Track costs by adding budget entries with budgeted vs actual amounts." action={<button className="btn btn-primary" onClick={openCreate}>+ Add Entry</button>} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Vendor</th>
                  <th>Invoice No.</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Budgeted (₹)</th>
                  <th style={{ textAlign: 'right' }}>Actual (₹)</th>
                  <th style={{ textAlign: 'right' }}>Variance</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => {
                  const v = (item.budgeted_amount || 0) - (item.actual_amount || 0);
                  return (
                    <tr key={item.id}>
                      <td>
                        <span className="badge badge-planning" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>{item.category}</span>
                      </td>
                      <td style={{ maxWidth: 220 }}>{item.description}</td>
                      <td className="muted">{item.vendor || '—'}</td>
                      <td className="muted mono" style={{ fontSize: 11 }}>{item.invoice_no || '—'}</td>
                      <td className="muted">{item.date || '—'}</td>
                      <td className="currency-cell">{formatNum(item.budgeted_amount, 2)}</td>
                      <td className="currency-cell">{formatNum(item.actual_amount, 2)}</td>
                      <td className="currency-cell" style={{ color: v >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                        {v >= 0 ? '+' : ''}{formatNum(v, 2)}
                      </td>
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
                  <td colSpan={5}>Total</td>
                  <td className="currency-cell amount-total">{formatCurrency(totalBudgeted)}</td>
                  <td className="currency-cell amount-total">{formatCurrency(totalActual)}</td>
                  <td className="currency-cell" style={{ color: variance >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
                    {variance >= 0 ? '+' : ''}{formatCurrency(variance)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? '✏️ Edit Entry' : '+ Add Budget Entry'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit}>{editing ? 'Save Changes' : 'Add Entry'}</button>
          </>
        }
      >
        <div className="form-grid" style={{ gap: 14 }}>
          <div className="form-grid form-grid-2">
            <Field label="Category" required error={errors.category}>
              <select className="form-select" value={form.category} onChange={e => handleChange('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Date">
              <input className="form-input" type="date" value={form.date} onChange={e => handleChange('date', e.target.value)} />
            </Field>
          </div>
          <Field label="Description" required error={errors.description}>
            <input className={`form-input ${errors.description ? 'error' : ''}`} placeholder="What is this cost for?" value={form.description} onChange={e => handleChange('description', e.target.value)} />
          </Field>
          <div className="form-grid form-grid-2">
            <Field label="Budgeted Amount (₹)" error={errors.budgeted_amount}>
              <input className={`form-input ${errors.budgeted_amount ? 'error' : ''}`} type="number" min="0" step="0.01" placeholder="0.00" value={form.budgeted_amount} onChange={e => handleChange('budgeted_amount', e.target.value)} />
            </Field>
            <Field label="Actual Amount (₹)" error={errors.actual_amount}>
              <input className={`form-input ${errors.actual_amount ? 'error' : ''}`} type="number" min="0" step="0.01" placeholder="0.00" value={form.actual_amount} onChange={e => handleChange('actual_amount', e.target.value)} />
            </Field>
            <Field label="Vendor / Supplier">
              <input className="form-input" placeholder="Vendor name" value={form.vendor} onChange={e => handleChange('vendor', e.target.value)} />
            </Field>
            <Field label="Invoice No.">
              <input className="form-input" placeholder="INV-001" value={form.invoice_no} onChange={e => handleChange('invoice_no', e.target.value)} />
            </Field>
          </div>
          <Field label="Remarks">
            <input className="form-input" placeholder="Notes…" value={form.remarks} onChange={e => handleChange('remarks', e.target.value)} />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Budget Entry?"
        message={`"${deleteTarget?.description}" will be permanently deleted.`}
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
