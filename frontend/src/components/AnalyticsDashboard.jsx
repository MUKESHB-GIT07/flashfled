import React, { useState, useEffect } from 'react';
import { 
  BarChart2, Activity, Calendar, History, ArrowUpRight, ArrowDownRight,
  Wind, Droplets, Thermometer, AlertTriangle, AlertCircle, Map, Info, Download
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import styles from './AnalyticsDashboard.module.css';
import { getAnalyticsHistory, getAnalyticsHazards, getPlatformStats } from '../services/api';

const AnalyticsDashboard = ({ location, currentLocation, onSelectEvent }) => {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30); // 30 days
  const [weatherData, setWeatherData] = useState(null);
  const [hazardData, setHazardData] = useState(null);
  const [statsData, setStatsData] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const [weather, hazards, stats] = await Promise.all([
          getAnalyticsHistory(location.lat, location.lng, timeRange),
          getAnalyticsHazards(location.lat, location.lng, location.name),
          getPlatformStats()
        ]);
        
        setWeatherData(weather);
        setHazardData(hazards);
        setStatsData(stats);
      } catch (err) {
        console.error("Failed to fetch analytics", err);
      }
      setLoading(false);
    };
    
    if (location) fetchAnalytics();
  }, [location, timeRange]);

  if (loading || !weatherData) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <Activity className={styles.loadingIcon} />
          <p>LOADING GLOBAL ANALYTICS FOR {location?.name?.toUpperCase() || 'LOCATION'}...</p>
        </div>
      </div>
    );
  }

  const history = (weatherData && Array.isArray(weatherData.history)) ? weatherData.history : [];
  const events = (hazardData && Array.isArray(hazardData.events)) ? hazardData.events : [];

  // Process data for charts safely
  const chartData = history.map(d => ({
    name: d.date ? new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—',
    tempMax: (d.temp_max_c != null && !isNaN(d.temp_max_c)) ? Number(d.temp_max_c) : null,
    rainfall: (d.precipitation_mm != null && !isNaN(d.precipitation_mm)) ? Number(d.precipitation_mm) : null,
    wind: (d.wind_max_kmh != null && !isNaN(d.wind_max_kmh)) ? Number(d.wind_max_kmh) : null
  }));

  // Averages for comparison with strict numerical checks
  const validTemps = history.map(d => d.temp_max_c).filter(v => v != null && !isNaN(v) && isFinite(v));
  const validRain = history.map(d => d.precipitation_mm).filter(v => v != null && !isNaN(v) && isFinite(v));

  const avgTemp = validTemps.length > 0 ? (validTemps.reduce((acc, v) => acc + Number(v), 0) / validTemps.length) : null;
  const avgRain = validRain.length > 0 ? (validRain.reduce((acc, v) => acc + Number(v), 0) / validRain.length) : null;

  const curTemp = (currentLocation?.temperature != null && !isNaN(currentLocation.temperature)) 
    ? Number(currentLocation.temperature) 
    : ((currentLocation?.temp_c != null && !isNaN(currentLocation.temp_c)) ? Number(currentLocation.temp_c) : null);
    
  const curRain = (currentLocation?.precipitation != null && !isNaN(currentLocation.precipitation)) 
    ? Number(currentLocation.precipitation) 
    : ((currentLocation?.rainfall_mm != null && !isNaN(currentLocation.rainfall_mm)) ? Number(currentLocation.rainfall_mm) : null);

  const tempDiff = (curTemp != null && avgTemp != null) ? (curTemp - avgTemp) : null;
  const rainDiff = (curRain != null && avgRain != null) ? (curRain - avgRain) : null;

  const formatStat = (val, unit = '', decimals = 1) => {
    if (val == null || isNaN(val) || !isFinite(val)) return 'HISTORICAL DATA NOT AVAILABLE';
    return `${Number(val).toFixed(decimals)} ${unit}`.trim();
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <BarChart2 className={styles.headerIcon} />
          <div>
            <h2 className={styles.title}>GLOBAL ANALYTICS & HISTORICAL REPORT</h2>
            <p className={styles.subtitle}>{location.name} • {location.lat?.toFixed(4)}, {location.lng?.toFixed(4)}</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.statusBadge}>
            <span className={styles.statusDot} style={{ backgroundColor: weatherData.data_status === 'GOOD' ? 'var(--risk-low)' : 'var(--risk-moderate)' }}></span>
            {weatherData.data_status === 'GOOD' ? 'LIVE + HISTORICAL' : weatherData.data_status === 'PARTIAL' ? 'PARTIAL COVERAGE' : 'HISTORICAL DATA NOT AVAILABLE'}
          </div>
          <button className={styles.exportBtn}>
            <Download size={16} /> EXPORT REPORT
          </button>
        </div>
      </header>

      <div className={styles.controls}>
        <div className={styles.timeRangeSelector}>
          {[7, 30, 90, 365].map(days => (
            <button 
              key={days} 
              className={timeRange === days ? styles.activeTab : styles.tab}
              onClick={() => setTimeRange(days)}
            >
              {days} DAYS
            </button>
          ))}
        </div>
        <div className={styles.dataSourceLabel}>
          SOURCE: {weatherData.data_source || 'Open-Meteo Historical Archive'}
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <Thermometer size={16} />
            <span>TEMPERATURE TRENDS</span>
          </div>
          <div className={styles.comparisonGrid}>
            <div>
              <div className={styles.statLabel}>CURRENT</div>
              <div className={styles.statValue}>{formatStat(curTemp, '°C')}</div>
            </div>
            <div>
              <div className={styles.statLabel}>HISTORICAL AVG</div>
              <div className={styles.statValue}>{formatStat(avgTemp, '°C')}</div>
            </div>
            <div>
              <div className={styles.statLabel}>CHANGE</div>
              <div className={styles.statValue} style={{ color: tempDiff != null ? (tempDiff > 0 ? 'var(--risk-high)' : 'var(--risk-low)') : 'var(--text-tertiary)' }}>
                {tempDiff != null ? (
                  <>
                    {tempDiff > 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                    {Math.abs(tempDiff).toFixed(1)}°C
                  </>
                ) : (
                  'N/A'
                )}
              </div>
            </div>
          </div>
          <div className={styles.chartContainer}>
            {chartData.length > 0 && validTemps.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                  <Area type="monotone" dataKey="tempMax" stroke="#f59e0b" fillOpacity={1} fill="url(#tempGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className={styles.emptyState}>HISTORICAL DATA NOT AVAILABLE</div>
            )}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <Droplets size={16} />
            <span>RAINFALL HISTORY</span>
          </div>
          <div className={styles.comparisonGrid}>
            <div>
              <div className={styles.statLabel}>CURRENT</div>
              <div className={styles.statValue}>{formatStat(curRain, 'mm')}</div>
            </div>
            <div>
              <div className={styles.statLabel}>HISTORICAL AVG</div>
              <div className={styles.statValue}>{formatStat(avgRain, 'mm')}</div>
            </div>
            <div>
              <div className={styles.statLabel}>CHANGE</div>
              <div className={styles.statValue} style={{ color: rainDiff != null ? (rainDiff > 0 ? 'var(--risk-high)' : 'var(--risk-low)') : 'var(--text-tertiary)' }}>
                {rainDiff != null ? (
                  <>
                    {rainDiff > 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                    {Math.abs(rainDiff).toFixed(1)} mm
                  </>
                ) : (
                  'N/A'
                )}
              </div>
            </div>
          </div>
          <div className={styles.chartContainer}>
            {chartData.length > 0 && validRain.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                  <Bar dataKey="rainfall" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className={styles.emptyState}>HISTORICAL DATA NOT AVAILABLE</div>
            )}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <History size={16} />
            <span>DISASTER EVENT TIMELINE</span>
          </div>
          <div className={styles.timeline}>
            {events.length === 0 ? (
              <div className={styles.emptyState}>HISTORICAL DATA NOT AVAILABLE FOR {location.name?.toUpperCase()}</div>
            ) : (
              events.map((evt, idx) => (
                <div key={idx} className={styles.timelineEvent} onClick={() => onSelectEvent && onSelectEvent(evt)}>
                  <div className={styles.eventDate}>{evt.date}</div>
                  <div className={styles.eventDetails}>
                    <div className={styles.eventName}>{evt.event}</div>
                    <div className={styles.eventMeta}>
                      <span className={`${styles.badge} ${styles['badge' + evt.severity]}`}>{evt.severity}</span>
                      <span>{evt.affected_area}</span>
                    </div>
                    <div className={styles.eventSource}>Source: {evt.source}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <Activity size={16} />
            <span>GLOBAL DISASTER STATISTICS</span>
          </div>
          <div className={styles.statsGrid}>
            <div className={styles.statBox}>
              <div className={styles.statLabel}>COUNTRIES MONITORED</div>
              <div className={styles.statNumber}>{statsData?.countries_monitored || 195}</div>
            </div>
            <div className={styles.statBox}>
              <div className={styles.statLabel}>ACTIVE ALERTS</div>
              <div className={styles.statNumber} style={{ color: 'var(--risk-high)' }}>{statsData?.active_alerts || 0}</div>
            </div>
            <div className={styles.statBox}>
              <div className={styles.statLabel}>EVENTS THIS WEEK</div>
              <div className={styles.statNumber}>{statsData?.events_this_week || 0}</div>
            </div>
            <div className={styles.statBox}>
              <div className={styles.statLabel}>ALERTS SENT</div>
              <div className={styles.statNumber}>{statsData?.alerts_sent?.toLocaleString() || 0}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
