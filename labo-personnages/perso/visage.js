// visage.js — le visage DESSINÉ façon Mii, en décalques posés sur l'œuf lisse de tete.js : traits simples et nets,
// sans ombre. On reconnaît chacun à ses dessins : 6 formes d'yeux, 6 sourcils, 5 nez, 6 bouches (+ cils des filles,
// rides douces des adultes). Les yeux sont des décalques à part : ils clignent (échelle en y autour du centre de l'œil).
// traitsVisage(o) → { yeux, sourcils, nez, bouche } : o.traits s'il est donné (choix du créateur), sinon tiré d'un hachage
//   des autres choix (peau, cheveux, coupe, iris, taille, o.seed) : deux personnages différents ont des traits différents.
// construireVisage(g, os, type, o, qualite) → { animer(dt), geoLeger, yeux, reste } ; g.userData.lids = les 2 yeux.
// Foule : geoVisageLeger = quelques disques en couleurs de sommets (rouge = iris, vert = sourcil), posés dans le corps.
import * as THREE from "three";
import { devant, gradient, sdfTete, mesuresTete } from "./tete.js";
import { matDecalPeau } from "./materiaux.js";
import { mergeGeometries } from "../jeu.js";

export const NB_TRAITS = { yeux: 6, sourcils: 6, nez: 5, bouche: 6 };
export function traitsVisage(o = {}) {
  const t = o.traits; if (t) return { yeux: (t.yeux ?? 0) % 6, sourcils: (t.sourcils ?? 0) % 6, nez: (t.nez ?? 0) % 5, bouche: (t.bouche ?? 0) % 6 };
  let h = 2166136261; for (const v of [o.skin, o.hair, o.coiffure, o.eyes, o.tete, o.scale, o.long ? 1 : 0, o.seed]) { h = Math.imul(h ^ (Math.round((v ?? 7) * 1000) | 0), 16777619); h ^= h >>> 13; }
  const r = k => { h = Math.imul(h ^ (h >>> 15), 2246822507); h ^= h >>> 13; return (h >>> 0) % k; };
  return { yeux: r(6), sourcils: r(6), nez: r(5), bouche: r(6) };
}

