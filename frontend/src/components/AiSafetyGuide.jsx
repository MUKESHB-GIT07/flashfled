import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './AiSafetyGuide.module.css';
import {
  Mic, MicOff, Volume2, VolumeX, Send, ShieldAlert,
  MapPin, CloudRain, LifeBuoy, Play, X, Minimize2, Maximize2,
  MessageCircle, Trash2, Globe, Navigation, Layers,
  AlertTriangle, HelpCircle, ChevronDown, Keyboard, Square,
  RotateCcw, Wind, Flame, Mountain, Waves
} from 'lucide-react';
import { queryAiGuide, getAiTutorial } from '../services/api';

/* ─── Character State Definitions ─── */
const STATE_CONFIG = {
  NORMAL:     { label: 'READY',       icon: '🛡️', color: '#38bdf8', pulseClass: 'pulseNormal' },
  LISTENING:  { label: 'LISTENING',   icon: '🎙️', color: '#c084fc', pulseClass: 'pulseListen' },
  THINKING:   { label: 'PROCESSING',  icon: '🔄', color: '#facc15', pulseClass: 'pulseThink' },
  SPEAKING:   { label: 'SPEAKING',    icon: '🗣️', color: '#2dd4bf', pulseClass: 'pulseSpeak' },
  GUIDING:    { label: 'GUIDING',     icon: '📘', color: '#60a5fa', pulseClass: 'pulseGuide' },
  WARNING:    { label: 'WARNING',     icon: '⚠️', color: '#fb923c', pulseClass: 'pulseWarn' },
  EMERGENCY:  { label: 'EMERGENCY',   icon: '🚨', color: '#ef4444', pulseClass: 'pulseEmerg' },
  NAVIGATION: { label: 'NAVIGATING',  icon: '🗺️', color: '#34d399', pulseClass: 'pulseNav' },
  RESCUE:     { label: 'RESCUE',      icon: '🆘', color: '#ef4444', pulseClass: 'pulseRescue' },
};

const LANGUAGES = [
  { code: 'en', label: 'English', speechCode: 'en-US' },
  { code: 'hi', label: 'हिन्दी', speechCode: 'hi-IN' },
];

const INTRO_MESSAGE_EN = "Hello. I am your AI Safety Guide.\n\nI can help you understand weather and disaster information, find alerts and shelters, and guide you during emergencies.\n\nYou can speak to me or type your question.";
const INTRO_MESSAGE_HI = "नमस्ते। मैं आपका AI सुरक्षा मार्गदर्शक हूँ।\n\nमैं आपको मौसम और आपदा की जानकारी समझने, अलर्ट और आश्रय खोजने और आपातकालीन स्थितियों में मार्गदर्शन करने में मदद कर सकता हूँ।\n\nआप मुझसे बोलकर या टाइप करके अपना सवाल पूछ सकते हैं।";

