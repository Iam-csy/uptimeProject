import React, { useState, useEffect } from 'react';

const DEFAULT = {
  name: '', url: '', method: 'GET', expectedStatusCode: 200,
  checkIntervalMinutes: 5, timeoutMs: 10000, alertEmails: '',
};

export default function MonitorModal({ monitor, onSave, onClose, loading }) {
  const [form, setForm] = useState(DEFAULT);
  const [error, setError] = useState('');

  useEffect(() => {
    if (monitor) {
      setForm({
        name: monitor.name || '',
        url: monitor.url || '',
        method: monitor.method || 'GET',
        expectedStatusCode: monitor.expectedStatusCode || 200,
        checkIntervalMinutes: monitor.checkIntervalMinutes || 5,
        timeoutMs: monitor.timeoutMs || 10000,
        alertEmails: (monitor.alertEmails || []).join(', '),
      });
    }
  }, [monitor]);

  const set = (key, val) => { setForm(p => ({ ...p, [key]: val })); setError(''); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.url.trim()) { setError('Name and URL are required'); return; }
    const emailList = form.alertEmails.split(',').map(e => e.trim()).filter(Boolean);
    onSave({ ...form, alertEmails: emailList });
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 className="modal-title">{monitor ? 'Edit Monitor' : 'Add Monitor'}</h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && <div className="error-msg" style={{ padding: '10px 14px', background: 'var(--red-bg)', borderRadius: 6 }}>{error}</div>}

          <div className="form-group">
            <label className="label">Monitor name *</label>
            <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="My Website" />
          </div>

          <div className="form-group">
            <label className="label">URL *</label>
            <input className="input" value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://example.com" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="label">Method</label>
              <select className="input" value={form.method} onChange={e => set('method', e.target.value)}>
                <option>GET</option><option>HEAD</option><option>POST</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">Expected status</label>
              <input className="input" type="number" value={form.expectedStatusCode} onChange={e => set('expectedStatusCode', Number(e.target.value))} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="label">Interval (minutes)</label>
              <input className="input" type="number" min={1} max={1440} value={form.checkIntervalMinutes} onChange={e => set('checkIntervalMinutes', Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label className="label">Timeout (ms)</label>
              <input className="input" type="number" min={1000} max={30000} value={form.timeoutMs} onChange={e => set('timeoutMs', Number(e.target.value))} />
            </div>
          </div>

          <div className="form-group">
            <label className="label">Alert emails <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(comma-separated)</span></label>
            <input className="input" value={form.alertEmails} onChange={e => set('alertEmails', e.target.value)} placeholder="you@example.com, team@example.com" />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Saving...</> : monitor ? 'Save changes' : 'Add monitor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
