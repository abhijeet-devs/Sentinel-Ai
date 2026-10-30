import React, { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { dashboardApi } from '../api/client';

const ATTACK_COLORS = {
  'Prompt Injection': '#00d4ff',
  'Jailbreak': '#a855f7',
  'PII Extraction': '#f59e0b',
  'Role-Play Bypass': '#ef4444',
  'Data Exfiltration': '#ec4899',
  'Adversarial Suffix': '#10b981',
  'Unknown': '#8b949e',
};

const getSeverityClass = (score) => {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'moderate';
  if (score >= 20) return 'low';
  return 'minimal';
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: 6 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color, fontSize: '0.85rem', fontWeight: 600 }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboard = () => {
    setLoading(true);
    setError(null);
    dashboardApi.get()
      .then((res) => setData(res.data))
      .catch((err) => {
        console.error('Failed to load dashboard:', err);
        setError(err.response?.data?.detail || err.message || 'Unable to connect to backend service.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner spinner-lg" />
        <span>Loading threat intelligence...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: 24 }}>
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          <strong>Error loading dashboard:</strong> {error || 'No data returned from backend API.'}
        </div>
        <button className="btn btn-primary" onClick={loadDashboard}>
          🔄 Retry Connection
        </button>
      </div>
    );
  }

  const { stats, attack_distribution, timeline, recent_threats } = data;

  const threatRate = stats.threat_rate;
  const circumference = 2 * Math.PI * 42;
  const dashOffset = circumference * (1 - threatRate / 100);

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1>Threat Dashboard</h1>
            <p>Real-time security analytics and threat intelligence overview</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="pulse-dot green" />
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-green)' }}>Live</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card stat-cyan">
          <div className="stat-card-icon" style={{ background: 'var(--accent-cyan-dim)' }}>🔍</div>
          <div className="stat-card-value" style={{ color: 'var(--accent-cyan)' }}>{stats.total_scans.toLocaleString()}</div>
          <div className="stat-card-label">Total Scans</div>
          <div className="stat-card-change" style={{ color: 'var(--text-muted)' }}>
            {stats.scans_today} today
          </div>
        </div>

        <div className="stat-card stat-red">
          <div className="stat-card-icon" style={{ background: 'var(--accent-red-dim)' }}>⚠️</div>
          <div className="stat-card-value" style={{ color: 'var(--accent-red)' }}>{stats.malicious_count.toLocaleString()}</div>
          <div className="stat-card-label">Threats Detected</div>
          <div className="stat-card-change" style={{ color: 'var(--accent-red)' }}>
            {stats.threat_rate}% threat rate
          </div>
        </div>

        <div className="stat-card stat-green">
          <div className="stat-card-icon" style={{ background: 'var(--accent-green-dim)' }}>✅</div>
          <div className="stat-card-value" style={{ color: 'var(--accent-green)' }}>{stats.safe_count.toLocaleString()}</div>
          <div className="stat-card-label">Safe Prompts</div>
          <div className="stat-card-change" style={{ color: 'var(--accent-green)' }}>
            {stats.total_scans > 0 ? (100 - stats.threat_rate).toFixed(1) : 0}% clean rate
          </div>
        </div>

        <div className="stat-card stat-orange">
          <div className="stat-card-icon" style={{ background: 'var(--accent-orange-dim)' }}>📊</div>
          <div className="stat-card-value" style={{ color: 'var(--accent-orange)' }}>{stats.avg_severity.toFixed(0)}</div>
          <div className="stat-card-label">Avg Severity Score</div>
          <div className="stat-card-change" style={{ color: 'var(--text-muted)' }}>
            out of 100
          </div>
        </div>

        <div className="stat-card stat-purple">
          <div className="stat-card-icon" style={{ background: 'var(--accent-purple-dim)' }}>📅</div>
          <div className="stat-card-value" style={{ color: 'var(--accent-purple)' }}>{stats.scans_today}</div>
          <div className="stat-card-label">Scans Today</div>
          <div className="stat-card-change" style={{ color: 'var(--text-muted)' }}>
            last 24 hours
          </div>
        </div>

        {/* Threat rate ring */}
        <div className="stat-card stat-red" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="score-ring">
            <svg width="90" height="90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="42"
                fill="none"
                stroke={threatRate > 50 ? '#ef4444' : threatRate > 20 ? '#f59e0b' : '#10b981'}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s ease' }}
              />
            </svg>
            <div className="score-ring-value" style={{ color: threatRate > 50 ? 'var(--accent-red)' : threatRate > 20 ? 'var(--accent-orange)' : 'var(--accent-green)', fontSize: '1.1rem' }}>
              {threatRate.toFixed(0)}%
            </div>
          </div>
          <div>
            <div className="stat-card-value" style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>Threat Rate</div>
            <div className="stat-card-label">malicious / total</div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="dashboard-grid">
        {/* Timeline */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">📈 Attack Timeline (Last 7 Days)</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={timeline} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradMal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="total" name="Total Scans" stroke="#00d4ff" fill="url(#gradTotal)" strokeWidth={2} />
              <Area type="monotone" dataKey="malicious" name="Threats" stroke="#ef4444" fill="url(#gradMal)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">🎯 Attack Distribution</span>
          </div>
          {attack_distribution.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <div className="empty-state-title">No threats detected yet</div>
              <div className="empty-state-desc">Run some analysis to see threat distribution</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={attack_distribution}
                  dataKey="count"
                  nameKey="attack_type"
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={80}
                  paddingAngle={3}
                >
                  {attack_distribution.map((entry) => (
                    <Cell key={entry.attack_type} fill={ATTACK_COLORS[entry.attack_type] || '#8b949e'} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v, n) => [v, n]}
                  contentStyle={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: '0.8rem' }}
                />
                <Legend
                  iconSize={8}
                  formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Threats */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">🚨 Recent Threats</span>
          {recent_threats.length > 0 && (
            <span className="badge badge-malicious">{recent_threats.length} detected</span>
          )}
        </div>
        {recent_threats.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🛡️</div>
            <div className="empty-state-title">No threats detected</div>
            <div className="empty-state-desc">All clear! Start analyzing prompts to populate this view.</div>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Prompt Preview</th>
                  <th>Attack Type</th>
                  <th>Severity</th>
                  <th>Confidence</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {recent_threats.map((t) => {
                  const sev = getSeverityClass(t.severity_score);
                  return (
                    <tr key={t.id}>
                      <td className="td-primary td-mono truncate" style={{ maxWidth: 300 }}>
                        {t.prompt_text.substring(0, 80)}{t.prompt_text.length > 80 ? '...' : ''}
                      </td>
                      <td>
                        <span className="badge badge-purple">{t.attack_type || 'Unknown'}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className={`badge badge-${sev}`}>{sev.toUpperCase()}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {t.severity_score.toFixed(0)}
                          </span>
                        </div>
                      </td>
                      <td className="td-mono" style={{ color: 'var(--accent-cyan)' }}>
                        {(t.confidence * 100).toFixed(1)}%
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {new Date(t.created_at).toLocaleTimeString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
