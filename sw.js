// Service worker SkyDex : coque de l'application disponible hors connexion, données de vol toujours en direct.
const VERSION = 'skydex-v20';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './css/style.css',
  './js/app.js', './js/brand.js', './js/catalog.js', './js/cards.js', './js/cinematic.js', './js/encounter.js',
  './js/flights.js', './js/fx.js', './js/packs.js', './js/planelayer.js', './js/screens.js', './js/state.js', './js/ui.js',
  './assets/icons/icon-192.png', './assets/icons/icon-512.png', './assets/icons/icon.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // Trafic ADS-B : toujours le réseau (jamais de vieux avions en cache)
  if (url.hostname.includes('adsb')) return;
  // Fonds de carte (raster + vectoriel) : cache d'abord (zoom instantané), mise à jour en arrière-plan, plafonné
  if (/tile\.openstreetmap|openfreemap|basemaps/.test(url.hostname)) {
    e.respondWith(caches.open(VERSION + '-tiles').then(async c => {
      const hit = await c.match(e.request);
      const net = fetch(e.request).then(r => {
        if (r && (r.ok || r.type === 'opaque')) {
          c.put(e.request, r.clone());
          c.keys().then(k => { if (k.length > 1500) k.slice(0, k.length - 1500).forEach(x => c.delete(x)); });
        }
        return r;
      }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  // Fichiers du jeu : réseau d'abord (mises à jour immédiates), cache si hors ligne
  e.respondWith(fetch(e.request, url.origin === location.origin ? { cache: 'no-cache' } : undefined).then(r => {
    if (r.ok && url.origin === location.origin) { const cp = r.clone(); caches.open(VERSION).then(c => c.put(e.request, cp)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
