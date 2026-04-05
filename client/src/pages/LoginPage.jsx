import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import AuthWrapper from '../components/AuthWrapper';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError('All fields are required'); return; }
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthWrapper title="Sign in" subtitle="Monitor your websites with confidence">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && <div className="error-msg" style={{ padding: '10px 14px', background: 'var(--red-bg)', borderRadius: 6 }}>{error}</div>}

        <div className="form-group">
          <label className="label">Email</label>
          <input className="input" type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" autoComplete="email" />
        </div>

        <div className="form-group">
          <label className="label">Password</label>
          <input className="input" type="password" name="password" value={form.password} onChange={handleChange} placeholder="••••••••" autoComplete="current-password" />
        </div>

        <div style={{ textAlign: 'right', marginTop: -8 }}>
          <Link to="/forgot-password" style={{ fontSize: 13, color: 'var(--text2)' }}>Forgot password?</Link>
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
          {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Signing in...</> : 'Sign in'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>
          Don't have an account? <Link to="/register">Create one</Link>
        </p>
      </form>
    </AuthWrapper>
  );
}
