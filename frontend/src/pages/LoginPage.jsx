import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      let res;
      if (tab === 'login') {
        res = await authApi.login({ username: form.username, password: form.password });
      } else {
        res = await authApi.register({ username: form.username, email: form.email, password: form.password });
      }
      const { access_token, user } = res.data;
      setAuth(access_token, user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />

      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">🛡️</div>
          <div>
            <div className="auth-logo-title">SentinelAI</div>
            <div className="auth-logo-sub">Intelligent Prompt Detection &amp; Defence Framework</div>
          </div>
        </div>

        <div className="auth-tabs">
          <div className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); setError(''); }}>
            Sign In
          </div>
          <div className={`auth-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => { setTab('register'); setError(''); }}>
            Register
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              className="input"
              type="text"
              name="username"
              id="username"
              placeholder="Enter username"
              value={form.username}
              onChange={handleChange}
              required
            />
          </div>

          {tab === 'register' && (
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className="input"
                type="email"
                name="email"
                id="email"
                placeholder="your@email.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="input"
              type="password"
              name="password"
              id="password"
              placeholder={tab === 'register' ? 'Min. 6 characters' : 'Enter password'}
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          {error && (
            <div className="alert alert-error">
              <span>⚠</span> {error}
            </div>
          )}

          <button className="btn btn-primary btn-full btn-lg" type="submit" id="auth-submit-btn" disabled={loading}>
            {loading ? (
              <><span className="spinner" /> Processing...</>
            ) : tab === 'login' ? (
              '→ Sign In to SentinelAI'
            ) : (
              '→ Create Account'
            )}
          </button>
        </form>

        {tab === 'login' && (
          <div style={{ marginTop: 20, padding: '12px 16px', background: 'rgba(0,212,255,0.05)', borderRadius: 8, border: '1px solid rgba(0,212,255,0.15)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>Demo credentials:</div>
            <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
              Register a new account above to get started
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
