import React, { useState, useEffect } from 'react';
import { useToast, Modal, ConfirmDialog, Field, formatCurrency, formatNum, EmptyState } from '../components/ui';
import api from '../api';

const UNITS = ['Sqm', 'Sqft', 'Rmt', 'Cum', 'Nos', 'LS', 'Kg', 'MT', 'Bag', 'Litre', 'Set', 'Pair'];
const GRADES = ['', 'M10', 'M15', 'M20', 'M25', 'M30', 'M35', 'M40', 'Fe415', 'Fe500', 'Fe550', 'Grade A', 'Grade B', 'Grade C', 'IS:2062', 'IS:432', 'ISI', 'BIS'];

const EMPTY_ITEM = {
  section: '', item_no: '', description: '', unit: 'Sqm',
  quantity: '', rate: '', tax_value: '',
  date: '', invoice_no: '', grade: '', remarks: ''
};

function validateItem(item) {
  const errors = {};
  if (!item.description.trim()) errors.description = 'Description is required';
  if (item.quantity === '' || isNaN(Number(item.quantity)) || Number(item.quantity) < 0)
    errors.quantity = 'Valid quantity required';
  if (item.rate === '' || isNaN(Number(item.rate)) || Number(item.rate) < 0)
    errors.rate = 'Valid rate required';
  if (item.tax_value !== '' && (isNaN(Number(item.tax_value)) || Number(item.tax_value) < 0))
    errors.tax_value = 'Must be ≥ 0';
  return errors;
}