const AiSafetyGuide = ({
  onTriggerEmergencyMode,
  onNavigateSection,
  onSelectLocation,
  onActivateLayer,
  onGlobalLocationChange,
  telemetryData,
  currentLocation,
  activeAlerts,
  liveWeather,
}) => {
  /* ─── Core State ─── */
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [characterState, setCharacterState] = useState('NORMAL');
  const [language, setLanguage] = useState('en');

  /* ─── Conversation ─── */
  const [messages, setMessages] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [hasShownIntro, setHasShownIntro] = useState(false);

  /* ─── Voice ─── */
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [lastSpokenText, setLastSpokenText] = useState('');

  /* ─── Tutorial ─── */
  const [isTutorialMode, setIsTutorialMode] = useState(false);
  const [tutorialSteps, setTutorialSteps] = useState([]);
  const [tutorialStep, setTutorialStep] = useState(0);

  /* ─── Accessibility ─── */
  const [textOnlyMode, setTextOnlyMode] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);

  /* ─── Refs ─── */
  const speechRecognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  /* ─── Detect reduced motion preference ─── */
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  /* ─── Auto-scroll ─── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ─── Speech Recognition setup ─── */
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      setVoiceSupported(true);
      const recognition = new SR();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = LANGUAGES.find(l => l.code === language)?.speechCode || 'en-US';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        setCharacterState('THINKING');
        handleUserQuery(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
        setCharacterState('NORMAL');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      speechRecognitionRef.current = recognition;
    }

    if ('speechSynthesis' in window) {
      setTtsSupported(true);
    }
  }, [language]);

  /* ─── TTS ─── */
  const speakResponse = useCallback((text) => {
    if (isMuted || !ttsSupported || textOnlyMode) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    const langObj = LANGUAGES.find(l => l.code === language);
    utterance.lang = langObj?.speechCode || 'en-US';
    utterance.onstart = () => setCharacterState('SPEAKING');
    utterance.onend = () => setCharacterState('NORMAL');
    utterance.onerror = () => setCharacterState('NORMAL');
    setLastSpokenText(text);
    window.speechSynthesis.speak(utterance);
  }, [isMuted, ttsSupported, textOnlyMode, language]);

  /* ─── First Visit Intro ─── */
  useEffect(() => {
    if (isOpen && !hasShownIntro) {
      const introText = language === 'hi' ? INTRO_MESSAGE_HI : INTRO_MESSAGE_EN;
      addAiMessage(introText, 'AI Safety Guide System', 'LIVE');
      setHasShownIntro(true);
    }
  }, [isOpen, hasShownIntro, language]);

  /* ─── Alert Reaction ─── */
  useEffect(() => {
    if (activeAlerts && activeAlerts.length > 0) {
      const severe = activeAlerts.find(a =>
        a.severity === 'EXTREME' || a.severity === 'VERY HIGH'
      );
      if (severe) {
        setCharacterState('EMERGENCY');
        if (isOpen) {
          const alertText = severe.severity === 'EXTREME'
            ? "Emergency warning. Please check the emergency map and follow official local instructions."
            : "Attention. A severe warning has been received for one of your monitored locations.";
          addAiMessage(alertText, 'Early Warning Engine', 'OFFICIAL WARNING');
          speakResponse(alertText);
        }
      }
    }
  }, [activeAlerts]);

  /* ─── Add Message Helpers ─── */
  const addAiMessage = (text, source, status) => {
    setMessages(prev => [...prev, {
      id: Date.now() + Math.random(),
      sender: 'ai',
      text,
      source: source || 'AI Safety Guide',
      updated: new Date().toLocaleTimeString('en-GB') + ' IST',
      status: status || 'LIVE'
    }]);
  };

  const addUserMessage = (text) => {
    setMessages(prev => [...prev, {
      id: Date.now() + Math.random(),
      sender: 'user',
      text
    }]);
  };

  /* ─── Process User Query ─── */
  const handleUserQuery = useCallback(async (queryText) => {
    if (!queryText.trim()) return;
    addUserMessage(queryText);
    setTextInput('');
    setCharacterState('THINKING');

    try {
      const result = await queryAiGuide({
        query: queryText,
        location_name: currentLocation?.name || 'Chennai',
        latitude: currentLocation?.lat || 13.0827,
        longitude: currentLocation?.lng || 80.2707,
        language: language
      });

      if (result && result.reply_text) {
        setTimeout(() => {
          addAiMessage(result.reply_text, result.source, result.data_status);
          setCharacterState(result.character_state || 'NORMAL');
          speakResponse(result.reply_text);

          // Execute actions returned by the backend
          if (result.action) {
            executeAction(result.action);
          }
        }, 300);
      } else {
        // Fallback: process locally when backend is unreachable
        handleLocalQuery(queryText);
      }
    } catch (err) {
      console.warn('AI query failed, using local fallback:', err);
      handleLocalQuery(queryText);
    }
  }, [currentLocation, language, speakResponse]);

  /* ─── Local Fallback Query Handler ─── */
  const handleLocalQuery = (queryText) => {
    const q = queryText.toLowerCase();
    let reply = '';
    let source = 'Local AI Fallback';
    let status = 'LIVE';
    let state = 'NORMAL';

    if (q.includes('weather') || q.includes('temperature') || q.includes('rain')) {
      state = 'GUIDING';
      const temp = liveWeather?.temperature ?? '—';
      const precip = liveWeather?.precipitation ?? '—';
      const cond = liveWeather?.weather_condition ?? 'Data pending';
      reply = language === 'en'
        ? `Current weather at ${currentLocation?.name || 'your location'}: ${temp}°C, ${cond}. Precipitation: ${precip} mm/hr.`
        : `${currentLocation?.name || 'आपके स्थान'} का वर्तमान मौसम: ${temp}°C, ${cond}. वर्षा: ${precip} मिमी/घंटा।`;
      source = 'Open-Meteo Weather API';
    } else if (q.includes('trapped') || q.includes('rescue') || q.includes('buried') || q.includes('sos') || q.includes('help me')) {
      state = 'RESCUE';
      reply = q.includes('buried')
        ? "I cannot determine from the phone alone whether you are under soil or debris. I can help send a rescue signal if your device has connectivity."
        : "I can help you send a rescue request. Would you like to share your current location with the authorized rescue system?";
      source = 'Emergency Rescue Protocol';
      status = 'CRITICAL';
    } else if (q.includes('shelter') || q.includes('safe') || q.includes('where to go') || q.includes('evacuate')) {
      state = 'NAVIGATION';
      reply = `Displaying verified relief shelters and safe evacuation routes near ${currentLocation?.name || 'your location'}.`;
      source = 'National Relief Shelter Registry';
    } else if (q.includes('flood') || q.includes('danger') || q.includes('risk') || q.includes('warning') || q.includes('alert')) {
      state = 'WARNING';
      reply = `Monitoring ${currentLocation?.name || 'your area'} for active hazard warnings. Follow official local authorities for binding instructions.`;
      source = 'Early Warning Engine';
      status = 'MODEL PREDICTION';
    } else if (q.includes('show rainfall') || q.includes('show rain')) {
      state = 'GUIDING';
      reply = 'Activating global precipitation telemetry layer.';
      onActivateLayer && onActivateLayer('rainfall');
    } else if (q.includes('show wind')) {
      state = 'GUIDING';
      reply = 'Activating live atmospheric wind vector layer.';
      onActivateLayer && onActivateLayer('wind');
    } else if (q.includes('show flood')) {
      state = 'GUIDING';
      reply = 'Displaying flood risk inundation layer.';
      onActivateLayer && onActivateLayer('flood');
    } else if (q.includes('show earthquake') || q.includes('show quake')) {
      state = 'GUIDING';
      reply = 'Activating global seismic activity layer (USGS Live Feed).';
      onActivateLayer && onActivateLayer('earthquake');
    } else {
      reply = language === 'en'
        ? `I am monitoring environmental sensors for ${currentLocation?.name || 'your location'}. You can ask about live weather, hazard risks, map layers, nearby shelters, or request emergency rescue.`
        : `मैं ${currentLocation?.name || 'आपके स्थान'} के सेंसर डेटा की निगरानी कर रहा हूं।`;
    }

    addAiMessage(reply, source, status);
    setCharacterState(state);
    speakResponse(reply);
  };

  /* ─── Execute AI Action Commands ─── */
  const executeAction = (action) => {
    if (!action) return;
    switch (action.type) {
      case 'ACTIVATE_LAYER':
        onActivateLayer && onActivateLayer(action.layer);
        break;
      case 'NAVIGATE_MAP':
        if (onGlobalLocationChange && action.latitude && action.longitude) {
          onGlobalLocationChange({
            name: action.location_name,
            display_name: action.location_name,
            lat: action.latitude,
            lng: action.longitude
          });
        }
        break;
      case 'SHOW_SHELTER_ROUTE':
        onNavigateSection && onNavigateSection('risk-map');
        onActivateLayer && onActivateLayer('shelter');
        break;
      case 'TRIGGER_RESCUE':
        onTriggerEmergencyMode && onTriggerEmergencyMode('RESCUE');
        break;
      case 'START_TUTORIAL':
        startTutorial();
        break;
      default:
        break;
    }
  };

  /* ─── Voice Controls ─── */
  const toggleListening = () => {
    if (!voiceSupported) {
      addAiMessage(
        language === 'en'
          ? "Voice input is unavailable on this device. Please type your question."
          : "इस डिवाइस पर वॉइस इनपुट उपलब्ध नहीं है। कृपया अपना प्रश्न टाइप करें।",
        'System', 'FALLBACK'
      );
      return;
    }
    if (isListening) {
      speechRecognitionRef.current?.stop();
      setIsListening(false);
      setCharacterState('NORMAL');
    } else {
      try {
        speechRecognitionRef.current.lang = LANGUAGES.find(l => l.code === language)?.speechCode || 'en-US';
        speechRecognitionRef.current.start();
        setIsListening(true);
        setCharacterState('LISTENING');
      } catch (err) {
        console.warn('Speech recognition failed:', err);
        addAiMessage("Voice input is unavailable. Please type your question.", 'System', 'FALLBACK');
      }
    }
  };

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
    setCharacterState('NORMAL');
  };

  const replayLast = () => {
    if (lastSpokenText) speakResponse(lastSpokenText);
  };

  /* ─── Tutorial Mode ─── */
  const startTutorial = async () => {
    setIsTutorialMode(true);
    setTutorialStep(0);
    try {
      const data = await getAiTutorial();
      if (data && data.steps) {
        setTutorialSteps(data.steps);
        const step = data.steps[0];
        addAiMessage(`📘 HOW TO USE THIS WEBSITE\n\nStep 1 of ${data.steps.length}: ${step.title}\n\n${step.description}`, 'Interactive Tutorial', 'GUIDE');
        setCharacterState('GUIDING');
      }
    } catch (err) {
      // Use hardcoded tutorial fallback
      const fallbackSteps = [
        { step: 1, title: 'Search Location', description: 'Use the search bar to find any city or region globally.' },
        { step: 2, title: 'Check Live Weather', description: 'View real-time precipitation, temperature, and wind speed.' },
        { step: 3, title: 'View Map Layers', description: 'Toggle Rainfall, Flood, Earthquakes, and other hazard layers.' },
        { step: 4, title: 'Set Alert Areas', description: 'Register your monitored locations for automatic warnings.' },
        { step: 5, title: 'Receive Warnings', description: 'Get SMS, Push, and Browser notifications for emergencies.' },
        { step: 6, title: 'View Projected Impact', description: 'See downstream propagation and affected regions.' },
        { step: 7, title: 'Find Shelters', description: 'Locate verified high-ground relief centers.' },
        { step: 8, title: 'Find Route', description: 'Follow safe evacuation routes avoiding disaster zones.' },
        { step: 9, title: 'Request Rescue', description: 'Tap "I NEED RESCUE" or speak to signal emergency responders.' },
      ];
      setTutorialSteps(fallbackSteps);
      addAiMessage(`📘 HOW TO USE THIS WEBSITE\n\nStep 1 of ${fallbackSteps.length}: ${fallbackSteps[0].title}\n\n${fallbackSteps[0].description}`, 'Interactive Tutorial', 'GUIDE');
      setCharacterState('GUIDING');
    }
  };

  const nextTutorialStep = () => {
    if (tutorialStep < tutorialSteps.length - 1) {
      const next = tutorialStep + 1;
      setTutorialStep(next);
      const step = tutorialSteps[next];
      addAiMessage(`Step ${next + 1} of ${tutorialSteps.length}: ${step.title}\n\n${step.description}`, 'Interactive Tutorial', 'GUIDE');
      speakResponse(`${step.title}. ${step.description}`);
    } else {
      setIsTutorialMode(false);
      addAiMessage(language === 'en' ? "Tutorial complete! You can ask me anything about the platform." : "ट्यूटोरियल पूरा हुआ! आप मुझसे कुछ भी पूछ सकते हैं।", 'Tutorial', 'COMPLETE');
      setCharacterState('NORMAL');
    }
  };

  /* ─── Demo Scenario ─── */
  const runDemoScenario = () => {
    setCharacterState('WARNING');
    addAiMessage("⚡ DEMO SIMULATION INITIATED: Extreme flood scenario for " + (currentLocation?.name || 'Kedarnath') + ". Torrential rainfall detected at 88.5 mm/hr. River gauge level rising rapidly.", 'DEMO SIMULATOR', 'DEMO SIMULATION');
    speakResponse("Demo Simulation. Extreme flood scenario initiated. Torrential rainfall detected.");

    setTimeout(() => {
      setCharacterState('EMERGENCY');
      addAiMessage("🚨 EXTREME FLOOD ALERT! Risk Score escalated to 89/100 (EXTREME). Projected impact zone intersects populated settlement within 25 minutes.\n\nThis is a DEMO / SIMULATION — not a real emergency.", 'Early Warning Engine', 'DEMO — EXTREME WARNING');
      speakResponse("Emergency warning. Extreme flood alert for your area. This is a demonstration.");
    }, 4000);

    setTimeout(() => {
      setCharacterState('NAVIGATION');
      addAiMessage("Opening Life Safety & Safe Route Guidance. Recommended evacuation route to designated shelter is active on map.\n\n🏷️ DEMO / SIMULATION", 'Emergency Navigation', 'DEMO — LIFE SAFETY');
      speakResponse("Opening Life Safety Mode and safe route guidance.");
      onTriggerEmergencyMode && onTriggerEmergencyMode('EMERGENCY');
    }, 8000);
  };

  /* ─── Clear Conversation ─── */
  const clearConversation = () => {
    setMessages([]);
    setCharacterState('NORMAL');
    setIsTutorialMode(false);
    const resetMsg = language === 'en' ? "Conversation cleared. How can I help you?" : "बातचीत साफ़ की गई। मैं आपकी कैसे मदद कर सकता हूं?";
    addAiMessage(resetMsg, 'System', 'LIVE');
  };

  /* ─── Quick Action Handlers ─── */
  const handleQuickAction = (action) => {
    switch (action) {
      case 'TALK':
        toggleListening();
        break;
      case 'CHECK_AREA':
        handleUserQuery(language === 'en' ? 'What is the current status of my area?' : 'मेरे क्षेत्र की वर्तमान स्थिति क्या है?');
        break;
      case 'ALERTS':
        handleUserQuery(language === 'en' ? 'Are there any active alerts near me?' : 'क्या मेरे पास कोई सक्रिय अलर्ट है?');
        break;
      case 'WEATHER':
        handleUserQuery(language === 'en' ? 'What is the current weather here?' : 'यहां का मौसम कैसा है?');
        break;
      case 'SHELTER':
        handleUserQuery(language === 'en' ? 'Where is the nearest shelter?' : 'निकटतम आश्रय कहां है?');
        break;
      case 'EMERGENCY':
        handleUserQuery(language === 'en' ? 'I need emergency help' : 'मुझे आपातकालीन मदद चाहिए');
        break;
      case 'TUTORIAL':
        startTutorial();
        break;
      default:
        break;
    }
  };

  const currentStateObj = STATE_CONFIG[characterState] || STATE_CONFIG.NORMAL;
  const showPanel = isOpen && !isMinimized;

  return (
    <>
      {/* ═══ FLOATING CHARACTER BUTTON ═══ */}
      {!showPanel && (
        <button
          className={`${styles.floatingBtn} ${reducedMotion ? styles.noMotion : ''} ${characterState === 'EMERGENCY' || characterState === 'RESCUE' ? styles.floatingEmergency : ''}`}
          onClick={() => { setIsOpen(true); setIsMinimized(false); }}
          aria-label="Open AI Safety Guide"
          title="AI Safety Guide"
          style={{ '--state-color': currentStateObj.color }}
        >
          <span className={`${styles.floatingAvatar} ${styles[currentStateObj.pulseClass]}`}>
            {textOnlyMode ? '🛡️' : currentStateObj.icon}
          </span>
          {characterState === 'EMERGENCY' && (
            <span className={styles.floatingBadge}>!</span>
          )}
          <span className={styles.floatingLabel}>AI GUIDE</span>
        </button>
      )}

      {/* ═══ CHAT PANEL ═══ */}
      {showPanel && (
        <div
          className={`${styles.panel} ${reducedMotion ? styles.noMotion : ''} ${highContrast ? styles.highContrast : ''} ${largeText ? styles.largeText : ''}`}
          role="dialog"
          aria-label="AI Safety Guide Panel"
          aria-live="polite"
        >
          {/* ─── Panel Header ─── */}
          <div className={styles.panelHeader}>
            <div className={styles.headerLeft}>
              <span className={`${styles.headerAvatar} ${styles[currentStateObj.pulseClass]}`} style={{ '--state-color': currentStateObj.color }}>
                {currentStateObj.icon}
              </span>
              <div className={styles.headerTitles}>
                <span className={styles.headerLabel}>AI SAFETY GUIDE</span>
                <span className={styles.headerStatus} style={{ color: currentStateObj.color }}>
                  {currentStateObj.label}
                </span>
              </div>
            </div>
            <div className={styles.headerControls}>
              {/* Language Switcher */}
              <select
                className={styles.langSelect}
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                aria-label="Select language"
              >
                {LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
              {/* Mute */}
              <button
                className={`${styles.headerBtn} ${isMuted ? styles.muted : ''}`}
                onClick={() => { setIsMuted(!isMuted); if (!isMuted) window.speechSynthesis?.cancel(); }}
                title={isMuted ? 'Unmute voice' : 'Mute voice'}
                aria-label={isMuted ? 'Unmute voice' : 'Mute voice'}
              >
                {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              {/* Minimize */}
              <button
                className={styles.headerBtn}
                onClick={() => setIsMinimized(true)}
                title="Minimize Guide"
                aria-label="Minimize Guide"
              >
                <Minimize2 size={14} />
              </button>
              {/* Close */}
              <button
                className={styles.headerBtn}
                onClick={() => { setIsOpen(false); window.speechSynthesis?.cancel(); }}
                title="Close Guide"
                aria-label="Close AI Safety Guide"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* ─── Character Display ─── */}
          <div className={styles.characterSection}>
            <div className={`${styles.characterOrb} ${styles[currentStateObj.pulseClass]}`} style={{ '--state-color': currentStateObj.color }}>
              <span className={styles.orbEmoji}>{currentStateObj.icon}</span>
              {characterState === 'LISTENING' && <div className={styles.listeningRipple} />}
              {characterState === 'SPEAKING' && <div className={styles.speakingWave} />}
              {characterState === 'THINKING' && <div className={styles.thinkingSpinner} />}
            </div>
          </div>

          {/* ─── Quick Actions (Show when no messages or few messages) ─── */}
          {messages.length <= 1 && (
            <div className={styles.quickActions}>
              <button className={styles.quickBtn} onClick={() => handleQuickAction('TALK')}>
                <Mic size={14} /><span>{language === 'en' ? 'TALK TO ME' : 'मुझसे बात करें'}</span>
              </button>
              <button className={styles.quickBtn} onClick={() => handleQuickAction('CHECK_AREA')}>
                <Globe size={14} /><span>{language === 'en' ? 'CHECK MY AREA' : 'मेरा क्षेत्र जांचें'}</span>
              </button>
              <button className={styles.quickBtn} onClick={() => handleQuickAction('ALERTS')}>
                <ShieldAlert size={14} /><span>{language === 'en' ? 'ACTIVE ALERTS' : 'सक्रिय अलर्ट'}</span>
              </button>
              <button className={styles.quickBtn} onClick={() => handleQuickAction('WEATHER')}>
                <CloudRain size={14} /><span>{language === 'en' ? 'WEATHER' : 'मौसम'}</span>
              </button>
              <button className={styles.quickBtn} onClick={() => handleQuickAction('SHELTER')}>
                <MapPin size={14} /><span>{language === 'en' ? 'FIND SHELTER' : 'आश्रय खोजें'}</span>
              </button>
              <button className={`${styles.quickBtn} ${styles.emergencyQuickBtn}`} onClick={() => handleQuickAction('EMERGENCY')}>
                <LifeBuoy size={14} /><span>{language === 'en' ? 'EMERGENCY HELP' : 'आपातकालीन मदद'}</span>
              </button>
              <button className={styles.skipIntroBtn} onClick={() => handleQuickAction('TUTORIAL')}>
                <HelpCircle size={14} /><span>{language === 'en' ? 'HOW TO USE THIS WEBSITE' : 'वेबसाइट कैसे इस्तेमाल करें'}</span>
              </button>
            </div>
          )}

          {/* ─── Message Feed ─── */}
          <div className={styles.messageArea} ref={chatContainerRef} role="log" aria-label="Conversation transcript">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`${styles.msgBubble} ${msg.sender === 'user' ? styles.userMsg : styles.aiMsg}`}
                role={msg.sender === 'ai' ? 'status' : undefined}
              >
                {msg.sender === 'ai' && (
                  <div className={styles.msgHeader}>
                    <span className={styles.aiTag}>🛡️ AI GUIDE</span>
                    {msg.status && <span className={styles.statusChip}>{msg.status}</span>}
                  </div>
                )}
                <p className={styles.msgText}>{msg.text}</p>
                {msg.sender === 'ai' && msg.source && (
                  <div className={styles.msgMeta}>
                    <span>Source: {msg.source}</span>
                    <span>Updated: {msg.updated}</span>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* ─── Tutorial Navigation ─── */}
          {isTutorialMode && tutorialSteps.length > 0 && (
            <div className={styles.tutorialBar}>
              <span className={styles.tutorialProgress}>Step {tutorialStep + 1} / {tutorialSteps.length}</span>
              <button className={styles.tutorialNextBtn} onClick={nextTutorialStep}>
                {tutorialStep < tutorialSteps.length - 1
                  ? (language === 'en' ? 'NEXT STEP →' : 'अगला चरण →')
                  : (language === 'en' ? 'FINISH ✓' : 'समाप्त ✓')
                }
              </button>
            </div>
          )}

          {/* ─── Rescue Confirmation (when in RESCUE state) ─── */}
          {characterState === 'RESCUE' && (
            <div className={styles.rescueBar}>
              <button
                className={styles.rescueBtn}
                onClick={() => {
                  onTriggerEmergencyMode && onTriggerEmergencyMode('RESCUE');
                  addAiMessage("🆘 Rescue request dispatched. Your GPS coordinates are being transmitted to emergency services.", 'Emergency Rescue Protocol', 'CRITICAL DISPATCH');
                  setCharacterState('EMERGENCY');
                }}
              >
                🆘 {language === 'en' ? 'SEND RESCUE REQUEST' : 'बचाव अनुरोध भेजें'}
              </button>
              <button
                className={styles.cancelRescueBtn}
                onClick={() => {
                  setCharacterState('NORMAL');
                  addAiMessage(language === 'en' ? "Rescue request cancelled. Stay safe." : "बचाव अनुरोध रद्द किया गया।", 'System', 'CANCELLED');
                }}
              >
                {language === 'en' ? 'CANCEL' : 'रद्द करें'}
              </button>
            </div>
          )}

          {/* ─── Input Area ─── */}
          <div className={styles.inputArea}>
            <form
              className={styles.inputForm}
              onSubmit={(e) => { e.preventDefault(); handleUserQuery(textInput); }}
            >
              <input
                type="text"
                className={styles.textInput}
                placeholder={language === 'en'
                  ? "Ask about weather, risks, shelters, or say 'I need help'..."
                  : "मौसम, जोखिम, आश्रय के बारे में पूछें..."
                }
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                aria-label="Type your question"
              />
              <button type="submit" className={styles.sendBtn} aria-label="Send message">
                <Send size={14} />
              </button>
            </form>

            {/* ─── Voice & Utility Controls ─── */}
            <div className={styles.controlBar}>
              <button
                className={`${styles.ctrlBtn} ${isListening ? styles.listeningActive : ''}`}
                onClick={toggleListening}
                aria-label={isListening ? 'Stop listening' : 'Start voice input'}
              >
                {isListening ? <Square size={13} /> : <Mic size={13} />}
                <span>{isListening ? (language === 'en' ? 'STOP' : 'रुकें') : (language === 'en' ? 'TALK' : 'बोलें')}</span>
              </button>

              {characterState === 'SPEAKING' && (
                <button className={styles.ctrlBtn} onClick={stopSpeaking} aria-label="Stop speaking">
                  <Square size={13} /><span>{language === 'en' ? 'STOP' : 'रुकें'}</span>
                </button>
              )}

              <button className={styles.ctrlBtn} onClick={replayLast} aria-label="Replay last response" disabled={!lastSpokenText}>
                <RotateCcw size={13} /><span>{language === 'en' ? 'REPLAY' : 'दोहराएं'}</span>
              </button>

              <button className={styles.ctrlBtn} onClick={clearConversation} aria-label="Clear conversation">
                <Trash2 size={13} /><span>{language === 'en' ? 'CLEAR' : 'साफ़'}</span>
              </button>

              <button className={styles.ctrlBtn} onClick={runDemoScenario} aria-label="Run demo evacuation scenario">
                <Play size={13} /><span>DEMO</span>
              </button>
            </div>

            {/* ─── Accessibility Bar ─── */}
            <div className={styles.a11yBar}>
              <button
                className={`${styles.a11yBtn} ${textOnlyMode ? styles.a11yActive : ''}`}
                onClick={() => setTextOnlyMode(!textOnlyMode)}
                title="Text-only mode"
                aria-label="Toggle text-only mode"
              >
                <Keyboard size={11} /><span>TEXT</span>
              </button>
              <button
                className={`${styles.a11yBtn} ${highContrast ? styles.a11yActive : ''}`}
                onClick={() => setHighContrast(!highContrast)}
                title="High contrast"
                aria-label="Toggle high contrast"
              >
                ◐<span>CONTRAST</span>
              </button>
              <button
                className={`${styles.a11yBtn} ${largeText ? styles.a11yActive : ''}`}
                onClick={() => setLargeText(!largeText)}
                title="Large text"
                aria-label="Toggle large text"
              >
                A+<span>SIZE</span>
              </button>
              <button
                className={`${styles.a11yBtn} ${reducedMotion ? styles.a11yActive : ''}`}
                onClick={() => setReducedMotion(!reducedMotion)}
                title="Reduced motion"
                aria-label="Toggle reduced motion"
              >
                ⏸<span>MOTION</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AiSafetyGuide;
