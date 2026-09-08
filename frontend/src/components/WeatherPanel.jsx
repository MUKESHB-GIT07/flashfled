import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getWeatherCurrent, getWeatherForecast } from '../services/api';
import LiveClock from './LiveClock';
import styles from './WeatherPanel.module.css';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const POLL_INTERVAL_MS = 5 * 60 * 1000; // Re-fetch from Open-Meteo every 5 minutes

// Data status → display config
const STATUS_CONFIG = {
  LIVE:        { dot: '#34d399', label: '🟢 LIVE',        cls: 'live' },
  DELAYED:     { dot: '#fbbf24', label: '🟡 DELAYED',     cls: 'delayed' },
  STALE:       { dot: '#f97316', label: '⚠️ STALE',       cls: 'stale' },
  UNAVAILABLE: { dot: '#94a3b8', label: '⚪ UNAVAILABLE', cls: 'unavailable' },
  FORECAST:    { dot: '#818cf8', label: '🔵 FORECAST',    cls: 'forecast' },
  DEMO:        { dot: '#a855f7', label: '🟣 DEMO',        cls: 'demo' },
};

function statusCfg(s) {
  return STATUS_CONFIG[s] || STATUS_CONFIG.UNAVAILABLE;
}

// Wind direction degrees → compass label
function degreesToCompass(deg) {
  if (deg == null) return 'N/A';
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

// Format a value with change indicator
function ChangeIndicator({ prev, curr, unit, rising = '▲', falling = '▼' }) {
  if (prev == null || curr == null || prev === curr) return null;
  const diff = curr - prev;
  const isRising = diff > 0;
  const color = isRising ? 'var(--risk-high, #fb923c)' : 'var(--accent-teal, #2dd4bf)';
  const arrow = isRising ? rising : falling;
  return (
    <span className={styles.change} style={{ color }}>
      {arrow} {isRising ? '+' : ''}{diff.toFixed(1)} {unit}
    </span>
  );
}

// Status badge
function StatusBadge({ status }) {
  const cfg = statusCfg(status);
  return (
    <span className={`${styles.statusBadge} ${styles[cfg.cls]}`}>
      <span className={styles.statusDot} style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

/**
 * WeatherPanel — Phase 2
 * ======================
 * Fetches REAL weather from Open-Meteo via backend /api/weather/current.
 * Polls every 5 minutes (Open-Meteo updates its current endpoint ~15 min).
 * Shows:
 *   - Data status (LIVE / DELAYED / STALE / UNAVAILABLE)
 *   - Source, source timestamp, received timestamp, data age
 *   - Previous vs current value with ▲/▼ change
 *   - 7-day daily forecast strip
 *   - LiveClock widget (separate from source data time)
 *
 * Props:
 *   activeLocation — { name, display_name, lat, lng }
 */
export default function WeatherPanel({ activeLocation }) {
  const [current, setCurrent]   = useState(null);
  const [forecast, setForecast] = useState(null);
  const [prevCurrent, setPrev]  = useState(null);
  const [loading, setLoading]   = useState(true);
  const [lastFetched, setLastFetched] = useState(null);
  const pollRef = useRef(null);

  const fetchWeather = useCallback(async () => {
    if (!activeLocation?.lat || !activeLocation?.lng) return;
    const { lat, lng, name = '', display_name = '' } = activeLocation;
    const label = display_name || name;

    setLoading(true);
    try {
      const [cur, fcast] = await Promise.all([
        getWeatherCurrent(lat, lng, label),
        getWeatherForecast(lat, lng, label),
      ]);

      // Save previous values BEFORE updating
      setCurrent((old) => {
        if (old && old.data_status !== 'UNAVAILABLE') setPrev(old);
        return cur;
      });
      setForecast(fcast);
      setLastFetched(new Date().toISOString());
    } finally {
      setLoading(false);
    }
  }, [activeLocation?.lat, activeLocation?.lng, activeLocation?.name]);

  // Fetch on location change
  useEffect(() => {
    fetchWeather();
    // Poll every 5 minutes to catch updates
    pollRef.current = setInterval(fetchWeather, POLL_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  }, [fetchWeather]);

  const loc = activeLocation;
  const status = current?.data_status || 'UNAVAILABLE';
  const cfg = statusCfg(status);

  // ──────────────────────────────────────────────────────────
  return (
    <div className={styles.panel}>
      {/* ── Header ─────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.sectionLabel}>LIVE WEATHER</div>
          <div className={styles.sectionTitle}>
            {loc?.display_name || loc?.name || 'Select a Location'}
          </div>
          <div className={styles.sourceRow}>
            <StatusBadge status={status} />
            <span className={styles.sourceName}>
              {current?.source || 'Open-Meteo (open-meteo.com)'}
            </span>
          </div>
        </div>

        {/* System clock — always separate from weather source time */}
        <div className={styles.clockContainer}>
          <LiveClock />
        </div>
      </div>

      {/* ── Data provenance ─────────────────────────────────── */}
      {current && (
        <div className={styles.provenance}>
          <ProvenanceItem label="SOURCE UPDATED" value={formatTime(current.source_timestamp)} />
          <ProvenanceItem label="RECEIVED"       value={formatTime(current.received_timestamp)} />
          <ProvenanceItem label="DATA AGE"       value={current.data_age_label || 'N/A'} highlight={status === 'STALE'} />
          <ProvenanceItem label="PROVIDER"       value={current.provider_status || 'UNKNOWN'} />
        </div>
      )}

      {/* ── Unavailable state ───────────────────────────────── */}
      {status === 'UNAVAILABLE' && !loading && (
        <div className={styles.unavailable}>
          <div className={styles.unavailableIcon}>⚪</div>
          <div className={styles.unavailableTitle}>WEATHER DATA UNAVAILABLE</div>
          <div className={styles.unavailableMsg}>
            {current?.provider_status || 'Open-Meteo could not be reached.'}
            <br />
            <span className={styles.unavailableHint}>
              Check that the backend is running and has internet access.
            </span>
          </div>
          <button className={styles.retryBtn} onClick={fetchWeather}>↻ RETRY</button>
        </div>
      )}

      {/* ── Loading skeleton ────────────────────────────────── */}
      {loading && (
        <div className={styles.loadingGrid}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className={styles.skeleton} />
          ))}
        </div>
      )}

      {/* ── Current weather grid ────────────────────────────── */}
      {!loading && current && status !== 'UNAVAILABLE' && (
        <>
          <div className={styles.conditionRow}>
            <div className={styles.conditionIcon}>
              {weatherIcon(current.weather_code, current.is_day)}
            </div>
            <div>
              <div className={styles.conditionLabel}>{current.weather_condition || 'Unknown'}</div>
              <div className={styles.tempLarge}>
                {fmt(current.temperature, 1)}
                <span className={styles.tempUnit}>{current.temperature_unit || '°C'}</span>
                <ChangeIndicator
                  prev={prevCurrent?.temperature}
                  curr={current.temperature}
                  unit={current.temperature_unit || '°C'}
                />
              </div>
              <div className={styles.feelsLike}>
                Feels like {fmt(current.apparent_temperature, 1)}{current.temperature_unit || '°C'}
              </div>
            </div>
          </div>

          <div className={styles.metricsGrid}>
            <WeatherMetric
              label="HUMIDITY"
              value={fmt(current.humidity)}
              unit="%"
              icon="💧"
              prev={prevCurrent?.humidity}
              curr={current.humidity}
            />
            <WeatherMetric
              label="PRECIPITATION"
              value={fmt(current.precipitation, 1)}
              unit={current.precipitation_unit || 'mm'}
              icon="🌧️"
              prev={prevCurrent?.precipitation}
              curr={current.precipitation}
            />
            <WeatherMetric
              label="WIND SPEED"
              value={fmt(current.wind_speed, 1)}
              unit={current.wind_speed_unit || 'km/h'}
              icon="💨"
              prev={prevCurrent?.wind_speed}
              curr={current.wind_speed}
            />
            <WeatherMetric
              label="WIND DIR"
              value={degreesToCompass(current.wind_direction)}
              unit={`${fmt(current.wind_direction, 0)}°`}
              icon="🧭"
            />
            <WeatherMetric
              label="PRESSURE"
              value={fmt(current.pressure, 1)}
              unit={current.pressure_unit || 'hPa'}
              icon="📊"
              prev={prevCurrent?.pressure}
              curr={current.pressure}
            />
            <WeatherMetric
              label="WIND GUSTS"
              value={fmt(current.wind_gusts, 1)}
              unit={current.wind_speed_unit || 'km/h'}
              icon="🌬️"
            />
            {current.visibility != null && (
              <WeatherMetric
                label="VISIBILITY"
                value={fmt(current.visibility / 1000, 1)}
                unit="km"
                icon="👁️"
              />
            )}
            {current.snow_depth != null && current.snow_depth > 0 && (
              <WeatherMetric
                label="SNOW DEPTH"
                value={fmt(current.snow_depth, 1)}
                unit="cm"
                icon="❄️"
                prev={prevCurrent?.snow_depth}
                curr={current.snow_depth}
              />
            )}
            {current.snowfall != null && current.snowfall > 0 && (
              <WeatherMetric
                label="SNOWFALL"
                value={fmt(current.snowfall, 1)}
                unit="cm/hr"
                icon="🌨️"
              />
            )}
          </div>
        </>
      )}

      {/* ── 7-Day Forecast strip ────────────────────────────── */}
      {!loading && forecast && forecast.daily?.length > 0 && (
        <div className={styles.forecastSection}>
          <div className={styles.forecastLabel}>
            <span>7-DAY FORECAST</span>
            <span className={styles.forecastStatus}>
              <StatusBadge status="FORECAST" />
            </span>
          </div>
          <div className={styles.forecastStrip}>
            {forecast.daily.map((day, i) => (
              <DayCard key={day.date} day={day} isToday={i === 0} />
            ))}
          </div>
        </div>
      )}

      {/* ── Manual refresh ──────────────────────────────────── */}
      <div className={styles.footer}>
        <span className={styles.footerNote}>
          Auto-refresh every 5 min · Source: Open-Meteo (open-meteo.com) · No API key required
        </span>
        <button
          className={styles.refreshBtn}
          onClick={fetchWeather}
          disabled={loading}
          title="Refresh now"
        >
          {loading ? '…' : '↻'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function ProvenanceItem({ label, value, highlight }) {
  return (
    <div className={styles.provenanceItem}>
      <span className={styles.provenanceLabel}>{label}</span>
      <span className={`${styles.provenanceValue} ${highlight ? styles.highlight : ''}`}>
        {value}
      </span>
    </div>
  );
}

function WeatherMetric({ label, value, unit, icon, prev, curr }) {
  return (
    <div className={styles.metric}>
      <div className={styles.metricIcon}>{icon}</div>
      <div className={styles.metricLabel}>{label}</div>
      <div className={styles.metricValue}>
        {value}
        <span className={styles.metricUnit}>{unit}</span>
      </div>
      {prev != null && curr != null && (
        <ChangeIndicator prev={prev} curr={curr} unit={unit} />
      )}
    </div>
  );
}

function DayCard({ day, isToday }) {
  const d = new Date(day.date + 'T12:00:00');
  const dayName = isToday
    ? 'TODAY'
    : d.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase();
  const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

  return (
    <div className={`${styles.dayCard} ${isToday ? styles.today : ''}`}>
      <div className={styles.dayName}>{dayName}</div>
      <div className={styles.dayDate}>{dateStr}</div>
      <div className={styles.dayIcon}>{weatherIcon(day.weather_code, true)}</div>
      <div className={styles.dayCondition}>{day.weather_condition}</div>
      <div className={styles.dayTemps}>
        <span className={styles.dayMax}>{fmt(day.temp_max, 0)}°</span>
        <span className={styles.dayMin}>{fmt(day.temp_min, 0)}°</span>
      </div>
      {day.precipitation_probability_max != null && (
        <div className={styles.dayRainProb}>
          🌧 {day.precipitation_probability_max}%
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function fmt(v, decimals = 0) {
  if (v == null) return '—';
  return Number(v).toFixed(decimals);
}

function formatTime(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return iso;
  }
}

// WMO code → emoji (simplified)
function weatherIcon(code, isDay) {
  if (code == null) return '🌡️';
  const c = Number(code);
  if (c === 0)  return isDay ? '☀️' : '🌙';
  if (c <= 2)   return isDay ? '🌤️' : '🌤️';
  if (c === 3)  return '☁️';
  if (c <= 48)  return '🌫️';
  if (c <= 55)  return '🌦️';
  if (c <= 65)  return '🌧️';
  if (c <= 77)  return '❄️';
  if (c <= 82)  return '🌦️';
  if (c <= 86)  return '🌨️';
  if (c <= 99)  return '⛈️';
  return '🌡️';
}
