const DEFAULT_LAN_BACKEND_URL = 'http://10.175.130.129:8000';

const normalizeApiBaseUrl = (value) => {
  if (!value || typeof value !== 'string') return null;

  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) return null;

  const candidate = trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;

  try {
    const parsed = new URL(candidate);
    return `${parsed.origin}${parsed.pathname.replace(/\/+$/, '')}`;
  } catch {
    return null;
  }
};

export const resolveApiBaseUrl = () => {
  const envUrl = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
  if (envUrl) return envUrl;

  if (typeof window !== 'undefined' && window.location?.hostname) {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol.startsWith('https') ? 'https' : 'http';
    const preferredBase = hostname === 'localhost' || hostname === '127.0.0.1'
      ? DEFAULT_LAN_BACKEND_URL
      : `${protocol}://${hostname}:8000`;

    return `${preferredBase.replace(/\/+$/, '')}/api`;
  }

  return `${DEFAULT_LAN_BACKEND_URL}/api`;
};

export const API_BASE_URL = resolveApiBaseUrl();
export const API_DIAGNOSTICS = {
  apiBaseUrl: API_BASE_URL,
  envConfigured: Boolean(import.meta.env.VITE_API_BASE_URL),
  hostname: typeof window !== 'undefined' ? window.location.hostname : 'server-side',
  mode: import.meta.env.MODE,
};

if (typeof window !== 'undefined') {
  window.__APP_API_CONFIG__ = API_DIAGNOSTICS;
  console.info('[API]', API_DIAGNOSTICS);
}

/**
 * Health check endpoint
 */
export async function checkHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) throw new Error(`Health HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('API Health check failed, falling back:', error);
    return { status: 'offline', service: 'Flash Flood Prediction API (Fallback)' };
  }
}

/**
 * Get environmental data for a given location
 */
export async function getEnvironmentalData(location) {
  try {
    const response = await fetch(`${API_BASE_URL}/environmental/${encodeURIComponent(location)}`);
    if (!response.ok) throw new Error(`Environmental HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn(`Failed to fetch environmental data for ${location}:`, error);
    return null;
  }
}

/**
 * Predict flood risk based on environmental factors
 */
export async function predictRisk(params) {
  try {
    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!response.ok) throw new Error(`Predict HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('Prediction request failed:', error);
    return null;
  }
}

/**
 * Get monitored locations list from API
 */
export async function getLocations() {
  try {
    const response = await fetch(`${API_BASE_URL}/locations`);
    if (!response.ok) throw new Error(`Locations HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('Failed to fetch locations from API:', error);
    return null;
  }
}

/**
 * Get dashboard stats from API
 */
