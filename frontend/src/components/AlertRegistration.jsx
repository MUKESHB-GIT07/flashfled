import React, { useState, useEffect } from 'react';
import styles from './AlertRegistration.module.css';
import {
  Phone,
  ShieldCheck,
  Smartphone,
  Send,
  CheckCircle2,
  AlertTriangle,
  History,
  Settings2,
  Globe,
  Lock,
  RefreshCw,
  BellRing,
  Radio,
  Apple,
  Trash2,
  Bell
} from 'lucide-react';
import {
  getSMSStatus,
  getCountryCodes,
  registerPhone,
  verifyPhone,
  subscribeSMS,
  sendDemoSMS,
  getSMSDeliveryHistory,
  getPushStatus,
  registerPushDevice,
  unregisterPushDevice,
  getRegisteredPushDevices,
  sendTestPush,
  getPushDeliveryHistory
} from '../services/api';

export default function AlertRegistration({ activeLocation }) {
  const [smsStatus, setSmsStatus] = useState({ status: 'DEMO', provider: 'DEMO_SIMULATOR', is_configured: false });
  const [pushStatus, setPushStatus] = useState({
    overall_status: 'DEMO',
    platforms: {
      web: { status: 'DEMO', is_configured: false },
      android: { status: 'DEMO', is_configured: false },
      ios: { status: 'DEMO', is_configured: false, supports_critical_alerts: true }
    }
  });

  const [countryCodes, setCountryCodes] = useState([
    { code: "+91", country: "India", flag: "🇮🇳" },
    { code: "+1", country: "USA / Canada", flag: "🇺🇸" },
    { code: "+44", country: "United Kingdom", flag: "🇬🇧" },
    { code: "+81", country: "Japan", flag: "🇯🇵" },
    { code: "+61", country: "Australia", flag: "🇦🇺" },
    { code: "+977", country: "Nepal", flag: "🇳🇵" },
  ]);

  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [demoOtp, setDemoOtp] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const [profile, setProfile] = useState(null);

  // Alert preferences
  const [selectedDisasters, setSelectedDisasters] = useState([
    "FLOOD", "HEAVY_RAIN", "LANDSLIDE", "EARTHQUAKE", "TSUNAMI", "CYCLONE", "WILDFIRE"
  ]);
  const [minSeverity, setMinSeverity] = useState('HIGH');
  const [language, setLanguage] = useState('en');
  const [smsEnabled, setSmsEnabled] = useState(true);

  // Push & Devices state
  const [registeredDevices, setRegisteredDevices] = useState([]);
  const [browserPermission, setBrowserPermission] = useState('default');
  const [pushLogs, setPushLogs] = useState([]);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [demoSmsPreview, setDemoSmsPreview] = useState(null);
  const [deliveryLogs, setDeliveryLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('register'); // 'register' | 'push' | 'preferences' | 'logs'

  useEffect(() => {
    loadSMSStatus();
    loadPushStatus();
    loadDeliveryHistory();
    loadRegisteredDevices();
    checkBrowserPushPermission();
  }, []);

  const loadSMSStatus = async () => {
    const statusData = await getSMSStatus();
    setSmsStatus(statusData);
  };

  const loadPushStatus = async () => {
    const pData = await getPushStatus();
    setPushStatus(pData);
  };

  const loadDeliveryHistory = async () => {
    const smsData = await getSMSDeliveryHistory();
    if (smsData && smsData.history) setDeliveryLogs(smsData.history);

    const pushData = await getPushDeliveryHistory();
    if (pushData && pushData.history) setPushLogs(pushData.history);
  };

  const loadRegisteredDevices = async () => {
    const data = await getRegisteredPushDevices();
    if (data && data.devices) setRegisteredDevices(data.devices);
  };

  const checkBrowserPushPermission = () => {
    if ('Notification' in window) {
      setBrowserPermission(Notification.permission);
    } else {
      setBrowserPermission('unsupported');
    }
  };

  const requestBrowserPushPermission = async () => {
    if (!('Notification' in window)) {
      setFeedback({ type: 'error', message: 'Web Push notifications are not supported by this browser.' });
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      setBrowserPermission(perm);
      if (perm === 'granted') {
        // Register Web Device token with backend
        const devId = `web_browser_${Date.now()}`;
        const res = await registerPushDevice({
          device_id: devId,
          platform: 'WEB',
          push_token: `vapid_token_${Date.now()}`,
          language,
          minimum_severity: minSeverity
        });
        if (res.success) {
          setFeedback({ type: 'success', message: '✓ Browser Push Notifications enabled and registered!' });
          loadRegisteredDevices();
        }
      } else if (perm === 'denied') {
        setFeedback({ type: 'error', message: 'Browser notification permission was blocked.' });
      }
    } catch (e) {
      setFeedback({ type: 'error', message: 'Failed to request notification permission.' });
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!phoneNumber || phoneNumber.length < 6) {
      setFeedback({ type: 'error', message: 'Please enter a valid numeric phone number.' });
      return;
    }
    setLoading(true);
    setFeedback(null);

    const res = await registerPhone({
      country_code: countryCode,
      phone_number: phoneNumber,
      language,
      location: activeLocation?.name || 'Global'
    });

    setLoading(false);
    if (res.success) {
      setOtpStep(true);
      if (res.demo_otp) {
        setDemoOtp(res.demo_otp);
      }
      setFeedback({ type: 'success', message: res.message });
    } else {
      setFeedback({ type: 'error', message: res.message || 'Registration failed.' });
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!otp || otp.length < 6) {
      setFeedback({ type: 'error', message: 'Please enter a 6-digit OTP code.' });
      return;
    }
    setLoading(true);
    setFeedback(null);

    const res = await verifyPhone({
      country_code: countryCode,
      phone_number: phoneNumber,
      otp
    });

    setLoading(false);
    if (res.success) {
      setIsVerified(true);
      setProfile(res.profile);
      setOtpStep(false);
      setFeedback({ type: 'success', message: '✓ Phone verified successfully! Emergency SMS alerts active.' });
      loadSMSStatus();
      loadDeliveryHistory();
    } else {
      setFeedback({ type: 'error', message: res.message || 'Verification failed.' });
    }
  };

  const handleUpdatePreferences = async () => {
    if (!isVerified) return;
    setLoading(true);
    setFeedback(null);

    const res = await subscribeSMS({
      country_code: countryCode,
      phone_number: phoneNumber,
      disaster_types: selectedDisasters,
      minimum_severity: minSeverity,
      language,
      sms_enabled: smsEnabled,
      alert_areas: ['HOME', activeLocation?.name || 'Global']
    });

    setLoading(false);
    if (res.success) {
      setFeedback({ type: 'success', message: 'SMS Alert preferences updated successfully.' });
    } else {
      setFeedback({ type: 'error', message: res.message || 'Failed to update preferences.' });
    }
  };

  const handleSendTestSMS = async () => {
    setLoading(true);
    const res = await sendDemoSMS({
      country_code: countryCode,
      phone_number: phoneNumber || '9876543210',
      hazard_type: selectedDisasters[0] || 'FLOOD',
      location: activeLocation?.name || 'Chennai',
      severity: minSeverity,
      projected_next_region: `${activeLocation?.name || 'Chennai'} Downstream Sector (+3H)`
    });
    setLoading(false);
    if (res && res.success) {
      setDemoSmsPreview(res.sms_preview);
      setFeedback({ type: 'success', message: 'Demo SMS generated successfully.' });
      loadDeliveryHistory();
    }
  };

  const handleSendTestPush = async (platform = 'WEB') => {
    setLoading(true);
    const res = await sendTestPush(platform);
    setLoading(false);
    if (res && res.success) {
      setFeedback({ type: 'success', message: `✓ Test ${platform} Push Notification dispatched!` });
      loadDeliveryHistory();
    }
  };

  const handleRemoveDevice = async (deviceId) => {
    const res = await unregisterPushDevice(deviceId);
    if (res.success) {
      setFeedback({ type: 'success', message: 'Device removed successfully.' });
      loadRegisteredDevices();
    }
  };

  const toggleDisaster = (type) => {
    if (selectedDisasters.includes(type)) {
      setSelectedDisasters(selectedDisasters.filter((d) => d !== type));
    } else {
      setSelectedDisasters([...selectedDisasters, type]);
    }
  };

  const disasterOptions = [
    { id: 'FLOOD', label: 'Flood' },
    { id: 'HEAVY_RAIN', label: 'Heavy Rain' },
    { id: 'LANDSLIDE', label: 'Landslide' },
    { id: 'EARTHQUAKE', label: 'Earthquake' },
    { id: 'TSUNAMI', label: 'Tsunami' },
    { id: 'VOLCANO', label: 'Volcano' },
    { id: 'WILDFIRE', label: 'Wildfire' },
    { id: 'CYCLONE', label: 'Cyclone' },
    { id: 'SNOW_AVALANCHE', label: 'Snow / Avalanche' },
  ];

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <div className={styles.iconBadge}>
            <Smartphone className={styles.mainIcon} />
          </div>
          <div>
            <div className={styles.sectionTag}>PHASES 7 & 8 • EMERGENCY NOTIFICATIONS</div>
            <h2 className={styles.title}>PHONE REGISTRATION & MOBILE PUSH PLATFORM</h2>
          </div>
        </div>

        {/* Carrier Status Badge */}
        <div className={styles.statusGroup}>
          <div className={`${styles.statusBadge} ${smsStatus.is_configured ? styles.statusConnected : styles.statusDemo}`}>
            <div className={styles.statusDot} />
            <span>SMS: {smsStatus.is_configured ? 'ONLINE (TWILIO)' : 'DEMO MODE'}</span>
          </div>
          <div className={`${styles.statusBadge} ${pushStatus.overall_status === 'CONNECTED' ? styles.statusConnected : styles.statusDemo}`}>
            <div className={styles.statusDot} />
            <span>PUSH: {pushStatus.overall_status === 'CONNECTED' ? 'ONLINE' : 'DEMO MODE'}</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className={styles.tabNav}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'register' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('register')}
        >
          <Phone size={16} /> Phone / SMS Verification
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'push' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('push')}
        >
          <Radio size={16} /> Mobile Push (Web/FCM/APNs)
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'preferences' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          <Settings2 size={16} /> Disaster Preferences
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'logs' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          <History size={16} /> Delivery Logs ({deliveryLogs.length + pushLogs.length})
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className={`${styles.feedback} ${feedback.type === 'error' ? styles.feedbackError : styles.feedbackSuccess}`}>
          {feedback.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* TAB 1: PHONE REGISTRATION & OTP */}
      {activeTab === 'register' && (
        <div className={styles.cardSection}>
          {!isVerified ? (
            <div className={styles.formContainer}>
              <div className={styles.infoBox}>
                <Lock size={18} className={styles.infoIcon} />
                <p>
                  Register your phone to receive instant emergency SMS warnings when high-risk disasters threaten your monitored areas. Phone numbers are stored with OTP verification and masked for privacy.
                </p>
              </div>

              {!otpStep ? (
                <form onSubmit={handleRegister} className={styles.registerForm}>
                  <div className={styles.inputGrid}>
                    <div className={styles.fieldGroup}>
                      <label>Country Code</label>
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className={styles.selectInput}
                      >
                        {countryCodes.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.flag} {c.country} ({c.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.fieldGroup}>
                      <label>Phone Number</label>
                      <div className={styles.phoneInputWrapper}>
                        <span className={styles.codePrefix}>{countryCode}</span>
                        <input
                          type="tel"
                          placeholder="e.g. 9876543210"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className={styles.textInput}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className={styles.actionRow}>
                    <button type="submit" disabled={loading} className={styles.primaryBtn}>
                      {loading ? <RefreshCw className={styles.spin} size={16} /> : <Send size={16} />}
                      SEND VERIFICATION OTP
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleVerify} className={styles.otpForm}>
                  <div className={styles.otpNotice}>
                    <p>Enter the 6-digit OTP code sent to <strong>{countryCode} {phoneNumber}</strong></p>
                    {demoOtp && (
                      <div className={styles.demoOtpHint}>
                        ⚡ DEMO MODE OTP CODE: <strong>{demoOtp}</strong>
                      </div>
                    )}
                  </div>

                  <div className={styles.otpInputGroup}>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="• • • • • •"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className={styles.otpInput}
                      required
                    />
                  </div>

                  <div className={styles.actionRow}>
                    <button type="submit" disabled={loading} className={styles.successBtn}>
                      {loading ? <RefreshCw className={styles.spin} size={16} /> : <ShieldCheck size={16} />}
                      VERIFY OTP & ENABLE ALERTS
                    </button>
                    <button
                      type="button"
                      onClick={() => setOtpStep(false)}
                      className={styles.secondaryBtn}
                    >
                      Back
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className={styles.verifiedCard}>
              <div className={styles.verifiedHeader}>
                <CheckCircle2 size={32} className={styles.checkIcon} />
                <div>
                  <h3>Phone Number Verified & Active</h3>
                  <p className={styles.maskedNumber}>
                    Monitored Number: <strong>{profile?.masked_phone || `${countryCode}******${phoneNumber.slice(-4)}`}</strong>
                  </p>
                </div>
              </div>

              <div className={styles.verifiedMeta}>
                <div><strong>Primary Area:</strong> {activeLocation?.name || 'Chennai'}</div>
                <div><strong>Verified At:</strong> {new Date().toLocaleDateString()}</div>
                <div><strong>SMS Status:</strong> {smsEnabled ? 'ACTIVE ✓' : 'DISABLED'}</div>
              </div>

              <div className={styles.actionRow}>
                <button onClick={handleSendTestSMS} disabled={loading} className={styles.primaryBtn}>
                  <BellRing size={16} /> SEND TEST SMS
                </button>
                <button onClick={() => setIsVerified(false)} className={styles.secondaryBtn}>
                  Change Phone Number
                </button>
              </div>

              {demoSmsPreview && (
                <div className={styles.smsPreviewBox}>
                  <div className={styles.smsPreviewHeader}>📱 GENERATED EMERGENCY SMS PREVIEW</div>
                  <pre className={styles.smsText}>{demoSmsPreview}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MOBILE PUSH (WEB / FCM / APNS) */}
      {activeTab === 'push' && (
        <div className={styles.cardSection}>
          <h3 className={styles.subTitle}>Multi-Platform Push Notification Channels</h3>
          <p className={styles.sectionDesc}>Receive real-time push alerts on your desktop browser, Android app, and iOS devices with iOS Critical Alert entitlement mapping.</p>

          {/* Carrier Status Grid */}
          <div className={styles.pushPlatformsGrid}>
            {/* WEB PUSH */}
            <div className={styles.platformCard}>
              <div className={styles.platformHeader}>
                <Globe size={24} className={styles.platformIconWeb} />
                <div>
                  <div className={styles.platformName}>Web Push (VAPID)</div>
                  <div className={styles.platformProvider}>Service Worker API</div>
                </div>
              </div>
              <div className={styles.platformMeta}>
                <div>Status: <span className={styles.badgeDemo}>{pushStatus.platforms.web.status}</span></div>
                <div>Permission: <strong style={{ textTransform: 'uppercase' }}>{browserPermission}</strong></div>
              </div>
              <button
                onClick={requestBrowserPushPermission}
                disabled={browserPermission === 'granted'}
                className={browserPermission === 'granted' ? styles.secondaryBtn : styles.primaryBtn}
              >
                {browserPermission === 'granted' ? '✓ PERMISSION GRANTED' : 'ENABLE BROWSER PUSH'}
              </button>
            </div>

            {/* ANDROID FCM */}
            <div className={styles.platformCard}>
              <div className={styles.platformHeader}>
                <Smartphone size={24} className={styles.platformIconAndroid} />
                <div>
                  <div className={styles.platformName}>Android Push (FCM)</div>
                  <div className={styles.platformProvider}>Firebase Cloud Messaging</div>
                </div>
              </div>
              <div className={styles.platformMeta}>
                <div>Status: <span className={styles.badgeDemo}>{pushStatus.platforms.android.status}</span></div>
                <div>Channel: <strong>High Priority Siren</strong></div>
              </div>
              <button onClick={() => handleSendTestPush('ANDROID')} disabled={loading} className={styles.secondaryBtn}>
                TEST ANDROID FCM
              </button>
            </div>

            {/* IOS APNS */}
            <div className={styles.platformCard}>
              <div className={styles.platformHeader}>
                <Apple size={24} className={styles.platformIconIos} />
                <div>
                  <div className={styles.platformName}>iOS Push (APNs)</div>
                  <div className={styles.platformProvider}>Apple Push Service</div>
                </div>
              </div>
              <div className={styles.platformMeta}>
                <div>Status: <span className={styles.badgeDemo}>{pushStatus.platforms.ios.status}</span></div>
                <div>Critical Alert: <strong>EXTREME LEVEL READY</strong></div>
              </div>
              <button onClick={() => handleSendTestPush('IOS')} disabled={loading} className={styles.secondaryBtn}>
                TEST IOS APNS
              </button>
            </div>
          </div>

          {/* Registered Devices Manager */}
          <div className={styles.devicesSection}>
            <div className={styles.logHeader}>
              <h4 className={styles.subTitle}>Registered Push Devices ({registeredDevices.length})</h4>
              <button onClick={() => handleSendTestPush('WEB')} disabled={loading} className={styles.primaryBtn}>
                <Bell size={16} /> TEST MY NOTIFICATION
              </button>
            </div>

            {registeredDevices.length === 0 ? (
              <div className={styles.emptyState}>No push devices registered yet. Click 'ENABLE BROWSER PUSH' above to register this device.</div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.logTable}>
                  <thead>
                    <tr>
                      <th>PLATFORM</th>
                      <th>DEVICE ID</th>
                      <th>PUSH TOKEN</th>
                      <th>REGISTERED</th>
                      <th>STATUS</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registeredDevices.map((dev) => (
                      <tr key={dev.device_id}>
                        <td><strong>{dev.platform}</strong></td>
                        <td className={styles.monoCell}>{dev.device_id}</td>
                        <td className={styles.monoCell}>{dev.token_masked}</td>
                        <td className={styles.timeCell}>{new Date(dev.registered_at).toLocaleDateString()}</td>
                        <td><span className={styles.badgeSent}>{dev.status}</span></td>
                        <td>
                          <button onClick={() => handleRemoveDevice(dev.device_id)} className={styles.dangerBtn}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: DISASTER PREFERENCES */}
      {activeTab === 'preferences' && (
        <div className={styles.cardSection}>
          <h3 className={styles.subTitle}>Configured Disaster Alerts & Thresholds</h3>
          <p className={styles.sectionDesc}>Select which disaster hazards trigger SMS & Mobile Push notifications for your monitored areas.</p>

          <div className={styles.disasterGrid}>
            {disasterOptions.map((item) => (
              <label
                key={item.id}
                className={`${styles.disasterCard} ${selectedDisasters.includes(item.id) ? styles.disasterSelected : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selectedDisasters.includes(item.id)}
                  onChange={() => toggleDisaster(item.id)}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>

          <div className={styles.optionsRow}>
            <div className={styles.fieldGroup}>
              <label>Minimum Alert Severity</label>
              <select
                value={minSeverity}
                onChange={(e) => setMinSeverity(e.target.value)}
                className={styles.selectInput}
              >
                <option value="MODERATE">MODERATE (All warnings)</option>
                <option value="HIGH">HIGH (Severe threat)</option>
                <option value="VERY HIGH">VERY HIGH (Urgent safety threat)</option>
                <option value="EXTREME">EXTREME (Life-safety emergency only)</option>
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label>Alert Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className={styles.selectInput}
              >
                <option value="en">English</option>
                <option value="hi">Hindi (हिंदी)</option>
              </select>
            </div>
          </div>

          <div className={styles.actionRow}>
            <button onClick={handleUpdatePreferences} disabled={!isVerified || loading} className={styles.primaryBtn}>
              SAVE PREFERENCES
            </button>
            <button onClick={handleSendTestSMS} disabled={loading} className={styles.secondaryBtn}>
              TEST SMS FORMAT
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: DELIVERY LOGS */}
      {activeTab === 'logs' && (
        <div className={styles.cardSection}>
          <div className={styles.logHeader}>
            <h3 className={styles.subTitle}>Emergency Multi-Channel Delivery Logs</h3>
            <button onClick={loadDeliveryHistory} className={styles.refreshBtn}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.logTable}>
              <thead>
                <tr>
                  <th>TIME</th>
                  <th>CHANNEL</th>
                  <th>ALERT ID</th>
                  <th>HAZARD</th>
                  <th>RECIPIENT / DEVICE</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {pushLogs.map((plog) => (
                  <tr key={plog.id}>
                    <td className={styles.timeCell}>{new Date(plog.timestamp).toLocaleTimeString()}</td>
                    <td><strong>PUSH ({plog.platform})</strong></td>
                    <td className={styles.monoCell}>{plog.alert_id}</td>
                    <td>{plog.hazard_type}</td>
                    <td className={styles.monoCell}>{plog.token_masked}</td>
                    <td>
                      <span className={`${styles.logBadge} ${plog.status === 'SENT' ? styles.badgeSent : styles.badgeDemo}`}>
                        {plog.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {deliveryLogs.map((log) => (
                  <tr key={log.id}>
                    <td className={styles.timeCell}>{new Date(log.timestamp).toLocaleTimeString()}</td>
                    <td><strong>SMS</strong></td>
                    <td className={styles.monoCell}>{log.alert_id}</td>
                    <td>{log.hazard_type}</td>
                    <td className={styles.monoCell}>{log.phone_masked}</td>
                    <td>
                      <span className={`${styles.logBadge} ${log.status === 'SENT' ? styles.badgeSent : styles.badgeDemo}`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
