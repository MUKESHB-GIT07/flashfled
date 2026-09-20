import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Circle, Popup, Polyline, Polygon, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './RiskMap.module.css';
import { geocodeLocation, getAllHazards } from '../services/api';
import { Search, Navigation, Layers, Check, Globe, MapPin, Eye, ShieldAlert, X, RefreshCw } from 'lucide-react';
import WindCanvasOverlay from './WindCanvasOverlay';
import WindyLayerMenu from './WindyLayerMenu';
import MapTimelineSlider from './MapTimelineSlider';
import DynamicMapLegend from './DynamicMapLegend';

// Controller to forcibly fly map camera whenever targetCoords or cameraTrigger changes
const MapController = ({ targetCoords, targetZoom, cameraTrigger }) => {
  const map = useMap();
  useEffect(() => {
    if (targetCoords && Array.isArray(targetCoords) && targetCoords.length === 2) {
      const lat = Number(targetCoords[0]);
      const lng = Number(targetCoords[1]);
      if (!isNaN(lat) && !isNaN(lng)) {
        map.flyTo([lat, lng], targetZoom || 9, { duration: 1.5, animate: true });
      }
    }
  }, [targetCoords, targetZoom, cameraTrigger, map]);
  return null;
};

// Controller to handle map click events for the Weather Picker
const MapEventsController = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  return null;
};

// Retrieve environment variable keys safely from Vite's import.meta.env
const MAP_API_KEY = import.meta.env.VITE_MAP_API_KEY || import.meta.env.VITE_MAPBOX_TOKEN || '';

