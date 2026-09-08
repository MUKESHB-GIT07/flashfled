import React, { useState, useEffect } from 'react';
import styles from './ImpactProjection.module.css';
import { ArrowRight, AlertTriangle, ShieldCheck, Clock, Layers, Zap, Info } from 'lucide-react';
import { getProjectedImpact, getDisasterCascade } from '../services/api';

export default function ImpactProjection({ activeLocation, onOpenLifeSafety }) {
  const [selectedHours, setSelectedHours] = useState(3);
  const [impactData, setImpactData] = useState(null);
  const [cascadeData, setCascadeData] = useState(null);
  const [selectedRegionDetails, setSelectedRegionDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadProjections() {
      if (!activeLocation) return;
      setLoading(true);
      
      const [imp, cas] = await Promise.all([
        getProjectedImpact(activeLocation.lat, activeLocation.lng, activeLocation.display_name || activeLocation.name, 'AUTO', selectedHours),
        getDisasterCascade(activeLocation.lat, activeLocation.lng, activeLocation.display_name || activeLocation.name)
      ]);

      if (imp) setImpactData(imp);
      if (cas) setCascadeData(cas);
      setLoading(false);
    }

    loadProjections();
  }, [activeLocation, selectedHours]);

  const isLocationInProjectedArea = (impactData?.risk_level === 'HIGH' || impactData?.risk_level === 'CRITICAL');

  return (
    <div className={styles.card}>
      <div className={styles.headerRow}>
        <div>
          <div className={styles.sectionLabel}>DISASTER CASCADE & NEXT AFFECTED REGIONS</div>
          <h2 className={styles.title}>PROJECTED IMPACT MODEL</h2>
        </div>
        <div className={styles.disclaimerBanner}>
          <AlertTriangle size={14} />
          <span>PROJECTED IMPACT — NOT CONFIRMED (Model Prediction Only)</span>
        </div>
      </div>

      {/* User Location Impact Alert */}
      <div className={`${styles.alertBox} ${isLocationInProjectedArea ? styles.insideAlert : styles.outsideAlert}`}>
        {isLocationInProjectedArea ? (
          <>
            <AlertTriangle size={18} />
            <div>
              <strong>⚠️ PROJECTED IMPACT MAY AFFECT YOUR LOCATION</strong> — {impactData?.location} is within the model forecast window ({impactData?.time_window}). Risk Level: <strong>{impactData?.risk_level}</strong> (Confidence: {impactData?.confidence_pct}%).
            </div>
          </>
        ) : (
          <>
            <ShieldCheck size={18} />
            <div>
              Your current location (<strong>{activeLocation?.name}</strong>) is outside the primary projected impact vector based on available model predictions.
            </div>
          </>
        )}
      </div>

      {/* Forecast Window Timeline Controls */}
      <div className={styles.timeBar}>
        <div className={styles.timeLabel}>
          <Clock size={14} style={{ display: 'inline', marginRight: '4px' }} />
          FORECAST WINDOW:
        </div>
        <div className={styles.timeSteps}>
          {[1, 3, 6, 12, 24].map((h) => (
            <button
              key={h}
              className={`${styles.timeStepBtn} ${selectedHours === h ? styles.timeStepActive : ''}`}
              onClick={() => setSelectedHours(h)}
            >
              +{h}H FORECAST
            </button>
          ))}
        </div>
      </div>

      {/* Regions Potentially Affected Next (3-Column Flow) */}
      <div className={styles.regionsGrid}>
        {/* CURRENTLY AFFECTED REGION */}
        <div 
          className={`${styles.regionCard} ${styles.currentCard}`}
          onClick={() => setSelectedRegionDetails({
            title: 'CURRENTLY AFFECTED REGION',
            region: impactData?.current_affected_area || activeLocation?.name,
            hazard: impactData?.hazard_type || 'FLOOD',
            status: 'OBSERVED CURRENT',
            window: 'NOW',
            risk: impactData?.risk_level || 'HIGH',
            confidence: '95%',
            source: impactData?.data_source || 'Live Sensors + Open-Meteo',
          })}
        >
          <div className={`${styles.cardTag} ${styles.cardTagCurrent}`}>
            🔴 CURRENTLY AFFECTED REGION (NOW)
          </div>
          <div className={styles.regionName}>{impactData?.current_affected_area || `${activeLocation?.name} Central Basin`}</div>
          <div className={styles.regionMeta}>
            <span>HAZARD: {impactData?.hazard_type || 'FLOOD'}</span>
            <span>ORIGIN: {impactData?.origin}</span>
            <span>STATUS: <strong>OBSERVED / ACTIVE</strong></span>
          </div>
        </div>

        {/* PROJECTED NEXT REGION */}
        <div 
          className={`${styles.regionCard} ${styles.nextCard}`}
          onClick={() => setSelectedRegionDetails({
            title: 'PROJECTED NEXT REGION',
            region: impactData?.projected_next_region || 'Downstream Corridor',
            hazard: impactData?.hazard_type || 'FLOOD',
            status: 'MODEL PREDICTION',
            window: `+${selectedHours}H (${impactData?.eta_next || ''})`,
            risk: impactData?.risk_level || 'HIGH',
            confidence: `${impactData?.confidence_pct || 78}%`,
            source: impactData?.data_source || 'Hydro-Geomorphic Model',
          })}
        >
          <div className={`${styles.cardTag} ${styles.cardTagNext}`}>
            🟠 PROJECTED NEXT REGION (+{selectedHours}H)
          </div>
          <div className={styles.regionName}>{impactData?.projected_next_region || 'Next Downstream Basin'}</div>
          <div className={styles.regionMeta}>
            <span>ETA: <strong>{impactData?.eta_next}</strong></span>
            <span>BEARING: {impactData?.direction}</span>
            <span>CONFIDENCE: {impactData?.confidence_pct}%</span>
          </div>
        </div>

        {/* PROJECTED FOLLOWING REGION */}
        <div 
          className={`${styles.regionCard} ${styles.laterCard}`}
          onClick={() => setSelectedRegionDetails({
            title: 'PROJECTED FOLLOWING REGION',
            region: impactData?.projected_following_region || 'Lower Basin Outfall',
            hazard: impactData?.hazard_type || 'FLOOD',
            status: 'MODEL PREDICTION',
            window: `+${selectedHours * 2}H (${impactData?.eta_later || ''})`,
            risk: 'MODERATE',
            confidence: `${Math.max(50, (impactData?.confidence_pct || 75) - 12)}%`,
            source: impactData?.data_source || 'Hydro-Geomorphic Model',
          })}
        >
          <div className={`${styles.cardTag} ${styles.cardTagLater}`}>
            🟡 PROJECTED FOLLOWING REGION (+{selectedHours * 2}H)
          </div>
          <div className={styles.regionName}>{impactData?.projected_following_region || 'Lower Discharge Basin'}</div>
          <div className={styles.regionMeta}>
            <span>ETA: <strong>{impactData?.eta_later}</strong></span>
            <span>EXPOSED: {impactData?.exposed_locations?.join(', ')}</span>
            <span>STATUS: <strong>MODEL PROJECTION</strong></span>
          </div>
        </div>
      </div>

      {/* Step-by-Step Domino Disaster Cascade */}
      <div className={styles.cascadeBox}>
        <div className={styles.cascadeHeader}>
          <Zap size={14} style={{ color: 'var(--accent-amber)' }} />
          <span>DOMINO DISASTER CASCADE SEQUENCE</span>
        </div>
        <div className={styles.cascadeChain}>
          {cascadeData?.cascade_chain?.map((step, idx) => (
            <React.Fragment key={step.step_number}>
              <div className={styles.cascadeStep}>
                <div className={styles.stepNum}>STEP 0{step.step_number} · {step.status}</div>
                <div className={styles.stepTrigger}>{step.trigger}</div>
                <div className={styles.stepImpact}>{step.impact}</div>
              </div>
              {idx < cascadeData.cascade_chain.length - 1 && (
                <ArrowRight size={16} className={styles.arrowIcon} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Region Details Modal if clicked */}
      {selectedRegionDetails && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-lg)', padding: '24px', maxWidth: '480px', width: '100%'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
              {selectedRegionDetails.title}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Detailed projection metrics evaluated for active location: <strong>{activeLocation?.name}</strong>
            </p>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-tertiary)' }}>
              <div>REGION: <strong style={{ color: '#fff' }}>{selectedRegionDetails.region}</strong></div>
              <div>HAZARD: <strong style={{ color: 'var(--accent-blue)' }}>{selectedRegionDetails.hazard}</strong></div>
              <div>TIME WINDOW: <strong>{selectedRegionDetails.window}</strong></div>
              <div>RISK LEVEL: <strong style={{ color: 'var(--risk-high)' }}>{selectedRegionDetails.risk}</strong></div>
              <div>MODEL CONFIDENCE: <strong>{selectedRegionDetails.confidence}</strong></div>
              <div>STATUS: <strong>{selectedRegionDetails.status}</strong></div>
              <div>SOURCE: <strong>{selectedRegionDetails.source}</strong></div>
            </div>
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setSelectedRegionDetails(null)}
                style={{
                  background: 'var(--accent-blue)', color: '#000', border: 'none',
                  padding: '8px 16px', borderRadius: 'var(--radius-md)', fontWeight: 700, cursor: 'pointer'
                }}
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
