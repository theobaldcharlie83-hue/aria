// Cache hors ligne du Carnet d'Aria et du Grimoire MJ.
// Changer VERSION à chaque mise en ligne pour forcer la mise à jour.
const VERSION = "aria-20261122-1610";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "campagne.json",
               "mj/", "mj/index.html", "mj/manifest.webmanifest", "lieux.json", "achats.json", "monde.jpg"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && !k.startsWith("aria-sons") && k !== "aria-livre").map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Ambiances sonores du MJ : gérées par l'appli MJ elle-même (cache « aria-sons »), jamais préchargées chez les joueurs.
  if (url.pathname.includes("/sons/")) { e.respondWith(caches.match(req).then(r => r || fetch(req))); return; }
  // Pages du livre (MJ, chiffrées, noms uniques par contenu) : cache dédié qui survit aux mises à jour.
  if (url.pathname.includes("/mj/livre/")) {
    e.respondWith(caches.open("aria-livre").then(c => c.match(req).then(r => r || fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }))));
    return;
  }
  // Réseau d'abord pour le journal et les pages (pour avoir la dernière version), cache en secours.
  const networkFirst = url.origin === location.origin && (url.pathname.endsWith(".json") || req.mode === "navigate" || url.pathname.endsWith(".html"));
  if (networkFirst) {
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res; })
      .catch(() => caches.match(req).then(r => r || caches.match("index.html"))));
    return;
  }
  // Cache d'abord pour le reste (icônes, polices).
  e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => {
    if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => r)));
});
