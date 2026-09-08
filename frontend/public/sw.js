/* Global Multi-Disaster Early Warning System — Service Worker */
const CACHE_NAME = 'disaster-warning-sw-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/* Handle incoming Web Push Notifications */
self.addEventListener('push', (event) => {
  let payload = {
    title: '🚨 EMERGENCY DISASTER WARNING',
    body: 'An emergency hazard alert affects your monitored area.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: {
      alert_id: 'ALERT-LIVE-01',
      hazard_type: 'FLOOD',
      severity: 'EXTREME',
      deep_link: '/emergency/ALERT-LIVE-01',
      action: 'OPEN_LIFE_SAFETY'
    }
  };

  if (event.data) {
    try {
      const dataJson = event.data.json();
      payload = { ...payload, ...dataJson };
    } catch (e) {
      payload.body = event.data.text();
    }
  }

  const options = {
    body: payload.body,
    icon: payload.icon || '/favicon.ico',
    badge: payload.badge || '/favicon.ico',
    vibrate: [300, 100, 300, 100, 300],
    data: payload.data || {},
    actions: payload.actions || [
      { action: 'view_alert', title: 'VIEW SAFETY GUIDE' },
      { action: 'find_shelter', title: 'FIND SHELTER' }
    ],
    requireInteraction: true,
    tag: payload.data?.alert_id || 'disaster-alert'
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

/* Handle Notification Click & Deep Link to Life Safety Mode */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notificationData = event.notification.data || {};
  const targetUrl = notificationData.deep_link || '/emergency/active';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.postMessage({
            type: 'EMERGENCY_NOTIFICATION_CLICK',
            data: notificationData,
            url: targetUrl
          });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