// ---- l'atlas (512×256) : œil 256×256 | bouche (256,0) 256×128 | sourcil (256,128) 256×64 | nez (256,192) 128×64 | joue (384,192) 128×64
const ATLAS = new Map(), NOIR = "#2b1c18";
function atlasVisage(iris, sourcil, peau, f, ad, T) {
  const key = [iris, sourcil, peau, f, ad, T.yeux, T.sourcils, T.nez, T.bouche].join("-"); if (ATLAS.has(key)) return ATLAS.get(key);
  const c = document.createElement("canvas"); c.width = 512; c.height = 256; dessinerAtlas(c.getContext("2d"), iris, sourcil, peau, f, ad, T);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.userData = { partage: true }; ATLAS.set(key, t); return t;
}
// aperçu d'un trait pour le créateur de personnage : sorte = yeux | sourcils | nez | bouche, i = variante,
// o = options de person() (couleurs, long, type adulte) → image (data: URL) sur fond de peau
const ZONES = { yeux: [0, 0, 256, 256], sourcils: [256, 128, 256, 64], nez: [256, 192, 128, 64], bouche: [256, 0, 256, 128] };
export function apercuVisage(sorte, i, o = {}, l = 96, h = 64) {
  const a = document.createElement("canvas"); a.width = 512; a.height = 256; const T = { ...traitsVisage(o), [sorte]: i }, peau = o.skin ?? 0xf1c6a0;
  dessinerAtlas(a.getContext("2d"), o.eyes ?? 0x6b4424, o.hair ?? 0x5a3a22, peau, !!o.long, !!o.adulte, T);
  const c = document.createElement("canvas"); c.width = l; c.height = h; const x = c.getContext("2d"), [u, v, w, hh] = ZONES[sorte], z = { yeux: 1.25, nez: 1.4 }[sorte] ?? 1;
  x.fillStyle = "#" + new THREE.Color(peau).getHexString(); x.fillRect(0, 0, l, h);
  // on découpe la zone du trait seulement (zoom z autour de son centre), posée au centre de l'aperçu
  const sw = w / z, sh = hh / z, cx = u + w / 2, cy = sorte === "yeux" ? v + 132 : v + hh / 2, k = Math.min(l / sw, h / sh);
  x.drawImage(a, cx - sw / 2, Math.max(v, cy - sh / 2), sw, sh, (l - sw * k) / 2, (h - sh * k) / 2, sw * k, sh * k); return c.toDataURL();
}
function dessinerAtlas(x, iris, sourcil, peau, f, ad, T) {
  const col = (h, k, w = 0) => "#" + new THREE.Color(h).multiplyScalar(k).lerp(new THREE.Color(0xffffff), w).getHexString();
  const trait = (w, s = NOIR) => { x.lineWidth = w; x.strokeStyle = s; x.lineCap = x.lineJoin = "round"; };
  const ell = (cx, cy, rx, ry, fill) => { x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); if (fill) { x.fillStyle = fill; x.fill(); } };
  const ligne = pts => { x.beginPath(); x.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 4) x.quadraticCurveTo(pts[i], pts[i + 1], pts[i + 2], pts[i + 3]); x.stroke(); };
  // ---- œil (le coin extérieur est à droite ; le décalque de l'autre œil est en miroir)
  x.save(); const k = ad ? .84 : 1; x.translate(128, 132); x.scale(k, k); x.translate(-128, -132);
  const iri = (cx, cy, r) => { ell(cx, cy, r, r * 1.05, col(iris, 1)); ell(cx, cy + r * .1, r * .5, r * .55, NOIR); ell(cx - r * .38, cy - r * .42, r * .27, r * .3, "#fff"); };
  const blancEtIris = (forme, cy, r) => { forme(); x.fillStyle = "#fff"; x.fill(); x.save(); forme(); x.clip(); iri(128, cy, r); x.restore(); forme(); };
  const Y = T.yeux;
  if (Y === 0) { blancEtIris(() => ell(128, 134, 58, 70), 146, 46); trait(8); x.stroke(); trait(14); x.beginPath(); x.ellipse(128, 134, 58, 70, 0, Math.PI * 1.08, Math.PI * 1.95); x.stroke(); }
  else if (Y === 1) { const am = () => { x.beginPath(); x.moveTo(52, 140); x.quadraticCurveTo(122, 62, 210, 120); x.quadraticCurveTo(140, 200, 52, 140); x.closePath(); };
    blancEtIris(am, 140, 42); trait(6); x.stroke(); trait(14); ligne([48, 142, 122, 58, 214, 116]); trait(8); ligne([210, 116, 222, 108, 232, 96]); }
  else if (Y === 2) { ell(128, 140, 36, 50, col(iris, .32)); ell(128, 150, 22, 30, col(iris, .75)); ell(128, 152, 13, 18, NOIR); ell(114, 118, 11, 13, "#fff"); ell(140, 168, 5, 5, "rgba(255,255,255,.8)"); }
  else if (Y === 3) { const ri = () => { x.beginPath(); x.moveTo(50, 128); x.lineTo(206, 116); x.quadraticCurveTo(200, 196, 128, 196); x.quadraticCurveTo(56, 194, 50, 128); x.closePath(); };
    blancEtIris(ri, 150, 46); trait(6); x.stroke(); trait(15); ligne([44, 130, 128, 118, 212, 114]); }
  else if (Y === 4) { blancEtIris(() => ell(128, 132, 66, 76), 140, 54); trait(7); x.stroke(); ell(150, 176, 8, 8, "#fff"); trait(14); x.beginPath(); x.ellipse(128, 132, 66, 76, 0, Math.PI * 1.1, Math.PI * 1.92); x.stroke(); }
  else { blancEtIris(() => ell(128, 140, 76, 40), 146, 36); trait(6); x.stroke(); trait(13); x.beginPath(); x.ellipse(128, 140, 76, 40, 0, Math.PI * 1.05, Math.PI * 1.97); x.stroke(); }
  if (f) { trait(ad ? 5 : 7); const cils = Y === 5 ? [[194, 116, 214, 96], [178, 106, 192, 86]] : Y === 3 ? [[200, 114, 222, 98], [182, 114, 198, 94]] : [[196, 92, 220, 74], [178, 80, 194, 58], [206, 108, 232, 100]];
    for (const [a1, b1, a2, b2] of cils) { x.beginPath(); x.moveTo(a1, b1); x.lineTo(a2, b2); x.stroke(); } }
  if (ad) { trait(5, "rgba(120,70,60,.55)"); ligne([70, 52, 130, 30, 196, 52]); ligne([188, 196, 210, 190, 224, 174]); } // pli de paupière, petite ride au coin
  x.restore();
  // ---- bouche (256,0)
  x.save(); x.translate(256, 0); const LV = "#7a2c2a", B = T.bouche;
  const ouverte = dents => { x.beginPath(); x.moveTo(80, 42); x.quadraticCurveTo(128, 52, 176, 42); x.quadraticCurveTo(128, 120, 80, 42); x.closePath(); x.fillStyle = "#8c2f32"; x.fill();
    x.save(); x.clip(); ell(128, 84, 28, 16, "#e8737e"); if (dents) { x.fillStyle = "#fff"; x.fillRect(70, 30, 116, 20); } x.restore();
    x.beginPath(); x.moveTo(80, 42); x.quadraticCurveTo(128, 52, 176, 42); x.quadraticCurveTo(128, 120, 80, 42); trait(5, LV); x.stroke(); };
  if (B === 0) { trait(8, LV); ligne([80, 50, 128, 86, 176, 50]); }
  else if (B === 1) ouverte(false);
  else if (B === 2) { trait(7, LV); ligne([104, 56, 128, 68, 152, 56]); }
  else if (B === 3) ouverte(true);
  else if (B === 4) { trait(8, LV); ligne([88, 58, 136, 78, 176, 44]); }
  else { ell(128, 60, 30, 13, "#d9707a"); trait(4, LV); ligne([100, 59, 128, 64, 156, 59]); }
  // ---- sourcil (256,128) : couleur des cheveux, plus foncée
  x.translate(0, 128); const S = T.sourcils, ws = (ad ? .8 : 1) * (f ? .85 : 1); trait(1, col(sourcil, .62));
  const SO = [[9, [50, 36, 128, 30, 206, 28]], [10, [44, 46, 128, 4, 212, 36]], [18, [52, 36, 128, 32, 204, 32]], [12, [50, 46, 128, 34, 206, 20]], [11, [80, 40, 130, 20, 186, 36]], [10, [50, 26, 120, 14, 206, 44]]][S];
  x.lineWidth = SO[0] * ws * 1.4; ligne(SO[1]);
  // ---- nez (256,192) : petit trait, couleur de la peau assombrie
  x.translate(0, 64); const N = col(peau, .66), kn = ad ? 1.15 : 1; x.save(); x.translate(64, 32); x.scale(kn, kn); x.translate(-64, -32); trait(7, N);
  if (T.nez === 0) ligne([50, 28, 64, 46, 78, 28]);
  else if (T.nez === 1) { x.beginPath(); x.moveTo(68, 8); x.lineTo(58, 40); x.quadraticCurveTo(62, 48, 74, 44); x.stroke(); }
  else if (T.nez === 2) { ell(54, 36, 5, 4, N); ell(74, 36, 5, 4, N); }
  else if (T.nez === 3) ligne([72, 14, 50, 32, 72, 48]);
  else { ell(64, 32, 18, 13, col(peau, .9)); trait(5, N); ligne([50, 38, 64, 48, 78, 38]); }
  x.restore();
  // ---- joue rose (384,192), légère
  x.translate(128, 0); const gb = x.createRadialGradient(64, 32, 2, 64, 32, 46); const a = ad ? .22 : .38;
  gb.addColorStop(0, `rgba(255,120,135,${a})`); gb.addColorStop(1, "rgba(255,120,135,0)"); x.fillStyle = gb; x.fillRect(0, 0, 128, 64);
  x.restore();
}
const MATS = new Map();
function matVisage(...a) {
  const key = a.flatMap(v => typeof v === "object" ? Object.values(v) : [v]).join("-"); if (MATS.has(key)) return MATS.get(key);
  const m = matDecalPeau(atlasVisage(...a)); m.userData.partage = true; MATS.set(key, m); return m;
}

