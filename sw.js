// Grimoire du Bar — Service Worker
// Change CACHE_VERSION à chaque mise à jour du site pour forcer le rafraîchissement
const CACHE_VERSION = 'grimoire-v1';
const CORE = [
  './',
  './index.html',
  './manifest.json'
];

// Installation — met en cache les fichiers essentiels
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_VERSION)
      .then(c => c.addAll(CORE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

// Activation — supprime les vieux caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch — réseau d'abord, cache en secours (network-first)
// Comme ça le site est toujours à jour quand il y a du réseau,
// et fonctionne quand même hors ligne
self.addEventListener('fetch', e => {
  const req = e.request;

  // On ne touche pas aux requêtes API ni aux méthodes autres que GET
  if (req.method !== 'GET') return;
  if (req.url.includes('api.anthropic.com')) return;

  e.respondWith(
    fetch(req)
      .then(res => {
        // Mettre à jour le cache avec la version fraîche
        const copy = res.clone();
        caches.open(CACHE_VERSION).then(c => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => {
        // Pas de réseau — servir depuis le cache
        return caches.match(req).then(hit => {
          if (hit) return hit;
          // Navigation sans cache — renvoyer la page principale
          if (req.mode === 'navigate') return caches.match('./index.html');
          return new Response('Hors ligne', { status: 503, statusText: 'Hors ligne' });
        });
      })
  );
});
