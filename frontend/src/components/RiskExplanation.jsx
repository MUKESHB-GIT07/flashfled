import React from 'react';
import { CloudRain, ArrowDown, Droplets, Layers, Mountain, AlertTriangle } from 'lucide-react';
import { riskExplanationSteps } from '../data/mockData.js';
import styles from './RiskExplanation.module.css';

const iconMap = {
  CloudRain, ArrowDown, Droplets, Layers, Mountain, AlertTriangle
};

const RiskExplanation = () => {
  const steps = riskExplanationSteps || [
    { id: 1, icon: 'CloudRain', label: 'Extreme Rainfall', detail: '120mm over 24 hours in catchment area' },
    { id: 2, icon: 'Layers', label: 'Soil Saturation', detail: 'Ground is 98% saturated, zero absorption' },
    { id: 3, icon: 'Mountain', label: 'Terrain Funneling', detail: 'Steep V-shaped valley accelerates flow' },
    { id: 4, icon: 'AlertTriangle', label: 'HIGH FLOOD RISK', detail: 'Estimated peak in 2.5 hours', isConclusion: true }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>EXPLAINABLE AI</span>
        <h2 className={styles.title}>WHY IS THIS LOCATION AT RISK?</h2>
      </div>

      <div className={styles.cascade}>
        {steps.map((step, index) => {
          const Icon = iconMap[step.icon] || AlertTriangle;
          const isLast = index === steps.length - 1;
          
          return (
            <React.Fragment key={step.label || index}>
              <div 
                className={`${styles.stepCard} ${step.isConclusion ? styles.conclusionCard : ''}`}
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                <div className={styles.iconWrapper}>
                  <Icon size={step.isConclusion ? 28 : 20} className={step.isConclusion ? styles.iconConclusion : styles.iconNormal} />
                </div>
                <div className={styles.textWrapper}>
                  <h4 className={styles.stepLabel}>{step.label}</h4>
                  <p className={styles.stepDetail}>{step.detail}</p>
                </div>
              </div>
              
              {!isLast && (
                <div className={styles.connector} style={{ animationDelay: `${index * 0.2 + 0.1}s` }}>
                  <div className={styles.dashedLine}></div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default RiskExplanation;
