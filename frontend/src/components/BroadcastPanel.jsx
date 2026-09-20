import React, { useState, useEffect, useCallback } from 'react';
import styles from './BroadcastPanel.module.css';
import { API_BASE_URL } from '../services/api';
import {
  MessageSquare,
  Smartphone,
  Globe,
  FileText,
  Radio,
  Tv,
  AlertTriangle,
  Volume2,
  CheckCircle,
  XCircle,
  Copy,
  Activity,
  PlayCircle,
  ShieldAlert,
  Loader
} from 'lucide-react';

const DEFAULT_CHANNELS = [
  { id: 'sms', name: 'SMS', status: 'CONNECTED', lastAction: '10m ago' },
  { id: 'push', name: 'Push', status: 'CONNECTED', lastAction: '12m ago' },
  { id: 'web', name: 'Web', status: 'CONNECTED', lastAction: '2m ago' },
  { id: 'cap', name: 'CAP', status: 'DEMO', lastAction: 'Never' },
  { id: 'radio', name: 'Radio', status: 'CONNECTED', lastAction: 'Ready' },
  { id: 'tv', name: 'TV/Media', status: 'NOT CONFIGURED', lastAction: '-' },
  { id: 'siren', name: 'Siren', status: 'DEMO', lastAction: '1h ago' },
];

function normalizeChannelData(raw) {
  if (!raw) return DEFAULT_CHANNELS;

  const channelsData = raw.channels || raw;

  if (Array.isArray(channelsData)) {
    return channelsData.map((ch, idx) => {
      if (typeof ch === 'object' && ch !== null) {
        return {
          id: ch.id || ch.name || `ch-${idx}`,
          name: ch.name || ch.id || 'Channel',
          status: ch.status || 'CONNECTED',
          lastAction: ch.lastAction || ch.last_action || 'Active'
        };
      }
      return null;
    }).filter(Boolean);
  }

  if (typeof channelsData === 'object' && channelsData !== null) {
    const channelNameMap = {
      sms: 'SMS',
      push: 'Push',
      web: 'Web',
      cap: 'CAP',
      radio: 'Radio',
      tv: 'TV/Media',
      siren: 'Siren'
    };
    const list = Object.entries(channelsData).map(([key, val]) => {
      const statusStr = typeof val === 'string' ? val : (val?.status || 'CONNECTED');
      const lastActionStr = typeof val === 'object' && val !== null ? (val.lastAction || val.last_action || 'Active') : 'Active';
      const nameStr = channelNameMap[key.toLowerCase()] || (key.toUpperCase() === 'TV' ? 'TV/Media' : key.charAt(0).toUpperCase() + key.slice(1));
      return {
        id: key,
        name: nameStr,
        status: statusStr,
        lastAction: lastActionStr
      };
    });
    if (list.length > 0) return list;
  }

  return DEFAULT_CHANNELS;
}

