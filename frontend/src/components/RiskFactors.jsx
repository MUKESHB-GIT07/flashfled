import React, { useEffect, useState } from 'react';
import styles from './RiskFactors.module.css';

const RiskFactors = ({ drivers }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Small delay to allow initial render, then set mounted to true to trigger animations
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!drivers || drivers.length === 0) return null;

  return (
    <div className={styles.container}>
      {drivers.map((driver, index) => (
        <div key={driver.name || index} className={styles.row}>
          <div className={styles.labelWrapper}>
            <span className={styles.label}>{driver.name}</span>
            <span className={styles.value}>{driver.value}%</span>
          </div>
          <div className={styles.barTrack}>
            <div 
              className={styles.barFill} 
              style={{ 
                width: mounted ? `${driver.value}%` : '0%',
                backgroundColor: driver.color || 'var(--accent-blue)',
                transitionDelay: `${index * 150}ms`
              }}
            ></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RiskFactors;
