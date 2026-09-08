import React from 'react';
import { Cloud, Waves, Satellite, Droplets, Database, Brain, Shield, Bell, ArrowDown, ChevronDown } from 'lucide-react';
import { dataSources } from '../data/mockData.js';
import styles from './DataSources.module.css';

const iconMap = {
  Cloud, Waves, Satellite, Droplets, Database, Brain, Shield, Bell
};

const DataSources = () => {
  const sources = dataSources || [
    { id: 'sat', name: 'SATELLITE IMAGERY', provider: 'ISRO INSAT-3D', latency: '15m', icon: 'Satellite', status: 'active' },
    { id: 'rain', name: 'PRECIPITATION', provider: 'IMD Radar', latency: '5m', icon: 'Cloud', status: 'active' },
    { id: 'water', name: 'RIVER GAUGES', provider: 'CWC Sensors', latency: 'real-time', icon: 'Waves', status: 'active' },
    { id: 'soil', name: 'SOIL MOISTURE', provider: 'IoT Network', latency: '10m', icon: 'Droplets', status: 'active' },
    { id: 'topo', name: 'TOPOGRAPHY', provider: 'DEM Data', latency: 'static', icon: 'Database', status: 'active' }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>ARCHITECTURE</span>
        <h2 className={styles.title}>MULTI-SOURCE DATA FUSION</h2>
      </div>

      <div className={styles.pipeline}>
        <div className={styles.sourcesRow}>
          {sources.map((source, idx) => {
            const Icon = iconMap[source.icon] || Database;
            return (
              <div key={source.id} className={styles.sourceCard} style={{ animationDelay: `${idx * 0.1}s` }}>
                <div className={styles.sourceHeader}>
                  <Icon size={18} className={styles.sourceIcon} />
                  <span className={`${styles.statusDot} ${(source.status === 'active' || source.status === 'online') ? styles.statusActive : ''}`}></span>
                </div>
                <h4 className={styles.sourceName}>{source.name}</h4>
                <div className={styles.sourceProvider}>{source.provider}</div>
                <div className={styles.sourceLatency}>{source.latency}</div>
              </div>
            );
          })}
        </div>

        <div className={styles.flowConnector}>
          <div className={styles.flowLine}></div>
          <ChevronDown className={styles.flowArrow} size={24} />
        </div>

        <div className={styles.aiEngineCard}>
          <div className={styles.glowEffect}></div>
          <Brain size={32} className={styles.aiIcon} />
          <h3 className={styles.aiTitle}>AI PREDICTION ENGINE</h3>
          <p className={styles.aiDesc}>Deep Learning & Hydrological Models</p>
        </div>

        <div className={styles.flowConnector}>
          <div className={styles.flowLine}></div>
          <ChevronDown className={styles.flowArrow} size={24} />
        </div>

        <div className={styles.riskScoreCard}>
          <div className={styles.riskLabel}>COMPUTED RISK SCORE</div>
          <div className={styles.riskValue}>78<span className={styles.riskMax}>/100</span></div>
        </div>

        <div className={styles.flowConnector}>
          <div className={styles.flowLine}></div>
          <ChevronDown className={styles.flowArrow} size={24} />
        </div>

        <div className={styles.earlyWarningCard}>
          <Bell size={24} className={styles.warningIcon} />
          <div className={styles.warningText}>
            <h4 className={styles.warningTitle}>EARLY WARNING</h4>
            <p className={styles.warningDesc}>Alert Generation & Dissemination</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataSources;
