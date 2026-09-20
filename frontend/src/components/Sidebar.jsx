import React from 'react';
import {
  LayoutDashboard,
  Map,
  Brain,
  Thermometer,
  Bell,
  MapPin,
  Database,
  Settings,
  Hexagon,
  LifeBuoy,
  Radio,
  BarChart2
} from 'lucide-react';
import styles from './Sidebar.module.css';
import { navItems } from '../data/mockData.js';

// Map icon names to Lucide components
const iconMap = {
  LayoutDashboard,
  Map,
  Brain,
  Thermometer,
  Bell,
  MapPin,
  Database,
  Settings,
  LifeBuoy,
  Radio,
  BarChart2
};

export default function Sidebar({ activeSection = 'overview', onNavigate }) {
  const topNav = navItems?.top || [
    { id: 'overview', label: 'OVERVIEW', icon: 'LayoutDashboard' },
    { id: 'risk-map', label: 'RISK MAP', icon: 'Map' },
    { id: 'prediction', label: 'PREDICTION', icon: 'Brain' },
    { id: 'environment', label: 'ENVIRONMENT', icon: 'Thermometer' },
    { id: 'alerts', label: 'ALERTS', icon: 'Bell' },
    { id: 'broadcast', label: 'BROADCAST', icon: 'Radio' },
    { id: 'analytics', label: 'ANALYTICS', icon: 'BarChart2' },
    { id: 'rescue', label: 'RESCUE OPS', icon: 'LifeBuoy' }
  ];

  const bottomNav = navItems?.bottom || [
    { id: 'data-sources', label: 'DATA SOURCES', icon: 'Database' },
    { id: 'system', label: 'SYSTEM', icon: 'Settings' }
  ];

  const renderNavItem = (item) => {
    const Icon = iconMap[item.icon];
    const isActive = activeSection === item.id;

    return (
      <button
        key={item.id}
        className={`${styles.navItem} ${isActive ? styles.active : ''}`}
        onClick={() => onNavigate && onNavigate(item.id)}
        aria-label={item.label}
      >
        {Icon && <Icon className={styles.icon} size={24} />}
        <span className={styles.tooltip}>{item.label}</span>
        <span className={styles.mobileLabel}>{item.label}</span>
      </button>
    );
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoArea}>
        <Hexagon className={styles.logoIcon} size={28} />
      </div>

      <div className={styles.navGroupTop}>
        {/* On mobile, only slice first 5 items per requirements */}
        <div className={styles.desktopOnly}>
          {topNav.map(renderNavItem)}
        </div>
        <div className={styles.mobileOnly}>
          {topNav.slice(0, 5).map(renderNavItem)}
        </div>
      </div>

      <div className={styles.navGroupBottom}>
        {bottomNav.map(renderNavItem)}
      </div>
    </aside>
  );
}