// ---- géométrie : petites grilles qui épousent la face (devant : profondeur de la peau en x, y), partagées par type
const GEOS = new Map();
function geosVisage(type) {
  if (GEOS.has(type)) return GEOS.get(type);
  const M = mesuresTete(type), E = M.oeil, ad = type === "femme" || type === "homme", K = ad ? .86 : 1, z = (x, y) => devant(type, x, y) ?? 0;
  // (cx, cy, w, h) dans la tête ; (u0, v0, du, dv) dans l'atlas ; n = subdivisions
  const decal = (cx, cy, w, h, u0, v0, du, dv, mir, n = 4) => {
    const pos = [], uv = [], idx = [], cz = z(cx, cy);
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) { const a = i / n, b = j / n, X = cx + (a - .5) * w, Y = cy + (b - .5) * h; pos.push(X - cx, Y - cy, z(X, Y) + .0022 - cz); uv.push((u0 + (mir ? 1 - a : a) * du) / 512, 1 - (v0 + (1 - b) * dv) / 256); }
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const p = j * (n + 1) + i; idx.push(p, p + 1, p + n + 2, p, p + n + 2, p + n + 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals(); geo.userData.partage = true;
    return { geo, c: new THREE.Vector3(cx, cy, cz) };
  };
  const D = E[2] * 3.5;
  const yeux = [-1, 1].map(s => decal(s * E[0], E[1], D, D, 0, 0, 256, 256, s < 0));
  const sourcils = [-1, 1].map(s => decal(s * E[0] * 1.04, M.sourcil, D * .9, D * .225, 256, 128, 256, 64, s < 0, 3));
  const bouche = decal(0, M.bouche[0], .11 * K, .055 * K, 256, 0, 256, 128, false), nez = decal(0, M.nez[1], .046 * K, .023 * K, 256, 192, 128, 64, false, 2);
  const joues = [-1, 1].map(s => decal(s * M.rose[0], M.rose[1], .05 * K, .025 * K, 384, 192, 128, 64, false, 2));
  const reste = mergeGeometries([bouche, nez, ...sourcils, ...joues].map(d => d.geo.clone().translate(d.c.x, d.c.y, d.c.z))); reste.userData.partage = true;
  const r = { yeux, reste }; GEOS.set(type, r); return r;
}

