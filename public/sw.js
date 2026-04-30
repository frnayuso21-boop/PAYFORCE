self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'PayForce', {
      body:     data.body,
      icon:     '/icon-192.png',
      badge:    '/icon-192.png',
      vibrate:  [200, 100, 200],
      data:     { url: data.url || '/app/dashboard' },
      actions:  data.actions || [{ action: 'view', title: 'Ver detalle' }],
      tag:      data.tag || 'payforce-notification',
      renotify: true,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/app/dashboard';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
