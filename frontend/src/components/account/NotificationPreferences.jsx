import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../services/api';
import styles from './NotificationPreferences.module.css';

const NotificationPreferences = () => {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState({
    channels: {
      sms: true, push: true, email: true, web: true
    },
    hazards: {
      flash_flood: true, earthquake: true, tsunami: true,
      cyclone: true, wildfire: true, landslide: false,
      volcano: false, extreme_weather: true, sos: true
    }
  });
  const [showToast, setShowToast] = useState(false);

  const hazardTypes = [
    { id: 'flash_flood', label: 'FLASH FLOOD', icon: '🌊' },
    { id: 'earthquake', label: 'EARTHQUAKE', icon: '🌍' },
    { id: 'tsunami', label: 'TSUNAMI', icon: '🌊' },
    { id: 'cyclone', label: 'CYCLONE', icon: '🌀' },
    { id: 'wildfire', label: 'WILDFIRE', icon: '🔥' },
    { id: 'landslide', label: 'LANDSLIDE', icon: '⛰️' },
    { id: 'volcano', label: 'VOLCANO', icon: '🌋' },
    { id: 'extreme_weather', label: 'EXTREME WEATHER', icon: '⛈️' },
    { id: 'sos', label: 'EMERGENCY SOS', icon: '🆘', critical: true }
  ];

  const handleChannelToggle = (channel) => {
    setPrefs(p => ({ ...p, channels: { ...p.channels, [channel]: !p.channels[channel] } }));
  };

  const handleHazardToggle = (hazard) => {
    if (hazard === 'sos') return; // Cannot disable
    setPrefs(p => ({ ...p, hazards: { ...p.hazards, [hazard]: !p.hazards[hazard] } }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`${API_BASE_URL}/account/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.token}`
        },
        body: JSON.stringify(prefs)
      });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      <section className={styles.section}>
        <h4 className={styles.sectionHeader}>NOTIFICATION CHANNELS</h4>
        
        <div className={styles.channelRow}>
          <div>
            <div className={styles.channelName}>SMS ALERTS</div>
            <div className={styles.channelDesc}>Receive SMS when disasters are detected</div>
          </div>
          <label className={styles.switch}>
            <input type="checkbox" checked={prefs.channels.sms} onChange={() => handleChannelToggle('sms')} />
            <span className={styles.slider}></span>
          </label>
        </div>
        
        <div className={styles.channelRow}>
          <div>
            <div className={styles.channelName}>PUSH NOTIFICATIONS</div>
            <div className={styles.channelDesc}>Browser/app push alerts</div>
          </div>
          <label className={styles.switch}>
            <input type="checkbox" checked={prefs.channels.push} onChange={() => handleChannelToggle('push')} />
            <span className={styles.slider}></span>
          </label>
        </div>

        <div className={styles.channelRow}>
          <div>
            <div className={styles.channelName}>EMAIL ALERTS</div>
            <div className={styles.channelDesc}>Critical alerts via email</div>
          </div>
          <label className={styles.switch}>
            <input type="checkbox" checked={prefs.channels.email} onChange={() => handleChannelToggle('email')} />
            <span className={styles.slider}></span>
          </label>
        </div>

        <div className={styles.channelRow}>
          <div>
            <div className={styles.channelName}>WEB NOTIFICATIONS</div>
            <div className={styles.channelDesc}>In-browser notifications</div>
          </div>
          <label className={styles.switch}>
            <input type="checkbox" checked={prefs.channels.web} onChange={() => handleChannelToggle('web')} />
            <span className={styles.slider}></span>
          </label>
        </div>
      </section>

      <section className={styles.section}>
        <h4 className={styles.sectionHeader}>HAZARD CATEGORIES</h4>
        <div className={styles.hazardGrid}>
          {hazardTypes.map(hazard => (
            <div 
              key={hazard.id} 
              className={`${styles.hazardCard} ${prefs.hazards[hazard.id] ? styles.activeCard : ''} ${hazard.critical ? styles.criticalCard : ''}`}
              onClick={() => handleHazardToggle(hazard.id)}
            >
              <div className={styles.hazardIcon}>{hazard.icon}</div>
              <div className={styles.hazardLabel}>{hazard.label}</div>
              <div className={styles.hazardToggle}>
                {prefs.hazards[hazard.id] ? 'ON' : 'OFF'}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className={styles.policyNotice}>
        ⚠️ LIFE SAFETY NOTICE: Critical life-safety alerts for active SOS events and immediate threats cannot be disabled. These follow emergency response policy.
      </div>

      <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
        {saving ? 'SAVING...' : 'SAVE CHANGES'}
      </button>

      {showToast && (
        <div className={styles.toast}>
          Preferences saved successfully.
        </div>
      )}
    </div>
  );
};

export default NotificationPreferences;
