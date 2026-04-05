import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authAPI } from '../api';
import AuthWrapper from '../components/AuthWrapper';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [state, setState] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = params.get('token');
    const id = params.get('id');
    if (!token || !id) { setState('error'); setMessage('Invalid verification link.'); return; }

    authAPI.verifyEmail({ token, id })
      .then(() => setState('success'))
      .catch((err) => {
        setState('error');
        setMessage(err.response?.data?.message || 'Verification failed.');
      });
  }, []);

  return (
    <AuthWrapper title="Email Verification" subtitle="">
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        {state === 'loading' && <><div className="spinner" style={{ margin: '0 auto 16px', width: 32, height: 32 }} /><p style={{ color: 'var(--text2)' }}>Verifying your email…</p></>}
        {state === 'success' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <p style={{ color: 'var(--green)', fontWeight: 600, fontSize: 16, marginBottom: 12 }}>Email verified successfully!</p>
            <Link to="/login" className="btn btn-primary" style={{ display: 'inline-flex', marginTop: 8 }}>Sign in now</Link>
          </>
        )}
        {state === 'error' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
            <p style={{ color: 'var(--red)', fontWeight: 600, marginBottom: 8 }}>{message}</p>
            <Link to="/login" style={{ fontSize: 13, color: 'var(--text2)' }}>Back to login</Link>
          </>
        )}
      </div>
    </AuthWrapper>
  );
}
