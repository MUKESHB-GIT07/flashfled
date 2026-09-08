import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import styles from './DeviceManagement.module.css';

const DeviceManagement = () => {
  const { session } = useAuth();
  const [devices, setDevices] = useState([]);

  useEffect(() => {
    // Mock devices
    setDevices([
      { id: '1', type: 'BROWSER', name: 'Chrome / Windows 11', lastActive: 'Just now', pushConnected: true, current: true },
      { id: '2', type: 'PHONE', name: 'Safari / iOS 16', lastActive: '2 days ago', pushConnected: false, current: false }
    ]);
  }, []);

  const handleRemove = (id) => {
    setDevices(devices.filter(d => d.id !== id));
  };

  const getIcon = (type) => {
    if (type === 'PHONE') return '📱';
    if (type === 'TABLET') return '💊';
    return '💻';
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Registered Devices</h3>
      </div>

      <div className={styles.list}>
        {devices.map(device => (
          <div key={device.id} className={`${styles.card} ${styles[device.type.toLowerCase()]}`}>
            <div className={styles.iconWrapper}>
              <span className={styles.icon}>{getIcon(device.type)}</span>
            </div>
            
            <div className={styles.info}>
              <div className={styles.nameRow}>
                <h4 className={styles.name}>{device.name}</h4>
                {device.current && <span className={styles.currentBadge}>CURRENT SESSION</span>}
              </div>
              
              <div className={styles.meta}>
                <span className={styles.lastActive}>Active: {device.lastActive}</span>
              </div>
              
              <div className={styles.pushStatus}>
                <span className={device.pushConnected ? styles.pushConnected : styles.pushNotConfigured}>
                  ● {device.pushConnected ? 'PUSH CONNECTED' : 'PUSH NOT CONFIGURED'}
                </span>
              </div>
            </div>
            
            {!device.current && (
              <button className={styles.removeBtn} onClick={() => handleRemove(device.id)}>
                REMOVE
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeviceManagement;
