import React from 'react';
import { Link } from 'react-router-dom';

const DOT_COLORS = { up: 'var(--green)', down: 'var(--red)', timeout: 'var(--yellow)', error: 'var(--red)', pending: 'var(--text3)' };

function Dot({ status }) {
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: DOT_COLORS[status] || 'var(--text3)',
      boxShadow: status === 'up' ? `0 0 6px var(--green)` : status === 'down' ? `0 0 6px var(--red)` : 'none',
    }} />
  );
}

function MiniChart({ checks }) {
  const recent = checks.slice(-20);
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 24 }}>
      {recent.map((c, i) => (
        <div key={i} style={{
          width: 6, borderRadius: 2, flex: 'none',
          height: c.status === 'up' ? 24 : 10,
          background: c.status === 'up' ? 'var(--green)' : 'var(--red)',
          opacity: 0.7,
          transition: 'all 0.2s',
        }} title={`${c.status} — ${c.responseTimeMs ?? 'N/A'}ms`} />
      ))}
      {recent.length === 0 && <span style={{ color: 'var(--text3)', fontSize: 11 }}>No data yet</span>}
    </div>
  );
}

export default function MonitorCard({ monitor, onDelete, onToggle, onCheckNow }) {
  const status = monitor.currentStatus;

  return (
    <div className="card fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Dot status={status} />
            <Link to={`/monitors/${monitor._id}`} style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', textDecoration: 'none' }}>
              {monitor.name}
            </Link>
          </div>
          <a href={monitor.url} target="_blank" rel="noreferrer" style={{
            fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block',
          }}>{monitor.url}</a>
        </div>
        <span className={`badge badge-${status}`} style={{ marginLeft: 12, flexShrink: 0 }}>
          {status.toUpperCase()}
        </span>
      </div>

      {/* Mini chart */}
      <MiniChart checks={monitor.recentChecks || []} />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[
          { label: 'Uptime', value: `${monitor.uptimePercent ?? 100}%`, color: monitor.uptimePercent >= 99 ? 'var(--green)' : monitor.uptimePercent >= 95 ? 'var(--yellow)' : 'var(--red)' },
          { label: 'Avg Response', value: monitor.avgResponseTimeMs ? `${monitor.avgResponseTimeMs}ms` : '—' },
          { label: 'Checks', value: monitor.totalChecks || 0 },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'var(--bg3)', borderRadius: 6, padding: '8px 10px' }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--mono)', color: color || 'var(--text)' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        <button onClick={() => onCheckNow(monitor._id)} className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}>
          ↻ Check now
        </button>
        <button onClick={() => onToggle(monitor)} className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}>
          {monitor.isActive ? '⏸ Pause' : '▶ Resume'}
        </button>
        <button onClick={() => onDelete(monitor._id)} className="btn btn-danger" style={{ fontSize: 12, padding: '6px 12px', marginLeft: 'auto' }}>
          Delete
        </button>
      </div>
    </div>
  );
}
