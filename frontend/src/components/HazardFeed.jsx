import React, { useState, useEffect } from 'react';
import styles from './HazardFeed.module.css';
import { Activity, Radio, Flame, Wind, Mountain, Waves, AlertTriangle, ShieldCheck } from 'lucide-react';
import { getAllHazards } from '../services/api';

export default function HazardFeed({ activeLocation }) {
  const [activeTab, setActiveTab] = useState('all');
  const [hazardData, setHazardData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadHazards() {
      if (!activeLocation) return;
      setLoading(true);
      const data = await getAllHazards(
        activeLocation.lat,
        activeLocation.lng,
        activeLocation.display_name || activeLocation.name
      );
      if (data) {
        setHazardData(data);
      }
      setLoading(false);
    }

    loadHazards();
    // Refresh live hazard feed every 60s
    const timer = setInterval(loadHazards, 60000);
    return () => clearInterval(timer);
  }, [activeLocation]);

  const quakes = hazardData?.earthquakes?.earthquakes || [];
  const tsunamiWarning = hazardData?.tsunamis;
  const volcanoes = hazardData?.volcanoes?.volcanoes || [];
  const wildfires = hazardData?.wildfires?.wildfires || [];
  const cyclones = hazardData?.cyclones?.cyclones || [];

  return (
    <div className={styles.card}>
      <div className={styles.headerRow}>
        <div className={styles.titleBox}>
          <div>
            <div className={styles.sectionLabel}>REAL-TIME MULTI-HAZARD INTELLIGENCE</div>
            <h2 className={styles.title}>LIVE GLOBAL DISASTER FEED</h2>
          </div>
        </div>

        <div className={styles.tabs}>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'all' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <Activity size={14} />
            <span>ALL FEEDS</span>
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'earthquakes' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('earthquakes')}
          >
            <Radio size={14} />
            <span>EARTHQUAKES ({quakes.length})</span>
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'tsunami' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('tsunami')}
          >
            <Waves size={14} />
            <span>TSUNAMI</span>
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'volcanoes' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('volcanoes')}
          >
            <Mountain size={14} />
            <span>VOLCANOES ({volcanoes.length})</span>
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'wildfires' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('wildfires')}
          >
            <Flame size={14} />
            <span>WILDFIRES ({wildfires.length})</span>
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'cyclones' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('cyclones')}
          >
            <Wind size={14} />
            <span>CYCLONES ({cyclones.length})</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className={styles.emptyState}>
          <div className={styles.emptyTitle}>FETCHING LIVE DISASTER INTELLIGENCE...</div>
          <div>Querying USGS, NOAA, NASA FIRMS, and Smithsonian feeds for {activeLocation?.name}</div>
        </div>
      )}

      {/* EARTHQUAKES TAB */}
      {(activeTab === 'all' || activeTab === 'earthquakes') && (
        <div className={styles.feedList}>
          {quakes.slice(0, activeTab === 'all' ? 3 : 10).map((eq) => (
            <div key={eq.id} className={styles.feedItem}>
              <div className={styles.itemLeft}>
                <div className={styles.itemIcon}>
                  <Radio size={20} />
                </div>
                <div>
                  <div className={styles.itemTitle}>{eq.title}</div>
                  <div className={styles.itemMeta}>
                    <span>MAG: <strong>{eq.magnitude}</strong></span>
                    <span>DEPTH: {eq.depth_km} km</span>
                    <span>TIME: {eq.time?.substring(11, 16)} UTC</span>
                    <span className={`${styles.statusBadge} ${eq.data_status === 'LIVE' ? styles.liveBadge : styles.demoBadge}`}>
                      {eq.data_status}
                    </span>
                  </div>
                </div>
              </div>
              <div className={styles.distBadge}>
                {eq.distance_km} km from {activeLocation?.name}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TSUNAMI TAB */}
      {(activeTab === 'all' || activeTab === 'tsunami') && (
        <div className={styles.feedList}>
          {tsunamiWarning?.has_active_warning ? (
            tsunamiWarning.warnings.map((tsu) => (
              <div key={tsu.id} className={styles.feedItem}>
                <div className={styles.itemLeft}>
                  <div className={styles.itemIcon} style={{ color: '#f87171' }}>
                    <Waves size={20} />
                  </div>
                  <div>
                    <div className={styles.itemTitle} style={{ color: '#f87171' }}>{tsu.event}</div>
                    <div className={styles.itemMeta}>
                      <span>ZONES: {tsu.affected_coastal_zones?.join(', ')}</span>
                      <span className={`${styles.statusBadge} ${styles.warningBadge}`}>OFFICIAL WARNING</span>
                    </div>
                  </div>
                </div>
                <div className={styles.distBadge}>{tsu.distance_km} km</div>
              </div>
            ))
          ) : (
            <div className={styles.emptyState}>
              <ShieldCheck size={28} style={{ color: '#34d399', marginBottom: '8px' }} />
              <div className={styles.emptyTitle}>TSUNAMI WARNING: NO ACTIVE WARNING</div>
              <div>{tsunamiWarning?.message || 'No official tsunami advisories active for this coastal sector.'}</div>
              <div style={{ marginTop: '6px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                Source: {tsunamiWarning?.data_source || 'NOAA / USGS Tsunami Warning System'} | Status: {tsunamiWarning?.data_status || 'LIVE'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VOLCANOES TAB */}
      {(activeTab === 'all' || activeTab === 'volcanoes') && (
        <div className={styles.feedList}>
          {volcanoes.slice(0, activeTab === 'all' ? 2 : 10).map((volc) => (
            <div key={volc.id} className={styles.feedItem}>
              <div className={styles.itemLeft}>
                <div className={styles.itemIcon} style={{ color: '#fb923c' }}>
                  <Mountain size={20} />
                </div>
                <div>
                  <div className={styles.itemTitle}>{volc.name} ({volc.country})</div>
                  <div className={styles.itemMeta}>
                    <span>ALERT: <strong>{volc.alert_level}</strong></span>
                    <span>STATUS: {volc.status}</span>
                    <span className={`${styles.statusBadge} ${styles.liveBadge}`}>{volc.data_status}</span>
                  </div>
                </div>
              </div>
              <div className={styles.distBadge}>{volc.distance_km} km</div>
            </div>
          ))}
        </div>
      )}

      {/* WILDFIRES TAB */}
      {(activeTab === 'all' || activeTab === 'wildfires') && (
        <div className={styles.feedList}>
          {wildfires.length > 0 ? (
            wildfires.slice(0, activeTab === 'all' ? 2 : 10).map((fire) => (
              <div key={fire.id} className={styles.feedItem}>
                <div className={styles.itemLeft}>
                  <div className={styles.itemIcon} style={{ color: '#f87171' }}>
                    <Flame size={20} />
                  </div>
                  <div>
                    <div className={styles.itemTitle}>{fire.name}</div>
                    <div className={styles.itemMeta}>
                      <span>BRIGHTNESS: {fire.brightness_k} K</span>
                      <span>RISK: {fire.fire_risk}</span>
                      <span className={`${styles.statusBadge} ${fire.data_status === 'LIVE' ? styles.liveBadge : styles.demoBadge}`}>
                        {fire.data_status}
                      </span>
                    </div>
                  </div>
                </div>
                <div className={styles.distBadge}>{fire.distance_km} km</div>
              </div>
            ))
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyTitle}>WILDFIRE HOTSPOTS: NO ACTIVE THERMAL ANOMALIES</div>
              <div>{hazardData?.wildfires?.note || 'No active fire thermal anomalies detected within range.'}</div>
              <div style={{ marginTop: '6px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                Source: {hazardData?.wildfires?.data_source || 'NASA FIRMS'} | Status: {hazardData?.wildfires?.data_status || 'LIVE'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CYCLONES TAB */}
      {(activeTab === 'all' || activeTab === 'cyclones') && (
        <div className={styles.feedList}>
          {cyclones.length > 0 ? (
            cyclones.map((st) => (
              <div key={st.id} className={styles.feedItem}>
                <div className={styles.itemLeft}>
                  <div className={styles.itemIcon} style={{ color: '#38bdf8' }}>
                    <Wind size={20} />
                  </div>
                  <div>
                    <div className={styles.itemTitle}>{st.name} — {st.category}</div>
                    <div className={styles.itemMeta}>
                      <span>WIND: {st.wind_speed_kmh} km/h</span>
                      <span>PRESSURE: {st.central_pressure_hpa} hPa</span>
                      <span>MOVEMENT: {st.movement}</span>
                      <span className={`${styles.statusBadge} ${styles.liveBadge}`}>{st.data_status}</span>
                    </div>
                  </div>
                </div>
                <div className={styles.distBadge}>{st.distance_km} km</div>
              </div>
            ))
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyTitle}>CYCLONE TRACK</div>
              <div>No active cyclone currently available for this region.</div>
              <div style={{ marginTop: '6px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                Source: {hazardData?.cyclones?.data_source || 'NOAA NHC / WMO Advisory'} | Status: {hazardData?.cyclones?.data_status || 'LIVE'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