export default function BOQ({ project }) {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_ITEM);
  const [errors, setErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [sections, setSections] = useState([]);
  const [activeSection, setActiveSection] = useState('All');
  const [search, setSearch] = useState('');

  const load = async () => {
    const data = await api.boq.getByProject(project.id);
    setItems(data);
    const uniqueSections = [...new Set(data.map(i => i.section).filter(Boolean))];
    setSections(uniqueSections);
  };

  useEffect(() => { load(); }, [project.id]);

  const openCreate = () => {
    setForm({ ...EMPTY_ITEM, section: sections[0] || '' });
    setErrors({});
    setEditing(null);
    setShowModal(true);
  };

  const openEdit = (item) => {
    setForm({
      ...item,
      quantity: String(item.quantity),
      rate: String(item.rate),
      tax_value: String(item.tax_value || ''),
    });
    setErrors({});
    setEditing(item.id);
    setShowModal(true);
  };

  const handleChange = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: undefined }));
  };

  const handleSubmit = async () => {
    const errs = validateItem(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const payload = {
      ...form,
      project_id: project.id,
      quantity: Number(form.quantity),
      rate: Number(form.rate),
      tax_value: Number(form.tax_value) || 0,
    };
    if (editing) {
      await api.boq.update({ id: editing, ...payload });
      toast('BOQ item updated');
    } else {
      await api.boq.create(payload);
      toast('BOQ item added');
    }
    setShowModal(false);
    load();
  };

  const handleDelete = async () => {
    await api.boq.delete(deleteTarget.id);
    toast('Item deleted', 'error');
    setDeleteTarget(null);
    load();
  };

  const filtered = items.filter(i => {
    const matchSection = activeSection === 'All' || i.section === activeSection;
    const matchSearch = !search ||
      i.description.toLowerCase().includes(search.toLowerCase()) ||
      (i.item_no || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.invoice_no || '').toLowerCase().includes(search.toLowerCase());
    return matchSection && matchSearch;
  });

  const grouped = filtered.reduce((acc, item) => {
    const key = item.section || 'General';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const grandTotal = items.reduce((s, i) => s + (i.total_amount ?? i.amount ?? 0), 0);
  const grandTaxTotal = items.reduce((s, i) => s + (i.tax_value || 0), 0);
  const filteredTotal = filtered.reduce((s, i) => s + (i.total_amount ?? i.amount ?? 0), 0);

  // Live preview
  const previewAmount = Number(form.quantity || 0) * Number(form.rate || 0);
  const previewTax = Number(form.tax_value || 0);
  const previewTotal = previewAmount + previewTax;

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <div className="page-title">📋 Bill of Quantities</div>
          <div className="page-subtitle">
            {project.name} · {items.length} items ·
            Tax: <strong style={{ color: 'var(--yellow)' }}>{formatCurrency(grandTaxTotal)}</strong> ·
            Grand Total: <strong style={{ color: 'var(--accent)' }}>{formatCurrency(grandTotal)}</strong>
          </div>
        </div>
        <div className="page-actions">
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={openCreate}>+ Add Item</button>
        </div>
      </div>

      <div className="page-content">
        {/* Section Tabs */}
        {sections.length > 0 && (
          <div className="tabs">
            <button className={`tab-btn ${activeSection === 'All' ? 'active' : ''}`} onClick={() => setActiveSection('All')}>
              All ({items.length})
            </button>
            {sections.map(s => (
              <button key={s} className={`tab-btn ${activeSection === s ? 'active' : ''}`} onClick={() => setActiveSection(s)}>
                {s} ({items.filter(i => i.section === s).length})
              </button>
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No BOQ items yet"
            desc="Add items with date, invoice, tax, grade and auto-calculated totals."
            action={<button className="btn btn-primary" onClick={openCreate}>+ Add First Item</button>}
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 55 }}>Item No.</th>
                  <th>Description</th>
                  <th style={{ width: 60 }}>Unit</th>
                  <th style={{ width: 70 }}>Grade</th>
                  <th style={{ width: 90, textAlign: 'right' }}>Qty</th>
                  <th style={{ width: 100, textAlign: 'right' }}>Rate (₹)</th>
                  <th style={{ width: 120, textAlign: 'right' }}>Amount (₹)</th>
                  <th style={{ width: 100, textAlign: 'right' }}>Tax (₹)</th>
                  <th style={{ width: 130, textAlign: 'right' }}>Total (₹)</th>
                  <th style={{ width: 100 }}>Date</th>
                  <th style={{ width: 110 }}>Invoice No.</th>
                  <th style={{ width: 70 }}></th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(grouped).map(([section, sectionItems]) => {
                  const sectionAmount = sectionItems.reduce((s, i) => s + (i.amount || 0), 0);
                  const sectionTax = sectionItems.reduce((s, i) => s + (i.tax_value || 0), 0);
                  const sectionTotal = sectionItems.reduce((s, i) => s + (i.total_amount ?? i.amount ?? 0), 0);
                  return (
                    <React.Fragment key={section}>
                      <tr className="section-row">
                        <td colSpan={6}>📁 {section}</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(sectionAmount)}</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(sectionTax)}</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(sectionTotal)}</td>
                        <td colSpan={3}></td>
                      </tr>
                      {sectionItems.map(item => {
                        const amount = item.amount || 0;
                        const tax = item.tax_value || 0;
                        const total = item.total_amount ?? (amount + tax);
                        return (
                          <tr key={item.id}>
                            <td className="muted mono" style={{ fontSize: 11 }}>{item.item_no || '—'}</td>
                            <td style={{ maxWidth: 200 }}>
                              <div>{item.description}</div>
                              {item.remarks && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.remarks}</div>}
                            </td>
                            <td className="muted">{item.unit}</td>
                            <td>
                              {item.grade
                                ? <span className="badge badge-planning" style={{ fontSize: 10 }}>{item.grade}</span>
                                : <span className="muted">—</span>}
                            </td>
                            <td className="mono" style={{ textAlign: 'right' }}>{formatNum(item.quantity, 3)}</td>
                            <td className="currency-cell">{formatNum(item.rate, 2)}</td>
                            <td className="currency-cell">{formatNum(amount, 2)}</td>
                            <td className="currency-cell" style={{ color: tax > 0 ? 'var(--yellow)' : 'var(--text-muted)' }}>
                              {formatNum(tax, 2)}
                            </td>
                            <td className="currency-cell" style={{ fontWeight: 700, color: 'var(--accent)' }}>
                              {formatNum(total, 2)}
                            </td>
                            <td className="muted mono" style={{ fontSize: 11 }}>{item.date || '—'}</td>
                            <td className="muted" style={{ fontSize: 11 }}>{item.invoice_no || '—'}</td>
                            <td>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(item)} data-tooltip="Edit">✏️</button>
                                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setDeleteTarget(item)} data-tooltip="Delete">🗑️</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="tfoot-row">
                  <td colSpan={6} style={{ textAlign: 'right' }}>
                    {activeSection !== 'All' ? `${activeSection} Total` : 'Grand Total'}
                  </td>
                  <td className="currency-cell amount-total">
                    {formatCurrency(filtered.reduce((s, i) => s + (i.amount || 0), 0))}
                  </td>
                  <td className="currency-cell" style={{ color: 'var(--yellow)', fontWeight: 700 }}>
                    {formatCurrency(filtered.reduce((s, i) => s + (i.tax_value || 0), 0))}
                  </td>
                  <td className="currency-cell amount-total">{formatCurrency(filteredTotal)}</td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? '✏️ Edit BOQ Item' : '+ Add BOQ Item'}
        size="modal-lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit}>{editing ? 'Save Changes' : 'Add Item'}</button>
          </>
        }
      >
        <div className="form-grid" style={{ gap: 14 }}>
          {/* Row 1 — Section & Item No */}
          <div className="form-grid form-grid-2">
            <Field label="Section / Division">
              <input
                className="form-input"
                list="sections-list"
                placeholder="e.g. Civil Works, Electrical"
                value={form.section}
                onChange={e => handleChange('section', e.target.value)}
              />
              <datalist id="sections-list">
                {sections.map(s => <option key={s} value={s} />)}
              </datalist>
            </Field>
            <Field label="Item No.">
              <input className="form-input" placeholder="e.g. 1.1, A-01" value={form.item_no} onChange={e => handleChange('item_no', e.target.value)} />
            </Field>
          </div>

          {/* Row 2 — Description */}
          <Field label="Description" required error={errors.description}>
            <textarea
              className={`form-textarea ${errors.description ? 'error' : ''}`}
              placeholder="Detailed description of work item…"
              value={form.description}
              onChange={e => handleChange('description', e.target.value)}
              style={{ minHeight: 52 }}
            />
          </Field>

          {/* Row 3 — Unit, Grade, Qty, Rate */}
          <div className="form-grid form-grid-3" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
            <Field label="Unit">
              <select className="form-select" value={form.unit} onChange={e => handleChange('unit', e.target.value)}>
                {UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </Field>
            <Field label="Grade / Spec">
              <input
                className="form-input"
                list="grades-list"
                placeholder="e.g. M20, Fe500"
                value={form.grade}
                onChange={e => handleChange('grade', e.target.value)}
              />
              <datalist id="grades-list">
                {GRADES.filter(Boolean).map(g => <option key={g} value={g} />)}
              </datalist>
            </Field>
            <Field label="Quantity" required error={errors.quantity}>
              <input
                className={`form-input ${errors.quantity ? 'error' : ''}`}
                type="number" min="0" step="0.001" placeholder="0.000"
                value={form.quantity}
                onChange={e => handleChange('quantity', e.target.value)}
              />
            </Field>
            <Field label="Rate (₹)" required error={errors.rate}>
              <input
                className={`form-input ${errors.rate ? 'error' : ''}`}
                type="number" min="0" step="0.01" placeholder="0.00"
                value={form.rate}
                onChange={e => handleChange('rate', e.target.value)}
              />
            </Field>
          </div>

          {/* Row 4 — Date, Invoice No, Tax Value */}
          <div className="form-grid form-grid-3">
            <Field label="Date">
              <input className="form-input" type="date" value={form.date} onChange={e => handleChange('date', e.target.value)} />
            </Field>
            <Field label="Invoice No.">
              <input className="form-input" placeholder="INV-001" value={form.invoice_no} onChange={e => handleChange('invoice_no', e.target.value)} />
            </Field>
            <Field label="Tax Value (₹)" error={errors.tax_value} hint="GST / VAT amount">
              <input
                className={`form-input ${errors.tax_value ? 'error' : ''}`}
                type="number" min="0" step="0.01" placeholder="0.00"
                value={form.tax_value}
                onChange={e => handleChange('tax_value', e.target.value)}
              />
            </Field>
          </div>

          {/* Live Preview */}
          {(form.quantity || form.rate) && (
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4 }}>Amount (Qty × Rate)</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(previewAmount)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4 }}>Tax Value</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 600, color: 'var(--yellow)' }}>{formatCurrency(previewTax)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4 }}>Total Amount</div>
                  <div className="amount-total" style={{ fontSize: 15 }}>{formatCurrency(previewTotal)}</div>
                </div>
              </div>
            </div>
          )}

          <Field label="Remarks">
            <input className="form-input" placeholder="Optional notes…" value={form.remarks} onChange={e => handleChange('remarks', e.target.value)} />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete BOQ Item?"
        message={`"${deleteTarget?.description}" will be permanently removed.`}
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
