import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import styles from './MonitoredLocations.module.css';

const MonitoredLocations = () => {
  const { session } = useAuth();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock data for initial render since API might not exist yet
  const mockLocations = [
    { id: 1, name: 'HOME — Chennai', lat: 13.0827, lng: 80.2707, radius: 15, hazards: ['FLOOD', 'CYCLONE'], severity: 'CRITICAL' },
    { id: 2, name: 'WORK', lat: 12.9716, lng: 77.5946, radius: 5, hazards: ['EARTHQUAKE'], severity: 'MODERATE' }
  ];

  useEffect(() => {
    // Simulate fetch
    setTimeout(() => {
      setLocations(mockLocations);
      setLoading(false);
    }, 500);
  }, []);

  const handleDelete = (id) => {
    setLocations(locations.filter(loc => loc.id !== id));
  };

  if (loading) return <div>Loading locations...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Monitored Locations</h3>
        <button className={styles.addBtn}>+ ADD LOCATION</button>
      </div>

      {locations.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📍</div>
          <p>No locations monitored.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {locations.map(loc => (
            <div key={loc.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <h4 className={styles.name}>{loc.name}</h4>
                <button className={styles.deleteBtn} onClick={() => handleDelete(loc.id)}>🗑️</button>
              </div>
              <div className={styles.coords}>
                {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
              </div>
              <div className={styles.badges}>
                <span className={styles.radiusBadge}>{loc.radius} km</span>
                <span className={`${styles.severityBadge} ${styles[loc.severity.toLowerCase()]}`}>
                  {loc.severity}
                </span>
              </div>
              <div className={styles.hazards}>
                {loc.hazards.map(h => (
                  <span key={h} className={styles.hazardChip}>{h}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MonitoredLocations;
