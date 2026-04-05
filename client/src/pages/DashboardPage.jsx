import React, { useState, useEffect, useCallback } from 'react';
import { monitorAPI } from '../api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import MonitorCard from '../components/MonitorCard';
import MonitorModal from '../components/MonitorModal';

function StatCard({ label, value, color }) {
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--mono)', color: color || 'var(--text)', marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 13, color: 'var(--text2)' }}>{label}</div>
    </div>
  );
}

export default function DashboardPage() {
  const [monitors, setMonitors] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editMonitor, setEditMonitor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');
  const toast = useToast();
  const { user } = useAuth();

  const load = useCallback(async () => {
    try {
      const [mRes, sRes] = await Promise.all([monitorAPI.getAll(), monitorAPI.getStats()]);
      setMonitors(mRes.data.data.monitors);
      setStats(sRes.data.data);
    } catch (err) {
      toast.error('Failed to load monitors');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  const handleSave = async (formData) => {
    setSaving(true);
    try {
      if (editMonitor) {
        const { data } = await monitorAPI.update(editMonitor._id, formData);
        setMonitors(prev => prev.map(m => m._id === editMonitor._id ? data.data.monitor : m));
        toast.success('Monitor updated');
      } else {
        const { data } = await monitorAPI.create(formData);
        setMonitors(prev => [data.data.monitor, ...prev]);
        toast.success('Monitor created!');
      }
      setModalOpen(false);
      setEditMonitor(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this monitor? This cannot be undone.')) return;
    try {
      await monitorAPI.delete(id);
      setMonitors(prev => prev.filter(m => m._id !== id));
      toast.success('Monitor deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleToggle = async (monitor) => {
    try {
      const { data } = await monitorAPI.update(monitor._id, { isActive: !monitor.isActive });
      setMonitors(prev => prev.map(m => m._id === monitor._id ? data.data.monitor : m));
      toast.success(monitor.isActive ? 'Monitor paused' : 'Monitor resumed');
    } catch {
      toast.error('Update failed');
    }
  };

  const handleCheckNow = async (id) => {
    try {
      const { data } = await monitorAPI.checkNow(id);
      const result = data.data.result;
      toast[result.status === 'up' ? 'success' : 'error'](`Check complete: ${result.status.toUpperCase()} — ${result.responseTimeMs ?? 'N/A'}ms`);
      load();
    } catch {
      toast.error('Check failed');
    }
  };

  const filtered = monitors.filter(m => {
    if (filter === 'all') return true;
    if (filter === 'up') return m.currentStatus === 'up';
    if (filter === 'down') return m.currentStatus !== 'up' && m.currentStatus !== 'pending';
    if (filter === 'paused') return !m.isActive;
    return true;
  });

  if (loading) return <div className="page-loading"><div className="spinner" style={{ width: 32, height: 32 }} /><span style={{ color: 'var(--text2)' }}>Loading monitors…</span></div>;

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Dashboard</h1>
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>Welcome back, {user?.name?.split(' ')[0]} 👋</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditMonitor(null); setModalOpen(true); }}>
          + Add monitor
        </button>
      </div>

      {/* Stat cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 28 }}>
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Up" value={stats.up} color="var(--green)" />
          <StatCard label="Down" value={stats.down} color={stats.down > 0 ? 'var(--red)' : undefined} />
          <StatCard label="Avg Uptime" value={`${stats.avgUptime}%`} color={stats.avgUptime >= 99 ? 'var(--green)' : 'var(--yellow)'} />
        </div>
      )}

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['all', 'up', 'down', 'paused'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className="btn btn-ghost" style={{
            fontSize: 13, padding: '6px 14px',
            background: filter === f ? 'var(--bg3)' : 'transparent',
            color: filter === f ? 'var(--text)' : 'var(--text2)',
            borderColor: filter === f ? 'var(--border2)' : 'var(--border)',
          }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <button onClick={load} className="btn btn-ghost" style={{ fontSize: 13, padding: '6px 14px', marginLeft: 'auto' }}>↻ Refresh</button>
      </div>

      {/* Monitor grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text2)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📡</div>
          <p style={{ fontSize: 15, marginBottom: 8 }}>{monitors.length === 0 ? 'No monitors yet' : 'No monitors match this filter'}</p>
          {monitors.length === 0 && <button className="btn btn-primary" onClick={() => setModalOpen(true)}>Add your first monitor</button>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filtered.map(m => (
            <MonitorCard key={m._id} monitor={m} onDelete={handleDelete} onToggle={handleToggle} onCheckNow={handleCheckNow} />
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <MonitorModal
          monitor={editMonitor}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditMonitor(null); }}
          loading={saving}
        />
      )}
    </div>
  );
}
