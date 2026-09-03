import React, { createContext, useContext, useState, useCallback } from 'react';

// ─── Toast Context ─────────────────────────────────────────────────────────────
const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  const icons = { success: '✓', error: '✕', warning: '⚠' };

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span className="toast-icon">{icons[t.type]}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

// ─── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = '', footer }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size}`}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ─── Confirm Dialog ────────────────────────────────────────────────────────────
export function ConfirmDialog({ open, onConfirm, onCancel, title, message, danger }) {
  return (
    <Modal open={open} onClose={onCancel} title="" size="confirm-dialog">
      <div className="confirm-icon">{danger ? '🗑️' : '❓'}</div>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: 'var(--text-primary)' }}>{title}</div>
      <div className="confirm-msg">{message}</div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 20 }}>
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
          {danger ? '🗑 Delete' : 'Confirm'}
        </button>
      </div>
    </Modal>
  );
}

// ─── Form Field ────────────────────────────────────────────────────────────────
export function Field({ label, required, error, hint, children }) {
  return (
    <div className="form-field">
      {label && (
        <label className="form-label">
          {label}{required && <span className="required">*</span>}
        </label>
      )}
      {children}
      {error && <span className="form-error">{error}</span>}
      {hint && !error && <span className="form-hint">{hint}</span>}
    </div>
  );
}

// ─── Currency Formatting ───────────────────────────────────────────────────────
export function formatCurrency(val) {
  const n = Number(val) || 0;
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatNum(val, dec = 2) {
  return (Number(val) || 0).toFixed(dec);
}

// ─── Status Badge ──────────────────────────────────────────────────────────────
const statusMap = {
  Planning: 'badge-planning',
  Active: 'badge-active',
  'On Hold': 'badge-hold',
  Completed: 'badge-completed',
};
export function StatusBadge({ status }) {
  return <span className={`badge ${statusMap[status] || 'badge-planning'}`}>● {status}</span>;
}

// ─── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, desc, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon || '📋'}</div>
      <div className="empty-title">{title}</div>
      {desc && <div className="empty-desc">{desc}</div>}
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  );
}

// ─── Progress Bar ──────────────────────────────────────────────────────────────
export function ProgressBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const barColor = pct > 90 ? 'var(--red)' : pct > 70 ? 'var(--yellow)' : color || 'var(--accent)';
  return (
    <div className="progress-bar-wrap">
      <div className="progress-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
    </div>
  );
}

// ─── Loading Spinner ───────────────────────────────────────────────────────────
export function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
      <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTop: '3px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── KPI Card ──────────────────────────────────────────────────────────────────
export function KpiCard({ label, value, icon, color, sub }) {
  return (
    <div className="kpi-card" style={{ '--kpi-color': color || 'var(--accent)' }}>
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value ${typeof value === 'string' && value.startsWith('₹') ? 'currency' : ''}`}>{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}
