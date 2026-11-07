/* sw.js - service worker minimal untuk notifikasi.
 * Android Chrome/PWA TIDAK mengizinkan `new Notification()`; notifikasi harus lewat
 * ServiceWorkerRegistration.showNotification(). Berkas ini harus berada di root situs
 * (sejajar index.html) supaya scope-nya mencakup seluruh halaman. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// Ketuk notifikasi: fokuskan jendela yang sudah terbuka, atau buka tab Alat.
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './#alat', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
