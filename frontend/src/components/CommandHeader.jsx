import React, { useState } from 'react';
import styles from './CommandHeader.module.css';
import { systemStatus } from '../data/mockData.js';
import { Shield, Activity, LifeBuoy, User, LogIn, CheckCircle, XCircle } from 'lucide-react';
import LiveClock from './LiveClock';
import EmergencySOS from './EmergencySOS';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../services/api';

export default function CommandHeader({ systemStatus: statusProp, appMode, onToggleAppMode, onOpenLifeSafety, activeLocation, onOpenAccount }) {
  const currentStatus = statusProp || systemStatus;
  const { user, isDemo, isAuthenticated } = useAuth();

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };
  

  return (
    <header className={styles.header}>
      {/* Background Topographic SVG */}
      <div className={styles.topoBg}>
        <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
          <defs>
            <pattern id="topoPattern" width="200" height="200" patternUnits="userSpaceOnUse">
              <path d="M0,50 Q50,0 100,50 T200,50 M0,100 Q50,50 100,100 T200,100 M0,150 Q50,100 100,150 T200,150" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.05" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#topoPattern)" />
        </svg>
      </div>

      <div className={styles.leftSection}>
        <div className={styles.labelRow}>
          <span className={styles.label}>FLASH FLOOD & MULTI-DISASTER</span>
          {/* Public Safety vs Operations Mode Switcher */}
          <div className={styles.modeSwitchBox}>
            <button 
              className={`${styles.modeBtn} ${appMode === 'public' ? styles.modeBtnActive : ''}`}
              onClick={() => onToggleAppMode && onToggleAppMode('public')}
            >
              <Shield size={12} />
              <span>PUBLIC SAFETY</span>
            </button>
            <button 
              className={`${styles.modeBtn} ${appMode === 'operations' ? styles.modeBtnActive : ''}`}
              onClick={() => onToggleAppMode && onToggleAppMode('operations')}
            >
              <Activity size={12} />
              <span>OPERATIONS</span>
            </button>
          </div>
        </div>

        <h1 className={styles.title}>PREDICTION SYSTEM</h1>
        <p className={styles.subtitle}>Global Multi-Source Early Warning & Public Safety Platform</p>
        
        <div className={styles.chips}>
          <span className={styles.chip}>SIH26192</span>
          <span className={styles.chip}>DISASTER MANAGEMENT</span>
          <span className={styles.chip}>MHA</span>
          <span className={styles.apiChip} title={`Configured Backend API URL: ${API_BASE_URL}`}>🌐 {API_BASE_URL}</span>
          <EmergencySOS activeLocation={activeLocation} />
          <button className={styles.emergencyQuickBtn} onClick={onOpenLifeSafety}>
            <LifeBuoy size={12} />
            <span>LIFE SAFETY MODE</span>
          </button>
        </div>
      </div>

        <div className={styles.rightSection}>
        <div className={styles.statusLabel}>SYSTEM STATUS</div>
        <div className={styles.statusIndicator}>
          <span className={styles.pulseDot}></span>
          <span className={styles.statusText}>{currentStatus?.statusLabel || 'MONITORING ACTIVE'}</span>
        </div>
        <div className={styles.metaData}>
          <div>Last Updated: {currentStatus?.lastUpdated || '—'}</div>
          <div>Data Sources: {currentStatus?.dataSourcesOnline || '5'}/{currentStatus?.totalDataSources || '5'} Online</div>
        </div>
        {/* Phase 2: Compact live clock — system time, separate from source data times */}
        <div className={styles.clockRow}>
          <LiveClock compact />
        </div>
        {/* Phase 16: User Profile Chip (Only rendered when logged in) */}
        {isAuthenticated && user && (
          <div className={styles.userChipRow}>
            <button className={`${styles.userChip} ${isDemo ? styles.userChipDemo : ''}`} onClick={onOpenAccount} title="Account Settings">
              <span className={styles.userAvatar}>{getInitials(user.full_name)}</span>
              <div className={styles.userChipInfo}>
                <span className={styles.userName}>{user.full_name}</span>
                <span className={styles.userMeta}>
                  {isDemo && <span className={styles.demoBadge}>DEMO</span>}
                  {user.phone_verified && <span className={styles.verifiedBadge} title="Phone Verified">✓ PHONE</span>}
                  {user.email_verified && <span className={styles.verifiedBadge} title="Email Verified">✓ EMAIL</span>}
                </span>
              </div>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
