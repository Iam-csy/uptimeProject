import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api';
import { useToast } from '../context/ToastContext';

export default function ProfilePage() {
  const { user } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setError(''); };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!form.currentPassword || !form.newPassword || !form.confirm) { setError('All fields required'); return; }
    if (form.newPassword.length < 8) { setError('New password must be at least 8 characters'); return; }
    if (form.newPassword !== form.confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await authAPI.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast.success('Password changed. Please sign in again.');
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in" style={{ maxWidth: 560 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24 }}>Profile</h1>

      {/* User Info */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: 'var(--text2)' }}>Account Info</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'Name', value: user?.name },
            { label: 'Email', value: user?.email },
            { label: 'Role', value: user?.role?.toUpperCase() },
            { label: 'Email Verified', value: user?.isEmailVerified ? '✅ Verified' : '❌ Not verified' },
            { label: 'Member since', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—' },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text2)', fontSize: 13 }}>{label}</span>
              <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Change Password */}
      <div className="card">
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: 'var(--text2)' }}>Change Password</h2>
        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <div className="error-msg" style={{ padding: '10px 14px', background: 'var(--red-bg)', borderRadius: 6 }}>{error}</div>}

          <div className="form-group">
            <label className="label">Current password</label>
            <input className="input" type="password" value={form.currentPassword} onChange={e => set('currentPassword', e.target.value)} placeholder="••••••••" />
          </div>

          <div className="form-group">
            <label className="label">New password</label>
            <input className="input" type="password" value={form.newPassword} onChange={e => set('newPassword', e.target.value)} placeholder="Min 8 characters" />
          </div>

          <div className="form-group">
            <label className="label">Confirm new password</label>
            <input className="input" type="password" value={form.confirm} onChange={e => set('confirm', e.target.value)} placeholder="••••••••" />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ alignSelf: 'flex-start' }}>
            {loading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Updating...</> : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}
