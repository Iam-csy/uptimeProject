import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../api';
import { useToast } from '../context/ToastContext';
import AuthWrapper from '../components/AuthWrapper';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const toast = useToast();

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { setError('All fields are required'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await authAPI.register(form);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthWrapper title="Check your inbox" subtitle="One more step">
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
          <p style={{ color: 'var(--text2)', fontSize: 15, lineHeight: 1.7 }}>
            We sent a verification link to <strong style={{ color: 'var(--text)' }}>{form.email}</strong>.<br />
            Click the link to activate your account.
          </p>
          <p style={{ marginTop: 16, fontSize: 13, color: 'var(--text3)' }}>
            Didn't get it? <Link to="/login">Try resending from login</Link>
          </p>
        </div>
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper title="Create account" subtitle="Start monitoring in seconds">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && <div className="error-msg" style={{ padding: '10px 14px', background: 'var(--red-bg)', borderRadius: 6 }}>{error}</div>}

        <div className="form-group">
          <label className="label">Full name</label>
          <input className="input" name="name" value={form.name} onChange={handleChange} placeholder="Harsh Shah" />
        </div>

        <div className="form-group">
          <label className="label">Email</label>
          <input className="input" type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" />
        </div>

        <div className="form-group">
          <label className="label">Password <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(min 8 characters)</span></label>
          <input className="input" type="password" name="password" value={form.password} onChange={handleChange} placeholder="••••••••" />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: 12, marginTop: 4 }}>
          {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Creating account...</> : 'Create account'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text2)' }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </AuthWrapper>
  );
}
