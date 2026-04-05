import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../api';
import { useToast } from '../context/ToastContext';
import AuthWrapper from '../components/AuthWrapper';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.password || !form.confirm) { setError('All fields required'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }

    setLoading(true);
    try {
      await authAPI.resetPassword({
        token: params.get('token'),
        id: params.get('id'),
        password: form.password,
      });
      toast.success('Password reset! Please sign in.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthWrapper title="Reset password" subtitle="Choose a new password">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && <div className="error-msg" style={{ padding: '10px 14px', background: 'var(--red-bg)', borderRadius: 6 }}>{error}</div>}
        <div className="form-group">
          <label className="label">New password</label>
          <input className="input" type="password" value={form.password} onChange={(e) => { setForm(p => ({ ...p, password: e.target.value })); setError(''); }} placeholder="Min 8 characters" />
        </div>
        <div className="form-group">
          <label className="label">Confirm password</label>
          <input className="input" type="password" value={form.confirm} onChange={(e) => { setForm(p => ({ ...p, confirm: e.target.value })); setError(''); }} placeholder="••••••••" />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: 12 }}>
          {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Resetting...</> : 'Reset password'}
        </button>
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text2)' }}><Link to="/login">Back to login</Link></p>
      </form>
    </AuthWrapper>
  );
}
