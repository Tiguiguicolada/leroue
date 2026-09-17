// Grimoire du Bar — Service Worker
// IMPORTANT: incrémente CACHE_VERSION à chaque déploiement
// (v1 -> v2 -> v3...) pour déclencher la notification de mise à jour
const CACHE_VERSION = 'grimoire-v9';
const CORE = ['./', './index.html', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_VERSION)
      .then(c => c.addAll(CORE))
      .catch(() => {})
  );
  // On n'active PAS tout de suite — on attend le signal de l'utilisateur
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Message venant de la page: activer la nouvelle version maintenant
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (req.url.includes('api.anthropic.com')) return;

  e.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then(c => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then(hit => {
        if (hit) return hit;
        if (req.mode === 'navigate') return caches.match('./index.html');
        return new Response('Hors ligne', { status: 503 });
      }))
  );
});
