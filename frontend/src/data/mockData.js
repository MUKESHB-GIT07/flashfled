/* =========================================================
   Mock Data — Flash Flood Prediction System
   All demo/prototype data for SIH26192
   ========================================================= */

export const systemStatus = {
  monitoring: true,
  statusLabel: 'MONITORING ACTIVE',
  lastUpdated: '2026-09-06 00:42 IST',
  dataSourcesOnline: 5,
  totalDataSources: 5,
  uptime: '99.7%',
};

export const telemetryData = [
  {
    id: 'rainfall',
    title: 'RAINFALL',
    value: 82,
    displayValue: '82',
    unit: 'mm/hr',
    trend: '+18%',
    trendDirection: 'up',
    trendPeriod: '1h',
    icon: 'CloudRain',
    sparkline: [22, 28, 30, 35, 38, 42, 40, 48, 55, 60, 65, 58, 62, 68, 72, 75, 78, 80, 82],
    metadata: 'IMD STATION · UPDATED 2 MIN AGO',
    riskLevel: 'high',
  },
  {
    id: 'waterLevel',
    title: 'WATER LEVEL',
    value: 3.8,
    displayValue: '3.8',
    unit: 'm',
    trend: '+12%',
    trendDirection: 'up',
    trendPeriod: '1h',
    icon: 'Waves',
    sparkline: [1.8, 2.0, 2.1, 2.2, 2.4, 2.5, 2.7, 2.8, 3.0, 3.1, 3.2, 3.3, 3.4, 3.5, 3.5, 3.6, 3.7, 3.7, 3.8],
    metadata: 'CWC GAUGE · UPDATED 5 MIN AGO',
    riskLevel: 'high',
  },
  {
    id: 'soilMoisture',
    title: 'SOIL MOISTURE',
    value: 86,
    displayValue: '86',
    unit: '%',
    trend: '+8%',
    trendDirection: 'up',
    trendPeriod: '3h',
    icon: 'Droplets',
    sparkline: [52, 55, 58, 60, 62, 65, 67, 70, 72, 74, 76, 78, 79, 80, 82, 83, 84, 85, 86],
    metadata: 'ISRO SENSOR · UPDATED 15 MIN AGO',
    riskLevel: 'high',
  },
  {
    id: 'slopeRisk',
    title: 'SLOPE RISK',
    value: 'HIGH',
    displayValue: 'HIGH',
    unit: '',
    trend: 'ELEVATED',
    trendDirection: 'up',
    trendPeriod: '',
    icon: 'TrendingUp',
    sparkline: [2, 3, 3, 4, 4, 5, 5, 5, 6, 6, 7, 7, 7, 7, 8, 8, 8, 8, 8],
    metadata: 'DEM ANALYSIS · 30M RESOLUTION',
    riskLevel: 'high',
  },
  {
    id: 'elevation',
    title: 'ELEVATION',
    value: 1420,
    displayValue: '1,420',
    unit: 'm',
    trend: 'FIXED',
    trendDirection: 'neutral',
    trendPeriod: '',
    icon: 'Mountain',
    sparkline: [],
    metadata: 'SRTM · PRIMARY MONITORING POINT',
    riskLevel: 'neutral',
  },
];

export const riskAssessment = {
  score: 78,
  maxScore: 100,
  level: 'HIGH',
  confidence: 91,
  drivers: [
    { name: 'Heavy rainfall', value: 88, color: 'var(--accent-blue)' },
    { name: 'Soil saturation', value: 82, color: 'var(--accent-teal)' },
    { name: 'Water level', value: 72, color: 'var(--accent-amber)' },
    { name: 'Steep terrain', value: 65, color: 'var(--risk-high)' },
    { name: 'Historical pattern', value: 58, color: 'var(--accent-purple)' },
  ],
  disclaimer: 'Illustrative model factors using demo data',
};

export const locations = [
  {
    id: 1,
    name: 'Kedarnath Valley',
    lat: 30.7346,
    lng: 79.0669,
    riskScore: 78,
    riskLevel: 'high',
    rainfall: 82,
    waterLevel: 3.8,
    soilMoisture: 86,
    status: 'MONITORING',
    region: 'Rudraprayag, Uttarakhand',
  },
  {
    id: 2,
    name: 'Chamoli Township',
    lat: 30.4100,
    lng: 79.3300,
    riskScore: 85,
    riskLevel: 'critical',
    rainfall: 95,
    waterLevel: 4.2,
    soilMoisture: 91,
    status: 'ALERT ACTIVE',
    region: 'Chamoli, Uttarakhand',
  },
  {
    id: 3,
    name: 'Pithoragarh Basin',
    lat: 29.5829,
    lng: 80.2182,
    riskScore: 52,
    riskLevel: 'moderate',
    rainfall: 55,
    waterLevel: 2.9,
    soilMoisture: 72,
    status: 'MONITORING',
    region: 'Pithoragarh, Uttarakhand',
  },
  {
    id: 4,
    name: 'Uttarkashi Valley',
    lat: 30.7268,
    lng: 78.4354,
    riskScore: 71,
    riskLevel: 'high',
    rainfall: 68,
    waterLevel: 3.4,
    soilMoisture: 78,
    status: 'MONITORING',
    region: 'Uttarkashi, Uttarakhand',
  },
  {
    id: 5,
    name: 'Rudraprayag Confluence',
    lat: 30.2840,
    lng: 78.9800,
    riskScore: 89,
    riskLevel: 'critical',
    rainfall: 102,
    waterLevel: 4.6,
    soilMoisture: 94,
    status: 'ALERT ACTIVE',
    region: 'Rudraprayag, Uttarakhand',
  },
  {
    id: 6,
    name: 'Joshimath Slopes',
    lat: 30.5550,
    lng: 79.5650,
    riskScore: 38,
    riskLevel: 'low',
    rainfall: 32,
    waterLevel: 1.8,
    soilMoisture: 55,
    status: 'STABLE',
    region: 'Chamoli, Uttarakhand',
  },
];