export default function BroadcastPanel({ activeLocation }) {
  // Status state
  const [channelStatus, setChannelStatus] = useState(DEFAULT_CHANNELS);
  const [sirenZones, setSirenZones] = useState([]);
  
  // Composer state
  const [eventType, setEventType] = useState('FLOOD');
  const [severity, setSeverity] = useState('SEVERE');
  const [region, setRegion] = useState(activeLocation?.name || '');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  
  // CAP Generation state
  const [capXml, setCapXml] = useState('');
  const [capValid, setCapValid] = useState(null);
  const [isGeneratingCap, setIsGeneratingCap] = useState(false);

  // Media Generation state
  const [mediaOutput, setMediaOutput] = useState('');
  const [mediaType, setMediaType] = useState('');
  
  // Simulation state
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationSteps, setSimulationSteps] = useState([]);

  // Fetch status on mount
  useEffect(() => {
    fetchChannelStatus();
    fetchSirenZones();
  }, []);

  // Update region if activeLocation changes
  useEffect(() => {
    if (activeLocation?.name) {
      setRegion(activeLocation.name);
    }
  }, [activeLocation]);

  const fetchChannelStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/broadcast/status`);
      if (response.ok) {
        const data = await response.json();
        setChannelStatus(normalizeChannelData(data));
      } else {
        setChannelStatus(DEFAULT_CHANNELS);
      }
    } catch (error) {
      console.warn('Failed to fetch channel status', error);
      setChannelStatus(DEFAULT_CHANNELS);
    }
  };

  const fetchSirenZones = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/broadcast/siren/zones`);
      if (response.ok) {
        const data = await response.json();
        const zonesList = Array.isArray(data.zones) ? data.zones : (Array.isArray(data) ? data : []);
        setSirenZones(zonesList);
      } else {
        setSirenZones([
          { id: 'S-01', village: 'North Sector', status: 'ONLINE', coverage: 'High' },
          { id: 'S-02', village: 'Coastal Area', status: 'ONLINE', coverage: 'Medium' },
        ]);
      }
    } catch (error) {
      console.warn('Failed to fetch siren zones', error);
      setSirenZones([]);
    }
  };

  const generateCAP = (e) => {
    e.preventDefault();
    setIsGeneratingCap(true);
    setCapValid(null);
    
    // Simulate generation delay
    setTimeout(() => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>DEMO-CAP-${Date.now()}</identifier>
  <sender>systems@flashflood.gov</sender>
  <sent>${new Date().toISOString()}</sent>
  <status>Actual</status>
  <msgType>Alert</msgType>
  <scope>Public</scope>
  <info>
    <category>Met</category>
    <event>${eventType}</event>
    <urgency>Immediate</urgency>
    <severity>${severity}</severity>
    <certainty>Observed</certainty>
    <area>
      <areaDesc>${region}</areaDesc>
    </area>
    <description>${description || 'No description provided.'}</description>
    <instruction>${instructions || 'Follow official instructions.'}</instruction>
  </info>
</alert>`;
      setCapXml(xml);
      setCapValid(true);
      setIsGeneratingCap(false);
    }, 1500);
  };

  const handleMediaGeneration = (type) => {
    setMediaType(type);
    setMediaOutput('Generating content...');
    setTimeout(() => {
      if (type === 'Radio') {
        setMediaOutput(`[BEEP BEEP BEEP] Emergency broadcast for ${region}. A ${severity} ${eventType} warning has been issued. ${description} Please take immediate precautions. ${instructions}`);
      } else if (type === 'TV') {
        setMediaOutput(`EMERGENCY BULLETIN: ${eventType} in ${region}\nSEVERITY: ${severity}\n\nDetails: ${description}\nInstructions: ${instructions}`);
      } else if (type === 'Social') {
        setMediaOutput(`🚨 EMERGENCY WARNING [${severity}]: ${eventType} alert for ${region}. Take safety precautions immediately. Instructions: ${instructions} #EmergencyAlert #${region.replace(/\s+/g, '')}`);
      } else {
        setMediaOutput(`OFFICIAL MEDIA ADVISORY\nIssued for: ${region}\nHazard: ${eventType}\nSeverity: ${severity}\n\nSUMMARY:\n${description}\n\nPUBLIC SAFETY ACTION REQUIRED:\n${instructions}`);
      }
    }, 1000);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(mediaOutput);
  };

  const testSiren = async () => {
    try {
      await fetch(`${API_BASE_URL}/broadcast/siren/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer DEMO_AUTH'
        },
        body: JSON.stringify({ auth_token: 'DEMO_AUTH' })
      });
      alert('Siren test command sent to gateway.');
    } catch (e) {
      alert('Failed to send siren test command.');
    }
  };

  const simulateWarning = async () => {
    setIsSimulating(true);
    setSimulationSteps([]);
    try {
      const response = await fetch(`${API_BASE_URL}/broadcast/simulate-warning`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType, severity, region })
      });
      
      let data;
      if (response.ok) {
        data = await response.json();
      } else {
        // Mock timeline
        data = {
          steps: [
            { time: 'T+0s', message: 'CAP Message Generated and Signed', status: 'success' },
            { time: 'T+2s', message: 'SMS Dispatched to 15,200 users', status: 'success' },
            { time: 'T+3s', message: 'Push Notifications Pushed to Devices', status: 'success' },
            { time: 'T+5s', message: 'Sirens Activated in Coastal Zones', status: 'success' },
            { time: 'T+8s', message: 'Radio/TV Intercept Handshake Sent', status: 'success' },
          ]
        };
      }

      // Progressively show steps
      if (data && data.steps) {
        data.steps.forEach((step, idx) => {
          setTimeout(() => {
            setSimulationSteps(prev => [...prev, step]);
            if (idx === data.steps.length - 1) {
              setIsSimulating(false);
            }
          }, (idx + 1) * 1000);
        });
      }
    } catch (e) {
      setSimulationSteps([{ time: 'T+0s', message: 'Simulation Failed', status: 'error' }]);
      setIsSimulating(false);
    }
  };

  const getChannelIcon = (name) => {
    switch (name.toLowerCase()) {
      case 'sms': return <MessageSquare />;
      case 'push': return <Smartphone />;
      case 'web': return <Globe />;
      case 'cap': return <FileText />;
      case 'radio': return <Radio />;
      case 'tv/media': return <Tv />;
      case 'siren': return <Volume2 />;
      default: return <Activity />;
    }
  };

  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.headerIconWrapper}>
          <Radio className={styles.headerIcon} />
        </div>
        <div className={styles.headerText}>
          <h2 className={styles.title}>PUBLIC WARNING OPERATIONS</h2>
          <p className={styles.subtitle}>Multi-Channel Emergency Alert Distribution Center</p>
        </div>
      </header>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}><ShieldAlert className={styles.iconSm} /> ACTIVE ALERT COMPOSER</h3>
        <form onSubmit={generateCAP} className={styles.composerForm}>
          <div className={styles.formRow}>
            <div className={styles.inputGroup}>
              <label>Event Type</label>
              <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
                {['FLOOD', 'EARTHQUAKE', 'LANDSLIDE', 'CYCLONE', 'TSUNAMI', 'VOLCANO', 'WILDFIRE', 'SNOW'].map(e => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>
            <div className={styles.inputGroup}>
              <label>Severity</label>
              <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
                {['EXTREME', 'SEVERE', 'MODERATE', 'MINOR'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className={styles.inputGroup}>
              <label>Region</label>
              <input type="text" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Affected Area" required />
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.inputGroup}>
              <label>Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows="3" placeholder="Describe the emergency..." required></textarea>
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.inputGroup}>
              <label>Instructions</label>
              <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows="2" placeholder="Actionable instructions for public..." required></textarea>
            </div>
          </div>
          
          <button type="submit" className={styles.generateBtn} disabled={isGeneratingCap}>
            {isGeneratingCap ? <Loader className={styles.spinIcon} /> : <FileText />} GENERATE CAP MESSAGE
          </button>
        </form>

        {capValid !== null && (
          <div className={styles.capOutputArea}>
            <div className={capValid ? styles.capValidStatus : styles.capInvalidStatus}>
              {capValid ? <><CheckCircle size={16} /> CAP VALID</> : <><XCircle size={16} /> CAP INVALID</>}
            </div>
            <div className={styles.codeBlock}>
              <pre>{capXml}</pre>
            </div>
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}><Activity className={styles.iconSm} /> BROADCAST CHANNEL STATUS</h3>
        <div className={styles.channelGrid}>
          {(Array.isArray(channelStatus) ? channelStatus : normalizeChannelData(channelStatus)).map((channel, idx) => (
            <div key={channel.id || channel.name || idx} className={styles.channelCard}>
              <div className={styles.channelHeader}>
                {getChannelIcon(channel.name || '')}
                <span className={styles.channelName}>{channel.name}</span>
              </div>
              <div className={styles.channelBody}>
                <span className={`${styles.statusBadge} ${styles['status' + (channel.status || '').replace(/\s+/g, '')] || ''}`}>
                  {channel.status}
                </span>
                <span className={styles.lastAction}>{channel.lastAction}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}><Tv className={styles.iconSm} /> MEDIA GENERATION CENTER</h3>
        <div className={styles.mediaButtons}>
          <button onClick={() => handleMediaGeneration('Radio')} className={styles.secondaryBtn}>Generate Radio Script</button>
          <button onClick={() => handleMediaGeneration('TV')} className={styles.secondaryBtn}>Generate TV Bulletin</button>
          <button onClick={() => handleMediaGeneration('Media')} className={styles.secondaryBtn}>Generate Media Bulletin</button>
          <button onClick={() => handleMediaGeneration('Social')} className={styles.secondaryBtn}>Generate Social Media Text</button>
        </div>
        
        {mediaOutput && (
          <div className={styles.mediaOutputContainer}>
            <div className={styles.mediaOutputHeader}>
              <span className={styles.mediaTypeTag}>[DEMO DATA] {mediaType} Output</span>
              <button onClick={copyToClipboard} className={styles.iconBtn} title="Copy to clipboard"><Copy size={14} /></button>
            </div>
            <div className={styles.mediaOutputText}>
              {mediaOutput}
            </div>
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}><Volume2 className={styles.iconSm} /> AUTHORIZED SIREN GATEWAY</h3>
        <div className={styles.sirenInfoBox}>
          <AlertTriangle size={16} className={styles.warningIcon} />
          <span>Physical siren activation requires authorized gateway configuration</span>
        </div>
        <div className={styles.sirenControls}>
          <div className={styles.tableWrapper}>
            <table className={styles.sirenTable}>
              <thead>
                <tr>
                  <th>Village</th>
                  <th>Siren ID</th>
                  <th>Status</th>
                  <th>Coverage</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(sirenZones) ? sirenZones : []).map((zone, idx) => (
                  <tr key={zone.id || idx}>
                    <td>{zone.village}</td>
                    <td>{zone.id}</td>
                    <td><span className={styles.sirenStatus}>{zone.status}</span></td>
                    <td>{zone.coverage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.sirenActions}>
            <div className={`${styles.statusBadge} ${styles.statusDEMO}`}>DEMO MODE</div>
            <button onClick={testSiren} className={styles.testSirenBtn}>TEST SIRENS</button>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <button onClick={simulateWarning} className={styles.simulateBtn} disabled={isSimulating}>
          <PlayCircle size={24} />
          🟣 SIMULATE COMPLETE PUBLIC WARNING
        </button>
        
        {simulationSteps.length > 0 && (
          <div className={styles.timeline}>
            {simulationSteps.map((step, idx) => (
              <div key={idx} className={styles.timelineStep}>
                <div className={styles.timelineDot}></div>
                <div className={styles.timelineTime}>{step.time}</div>
                <div className={styles.timelineMessage}>{step.message}</div>
              </div>
            ))}
            {isSimulating && (
              <div className={styles.timelineStep}>
                <div className={styles.timelineDotLoading}></div>
                <div className={styles.timelineMessage}>Processing next step...</div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
