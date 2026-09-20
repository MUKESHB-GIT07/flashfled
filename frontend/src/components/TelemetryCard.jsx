import React, { useEffect, useState } from 'react';
import { CloudRain, Waves, Droplets, TrendingUp, Mountain, ArrowUp, ArrowDown, ArrowRight } from 'lucide-react';
import styles from './TelemetryCard.module.css';

const IconMap = {
  CloudRain,
  Waves,
  Droplets,
  TrendingUp,
  Mountain
};

const TelemetryCard = ({
  title,
  displayValue,
  unit,
  trend,
  trendDirection,
  trendPeriod,
  sparkline = [],
  metadata,
  icon,
  riskLevel,
  index = 0
}) => {
  const IconComponent = IconMap[icon] || Droplets;
  
  // Calculate SVG dimensions and points for sparkline
  const width = 120;
  const height = 28;
  const padding = 2;
  
  let points = "";
  if (sparkline.length > 0) {
    const min = Math.min(...sparkline);
    const max = Math.max(...sparkline);
    const range = max - min || 1; // prevent divide by zero
    
    points = sparkline.map((val, i) => {
      const x = (i / (sparkline.length - 1)) * (width - padding * 2) + padding;
      const y = height - padding - ((val - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    }).join(" ");
  }

  // Trend direction styling
  let TrendIcon = ArrowRight;
  let trendClass = styles.trendNeutral;
  
  if (trendDirection === 'up') {
    TrendIcon = ArrowUp;
    trendClass = styles.trendUp;
  } else if (trendDirection === 'down') {
    TrendIcon = ArrowDown;
    trendClass = styles.trendDown;
  }

  return (
    <div 
      className={styles.card} 
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      <div className={styles.top}>
        <div className={styles.titleWrapper}>
          <IconComponent size={14} className={styles.icon} />
          <span className={styles.title}>{title}</span>
        </div>
      </div>
      
      <div className={styles.center}>
        <span className={styles.value}>{displayValue}</span>
        {unit && <span className={styles.unit}>{unit}</span>}
      </div>
      
      <div className={styles.trendRow}>
        <div className={`${styles.trendIndicator} ${trendClass}`}>
          <TrendIcon size={12} />
          <span>{trend}</span>
          {trendPeriod && <span className={styles.trendPeriod}>{trendPeriod}</span>}
        </div>
        
        {sparkline.length > 0 && (
          <div className={styles.sparklineWrapper}>
            <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
              <polyline 
                points={points} 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className={styles.sparklinePath}
              />
            </svg>
          </div>
        )}
      </div>
      
      {metadata && (
        <div className={styles.bottom}>
          <span className={styles.metadata}>{metadata}</span>
        </div>
      )}
    </div>
  );
};

export default TelemetryCard;
