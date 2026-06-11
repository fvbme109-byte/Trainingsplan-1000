const CACHE = 'tp-v2';
const OFFLINE_RESPONSE = JSON.stringify({
  content: [{
    text: JSON.stringify({
      anpassungen: [],
      gesamtfazit: "⚠️ Keine Internetverbindung – KI-Analyse nicht möglich. Dein Plan und deine History sind gespeichert.",
      naechsterMeilenstein: "Beim nächsten Training mit Internet analysieren lassen."
    })
  }]
});

// Install: App-Shell cachen
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(['./index.html', './sw.js']))
      .then(() => self.skipWaiting())
  );
});

// Activate: Alte Caches löschen
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch: Strategie je nach Request-Typ
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Anthropic API: Network-only, bei Fehler Offline-Antwort
  if (url.includes('anthropic.com')) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(OFFLINE_RESPONSE, { headers: { 'Content-Type': 'application/json' } })
      )
    );
    return;
  }

  // Alles andere: Cache-first, dann Network, dann Cache-Fallback
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
