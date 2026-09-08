import React from 'react';
import { locations } from '../data/mockData.js';
import styles from './HighRiskLocations.module.css';

const HighRiskLocations = ({ onLocationSelect, locationsList }) => {
  const currentLocations = locationsList || locations;
  const sortedLocations = [...(currentLocations || [])].sort((a, b) => b.riskScore - a.riskScore).slice(0, 6);

  const getRiskColor = (score) => {
    if (score >= 80) return { color: 'var(--risk-critical, #f87171)', bg: 'var(--risk-critical-bg, rgba(248, 113, 113, 0.15))', label: 'CRITICAL' };
    if (score >= 60) return { color: 'var(--risk-high, #fb923c)', bg: 'var(--risk-high-bg, rgba(251, 146, 60, 0.15))', label: 'HIGH' };
    if (score >= 40) return { color: 'var(--risk-moderate, #fbbf24)', bg: 'var(--risk-moderate-bg, rgba(251, 191, 36, 0.15))', label: 'MODERATE' };
    return { color: 'var(--risk-low, #34d399)', bg: 'var(--risk-low-bg, rgba(52, 211, 153, 0.15))', label: 'LOW' };
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>MONITORING</span>
        <h2 className={styles.title}>HIGH-RISK LOCATIONS</h2>
      </div>
      
      <div className={styles.card}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>LOCATION</th>
                <th>RISK</th>
                <th>RAINFALL</th>
                <th>WATER LEVEL</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {sortedLocations.map((loc, index) => {
                const risk = getRiskColor(loc.riskScore);
                const isAlert = loc.status === 'ALERT ACTIVE' || loc.status === 'CRITICAL';
                
                return (
                  <tr 
                    key={loc.id} 
                    className={styles.row}
                    onClick={() => onLocationSelect && onLocationSelect(loc.id)}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <td data-label="LOCATION">
                      <div className={styles.locName}>{loc.name}</div>
                      <div className={styles.locRegion}>{loc.region}</div>
                    </td>
                    <td data-label="RISK">
                      <div className={styles.riskWrapper}>
                        <span className={styles.riskScore}>{loc.riskScore}</span>
                        <span 
                          className={styles.riskBadge}
                          style={{ color: risk.color, backgroundColor: risk.bg, border: `1px solid ${risk.color}` }}
                        >
                          {risk.label}
                        </span>
                      </div>
                    </td>
                    <td data-label="RAINFALL">
                      <span className={styles.monoValue}>{loc.rainfall}</span>
                      <span className={styles.unit}>mm/hr</span>
                    </td>
                    <td data-label="WATER LEVEL">
                      <span className={styles.monoValue}>{loc.waterLevel}</span>
                      <span className={styles.unit}>m</span>
                    </td>
                    <td data-label="STATUS">
                      <div className={styles.statusWrapper}>
                        <span className={`${styles.statusDot} ${isAlert ? styles.dotAlert : styles.dotStable}`}></span>
                        <span className={styles.statusText}>{loc.status}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HighRiskLocations;
