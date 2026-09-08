import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../services/api';
import styles from './AccountPage.module.css';
import EmergencyContacts from './EmergencyContacts';
import MonitoredLocations from './MonitoredLocations';
import NotificationPreferences from './NotificationPreferences';
import DeviceManagement from './DeviceManagement';

const AccountPage = ({ onClose }) => {
  const { user, session, logout, isDemo } = useAuth();
  const [activeTab, setActiveTab] = useState('PROFILE');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const tabs = ['PROFILE', 'CONTACTS', 'LOCATIONS', 'NOTIFICATIONS', 'DEVICES'];

  // Dummy stats for UI
  const stats = { contacts: 2, locations: 3, devices: 1 };

  const handleDeleteAccount = async () => {
    if (deleteInput !== 'DELETE') return;
    setIsDeleting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/account/profile`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.token}`
        }
      });
      if (response.ok) {
        logout();
        onClose();
      }
    } catch (error) {
      console.error('Failed to delete account:', error);
    }
    setIsDeleting(false);
  };

  if (!user) return null;

  const initials = user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U';
  const isPhoneVerified = user.phone_verified !== false; // Assume verified if missing for demo
  const isEmailVerified = user.email_verified !== false;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>

        <div className={styles.profileCard}>
          <div className={styles.avatar}>{initials}</div>
          <h2 className={styles.fullName}>{user.full_name || 'Unknown User'}</h2>
          
          <div className={styles.roleBadge}>
            <span className={`${styles.role} ${styles[user.role?.toLowerCase() || 'citizen']}`}>
              {user.role || (isDemo ? 'DEMO' : 'CITIZEN')}
            </span>
          </div>

          <div className={styles.verificationRow}>
            <span className={isPhoneVerified ? styles.verified : styles.unverified}>
              {isPhoneVerified ? '✓ PHONE VERIFIED' : '✗ PHONE UNVERIFIED'}
            </span>
            <span className={isEmailVerified ? styles.verified : styles.unverified}>
              {isEmailVerified ? '✓ EMAIL VERIFIED' : '✗ EMAIL UNVERIFIED'}
            </span>
          </div>

          <div className={styles.metaRow}>
            <span>🌍 {user.country || 'Global'}</span>
            <span>🗣️ {user.language || 'English'}</span>
          </div>

          <div className={styles.statsRow}>
            <span>Emergency Contacts: {stats.contacts}</span> | 
            <span>Monitored Locations: {stats.locations}</span> | 
            <span>Devices: {stats.devices}</span>
          </div>
        </div>

        <div className={styles.tabsContainer}>
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`${styles.tabBtn} ${activeTab === tab ? styles.activeTab : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className={styles.tabContent}>
          {activeTab === 'PROFILE' && (
            <div className={styles.profileSection}>
              <h3>Profile Settings</h3>
              <p className={styles.notice}>Profile editing is currently managed via central dashboard.</p>
              
              <div className={styles.dangerZone}>
                <button className={styles.logoutBtn} onClick={() => { logout(); onClose(); }}>
                  LOGOUT
                </button>
                <button className={styles.deleteBtn} onClick={() => setShowDeleteConfirm(true)}>
                  DELETE ACCOUNT
                </button>
              </div>
            </div>
          )}
          {activeTab === 'CONTACTS' && <EmergencyContacts />}
          {activeTab === 'LOCATIONS' && <MonitoredLocations />}
          {activeTab === 'NOTIFICATIONS' && <NotificationPreferences />}
          {activeTab === 'DEVICES' && <DeviceManagement />}
        </div>

        {showDeleteConfirm && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <h3>Delete Account</h3>
              <p>This will permanently delete your account and personal data. Emergency audit records are retained according to safety retention policy.</p>
              <p>Type <strong>DELETE</strong> to confirm.</p>
              <input
                type="text"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder="DELETE"
                className={styles.deleteInput}
              />
              <div className={styles.modalActions}>
                <button className={styles.cancelBtn} onClick={() => setShowDeleteConfirm(false)}>CANCEL</button>
                <button 
                  className={styles.confirmDeleteBtn} 
                  disabled={deleteInput !== 'DELETE' || isDeleting}
                  onClick={handleDeleteAccount}
                >
                  {isDeleting ? 'DELETING...' : 'CONFIRM DELETE'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountPage;
