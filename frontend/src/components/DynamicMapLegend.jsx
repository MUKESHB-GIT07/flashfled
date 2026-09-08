import React from 'react';
import styles from './DynamicMapLegend.module.css';

export default function DynamicMapLegend({ activeLayers = [] }) {
  if (!activeLayers || activeLayers.length === 0) {
    return (
      <div className={styles.container}>
        <h4 className={styles.title}>MAP LEGEND</h4>
        <div className={styles.emptyText}>No active overlays</div>
      </div>
    );
  }

  const showWind = activeLayers.includes('wind');
  const showRain = activeLayers.includes('rainfall') || activeLayers.includes('radar') || activeLayers.includes('rain_accumulation');
  const showTemp = activeLayers.includes('temperature');
  const showPressure = activeLayers.includes('pressure');
  const showHumidity = activeLayers.includes('humidity');
  const showEarthquake = activeLayers.includes('earthquake');
  const showFlood = activeLayers.includes('flood');
  const showCyclone = activeLayers.includes('cyclone');

  return (
    <div className={styles.container}>
      <h4 className={styles.title}>ACTIVE OVERLAYS LEGEND</h4>

      {showWind && (
        <div className={styles.scaleBlock}>
          <div className={styles.scaleHeader}>
            <span>WIND VELOCITY</span>
            <span>km/h</span>
          </div>
          <div
            className={styles.colorBar}
            style={{
              background: 'linear-gradient(to right, #a78bfa 0%, #38bdf8 25%, #fbbf24 50%, #fb923c 75%, #f43f5e 100%)'
            }}
          />
          <div className={styles.ticksRow}>
            <span>0</span>
            <span>15</span>
            <span>30</span>
            <span>50</span>
            <span>80+</span>
          </div>
        </div>
      )}

      {showRain && (
        <div className={styles.scaleBlock}>
          <div className={styles.scaleHeader}>
            <span>PRECIPITATION / RADAR</span>
            <span>mm/h</span>
          </div>
          <div
            className={styles.colorBar}
            style={{
              background: 'linear-gradient(to right, #60a5fa 0%, #34d399 30%, #fbbf24 60%, #ef4444 85%, #c084fc 100%)'
            }}
          />
          <div className={styles.ticksRow}>
            <span>0.1</span>
            <span>2.5</span>
            <span>10.0</span>
            <span>25.0</span>
            <span>50+</span>
          </div>
        </div>
      )}

      {showTemp && (
        <div className={styles.scaleBlock}>
          <div className={styles.scaleHeader}>
            <span>TEMPERATURE</span>
            <span>°C</span>
          </div>
          <div
            className={styles.colorBar}
            style={{
              background: 'linear-gradient(to right, #1e3a8a 0%, #38bdf8 25%, #34d399 50%, #fbbf24 75%, #f43f5e 100%)'
            }}
          />
          <div className={styles.ticksRow}>
            <span>-20°</span>
            <span>0°</span>
            <span>20°</span>
            <span>35°</span>
            <span>45°+</span>
          </div>
        </div>
      )}

      {showPressure && (
        <div className={styles.scaleBlock}>
          <div className={styles.scaleHeader}>
            <span>SURFACE PRESSURE</span>
            <span>hPa</span>
          </div>
          <div
            className={styles.colorBar}
            style={{
              background: 'linear-gradient(to right, #ef4444 0%, #fb923c 30%, #38bdf8 60%, #3b82f6 100%)'
            }}
          />
          <div className={styles.ticksRow}>
            <span>980</span>
            <span>1000</span>
            <span>1013</span>
            <span>1030+</span>
          </div>
        </div>
      )}

      {showHumidity && (
        <div className={styles.scaleBlock}>
          <div className={styles.scaleHeader}>
            <span>RELATIVE HUMIDITY</span>
            <span>%</span>
          </div>
          <div
            className={styles.colorBar}
            style={{
              background: 'linear-gradient(to right, #fef08a 0%, #a7f3d0 40%, #38bdf8 80%, #1e40af 100%)'
            }}
          />
          <div className={styles.ticksRow}>
            <span>20%</span>
            <span>50%</span>
            <span>80%</span>
            <span>100%</span>
          </div>
        </div>
      )}

      {showEarthquake && (
        <div className={styles.scaleBlock}>
          <div className={styles.scaleHeader}>
            <span>USGS EARTHQUAKE MAGNITUDE</span>
          </div>
          <div
            className={styles.colorBar}
            style={{
              background: 'linear-gradient(to right, #f87171 0%, #f97316 50%, #ef4444 100%)'
            }}
          />
          <div className={styles.ticksRow}>
            <span>M 2.5 (Minor)</span>
            <span>M 4.5</span>
            <span>M 6.5+ (Major)</span>
          </div>
        </div>
      )}

      {showCyclone && (
        <div className={styles.scaleBlock}>
          <div className={styles.scaleHeader}>
            <span>CYCLONE STORM TRACK</span>
          </div>
          <div className={styles.ticksRow} style={{ color: '#c084fc' }}>
            <span>● OBSERVED</span>
            <span>-- FORECAST CONE</span>
          </div>
        </div>
      )}

      {showFlood && (
        <div className={styles.scaleBlock}>
          <div className={styles.scaleHeader}>
            <span>FLOOD RISK SHADING</span>
          </div>
          <div
            className={styles.colorBar}
            style={{
              background: 'linear-gradient(to right, #34d399 0%, #fbbf24 35%, #fb923c 70%, #ef4444 100%)'
            }}
          />
          <div className={styles.ticksRow}>
            <span>LOW</span>
            <span>MODERATE</span>
            <span>HIGH</span>
            <span>CRITICAL</span>
          </div>
        </div>
      )}
    </div>
  );
}
