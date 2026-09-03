import React, { useState, useEffect } from 'react';
import { KpiCard, formatCurrency, EmptyState } from '../components/ui';
import api from '../api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.dashboard.getStats().then(setStats);
  }, []);

  if (!stats) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div style={{ color: 'var(--text-muted)' }}>Loading dashboard…</div>
    </div>
  );

  const { totalProjects, activeProjects, totalContractValue, totalSpent, projectsByStatus, recentProjects, budgetByCategory } = stats;
  const variance = totalContractValue - totalSpent;

  const statusColors = { Planning: '#bc8cff', Active: '#3fb950', 'On Hold': '#d29922', Completed: '#58a6ff' };

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <div className="page-title">📊 Dashboard</div>
          <div className="page-subtitle">Overview · {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </div>

      <div className="page-content">
        {/* KPIs */}
        <div className="kpi-grid">
          <KpiCard label="Total Projects" value={totalProjects} icon="🏗️" color="var(--accent)" sub={`${activeProjects} active`} />
          <KpiCard label="Total Contract Value" value={formatCurrency(totalContractValue)} icon="📄" color="var(--blue)" />
          <KpiCard label="Total Spent" value={formatCurrency(totalSpent)} icon="💸" color="var(--yellow)" sub={totalContractValue > 0 ? `${((totalSpent / totalContractValue) * 100).toFixed(1)}% of contracts` : ''} />
          <KpiCard label="Net Variance" value={formatCurrency(Math.abs(variance))} icon={variance >= 0 ? '✅' : '⚠️'} color={variance >= 0 ? 'var(--green)' : 'var(--red)'} sub={variance >= 0 ? 'Under budget' : 'Over budget'} />
        </div>

        <div className="dashboard-grid">
          {/* Project Status Distribution */}
          <div className="card">
            <div className="card-header"><div className="card-title">🗂️ Projects by Status</div></div>
            <div className="card-body">
              {projectsByStatus.length === 0 ? (
                <EmptyState icon="🗂️" title="No projects yet" desc="Create your first project to see stats here." />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {projectsByStatus.map(({ status, count }) => {
                    const pct = totalProjects > 0 ? ((count / totalProjects) * 100).toFixed(0) : 0;
                    return (
                      <div key={status}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{status}</span>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{count} project{count !== 1 ? 's' : ''} · {pct}%</span>
                        </div>
                        <div className="progress-bar-wrap">
                          <div className="progress-bar-fill" style={{ width: `${pct}%`, background: statusColors[status] || 'var(--accent)' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Budget by Category */}
          <div className="card">
            <div className="card-header"><div className="card-title">💰 Cost by Category</div></div>
            <div className="card-body">
              {budgetByCategory.length === 0 ? (
                <EmptyState icon="💰" title="No budget data yet" desc="Add budget entries to see cost breakdown." />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {budgetByCategory.map(({ category, budgeted, actual }) => {
                    const pct = budgeted > 0 ? Math.min(100, (actual / budgeted) * 100) : 0;
                    const overBudget = actual > budgeted;
                    return (
                      <div key={category}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span style={{ fontSize: 12, fontWeight: 500 }}>{category}</span>
                          <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
                            <span style={{ color: 'var(--text-muted)' }}>Budget: {formatCurrency(budgeted)}</span>
                            <span style={{ color: overBudget ? 'var(--red)' : 'var(--green)', fontWeight: 600 }}>Actual: {formatCurrency(actual)}</span>
                          </div>
                        </div>
                        <div className="progress-bar-wrap">
                          <div className="progress-bar-fill" style={{ width: `${pct}%`, background: overBudget ? 'var(--red)' : 'var(--accent)' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Recent Projects */}
          <div className="card full">
            <div className="card-header"><div className="card-title">🕐 Recent Projects</div></div>
            <div className="card-body" style={{ padding: 0 }}>
              {recentProjects.length === 0 ? (
                <EmptyState icon="🏗️" title="No projects yet" desc="Create your first project to get started." />
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Project', 'Client', 'Status', 'Contract Value', 'Created'].map(h => (
                        <th key={h} style={{ background: 'var(--bg-elevated)', padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentProjects.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 16px', fontWeight: 600 }}>{p.name}</td>
                        <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', fontSize: 13 }}>{p.client || '—'}</td>
                        <td style={{ padding: '10px 16px' }}>
                          <span className={`badge badge-${p.status.toLowerCase().replace(' ', '-') === 'on-hold' ? 'hold' : p.status.toLowerCase()}`}>● {p.status}</span>
                        </td>
                        <td style={{ padding: '10px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{p.contract_value > 0 ? formatCurrency(p.contract_value) : '—'}</td>
                        <td style={{ padding: '10px 16px', color: 'var(--text-muted)', fontSize: 12 }}>{new Date(p.created_at).toLocaleDateString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