/* 24-hour time-series data (hourly) */
const hours = Array.from({ length: 24 }, (_, i) => {
  const h = String(i).padStart(2, '0');
  return `${h}:00`;
});

export const timeSeriesData = {
  rainfall: hours.map((time, i) => ({
    time,
    value:
      i < 6
        ? 12 + Math.round(Math.random() * 8)
        : i < 10
          ? 20 + Math.round((i - 6) * 8 + Math.random() * 5)
          : i < 16
            ? 50 + Math.round((i - 10) * 6 + Math.random() * 8)
            : i < 20
              ? 75 + Math.round(Math.random() * 10)
              : 80 + Math.round(Math.random() * 5),
  })),
  waterLevel: hours.map((time, i) => ({
    time,
    value: +(
      1.2 +
      (i < 8
        ? i * 0.1
        : i < 14
          ? 0.8 + (i - 8) * 0.2
          : i < 20
            ? 2.0 + (i - 14) * 0.15
            : 2.9 + (i - 20) * 0.2) +
      Math.random() * 0.15
    ).toFixed(1),
  })),
  soilMoisture: hours.map((time, i) => ({
    time,
    value: Math.min(
      98,
      Math.round(
        45 +
          (i < 6
            ? i * 2
            : i < 12
              ? 12 + (i - 6) * 4
              : i < 18
                ? 36 + (i - 12) * 3
                : 54 + (i - 18) * 2) +
          Math.random() * 3
      )
    ),
  })),
};

export const alertData = {
  level: 'high',
  status: 'HIGH RISK DETECTED',
  location: 'Kedarnath Valley',
  region: 'Rudraprayag District, Uttarakhand',
  timestamp: '2026-09-06 00:38 IST',
  reasons: [
    'Heavy rainfall detected at 82 mm/hr — exceeding warning threshold',
    'Soil moisture approaching saturation at 86%',
    'Water level rising above danger mark at 3.8 m',
    'Steep terrain gradient increases surface runoff risk',
  ],
  recommendation:
    'Follow official emergency instructions and move to a safer location if advised by authorities. This is a prototype early-warning demonstration.',
};

export const dataSources = [
  {
    id: 'weather',
    name: 'WEATHER',
    description: 'Rainfall & Forecast',
    icon: 'Cloud',
    status: 'online',
    provider: 'IMD',
    latency: '1.2s',
  },
  {
    id: 'hydrology',
    name: 'HYDROLOGY',
    description: 'River Water Level',
    icon: 'Waves',
    status: 'online',
    provider: 'CWC',
    latency: '2.1s',
  },
  {
    id: 'satellite',
    name: 'SATELLITE',
    description: 'Terrain & Earth Obs.',
    icon: 'Satellite',
    status: 'online',
    provider: 'ISRO',
    latency: '4.5s',
  },
  {
    id: 'soil',
    name: 'SOIL',
    description: 'Soil Moisture',
    icon: 'Droplets',
    status: 'online',
    provider: 'ISRO',
    latency: '3.8s',
  },
  {
    id: 'historical',
    name: 'HISTORICAL',
    description: 'Flood Records',
    icon: 'Database',
    status: 'online',
    provider: 'NDMA',
    latency: '0.8s',
  },
];

export const riskExplanationSteps = [
  {
    icon: 'CloudRain',
    label: '82 mm/hr rainfall',
    detail: 'Extreme precipitation detected',
  },
  {
    icon: 'ArrowDown',
    label: 'High runoff potential',
    detail: 'Steep gradients accelerate flow',
  },
  {
    icon: 'Droplets',
    label: '86% soil moisture',
    detail: 'Near-saturated ground conditions',
  },
  {
    icon: 'Layers',
    label: 'Low infiltration capacity',
    detail: 'Water cannot absorb into soil',
  },
  {
    icon: 'Mountain',
    label: 'Steep terrain gradient',
    detail: '1,420 m elevation, narrow valleys',
  },
  {
    icon: 'AlertTriangle',
    label: 'HIGH FLOOD RISK',
    detail: 'Multiple converging risk factors',
    isConclusion: true,
  },
];

export const navItems = {
  top: [
    { id: 'overview', label: 'OVERVIEW', icon: 'LayoutDashboard' },
    { id: 'risk-map', label: 'RISK MAP', icon: 'Map' },
    { id: 'prediction', label: 'PREDICTION', icon: 'Brain' },
    { id: 'environment', label: 'ENVIRONMENT', icon: 'Thermometer' },
    { id: 'alerts', label: 'ALERTS', icon: 'Bell' },
    { id: 'locations', label: 'LOCATIONS', icon: 'MapPin' },
  ],
  bottom: [
    { id: 'data-sources', label: 'DATA SOURCES', icon: 'Database' },
    { id: 'system', label: 'SYSTEM', icon: 'Settings' },
  ],
};
