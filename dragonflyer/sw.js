// Service worker de DragonFlyer.
// Le jeu est gardé sur l'appareil et marche sans réseau. Il ne change que lorsqu'on appuie
// sur « Update » (écran titre ou réglages).
const CACHE = "dragonflyer-v5";
const BASE = "https://cdn.jsdelivr.net/npm/three@0.170.0/";
const FICHIERS = [
  "./", "./manifest.webmanifest", "./icone-192.png", "./icone-512.png", "./apple-touch-icon.png", "./blason.webp",
  "./ui-cuir.webp", "./ui-parchemin.webp", "./ui-gravure.webp", "./assets/village.glb", "./assets/animaux.glb", "./assets/paysages.glb", "./assets/caverne.glb", "./assets/animations.glb", ...["fermier", "fermiere", "ancien", "forgeron", "pecheuse", "chef", "runa"].map(m => `./assets/villageois_${m}.glb`),
  BASE + "build/three.module.js",
  BASE + "examples/jsm/loaders/GLTFLoader.js",
  BASE + "examples/jsm/libs/meshopt_decoder.module.js",
  BASE + "examples/jsm/utils/BufferGeometryUtils.js",
  BASE + "examples/jsm/utils/SkeletonUtils.js",
];
// Ce qu'on garde aussi au passage : la bibliothèque 3D et les polices.
const EXTERIEURS = ["https://cdn.jsdelivr.net/npm/", "https://fonts.googleapis.com/", "https://fonts.gstatic.com/"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith("dragonflyer-") && k !== CACHE).map(k => caches.delete(k))))
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
