import React, { useState, useEffect } from 'react';
import styles from './RescueStatusTracker.module.css';
import { 
  CheckCircle, Clock, ShieldAlert, Navigation, Phone, MessageSquare, 
  RefreshCw, MapPin, AlertTriangle, Send, Share2, XCircle, UserCheck
} from 'lucide-react';
import { 
  fetchRescueById, 
  updateRescueLocation, 
  sendRescueMessage, 
  cancelRescueRequest, 
  notifyEmergencyContacts 
} from '../services/api';

const RescueStatusTracker = ({ rescueId, onClose }) => {
  const [rescueData, setRescueData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userMsg, setUserMsg] = useState('');
  const [isNotifyingContacts, setIsNotifyingContacts] = useState(false);
  const [contactsNotified, setContactsNotified] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  const loadStatus = async () => {
    if (!rescueId) return;
    setIsLoading(true);
    const data = await fetchRescueById(rescueId);
    if (data) {
      setRescueData(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 5000);
    return () => clearInterval(interval);
  }, [rescueId]);

  const handleUpdateLocation = async () => {
    if (!navigator.geolocation || !rescueId) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await updateRescueLocation(rescueId, pos.coords.latitude, pos.coords.longitude, 'MOVING');
        loadStatus();
      },
      (err) => console.warn('GPS update failed:', err),
      { enableHighAccuracy: true }
    );
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!rescueId || !userMsg.trim()) return;
    const res = await sendRescueMessage(rescueId, 'USER', userMsg.trim());
    if (res && res.message) {
      setUserMsg('');
      loadStatus();
    }
  };

  const handleNotifyContacts = async () => {
    if (!rescueId) return;
    setIsNotifyingContacts(true);
    const res = await notifyEmergencyContacts(rescueId);
    setIsNotifyingContacts(false);
    if (res && res.success) {
      setContactsNotified(true);
    }
  };

  const handleCancelRescue = async () => {
    if (!rescueId) return;
    await cancelRescueRequest(rescueId, 'User reported safe');
    setCancelConfirmOpen(false);
    loadStatus();
  };

  if (!rescueId) return null;

  const statusSteps = [
    { key: 'REQUESTED', label: 'Signal Transmitted' },
    { key: 'RECEIVED', label: 'Received at Dispatch' },
    { key: 'ACKNOWLEDGED', label: 'Operator Acknowledged' },
    { key: 'CONTACTING', label: 'Responder Contacting' },
    { key: 'DISPATCHED', label: 'Team Dispatched' },
    { key: 'EN_ROUTE', label: 'Team En Route' },
    { key: 'ARRIVED', label: 'Responder On Scene' },
    { key: 'RESCUED', label: 'Rescued & Safe' }
  ];

  const currentStatusIndex = statusSteps.findIndex(s => s.key === rescueData?.status) >= 0
    ? statusSteps.findIndex(s => s.key === rescueData?.status)
    : 1;

  return (
    <div className={styles.trackerContainer}>
      
      {/* HEADER */}
      <div className={styles.header}>
        <div className={styles.headerTitleBox}>
          <div className={styles.beaconBadge}>
            <ShieldAlert size={18} />
          </div>
          <div>
            <span className={styles.headerTag}>RESCUE TRACKING ID: {rescueId}</span>
            <h3 className={styles.title}>LIVE RESCUE STATUS TRACKER</h3>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button className={styles.refreshBtn} onClick={loadStatus} title="Refresh Status">
            <RefreshCw size={14} className={isLoading ? styles.spin : ''} /> REFRESH
          </button>
          {onClose && (
            <button className={styles.closeBtn} onClick={onClose}>
              <XCircle size={18} />
            </button>
          )}
        </div>
      </div>

      {/* BODY */}
      {rescueData && (
        <div className={styles.body}>

          {/* STATUS STEPPER PROGRESS BAR */}
          <div className={styles.stepperBox}>
            <div className={styles.stepperRow}>
              {statusSteps.map((st, i) => (
                <div key={st.key} className={styles.stepCol}>
                  <div className={`${styles.stepDot} ${i <= currentStatusIndex ? styles.stepDotCompleted : ''} ${i === currentStatusIndex ? styles.stepDotActive : ''}`}>
                    {i <= currentStatusIndex ? '✓' : i + 1}
                  </div>
                  <span className={`${styles.stepLabel} ${i <= currentStatusIndex ? styles.stepLabelActive : ''}`}>
                    {st.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* CURRENT STATUS ALERT BOX */}
          <div className={`${styles.statusBanner} ${rescueData.status === 'RESCUED' ? styles.bannerRescued : styles.bannerActive}`}>
            <div className={styles.bannerLeft}>
              <span className={styles.statusTitle}>CURRENT STATUS: <strong>{rescueData.status}</strong></span>
              <p className={styles.statusNote}>
                {rescueData.timeline?.[rescueData.timeline.length - 1]?.note || 'Rescue signal logged in National Emergency Dispatch Registry.'}
              </p>
            </div>
            <div className={styles.bannerRight}>
              <span className={styles.prioTag}>PRIORITY: {rescueData.priority}</span>
              <span className={styles.timeTag}>Updated: {new Date(rescueData.updated_at).toLocaleTimeString('en-GB')}</span>
            </div>
          </div>

          {/* INFORMATION GRID */}
          <div className={styles.infoGrid}>
            <div className={styles.infoBox}>
              <MapPin size={14} className={styles.infoIconBlue} />
              <div>
                <span className={styles.infoLabel}>LOCATION SHARED</span>
                <span className={styles.infoVal}>{rescueData.latitude.toFixed(4)}° N, {rescueData.longitude.toFixed(4)}° E</span>
                <span className={styles.infoSub}>Accuracy: ±{rescueData.gps_accuracy_m}m</span>
              </div>
            </div>

            <div className={styles.infoBox}>
              <Phone size={14} className={styles.infoIconGreen} />
              <div>
                <span className={styles.infoLabel}>VERIFIED CONTACT</span>
                <span className={styles.infoVal}>{rescueData.phone}</span>
                <span className={styles.infoSub}>Battery: {rescueData.battery_pct}%</span>
              </div>
            </div>

            <div className={styles.infoBox}>
              <ShieldAlert size={14} className={styles.infoIconRed} />
              <div>
                <span className={styles.infoLabel}>ASSIGNED TEAM</span>
                <span className={styles.infoVal}>{rescueData.assigned_team || 'DISPATCHING TEAM...'}</span>
                <span className={styles.infoSub}>Disaster: {rescueData.disaster_type}</span>
              </div>
            </div>
          </div>

          {/* TWO-WAY MESSAGING CHANNEL */}
          <div className={styles.chatBox}>
            <h4 className={styles.chatTitle}>
              <MessageSquare size={14} /> RESPONDER TWO-WAY COMMUNICATOR
            </h4>
            
            <div className={styles.msgList}>
              {rescueData.messages?.map((m) => (
                <div 
                  key={m.msg_id} 
                  className={`${styles.msgBubble} ${m.sender === 'USER' ? styles.bubbleUser : styles.bubbleResponder}`}
                >
                  <div className={styles.msgHeader}>
                    <strong>{m.sender}</strong>
                    <span>{new Date(m.timestamp).toLocaleTimeString('en-GB')}</span>
                  </div>
                  <p>{m.text}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className={styles.msgForm}>
              <input 
                type="text" 
                placeholder="Type update message to rescue team..." 
                value={userMsg} 
                onChange={(e) => setUserMsg(e.target.value)} 
                className={styles.msgInput}
              />
              <button type="submit" className={styles.msgSendBtn}>
                <Send size={14} />
              </button>
            </form>
          </div>

          {/* ACTION BUTTONS */}
          <div className={styles.actionsBar}>
            <button className={styles.gpsUpdateBtn} onClick={handleUpdateLocation}>
              <Navigation size={14} /> SHARE UPDATED GPS LOCATION
            </button>

            <button 
              className={styles.notifyBtn} 
              onClick={handleNotifyContacts}
              disabled={isNotifyingContacts || contactsNotified}
            >
              <Share2 size={14} /> {contactsNotified ? '✅ CONTACTS NOTIFIED' : isNotifyingContacts ? 'SENDING...' : '📢 NOTIFY EMERGENCY CONTACTS'}
            </button>

            <button className={styles.cancelBtn} onClick={() => setCancelConfirmOpen(true)}>
              I AM SAFE / CANCEL
            </button>
          </div>

          {/* CANCEL CONFIRMATION MODAL OVERLAY */}
          {cancelConfirmOpen && (
            <div className={styles.cancelOverlay}>
              <div className={styles.cancelDialog}>
                <h4>CANCEL RESCUE REQUEST?</h4>
                <p>Are you sure you want to cancel this emergency rescue request? Confirm only if you are in a safe location.</p>
                <div className={styles.cancelDialogBtns}>
                  <button className={styles.confirmCancelBtn} onClick={handleCancelRescue}>
                    YES, I AM SAFE — CANCEL
                  </button>
                  <button className={styles.keepRescueBtn} onClick={() => setCancelConfirmOpen(false)}>
                    KEEP RESCUE REQUEST ACTIVE
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default RescueStatusTracker;