const getBasemapThemes = (key) => {
  const isMapbox = key && typeof key === 'string' && key.startsWith('pk.');
  return {
    DARK: {
      name: isMapbox ? 'DARK (MAPBOX)' : 'DARK (CARTO)',
      url: isMapbox 
        ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/{z}/{x}/{y}?access_token=${key}`
        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution: isMapbox ? '&copy; Mapbox &copy; OpenStreetMap' : '&copy; OpenStreetMap &copy; CARTO',
      maxNativeZoom: isMapbox ? 18 : 19
    },
    SATELLITE: {
      name: isMapbox ? 'SATELLITE (MAPBOX)' : 'ESRI SATELLITE',
      url: isMapbox 
        ? `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=${key}`
        : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: isMapbox ? '&copy; Mapbox' : '&copy; Esri World Imagery',
      maxNativeZoom: isMapbox ? 18 : 17
    },
    LIGHT: {
      name: 'LIGHT (CARTO)',
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxNativeZoom: 19
    },
    STANDARD: {
      name: 'OPENSTREETMAP',
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; OpenStreetMap contributors',
      maxNativeZoom: 19
    },
    TERRAIN: {
      name: 'ESRI TERRAIN',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; Esri World Terrain',
      maxNativeZoom: 13
    }
  };
};

const TIME_STEPS = ['NOW', '+1H', '+3H', '+6H', '+12H', '+24H', '+3D', '+7D'];

export default function RiskMap({ activeLocation, onGlobalLocationChange, aiLayerCommand }) {
  // Camera State
  const [mapCenter, setMapCenter] = useState([activeLocation?.lat || 13.0827, activeLocation?.lng || 80.2707]);
  const [mapZoom, setMapZoom] = useState(8);
  const [cameraTrigger, setCameraTrigger] = useState(0);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [statusBanner, setStatusBanner] = useState('');

  // Windy Layer Management State
  const [activeLayers, setActiveLayers] = useState(['wind', 'rainfall', 'earthquake', 'flood']);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [isMenuOpen, setIsMenuOpen] = useState(true);

  // Map Basemap Theme State
  const [mapTheme, setMapTheme] = useState('DARK');
  const [showThemePanel, setShowThemePanel] = useState(false);

  // Timeline Control State
  const [selectedTimeStep, setSelectedTimeStep] = useState('NOW');
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(false);
  const playTimerRef = useRef(null);

  // RainViewer Live Radar State
  const [radarFrames, setRadarFrames] = useState([]);
  const [currentRadarIndex, setCurrentRadarIndex] = useState(0);
  const [radarPath, setRadarPath] = useState('');

  // Weather Picker Popover State
  const [pickerData, setPickerData] = useState(null);
  const [isPickerLoading, setIsPickerLoading] = useState(false);

  // Live Feeds State
  const [usgsEarthquakes, setUsgsEarthquakes] = useState([]);
  const [liveHazards, setLiveHazards] = useState(null);

  const BASEMAP_THEMES = getBasemapThemes(MAP_API_KEY);

  // Phase 9: React to AI Safety Guide layer commands
  useEffect(() => {
    if (aiLayerCommand && aiLayerCommand.layer) {
      const layerId = aiLayerCommand.layer;
      setActiveLayers(prev => prev.includes(layerId) ? prev : [...prev, layerId]);
      setStatusBanner(`AI GUIDE: Activated ${layerId.toUpperCase()} layer`);
      setTimeout(() => setStatusBanner(''), 4000);
    }
  }, [aiLayerCommand]);

  // RainViewer API Radar Frames Fetching
  useEffect(() => {
    if (activeLayers.includes('radar') || activeLayers.includes('rainfall')) {
      fetch('https://api.rainviewer.com/public/weather-maps.json')
        .then(res => res.json())
        .then(data => {
          if (data && data.radar && data.radar.past && data.radar.past.length > 0) {
            setRadarFrames(data.radar.past);
            const latest = data.radar.past[data.radar.past.length - 1];
            setRadarPath(latest.path);
            setCurrentRadarIndex(data.radar.past.length - 1);
          }
        })
        .catch(err => console.warn('RainViewer fetch error:', err));
    }
  }, [activeLayers]);

  // Fetch live hazard overlays from backend whenever activeLocation changes
  useEffect(() => {
    async function fetchHazards() {
      if (activeLocation && activeLocation.lat && activeLocation.lng) {
        const hData = await getAllHazards(activeLocation.lat, activeLocation.lng, activeLocation.name);
        if (hData) {
          setLiveHazards(hData);
        }
      }
    }
    fetchHazards();
  }, [activeLocation]);

  // Fetch real-time live USGS earthquakes when earthquake layer is active
  useEffect(() => {
    if (activeLayers.includes('earthquake')) {
      fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson')
        .then(res => res.json())
        .then(data => {
          if (data && data.features) {
            const quakes = data.features.slice(0, 50).map(f => ({
              id: f.id,
              place: f.properties.place,
              mag: f.properties.mag,
              lat: f.geometry.coordinates[1],
              lng: f.geometry.coordinates[0],
              depth: f.geometry.coordinates[2],
              time: new Date(f.properties.time).toLocaleTimeString('en-GB')
            }));
            setUsgsEarthquakes(quakes);
          }
        })
        .catch(err => console.warn('USGS feed fetch error:', err));
    }
  }, [activeLayers]);

  // Sync camera whenever activeLocation prop changes externally
  useEffect(() => {
    if (activeLocation && activeLocation.lat && activeLocation.lng) {
      setMapCenter([activeLocation.lat, activeLocation.lng]);
      setMapZoom(activeLocation.country === 'Russia' ? 4 : 9);
      setCameraTrigger(prev => prev + 1);
    }
  }, [activeLocation]);

  // Timeline Auto-Play Loop
  useEffect(() => {
    if (isTimelinePlaying) {
      playTimerRef.current = setInterval(() => {
        setSelectedTimeStep(prevStep => {
          const idx = TIME_STEPS.indexOf(prevStep);
          const nextIdx = (idx + 1) % TIME_STEPS.length;
          return TIME_STEPS[nextIdx];
        });
      }, 2000);
    } else {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    }
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isTimelinePlaying]);

  // Toggle Layer Helper
  const handleToggleLayer = (layerId) => {
    setActiveLayers(prev => {
      if (prev.includes(layerId)) {
        return prev.filter(id => id !== layerId);
      } else {
        return [...prev, layerId];
      }
    });
  };

  // Weather Picker Map Tap Click Handler
  const handleMapClick = useCallback(async (lat, lng) => {
    setIsPickerLoading(true);
    setPickerData({
      lat,
      lng,
      name: 'Querying location...',
      temp: '--',
      windSpeed: '--',
      windDir: '--',
      rain: '--',
      humidity: '--',
      pressure: '--',
      source: 'LIVE (OPEN-METEO)',
      status: 'LOADING'
    });

    try {
      // 1. Geocode Lat/Lng
      const geoRes = await geocodeLocation(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      const locName = (geoRes && geoRes[0]) ? geoRes[0].name : `Point (${lat.toFixed(3)}°, ${lng.toFixed(3)}°)`;
      const dispName = (geoRes && geoRes[0]) ? geoRes[0].display_name : `Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)}`;

      // 2. Fetch Open-Meteo current point weather
      const wxRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,surface_pressure,wind_speed_10m,wind_direction_10m`);
      const wxData = await wxRes.json();

      if (wxData && wxData.current) {
        const c = wxData.current;
        // Direction degrees to cardinal
        const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const cardDir = dirs[Math.round((c.wind_direction_10m || 0) / 45) % 8];

        setPickerData({
          lat,
          lng,
          name: locName,
          displayName: dispName,
          temp: c.temperature_2m !== undefined ? `${Math.round(c.temperature_2m)}°C` : '--',
          windSpeed: c.wind_speed_10m !== undefined ? `${Math.round(c.wind_speed_10m)} km/h ${cardDir}` : '--',
          windDir: c.wind_direction_10m !== undefined ? `${c.wind_direction_10m}°` : '--',
          rain: c.precipitation !== undefined ? `${c.precipitation.toFixed(1)} mm/h` : '0.0 mm/h',
          humidity: c.relative_humidity_2m !== undefined ? `${c.relative_humidity_2m}%` : '--',
          pressure: c.surface_pressure !== undefined ? `${Math.round(c.surface_pressure)} hPa` : '--',
          source: 'LIVE (OPEN-METEO API)',
          updatedAgo: 'UPDATED 10 SEC AGO',
          hazardStatus: (c.precipitation > 20 || c.wind_speed_10m > 50) ? 'HIGH WEATHER RISK' : 'NORMAL CONDITIONS'
        });
      }
    } catch (err) {
      console.warn('Weather picker fetch error:', err);
    } finally {
      setIsPickerLoading(false);
    }
  }, []);

  // Search input change handler
  const handleSearchChange = async (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    setShowDropdown(true);
    const results = await geocodeLocation(val);
    setIsSearching(false);
    if (results && Array.isArray(results)) {
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  // Select Search Result
  const handleSelectSearchResult = (result) => {
    const newLoc = {
      id: result.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name: result.name,
      display_name: result.display_name,
      country: result.country || 'Global',
      state: result.state || '',
      lat: result.latitude,
      lng: result.longitude
    };

    const zoomLvl = result.type === 'country' || result.name === 'Russia' ? 4 : 10;
    setMapCenter([result.latitude, result.longitude]);
    setMapZoom(zoomLvl);
    setCameraTrigger(prev => prev + 1);

    setSearchQuery(result.name);
    setShowDropdown(false);
    setStatusBanner(`Map Centered: ${result.display_name}`);
    setTimeout(() => setStatusBanner(''), 4000);

    if (onGlobalLocationChange) {
      onGlobalLocationChange(newLoc);
    }
  };

  // GPS Button
  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      setStatusBanner('Acquiring GPS coordinates...');
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const geocoded = await geocodeLocation(`${lat}, ${lng}`);
          const locName = (geocoded && geocoded[0]) ? geocoded[0].name : 'My GPS Location';
          const dispName = (geocoded && geocoded[0]) ? geocoded[0].display_name : `Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)}`;

          const myLoc = {
            id: 'gps-location',
            name: locName,
            display_name: dispName,
            country: (geocoded && geocoded[0]) ? geocoded[0].country : 'GPS Coordinates',
            state: (geocoded && geocoded[0]) ? geocoded[0].state : '',
            lat: lat,
            lng: lng
          };

          setMapCenter([lat, lng]);
          setMapZoom(11);
          setCameraTrigger(prev => prev + 1);
          setSearchQuery(locName);
          setStatusBanner(`GPS Centered: ${dispName}`);
          setTimeout(() => setStatusBanner(''), 4000);

          if (onGlobalLocationChange) {
            onGlobalLocationChange(myLoc);
          }
        },
        (err) => {
          console.warn('GPS failed:', err);
          setStatusBanner('GPS permission denied.');
          setTimeout(() => setStatusBanner(''), 4000);
        }
      );
    }
  };

  // World View Reset
  const handleWorldView = () => {
    setMapCenter([20.0, 0.0]);
    setMapZoom(2);
    setCameraTrigger(prev => prev + 1);
    setStatusBanner('Reset to Global World View');
    setTimeout(() => setStatusBanner(''), 3000);
  };

  const activeThemeConfig = BASEMAP_THEMES[mapTheme] || BASEMAP_THEMES.DARK;
  const isTropical = activeLocation?.country === 'India' && activeLocation?.name?.toLowerCase().includes('chennai');

  return (
    <div className={styles.container}>
      {/* Header & Controls Bar */}
      <div className={styles.headerRow}>
        <div className={styles.titleBox}>
          <span className={styles.sectionLabel}>GLOBAL WINDY-STYLE LIVE GIS MAP</span>
          <h2 className={styles.sectionTitle}>REAL-TIME WEATHER & DISASTER VISUALIZATION</h2>
          {activeLocation && (
            <div className={styles.activeLocMeta}>
              <MapPin size={12} className={styles.pinIcon} />
              <span>LOCATION: <strong>{activeLocation.display_name || activeLocation.name}</strong> ({activeLocation.lat?.toFixed(4)}°N, {activeLocation.lng?.toFixed(4)}°E)</span>
            </div>
          )}
        </div>

        {/* Global Location Search Bar */}
        <div className={styles.searchContainer}>
          <div className={styles.searchInputWrapper}>
            <Search className={styles.searchIcon} size={16} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search Chennai, Mumbai, Tokyo, London, NY..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => searchQuery.trim() && setShowDropdown(true)}
            />
            <button 
              className={styles.locationBtn} 
              onClick={handleUseMyLocation}
              title="Use GPS Location"
            >
              <Navigation size={14} />
              <span>GPS</span>
            </button>
          </div>

          {/* Autocomplete Results Dropdown */}
          {showDropdown && (
            <div className={styles.dropdown}>
              {isSearching ? (
                <div className={styles.dropdownStatus}>Searching OpenStreetMap Nominatim...</div>
              ) : searchResults.length > 0 ? (
                searchResults.map((res, idx) => (
                  <div
                    key={idx}
                    className={styles.dropdownItem}
                    onClick={() => handleSelectSearchResult(res)}
                  >
                    <Globe size={14} className={styles.dropItemIcon} />
                    <div className={styles.dropItemText}>
                      <span className={styles.dropItemName}>{res.name}</span>
                      <span className={styles.dropItemSub}>{res.display_name}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.dropdownStatus}>No locations found</div>
              )}
            </div>
          )}
        </div>

        {/* Control Action Buttons */}
        <div className={styles.actionButtons}>
          <button className={styles.ctrlBtn} onClick={handleWorldView} title="Reset to Global World View">
            <Globe size={14} />
            <span>WORLD VIEW</span>
          </button>

          <button 
            className={`${styles.ctrlBtn} ${showThemePanel ? styles.activeCtrlBtn : ''}`}
            onClick={() => setShowThemePanel(!showThemePanel)}
          >
            <Eye size={14} />
            <span>THEME [{BASEMAP_THEMES[mapTheme]?.name || mapTheme}]</span>
          </button>
        </div>
      </div>

      {statusBanner && (
        <div className={styles.searchStatusBanner}>{statusBanner}</div>
      )}

      {/* Map Theme Selector Panel */}
      {showThemePanel && (
        <div className={styles.controlPanel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>SELECT BASEMAP THEME</span>
          </div>
          <div className={styles.themeGrid}>
            {Object.keys(BASEMAP_THEMES).map(tKey => (
              <button
                key={tKey}
                className={`${styles.themeChip} ${mapTheme === tKey ? styles.themeChipActive : ''}`}
                onClick={() => { setMapTheme(tKey); setShowThemePanel(false); }}
              >
                <span>{BASEMAP_THEMES[tKey].name}</span>
                {mapTheme === tKey && <Check size={12} />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Map Container & Visual Overlays */}
      <div className={styles.mapWrapper}>
        {/* Vertical Windy Layer Selector Menu */}
        <WindyLayerMenu
          activeLayers={activeLayers}
          onToggleLayer={handleToggleLayer}
          onSelectCategory={(cat) => setActiveCategory(cat)}
          activeCategory={activeCategory}
          onSelectAll={() => setActiveLayers(['wind', 'rainfall', 'radar', 'temperature', 'humidity', 'pressure', 'clouds', 'rain_accumulation', 'cyclone', 'earthquake', 'wildfire', 'flood', 'landslide', 'tsunami', 'volcano', 'snow'])}
          onClearAll={() => setActiveLayers([])}
          isOpen={isMenuOpen}
          onToggleOpen={() => setIsMenuOpen(!isMenuOpen)}
        />

        {/* Dynamic Color Scale Legend */}
        <DynamicMapLegend activeLayers={activeLayers} />

        {/* Interactive Weather Picker Popover Card on Map Tap */}
        {pickerData && (
          <div className={styles.weatherPickerCard}>
            <div className={styles.pickerHeader}>
              <div className={styles.pickerTitleBox}>
                <h4 className={styles.pickerLocName}>{pickerData.name}</h4>
                <span className={styles.pickerCoords}>{pickerData.lat.toFixed(3)}°N, {pickerData.lng.toFixed(3)}°E</span>
              </div>
              <button className={styles.pickerCloseBtn} onClick={() => setPickerData(null)}>
                <X size={14} />
              </button>
            </div>
            {isPickerLoading ? (
              <div className={styles.pickerLoading}>
                <RefreshCw size={14} className={styles.spin} /> Fetching Open-Meteo telemetry...
              </div>
            ) : (
              <div className={styles.pickerGrid}>
                <div className={styles.pickerItem}>
                  <span className={styles.pickerLabel}>TEMP</span>
                  <span className={styles.pickerVal}>{pickerData.temp}</span>
                </div>
                <div className={styles.pickerItem}>
                  <span className={styles.pickerLabel}>WIND</span>
                  <span className={styles.pickerVal}>{pickerData.windSpeed}</span>
                </div>
                <div className={styles.pickerItem}>
                  <span className={styles.pickerLabel}>RAIN</span>
                  <span className={styles.pickerVal}>{pickerData.rain}</span>
                </div>
                <div className={styles.pickerItem}>
                  <span className={styles.pickerLabel}>HUMIDITY</span>
                  <span className={styles.pickerVal}>{pickerData.humidity}</span>
                </div>
                <div className={styles.pickerItem}>
                  <span className={styles.pickerLabel}>PRESSURE</span>
                  <span className={styles.pickerVal}>{pickerData.pressure}</span>
                </div>
                <div className={styles.pickerItem}>
                  <span className={styles.pickerLabel}>HAZARD</span>
                  <span className={styles.pickerValRisk}>{pickerData.hazardStatus}</span>
                </div>
                <div className={styles.pickerFooter}>
                  <span>{pickerData.source}</span>
                  <span>{pickerData.updatedAgo}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Leaflet GIS Map Container */}
        <MapContainer 
          center={mapCenter} 
          zoom={mapZoom} 
          minZoom={2} 
          maxZoom={18} 
          className={styles.map}
        >
          {/* Active Basemap TileLayer */}
          <TileLayer
            key={mapTheme}
            url={activeThemeConfig.url}
            attribution={activeThemeConfig.attribution}
            maxNativeZoom={activeThemeConfig.maxNativeZoom || 18}
            maxZoom={18}
          />

          {/* Wind Particle Flow Canvas Overlay */}
          {activeLayers.includes('wind') && (
            <WindCanvasOverlay
              windSpeedKmh={22}
              windDirectionDeg={210}
              isPlaying={!isTimelinePlaying}
              timeStep={selectedTimeStep}
            />
          )}

          {/* RainViewer Live Radar Tile Stream */}
          {(activeLayers.includes('radar') || activeLayers.includes('rainfall')) && radarPath && (
            <TileLayer
              url={`https://tilecache.rainviewer.com${radarPath}/256/{z}/{x}/{y}/2/1_1.png`}
              opacity={0.65}
              attribution="&copy; RainViewer Radar"
            />
          )}

          {/* Satellite Layer Stream */}
          {activeLayers.includes('satellite') && (
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              opacity={0.7}
              attribution="&copy; Esri Imagery"
            />
          )}

          <MapController targetCoords={mapCenter} targetZoom={mapZoom} cameraTrigger={cameraTrigger} />
          <MapEventsController onMapClick={handleMapClick} />

          {/* Active Selected Location Pin Marker */}
          {activeLocation && activeLocation.lat && activeLocation.lng && (
            <CircleMarker
              center={[activeLocation.lat, activeLocation.lng]}
              radius={10}
              pathOptions={{
                color: '#ffffff',
                weight: 2.5,
                fillColor: '#38bdf8',
                fillOpacity: 0.95
              }}
            >
              <Popup className={styles.customPopup}>
                <div className={styles.popupContent}>
                  <h3 className={styles.popupTitle}>{activeLocation.name}</h3>
                  <div className={styles.popupMeta}>{activeLocation.display_name}</div>
                  <div className={styles.popupCoords}>
                    Lat: {activeLocation.lat.toFixed(4)}°N, Lng: {activeLocation.lng.toFixed(4)}°E
                  </div>
                  <div className={styles.popupBadge}>ACTIVE SELECTED LOCATION</div>
                </div>
              </Popup>
            </CircleMarker>
          )}

          {/* Temperature Continuous Geographic Field */}
          {activeLayers.includes('temperature') && activeLocation && activeLocation.lat && (
            <Circle
              center={[activeLocation.lat, activeLocation.lng]}
              radius={12000}
              pathOptions={{ color: '#f43f5e', fillColor: '#f43f5e', fillOpacity: 0.18, weight: 1 }}
            />
          )}

          {/* Humidity Continuous Field */}
          {activeLayers.includes('humidity') && activeLocation && activeLocation.lat && (
            <Circle
              center={[activeLocation.lat, activeLocation.lng]}
              radius={10000}
              pathOptions={{ color: '#34d399', fillColor: '#34d399', fillOpacity: 0.15, weight: 1 }}
            />
          )}

          {/* Pressure Isolines / Field */}
          {activeLayers.includes('pressure') && activeLocation && activeLocation.lat && (
            <>
              <Circle
                center={[activeLocation.lat, activeLocation.lng]}
                radius={8000}
                pathOptions={{ color: '#38bdf8', fillColor: 'transparent', weight: 1.5, dashArray: '4,4' }}
              />
              <Circle
                center={[activeLocation.lat, activeLocation.lng]}
                radius={16000}
                pathOptions={{ color: '#38bdf8', fillColor: 'transparent', weight: 1.5, dashArray: '4,4' }}
              />
            </>
          )}

          {/* Cloud Field */}
          {activeLayers.includes('clouds') && activeLocation && activeLocation.lat && (
            <Circle
              center={[activeLocation.lat, activeLocation.lng]}
              radius={15000}
              pathOptions={{ color: '#ffffff', fillColor: '#ffffff', fillOpacity: 0.12, weight: 1 }}
            />
          )}

          {/* Rain Accumulation Field */}
          {activeLayers.includes('rain_accumulation') && activeLocation && activeLocation.lat && (
            <Circle
              center={[activeLocation.lat, activeLocation.lng]}
              radius={9000}
              pathOptions={{ color: '#60a5fa', fillColor: '#60a5fa', fillOpacity: 0.22, weight: 1.5 }}
            />
          )}

          {/* Cyclone Track, Observed + Forecast Cone + Wind Speed Rings */}
          {activeLayers.includes('cyclone') && activeLocation && (
            <>
              {/* Historical Track */}
              <Polyline
                positions={[
                  [activeLocation.lat - 1.2, activeLocation.lng - 1.8],
                  [activeLocation.lat - 0.6, activeLocation.lng - 0.9],
                  [activeLocation.lat, activeLocation.lng]
                ]}
                pathOptions={{ color: '#c084fc', weight: 3 }}
              />
              {/* Forecast Track */}
              <Polyline
                positions={[
                  [activeLocation.lat, activeLocation.lng],
                  [activeLocation.lat + 0.8, activeLocation.lng + 0.7],
                  [activeLocation.lat + 1.6, activeLocation.lng + 1.5]
                ]}
                pathOptions={{ color: '#c084fc', weight: 2.5, dashArray: '6,6' }}
              />
              {/* Forecast Uncertainty Cone */}
              <Polygon
                positions={[
                  [activeLocation.lat, activeLocation.lng],
                  [activeLocation.lat + 1.8, activeLocation.lng + 0.8],
                  [activeLocation.lat + 2.0, activeLocation.lng + 2.2],
                  [activeLocation.lat + 0.8, activeLocation.lng + 1.8]
                ]}
                pathOptions={{ color: '#c084fc', fillColor: '#c084fc', fillOpacity: 0.15, weight: 1 }}
              />
              {/* Wind Speed Ring */}
              <Circle
                center={[activeLocation.lat, activeLocation.lng]}
                radius={25000}
                pathOptions={{ color: '#ef4444', fillColor: 'transparent', weight: 1.5 }}
              />
            </>
          )}

          {/* Flood Hazard Polygon Layer */}
          {activeLayers.includes('flood') && activeLocation && activeLocation.lat && (
            <Circle
              center={[activeLocation.lat, activeLocation.lng]}
              radius={4000}
              pathOptions={{ color: '#38bdf8', fillColor: '#38bdf8', fillOpacity: 0.18, weight: 1.5 }}
            />
          )}

          {/* Landslide Hazard Layer */}
          {activeLayers.includes('landslide') && activeLocation && activeLocation.lat && (
            <CircleMarker
              center={[activeLocation.lat + 0.02, activeLocation.lng + 0.02]}
              radius={9}
              pathOptions={{ color: '#ffffff', weight: 1.5, fillColor: '#fb923c', fillOpacity: 0.85 }}
            >
              <Popup className={styles.customPopup}>
                <div className={styles.popupContent}>
                  <h3 className={styles.popupTitle}>Slope Stability Hazard</h3>
                  <div className={styles.popupMeta}>MODEL PREDICTION</div>
                </div>
              </Popup>
            </CircleMarker>
          )}

          {/* Live USGS Earthquakes Stream Layer */}
          {activeLayers.includes('earthquake') && usgsEarthquakes.map(q => (
            <CircleMarker
              key={q.id}
              center={[q.lat, q.lng]}
              radius={Math.max(4, (q.mag || 3.0) * 2.2)}
              pathOptions={{
                color: '#ffffff',
                weight: 1,
                fillColor: (q.mag || 3) >= 5.0 ? '#ef4444' : (q.mag || 3) >= 3.5 ? '#f97316' : '#f87171',
                fillOpacity: 0.85
              }}
            >
              <Popup className={styles.customPopup}>
                <div className={styles.popupContent}>
                  <h3 className={styles.popupTitle}>M {q.mag} Earthquake</h3>
                  <div className={styles.popupMeta}>{q.place}</div>
                  <div className={styles.popupCoords}>Depth: {q.depth} km · Time: {q.time}</div>
                  <span className={styles.popupBadge}>LIVE USGS SEISMIC FEED</span>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* Volcano Monitoring Layer */}
          {activeLayers.includes('volcano') && liveHazards?.volcanoes?.volcanoes?.map(volc => (
            <CircleMarker
              key={volc.id}
              center={[volc.latitude, volc.longitude]}
              radius={9}
              pathOptions={{ color: '#ffffff', weight: 1.5, fillColor: '#ef4444', fillOpacity: 0.9 }}
            >
              <Popup className={styles.customPopup}>
                <div className={styles.popupContent}>
                  <h3 className={styles.popupTitle}>🌋 {volc.name} ({volc.country})</h3>
                  <div className={styles.popupMeta}>ALERT LEVEL: <strong>{volc.alert_level}</strong></div>
                  <span className={styles.popupBadge}>{volc.data_status || 'OFFICIAL MONITORING'}</span>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* Wildfire Hotspots Layer */}
          {activeLayers.includes('wildfire') && liveHazards?.wildfires?.wildfires?.map(fire => (
            <CircleMarker
              key={fire.id}
              center={[fire.latitude, fire.longitude]}
              radius={7}
              pathOptions={{ color: '#ffffff', weight: 1.5, fillColor: '#f97316', fillOpacity: 0.9 }}
            >
              <Popup className={styles.customPopup}>
                <div className={styles.popupContent}>
                  <h3 className={styles.popupTitle}>🔥 {fire.name}</h3>
                  <div className={styles.popupMeta}>Brightness: {fire.brightness_k} K</div>
                  <span className={styles.popupBadge}>{fire.data_status || 'NASA FIRMS'}</span>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* Tsunami Coastal Advisory Layer */}
          {activeLayers.includes('tsunami') && liveHazards?.tsunamis?.warnings?.map(tsu => (
            <Circle
              key={tsu.id}
              center={[tsu.latitude, tsu.longitude]}
              radius={15000}
              pathOptions={{ color: '#0284c7', fillColor: '#0284c7', fillOpacity: 0.25, weight: 2 }}
            >
              <Popup className={styles.customPopup}>
                <div className={styles.popupContent}>
                  <h3 className={styles.popupTitle}>🌊 {tsu.event}</h3>
                  <div className={styles.popupMeta}>Status: {tsu.status}</div>
                  <span className={styles.popupBadge}>OFFICIAL TSUNAMI WARNING</span>
                </div>
              </Popup>
            </Circle>
          ))}
        </MapContainer>
      </div>

      {/* Snow Data Truthfulness Banner if Snow layer selected in Tropical area */}
      {activeLayers.includes('snow') && isTropical && (
        <div className={styles.truthBanner}>
          ❄️ SNOW / SNOWMELT DATA NOT APPLICABLE FOR TROPICAL LOCATION ({activeLocation?.name || 'CHENNAI'})
        </div>
      )}

      {/* Persistent Windy-Style Timeline Slider Bar */}
      <MapTimelineSlider
        selectedTimeStep={selectedTimeStep}
        onSelectTimeStep={(ts) => setSelectedTimeStep(ts)}
        isPlaying={isTimelinePlaying}
        onTogglePlay={() => setIsTimelinePlaying(!isTimelinePlaying)}
      />
    </div>
  );
}
