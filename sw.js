// Cache hors ligne de tout le site (accueil, Aria, Channel Fear…).
// publier.sh change VERSION à chaque mise en ligne pour forcer la mise à jour des téléphones.
const VERSION = "aria-20261127-1819";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "mj/", "mj/index.html",
  "aria/", "aria/index.html", "aria/manifest.webmanifest", "aria/icon-192.png", "aria/campagne.json", "aria/lieux.json", "aria/achats.json", "aria/monde.jpg",
  "aria/mj/", "aria/mj/index.html", "aria/mj/manifest.webmanifest",
  "channel-fear/", "channel-fear/index.html", "channel-fear/manifest.webmanifest", "channel-fear/icon-192.png", "channel-fear/episodes.json",
  "channel-fear/mj/", "channel-fear/mj/index.html", "channel-fear/mj/manifest.webmanifest"];
// Caches dédiés qui survivent aux mises à jour (fichiers à nom unique par contenu, ou gérés par les applis).
const GARDES = k => k === VERSION || k.startsWith("aria-sons") || k === "aria-livre";

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => !GARDES(k)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Ambiances sonores du MJ : gérées par l'appli MJ elle-même, jamais préchargées chez les joueurs.
  if (url.pathname.includes("/sons/")) { e.respondWith(caches.match(req).then(r => r || fetch(req))); return; }
  // Pages des livres (MJ, chiffrées, noms uniques par contenu) : cache dédié.
  if (url.pathname.includes("/mj/livre/")) {
    e.respondWith(caches.open("aria-livre").then(c => c.match(req).then(r => r || fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }))));
    return;
  }
  // Réseau d'abord pour les pages et les données (dernière version), cache en secours.
  const networkFirst = url.origin === location.origin && (url.pathname.endsWith(".json") || req.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith("/"));
  if (networkFirst) {
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match(new URL("index.html", url).href))));
    return;
  }
  // Cache d'abord pour le reste (icônes, images chiffrées, polices).
  e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => {
    if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => r)));
});
