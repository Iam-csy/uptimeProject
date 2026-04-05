import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../api';
import AuthWrapper from '../components/AuthWrapper';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) { setError('Email is required'); return; }
    setLoading(true);
    try {
      await authAPI.forgotPassword({ email });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthWrapper title="Check your inbox" subtitle="">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📨</div>
          <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.7 }}>If that email exists, a reset link has been sent. Check your spam folder too.</p>
          <Link to="/login" style={{ display: 'inline-block', marginTop: 20, fontSize: 13 }}>Back to login</Link>
        </div>
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper title="Forgot password?" subtitle="Enter your email and we'll send a reset link">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && <div className="error-msg" style={{ padding: '10px 14px', background: 'var(--red-bg)', borderRadius: 6 }}>{error}</div>}
        <div className="form-group">
          <label className="label">Email</label>
          <input className="input" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} placeholder="you@example.com" />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: 12 }}>
          {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Sending...</> : 'Send reset link'}
        </button>
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text2)' }}><Link to="/login">Back to login</Link></p>
      </form>
    </AuthWrapper>
  );
}