// ---- foule : disques en couleurs de sommets (rouge = iris, vert = sourcil), coordonnées de la tête ; yeux en points (Mii)
const LEG = new Map();
export function geoVisageLeger(type) {
  if (LEG.has(type)) return LEG.get(type);
  const M = mesuresTete(type), E = M.oeil, K = type === "femme" || type === "homme" ? .86 : 1, f = (x, y, z) => sdfTete(x, y, z, type), v = new THREE.Vector3();
  const P = [], N = [], C = [], I = [];
  const disque = (cx, cy, rx, ry, col, n = 8, dz = .002) => { const b = P.length / 3, z0 = devant(type, cx, cy) ?? 0; const ring = [[cx, cy]];
    for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; ring.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
    for (const [x, y] of ring) { const z = (devant(type, x, y) ?? z0) + dz; gradient(f, x, y, z, v); P.push(x, y, z); N.push(v.x, v.y, v.z); C.push(col[0], col[1], col[2]); }
    for (let k = 0; k < n; k++) I.push(b, b + 1 + k, b + 1 + (k + 1) % n); };
  for (const s of [-1, 1]) { const cx = s * E[0], cy = E[1];
    disque(cx, cy, .019 * K, .025 * K, [1, 1, 1], 8); disque(cx, cy - .003 * K, .015 * K, .02 * K, [1, 0, 0], 8, .003); disque(cx, cy - .003 * K, .008 * K, .011 * K, [.07, .04, .04], 6, .004);
    disque(cx - .005 * K, cy + .008 * K, .004 * K, .0045 * K, [1, 1, 1], 5, .005); disque(s * E[0] * 1.03, M.sourcil, .022 * K, .004, [0, 1, 0], 6, .003);
    disque(s * M.rose[0], M.rose[1], .016 * K, .009 * K, [1, .66, .7], 6, .002); }
  disque(0, M.bouche[0], .02 * K, .006 * K, [.5, .17, .17], 8, .002);
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(C, 3)); g.setIndex(I);
  g.userData.partage = true; LEG.set(type, g); return g;
}

export function construireVisage(g, os, type, o = {}, qualite = "plein") {
  const tete = os.tete, hair = o.hair ?? 0x5a3a22, iris = o.eyes ?? 0x6b4424, ad = type === "femme" || type === "homme";
  if (qualite === "leger") { const geoL = geoVisageLeger(type); g.userData.lids = []; return { animer() {}, geoLeger: geoL }; }
  const T = traitsVisage(o), G = geosVisage(type), m = matVisage(iris, hair, o.skin ?? 0xf1c6a0, !!o.long, ad, T);
  const yeux = G.yeux.map(d => { const e = new THREE.Mesh(d.geo, m); e.position.copy(d.c); e.renderOrder = 1; e.name = "oeil"; tete.add(e); return e; });
  const reste = new THREE.Mesh(G.reste, m); reste.renderOrder = 1; reste.name = "bouche"; tete.add(reste);
  g.userData.lids = yeux; g.userData.blink = 2 + Math.random() * 3; g.userData.traits = T;
  const S = { t: 2 + Math.random() * 3, k: 1 };
  return { yeux, reste, traits: T, animer(dt = 1 / 60) { // clignement : yeux écrasés une fraction de seconde, de temps en temps (double parfois)
    S.t -= dt; const ferme = S.t < .11 && S.t > 0, a = ferme ? .1 : 1; S.k += (a - S.k) * Math.min(1, dt * 30); for (const e of yeux) e.scale.y = S.k;
    if (S.t <= 0) S.t = Math.random() < .2 ? .25 : 2.5 + Math.random() * 3.5; } };
}
