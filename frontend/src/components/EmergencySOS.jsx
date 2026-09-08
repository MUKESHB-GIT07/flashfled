import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Shield, Volume2, VolumeX, CheckCircle, PhoneCall, MapPin, X, AlertOctagon, UserCheck } from 'lucide-react';
import styles from './EmergencySOS.module.css';
import { activateSOS, getActiveSOS, getSOSDetails, escalateSOS, cancelSOS, updateSOSLocation } from '../services/api.js';

export default function EmergencySOS({ activeLocation }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [activeSOSData, setActiveSOSData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alarmActive, setAlarmActive] = useState(false);
  const [userCondition, setUserCondition] = useState('NORMAL');
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [renderError, setRenderError] = useState(null);

  const audioCtxRef = useRef(null);
  const oscillatorRef = useRef(null);
  const gainNodeRef = useRef(null);
  const locationIntervalRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // Clean Audio & Interval cleanup on unmount
  useEffect(() => {
    return () => {
      stopAlarmSound();
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
    };
  }, []);

  // Check for active SOS on mount
  useEffect(() => {
    async function checkActive() {
      try {
        const res = await getActiveSOS();
        if (res && res.active && res.record) {
          setActiveSOSData(res.record);
          if (res.record.alarm_active) {
            startAlarmSound();
          }
        }
      } catch (e) {
        console.warn('[SOS] Initial active check error:', e);
      }
    }
    checkActive();
  }, []);

  // Poll active SOS status every 5 seconds if SOS is active
  useEffect(() => {
    if (!activeSOSData || activeSOSData.status === 'CANCELLED' || activeSOSData.status === 'RESCUED') {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return;
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const sosId = activeSOSData.sos_id || activeSOSData.rescue_id;
        if (!sosId) return;
        const updated = await getSOSDetails(sosId);
        if (updated) {
          setActiveSOSData(updated);
          if (updated.status === 'RESCUED' || updated.status === 'CANCELLED') {
            stopAlarmSound();
          }
        }
      } catch (e) {
        console.warn('[SOS] Poll status error:', e);
      }
    }, 5000);

    return () => clearInterval(pollIntervalRef.current);
  }, [activeSOSData?.sos_id, activeSOSData?.status]);

  // Periodic GPS location stream during active SOS
  useEffect(() => {
    if (!activeSOSData || activeSOSData.status === 'CANCELLED' || activeSOSData.status === 'RESCUED') {
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
      return;
    }

    locationIntervalRef.current = setInterval(() => {
      const sosId = activeSOSData.sos_id || activeSOSData.rescue_id;
      if (!sosId) return;
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            updateSOSLocation(sosId, {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              gps_accuracy_m: pos.coords.accuracy || 0,
              movement_status: 'STATIONARY',
            });
          },
          (err) => console.warn('[SOS] Location tracking error:', err),
          { enableHighAccuracy: true, timeout: 10000 }
        );
      }
    }, 15000);

    return () => clearInterval(locationIntervalRef.current);
  }, [activeSOSData?.sos_id, activeSOSData?.status]);

  // Cooldown timer countdown
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      setCooldownRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  // Web Audio API Siren Generator — strictly single oscillator instance
  const startAlarmSound = () => {
    try {
      if (oscillatorRef.current) return; // Prevent duplicate Web Audio oscillators

      if (!audioCtxRef.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new AudioContext();
      }

      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, ctx.currentTime);

      const now = ctx.currentTime;
      for (let i = 0; i < 60; i++) {
        osc.frequency.linearRampToValueAtTime(1200, now + i * 0.8 + 0.4);
        osc.frequency.linearRampToValueAtTime(700, now + i * 0.8 + 0.8);
      }

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      oscillatorRef.current = osc;
      gainNodeRef.current = gain;
      setAlarmActive(true);
    } catch (e) {
      console.warn('[SOS] Web Audio alarm failed:', e);
    }
  };

  const stopAlarmSound = () => {
    try {
      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
        oscillatorRef.current = null;
      }
      setAlarmActive(false);
    } catch (e) {
      console.warn('[SOS] Stop alarm failed:', e);
    }
  };

  // Multiple Tap Protection: Second/Third tap focuses existing active panel without duplicate creation
  const handleSosClick = () => {
    setRenderError(null);
    setShowConfirm(true);
  };

  const handleConfirmSOS = async () => {
    // DUPLICATE PROTECTION: If already active, do not re-activate
    if (activeSOSData && ['ACTIVE', 'REQUESTED', 'ACKNOWLEDGED', 'DISPATCHED', 'EN_ROUTE', 'ARRIVED'].includes(activeSOSData.status)) {
      setShowConfirm(true);
      return;
    }

    setLoading(true);
    let lat = activeLocation?.lat || 13.0827;
    let lng = activeLocation?.lng || 80.2707;
    let locName = activeLocation?.name || activeLocation?.display_name || 'Chennai';

    if ('geolocation' in navigator) {
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch (e) {
        console.warn('[SOS] Geolocation fallback:', e);
      }
    }

    const payload = {
      user_id: 'user_anon_01',
      user_name: 'Emergency Citizen',
      phone: '+91-98765-43210',
      latitude: lat,
      longitude: lng,
      location_name: locName,
      user_condition: userCondition,
      disaster_type: 'EMERGENCY_SOS',
    };

    const res = await activateSOS(payload);
    setLoading(false);

    if (res && res.success) {
      const rec = res.record || {
        sos_id: res.sos_id || res.rescue_id,
        rescue_id: res.rescue_id || res.sos_id,
        status: res.status || 'ACTIVE',
        priority: res.priority || 'CRITICAL',
        safety_message: res.safety_message || 'Emergency request registered.',
        alarm_active: true,
        data_type: res.data_type || 'LIVE',
      };
      setActiveSOSData(rec);
      startAlarmSound();
    } else if (res && res.error === 'DUPLICATE_SOS_BLOCKED') {
      setCooldownRemaining(res.remaining_seconds || 60);
      alert(`SOS Protection: ${res.message}`);
    } else {
      alert(`SOS Activation Error: ${res?.error || 'Failed to dispatch SOS alert'}`);
    }
  };

  const handleEscalate = async (condition) => {
    const sosId = activeSOSData?.sos_id || activeSOSData?.rescue_id;
    if (!sosId) return;
    setUserCondition(condition);
    const res = await escalateSOS(sosId, condition);
    if (res && res.success) {
      setActiveSOSData((prev) => ({
        ...prev,
        user_condition: condition,
        priority: 'CRITICAL',
      }));
    }
  };

  const handleCancelSOS = async () => {
    const sosId = activeSOSData?.sos_id || activeSOSData?.rescue_id;
    if (!sosId) return;
    const confirmCancel = window.confirm('Confirm Cancellation: Are you sure you are safe and wish to cancel the Emergency SOS?');
    if (!confirmCancel) return;

    stopAlarmSound();
    const res = await cancelSOS(sosId, 'User confirmed safe');
    if (res && res.success) {
      setActiveSOSData(null);
      setShowConfirm(false);
    }
  };

  const isSOSActive = Boolean(activeSOSData && activeSOSData.status !== 'CANCELLED' && activeSOSData.status !== 'RESCUED');

  return (
    <div className={styles.sosButtonContainer}>
      <button
        className={`${styles.sosButton} ${isSOSActive ? styles.sosButtonActive : ''}`}
        onClick={handleSosClick}
        title="Trigger Emergency SOS Alarm"
      >
        <AlertTriangle size={18} />
        {isSOSActive ? 'EMERGENCY ACTIVE' : 'I NEED HELP / SOS'}
      </button>

      {/* Confirmation & Emergency Control Modal */}
      {showConfirm && (
        <div className={styles.overlay} onClick={() => setShowConfirm(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.titleGroup}>
                <div className={styles.iconBadge}>
                  <AlertOctagon size={24} />
                </div>
                <div>
                  <h3 className={styles.title}>EMERGENCY SOS ALERT</h3>
                  <p className={styles.subtitle}>Direct Emergency Response & Location Dispatch</p>
                </div>
              </div>
              <button className={styles.closeBtn} onClick={() => setShowConfirm(false)}>
                <X size={20} />
              </button>
            </div>

            {renderError ? (
              <div className={styles.confirmBox}>
                <p style={{ color: '#ef4444' }}>Emergency Dashboard Recovered from Temporary State Error.</p>
                <button className={styles.cancelBtn} onClick={() => setShowConfirm(false)}>
                  Close
                </button>
              </div>
            ) : !isSOSActive ? (
              /* IF NO ACTIVE SOS: CONFIRMATION PROMPT */
              <div className={styles.confirmBox}>
                <p className={styles.warningText}>
                  Send your precise coordinates and trigger emergency response to nearby responders and your family contacts?
                </p>

                <div className={styles.locationPreview}>
                  <div className={styles.locRow}>
                    <span>Target Location:</span>
                    <strong>{activeLocation?.name || activeLocation?.display_name || 'Chennai, Tamil Nadu'}</strong>
                  </div>
                  <div className={styles.locRow}>
                    <span>GPS Coordinates:</span>
                    <strong>{activeLocation?.lat || 13.0827}, {activeLocation?.lng || 80.2707}</strong>
                  </div>
                  <div className={styles.locRow}>
                    <span>Priority Level:</span>
                    <strong style={{ color: '#ef4444' }}>CRITICAL</strong>
                  </div>
                </div>

                <div className={styles.confirmActions}>
                  <button className={styles.cancelBtn} onClick={() => setShowConfirm(false)}>
                    CANCEL
                  </button>
                  <button
                    className={styles.sendSosBtn}
                    onClick={handleConfirmSOS}
                    disabled={loading || cooldownRemaining > 0}
                  >
                    {loading ? 'DISPATCHING...' : cooldownRemaining > 0 ? `WAIT ${cooldownRemaining}s` : 'SEND EMERGENCY ALERT'}
                  </button>
                </div>
              </div>
            ) : (
              /* IF ACTIVE SOS: CONTROL & STATUS DASHBOARD */
              <div>
                <div className={styles.activeHeader}>
                  <div>
                    <span className={styles.statusPill}>
                      <span className="pulsing-dot" /> {activeSOSData?.status || 'ACTIVE'}
                    </span>
                    {activeSOSData?.data_type === 'DEMO' && (
                      <span className={styles.demoTag}>DEMO MODE</span>
                    )}
                    <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.85rem', fontWeight: 600 }}>
                      SOS ID: {activeSOSData?.sos_id || activeSOSData?.rescue_id || 'SOS-ACTIVE'}
                    </p>
                  </div>

                  <div className={styles.alarmControls}>
                    <button
                      className={`${styles.alarmBtn} ${alarmActive ? styles.alarmBtnActive : ''}`}
                      onClick={() => (alarmActive ? stopAlarmSound() : startAlarmSound())}
                    >
                      {alarmActive ? <Volume2 size={16} /> : <VolumeX size={16} />}
                      {alarmActive ? 'SIREN ON' : 'SIREN OFF'}
                    </button>
                  </div>
                </div>

                {/* Safety Message */}
                <div className={styles.safetyBox}>
                  <strong>SAFETY GUIDANCE:</strong> {activeSOSData?.safety_message || 'Emergency request sent — awaiting responder acknowledgement.'}
                </div>

                {/* Responder Acknowledgement Banner if acknowledged */}
                {Array.isArray(activeSOSData?.notifications?.responders) &&
                  activeSOSData.notifications.responders.some((r) => r && r.acknowledged) && (
                    <div className={styles.ackNotice}>
                      <UserCheck size={20} />
                      <div>
                        <strong>RESPONDER CONFIRMED:</strong> An authorized rescue team has acknowledged your SOS call and is coordinating dispatch.
                      </div>
                    </div>
                  )}

                {/* Escalation Options */}
                <div className={styles.escalateSection}>
                  <div className={styles.sectionLabel}>REPORT SPECIFIC CONDITION (ESCALATE)</div>
                  <div className={styles.escalateGrid}>
                    <button
                      className={`${styles.escalateBtn} ${userCondition === 'TRAPPED' ? styles.escalateBtnSelected : ''}`}
                      onClick={() => handleEscalate('TRAPPED')}
                    >
                      <span>🪨 TRAPPED</span>
                      <small>Cannot escape</small>
                    </button>
                    <button
                      className={`${styles.escalateBtn} ${userCondition === 'INJURED' ? styles.escalateBtnSelected : ''}`}
                      onClick={() => handleEscalate('INJURED')}
                    >
                      <span>🩺 INJURED</span>
                      <small>Needs medical aid</small>
                    </button>
                    <button
                      className={`${styles.escalateBtn} ${userCondition === 'BURIED' ? styles.escalateBtnSelected : ''}`}
                      onClick={() => handleEscalate('BURIED')}
                    >
                      <span>🌊 BURIED</span>
                      <small>Debris / Floodwater</small>
                    </button>
                  </div>
                </div>

                {/* Response Timeline — Defensive null/undefined safe rendering */}
                <div className={styles.timeline}>
                  <div className={styles.sectionLabel}>EMERGENCY TIMELINE</div>
                  {Array.isArray(activeSOSData?.timeline) &&
                    activeSOSData.timeline.map((item, idx) => {
                      if (!item) return null;
                      const rawStep = item.step || item.status || 'STATUS_UPDATE';
                      const stepLabel = String(rawStep).replace(/_/g, ' ');
                      let formattedTime = '';
                      if (item.timestamp) {
                        try {
                          formattedTime = new Date(item.timestamp).toLocaleTimeString();
                        } catch (e) {
                          formattedTime = String(item.timestamp);
                        }
                      }

                      return (
                        <div key={idx} className={styles.timelineItem}>
                          <div
                            className={`${styles.timelineDot} ${
                              item.status === 'COMPLETED'
                                ? styles.dotCompleted
                                : item.status === 'ACTIVE' || item.status === 'REQUESTED'
                                ? styles.dotActive
                                : styles.dotPending
                            }`}
                          />
                          <div className={styles.timelineContent}>
                            <div className={styles.timelineStep}>{stepLabel}</div>
                            {formattedTime && <div className={styles.timelineTime}>{formattedTime}</div>}
                            {item.note && <div className={styles.timelineNote}>{item.note}</div>}
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Safe / Cancellation Button */}
                <div className={styles.safeActionBox}>
                  <button className={styles.safeBtn} onClick={handleCancelSOS}>
                    <CheckCircle size={18} /> I AM SAFE / CANCEL SOS
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
