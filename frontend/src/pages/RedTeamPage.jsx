import React, { useState } from 'react';
import { redteamApi } from '../api/client';
import toast from 'react-hot-toast';

const VulnRatingBadge = ({ rating }) => {
  const getColor = (r) => {
    if (r.startsWith('ROBUST')) return '#10b981';
    if (r.startsWith('STRONG')) return '#84cc16';
    if (r.startsWith('MODERATE')) return '#f59e0b';
    return '#ef4444';
  };
  const color = getColor(rating);
  return (
    <div style={{
      padding: '12px 20px', borderRadius: 10, textAlign: 'center',
      background: color + '15', border: `1px solid ${color}44`
    }}>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Vulnerability Rating</div>
      <div style={{ fontSize: '0.9rem', fontWeight: 700, color, lineHeight: 1.4 }}>{rating}</div>
    </div>
  );
};

export default function RedTeamPage() {
  const [category, setCategory] = useState('injection');
  const [customPrompt, setCustomPrompt] = useState('');
  const [numMutations, setNumMutations] = useState(8);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleRun = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await redteamApi.generate({
        seed_prompt: customPrompt.trim() || undefined,
        category,
        num_mutations: numMutations,
      });
      setResult(res.data);
      const evaded = res.data.evasion_successes;
      if (evaded === 0) toast.success(`Excellent! All ${res.data.mutations_tested} mutations detected.`);
      else toast.error(`${evaded} mutation(s) evaded detection!`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Red team run failed');
    } finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-header">
        <h1>⚔️ Adversarial Red Team</h1>
        <p>Automatically generate mutated attack variants and test SentinelAI's detection robustness. Finds evasion gaps before attackers do.</p>
      </div>

      {/* Config */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><span className="card-title">🧪 Red Team Configuration</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
          <div className="form-group">
            <label className="form-label">Attack Category</label>
            <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="injection">Prompt Injection</option>
              <option value="jailbreak">Jailbreak</option>
              <option value="pii">PII Extraction</option>
              <option value="exfiltration">Data Exfiltration</option>
              <option value="all">All Categories</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Number of Mutations: {numMutations}</label>
            <input type="range" min={3} max={9} value={numMutations} onChange={e => setNumMutations(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-cyan)' }} />
          </div>
          <button className="btn btn-primary" onClick={handleRun} disabled={loading}>
            {loading ? <><span className="spinner" /> Running...</> : '⚔️ Run Red Team'}
          </button>
        </div>
        <div className="form-group" style={{ marginTop: 12 }}>
          <label className="form-label">Custom Seed Prompt (optional — leave blank for auto-selected)</label>
          <input className="input" value={customPrompt} onChange={e => setCustomPrompt(e.target.value)}
            placeholder="Enter your own seed attack prompt, or leave blank to use a built-in example..." />
        </div>
      </div>

      {/* Mutation Techniques info */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><span className="card-title">🔬 Mutation Techniques Applied</span></div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {['Leetspeak Substitution','Base64 Encoding','Zero-Width Space Injection','Unicode Homoglyph',
            'Prefix Distraction','Role-Play Fictional Wrapper','Adversarial Suffix Injection','Word Splitting','Multilingual Obfuscation'].map(m => (
            <span key={m} className="badge badge-cyan" style={{ fontSize: '0.72rem' }}>{m}</span>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '50px 24px' }}>
          <div className="loading-container" style={{ padding: 0 }}>
            <div className="spinner spinner-lg" />
            <div>
              <div style={{ fontWeight: 600 }}>Running adversarial mutations...</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 4 }}>Firing {numMutations} attack variants at the detection engine</div>
            </div>
          </div>
        </div>
      )}

      {result && !loading && (
        <>
          {/* Summary */}
          <div className="stats-grid" style={{ marginBottom: 20 }}>
            <div className="stat-card stat-cyan">
              <div className="stat-card-value" style={{ color: 'var(--accent-cyan)' }}>{result.mutations_tested}</div>
              <div className="stat-card-label">Mutations Tested</div>
            </div>
            <div className="stat-card stat-green">
              <div className="stat-card-value" style={{ color: 'var(--accent-green)' }}>{result.detection_rate}%</div>
              <div className="stat-card-label">Detection Rate</div>
            </div>
            <div className="stat-card stat-red">
              <div className="stat-card-value" style={{ color: result.evasion_successes > 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                {result.evasion_successes}
              </div>
              <div className="stat-card-label">Evasion Successes</div>
            </div>
            <div className="stat-card">
              <VulnRatingBadge rating={result.vulnerability_rating} />
            </div>
          </div>

          {/* Original */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <span className="card-title">🎯 Original Seed Prompt</span>
              <span className={`badge ${result.original_detected ? 'badge-malicious' : 'badge-safe'}`}>
                {result.original_detected ? '⚠ DETECTED' : '✓ NOT DETECTED'}
              </span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--accent-cyan)', lineHeight: 1.6, marginBottom: 8 }}>
              {result.original_prompt}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Original severity: <strong style={{ color: 'var(--text-secondary)' }}>{result.original_severity.toFixed(0)}/100</strong>
            </div>
          </div>

          {/* Mutation table */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <span className="card-title">🧬 Mutation Results</span>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Mutation Technique</th>
                    <th>Mutated Prompt Preview</th>
                    <th>Detected</th>
                    <th>Severity</th>
                    <th>Evasion</th>
                  </tr>
                </thead>
                <tbody>
                  {result.results.map((r, i) => (
                    <tr key={i} style={{ background: r.evasion_success ? 'rgba(239,68,68,0.05)' : 'transparent' }}>
                      <td style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{r.mutation_name}</td>
                      <td className="td-mono truncate" style={{ maxWidth: 280, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {r.mutated_prompt.substring(0, 100)}{r.mutated_prompt.length > 100 ? '...' : ''}
                      </td>
                      <td>
                        <span className={`badge ${r.detected ? 'badge-safe' : 'badge-malicious'}`}>
                          {r.detected ? '✓ YES' : '✗ NO'}
                        </span>
                      </td>
                      <td className="td-mono" style={{ color: r.severity_score >= 60 ? 'var(--accent-red)' : r.severity_score >= 30 ? 'var(--accent-orange)' : 'var(--accent-green)' }}>
                        {r.severity_score.toFixed(0)}
                      </td>
                      <td>
                        {r.evasion_success
                          ? <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.8rem' }}>⚠ EVADED</span>
                          : <span style={{ color: '#10b981', fontSize: '0.8rem' }}>✓ Blocked</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recommendations */}
          <div className="card">
            <div className="card-header"><span className="card-title">💡 Security Recommendations</span></div>
            {result.recommendations.map((rec, i) => (
              <div key={i} style={{
                display: 'flex', gap: 10, padding: '10px 14px', marginBottom: 8,
                background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.15)', borderRadius: 8
              }}>
                <span style={{ color: 'var(--accent-cyan)', fontSize: '1rem', flexShrink: 0 }}>→</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{rec}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {!result && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: '50px 24px' }}>
          <div style={{ fontSize: 64, marginBottom: 16, opacity: 0.2 }}>⚔️</div>
          <div style={{ color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 8 }}>Red Team Ready</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: 460, margin: '0 auto' }}>
            Configure the attack category and number of mutations above, then click <strong>"Run Red Team"</strong> to fire adversarial variants at the detection engine.
          </div>
        </div>
      )}
    </div>
  );
}
