/*
  Service Worker — Bibline
  Rôle : permettre l'installation de l'app (PWA) et un fonctionnement hors-ligne
  raisonnable pour la coquille de l'application (HTML/CSS/JS/icônes).
  Les tuiles de carte (OpenStreetMap / Esri) ne sont volontairement PAS mises
  en cache : elles nécessitent une connexion et sont trop nombreuses/lourdes.
*/

/* Changer ce numéro à chaque mise en ligne : l'ancien cache est alors effacé et tous les fichiers
   ci-dessous sont retéléchargés ensemble. C'est ce qui garantit que index.html, styles.css et app.js
   restent d'une même version — avec plusieurs fichiers, c'est le point à ne pas oublier. */
const CACHE_VERSION = 'bibline-v0.11.2';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './arbre.js',
  './edition.js',
  './app.js',
  './bible-books.js',
  './data.json',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
];

// Domaines de tuiles cartographiques à ne jamais intercepter/mettre en cache
const MAP_TILE_HOSTS = [
  'tile.openstreetmap.org',
  'server.arcgisonline.com',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      // Fichier par fichier : si l'un d'eux manquait (oubli lors de la mise en ligne), un addAll
      // groupé abandonnerait tout le cache d'un bloc et le mode hors-ligne cesserait de fonctionner
      // sans prévenir. Ici, les autres fichiers sont tout de même mis en cache, et la console
      // nomme celui qui manque.
      Promise.all(APP_SHELL.map((url) =>
        cache.add(url).catch((err) => console.warn('Bibline : ressource absente du cache —', url, err))
      ))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // On ne touche jamais aux requêtes qui ne sont pas de simples lectures GET
  if (event.request.method !== 'GET') return;

  // Tuiles de carte : on laisse passer directement au réseau, sans mise en cache
  if (MAP_TILE_HOSTS.some((h) => url.hostname.endsWith(h))) {
    return;
  }

  // Coquille de l'app (même origine) : cache d'abord, puis réseau en secours,
  // et on met à jour le cache silencieusement en arrière-plan
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request).then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Ressources externes (polices, Leaflet, Dexie via CDN) : stale-while-revalidate
  event.respondWith(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request).then((response) => {
          if (response && response.ok) cache.put(event.request, response.clone());
          return response;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    )
  );
});