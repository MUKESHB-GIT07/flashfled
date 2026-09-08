import React, { useState, useEffect } from 'react';
import styles from './LifeSafetyModal.module.css';
import { 
  X, AlertTriangle, ShieldCheck, MapPin, Navigation, 
  LifeBuoy, PhoneCall, CheckCircle, Volume2, VolumeX,
  Compass, ShieldAlert, Radio, UserCheck, MessageSquare,
  RefreshCw, Wifi, WifiOff, Share2, Info, ArrowUpRight
} from 'lucide-react';
import { 
  submitRescueRequest, 
  fetchSafetyStatus, 
  fetchSafetyShelters, 
  fetchSafetyRoutes 
} from '../services/api';

const LifeSafetyModal = ({ isOpen, onClose, alertData, currentLocation, onNavigateToMap }) => {
  const [medicalStatus, setMedicalStatus] = useState('TRAPPED / UNINJURED');
  const [rescueSubmitted, setRescueSubmitted] = useState(false);
  const [rescueId, setRescueId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [safetyData, setSafetyData] = useState(null);
  const [isLoadingSafety, setIsLoadingSafety] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [activeStepAnim, setActiveStepAnim] = useState(0);
  const [isOfflineMode, setIsOfflineMode] = useState(!navigator.onLine);
  const [customLocationSearch, setCustomLocationSearch] = useState('');
  const [selectedContactMsg, setSelectedContactMsg] = useState(null);

  const locLat = currentLocation?.lat || alertData?.latitude || 30.7346;
  const locLng = currentLocation?.lng || alertData?.longitude || 79.0669;
  const locName = currentLocation?.name || alertData?.location || 'Kedarnath Valley';
  const hazardType = alertData?.hazard_type || alertData?.disaster || 'FLOOD';

  // Network online/offline tracking
  useEffect(() => {
    const handleOnline = () => setIsOfflineMode(false);
    const handleOffline = () => setIsOfflineMode(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Quick non-delay sequence animation on mount
  useEffect(() => {
    if (!isOpen) return;
    setActiveStepAnim(1);
    const timer = setInterval(() => {
      setActiveStepAnim(prev => {
        if (prev >= 8) {
          clearInterval(timer);
          return 8;
        }
        return prev + 1;
      });
    }, 180);
    return () => clearInterval(timer);
  }, [isOpen]);

  // Load Safety Status
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setIsLoadingSafety(true);

    fetchSafetyStatus(locLat, locLng, hazardType, locName).then(data => {
      if (isMounted && data) {
        setSafetyData(data);
        setIsLoadingSafety(false);

        // Voice announcement if enabled
        if (!isMuted && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const nearestShelter = data.designated_shelter?.name || 'designated high ground shelter';
          const dist = data.designated_shelter?.distance_km || '1.8';
          const speechText = `Emergency warning active for ${locName}. Current danger is ${data.current_risk?.level || 'HIGH'}. The nearest designated shelter is ${nearestShelter}, approximately ${dist} kilometers away. I have highlighted the available route.`;
          
          const utter = new SpeechSynthesisUtterance(speechText);
          utter.rate = 0.95;
          window.speechSynthesis.speak(utter);
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, locLat, locLng, hazardType, locName]);

  if (!isOpen) return null;

  const handleSendRescue = async () => {
    setIsSubmitting(true);
    const result = await submitRescueRequest({
      user_name: 'Resident Citizen',
      latitude: locLat,
      longitude: locLng,
      disaster_type: hazardType,
      medical_status: medicalStatus,
      message: `Emergency rescue signal from Life Safety Mode for ${locName}`,
      phone: '+91-98765-43210'
    });
    setIsSubmitting(false);
    if (result && result.rescue_id) {
      setRescueId(result.rescue_id);
      setRescueSubmitted(true);
    }
  };

  const handleReplayVoice = () => {
    if (!('speechSynthesis' in window) || !safetyData) return;
    window.speechSynthesis.cancel();
    const nearestShelter = safetyData.designated_shelter?.name || 'designated shelter';
    const dist = safetyData.designated_shelter?.distance_km || '1.8';
    const msg = `Emergency status for ${locName}. Current risk score is ${safetyData.current_risk?.score || 75} out of 100. Nearest designated shelter is ${nearestShelter}, ${dist} kilometers away. Follow recommended route.`;
    const utter = new SpeechSynthesisUtterance(msg);
    utter.rate = 0.95;
    window.speechSynthesis.speak(utter);
  };

  const emergencySteps = [
    { num: 1, text: '🚨 DANGER DETECTED' },
    { num: 2, text: '📍 LOCATING YOU' },
    { num: 3, text: '🔴 IDENTIFYING DANGER' },
    { num: 4, text: '🟠 CHECKING IMPACT' },
    { num: 5, text: '🟢 LOWER-RISK AREA' },
    { num: 6, text: '🏠 FINDING SHELTER' },
    { num: 7, text: '🚶 SAFER ROUTE' },
    { num: 8, text: '🎙️ READY TO GUIDE' }
  ];

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        
        {/* TOP EMERGENCY HEADER */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleBox}>
            <div className={styles.alertBadgePulse}>
              <AlertTriangle className={styles.alertIcon} size={22} />
            </div>
            <div>
              <div className={styles.headerTagRow}>
                <span className={styles.headerTag}>🚨 LIFE SAFETY MODE</span>
                <span className={styles.liveBeacon}>
                  {isOfflineMode ? (
                    <span className={styles.offlineTag}><WifiOff size={12} /> LIMITED CONNECTIVITY</span>
                  ) : (
                    <span className={styles.liveTag}><Wifi size={12} /> LIVE SYSTEM SIGNAL</span>
                  )}
                </span>
              </div>
              <h2 className={styles.headerTitle}>{hazardType} EMERGENCY GUIDANCE</h2>
            </div>
          </div>

          <div className={styles.headerControls}>
            <button 
              className={styles.voiceControlBtn}
              onClick={() => setIsMuted(!isMuted)}
              title={isMuted ? 'Unmute Voice' : 'Mute Voice'}
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <button className={styles.closeBtn} onClick={onClose} title="Close Safety Mode">
              <X size={22} />
            </button>
          </div>
        </div>

        {/* GUIDED EMERGENCY STEPS ANIMATION BAR */}
        <div className={styles.animStepBar}>
          {emergencySteps.map(st => (
            <div 
              key={st.num} 
              className={`${styles.stepChip} ${activeStepAnim >= st.num ? styles.stepActive : ''}`}
            >
              {st.text}
            </div>
          ))}
        </div>

        {/* MODAL BODY */}
        <div className={styles.modalBody}>

          {/* DANGER SUMMARY BANNER */}
          <div className={styles.dangerCard}>
            <div className={styles.dangerRow}>
              <span className={styles.dangerBadge}>
                🚨 CURRENT DANGER: {safetyData?.current_risk?.level || 'EXTREME'}
              </span>
              <span className={styles.timestamp}>
                SOURCE: {safetyData?.source || 'Global Early Warning Engine'} · {new Date().toLocaleTimeString('en-GB')} IST
              </span>
            </div>
            <h3 className={styles.locationTitle}>📍 {locName}</h3>
            <p className={styles.dangerDesc}>
              {safetyData?.current_risk?.summary || alertData?.message || `${hazardType} alert active. Critical water overflow and precipitation threshold exceeded for monitored coordinates.`}
            </p>

            {/* GPS STATUS & FALLBACK */}
            <div className={styles.gpsRow}>
              <div className={styles.gpsChip}>
                <MapPin size={14} />
                <span>GPS COORDINATES: {locLat.toFixed(4)}° N, {locLng.toFixed(4)}° E</span>
                <span className={styles.gpsAccuracy}>({currentLocation ? 'GPS VERIFIED' : 'DEFAULT REGION'})</span>
              </div>
              {!currentLocation && (
                <div className={styles.gpsFallbackNote}>
                  <Info size={12} />
                  <span>Exact GPS unavailable. Using monitored region baseline.</span>
                </div>
              )}
            </div>
          </div>

          {/* 3-COLUMN EMERGENCY GUIDANCE PANELS */}
          <div className={styles.guidanceGrid}>

            {/* PANEL 1: PROJECTED IMPACT & LOWER-RISK AREA */}
            <div className={styles.panelCard}>
              <div className={styles.panelHeader}>
                <Compass className={styles.panelIconOrange} size={18} />
                <h4>PROJECTED IMPACT & SAFE AREA</h4>
              </div>
              
              <div className={styles.subBlock}>
                <span className={styles.subLabel}>🟠 PROJECTED IMPACT SECTOR (+3H)</span>
                <p className={styles.subValBold}>
                  {safetyData?.projected_impact?.corridor || `${locName} Downstream Corridor`}
                </p>
                <span className={styles.subMeta}>Confidence: {safetyData?.projected_impact?.confidence || 85}% · Propagation active</span>
              </div>

              <div className={styles.subBlockGreen}>
                <span className={styles.subLabelGreen}>🟢 RECOMMENDED LOWER-RISK AREA</span>
                <p className={styles.subValGreen}>
                  {safetyData?.recommended_lower_risk_area?.name || 'High Ridge Sector (Elevated Ground)'}
                </p>
                <div className={styles.metaRow}>
                  <span>Distance: {safetyData?.recommended_lower_risk_area?.distance_km || '2.1'} km</span>
                  <span>Elev Gain: +{safetyData?.recommended_lower_risk_area?.elevation_gain_m || '35'} m</span>
                </div>
                <p className={styles.disclaimerText}>
                  ⚠️ <strong>Disclaimer:</strong> Area designated as <em>"Recommended Lower-Risk Area"</em> based on terrain elevation model. No area can be guaranteed 100% safe.
                </p>
              </div>
            </div>

            {/* PANEL 2: DESIGNATED VERIFIED SHELTER */}
            <div className={styles.panelCard}>
              <div className={styles.panelHeader}>
                <ShieldCheck className={styles.panelIconGreen} size={18} />
                <h4>DESIGNATED EMERGENCY SHELTER</h4>
              </div>

              {safetyData?.designated_shelter ? (
                <div className={styles.shelterBox}>
                  <div className={styles.shelterTop}>
                    <h5 className={styles.shelterName}>{safetyData.designated_shelter.name}</h5>
                    <span className={styles.shelterBadge}>
                      {safetyData.designated_shelter.occupancy_status || 'AVAILABLE'}
                    </span>
                  </div>

                  <div className={styles.shelterDetails}>
                    <div>
                      <span className={styles.detailLabel}>TYPE</span>
                      <span className={styles.detailValue}>{safetyData.designated_shelter.type?.replace(/_/g, ' ')}</span>
                    </div>
                    <div>
                      <span className={styles.detailLabel}>DISTANCE</span>
                      <span className={styles.detailValue}>{safetyData.designated_shelter.distance_km} km</span>
                    </div>
                    <div>
                      <span className={styles.detailLabel}>CAPACITY</span>
                      <span className={styles.detailValue}>{safetyData.designated_shelter.capacity} persons</span>
                    </div>
                    <div>
                      <span className={styles.detailLabel}>SOURCE</span>
                      <span className={styles.detailValue}>{safetyData.designated_shelter.source}</span>
                    </div>
                  </div>

                  {/* Underground shelter suitability check */}
                  {safetyData.designated_shelter.underground && (
                    <div className={`${styles.suitabilityNotice} ${safetyData.designated_shelter.suitability_status === 'NOT RECOMMENDED' ? styles.suitabilityWarning : ''}`}>
                      <Info size={14} />
                      <span>{safetyData.designated_shelter.suitability_note}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.noShelterBox}>
                  <AlertTriangle size={24} className={styles.noShelterIcon} />
                  <p className={styles.noShelterText}>NO VERIFIED SHELTER AVAILABLE FOR THIS LOCATION.</p>
                  <span className={styles.noShelterSub}>Follow local emergency responder directions or proceed to high ground.</span>
                </div>
              )}
            </div>

            {/* PANEL 3: SAFER AVAILABLE ROUTE */}
            <div className={styles.panelCard}>
              <div className={styles.panelHeader}>
                <Navigation className={styles.panelIconBlue} size={18} />
                <h4>SAFER AVAILABLE ROUTE</h4>
              </div>

              <div className={styles.routeStatusHeader}>
                <span className={`${styles.routeStatusPill} ${safetyData?.safer_route?.route_status === 'ROUTE AVAILABLE' ? styles.routeAvailable : styles.routeWarning}`}>
                  {safetyData?.safer_route?.route_status || 'ROUTE AVAILABLE'}
                </span>
                <span className={styles.walkTime}>
                  🚶 ~{safetyData?.safer_route?.estimated_walk_time_mins || 25} mins walk ({safetyData?.safer_route?.distance_km || 1.8} km)
                </span>
              </div>

              <p className={styles.routeDesc}>
                {safetyData?.safer_route?.route_status_message || 'Waypoints detour around primary river inundation chutes towards high ground.'}
              </p>

              <div className={styles.turnList}>
                {safetyData?.safer_route?.turn_by_turn_instructions?.map((inst, i) => (
                  <div key={i} className={styles.turnItem}>
                    <span>{inst}</span>
                  </div>
                )) || (
                  <div className={styles.turnItem}>
                    <span>Proceed uphill away from low-lying drainage channels.</span>
                  </div>
                )}
              </div>

              <button 
                className={styles.mapRouteBtn}
                onClick={() => {
                  onClose();
                  if (onNavigateToMap) onNavigateToMap('flood');
                }}
              >
                🗺️ VIEW ROUTE ON FULL MAP <ArrowUpRight size={14} />
              </button>
            </div>

          </div>

          {/* DISASTER-SPECIFIC RULES BANNER */}
          {safetyData?.disaster_guidance && (
            <div className={styles.rulesBanner}>
              <div className={styles.rulesHeader}>
                <ShieldAlert size={18} />
                <span>IMMEDIATE SAFETY RULES FOR {hazardType}</span>
              </div>
              <div className={styles.rulesGrid}>
                <div>
                  <strong>ACTION:</strong> {safetyData.disaster_guidance.immediate_action}
                </div>
                <div>
                  <strong>DO NOT:</strong> {safetyData.disaster_guidance.do_not}
                </div>
                <div>
                  <strong>GOLDEN RULE:</strong> <em>"{safetyData.disaster_guidance.key_rule}"</em>
                </div>
              </div>
            </div>
          )}

          {/* AI VOICE ASSISTANT BAR & RESCUE DISPATCH SECTION */}
          <div className={styles.bottomSectionGrid}>

            {/* AI VOICE GUIDANCE BAR */}
            <div className={styles.aiVoiceBar}>
              <div className={styles.aiVoiceLeft}>
                <div className={styles.aiAvatarIcon}>🤖</div>
                <div>
                  <h5 className={styles.aiVoiceTitle}>AI EMERGENCY SAFETY GUIDE</h5>
                  <p className={styles.aiVoiceText}>
                    "Emergency warning active for {locName}. I have calculated recommended lower-risk areas and shelter routes."
                  </p>
                </div>
              </div>
              <div className={styles.aiVoiceButtons}>
                <button className={styles.aiActionBtn} onClick={handleReplayVoice}>
                  <Volume2 size={14} /> REPLAY GUIDANCE
                </button>
              </div>
            </div>

            {/* EMERGENCY RESCUE DISPATCH FORM / STATUS */}
            <div className={styles.rescueSection}>
              {!rescueSubmitted ? (
                <div className={styles.rescueForm}>
                  <div className={styles.rescueTitleGroup}>
                    <LifeBuoy className={styles.rescueIcon} size={20} />
                    <div>
                      <h4 className={styles.rescueTitle}>TRAPPED / NEED EMERGENCY RESCUE?</h4>
                      <p className={styles.rescueSub}>Transmit exact GPS coordinates directly to National Emergency Rescue Dispatch.</p>
                    </div>
                  </div>

                  <div className={styles.statusSelectRow}>
                    <label className={styles.selectLabel}>CONDITION:</label>
                    <select 
                      className={styles.statusSelect}
                      value={medicalStatus}
                      onChange={(e) => setMedicalStatus(e.target.value)}
                    >
                      <option value="TRAPPED / UNINJURED">🆘 Trapped / Uninjured</option>
                      <option value="INJURED / IMMEDIATE MEDICAL AID">🚨 Injured / Immediate Medical Aid</option>
                      <option value="EVACUATION ASSISTANCE NEEDED">🚶 Evacuation Assistance Needed</option>
                    </select>
                  </div>

                  <button 
                    className={styles.submitRescueBtn}
                    onClick={handleSendRescue}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'TRANSMITTING RESCUE SIGNAL...' : '🆘 TRANSMIT RESCUE REQUEST'}
                  </button>
                </div>
              ) : (
                <div className={styles.rescueSuccess}>
                  <CheckCircle size={28} className={styles.successIcon} />
                  <div>
                    <h4 className={styles.successTitle}>RESCUE REQUEST QUEUED & TRANSMITTED</h4>
                    <div className={styles.idBox}>
                      <span>RESCUE ID: </span>
                      <strong>{rescueId}</strong>
                    </div>
                    <p className={styles.successSub}>
                      Coordinates ({locLat.toFixed(4)}, {locLng.toFixed(4)}) logged in National Emergency Rescue Dispatch system.
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* EMERGENCY HELPLINES & CONTACTS FOOTER */}
          <div className={styles.contactsRow}>
            <div className={styles.contactsLabel}>
              <PhoneCall size={14} />
              <span>AUTHORIZED EMERGENCY HELPLINES:</span>
            </div>
            <div className={styles.contactsList}>
              <a href="tel:1078" className={styles.contactPill}>NDMA Control: <strong>1078</strong></a>
              <a href="tel:112" className={styles.contactPill}>National Emergency: <strong>112</strong></a>
              <a href="tel:100" className={styles.contactPill}>Police: <strong>100</strong></a>
              <a href="tel:101" className={styles.contactPill}>Fire & Rescue: <strong>101</strong></a>
              <a href="tel:102" className={styles.contactPill}>Ambulance: <strong>102</strong></a>
              <a href="tel:1070" className={styles.contactPill}>State Relief: <strong>1070</strong></a>
            </div>
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className={styles.modalFooter}>
          <span className={styles.footerNote}>
            SIH26192 Multi-Hazard Early Warning & Life Safety Protocol · Ministry of Home Affairs
          </span>
          <button className={styles.closeFooterBtn} onClick={onClose}>
            CLOSE SAFETY MODE
          </button>
        </div>

      </div>
    </div>
  );
};

export default LifeSafetyModal;
