// visage.js — le visage DESSINÉ des anciens personnages (grands yeux, cils des filles, sourcil, petit sourire, joues roses)
// posé en décalque sur la tête douce de tete.js (tête ≈ +10 %). Les yeux sont des décalques à part : ils clignent
// (échelle en y autour du centre de l'œil). Matériau : matDecalPeau (même lumière que la peau).
// construireVisage(g, os, type, o, qualite) → { animer(dt), geoLeger, yeux, reste } ; g.userData.lids = les 2 yeux.
// Foule : geoVisageLeger = quelques disques en couleurs de sommets (rouge = iris, vert = sourcil), posés dans le corps.
import * as THREE from "three";
import { devant, gradient, sdfTete, mesuresTete } from "./tete.js";
import { matDecalPeau } from "./materiaux.js";
import { mergeGeometries } from "../jeu.js";

// ---- l'atlas peint (copie de l'ancien jeu) : œil 256×256, bouche 256×128, joues 256×128
const ATLAS = new Map();
function atlasVisage(iris, sourcil, f) {
  const key = iris + "-" + sourcil + (f ? "f" : "g"); if (ATLAS.has(key)) return ATLAS.get(key);
  const c = document.createElement("canvas"); c.width = 512; c.height = 256; const x = c.getContext("2d"), col = (h, k, w = 0) => "#" + new THREE.Color(h).multiplyScalar(k).lerp(new THREE.Color(0xffffff), w).getHexString();
  const blanc = () => { x.beginPath(); x.moveTo(32, 142); x.bezierCurveTo(55, 84, 175, 70, 226, 118); x.bezierCurveTo(216, 196, 160, 230, 120, 228); x.bezierCurveTo(70, 226, 40, 192, 32, 142); x.closePath(); };
  blanc(); x.fillStyle = "#fbfbfd"; x.fill(); x.save(); blanc(); x.clip();
  const gi = x.createLinearGradient(0, 84, 0, 236); gi.addColorStop(0, col(iris, .3)); gi.addColorStop(.45, col(iris, 1)); gi.addColorStop(1, col(iris, 1.25, .45));
  x.fillStyle = gi; x.beginPath(); x.ellipse(126, 162, 60, 74, 0, 0, Math.PI * 2); x.fill(); x.lineWidth = 5; x.strokeStyle = col(iris, .35); x.stroke();
  x.fillStyle = col(iris, .18); x.beginPath(); x.ellipse(126, 170, 25, 36, 0, 0, Math.PI * 2); x.fill();
  const om = x.createLinearGradient(0, 70, 0, 140); om.addColorStop(0, "rgba(40,20,20,.45)"); om.addColorStop(1, "rgba(40,20,20,0)"); x.fillStyle = om; x.fillRect(0, 60, 256, 80);
  x.fillStyle = "rgba(255,255,255,.95)"; x.beginPath(); x.ellipse(100, 130, 21, 25, -.3, 0, Math.PI * 2); x.fill(); x.beginPath(); x.arc(158, 200, 9, 0, Math.PI * 2); x.fill(); x.restore();
  x.strokeStyle = "#2a1a16"; x.lineCap = "round"; x.lineWidth = 15; x.beginPath(); x.moveTo(26, 148); x.bezierCurveTo(52, 82, 178, 64, 232, 110); x.stroke();
  x.lineWidth = 9; x.beginPath(); x.moveTo(224, 106); x.lineTo(246, 90); x.stroke();
  if (f) { x.lineWidth = 6; for (const [a1, b1, a2, b2] of [[212, 96, 230, 72], [196, 88, 208, 64], [236, 112, 252, 104]]) { x.beginPath(); x.moveTo(a1, b1); x.lineTo(a2, b2); x.stroke(); } }
  x.lineWidth = 4; x.globalAlpha = .65; x.beginPath(); x.moveTo(150, 226); x.quadraticCurveTo(196, 214, 216, 186); x.stroke(); x.globalAlpha = 1;
  x.strokeStyle = col(sourcil, .7); x.lineWidth = f ? 7 : 10; x.beginPath(); x.moveTo(58, 44); x.quadraticCurveTo(130, 10, 206, 34); x.stroke();
  x.save(); x.translate(256, 0);
  x.fillStyle = "#8c3030"; x.beginPath(); x.moveTo(98, 48); x.quadraticCurveTo(128, 100, 158, 48); x.quadraticCurveTo(128, 60, 98, 48); x.fill();
  x.fillStyle = "#e9828a"; x.beginPath(); x.ellipse(128, 70, 13, 7, 0, 0, Math.PI * 2); x.fill();
  x.strokeStyle = "#6e2626"; x.lineWidth = 3; x.beginPath(); x.moveTo(94, 46); x.quadraticCurveTo(128, 58, 162, 46); x.stroke();
  x.translate(0, 128); const gb = x.createRadialGradient(128, 64, 4, 128, 64, 84); gb.addColorStop(0, "rgba(255,120,135,.5)"); gb.addColorStop(1, "rgba(255,120,135,0)");
  x.fillStyle = gb; x.fillRect(0, 0, 256, 128); x.strokeStyle = "rgba(235,90,105,.45)"; x.lineWidth = 4; for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(100 + i * 22, 78); x.lineTo(114 + i * 22, 50); x.stroke(); }
  x.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.userData = { partage: true }; ATLAS.set(key, t); return t;
}
const MATS = new Map();
function matVisage(iris, sourcil, f) {
  const key = iris + "-" + sourcil + f; if (MATS.has(key)) return MATS.get(key);
  const m = matDecalPeau(atlasVisage(iris, sourcil, f)); m.userData.partage = true; MATS.set(key, m); return m;
}

