import React, { useState, useEffect } from 'react';
import { AlertTriangle, MapPin, Bell, Shield, Check, Volume2, LifeBuoy, History, Plus } from 'lucide-react';
import styles from './WarningCenter.module.css';
import { getActiveAlerts, acknowledgeAlert, getAlertHistory, simulateDemoAlert } from '../services/api';

export default function WarningCenter({ onNavigate, alert, activeLocation, onOpenLifeSafety }) {
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'history' | 'demo'
  const [alertsList, setAlertsList] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  const [notifPermission, setNotifPermission] = useState('default');
  const [loading, setLoading] = useState(false);

  // Check browser notification permission state
  useEffect(() => {
    if ('Notification' in window) {
      setNotifPermission(Notification.permission);
    } else {
      setNotifPermission('not_supported');
    }
  }, []);

  // Request browser notification permission
  const handleRequestNotificationPermission = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
      if (perm === 'granted') {
        new Notification('🚨 DISASTER WARNING ALERTS ACTIVATED', {
          body: 'Browser emergency alerts enabled for monitored locations.',
          icon: '/favicon.ico'
        });
      }
    }
  };

  // Fetch active alerts for activeLocation
  const loadAlerts = async () => {
    if (!activeLocation) return;
    setLoading(true);
    const data = await getActiveAlerts(activeLocation.lat, activeLocation.lng, 25.0);
    if (data && Array.isArray(data.active_alerts)) {
      setAlertsList(data.active_alerts);

      // Trigger browser notification for HIGH / EXTREME active alerts if permission granted
      data.active_alerts.forEach(al => {
        if (!al.is_acknowledged && ['HIGH', 'VERY_HIGH', 'EXTREME'].includes(al.severity)) {
          triggerBrowserNotification(al);
        }
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 30000); // 30s poll
    return () => clearInterval(interval);
  }, [activeLocation]);

  // Trigger native browser notification
  const triggerBrowserNotification = (alertObj) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notif = new Notification(`🚨 ${alertObj.severity.replace('_', ' ')}: ${alertObj.hazard_type}`, {
        body: `${alertObj.location} — ${alertObj.message}`,
        tag: alertObj.alert_id, // Deduplication by alert ID
      });
      notif.onclick = () => {
        window.focus();
        if (onOpenLifeSafety) onOpenLifeSafety();
      };
    }
  };

  // Handle Acknowledge click
  const handleAcknowledge = async (alertId) => {
    await acknowledgeAlert(alertId);
    setAlertsList(prev => prev.map(a => a.alert_id === alertId ? { ...a, is_acknowledged: true, status: 'ACKNOWLEDGED' } : a));
  };

  // Handle DEMO simulation trigger
  const handleSimulateDemo = async () => {
    const demo = await simulateDemoAlert('FLOOD', activeLocation?.name || 'Chennai', activeLocation?.lat || 13.0827, activeLocation?.lng || 80.2707);
    if (demo) {
      setAlertsList(prev => [demo, ...prev]);
      triggerBrowserNotification(demo);
    }
  };

  // Fetch history list when tab selected
  const handleTabChange = async (tab) => {
    setActiveTab(tab);
    if (tab === 'history') {
      const hData = await getAlertHistory();
      if (hData && hData.alert_history) {
        setHistoryList(hData.alert_history);
      }
    }
  };

  const getSeverityStyle = (sev) => {
    switch (sev) {
      case 'EXTREME': return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.2)', border: 'rgba(239, 68, 68, 0.4)' };
      case 'VERY_HIGH': case 'VERY HIGH': return { color: '#f97316', bg: 'rgba(249, 115, 22, 0.2)', border: 'rgba(249, 115, 22, 0.4)' };
      case 'HIGH': return { color: '#fb923c', bg: 'rgba(251, 146, 60, 0.2)', border: 'rgba(251, 146, 60, 0.4)' };
      case 'MODERATE': return { color: '#facc15', bg: 'rgba(250, 204, 21, 0.15)', border: 'rgba(250, 204, 21, 0.3)' };
      default: return { color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)', border: 'rgba(52, 211, 153, 0.3)' };
    }
  };

  return (
    <div className={styles.warningCenterCard}>
      {/* Header Row */}
      <div className={styles.headerRow}>
        <div className={styles.titleWrapper}>
          <AlertTriangle className={styles.pulsingIcon} size={24} />
          <h2 className={styles.title}>EARLY WARNING CENTER</h2>
        </div>

        {/* Browser Notification Status & Permission Request Button */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {notifPermission !== 'granted' && (
            <button 
              onClick={handleRequestNotificationPermission}
              style={{
                background: 'rgba(79, 142, 247, 0.15)', border: '1px solid rgba(79, 142, 247, 0.3)',
                color: 'var(--accent-blue)', padding: '4px 10px', borderRadius: '4px',
                fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
              }}
            >
              <Bell size={12} />
              <span>ENABLE BROWSER ALERTS</span>
            </button>
          )}

          {/* Safe DEMO Simulation Trigger */}
          <button 
            onClick={handleSimulateDemo}
            style={{
              background: 'rgba(167, 139, 250, 0.15)', border: '1px solid rgba(167, 139, 250, 0.3)',
              color: '#a78bfa', padding: '4px 10px', borderRadius: '4px',
              fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
            }}
          >
            <Volume2 size={12} />
            <span>SIMULATE DEMO ALERTS</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
        <button 
          onClick={() => handleTabChange('active')}
          style={{
            background: activeTab === 'active' ? 'var(--bg-elevated)' : 'transparent',
            color: activeTab === 'active' ? 'var(--text-primary)' : 'var(--text-secondary)',
            border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 700, cursor: 'pointer'
          }}
        >
          ACTIVE WARNINGS ({alertsList.length})
        </button>
        <button 
          onClick={() => handleTabChange('history')}
          style={{
            background: activeTab === 'history' ? 'var(--bg-elevated)' : 'transparent',
            color: activeTab === 'history' ? 'var(--text-primary)' : 'var(--text-secondary)',
            border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 700, cursor: 'pointer'
          }}
        >
          ALERT HISTORY
        </button>
      </div>

      {/* ACTIVE WARNINGS TAB */}
      {activeTab === 'active' && (
        <div>
          {alertsList.length > 0 ? (
            alertsList.map((al) => {
              const sevStyle = getSeverityStyle(al.severity);
              return (
                <div 
                  key={al.alert_id}
                  style={{
                    backgroundColor: 'var(--bg-secondary)', border: `1px solid ${sevStyle.border}`,
                    borderLeft: `4px solid ${sevStyle.color}`, borderRadius: '6px', padding: '16px', marginBottom: '12px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MapPin size={16} style={{ color: sevStyle.color }} />
                      <strong style={{ fontSize: '15px' }}>{al.location}</strong>
                      <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>({al.hazard_type})</span>
                    </div>

                    <div style={{
                      backgroundColor: sevStyle.bg, color: sevStyle.color, border: `1px solid ${sevStyle.border}`,
                      padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 700, fontFamily: 'var(--font-mono)'
                    }}>
                      {al.severity.replace('_', ' ')}
                    </div>
                  </div>

                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '8px', lineHeight: 1.4 }}>
                    {al.message}
                  </div>

                  <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
                    Source: <strong>{al.source}</strong> | Status: <strong>{al.status}</strong> | Data Type: <strong>{al.data_type}</strong>
                  </div>

                  {al.instructions && (
                    <div style={{
                      background: 'var(--bg-tertiary)', borderLeft: '2px solid var(--accent-blue)',
                      padding: '10px', borderRadius: '4px', fontSize: '12px', fontStyle: 'italic', marginBottom: '12px'
                    }}>
                      Action: {al.instructions}
                    </div>
                  )}

                  <div className={styles.actionButtons}>
                    <button className={styles.outlineBtn} onClick={() => onNavigate && onNavigate('risk-map')}>
                      VIEW MAP
                    </button>
                    <button 
                      className={styles.outlineBtn} 
                      onClick={() => handleAcknowledge(al.alert_id)}
                      disabled={al.is_acknowledged}
                      style={{ opacity: al.is_acknowledged ? 0.5 : 1 }}
                    >
                      {al.is_acknowledged ? 'ACKNOWLEDGED ✓' : 'ACKNOWLEDGE'}
                    </button>
                    <button 
                      className={styles.outlineBtn} 
                      onClick={() => onOpenLifeSafety && onOpenLifeSafety()}
                      style={{ borderColor: 'var(--accent-blue)', color: 'var(--accent-blue)' }}
                    >
                      SAFE AREA & ROUTE
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-tertiary)', fontSize: '13px' }}>
              No active extreme warnings currently issued for {activeLocation?.name}.
            </div>
          )}
        </div>
      )}

      {/* ALERT HISTORY TAB */}
      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {historyList.map(h => (
            <div key={h.alert_id} style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '6px', fontSize: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <strong>{h.location} — {h.hazard_type}</strong>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{h.status}</span>
              </div>
              <div style={{ color: 'var(--text-secondary)' }}>{h.message}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                Issued: {h.created_at?.substring(0, 19)} | Source: {h.source}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
