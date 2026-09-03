import React, { useState } from 'react';
import { ToastProvider } from './components/ui';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import BOQ from './pages/BOQ';
import Budget from './pages/Budget';
import Materials from './pages/Materials';
import Labour from './pages/Labour';
import './index.css';

// ─── Titlebar ─────────────────────────────────────────────────────────────────
function Titlebar() {
  const isElectron = !!window.kaytech;
  if (!isElectron) return null;
  return (
    <div className="titlebar">
      <div className="titlebar-brand">
        <div className="titlebar-logo">K</div>
        <span className="titlebar-title">KAYTECH CONSTRUCTION SOFTWARE</span>
      </div>
      <div className="titlebar-controls">
        <button className="titlebar-btn" onClick={() => window.kaytech.minimize()} title="Minimize">─</button>
        <button className="titlebar-btn" onClick={() => window.kaytech.maximize()} title="Maximize">□</button>
        <button className="titlebar-btn close" onClick={() => window.kaytech.close()} title="Close">✕</button>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', section: 'Overview' },
  { id: 'projects', label: 'Projects', icon: '🏗️', section: 'Manage' },
  { id: 'boq', label: 'Bill of Quantities', icon: '📋', section: 'Manage', requiresProject: true },
  { id: 'budget', label: 'Budget & Costs', icon: '💰', section: 'Manage', requiresProject: true },
  { id: 'materials', label: 'Materials', icon: '📦', section: 'Manage', requiresProject: true },
  { id: 'labour', label: 'Labour Log', icon: '👷', section: 'Manage', requiresProject: true },
];

function Sidebar({ active, onNav, activeProject }) {
  const sections = [...new Set(NAV.map(n => n.section))];
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo-box">
          <div className="sidebar-logo">KT</div>
          <div>
            <div className="sidebar-company">Kaytech</div>
            <div className="sidebar-tagline">Construction Software</div>
          </div>
        </div>
      </div>

      {sections.map(section => (
        <div className="sidebar-section" key={section}>
          <div className="sidebar-section-label">{section}</div>
          {NAV.filter(n => n.section === section).map(item => {
            const disabled = item.requiresProject && !activeProject;
            return (
              <div
                key={item.id}
                className={`nav-item ${active === item.id ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
                onClick={() => !disabled && onNav(item.id)}
                title={disabled ? 'Select a project first' : ''}
                style={{ opacity: disabled ? 0.4 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </div>
            );
          })}
        </div>
      ))}

      {activeProject && (
        <div style={{ margin: '8px 8px', padding: '10px 12px', background: 'var(--accent-light)', border: '1px solid var(--border-accent)', borderRadius: 'var(--radius-md)', fontSize: 12 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Project</div>
          <div style={{ color: 'var(--accent)', fontWeight: 600, lineHeight: 1.3 }}>{activeProject.name}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 2 }}>{activeProject.client}</div>
        </div>
      )}

      <div className="sidebar-footer">
        <div className="sidebar-version">Kaytech v1.0.0 · Built with ♥</div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState('dashboard');
  const [activeProject, setActiveProject] = useState(null);

  const handleProjectSelect = (project) => {
    setActiveProject(project);
    setPage('boq'); // Jump to BOQ after selecting project
  };

  const handleNav = (id) => {
    if (id === 'projects') setActiveProject(null);
    setPage(id);
  };

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard />;
      case 'projects': return <Projects onSelect={handleProjectSelect} />;
      case 'boq': return activeProject ? <BOQ project={activeProject} /> : null;
      case 'budget': return activeProject ? <Budget project={activeProject} /> : null;
      case 'materials': return activeProject ? <Materials project={activeProject} /> : null;
      case 'labour': return activeProject ? <Labour project={activeProject} /> : null;
      default: return <Dashboard />;
    }
  };

  return (
    <ToastProvider>
      <div className="app-shell">
        <Titlebar />
        <div className="app-body">
          <Sidebar active={page} onNav={handleNav} activeProject={activeProject} />
          <div className="main-panel">
            {renderPage()}
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}
