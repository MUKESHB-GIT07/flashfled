import React, { useEffect, useState } from 'react';
import styles from './RiskAssessment.module.css';
import RiskFactors from './RiskFactors';
import { riskAssessment } from '../data/mockData';

const RiskAssessment = ({ assessment }) => {
  const currentAssessment = assessment || riskAssessment;
  const { score, level, confidence, drivers, primaryDrivers } = currentAssessment;
  const driversList = drivers || primaryDrivers;
  
  // Animation state for SVG arc
  const [dashOffset, setDashOffset] = useState(534); // initial state: full offset (empty arc)
  const radius = 85;
  const circumference = 2 * Math.PI * radius; // approx 534
  
  useEffect(() => {
    // Trigger animation on mount
    const timeout = setTimeout(() => {
      const offset = circumference - (score / 100) * circumference;
      setDashOffset(offset);
    }, 100);
    return () => clearTimeout(timeout);
  }, [score, circumference]);

  // Determine stroke color based on score level
  let strokeColor = 'var(--risk-moderate, #fbbf24)';
  let badgeClass = styles.badgeModerate;
  
  if (score >= 80) {
    strokeColor = 'var(--risk-critical, #f87171)';
    badgeClass = styles.badgeCritical;
  } else if (score >= 60) {
    strokeColor = 'var(--risk-high, #fb923c)';
    badgeClass = styles.badgeHigh;
  } else if (score < 40) {
    strokeColor = 'var(--risk-low, #34d399)';
    badgeClass = styles.badgeLow;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.sectionLabel}>PREDICTION</span>
        <h2 className={styles.sectionTitle}>AI FLOOD RISK ASSESSMENT</h2>
      </div>

      <div className={styles.content}>
        {/* Left Column - Gauge */}
        <div className={styles.gaugeColumn}>
          <div className={styles.gaugeWrapper}>
            <svg viewBox="0 0 200 200" className={styles.svgGauge}>
              {/* Background circle */}
              <circle
                cx="100"
                cy="100"
                r={radius}
                className={styles.bgCircle}
              />
              {/* Foreground animated arc */}
              <circle
                cx="100"
                cy="100"
                r={radius}
                className={styles.fgCircle}
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset: dashOffset,
                  stroke: strokeColor
                }}
              />
            </svg>
            <div className={styles.gaugeCenter}>
              <span className={styles.gaugeScore}>{score}</span>
              <span className={styles.gaugeMax}>/100</span>
            </div>
          </div>
          <div className={`${styles.riskBadge} ${badgeClass}`}>
            {level.toUpperCase()} RISK
          </div>
        </div>

        {/* Right Column - Details */}
        <div className={styles.detailsColumn}>
          <div className={styles.confidenceSection}>
            <div className={styles.confidenceHeader}>
              <span className={styles.confidenceLabel}>PREDICTION CONFIDENCE</span>
              <span className={styles.confidenceValue}>{confidence}%</span>
            </div>
            <div className={styles.confidenceBarTrack}>
              <div 
                className={styles.confidenceBarFill} 
                style={{ width: `${confidence}%` }}
              ></div>
            </div>
          </div>

          <div className={styles.divider}></div>

          <div className={styles.driversSection}>
            <h3 className={styles.driversTitle}>PRIMARY RISK DRIVERS</h3>
            <RiskFactors drivers={driversList} />
          </div>

          <p className={styles.disclaimer}>
            Assessment based on real-time telemetry, historical patterns, and geospatial data. High confidence does not guarantee outcome.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RiskAssessment;
