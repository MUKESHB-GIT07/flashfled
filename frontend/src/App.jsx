import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import CommandHeader from './components/CommandHeader';
import TelemetryCard from './components/TelemetryCard';
import RiskAssessment from './components/RiskAssessment';
import WarningCenter from './components/WarningCenter';
import RiskMap from './components/RiskMap';
import RiskExplanation from './components/RiskExplanation';
import HighRiskLocations from './components/HighRiskLocations';
import RiskChart from './components/RiskChart';
import DataSources from './components/DataSources';
import AiSafetyGuide from './components/AiSafetyGuide';
import LifeSafetyModal from './components/LifeSafetyModal';
import WeatherPanel from './components/WeatherPanel';   // Phase 2
import HazardFeed from './components/HazardFeed';       // Phase 4
import ImpactProjection from './components/ImpactProjection'; // Phase 5
import AlertRegistration from './components/AlertRegistration'; // Phase 7: SMS Registration
import ResponderDashboard from './components/ResponderDashboard'; // Phase 11: Rescue Operations Center
import EmergencyContactsManager from './components/EmergencyContactsManager'; // Phase 11: Emergency Contacts
import BroadcastPanel from './components/BroadcastPanel'; // Phase 12: CAP, Radio/Broadcast, Media & Siren Gateway
import AnalyticsDashboard from './components/AnalyticsDashboard'; // Phase 13: Global Historical Analytics & Reports
import ErrorBoundary from './components/ErrorBoundary';
import { telemetryData, systemStatus, riskAssessment, locations, alertData } from './data/mockData';
import { checkHealth, getLocations, predictRisk, getEnvironmentalData, getWeatherCurrent, getAllRisks } from './services/api';
import styles from './App.module.css';
// Phase 16: Authentication & Account System
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './components/auth/LoginPage';
import AccountPage from './components/account/AccountPage';

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