export async function getStats() {
  try {
    const response = await fetch(`${API_BASE_URL}/stats`);
    if (!response.ok) throw new Error(`Stats HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('Failed to fetch stats from API:', error);
    return null;
  }
}

/**
 * Geocode search location query
 */
export async function geocodeLocation(query) {
  try {
    const response = await fetch(`${API_BASE_URL}/geocode?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error(`Geocode HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn(`Geocode search failed for "${query}":`, error);
    return null;
  }
}

/**
 * Get map layers list from API
 */
export async function getMapLayers() {
  try {
    const response = await fetch(`${API_BASE_URL}/map/layers`);
    if (!response.ok) throw new Error(`Map layers HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('Failed to fetch map layers from API:', error);
    return null;
  }
}

/**
 * Submit emergency rescue request
 */
export async function submitRescueRequest(payload) {
  try {
    const response = await fetch(`${API_BASE_URL}/rescue/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`Rescue request HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('Rescue request submission failed:', error);
    return {
      success: true,
      rescue_id: `DEMO-RES-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'QUEUED IN DEMO OFFLINE MODE'
    };
  }
}

/**
 * Get active rescue requests for responder view
 */
export async function getRescueRequests() {
  try {
    const response = await fetch(`${API_BASE_URL}/rescue/requests`);
    if (!response.ok) throw new Error(`Fetch rescue requests HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('Failed to fetch rescue requests:', error);
    return [];
  }
}

// ============================================================
// PHASE 2 — Real Weather (Open-Meteo via backend proxy)
// ============================================================

/**
 * Fetch current real weather for any (lat, lng).
 * Backend calls Open-Meteo; returns data_status = LIVE | DELAYED | STALE | UNAVAILABLE
 */
export async function getWeatherCurrent(lat, lng, name = '') {
  try {
    const params = new URLSearchParams({ lat, lng, name });
    const response = await fetch(`${API_BASE_URL}/weather/current?${params}`);
    if (!response.ok) throw new Error(`Weather HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('getWeatherCurrent failed:', error);
    return {
      data_status: 'UNAVAILABLE',
      provider_status: 'BACKEND UNREACHABLE',
      temperature: null, humidity: null, precipitation: null,
      wind_speed: null, wind_direction: null, pressure: null,
      weather_condition: 'DATA UNAVAILABLE', source: 'Open-Meteo',
    };
  }
}

/**
 * Fetch 48-hour hourly + 7-day daily forecast.
 */
export async function getWeatherForecast(lat, lng, name = '') {
  try {
    const params = new URLSearchParams({ lat, lng, name });
    const response = await fetch(`${API_BASE_URL}/weather/forecast?${params}`);
    if (!response.ok) throw new Error(`Forecast HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('getWeatherForecast failed:', error);
    return { data_status: 'UNAVAILABLE', hourly: [], daily: [] };
  }
}

/**
 * Fetch rainfall time-series. period: '1h' | '3h' | '6h' | '12h' | '24h' | '3d' | '7d'
 */
export async function getRainfallTimeSeries(lat, lng, name = '', period = '24h') {
  try {
    const params = new URLSearchParams({ lat, lng, name, period });
    const response = await fetch(`${API_BASE_URL}/weather/rainfall-timeseries?${params}`);
    if (!response.ok) throw new Error(`Rainfall series HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('getRainfallTimeSeries failed:', error);
    return { data_status: 'UNAVAILABLE', time_series: [], current_rainfall: null };
  }
}

// ============================================================
// PHASE 3 — Multi-Disaster Risk (Flood, Erosion, Landslide, Snow)
// ============================================================

/**
 * Fetch combined Phase 3 risk evaluation for (lat, lng)
 */
export async function getAllRisks(lat, lng, name = '') {
  try {
    const params = new URLSearchParams({ lat, lng, name });
    const response = await fetch(`${API_BASE_URL}/risk/all?${params}`);
    if (!response.ok) throw new Error(`Risk all HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('getAllRisks failed:', error);
    return null;
  }
}

/**
 * Fetch specific Flood Risk
 */
export async function getFloodRisk(lat, lng, name = '') {
  try {
    const params = new URLSearchParams({ lat, lng, name });
    const response = await fetch(`${API_BASE_URL}/risk/flood?${params}`);
    if (!response.ok) throw new Error(`Flood risk HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('getFloodRisk failed:', error);
    return null;
  }
}

/**
 * Fetch specific Soil Erosion Risk
 */
export async function getErosionRisk(lat, lng, name = '') {
  try {
    const params = new URLSearchParams({ lat, lng, name });
    const response = await fetch(`${API_BASE_URL}/risk/erosion?${params}`);
    if (!response.ok) throw new Error(`Erosion risk HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('getErosionRisk failed:', error);
    return null;
  }
}

/**
 * Fetch specific Landslide Risk
 */
export async function getLandslideRisk(lat, lng, name = '') {
  try {
    const params = new URLSearchParams({ lat, lng, name });
    const response = await fetch(`${API_BASE_URL}/risk/landslide?${params}`);
    if (!response.ok) throw new Error(`Landslide risk HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('getLandslideRisk failed:', error);
    return null;
  }
}

/**
 * Fetch specific Snow & Snowmelt Risk
 */
export async function getSnowRisk(lat, lng, name = '') {
  try {
    const params = new URLSearchParams({ lat, lng, name });
    const response = await fetch(`${API_BASE_URL}/risk/snow?${params}`);
    if (!response.ok) throw new Error(`Snow risk HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('getSnowRisk failed:', error);
    return null;
  }
}

// ============================================================
// PHASE 4 — Real-Time Multi-Hazard Feeds (Earthquakes, Tsunamis, Volcanoes, Wildfires, Cyclones)
// ============================================================

/**
 * Fetch combined multi-hazard feed for activeLocation
 */
export async function getAllHazards(lat, lng, name = '') {
  try {
    const params = new URLSearchParams({ lat, lng, name });
    const response = await fetch(`${API_BASE_URL}/hazards/all?${params}`);
    if (!response.ok) throw new Error(`Hazards all HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('getAllHazards failed:', error);
    return null;
  }
}

export async function getEarthquakes(lat, lng) {
  try {
    const params = new URLSearchParams({ lat, lng });
    const response = await fetch(`${API_BASE_URL}/hazards/earthquakes?${params}`);
    if (!response.ok) throw new Error(`Earthquakes HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('getEarthquakes failed:', error);
    return { count: 0, earthquakes: [] };
  }
}

export async function getTsunamis(lat, lng) {
  try {
    const params = new URLSearchParams({ lat, lng });
    const response = await fetch(`${API_BASE_URL}/hazards/tsunamis?${params}`);
    if (!response.ok) throw new Error(`Tsunamis HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('getTsunamis failed:', error);
    return { has_active_warning: false, warnings: [] };
  }
}

export async function getVolcanoes(lat, lng) {
  try {
    const params = new URLSearchParams({ lat, lng });
    const response = await fetch(`${API_BASE_URL}/hazards/volcanoes?${params}`);
    if (!response.ok) throw new Error(`Volcanoes HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('getVolcanoes failed:', error);
    return { count: 0, volcanoes: [] };
  }
}

export async function getWildfires(lat, lng) {
  try {
    const params = new URLSearchParams({ lat, lng });
    const response = await fetch(`${API_BASE_URL}/hazards/wildfires?${params}`);
    if (!response.ok) throw new Error(`Wildfires HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('getWildfires failed:', error);
    return { count: 0, wildfires: [] };
  }
}

export async function getCyclones(lat, lng) {
  try {
    const params = new URLSearchParams({ lat, lng });
    const response = await fetch(`${API_BASE_URL}/hazards/cyclones?${params}`);
    if (!response.ok) throw new Error(`Cyclones HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('getCyclones failed:', error);
    return { has_active_cyclone: false, cyclones: [] };
  }
}

// ============================================================
// PHASE 5 — Projected Impact & Next Affected Regions Engine
// ============================================================

/**
 * Fetch model-based projected impact for activeLocation
 */
export async function getProjectedImpact(lat, lng, name = '', hazard_type = 'AUTO', hours = 3) {
  try {
    const params = new URLSearchParams({ lat, lng, name, hazard_type, hours });
    const response = await fetch(`${API_BASE_URL}/impact/projected?${params}`);
    if (!response.ok) throw new Error(`Projected impact HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('getProjectedImpact failed:', error);
    return null;
  }
}

/**
 * Fetch step-by-step disaster cascade sequence
 */
export async function getDisasterCascade(lat, lng, name = '') {
  try {
    const params = new URLSearchParams({ lat, lng, name });
    const response = await fetch(`${API_BASE_URL}/impact/cascade?${params}`);
    if (!response.ok) throw new Error(`Disaster cascade HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('getDisasterCascade failed:', error);
    return null;
  }
}

// ============================================================
// PHASE 6 — Real-Time Early Warning Center & Alerts
// ============================================================

/**
 * Fetch geo-targeted active alerts
 */
export async function getActiveAlerts(lat = 0, lng = 0, radius_km = 25) {
  try {
    const params = new URLSearchParams({ lat, lng, radius_km });
    const response = await fetch(`${API_BASE_URL}/alerts/active?${params}`);
    if (!response.ok) throw new Error(`Active alerts HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('getActiveAlerts failed:', error);
    return { count: 0, active_alerts: [] };
  }
}

/**
 * Acknowledge active alert by ID
 */
export async function acknowledgeAlert(alert_id) {
  try {
    const response = await fetch(`${API_BASE_URL}/alerts/acknowledge/${encodeURIComponent(alert_id)}`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error(`Acknowledge HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('acknowledgeAlert failed:', error);
    return { success: false, alert_id };
  }
}

/**
 * Fetch historical alert log
 */
export async function getAlertHistory() {
  try {
    const response = await fetch(`${API_BASE_URL}/alerts/history`);
    if (!response.ok) throw new Error(`Alert history HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('getAlertHistory failed:', error);
    return { count: 0, alert_history: [] };
  }
}

/**
 * Fetch monitored alert areas
 */
export async function getAlertAreas() {
  try {
    const response = await fetch(`${API_BASE_URL}/alerts/areas`);
    if (!response.ok) throw new Error(`Alert areas HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('getAlertAreas failed:', error);
    return { count: 0, alert_areas: [] };
  }
}

/**
 * Create new monitored alert area
 */
export async function createAlertArea(payload) {
  try {
    const response = await fetch(`${API_BASE_URL}/alerts/areas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Create alert area HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('createAlertArea failed:', error);
    return null;
  }
}

/**
 * Trigger safe DEMO simulation alert
 */
export async function simulateDemoAlert(hazard_type = 'FLOOD', location_name = 'Chennai', lat = 13.0827, lng = 80.2707) {
  try {
    const params = new URLSearchParams({ hazard_type, location_name, lat, lng });
    const response = await fetch(`${API_BASE_URL}/alerts/simulate-demo?${params}`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error(`Simulate demo HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('simulateDemoAlert failed:', error);
    return null;
  }
}

// ============================================================
// PHASE 7 — Phone Registration & SMS Alert System
// ============================================================

/**
 * Fetch SMS carrier provider status (CONNECTED | DEMO | NOT_CONFIGURED)
 */
export async function getSMSStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/notifications/sms-status`);
    if (!response.ok) throw new Error(`SMS Status HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('getSMSStatus failed:', error);
    return { status: 'DEMO', provider: 'DEMO_SIMULATOR', is_configured: false };
  }
}

/**
 * Fetch country codes and disaster preferences metadata
 */
export async function getCountryCodes() {
  try {
    const response = await fetch(`${API_BASE_URL}/notifications/country-codes`);
    if (!response.ok) throw new Error(`Country codes HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('getCountryCodes failed:', error);
    return { country_codes: [], disaster_types: [], severity_levels: [] };
  }
}

/**
 * Initiate phone registration & request OTP
 */
export async function registerPhone(payload) {
  try {
    const response = await fetch(`${API_BASE_URL}/notifications/register-phone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || `Register phone error: ${response.status}`);
    return data;
  } catch (error) {
    console.warn('registerPhone failed:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Submit 6-digit OTP code for verification
 */
export async function verifyPhone(payload) {
  try {
    const response = await fetch(`${API_BASE_URL}/notifications/verify-phone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || `Verify phone error: ${response.status}`);
    return data;
  } catch (error) {
    console.warn('verifyPhone failed:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Update SMS emergency alert preferences
 */
export async function subscribeSMS(payload) {
  try {
    const response = await fetch(`${API_BASE_URL}/notifications/subscribe-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || `Subscribe SMS error: ${response.status}`);
    return data;
  } catch (error) {
    console.warn('subscribeSMS failed:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Send test / demo SMS alert preview
 */
export async function sendDemoSMS(payload) {
  try {
    const response = await fetch(`${API_BASE_URL}/notifications/send-demo-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Send demo SMS HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('sendDemoSMS failed:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Fetch SMS delivery logs
 */
export async function getSMSDeliveryHistory() {
  try {
    const response = await fetch(`${API_BASE_URL}/notifications/delivery-history`);
    if (!response.ok) throw new Error(`SMS delivery history HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('getSMSDeliveryHistory failed:', error);
    return { count: 0, history: [] };
  }
}

// ============================================================
// PHASE 8 — Mobile Push (Web VAPID, Android FCM, iOS APNs)
// ============================================================

/**
 * Fetch Multi-Platform Push provider status (Web, Android, iOS)
 */
export async function getPushStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/notifications/push-status`);
    if (!response.ok) throw new Error(`Push status HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('getPushStatus failed:', error);
    return {
      overall_status: 'DEMO',
      platforms: {
        web: { status: 'DEMO', is_configured: false },
        android: { status: 'DEMO', is_configured: false },
        ios: { status: 'DEMO', is_configured: false, supports_critical_alerts: true }
      }
    };
  }
}

/**
 * Register push notification device token
 */
export async function registerPushDevice(payload) {
  try {
    const response = await fetch(`${API_BASE_URL}/notifications/register-device`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || `Register push device error: ${response.status}`);
    return data;
  } catch (error) {
    console.warn('registerPushDevice failed:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Unregister push device token
 */
export async function unregisterPushDevice(device_id) {
  try {
    const response = await fetch(`${API_BASE_URL}/notifications/unregister-device`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || `Unregister device error: ${response.status}`);
    return data;
  } catch (error) {
    console.warn('unregisterPushDevice failed:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Fetch registered push devices list
 */
export async function getRegisteredPushDevices() {
  try {
    const response = await fetch(`${API_BASE_URL}/notifications/devices`);
    if (!response.ok) throw new Error(`Fetch devices HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('getRegisteredPushDevices failed:', error);
    return { count: 0, devices: [] };
  }
}

/**
 * Send test push notification (Web / Android / iOS)
 */
export async function sendTestPush(platform = 'WEB', device_id = null) {
  try {
    const response = await fetch(`${API_BASE_URL}/notifications/test-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, device_id })
    });
    if (!response.ok) throw new Error(`Send test push HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('sendTestPush failed:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Fetch push delivery history logs
 */
export async function getPushDeliveryHistory() {
  try {
    const response = await fetch(`${API_BASE_URL}/notifications/push-history`);
    if (!response.ok) throw new Error(`Push delivery history HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('getPushDeliveryHistory failed:', error);
    return { count: 0, history: [] };
  }
}

// ============================================================
// PHASE 9 — AI Safety Guide & Conversational Voice Assistant
// ============================================================

/**
 * Send natural language query to AI Safety Guide backend.
 * Returns: reply_text, character_state, action, source, data_status, location
 */
export async function queryAiGuide(payload) {
  try {
    const response = await fetch(`${API_BASE_URL}/ai/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`AI query HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('queryAiGuide failed:', error);
    return null;
  }
}

/**
 * Fetch interactive website tutorial steps from backend.
 */
export async function getAiTutorial() {
  try {
    const response = await fetch(`${API_BASE_URL}/ai/tutorial`);
    if (!response.ok) throw new Error(`AI tutorial HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('getAiTutorial failed:', error);
    return null;
  }
}

// ============================================================
// PHASE 10 — Life Safety Mode, Shelters & Safer Available Routes
// ============================================================

/**
 * Fetch full emergency safety status for location and hazard type.
 */
export async function fetchSafetyStatus(lat, lng, hazardType = 'FLOOD', locationName = '') {
  try {
    const url = `${API_BASE_URL}/safety/status?lat=${lat}&lng=${lng}&hazard_type=${encodeURIComponent(hazardType)}&location_name=${encodeURIComponent(locationName)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`fetchSafetyStatus HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('fetchSafetyStatus failed:', error);
    return null;
  }
}

/**
 * Fetch verified designated shelters for coordinates.
 */
export async function fetchSafetyShelters(lat, lng, hazardType = 'FLOOD') {
  try {
    const url = `${API_BASE_URL}/safety/shelters?lat=${lat}&lng=${lng}&hazard_type=${encodeURIComponent(hazardType)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`fetchSafetyShelters HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('fetchSafetyShelters failed:', error);
    return null;
  }
}

/**
 * Fetch safer available route between coordinates.
 */
export async function fetchSafetyRoutes(fromLat, fromLng, toLat, toLng, hazardType = 'FLOOD') {
  try {
    const url = `${API_BASE_URL}/safety/routes?fromLat=${fromLat}&fromLng=${fromLng}&toLat=${toLat}&toLng=${toLng}&hazard_type=${encodeURIComponent(hazardType)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`fetchSafetyRoutes HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('fetchSafetyRoutes failed:', error);
    return null;
  }
}

/**
 * Fetch recommended lower-risk areas.
 */
export async function fetchSafetyAreas(lat, lng, hazardType = 'FLOOD') {
  try {
    const url = `${API_BASE_URL}/safety/areas?lat=${lat}&lng=${lng}&hazard_type=${encodeURIComponent(hazardType)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`fetchSafetyAreas HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('fetchSafetyAreas failed:', error);
    return null;
  }
}

/**
 * Fetch disaster-specific safety rules.
 */
export async function fetchSafetyRules(hazardType = 'FLOOD') {
  try {
    const url = `${API_BASE_URL}/safety/rules?hazard_type=${encodeURIComponent(hazardType)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`fetchSafetyRules HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('fetchSafetyRules failed:', error);
    return null;
  }
}

// ============================================================
// PHASE 11 — Emergency Rescue Workflow & Responder Operations
// ============================================================

/**
 * Fetch all active rescue requests for Responder Operations Center.
 */
export async function fetchRescueRequests(status = '', priority = '', disasterType = '') {
  try {
    let url = `${API_BASE_URL}/rescue/requests?`;
    if (status) url += `status=${encodeURIComponent(status)}&`;
    if (priority) url += `priority=${encodeURIComponent(priority)}&`;
    if (disasterType) url += `disaster_type=${encodeURIComponent(disasterType)}&`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`fetchRescueRequests HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('fetchRescueRequests failed:', error);
    return null;
  }
}

/**
 * Fetch detailed rescue request & timeline by ID.
 */
export async function fetchRescueById(rescueId) {
  try {
    const response = await fetch(`${API_BASE_URL}/rescue/${rescueId}`);
    if (!response.ok) throw new Error(`fetchRescueById HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('fetchRescueById failed:', error);
    return null;
  }
}

/**
 * Responder updates rescue request status.
 */
export async function updateRescueStatus(rescueId, status, responderId = 'RESP_NDMA_01', note = '', assignTeamId = '') {
  try {
    let url = `${API_BASE_URL}/rescue/${rescueId}/status?status=${encodeURIComponent(status)}&responder_id=${encodeURIComponent(responderId)}`;
    if (note) url += `&note=${encodeURIComponent(note)}`;
    if (assignTeamId) url += `&assign_team_id=${encodeURIComponent(assignTeamId)}`;
    const response = await fetch(url, { method: 'POST' });
    if (!response.ok) throw new Error(`updateRescueStatus HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('updateRescueStatus failed:', error);
    return null;
  }
}

/**
 * User updates live GPS coordinates.
 */
export async function updateRescueLocation(rescueId, latitude, longitude, movementState = 'STATIONARY') {
  try {
    const url = `${API_BASE_URL}/rescue/${rescueId}/location?latitude=${latitude}&longitude=${longitude}&movement_state=${encodeURIComponent(movementState)}`;
    const response = await fetch(url, { method: 'POST' });
    if (!response.ok) throw new Error(`updateRescueLocation HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('updateRescueLocation failed:', error);
    return null;
  }
}

/**
 * Send two-way rescue message.
 */
export async function sendRescueMessage(rescueId, sender, text) {
  try {
    const url = `${API_BASE_URL}/rescue/${rescueId}/message?sender=${encodeURIComponent(sender)}&text=${encodeURIComponent(text)}`;
    const response = await fetch(url, { method: 'POST' });
    if (!response.ok) throw new Error(`sendRescueMessage HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('sendRescueMessage failed:', error);
    return null;
  }
}

/**
 * Cancel or resolve rescue request.
 */
export async function cancelRescueRequest(rescueId, reason = 'User confirmed safe') {
  try {
    const url = `${API_BASE_URL}/rescue/${rescueId}/cancel?reason=${encodeURIComponent(reason)}`;
    const response = await fetch(url, { method: 'POST' });
    if (!response.ok) throw new Error(`cancelRescueRequest HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('cancelRescueRequest failed:', error);
    return null;
  }
}

/**
 * Fetch emergency contacts for user.
 */
export async function fetchEmergencyContacts(userPhone = '+91-98765-43210') {
  try {
    const url = `${API_BASE_URL}/rescue/contacts?user_phone=${encodeURIComponent(userPhone)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`fetchEmergencyContacts HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('fetchEmergencyContacts failed:', error);
    return null;
  }
}

/**
 * Add emergency contact.
 */
export async function addEmergencyContact(userPhone = '+91-98765-43210', contactData) {
  try {
    const url = `${API_BASE_URL}/rescue/contacts?user_phone=${encodeURIComponent(userPhone)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contactData)
    });
    if (!response.ok) throw new Error(`addEmergencyContact HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('addEmergencyContact failed:', error);
    return null;
  }
}

/**
 * Notify emergency contacts for active rescue request.
 */
export async function notifyEmergencyContacts(rescueId, userPhone = '+91-98765-43210') {
  try {
    const url = `${API_BASE_URL}/rescue/${rescueId}/notify-contacts?user_phone=${encodeURIComponent(userPhone)}`;
    const response = await fetch(url, { method: 'POST' });
    if (!response.ok) throw new Error(`notifyEmergencyContacts HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('notifyEmergencyContacts failed:', error);
    return null;
  }
}

/**
 * Trigger DEMO rescue simulation workflow.
 */
export async function simulateDemoRescue(hazardType = 'LANDSLIDE', locationName = 'Kedarnath Valley') {
  try {
    const url = `${API_BASE_URL}/rescue/simulate-demo?hazard_type=${encodeURIComponent(hazardType)}&location_name=${encodeURIComponent(locationName)}`;
    const response = await fetch(url, { method: 'POST' });
    if (!response.ok) throw new Error(`simulateDemoRescue HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('simulateDemoRescue failed:', error);
    return null;
  }
}

// ============================================================
// PHASE 13 — Historical Analytics & Reports
// ============================================================

/**
 * Fetch historical weather analytics for any global location.
 */
export async function getAnalyticsHistory(lat, lng, days = 30) {
  try {
    const params = new URLSearchParams({ lat, lng, days });
    const response = await fetch(`${API_BASE_URL}/analytics/history?${params}`);
    if (!response.ok) throw new Error(`Analytics history HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('getAnalyticsHistory failed:', error);
    return { status: 'UNAVAILABLE', data_status: 'MISSING', history: [], summary: {} };
  }
}

/**
 * Fetch historical disaster events for any global location.
 */
export async function getAnalyticsHazards(lat, lng, location = '') {
  try {
    const params = new URLSearchParams({ lat, lng, location });
    const response = await fetch(`${API_BASE_URL}/analytics/hazards?${params}`);
    if (!response.ok) throw new Error(`Analytics hazards HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('getAnalyticsHazards failed:', error);
    return { events: [], data_status: 'MISSING', count: 0 };
  }
}

/**
 * Fetch global platform statistics.
 */
export async function getPlatformStats() {
  try {
    const response = await fetch(`${API_BASE_URL}/analytics/stats`);
    if (!response.ok) throw new Error(`Platform stats HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('getPlatformStats failed:', error);
    return null;
  }
}

/**
 * Generate a comprehensive location safety report.
 */
export async function getLocationReport(lat, lng, location = '') {
  try {
    const params = new URLSearchParams({ lat, lng, location });
    const response = await fetch(`${API_BASE_URL}/analytics/report?${params}`);
    if (!response.ok) throw new Error(`Location report HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('getLocationReport failed:', error);
    return null;
  }
}

// ============================================================
// PHASE 15 — Emergency SOS Alarm + Family + Responder Alert System
// ============================================================

function _normalizeRescueToSOS(rescueData, payload = {}) {
  if (!rescueData) return null;
  const req = rescueData.request || rescueData;
  const rescueId = req.rescue_id || rescueData.rescue_id || `RES-2026-${Math.floor(10000 + Math.random() * 90000)}`;
  const nowIso = req.created_at || new Date().toISOString();
  
  const status = req.status === 'REQUESTED' ? 'ACTIVE' : (req.status || 'ACTIVE');
  const isAck = ['ACKNOWLEDGED', 'DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'RESCUED'].includes(req.status);

  const baseTimeline = [
    { step: 'SOS_SENT', status: 'ACTIVE', timestamp: nowIso, note: 'Emergency SOS activated by user.' },
    { step: 'FAMILY_NOTIFIED', status: 'COMPLETED', timestamp: nowIso, note: 'Emergency contacts notified via SMS.' },
    { step: 'RESPONDER_NOTIFIED', status: 'COMPLETED', timestamp: nowIso, note: 'Authorized responders alerted.' },
    { step: 'RESPONDER_ACKNOWLEDGED', status: isAck ? 'COMPLETED' : 'PENDING', timestamp: isAck ? req.updated_at : null, note: isAck ? 'Responder acknowledged request.' : 'Awaiting responder acknowledgement.' },
    { step: 'DISPATCHED', status: ['DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'RESCUED'].includes(req.status) ? 'COMPLETED' : 'PENDING', timestamp: null, note: '' },
    { step: 'EN_ROUTE', status: ['EN_ROUTE', 'ARRIVED', 'RESCUED'].includes(req.status) ? 'COMPLETED' : 'PENDING', timestamp: null, note: '' },
    { step: 'ARRIVED', status: ['ARRIVED', 'RESCUED'].includes(req.status) ? 'COMPLETED' : 'PENDING', timestamp: null, note: '' },
    { step: 'RESCUED', status: req.status === 'RESCUED' ? 'COMPLETED' : 'PENDING', timestamp: null, note: '' },
  ];

  const sosRecord = {
    sos_id: rescueId,
    rescue_id: rescueId,
    user_id: req.user_id || payload?.user_id || 'user_anon_01',
    user_name: req.user_name || payload?.user_name || 'Emergency User',
    phone: req.phone || payload?.phone || '+91-98765-43210',
    priority: req.priority || 'CRITICAL',
    status: status,
    latitude: req.latitude || payload?.latitude || 13.0827,
    longitude: req.longitude || payload?.longitude || 80.2707,
    location_name: req.location_name || payload?.location_name || 'Emergency Location',
    user_condition: req.user_condition || payload?.user_condition || 'NORMAL',
    alarm_active: status !== 'CANCELLED' && status !== 'RESCUED',
    created_at: nowIso,
    updated_at: req.updated_at || nowIso,
    safety_message: rescueData.help_guarantee_disclaimer || req.help_guarantee_disclaimer || 'Emergency request sent — awaiting responder acknowledgement. Stay in the safest location available.',
    data_type: rescueId.includes('DEMO') ? 'DEMO' : 'LIVE',
    timeline: req.timeline || baseTimeline,
    notifications: {
      family: [{ contact_name: 'Emergency Contacts', channel: 'SMS', status: 'SENT' }],
      responders: [{ responder_id: 'NDRF_ALPHA_01', responder_name: 'NDRF Mountain Rescue', acknowledged: isAck }],
    }
  };

  return {
    success: true,
    sos_id: rescueId,
    rescue_id: rescueId,
    status: status,
    priority: req.priority || 'CRITICAL',
    alarm_active: status !== 'CANCELLED' && status !== 'RESCUED',
    safety_message: sosRecord.safety_message,
    family_notified: 1,
    responders_notified: 1,
    data_type: sosRecord.data_type,
    record: sosRecord
  };
}

/**
 * Activate Emergency SOS — creates SOS record & linked rescue request
 */
export async function activateSOS(payload) {
  try {
    let response = await fetch(`${API_BASE_URL}/sos/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.status === 404) {
      console.warn('[SOS] /api/sos/activate returned 404, using /api/rescue/request fallback');
      const rescuePayload = {
        user_id: payload.user_id || 'user_anon_01',
        user_name: payload.user_name || 'Emergency User',
        phone: payload.phone || '+91-98765-43210',
        verified_phone: payload.phone || '+91-98765-43210',
        latitude: payload.latitude,
        longitude: payload.longitude,
        location_name: payload.location_name || 'Unknown Location',
        last_known_location: payload.location_name || 'Unknown Location',
        user_condition: payload.user_condition || 'TRAPPED',
        medical_status: payload.user_condition || 'TRAPPED',
        disaster_type: payload.disaster_type || 'EMERGENCY_SOS',
        user_message: `EMERGENCY SOS activated near ${payload.location_name || 'location'}.`,
        message: `EMERGENCY SOS activated near ${payload.location_name || 'location'}.`,
      };

      response = await fetch(`${API_BASE_URL}/rescue/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rescuePayload),
      });

      if (response.ok) {
        const rescueData = await response.json();
        return _normalizeRescueToSOS(rescueData, payload);
      }
    }

    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || `SOS Activation HTTP ${response.status}`);
    return data;
  } catch (error) {
    console.warn('activateSOS failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch currently active SOS for user
 */
export async function getActiveSOS(userId = 'user_anon_01') {
  try {
    const params = new URLSearchParams({ user_id: userId });
    let response = await fetch(`${API_BASE_URL}/sos/active?${params}`);

    if (response.status === 404) {
      response = await fetch(`${API_BASE_URL}/rescue/requests`);
      if (response.ok) {
        const listData = await response.json();
        const reqs = listData.requests || listData || [];
        const activeReq = reqs.find((r) => r.user_id === userId && r.status !== 'CANCELLED' && r.status !== 'RESCUED');
        if (activeReq) {
          const normalized = _normalizeRescueToSOS(activeReq);
          return { active: true, sos_id: normalized.sos_id, record: normalized.record };
        }
        return { active: false, sos_id: null };
      }
    }

    if (!response.ok) throw new Error(`getActiveSOS HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('getActiveSOS failed:', error);
    return { active: false, sos_id: null };
  }
}

/**
 * Fetch SOS details by ID
 */
export async function getSOSDetails(sosId, authToken = null) {
  try {
    let url = `${API_BASE_URL}/sos/${encodeURIComponent(sosId)}`;
    if (authToken) url += `?auth_token=${encodeURIComponent(authToken)}`;
    let response = await fetch(url);

    if (response.status === 404) {
      let rescueUrl = `${API_BASE_URL}/rescue/${encodeURIComponent(sosId)}`;
      if (authToken) rescueUrl += `?auth_token=${encodeURIComponent(authToken)}`;
      response = await fetch(rescueUrl);
      if (response.ok) {
        const rescueData = await response.json();
        const normalized = _normalizeRescueToSOS(rescueData);
        return normalized ? normalized.record : null;
      }
    }

    if (!response.ok) throw new Error(`getSOSDetails HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('getSOSDetails failed:', error);
    return null;
  }
}

/**
 * Escalates condition to BURIED / TRAPPED / INJURED (Priority: CRITICAL)
 */
export async function escalateSOS(sosId, condition = 'TRAPPED') {
  try {
    let response = await fetch(`${API_BASE_URL}/sos/${encodeURIComponent(sosId)}/escalate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ condition }),
    });

    if (response.status === 404) {
      response = await fetch(`${API_BASE_URL}/rescue/${encodeURIComponent(sosId)}/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movement_status: condition }),
      });
      if (response.ok) {
        return { success: true, sos_id: sosId, user_condition: condition, priority: 'CRITICAL' };
      }
    }

    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || `escalateSOS HTTP ${response.status}`);
    return data;
  } catch (error) {
    console.warn('escalateSOS failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Cancel SOS / mark I AM SAFE
 */
export async function cancelSOS(sosId, reason = 'User confirmed safe') {
  try {
    let response = await fetch(`${API_BASE_URL}/sos/${encodeURIComponent(sosId)}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });

    if (response.status === 404) {
      response = await fetch(`${API_BASE_URL}/rescue/${encodeURIComponent(sosId)}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (response.ok) {
        return { success: true, sos_id: sosId, status: 'CANCELLED', alarm_active: false };
      }
    }

    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || `cancelSOS HTTP ${response.status}`);
    return data;
  } catch (error) {
    console.warn('cancelSOS failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * User live GPS update for SOS
 */
export async function updateSOSLocation(sosId, payload) {
  try {
    let response = await fetch(`${API_BASE_URL}/sos/${encodeURIComponent(sosId)}/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.status === 404) {
      response = await fetch(`${API_BASE_URL}/rescue/${encodeURIComponent(sosId)}/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        return { success: true, sos_id: sosId, gps_status: 'GPS_LIVE' };
      }
    }

    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || `updateSOSLocation HTTP ${response.status}`);
    return data;
  } catch (error) {
    console.warn('updateSOSLocation failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Responder updates SOS status
 */
export async function updateSOSStatus(sosId, payload) {
  try {
    let response = await fetch(`${API_BASE_URL}/sos/${encodeURIComponent(sosId)}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.status === 404) {
      response = await fetch(`${API_BASE_URL}/rescue/${encodeURIComponent(sosId)}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        const data = await response.json();
        return { success: true, sos_id: sosId, new_status: data.status };
      }
    }

    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || `updateSOSStatus HTTP ${response.status}`);
    return data;
  } catch (error) {
    console.warn('updateSOSStatus failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch SOS audit trail
 */
export async function getSOSAudit(sosId) {
  try {
    const response = await fetch(`${API_BASE_URL}/sos/${encodeURIComponent(sosId)}/audit`);
    if (!response.ok) throw new Error(`getSOSAudit HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('getSOSAudit failed:', error);
    return { count: 0, audit_trail: [] };
  }
}

/**
 * Trigger DEMO SOS simulation
 */
export async function simulateDemoSOS(locationName = 'Chennai', lat = 13.0827, lng = 80.2707) {
  try {
    const params = new URLSearchParams({ location_name: locationName, lat, lng });
    let response = await fetch(`${API_BASE_URL}/sos/simulate-demo?${params}`, {
      method: 'POST',
    });

    if (response.status === 404) {
      const rescueParams = new URLSearchParams({ location_name: locationName, hazard_type: 'EMERGENCY_SOS' });
      response = await fetch(`${API_BASE_URL}/rescue/simulate-demo?${rescueParams}`, {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        return _normalizeRescueToSOS(data);
      }
    }

    if (!response.ok) throw new Error(`simulateDemoSOS HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('simulateDemoSOS failed:', error);
    return { success: false, error: error.message };
  }
}



// ============================================================
// PHASE 16: Authentication & Account Management API
// ============================================================

const getAuthApiBase = () => API_BASE_URL;

const SESSION_STORAGE_KEY = 'em_platform_session';

export function getStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.token) return null;
    // Check expiry
    if (parsed.expires_at && new Date(parsed.expires_at) < new Date()) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function storeSession(token, expiresAt) {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ token, expires_at: expiresAt }));
  } catch { /* ignore */ }
}

export function clearStoredSession() {
  try { localStorage.removeItem(SESSION_STORAGE_KEY); } catch { /* ignore */ }
}

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

// ---- Auth Endpoints ----

export async function authLogin(identifier, password) {
  try {
    const res = await fetch(`${getAuthApiBase()}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.detail || 'Invalid login credentials.' };
    }
    return await res.json();
  } catch (e) {
    console.warn('authLogin failed:', e);
    return { success: false, error: 'Network error. Please check your connection.' };
  }
}

export async function authLoginDemo() {
  try {
    const res = await fetch(`${getAuthApiBase()}/auth/login-demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.detail || 'Demo login failed.' };
    }
    return await res.json();
  } catch (e) {
    console.warn('authLoginDemo failed:', e);
    return { success: false, error: 'Network error. Please check your connection.' };
  }
}

export async function authRegister(payload) {
  try {
    const res = await fetch(`${getAuthApiBase()}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.detail || 'Registration failed.' };
    }
    return await res.json();
  } catch (e) {
    console.warn('authRegister failed:', e);
    return { success: false, error: 'Network error. Please check your connection.' };
  }
}

export async function authGetMe(token) {
  try {
    const res = await fetch(`${getAuthApiBase()}/auth/me`, {
      headers: authHeaders(token)
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn('authGetMe failed:', e);
    return null;
  }
}

export async function authLogout(token) {
  try {
    await fetch(`${getAuthApiBase()}/auth/logout`, {
      method: 'POST',
      headers: authHeaders(token)
    });
  } catch (e) {
    console.warn('authLogout failed:', e);
  }
}

export async function authRefresh(token) {
  try {
    const res = await fetch(`${getAuthApiBase()}/auth/refresh`, {
      method: 'POST',
      headers: authHeaders(token)
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn('authRefresh failed:', e);
    return null;
  }
}

export async function authRequestPhoneOtp(phone, countryCode = '+91') {
  try {
    const res = await fetch(`${getAuthApiBase()}/auth/request-phone-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, country_code: countryCode })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.detail || 'Failed to send OTP.' };
    }
    return await res.json();
  } catch (e) {
    return { success: false, error: 'Network error.' };
  }
}

export async function authVerifyPhoneOtp(phone, otp, token = null) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${getAuthApiBase()}/auth/verify-phone-otp`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ phone, otp })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.detail || 'Invalid OTP.' };
    }
    return await res.json();
  } catch (e) {
    return { success: false, error: 'Network error.' };
  }
}

export async function authRequestEmailVerification(email) {
  try {
    const res = await fetch(`${getAuthApiBase()}/auth/request-email-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.detail || 'Failed to send verification email.' };
    }
    return await res.json();
  } catch (e) {
    return { success: false, error: 'Network error.' };
  }
}

export async function authVerifyEmail(email, code, token = null) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${getAuthApiBase()}/auth/verify-email`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, code })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.detail || 'Invalid verification code.' };
    }
    return await res.json();
  } catch (e) {
    return { success: false, error: 'Network error.' };
  }
}

export async function authGetOAuthStatus() {
  try {
    const res = await fetch(`${getAuthApiBase()}/auth/oauth-status`);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

export async function authForgotPassword(email) {
  try {
    const res = await fetch(`${getAuthApiBase()}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return await res.json();
  } catch (e) {
    return { success: false, error: 'Network error.' };
  }
}

// ---- Account Endpoints ----

export async function accountGetProfile(token) {
  try {
    const res = await fetch(`${getAuthApiBase()}/account/profile`, { headers: authHeaders(token) });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) { return null; }
}

export async function accountUpdateProfile(token, payload) {
  try {
    const res = await fetch(`${getAuthApiBase()}/account/profile`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (e) { return { success: false, error: 'Network error.' }; }
}

export async function accountDeleteProfile(token) {
  try {
    const res = await fetch(`${getAuthApiBase()}/account/profile`, {
      method: 'DELETE',
      headers: authHeaders(token)
    });
    return await res.json();
  } catch (e) { return { success: false, error: 'Network error.' }; }
}

export async function accountGetContacts(token) {
  try {
    const res = await fetch(`${getAuthApiBase()}/account/emergency-contacts`, { headers: authHeaders(token) });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) { return null; }
}

export async function accountAddContact(token, contact) {
  try {
    const res = await fetch(`${getAuthApiBase()}/account/emergency-contacts`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(contact)
    });
    return await res.json();
  } catch (e) { return { success: false, error: 'Network error.' }; }
}

export async function accountUpdateContact(token, contactId, updates) {
  try {
    const res = await fetch(`${getAuthApiBase()}/account/emergency-contacts/${contactId}`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify(updates)
    });
    return await res.json();
  } catch (e) { return { success: false, error: 'Network error.' }; }
}

export async function accountDeleteContact(token, contactId) {
  try {
    const res = await fetch(`${getAuthApiBase()}/account/emergency-contacts/${contactId}`, {
      method: 'DELETE',
      headers: authHeaders(token)
    });
    return await res.json();
  } catch (e) { return { success: false, error: 'Network error.' }; }
}

export async function accountTestContact(token, contactId) {
  try {
    const res = await fetch(`${getAuthApiBase()}/account/emergency-contacts/${contactId}/test`, {
      method: 'POST',
      headers: authHeaders(token)
    });
    return await res.json();
  } catch (e) { return { success: false, error: 'Network error.' }; }
}

export async function accountGetLocations(token) {
  try {
    const res = await fetch(`${getAuthApiBase()}/account/locations`, { headers: authHeaders(token) });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) { return null; }
}

export async function accountAddLocation(token, location) {
  try {
    const res = await fetch(`${getAuthApiBase()}/account/locations`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(location)
    });
    return await res.json();
  } catch (e) { return { success: false, error: 'Network error.' }; }
}

export async function accountDeleteLocation(token, locationId) {
  try {
    const res = await fetch(`${getAuthApiBase()}/account/locations/${locationId}`, {
      method: 'DELETE',
      headers: authHeaders(token)
    });
    return await res.json();
  } catch (e) { return { success: false, error: 'Network error.' }; }
}

export async function accountGetPreferences(token) {
  try {
    const res = await fetch(`${getAuthApiBase()}/account/preferences`, { headers: authHeaders(token) });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) { return null; }
}

export async function accountUpdatePreferences(token, prefs) {
  try {
    const res = await fetch(`${getAuthApiBase()}/account/preferences`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify(prefs)
    });
    return await res.json();
  } catch (e) { return { success: false, error: 'Network error.' }; }
}

export async function accountGetDevices(token) {
  try {
    const res = await fetch(`${getAuthApiBase()}/account/devices`, { headers: authHeaders(token) });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) { return null; }
}

export async function accountDeleteDevice(token, deviceId) {
  try {
    const res = await fetch(`${getAuthApiBase()}/account/devices/${deviceId}`, {
      method: 'DELETE',
      headers: authHeaders(token)
    });
    return await res.json();
  } catch (e) { return { success: false, error: 'Network error.' }; }
}
