import React, { useState, useEffect } from 'react';
import { rulesApi } from '../api/client';
import toast from 'react-hot-toast';

export default function RulesPage() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ rule_type: 'blocklist', pattern: '', description: '', is_regex: false });
  const [submitting, setSubmitting] = useState(false);

  const fetchRules = async () => {
    try {
      const res = await rulesApi.list();
      setRules(res.data);
    } catch { toast.error('Failed to load rules'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRules(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.pattern.trim()) { toast.error('Pattern is required'); return; }
    setSubmitting(true);
    try {
      await rulesApi.create(form);
      toast.success('Rule created!');
      setForm({ rule_type: 'blocklist', pattern: '', description: '', is_regex: false });
      fetchRules();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create rule');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this rule?')) return;
    try {
      await rulesApi.delete(id);
      setRules(rules.filter((r) => r.id !== id));
      toast.success('Rule deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const handleToggle = async (id) => {
    try {
      const res = await rulesApi.toggle(id);
      setRules(rules.map((r) => r.id === id ? res.data : r));
    } catch { toast.error('Failed to toggle'); }
  };

  const blocklist = rules.filter((r) => r.rule_type === 'blocklist');
  const allowlist = rules.filter((r) => r.rule_type === 'allowlist');

  return (
    <div>
      <div className="page-header">
        <h1>Security Rules</h1>
        <p>Manage custom blocklist and allowlist patterns for enhanced threat detection</p>
      </div>

      {/* Create Rule Form */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <span className="card-title">+ Create New Rule</span>
        </div>
        <form onSubmit={handleCreate}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 2fr auto auto', gap: 12, alignItems: 'end' }}>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select
                id="rule-type-select"
                className="input select"
                value={form.rule_type}
                onChange={(e) => setForm({ ...form, rule_type: e.target.value })}
              >
                <option value="blocklist">Blocklist</option>
                <option value="allowlist">Allowlist</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Pattern</label>
              <input
                id="rule-pattern-input"
                className="input"
                placeholder="e.g. ignore.*instructions"
                value={form.pattern}
                onChange={(e) => setForm({ ...form, pattern: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description (optional)</label>
              <input
                id="rule-desc-input"
                className="input"
                placeholder="Short description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="form-group" style={{ alignSelf: 'end', paddingBottom: 2 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  id="rule-regex-check"
                  checked={form.is_regex}
                  onChange={(e) => setForm({ ...form, is_regex: e.target.checked })}
                />
                Regex
              </label>
            </div>
            <button type="submit" id="create-rule-btn" className="btn btn-primary" disabled={submitting}>
              {submitting ? <span className="spinner" /> : '+ Add'}
            </button>
          </div>
        </form>
      </div>

      {/* Rules lists */}
      <div className="rules-grid">
        {/* Blocklist */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">🚫 Blocklist ({blocklist.length})</span>
            <span className="badge badge-malicious">Active</span>
          </div>
          {loading ? (
            <div className="loading-container" style={{ padding: 30 }}><div className="spinner" /></div>
          ) : blocklist.length === 0 ? (
            <div className="empty-state" style={{ padding: 30 }}>
              <div className="empty-state-icon" style={{ fontSize: 32 }}>🚫</div>
              <div className="empty-state-title">No blocklist rules</div>
              <div className="empty-state-desc">Add patterns to block malicious prompts</div>
            </div>
          ) : blocklist.map((rule) => (
            <div key={rule.id} className={`rule-item ${!rule.is_active ? 'inactive' : ''}`}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="rule-pattern">{rule.pattern}</div>
                {rule.description && <div className="rule-desc">{rule.description}</div>}
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  {rule.is_regex && <span className="badge badge-cyan">regex</span>}
                  <span className={`badge ${rule.is_active ? 'badge-safe' : 'badge-minimal'}`}>
                    {rule.is_active ? 'active' : 'disabled'}
                  </span>
                </div>
              </div>
              <div className="rule-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => handleToggle(rule.id)}>
                  {rule.is_active ? '⏸' : '▶'}
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(rule.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>

        {/* Allowlist */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">✅ Allowlist ({allowlist.length})</span>
            <span className="badge badge-safe">Trusted</span>
          </div>
          {loading ? (
            <div className="loading-container" style={{ padding: 30 }}><div className="spinner" /></div>
          ) : allowlist.length === 0 ? (
            <div className="empty-state" style={{ padding: 30 }}>
              <div className="empty-state-icon" style={{ fontSize: 32 }}>✅</div>
              <div className="empty-state-title">No allowlist rules</div>
              <div className="empty-state-desc">Add trusted patterns that bypass detection</div>
            </div>
          ) : allowlist.map((rule) => (
            <div key={rule.id} className={`rule-item ${!rule.is_active ? 'inactive' : ''}`}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="rule-pattern">{rule.pattern}</div>
                {rule.description && <div className="rule-desc">{rule.description}</div>}
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  {rule.is_regex && <span className="badge badge-cyan">regex</span>}
                  <span className={`badge ${rule.is_active ? 'badge-safe' : 'badge-minimal'}`}>
                    {rule.is_active ? 'active' : 'disabled'}
                  </span>
                </div>
              </div>
              <div className="rule-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => handleToggle(rule.id)}>
                  {rule.is_active ? '⏸' : '▶'}
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(rule.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