function AppInner() {
  const { isAuthenticated, loading: authLoading, isDemo } = useAuth();
  const [showAccountPage, setShowAccountPage] = useState(false);
  const [showLoginPage, setShowLoginPage] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname === '/login' || window.location.search.includes('login=true');
    }
    return false;
  });

  // Listen for browser navigation (/login route)
  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname === '/login' || window.location.search.includes('login=true')) {
        setShowLoginPage(true);
      } else {
        setShowLoginPage(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [activeSection, setActiveSection] = useState('overview');
  const [appMode, setAppMode] = useState('public'); // 'public' or 'operations'
  const [isLifeSafetyOpen, setIsLifeSafetyOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Phase 9: AI Safety Guide layer command bridge
  const [aiLayerCommand, setAiLayerCommand] = useState(null);

  // Single Centralized Active Location State that controls the entire application
  const [activeLocation, setActiveLocation] = useState({
    id: 'chennai',
    name: 'Chennai',
    display_name: 'Chennai, Tamil Nadu, India',
    country: 'India',
    state: 'Tamil Nadu',
    lat: 13.0827,
    lng: 80.2707,
    dataStatus: 'LIVE'
  });

  // Dynamic backend states driven by activeLocation
  const [statusState, setStatusState] = useState(systemStatus);
  const [locationsState, setLocationsState] = useState(locations);
  const [assessmentState, setAssessmentState] = useState(riskAssessment);
  const [alertState, setAlertState] = useState(alertData);
  const [telemetryState, setTelemetryState] = useState(telemetryData);
  // Phase 2: live weather state (from Open-Meteo via backend)
  const [liveWeather, setLiveWeather] = useState(null);
  // Phase 3: multi-hazard risk state (Flood, Erosion, Landslide, Snow)
  const [phase3Risks, setPhase3Risks] = useState(null);

  // Phase 9: Handle AI Safety Guide layer activation commands
  const handleActivateLayer = useCallback((layerId) => {
    setAiLayerCommand({ layer: layerId, timestamp: Date.now() });
    // Scroll to map section
    const mapEl = document.getElementById('risk-map');
    if (mapEl) mapEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Centralized handler to update location across the ENTIRE dashboard
  const handleGlobalLocationChange = useCallback(async (locObj) => {
    if (!locObj || !locObj.name) return;

    setActiveLocation(locObj);

    // Phase 2: Fetch REAL weather from Open-Meteo for selected location
    const weather = await getWeatherCurrent(
      locObj.lat,
      locObj.lng,
      locObj.display_name || locObj.name
    );
    if (weather) {
      setLiveWeather(weather);
    }

    // Phase 3: Fetch multi-disaster risks (Flood, Erosion, Landslide, Snow)
    const riskAll = await getAllRisks(
      locObj.lat,
      locObj.lng,
      locObj.display_name || locObj.name
    );
    if (riskAll) {
      setPhase3Risks(riskAll);
    }

    // 1. Fetch environmental data for the newly selected location from FastAPI
    const envData = await getEnvironmentalData(locObj.name);
    // Use real precipitation from Open-Meteo when available; fallback to env API
    const rainfallVal = (weather?.data_status !== 'UNAVAILABLE' && weather?.precipitation != null)
      ? Math.round(weather.precipitation * 4 * 10) / 10   // mm per 15min → mm/hr estimate
      : (envData ? envData.rainfall : 45.2);
    const waterLvlVal = riskAll?.flood_risk?.water_level_m ?? (envData ? envData.water_level : 2.4);
    const soilMoistureVal = riskAll?.flood_risk?.soil_moisture_pct ?? (envData ? envData.soil_moisture : 68.0);
    const slopeVal = riskAll?.flood_risk?.slope_deg ?? (envData ? envData.slope : 12.0);
    const elevationVal = riskAll?.flood_risk?.elevation_m ?? (envData ? envData.elevation : 15.0);

    // 2. Update telemetry cards with latest readings & Phase 3 status labels
    setTelemetryState((prev) =>
      prev.map((t) => {
        if (t.id === 'rainfall') return {
          ...t,
          displayValue: String(rainfallVal),
          value: rainfallVal,
          metadata: `SOURCE: ${weather?.data_status === 'UNAVAILABLE'
            ? locObj.name.toUpperCase() + ' (MODEL)'
            : 'OPEN-METEO — ' + (weather?.data_status || 'LIVE')}`,
        };
        if (t.id === 'waterLevel') return {
          ...t,
          displayValue: String(waterLvlVal),
          value: waterLvlVal,
          metadata: `RIVER STAGE: ${locObj.name.toUpperCase()} (${riskAll?.flood_risk?.data_status || 'LIVE'})`,
        };
        if (t.id === 'soilMoisture') return {
          ...t,
          displayValue: String(soilMoistureVal),
          value: soilMoistureVal,
          metadata: `SATURATION: ${locObj.name.toUpperCase()} (SLOPE: ${slopeVal}°)`,
        };
        return t;
      })
    );

    // 3. Compute dynamic flood risk for selected location via POST /api/predict
    const predResult = await predictRisk({
      rainfall: rainfallVal,
      water_level: waterLvlVal,
      soil_moisture: soilMoistureVal,
      slope: slopeVal,
      elevation: elevationVal,
    });

    if (predResult && predResult.risk_score !== undefined) {
      const riskScoreVal = riskAll?.flood_risk?.risk_score ?? Math.round(predResult.risk_score);
      const riskLvlVal = riskAll?.flood_risk?.risk_level ?? predResult.risk_level;

      // Extract drivers from Phase 3 risk factors
      const driversList = [
        ...(riskAll?.flood_risk?.contributing_factors || []),
        ...(riskAll?.landslide_risk?.contributing_factors || []),
        ...(riskAll?.erosion_risk?.contributing_factors || []),
      ];

      setAssessmentState({
        score: Math.round(riskScoreVal),
        maxScore: 100,
        level: riskLvlVal,
        confidence: Math.round(predResult.confidence || 91),
        drivers: driversList.slice(0, 4).map((rf, idx) => ({
          name: rf.split('(')[0].trim(),
          value: Math.max(35, 90 - idx * 12),
          color: idx === 0 ? 'var(--accent-blue)' : idx === 1 ? 'var(--accent-teal)' : 'var(--risk-high)',
        })),
        disclaimer: `Phase 3 Multi-Disaster Risk Model evaluated for ${locObj.display_name || locObj.name}`,
      });

      setAlertState({
        level: riskLvlVal.toLowerCase(),
        status: `${riskLvlVal} RISK DETECTED`,
        location: locObj.name,
        region: locObj.display_name || `${locObj.state || ''}, ${locObj.country || ''}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
        reasons: driversList.length > 0 ? driversList.slice(0, 4) : predResult.risk_factors,
        recommendation: predResult.recommendation,
      });
    }
  }, []);

  // Initial load
  useEffect(() => {
    async function initData() {
      const health = await checkHealth();
      if (health && health.status === 'online') {
        setStatusState({
          monitoring: true,
          statusLabel: 'FASTAPI BACKEND ONLINE',
          lastUpdated: new Date().toLocaleTimeString('en-GB') + ' IST',
          dataSourcesOnline: 5,
          totalDataSources: 5,
        });
      }

      const apiLocs = await getLocations();
      if (apiLocs && Array.isArray(apiLocs) && apiLocs.length > 0) {
        setLocationsState(apiLocs.map((al, idx) => ({
          id: idx + 1,
          name: al.location,
          region: 'Monitored Territory',
          lat: al.latitude,
          lng: al.longitude,
          riskScore: Math.round(al.risk_score),
          riskLevel: al.risk_level.toLowerCase(),
          rainfall: 45.2 + idx * 8,
          waterLevel: 2.1 + idx * 0.4,
          soilMoisture: 65 + idx * 4,
          status: al.risk_level === 'CRITICAL' ? 'ALERT ACTIVE' : 'STABLE'
        })));
      }

      // Initial query for Chennai
      handleGlobalLocationChange({
        id: 'chennai',
        name: 'Chennai',
        display_name: 'Chennai, Tamil Nadu, India',
        country: 'India',
        state: 'Tamil Nadu',
        lat: 13.0827,
        lng: 80.2707
      });

      // Register Phase 8 Service Worker for Web Push
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').then((reg) => {
          console.log('[SW] Service Worker registered for Emergency Web Push:', reg.scope);
        }).catch((err) => {
          console.warn('[SW] Service Worker registration failed:', err);
        });

        // Listen for notification click messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'EMERGENCY_NOTIFICATION_CLICK') {
            setIsLifeSafetyOpen(true);
          }
        });
      }

      // Deep link URL check (/emergency or ?alert=)
      if (window.location.pathname.includes('/emergency') || window.location.search.includes('alert')) {
        setIsLifeSafetyOpen(true);
      }
    }

    initData();
  }, [handleGlobalLocationChange]);


  const handleNavigate = (sectionId) => {
    setActiveSection(sectionId);
    const targetElement = document.getElementById(sectionId);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (sectionId === 'overview') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Dedicated /login route handler
  if (showLoginPage && !isAuthenticated) {
    return (
      <LoginPage 
        onAuthenticated={() => {
          setShowLoginPage(false);
          if (typeof window !== 'undefined' && window.location.pathname === '/login') {
            window.history.pushState({}, '', '/');
          }
        }} 
        onCancel={() => {
          setShowLoginPage(false);
          if (typeof window !== 'undefined' && window.location.pathname === '/login') {
            window.history.pushState({}, '', '/');
          }
        }} 
      />
    );
  }

  return (
    <div className={styles.appLayout}>
      {isOffline && (
        <div style={{
          backgroundColor: '#991b1b',
          color: '#ffffff',
          textAlign: 'center',
          padding: '8px 16px',
          fontSize: '0.8125rem',
          fontWeight: '600',
          letterSpacing: '0.04em',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          zIndex: 10000,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          boxShadow: '0 2px 10px rgba(0,0,0,0.5)'
        }}>
          <span>⚡ NETWORK DISCONNECTED — LIMITED CONNECTIVITY. Operating on cached emergency intelligence.</span>
        </div>
      )}

      {/* Navigation Sidebar */}
      <Sidebar activeSection={activeSection} onNavigate={handleNavigate} />

      {/* Main Content Area */}
      <div className={styles.mainContent}>
        {/* Command Header Banner with App Mode Switcher */}
        <CommandHeader 
          systemStatus={statusState} 
          appMode={appMode}
          onToggleAppMode={(mode) => setAppMode(mode)}
          onOpenLifeSafety={() => setIsLifeSafetyOpen(true)}
          activeLocation={activeLocation}
          onOpenAccount={() => {
            if (isAuthenticated) {
              setShowAccountPage(true);
            } else {
              setShowLoginPage(true);
            }
          }}
        />

        {/* Dashboard Body */}
        <main className={styles.dashboardBody}>
          {/* Phase 9: AI Safety Guide is now a floating overlay — see bottom of JSX */}

          {/* Phase 2: Live Weather Panel (real Open-Meteo data) */}
          <section id="weather" className={styles.section}>
            <ErrorBoundary name="Weather Panel">
              <WeatherPanel activeLocation={activeLocation} />
            </ErrorBoundary>
          </section>

          {/* Phase 4: Live Multi-Hazard Feed (Earthquakes, Tsunamis, Volcanoes, Wildfires, Cyclones) */}
          <section id="hazards" className={styles.section}>
            <ErrorBoundary name="Hazard Feed">
              <HazardFeed activeLocation={activeLocation} />
            </ErrorBoundary>
          </section>

          {/* Phase 5: Projected Impact & Next Affected Regions Engine */}
          <section id="impact" className={styles.section}>
            <ErrorBoundary name="Impact Projection">
              <ImpactProjection activeLocation={activeLocation} onOpenLifeSafety={() => setIsLifeSafetyOpen(true)} />
            </ErrorBoundary>
          </section>

          {/* Environmental Telemetry Cards */}
          <section className={styles.telemetryGrid} aria-label="Environmental Telemetry">
            {telemetryState.map((item, index) => (
              <TelemetryCard
                key={item.id}
                title={item.title}
                displayValue={item.displayValue}
                unit={item.unit}
                trend={item.trend}
                trendDirection={item.trendDirection}
                trendPeriod={item.trendPeriod}
                sparkline={item.sparkline}
                metadata={item.metadata}
                icon={item.icon}
                riskLevel={item.riskLevel}
                index={index}
              />
            ))}
          </section>

          {/* Command Overview: AI Risk Assessment + Early Warning Center */}
          <section id="overview" className={`${styles.overviewGrid} ${styles.section}`}>
            <ErrorBoundary name="Risk Assessment">
              <RiskAssessment assessment={assessmentState} />
            </ErrorBoundary>
            <ErrorBoundary name="Warning Center">
              <WarningCenter 
                alert={alertState} 
                activeLocation={activeLocation}
                onNavigate={handleNavigate} 
                onOpenLifeSafety={() => setIsLifeSafetyOpen(true)}
              />
            </ErrorBoundary>
          </section>

          {/* GIS Interactive Command Map */}
          <section id="risk-map" className={styles.section}>
            <ErrorBoundary name="Risk Map">
              <RiskMap 
                activeLocation={activeLocation}
                onGlobalLocationChange={handleGlobalLocationChange}
                locationsList={locationsState}
                aiLayerCommand={aiLayerCommand}
              />
            </ErrorBoundary>
          </section>

          {/* Phase 4: Multi-Hazard Monitoring Grid */}
          <section id="hazards" className={styles.section}>
            <ErrorBoundary name="Hazard Grid">
              <HazardFeed 
                activeLocation={activeLocation} 
                onSelectHazardLayer={handleActivateLayer}
              />
            </ErrorBoundary>
          </section>

          {/* Operations Mode Technical Panels */}
          {appMode === 'operations' && (
            <>
              {/* Prediction & Risk Intelligence (Explainable AI + High Risk Locations) */}
              <section id="prediction" className={`${styles.predictionGrid} ${styles.section}`}>
                <ErrorBoundary name="Risk Explanation">
                  <RiskExplanation />
                </ErrorBoundary>
                <ErrorBoundary name="High Risk Locations">
                  <HighRiskLocations 
                    locationsList={locationsState}
                    onLocationSelect={(locId) => {
                      const loc = locationsState.find(l => l.id === locId);
                      if (loc) {
                        handleGlobalLocationChange({
                          id: loc.id,
                          name: loc.name,
                          display_name: `${loc.name}, ${loc.region}`,
                          lat: loc.lat,
                          lng: loc.lng
                        });
                      }
                    }} 
                  />
                </ErrorBoundary>
              </section>

              {/* Environmental Time-Series Charts */}
              <section id="environment" className={styles.section}>
                <ErrorBoundary name="Environmental Charts">
                  <RiskChart activeLocation={activeLocation} />
                </ErrorBoundary>
              </section>

              {/* Multi-Source Data Pipeline Architecture */}
              <section id="data-sources" className={styles.section}>
                <ErrorBoundary name="Data Sources">
                  <DataSources />
                </ErrorBoundary>
              </section>
            </>
          )}

          {/* Phase 7: Phone Registration & Emergency SMS Alert System */}
          <section id="alerts" className={styles.section}>
            <ErrorBoundary name="Alert Registration">
              <AlertRegistration activeLocation={activeLocation} />
            </ErrorBoundary>
          </section>

          {/* Phase 12: Public Warning, CAP, Radio/Broadcast & Siren Gateway */}
          <section id="broadcast" className={styles.section}>
            <ErrorBoundary name="Broadcast Operations">
              <BroadcastPanel activeLocation={activeLocation} />
            </ErrorBoundary>
          </section>

          {/* Phase 13: Global Historical Analytics & Reports */}
          <section id="analytics" className={styles.section}>
            <ErrorBoundary name="Analytics Dashboard">
              <AnalyticsDashboard
                location={activeLocation}
                currentLocation={liveWeather}
                onSelectEvent={(evt) => {
                  if (evt && evt.affected_area) {
                    handleNavigate('risk-map');
                  }
                }}
              />
            </ErrorBoundary>
          </section>

          {/* Phase 11: Emergency Rescue Operations Center & Emergency Contacts */}
          <section id="rescue" className={styles.section}>
            <ErrorBoundary name="Rescue Dashboard">
              <ResponderDashboard activeLocation={activeLocation} />
              <div style={{ marginTop: '24px' }}>
                <EmergencyContactsManager userPhone={activeLocation?.phone} />
              </div>
            </ErrorBoundary>
          </section>

          <section id="locations" className={styles.section} style={{ display: 'none' }}></section>

        </main>

        {/* Life Safety & Rescue Modal */}
        <LifeSafetyModal 
          isOpen={isLifeSafetyOpen}
          onClose={() => setIsLifeSafetyOpen(false)}
          alertData={alertState}
          currentLocation={activeLocation}
          onNavigateToMap={handleActivateLayer}
        />

        {/* Phase 9: Floating AI Safety Guide Character + Chat Panel */}
        <AiSafetyGuide
          onTriggerEmergencyMode={() => setIsLifeSafetyOpen(true)}
          onNavigateSection={handleNavigate}
          onActivateLayer={handleActivateLayer}
          onGlobalLocationChange={handleGlobalLocationChange}
          telemetryData={telemetryState}
          currentLocation={activeLocation}
          liveWeather={liveWeather}
        />

        {/* Command Center Footer */}
        <footer className={styles.footer}>
          <div className={styles.footerBrand}>
            <span>GLOBAL MULTI-DISASTER EARLY WARNING PLATFORM</span>
            <span className={styles.footerTag}>FASTAPI CONNECTED</span>
            {isDemo && <span style={{ color: '#fbbf24', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.1em', background: 'rgba(251,191,36,0.1)', padding: '2px 8px', borderRadius: '99px', border: '1px solid rgba(251,191,36,0.3)' }}>DEMO ACCOUNT</span>}
          </div>
          <div>SIH 2026 NATIONAL HACKATHON · MINISTRY OF HOME AFFAIRS</div>
          <div>ACTIVE LOCATION: {activeLocation?.display_name || activeLocation?.name}</div>
        </footer>
      </div>

      {/* Phase 16: Account Management Panel */}
      {showAccountPage && (
        <AccountPage onClose={() => setShowAccountPage(false)} />
      )}
    </div>
  );
}
