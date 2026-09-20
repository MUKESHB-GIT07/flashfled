import React, { useState, useEffect } from 'react';
import styles from './ResponderDashboard.module.css';
import { 
  ShieldAlert, Radio, User, MapPin, Navigation, Phone, Mail, 
  Send, CheckCircle, RefreshCw, AlertTriangle, LifeBuoy, Clock,
  CheckCheck, UserCheck, Play, Sparkles, Filter, ChevronRight
} from 'lucide-react';
import { 
  fetchRescueRequests, 
  updateRescueStatus, 
  sendRescueMessage, 
  simulateDemoRescue 
} from '../services/api';

const ResponderDashboard = ({ activeLocation }) => {
  const [requests, setRequests] = useState([]);
  const [selectedReq, setSelectedReq] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [chatMessage, setChatMessage] = useState('');
  const [actionNote, setActionNote] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);

  const loadRequests = async () => {
    setIsLoading(true);
    const data = await fetchRescueRequests(statusFilter, priorityFilter);
    if (data && data.requests) {
      setRequests(data.requests);
      if (data.requests.length > 0 && !selectedReq) {
        setSelectedReq(data.requests[0]);
      } else if (selectedReq) {
        const updated = data.requests.find(r => r.rescue_id === selectedReq.rescue_id);
        if (updated) setSelectedReq(updated);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadRequests();
    const interval = setInterval(loadRequests, 8000);
    return () => clearInterval(interval);
  }, [statusFilter, priorityFilter]);

  const handleUpdateStatus = async (newStatus, teamId = null) => {
    if (!selectedReq) return;
    const res = await updateRescueStatus(
      selectedReq.rescue_id, 
      newStatus, 
      'NDMA_DISPATCH_OPERATOR', 
      actionNote || `Status updated to ${newStatus}`,
      teamId
    );
    if (res && res.request) {
      setSelectedReq(res.request);
      setActionNote('');
      loadRequests();
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!selectedReq || !chatMessage.trim()) return;
    const res = await sendRescueMessage(selectedReq.rescue_id, 'NDMA DISPATCH COMMAND', chatMessage.trim());
    if (res && res.message) {
      setChatMessage('');
      loadRequests();
    }
  };

  const handleSimulateDemo = async () => {
    setIsSimulating(true);
    const simRes = await simulateDemoRescue('LANDSLIDE', activeLocation?.name || 'Kedarnath Valley');
    setIsSimulating(false);
    if (simRes) {
      setSelectedReq(simRes);
      loadRequests();
    }
  };

  return (
    <div className={styles.dashboardContainer}>
      
      {/* HEADER BANNER */}
      <div className={styles.headerBanner}>
        <div className={styles.headerTitleBox}>
          <div className={styles.beaconIcon}>
            <Radio size={20} />
          </div>
          <div>
            <div className={styles.tagRow}>
              <span className={styles.agencyTag}>NDMA / SDMA AUTHORIZED DISPATCH</span>
              <span className={styles.demoBadge}>🟣 DEMO / SIMULATION MODE SUPPORTED</span>
            </div>
            <h2 className={styles.title}>RESCUE OPERATIONS CENTER DASHBOARD</h2>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button 
            className={styles.simDemoBtn} 
            onClick={handleSimulateDemo} 
            disabled={isSimulating}
          >
            <Play size={14} /> {isSimulating ? 'SIMULATING...' : '⚡ SIMULATE DEMO RESCUE'}
          </button>
          <button className={styles.refreshBtn} onClick={loadRequests} title="Refresh Requests">
            <RefreshCw size={14} className={isLoading ? styles.spin : ''} /> REFRESH
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <Filter size={14} className={styles.filterIcon} />
          <span>FILTER BY PRIORITY:</span>
          <select 
            className={styles.selectFilter} 
            value={priorityFilter} 
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="">ALL PRIORITIES</option>
            <option value="CRITICAL">🔴 CRITICAL ONLY</option>
            <option value="HIGH">🟠 HIGH ONLY</option>
            <option value="MEDIUM">🟡 MEDIUM ONLY</option>
            <option value="LOW">🟢 LOW ONLY</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <span>FILTER BY STATUS:</span>
          <select 
            className={styles.selectFilter} 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">ALL STATUSES</option>
            <option value="RECEIVED">RECEIVED</option>
            <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
            <option value="DISPATCHED">DISPATCHED</option>
            <option value="EN_ROUTE">EN_ROUTE</option>
            <option value="ARRIVED">ARRIVED</option>
            <option value="RESCUED">RESCUED</option>
          </select>
        </div>

        <div className={styles.countBadge}>
          TOTAL REQUESTS QUEUED: <strong>{requests.length}</strong>
        </div>
      </div>

      {/* MAIN TWO-COLUMN RESPONDER VIEW */}
      <div className={styles.mainGrid}>
        
        {/* LEFT COLUMN: RESCUE REQUEST CARDS LIST */}
        <div className={styles.requestsListCol}>
          <h3 className={styles.colTitle}>ACTIVE EMERGENCY QUEUE ({requests.length})</h3>

          {requests.length === 0 ? (
            <div className={styles.emptyState}>
              <CheckCircle size={32} className={styles.emptyIcon} />
              <p>NO ACTIVE RESCUE REQUESTS</p>
              <span>Click "Simulate Demo Rescue" above to trigger a test emergency workflow.</span>
            </div>
          ) : (
            <div className={styles.cardsScroll}>
              {requests.map((r) => (
                <div 
                  key={r.rescue_id} 
                  className={`${styles.reqCard} ${selectedReq?.rescue_id === r.rescue_id ? styles.reqCardActive : ''} ${styles['prio_' + r.priority.toLowerCase()]}`}
                  onClick={() => setSelectedReq(r)}
                >
                  <div className={styles.reqCardHeader}>
                    <span className={styles.prioTag}>{r.priority}</span>
                    <span className={styles.reqId}>{r.rescue_id}</span>
                    <span className={styles.statusPill}>{r.status}</span>
                  </div>

                  <h4 className={styles.userName}>{r.user_name}</h4>

                  <div className={styles.reqDetailsRow}>
                    <span>📍 {r.location_name}</span>
                    <span>🚨 {r.disaster_type}</span>
                  </div>

                  <div className={styles.reqSubMeta}>
                    <span>Condition: {r.medical_status}</span>
                    <span>{new Date(r.created_at).toLocaleTimeString('en-GB')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: SELECTED REQUEST DETAIL & DISPATCH CONTROL */}
        <div className={styles.detailCol}>
          {selectedReq ? (
            <div className={styles.detailCard}>
              
              {/* TOP SUMMARY BAR */}
              <div className={styles.detailTop}>
                <div>
                  <div className={styles.detailPrioRow}>
                    <span className={styles.prioBadgeLarge}>{selectedReq.priority} PRIORITY</span>
                    <span className={styles.statusBadgeLarge}>{selectedReq.status}</span>
                    <span className={styles.disasterPill}>{selectedReq.disaster_type}</span>
                  </div>
                  <h3 className={styles.detailUser}>{selectedReq.user_name}</h3>
                </div>
                <div className={styles.resIdBox}>
                  <span>RESCUE ID</span>
                  <strong>{selectedReq.rescue_id}</strong>
                </div>
              </div>

              {/* LOCATION & CONTACT METADATA GRID */}
              <div className={styles.metaGrid}>
                <div className={styles.metaBox}>
                  <MapPin size={16} className={styles.metaIconBlue} />
                  <div>
                    <span className={styles.metaLabel}>GPS LOCATION</span>
                    <span className={styles.metaVal}>{selectedReq.latitude.toFixed(4)}° N, {selectedReq.longitude.toFixed(4)}° E</span>
                    <span className={styles.metaSub}>Accuracy: ±{selectedReq.gps_accuracy_m}m ({selectedReq.gps_status})</span>
                  </div>
                </div>

                <div className={styles.metaBox}>
                  <Phone size={16} className={styles.metaIconGreen} />
                  <div>
                    <span className={styles.metaLabel}>VERIFIED CONTACT</span>
                    <span className={styles.metaVal}>{selectedReq.phone}</span>
                    <span className={styles.metaSub}>Network: {selectedReq.network_status} · Battery: {selectedReq.battery_pct}%</span>
                  </div>
                </div>

                <div className={styles.metaBox}>
                  <AlertTriangle size={16} className={styles.metaIconRed} />
                  <div>
                    <span className={styles.metaLabel}>REPORTED CONDITION</span>
                    <span className={styles.metaVal}>{selectedReq.medical_status}</span>
                    <span className={styles.metaSub}>Movement: {selectedReq.movement_state}</span>
                  </div>
                </div>
              </div>

              {/* USER MESSAGE */}
              {selectedReq.message && (
                <div className={styles.userMsgBox}>
                  <span className={styles.userMsgLabel}>USER TRANSMITTED MESSAGE:</span>
                  <p className={styles.userMsgText}>"{selectedReq.message}"</p>
                </div>
              )}

              {/* RESPONDER DISPATCH ACTION BUTTONS */}
              <div className={styles.dispatchActionsSection}>
                <h4 className={styles.sectionHeader}>RESPONDER DISPATCH ACTIONS</h4>
                
                <div className={styles.actionNoteInput}>
                  <input 
                    type="text" 
                    placeholder="Enter dispatch note or team update instructions..." 
                    value={actionNote} 
                    onChange={(e) => setActionNote(e.target.value)} 
                    className={styles.noteInput}
                  />
                </div>

                <div className={styles.actionButtonsGrid}>
                  <button 
                    className={`${styles.actionBtn} ${styles.btnAck}`}
                    onClick={() => handleUpdateStatus('ACKNOWLEDGED')}
                  >
                    <CheckCheck size={14} /> ACKNOWLEDGE SIGNAL
                  </button>

                  <button 
                    className={`${styles.actionBtn} ${styles.btnContact}`}
                    onClick={() => handleUpdateStatus('CONTACTING')}
                  >
                    <Phone size={14} /> CONTACT USER
                  </button>

                  <button 
                    className={`${styles.actionBtn} ${styles.btnDispatch}`}
                    onClick={() => handleUpdateStatus('DISPATCHED', 'NDRF_ALPHA_01')}
                  >
                    <ShieldAlert size={14} /> DISPATCH NDRF TEAM
                  </button>

                  <button 
                    className={`${styles.actionBtn} ${styles.btnRoute}`}
                    onClick={() => handleUpdateStatus('EN_ROUTE')}
                  >
                    <Navigation size={14} /> MARK EN ROUTE
                  </button>

                  <button 
                    className={`${styles.actionBtn} ${styles.btnArrived}`}
                    onClick={() => handleUpdateStatus('ARRIVED')}
                  >
                    <UserCheck size={14} /> MARK ON SCENE
                  </button>

                  <button 
                    className={`${styles.actionBtn} ${styles.btnRescued}`}
                    onClick={() => handleUpdateStatus('RESCUED')}
                  >
                    <CheckCircle size={14} /> MARK RESCUED & RESOLVED
                  </button>
                </div>
              </div>

              {/* TWO-WAY MESSAGING PANEL */}
              <div className={styles.chatSection}>
                <h4 className={styles.sectionHeader}>TWO-WAY RESPONDER COMMUNICATOR</h4>
                <div className={styles.chatHistory}>
                  {selectedReq.messages?.map((m) => (
                    <div 
                      key={m.msg_id} 
                      className={`${styles.chatBubble} ${m.sender === 'USER' ? styles.bubbleUser : styles.bubbleResponder}`}
                    >
                      <div className={styles.bubbleHeader}>
                        <strong>{m.sender}</strong>
                        <span>{new Date(m.timestamp).toLocaleTimeString('en-GB')}</span>
                      </div>
                      <p>{m.text}</p>
                      <span className={styles.deliveryStatus}>✓ {m.delivery_status || 'DELIVERED'}</span>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendMessage} className={styles.chatInputRow}>
                  <input 
                    type="text" 
                    placeholder="Type official responder message to citizen..." 
                    value={chatMessage} 
                    onChange={(e) => setChatMessage(e.target.value)} 
                    className={styles.chatInput}
                  />
                  <button type="submit" className={styles.sendBtn}>
                    <Send size={14} /> SEND
                  </button>
                </form>
              </div>

              {/* TIMELINE AUDIT LOG */}
              <div className={styles.timelineSection}>
                <h4 className={styles.sectionHeader}>RESCUE TIMELINE AUDIT TRAIL</h4>
                <div className={styles.timelineList}>
                  {selectedReq.timeline?.map((t, idx) => (
                    <div key={idx} className={styles.timelineItem}>
                      <span className={styles.tlStatus}>{t.status}</span>
                      <span className={styles.tlTime}>{new Date(t.timestamp).toLocaleTimeString('en-GB')}</span>
                      <span className={styles.tlNote}>{t.note}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div className={styles.noSelectionCard}>
              <Radio size={40} className={styles.noSelectIcon} />
              <h3>SELECT A RESCUE REQUEST</h3>
              <p>Click any queued rescue request on the left panel to inspect details, dispatch responder teams, and issue two-way communications.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ResponderDashboard;
