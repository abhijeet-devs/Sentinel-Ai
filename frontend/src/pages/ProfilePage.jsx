import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/client';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, logout, setAuth } = useAuthStore();
  const [regen, setRegen] = useState(false);
  const [newKey, setNewKey] = useState(null);

  const handleRegenKey = async () => {
    if (!confirm('Regenerate API key? Your current key will be invalidated.')) return;
    setRegen(true);
    try {
      const res = await authApi.regenerateKey();
      setNewKey(res.data.api_key);
      toast.success('API key regenerated!');
    } catch { toast.error('Failed to regenerate key'); }
    finally { setRegen(false); }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Profile & Settings</h1>
        <p>Manage your account and API access credentials</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Profile card */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">👤 Account Details</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <div style={{
              width: 72, height: 72,
              background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.8rem', fontWeight: 800, color: 'white',
            }}>
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{user?.username}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{user?.email}</div>
              <div style={{ marginTop: 6 }}>
                {user?.is_admin
                  ? <span className="badge badge-purple">Administrator</span>
                  : <span className="badge badge-cyan">Analyst</span>
                }
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'User ID', value: `#${user?.id}` },
              { label: 'Member Since', value: user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—' },
              { label: 'Role', value: user?.is_admin ? 'Administrator' : 'Analyst' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{value}</span>
              </div>
            ))}
          </div>
          <button className="btn btn-danger btn-full" style={{ marginTop: 24 }} onClick={logout} id="logout-btn">
            Sign Out
          </button>
        </div>

        {/* API Key */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">🔑 API Access</span>
            <span className="badge badge-safe">Active</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
            Use your API key to authenticate programmatic requests to SentinelAI without a UI.
          </p>

          <div style={{ marginBottom: 16 }}>
            <div className="form-label" style={{ marginBottom: 8 }}>Current API Key</div>
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid var(--border-medium)',
              borderRadius: 8,
              padding: '12px 16px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              color: 'var(--accent-cyan)',
              wordBreak: 'break-all',
            }}>
              {newKey || user?.api_key || '•'.repeat(48)}
            </div>
          </div>

          <button className="btn btn-ghost btn-full" onClick={handleRegenKey} disabled={regen} id="regen-key-btn">
            {regen ? <><span className="spinner" /> Regenerating...</> : '⟳ Regenerate API Key'}
          </button>

          <div className="divider" />

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <div style={{ marginBottom: 8, fontWeight: 600, color: 'var(--text-secondary)' }}>Usage Example:</div>
            <pre style={{
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 6,
              padding: '12px',
              fontSize: '0.75rem',
              color: 'var(--accent-green)',
              overflow: 'auto',
            }}>{`curl -X POST http://localhost:8000/api/analyze/ \\
  -H "Authorization: Bearer <your-token>" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "your text here"}'`}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
