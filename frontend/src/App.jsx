import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AnalyzerPage from './pages/AnalyzerPage';
import HistoryPage from './pages/HistoryPage';
import RulesPage from './pages/RulesPage';
import ProfilePage from './pages/ProfilePage';
import GatewayPage from './pages/GatewayPage';
import RedTeamPage from './pages/RedTeamPage';
import BenchmarkPage from './pages/BenchmarkPage';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: '📊', exact: true },
  { to: '/analyze', label: 'Analyzer', icon: '🔍' },
  { to: '/gateway', label: 'LLM Gateway', icon: '🔗' },
  { to: '/redteam', label: 'Red Team', icon: '⚔️' },
  { to: '/history', label: 'History', icon: '📂' },
  { to: '/rules', label: 'Security Rules', icon: '🛡️' },
  { to: '/benchmark', label: 'Benchmarks', icon: '📈' },
];

function Sidebar() {
  const { user, logout } = useAuthStore();

  return (
    <nav className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🛡️</div>
        <div>
          <div className="sidebar-logo-text">SentinelAI</div>
          <div className="sidebar-logo-sub">Prompt Defence Framework</div>
        </div>
      </div>

      {/* Nav */}
      <div className="nav-section">
        <div className="nav-section-label">Navigation</div>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            id={`nav-${item.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span style={{ fontSize: 16 }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </div>

      <div className="nav-section" style={{ marginTop: 8 }}>
        <div className="nav-section-label">Account</div>
        <NavLink
          to="/profile"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          id="nav-profile"
        >
          <span style={{ fontSize: 16 }}>👤</span>
          Profile & API Key
        </NavLink>
      </div>

      {/* Status */}
      <div className="nav-section" style={{ marginTop: 8 }}>
        <div className="nav-section-label">System Status</div>
        <div style={{ padding: '8px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ML Engine</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="pulse-dot green" />
              <span style={{ fontSize: '0.7rem', color: 'var(--accent-green)' }}>Active</span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rule Engine</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="pulse-dot green" />
              <span style={{ fontSize: '0.7rem', color: 'var(--accent-green)' }}>Active</span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>LLM Gateway</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="pulse-dot green" />
              <span style={{ fontSize: '0.7rem', color: 'var(--accent-green)' }}>Ready</span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>API</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="pulse-dot green" />
              <span style={{ fontSize: '0.7rem', color: 'var(--accent-green)' }}>Healthy</span>
            </div>
          </div>
        </div>
      </div>

      {/* User card */}
      <div className="sidebar-bottom">
        <div className="user-card">
          <div className="user-avatar">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div className="user-info">
            <div className="user-name">{user?.username}</div>
            <div className="user-role">{user?.is_admin ? 'Administrator' : 'Analyst'}</div>
          </div>
        </div>
      </div>
    </nav>
  );
}

function ProtectedLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/analyze" element={<AnalyzerPage />} />
          <Route path="/gateway" element={<GatewayPage />} />
          <Route path="/redteam" element={<RedTeamPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/rules" element={<RulesPage />} />
          <Route path="/benchmark" element={<BenchmarkPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a1f2e',
            color: '#f0f6fc',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            fontSize: '0.875rem',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
        />
        <Route path="/*" element={<ProtectedLayout />} />
      </Routes>
    </BrowserRouter>
  );
}
