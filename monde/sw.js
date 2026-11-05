// Service worker de My World Explorer.
// Le globe est gardé sur l'appareil et marche sans réseau. Il ne change que
// lorsqu'on appuie sur « Mettre à jour » (flèche ronde de l'écran titre ou Réglages).
const CACHE = "monde-v1";
const BASE = "https://cdn.jsdelivr.net/npm/three@0.170.0/";
const FICHIERS = [
  "./", "./manifest.webmanifest", "./icone-192.png", "./icone-512.png", "./apple-touch-icon.png",
  // les cartes fabriquées par outils/monde/fabriquer.py
  "./donnees/relief.webp", "./donnees/couleurs.jpg", "./donnees/ids.png", "./donnees/paysages.png", "./donnees/monde.json", "./donnees/relief_europe.webp",
  BASE + "build/three.module.js",
  BASE + "examples/jsm/lines/LineSegments2.js",
  BASE + "examples/jsm/lines/LineSegmentsGeometry.js",
  BASE + "examples/jsm/lines/LineMaterial.js",
  BASE + "examples/jsm/utils/BufferGeometryUtils.js",
];
const EXTERIEURS = ["https://cdn.jsdelivr.net/npm/", "https://fonts.googleapis.com/", "https://fonts.gstatic.com/"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith("monde-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (req.cache === "no-store" || url.searchParams.has("maj")) return;
  const ici = url.origin === location.origin && url.pathname.startsWith(new URL("./", location).pathname);
  if (!ici && !EXTERIEURS.some(p => req.url.startsWith(p))) return;
  const cle = req.mode === "navigate" ? new URL("./", location).href : req;
  e.respondWith(caches.open(CACHE).then(async c => {
    const vu = await c.match(cle, { ignoreSearch: req.mode === "navigate" });
    if (vu) return vu;
    const rep = await fetch(req);
    if (rep.ok || rep.type === "opaque") c.put(cle, rep.clone());
    return rep;
  }));
});
