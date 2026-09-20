import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import styles from './RiskChart.module.css';
import { timeSeriesData } from '../data/mockData';
import { getRainfallTimeSeries } from '../services/api';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className={styles.customTooltip}>
        <p className={styles.tooltipLabel}>{label}</p>
        {payload.map((entry, index) => (
          <p key={`item-${index}`} className={styles.tooltipData} style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const RiskChart = ({ activeLocation }) => {
  const [liveRainfallData, setLiveRainfallData] = useState(timeSeriesData.rainfall);
  const [dataStatus, setDataStatus] = useState('LIVE');

  useEffect(() => {
    async function fetchTimeSeries() {
      if (activeLocation && activeLocation.lat && activeLocation.lng) {
        const res = await getRainfallTimeSeries(activeLocation.lat, activeLocation.lng, activeLocation.name, '24h');
        if (res && Array.isArray(res.time_series) && res.time_series.length > 0) {
          const formatted = res.time_series.map(pt => ({
            time: pt.time,
            value: pt.precipitation_mm
          }));
          setLiveRainfallData(formatted);
          setDataStatus(res.data_status || 'LIVE');
        } else {
          setLiveRainfallData(timeSeriesData.rainfall);
          setDataStatus('MODEL');
        }
      }
    }
    fetchTimeSeries();
  }, [activeLocation]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <span className={styles.sectionLabel}>ANALYTICS & TELEMETRY</span>
          <h2 className={styles.sectionTitle}>TIME-SERIES INTELLIGENCE ({activeLocation?.name?.toUpperCase() || 'GLOBAL'})</h2>
        </div>
        <div style={{ fontSize: '0.75rem', fontFamily: 'JetBrains Mono', color: 'var(--text-tertiary)' }}>
          DATA STATUS: <span style={{ color: dataStatus === 'LIVE' ? '#34d399' : '#818cf8', fontWeight: 'bold' }}>{dataStatus}</span>
        </div>
      </div>

      <div className={styles.chartsGrid}>
        {/* Rainfall Chart */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>RAINFALL TRAJECTORY (mm)</h3>
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={liveRainfallData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRainfall" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-blue, #4f8ef7)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--accent-blue, #4f8ef7)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="time" tick={{ fill: 'var(--text-tertiary)', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  name="Rainfall"
                  stroke="var(--accent-blue, #4f8ef7)" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorRainfall)" 
                  isAnimationActive={true}
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Water Level Chart */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>WATER LEVEL RESPONSE (m)</h3>
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={timeSeriesData.waterLevel} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorWaterLevel" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-teal, #2dd4bf)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--accent-teal, #2dd4bf)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="time" tick={{ fill: 'var(--text-tertiary)', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} domain={['dataMin - 0.5', 'dataMax + 0.5']} />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  name="Water Level"
                  stroke="var(--accent-teal, #2dd4bf)" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorWaterLevel)" 
                  isAnimationActive={true}
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Soil Moisture Chart */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>SOIL MOISTURE TREND (%)</h3>
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={timeSeriesData.soilMoisture} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSoil" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-amber, #fbbf24)" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="var(--accent-amber, #fbbf24)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="time" tick={{ fill: 'var(--text-tertiary)', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} domain={['dataMin - 5', 'dataMax + 5']} />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  name="Soil Moisture"
                  stroke="var(--accent-amber, #fbbf24)" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorSoil)" 
                  isAnimationActive={true}
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskChart;
