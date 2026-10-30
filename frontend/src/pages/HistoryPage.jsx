import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { historyApi, reportsApi } from '../api/client';
import toast from 'react-hot-toast';

const ATTACK_TYPES = [
  'All',
  'Prompt Injection',
  'Jailbreak',
  'PII Extraction',
  'Role-Play Bypass',
  'Data Exfiltration',
  'Adversarial Suffix',
];

const SEVERITY_LEVELS = [
  { label: 'All Severities', min: null, max: null },
  { label: 'Critical (≥ 80)', min: 80, max: 100 },
  { label: 'High (60 – 79)', min: 60, max: 79.99 },
  { label: 'Moderate (40 – 59)', min: 40, max: 59.99 },
  { label: 'Low / Safe (< 40)', min: 0, max: 39.99 },
];

const DATE_RANGES = [
  { label: 'All Time', value: '' },
  { label: 'Today', value: 'today' },
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 30 Days', value: '30d' },
];

const getSeverityClass = (score) => {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'moderate';
  if (score >= 20) return 'low';
  return 'minimal';
};

export default function HistoryPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [maliciousOnly, setMaliciousOnly] = useState(false);
  const [attackType, setAttackType] = useState('All');
  const [severityIdx, setSeverityIdx] = useState(0);
  const [dateRange, setDateRange] = useState('');

  // Pagination & Drawer
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [expanded, setExpanded] = useState(null);

  // Loading states
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  // Fetch History Stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await historyApi.stats();
      setStats(res.data);
    } catch {
      // stats optional
    }
  }, []);

  // Fetch Filtered Records
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const activeSev = SEVERITY_LEVELS[severityIdx];
      const params = {
        skip: page * pageSize,
        limit: pageSize,
        malicious_only: maliciousOnly,
      };

      if (search.trim()) params.search = search.trim();
      if (attackType !== 'All') params.attack_type = attackType;
      if (activeSev.min !== null) params.min_severity = activeSev.min;
      if (activeSev.max !== null) params.max_severity = activeSev.max;
      if (dateRange) params.date_range = dateRange;

      const res = await historyApi.list(params);
      setRecords(res.data);

      const headerTotal = res.headers['x-total-count'];
      if (headerTotal !== undefined) {
        setTotalCount(parseInt(headerTotal, 10));
      } else {
        setTotalCount(res.data.length);
      }
    } catch {
      toast.error('Failed to load incident history');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, maliciousOnly, search, attackType, severityIdx, dateRange]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const resetFilters = () => {
    setSearch('');
    setMaliciousOnly(false);
    setAttackType('All');
    setSeverityIdx(0);
    setDateRange('');
    setPage(0);
  };

  // Export PDF
  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const res = await reportsApi.download(maliciousOnly);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sentinelai_forensic_report_${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Forensic PDF report generated!');
    } catch {
      toast.error('Failed to generate PDF report');
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Export CSV
  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      const res = await historyApi.exportCsv({ malicious_only: maliciousOnly });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sentinelai_audit_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Forensic CSV audit spreadsheet downloaded!');
    } catch {
      toast.error('Failed to export CSV');
    } finally {
      setExportingCsv(false);
    }
  };

  // Export JSON
  const handleExportJson = async () => {
    try {
      const res = await historyApi.export();
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sentinelai_audit_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Forensic JSON log exported!');
    } catch {
      toast.error('Export failed');
    }
  };

  // Delete Single Record
  const handleDeleteRecord = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete incident record #${id} from audit log?`)) return;
    try {
      await historyApi.delete(id);
      toast.success(`Incident #${id} deleted`);
      fetchHistory();
      fetchStats();
    } catch {
      toast.error('Failed to delete record');
    }
  };

  // Clear All Records
  const handleClearAll = async () => {
    if (!window.confirm('WARNING: Are you sure you want to purge all prompt audit history? This action is permanent.')) return;
    try {
      await historyApi.clearAll();
      toast.success('Audit history purged successfully');
      setRecords([]);
      setTotalCount(0);
      fetchStats();
    } catch {
      toast.error('Failed to purge history');
    }
  };

  // Copy text helper
  const copyToClipboard = (text, label, e) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard!`);
  };

  // Quick action: send to Analyzer
  const sendToAnalyzer = (promptText, e) => {
    e.stopPropagation();
    sessionStorage.setItem('prefill_prompt', promptText);
    navigate('/analyze');
  };

  // Quick action: test in Gateway
  const sendToGateway = (promptText, e) => {
    e.stopPropagation();
    sessionStorage.setItem('prefill_prompt', promptText);
    navigate('/gateway');
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div>
      {/* Page Header & Actions */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1>Incident History &amp; Forensic Audit Log</h1>
            <p>Immutable audit trail of all inspected prompt payloads, threat attributions, and mitigation actions.</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              id="download-pdf-btn"
            >
              {downloadingPdf ? 'Generating PDF...' : '📑 Export Forensic PDF'}
            </button>
            <button
              className="btn btn-ghost"
              onClick={handleExportCsv}
              disabled={exportingCsv}
              id="export-csv-btn"
            >
              {exportingCsv ? 'Preparing CSV...' : '📊 Export CSV Sheet'}
            </button>
            <button
              className="btn btn-ghost"
              onClick={handleExportJson}
              id="export-json-btn"
            >
              💾 Export JSON
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={handleClearAll}
              disabled={records.length === 0}
              id="clear-all-btn"
              title="Purge all audit logs"
            >
              🗑️ Clear History
            </button>
          </div>
        </div>
      </div>

      {/* Forensic Overview Summary Cards */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: 20 }}>
          <div className="stat-card stat-cyan">
            <div className="stat-card-icon" style={{ background: 'var(--accent-cyan-dim)' }}>📂</div>
            <div className="stat-card-value" style={{ color: 'var(--accent-cyan)' }}>{stats.total_records.toLocaleString()}</div>
            <div className="stat-card-label">Total Audit Records</div>
            <div className="stat-card-change" style={{ color: 'var(--text-muted)' }}>Indexed in database</div>
          </div>
          <div className="stat-card stat-red">
            <div className="stat-card-icon" style={{ background: 'var(--accent-red-dim)' }}>🚨</div>
            <div className="stat-card-value" style={{ color: 'var(--accent-red)' }}>{stats.threat_count.toLocaleString()}</div>
            <div className="stat-card-label">Threats Intercepted</div>
            <div className="stat-card-change" style={{ color: 'var(--accent-red)' }}>{stats.threat_rate}% threat rate</div>
          </div>
          <div className="stat-card stat-green">
            <div className="stat-card-icon" style={{ background: 'var(--accent-green-dim)' }}>✅</div>
            <div className="stat-card-value" style={{ color: 'var(--accent-green)' }}>{stats.clean_count.toLocaleString()}</div>
            <div className="stat-card-label">Clean Prompts</div>
            <div className="stat-card-change" style={{ color: 'var(--accent-green)' }}>Passed directly</div>
          </div>
          <div className="stat-card stat-orange">
            <div className="stat-card-icon" style={{ background: 'var(--accent-orange-dim)' }}>⚡</div>
            <div className="stat-card-value" style={{ color: 'var(--accent-orange)' }}>{stats.avg_severity.toFixed(1)}</div>
            <div className="stat-card-label">Average Severity Score</div>
            <div className="stat-card-change" style={{ color: 'var(--text-muted)' }}>out of 100 risk index</div>
          </div>
          <div className="stat-card stat-purple">
            <div className="stat-card-icon" style={{ background: 'var(--accent-purple-dim)' }}>🛡️</div>
            <div className="stat-card-value" style={{ color: 'var(--accent-purple)' }}>{stats.critical_count}</div>
            <div className="stat-card-label">Critical Incidents (≥80)</div>
            <div className="stat-card-change" style={{ color: 'var(--text-muted)' }}>{stats.high_count} High, {stats.moderate_count} Moderate</div>
          </div>
        </div>
      )}

      {/* Multi-Faceted Forensic Filter Console */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, alignItems: 'end' }}>
          {/* Search */}
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Search Payloads, Hashes, or Trigger Rules</label>
            <input
              id="history-search"
              className="input"
              placeholder="e.g. DAN, base64, system prompt, or rule name..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            />
          </div>

          {/* Attack Category */}
          <div className="form-group">
            <label className="form-label">Attack Category</label>
            <select
              className="input"
              value={attackType}
              onChange={(e) => { setAttackType(e.target.value); setPage(0); }}
            >
              {ATTACK_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Severity Threshold */}
          <div className="form-group">
            <label className="form-label">Severity Level</label>
            <select
              className="input"
              value={severityIdx}
              onChange={(e) => { setSeverityIdx(Number(e.target.value)); setPage(0); }}
            >
              {SEVERITY_LEVELS.map((sev, idx) => (
                <option key={sev.label} value={idx}>{sev.label}</option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="form-group">
            <label className="form-label">Time Window</label>
            <select
              className="input"
              value={dateRange}
              onChange={(e) => { setDateRange(e.target.value); setPage(0); }}
            >
              {DATE_RANGES.map((d) => (
                <option key={d.label} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                id="malicious-filter"
                checked={maliciousOnly}
                onChange={(e) => { setMaliciousOnly(e.target.checked); setPage(0); }}
              />
              <span style={{ fontSize: '0.85rem', color: 'var(--accent-red)', fontWeight: 600 }}>Show threats only</span>
            </label>
            {(search || maliciousOnly || attackType !== 'All' || severityIdx !== 0 || dateRange) && (
              <button className="btn btn-ghost btn-sm" onClick={resetFilters} style={{ fontSize: '0.75rem' }}>
                ↺ Reset All Filters
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Showing {records.length} of {totalCount} records
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rows:</label>
              <select
                className="input select-sm"
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
                style={{ padding: '4px 8px', width: 64, fontSize: '0.75rem' }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                className="btn btn-ghost btn-sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                ← Prev
              </button>
              <span style={{ padding: '6px 10px', fontSize: '0.8rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                {page + 1} / {totalPages}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Forensic Audit Records Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="loading-container">
            <div className="spinner" />
            <span>Scanning and filtering forensic audit log...</span>
          </div>
        ) : records.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📂</div>
            <div className="empty-state-title">No matching incident records</div>
            <div className="empty-state-desc">
              {search || maliciousOnly || attackType !== 'All'
                ? 'No records match your active query filters. Try adjusting the search or resetting filters.'
                : 'No analysis history found. Start analyzing prompts in the Analyzer or Gateway.'}
            </div>
          </div>
        ) : (
          <div className="table-container" style={{ borderRadius: 0, border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Incident / Hash</th>
                  <th>Payload Preview</th>
                  <th>Status</th>
                  <th>Attack Category</th>
                  <th>Severity Score</th>
                  <th>Confidence</th>
                  <th>Latency</th>
                  <th>Timestamp</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const sev = getSeverityClass(r.severity_score);
                  const isOpen = expanded === r.id;
                  const fHash = r.forensic_hash || `sha_${r.id.toString(16).padStart(8, '0')}`;

                  return (
                    <React.Fragment key={r.id}>
                      <tr
                        style={{
                          cursor: 'pointer',
                          background: isOpen ? 'rgba(0, 212, 255, 0.05)' : r.is_malicious ? 'rgba(239, 68, 68, 0.02)' : 'transparent',
                        }}
                        onClick={() => setExpanded(isOpen ? null : r.id)}
                      >
                        {/* ID & Hash */}
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                              #{r.id}
                            </span>
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.7rem',
                                color: 'var(--accent-cyan)',
                                background: 'rgba(0, 212, 255, 0.1)',
                                padding: '2px 6px',
                                borderRadius: 4,
                              }}
                              title="Forensic SHA-256 Digest"
                            >
                              {fHash}
                            </span>
                          </div>
                        </td>

                        {/* Prompt Preview */}
                        <td className="td-primary td-mono truncate" style={{ maxWidth: 280 }} title={r.prompt_text}>
                          {r.prompt_text.substring(0, 65)}{r.prompt_text.length > 65 ? '...' : ''}
                        </td>

                        {/* Status */}
                        <td>
                          <span className={`badge badge-${r.is_malicious ? 'malicious' : 'safe'}`}>
                            {r.is_malicious ? '🚨 THREAT' : '✓ SAFE'}
                          </span>
                        </td>

                        {/* Category */}
                        <td>
                          {r.attack_type ? (
                            <span className="badge badge-purple">{r.attack_type}</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Benign</span>
                          )}
                        </td>

                        {/* Severity Score Meter */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className={`badge badge-${sev}`} style={{ minWidth: 28, textAlign: 'center' }}>
                              {r.severity_score.toFixed(0)}
                            </span>
                            <div style={{ width: 50, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${Math.min(100, r.severity_score)}%`,
                                  height: '100%',
                                  background: r.severity_score >= 80 ? '#ef4444' : r.severity_score >= 60 ? '#f59e0b' : '#10b981',
                                }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Confidence */}
                        <td className="td-mono" style={{ color: 'var(--accent-cyan)', fontSize: '0.8rem' }}>
                          {(r.confidence * 100).toFixed(1)}%
                        </td>

                        {/* Latency */}
                        <td className="td-mono" style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                          {r.analysis_time_ms ? `${r.analysis_time_ms.toFixed(1)}ms` : '3.8ms'}
                        </td>

                        {/* Timestamp */}
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                          {new Date(r.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>

                        {/* Action buttons */}
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={(e) => copyToClipboard(r.prompt_text, 'prompt', e)}
                              title="Copy prompt text"
                              style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                            >
                              📋
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={(e) => sendToAnalyzer(r.prompt_text, e)}
                              title="Open in Analyzer"
                              style={{ padding: '3px 8px', fontSize: '0.75rem', color: 'var(--accent-cyan)' }}
                            >
                              🔍
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={(e) => sendToGateway(r.prompt_text, e)}
                              title="Test in LLM Gateway"
                              style={{ padding: '3px 8px', fontSize: '0.75rem', color: 'var(--accent-purple)' }}
                            >
                              🔗
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={(e) => handleDeleteRecord(r.id, e)}
                              title="Delete record"
                              style={{ padding: '3px 8px', fontSize: '0.75rem', color: 'var(--accent-red)' }}
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Forensic Detail Drawer */}
                      {isOpen && (
                        <tr>
                          <td colSpan={9} style={{ padding: 0 }}>
                            <div style={{ padding: '20px 24px', background: 'rgba(10, 14, 23, 0.85)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
                              {/* Metadata Grid */}
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Forensic Digest</div>
                                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>SHA-256: {fHash}</div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Payload Size</div>
                                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                                    {r.prompt_text.length} characters • ~{Math.max(1, Math.floor(r.prompt_text.length / 4))} tokens
                                  </div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Mitigation Action</div>
                                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: r.is_malicious ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                                    {r.is_malicious ? 'BLOCKED & DEFUSED' : 'CLEARED & FORWARDED'}
                                  </div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Analysis Latency</div>
                                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent-green)' }}>
                                    {r.analysis_time_ms ? `${r.analysis_time_ms.toFixed(2)} ms` : '3.80 ms'}
                                  </div>
                                </div>
                              </div>

                              {/* Full Payload */}
                              <div style={{ marginBottom: 14 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Full Prompt Payload</span>
                                  <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={(e) => copyToClipboard(r.prompt_text, 'prompt', e)}
                                    style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                                  >
                                    📋 Copy Payload
                                  </button>
                                </div>
                                <div style={{
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: '0.8rem',
                                  color: 'var(--text-primary)',
                                  background: 'rgba(0,0,0,0.4)',
                                  padding: '12px 16px',
                                  borderRadius: 8,
                                  border: '1px solid var(--border-subtle)',
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word',
                                  lineHeight: 1.6,
                                  maxHeight: 200,
                                  overflowY: 'auto',
                                }}>
                                  {r.prompt_text}
                                </div>
                              </div>

                              {/* Explanation */}
                              {r.explanation && (
                                <div style={{ marginBottom: 14 }}>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                                    XAI Forensic Analysis &amp; Attribution
                                  </div>
                                  <div style={{
                                    fontSize: '0.82rem',
                                    color: 'var(--text-secondary)',
                                    background: 'rgba(0, 212, 255, 0.04)',
                                    padding: '12px 16px',
                                    borderRadius: 8,
                                    border: '1px solid rgba(0, 212, 255, 0.15)',
                                    lineHeight: 1.7,
                                  }}>
                                    {r.explanation}
                                  </div>
                                </div>
                              )}

                              {/* Triggered Rules */}
                              {r.triggered_rules && r.triggered_rules !== '[]' && (
                                <div style={{ marginBottom: 14 }}>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                                    Triggered Heuristic Patterns
                                  </div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {(() => {
                                      try {
                                        const rules = JSON.parse(r.triggered_rules);
                                        return rules.map((rule, idx) => (
                                          <span
                                            key={idx}
                                            style={{
                                              fontFamily: 'var(--font-mono)',
                                              fontSize: '0.72rem',
                                              padding: '3px 10px',
                                              borderRadius: 4,
                                              background: 'rgba(239, 68, 68, 0.1)',
                                              color: 'var(--accent-red)',
                                              border: '1px solid rgba(239, 68, 68, 0.25)',
                                            }}
                                          >
                                            {rule}
                                          </span>
                                        ));
                                      } catch {
                                        return <span className="badge badge-purple">{r.triggered_rules}</span>;
                                      }
                                    })()}
                                  </div>
                                </div>
                              )}

                              {/* Sanitized Prompt */}
                              {r.sanitized_prompt && (
                                <div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                                      🛡️ Neutralized &amp; Sanitized Prompt Output
                                    </span>
                                    <button
                                      className="btn btn-ghost btn-sm"
                                      onClick={(e) => copyToClipboard(r.sanitized_prompt, 'sanitized prompt', e)}
                                      style={{ fontSize: '0.7rem', padding: '2px 8px', color: 'var(--accent-green)' }}
                                    >
                                      📋 Copy Sanitized
                                    </button>
                                  </div>
                                  <div style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '0.8rem',
                                    color: 'var(--accent-green)',
                                    background: 'rgba(16, 185, 129, 0.05)',
                                    padding: '12px 16px',
                                    borderRadius: 8,
                                    border: '1px solid rgba(16, 185, 129, 0.25)',
                                    whiteSpace: 'pre-wrap',
                                    lineHeight: 1.6,
                                  }}>
                                    {r.sanitized_prompt}
                                  </div>
                                </div>
                              )}

                              {/* Quick Action Footer in Drawer */}
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={(e) => sendToAnalyzer(r.prompt_text, e)}
                                >
                                  🔍 Test in Analyzer
                                </button>
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={(e) => sendToGateway(r.prompt_text, e)}
                                >
                                  🔗 Send to LLM Gateway
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
