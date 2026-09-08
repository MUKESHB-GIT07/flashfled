import React, { useState } from 'react';
import { Layers, Check, X, Sliders } from 'lucide-react';
import styles from './WindyLayerMenu.module.css';

export const WINDY_CATEGORIES = [
  {
    id: 'WEATHER',
    name: 'WEATHER',
    layers: [
      { id: 'wind', name: 'Wind & Particle Flow', icon: '💨', description: 'Animated velocity particles' },
      { id: 'rainfall', name: 'Rain & Precipitation', icon: '🌧️', description: 'Live rainfall field' },
      { id: 'temperature', name: 'Temperature Field', icon: '🌡️', description: 'Global temperature map' },
      { id: 'humidity', name: 'Relative Humidity', icon: '💧', description: 'Moisture saturation field' },
      { id: 'pressure', name: 'Pressure & Isolines', icon: '⏲️', description: 'Surface pressure hPa' },
      { id: 'clouds', name: 'Cloud Coverage', icon: '☁️', description: 'Global cloud cover field' },
    ]
  },
  {
    id: 'RADAR',
    name: 'RADAR',
    layers: [
      { id: 'radar', name: 'Live Weather Radar', icon: '🛰️', description: 'RainViewer live radar loop' },
    ]
  },
  {
    id: 'SATELLITE',
    name: 'SATELLITE',
    layers: [
      { id: 'satellite', name: 'Satellite Imagery', icon: '📡', description: 'Infrared & cloud satellite' },
    ]
  },
  {
    id: 'HYDROLOGY',
    name: 'HYDROLOGY',
    layers: [
      { id: 'flood', name: 'Flood Risk Areas', icon: '🌊', description: 'Flood risk shading & basins' },
      { id: 'river', name: 'River Level Gauges', icon: '💧', description: 'River stage monitoring' },
      { id: 'rain_accumulation', name: 'Rain Accumulation', icon: '🌧️', description: 'Multi-hour rainfall totals' },
    ]
  },
  {
    id: 'STORMS',
    name: 'STORMS',
    layers: [
      { id: 'cyclone', name: 'Cyclone / Hurricane', icon: '🌪️', description: 'Live track & forecast cone' },
    ]
  },
  {
    id: 'GEOLOGICAL',
    name: 'GEOLOGICAL',
    layers: [
      { id: 'earthquake', name: 'Earthquakes (USGS)', icon: '🌎', description: 'Live magnitude & depth' },
      { id: 'volcano', name: 'Volcano Monitoring', icon: '🌋', description: 'Global volcanic alert level' },
      { id: 'landslide', name: 'Landslide Hazard', icon: '⛰️', description: 'Slope stability terrain' },
      { id: 'soil_moisture', name: 'Soil Moisture', icon: '🌱', description: 'Saturation percentage' },
    ]
  },
  {
    id: 'FIRE',
    name: 'FIRE',
    layers: [
      { id: 'wildfire', name: 'Wildfire Hotspots', icon: '🔥', description: 'NASA FIRMS thermal detection' },
    ]
  },
  {
    id: 'COASTAL',
    name: 'COASTAL',
    layers: [
      { id: 'tsunami', name: 'Tsunami Warnings', icon: '🌊', description: 'Official warning zones' },
    ]
  },
  {
    id: 'WINTER',
    name: 'WINTER',
    layers: [
      { id: 'snow', name: 'Snow & Snowmelt', icon: '❄️', description: 'Snow depth & melt rate' },
    ]
  }
];

export default function WindyLayerMenu({ activeLayers = [], onToggleLayer, onSelectAll, onClearAll }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={styles.floatingMenu}>
      <button
        className={`${styles.toggleBtn} ${isOpen ? styles.toggleBtnActive : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Toggle Windy-Style Layer Menu"
      >
        <Layers size={16} />
        <span>LAYERS</span>
        <span className={styles.badge}>{activeLayers.length}</span>
      </button>

      {isOpen && (
        <div className={styles.drawer}>
          <div className={styles.drawerHeader}>
            <h3 className={styles.drawerTitle}>MAP LAYERS</h3>
            <div className={styles.quickActions}>
              <button className={styles.actionBtn} onClick={onSelectAll}>ALL</button>
              <button className={styles.actionBtn} onClick={onClearAll}>CLEAR</button>
              <button className={styles.actionBtn} onClick={() => setIsOpen(false)}>
                <X size={12} />
              </button>
            </div>
          </div>

          {WINDY_CATEGORIES.map((cat) => (
            <div key={cat.id} className={styles.categorySection}>
              <div className={styles.categoryTitle}>{cat.name}</div>
              <div className={styles.layerGrid}>
                {cat.layers.map((layer) => {
                  const isActive = activeLayers.includes(layer.id);
                  return (
                    <div
                      key={layer.id}
                      className={`${styles.layerCard} ${isActive ? styles.layerCardActive : ''}`}
                      onClick={() => onToggleLayer(layer.id)}
                    >
                      <div className={styles.layerInfo}>
                        <span className={styles.layerIcon}>{layer.icon}</span>
                        <span className={styles.layerLabel}>{layer.name}</span>
                      </div>
                      <div className={styles.statusIndicator}>
                        {isActive && <Check size={14} className={styles.checkMark} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