// ---- géométrie : petites grilles qui épousent la face (devant : profondeur de la peau en x, y), partagées par type
const GEOS = new Map();
function geosVisage(type) {
  if (GEOS.has(type)) return GEOS.get(type);
  const M = mesuresTete(type), E = M.oeil, ey = E[1], ex = type === "femme" || type === "homme" ? E[0] * 1.08 : E[0] * 1.1, nD = 6, K = type === "femme" || type === "homme" ? .82 : 1;
  const z = (x, y) => devant(type, x, y) ?? 0;
  const decal = (cx, cy, w, h, u0, v0, du, dv, mir) => {
    const pos = [], uv = [], idx = [], cz = z(cx, cy);
    for (let j = 0; j <= nD; j++) for (let i = 0; i <= nD; i++) { const a = i / nD, b = j / nD, X = cx + (a - .5) * w, Y = cy + (b - .5) * h; pos.push(X - cx, Y - cy, z(X, Y) + .0025 - cz); uv.push((u0 + (mir ? 1 - a : a) * du) / 512, 1 - (v0 + (1 - b) * dv) / 256); }
    for (let j = 0; j < nD; j++) for (let i = 0; i < nD; i++) { const p = j * (nD + 1) + i; idx.push(p, p + 1, p + nD + 2, p, p + nD + 2, p + nD + 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals(); geo.userData.partage = true;
    return { geo, c: new THREE.Vector3(cx, cy, cz) };
  };
  const yeux = [-1, 1].map(s => decal(s * ex, ey - .004, .112 * K, .112 * K, 0, 0, 256, 256, s < 0));
  const bouche = decal(0, M.bouche[0] + .004, .1 * K, .05 * K, 256, 0, 256, 128, false), joues = [-1, 1].map(s => decal(s * M.rose[0] * 1.08, M.rose[1] - .006, .062 * K, .031 * K, 256, 128, 256, 128, false));
  const reste = mergeGeometries([bouche, ...joues].map(d => d.geo.translate(d.c.x, d.c.y, d.c.z))); reste.userData.partage = true;
  const r = { yeux, reste }; GEOS.set(type, r); return r;
}

// ---- foule : disques en couleurs de sommets (rouge = iris, vert = sourcil), coordonnées de la tête
const LEG = new Map();
export function geoVisageLeger(type) {
  if (LEG.has(type)) return LEG.get(type);
  const M = mesuresTete(type), E = M.oeil, K = type === "femme" || type === "homme" ? .82 : 1, f = (x, y, z) => sdfTete(x, y, z, type), v = new THREE.Vector3();
  const P = [], N = [], C = [], I = [];
  const disque = (cx, cy, rx, ry, col, n = 8, dz = .002) => { const b = P.length / 3, z0 = devant(type, cx, cy) ?? 0; const ring = [[cx, cy]];
    for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; ring.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
    for (const [x, y] of ring) { const z = (devant(type, x, y) ?? z0) + dz; gradient(f, x, y, z, v); P.push(x, y, z); N.push(v.x, v.y, v.z); C.push(col[0], col[1], col[2]); }
    for (let k = 0; k < n; k++) I.push(b, b + 1 + k, b + 1 + (k + 1) % n); };
  for (const s of [-1, 1]) { const cx = s * E[0] * 1.1, cy = E[1] - .004;
    disque(cx, cy, .04 * K, .046 * K, [1, 1, 1], 10); disque(cx, cy - .006 * K, .027 * K, .035 * K, [1, 0, 0], 10, .0035); disque(cx, cy - .008 * K, .013 * K, .019 * K, [.07, .04, .04], 8, .0045);
    disque(cx - .01 * K, cy + .008 * K, .007 * K, .008 * K, [1, 1, 1], 6, .0055); disque(cx, cy + .047 * K, .03 * K, .0045, [0, 1, 0], 6, .0035);
    disque(s * M.rose[0] * 1.08, M.rose[1] - .006, .022 * K, .013 * K, [1, .62, .66], 8, .002); }
  disque(0, M.bouche[0] + .004, .018 * K, .008 * K, [.55, .17, .18], 8, .002);
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(C, 3)); g.setIndex(I);
  g.userData.partage = true; LEG.set(type, g); return g;
}

export function construireVisage(g, os, type, o = {}, qualite = "plein") {
  const tete = os.tete, hair = o.hair ?? 0x5a3a22, iris = o.eyes ?? 0x6b4424;
  if (qualite === "leger") { const geoL = geoVisageLeger(type); g.userData.lids = []; return { animer() {}, geoLeger: geoL }; }
  const G = geosVisage(type), m = matVisage(iris, hair, !!o.long), yeux = G.yeux.map(d => { const e = new THREE.Mesh(d.geo, m); e.position.copy(d.c); e.renderOrder = 1; e.name = "oeil"; tete.add(e); return e; });
  const reste = new THREE.Mesh(G.reste, m); reste.renderOrder = 1; reste.name = "bouche"; tete.add(reste);
  g.userData.lids = yeux; g.userData.blink = 2 + Math.random() * 3;
  const S = { t: 2 + Math.random() * 3, k: 1 };
  return { yeux, reste, animer(dt = 1 / 60) { // clignement : yeux écrasés une fraction de seconde, de temps en temps (double parfois)
    S.t -= dt; const ferme = S.t < .11 && S.t > 0, a = ferme ? .1 : 1; S.k += (a - S.k) * Math.min(1, dt * 30); for (const e of yeux) e.scale.y = S.k;
    if (S.t <= 0) S.t = Math.random() < .2 ? .25 : 2.5 + Math.random() * 3.5; } };
}
