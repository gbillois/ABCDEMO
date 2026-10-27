// Service worker du Domaine des Pins.
// Le jeu est gardé sur l'appareil et marche sans réseau (en solo). Il ne change que
// lorsqu'on appuie sur « Mettre à jour » sur l'écran d'accueil du jeu.
// Le relais du jeu à plusieurs passe par WebSocket : il n'est jamais intercepté ici.
const CACHE = "pins-v1";
const BASE = "https://cdn.jsdelivr.net/npm/three@0.170.0/";
const FICHIERS = [
  "./", "./manifest.webmanifest", "./icone-192.png", "./icone-512.png", "./apple-touch-icon.png",
  BASE + "build/three.module.js",
  BASE + "examples/jsm/objects/Sky.js",
  BASE + "examples/jsm/objects/Water.js",
  BASE + "examples/jsm/geometries/RoundedBoxGeometry.js",
  BASE + "examples/jsm/utils/BufferGeometryUtils.js",
];
// Ce qu'on garde aussi au passage : la bibliothèque 3D et la police du jeu.
const EXTERIEURS = ["https://cdn.jsdelivr.net/npm/", "https://fonts.googleapis.com/", "https://fonts.gstatic.com/"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith("pins-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // La vérification de mise à jour doit voir le site lui-même, pas la copie gardée.
  if (req.cache === "no-store" || url.searchParams.has("maj")) return;
  const ici = url.origin === location.origin && url.pathname.startsWith(new URL("./", location).pathname);
  if (!ici && !EXTERIEURS.some(p => req.url.startsWith(p))) return;
  // La page s'ouvre toujours depuis la copie gardée (avec ou sans « ?… » dans l'adresse).
  const cle = req.mode === "navigate" ? new URL("./", location).href : req;
  e.respondWith(caches.open(CACHE).then(async c => {
    const vu = await c.match(cle, { ignoreSearch: req.mode === "navigate" });
    if (vu) return vu;
    const rep = await fetch(req);
    if (rep.ok || rep.type === "opaque") c.put(cle, rep.clone());
    return rep;
  }));
});
