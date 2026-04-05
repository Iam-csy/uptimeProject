import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { monitorAPI } from '../api';
import { useToast } from '../context/ToastContext';
import MonitorModal from '../components/MonitorModal';

const STATUS_COLOR = { up: 'var(--green)', down: 'var(--red)', timeout: 'var(--yellow)', error: 'var(--red)', pending: 'var(--text3)' };

function ResponseChart({ checks }) {
  const recent = checks.slice(-50);
  const max = Math.max(...recent.map(c => c.responseTimeMs || 0), 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 60, marginTop: 8 }}>
      {recent.map((c, i) => {
        const pct = c.responseTimeMs ? (c.responseTimeMs / max) * 100 : 0;
        return (
          <div key={i} title={`${c.status} — ${c.responseTimeMs ?? 'N/A'}ms\n${new Date(c.checkedAt).toLocaleTimeString()}`}
            style={{
              flex: 1, minWidth: 4, borderRadius: '2px 2px 0 0',
              height: `${Math.max(pct, 8)}%`,
              background: STATUS_COLOR[c.status] || 'var(--text3)',
              opacity: 0.8, transition: 'opacity 0.1s', cursor: 'default',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = 1}
            onMouseLeave={e => e.currentTarget.style.opacity = 0.8}
          />
        );
      })}
    </div>
  );
}

export default function MonitorDetailPage() {
  const { id } = useParams();
  const [monitor, setMonitor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const load = async () => {
    try {
      const { data } = await monitorAPI.getOne(id);
      setMonitor(data.data.monitor);
    } catch {
      toast.error('Monitor not found');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleCheckNow = async () => {
    setChecking(true);
    try {
      const { data } = await monitorAPI.checkNow(id);
      toast[data.data.result.status === 'up' ? 'success' : 'error'](`${data.data.result.status.toUpperCase()} — ${data.data.result.responseTimeMs ?? 'N/A'}ms`);
      load();
    } catch { toast.error('Check failed'); }
    finally { setChecking(false); }
  };

  const handleSave = async (formData) => {
    setSaving(true);
    try {
      const { data } = await monitorAPI.update(id, formData);
      setMonitor(data.data.monitor);
      setEditing(false);
      toast.success('Monitor updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this monitor?')) return;
    await monitorAPI.delete(id);
    toast.success('Monitor deleted');
    navigate('/dashboard');
  };

  if (loading) return <div className="page-loading"><div className="spinner" style={{ width: 32, height: 32 }} /></div>;
  if (!monitor) return null;

  const status = monitor.currentStatus;

  return (
    <div className="fade-in">
      {/* Breadcrumb */}
      <div style={{ marginBottom: 20, fontSize: 13, color: 'var(--text2)' }}>
        <Link to="/dashboard">Dashboard</Link> <span style={{ margin: '0 6px' }}>›</span> {monitor.name}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLOR[status], display: 'inline-block', boxShadow: status === 'up' ? '0 0 8px var(--green)' : '' }} />
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{monitor.name}</h1>
            <span className={`badge badge-${status}`}>{status.toUpperCase()}</span>
          </div>
          <a href={monitor.url} target="_blank" rel="noreferrer" style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text2)' }}>{monitor.url}</a>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleCheckNow} disabled={checking} className="btn btn-ghost">
            {checking ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Checking…</> : '↻ Check now'}
          </button>
          <button onClick={() => setEditing(true)} className="btn btn-ghost">✎ Edit</button>
          <button onClick={handleDelete} className="btn btn-danger">Delete</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Uptime', value: `${monitor.uptimePercent ?? 100}%`, color: monitor.uptimePercent >= 99 ? 'var(--green)' : 'var(--yellow)' },
          { label: 'Avg Response', value: monitor.avgResponseTimeMs ? `${monitor.avgResponseTimeMs}ms` : '—' },
          { label: 'Total Checks', value: monitor.totalChecks || 0 },
          { label: 'Downtime Checks', value: monitor.totalDownChecks || 0, color: monitor.totalDownChecks > 0 ? 'var(--red)' : undefined },
          { label: 'Interval', value: `${monitor.checkIntervalMinutes}m` },
          { label: 'Timeout', value: `${monitor.timeoutMs}ms` },
        ].map(({ label, value, color }) => (
          <div key={label} className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--mono)', color: color || 'var(--text)' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Response time chart */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', marginBottom: 4 }}>Response Time (last 50 checks)</h3>
        <ResponseChart checks={monitor.recentChecks || []} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
          <span>Oldest</span><span>Latest</span>
        </div>
      </div>

      {/* Recent checks log */}
      <div className="card">
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', marginBottom: 16 }}>Recent Checks</h3>
        {monitor.recentChecks.length === 0 ? (
          <p style={{ color: 'var(--text3)', fontSize: 13 }}>No checks yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
            {[...monitor.recentChecks].reverse().map((c, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
                background: 'var(--bg3)', borderRadius: 6, fontSize: 13,
              }}>
                <span className={`badge badge-${c.status}`} style={{ fontSize: 11, padding: '2px 8px' }}>{c.status.toUpperCase()}</span>
                <span style={{ fontFamily: 'var(--mono)', color: 'var(--text2)', fontSize: 12 }}>
                  {c.responseTimeMs != null ? `${c.responseTimeMs}ms` : 'N/A'}
                </span>
                {c.statusCode && <span style={{ color: 'var(--text3)', fontSize: 12 }}>HTTP {c.statusCode}</span>}
                {c.errorMessage && <span style={{ color: 'var(--red)', fontSize: 12, flex: 1 }}>{c.errorMessage}</span>}
                <span style={{ marginLeft: 'auto', color: 'var(--text3)', fontSize: 11, whiteSpace: 'nowrap' }}>
                  {new Date(c.checkedAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alert emails */}
      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', marginBottom: 8 }}>Alert Emails</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {monitor.alertEmails.map(e => (
            <span key={e} style={{ background: 'var(--accent-glow)', color: 'var(--accent)', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontFamily: 'var(--mono)' }}>{e}</span>
          ))}
        </div>
      </div>

      {editing && <MonitorModal monitor={monitor} onSave={handleSave} onClose={() => setEditing(false)} loading={saving} />}
    </div>
  );
}
