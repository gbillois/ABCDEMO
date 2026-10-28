// visage.js — les yeux et le visage : vrais globes (iris peint, pupille, cornée brillante) logés dans les orbites de tete.js,
// paupières en peau qui clignent (cibles de morphing), cils, sourcils couleur des cheveux, lèvres et joues (décalque collé
// à la peau), petits mouvements des yeux. Foule (« leger ») : yeux peints, sans clignement, un seul petit maillage.
import * as THREE from "three";
import { sdfTeteFermee, sdfTeteLegere, mesuresTete, rayon, gradient, bords, masqueTete } from "./tete.js";
import { matPeau } from "./materiaux.js";

const PI = Math.PI, sst = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const ouv = type => mesuresTete(type).ouv;
// direction depuis le centre de l'œil (s = −1 : œil droit, la tempe est vers x < 0)
const dirOeil = (s, th, ph, v) => v.set(s * Math.sin(th) * Math.cos(ph), Math.sin(ph), Math.cos(th) * Math.cos(ph));

// ---------------- Globe de l'œil ----------------
// pôle avant = +z ; uv « azimutal » : l'iris prend le centre de la texture (rayon .3), le blanc le reste
const A_MAX = 2.05;
function uvRayon(a, ai) { const a1 = ai * 1.1; return a <= a1 ? .3 * a / ai : .33 + .17 * (a - a1) / (A_MAX - a1); }
function globe(r, ai, nS, anneaux) {
  const P = [], UV = [], I = [];
  P.push(0, 0, r * 1.09); UV.push(.5, .5);
  for (const a of anneaux) for (let i = 0; i < nS; i++) { const b = i / nS * 2 * PI, bomb = 1 + .09 * Math.max(0, 1 - (a / (ai * 1.12)) ** 2) ** 1.5; // cornée bombée
    P.push(r * bomb * Math.sin(a) * Math.cos(b), r * bomb * Math.sin(a) * Math.sin(b), r * bomb * Math.cos(a)); const q = uvRayon(a, ai); UV.push(.5 + q * Math.cos(b), .5 + q * Math.sin(b)); }
  for (let i = 0; i < nS; i++) I.push(0, 1 + i, 1 + (i + 1) % nS);
  for (let j = 0; j < anneaux.length - 1; j++) for (let i = 0; i < nS; i++) { const a = 1 + j * nS + i, b = 1 + j * nS + (i + 1) % nS, c = a + nS, d = b + nS; I.push(a, c, b, b, c, d); }
  return { P, UV, I };
}
// texture de l'iris (une par couleur) : fibres rayonnantes, collerette, anneau sombre au bord, pupille ; blanc légèrement chaud
const TEX_IRIS = new Map();
function texIris(col) {
  if (TEX_IRIS.has(col)) return TEX_IRIS.get(col);
  const W = 256, c = document.createElement("canvas"); c.width = c.height = W; const x = c.getContext("2d"), C = new THREE.Color(col), R = W * .3, cx = W / 2;
  const hex = (k, l = 0, m = null) => { const q = C.clone().multiplyScalar(k); if (m) q.lerp(new THREE.Color(m), l); return "#" + q.getHexString(); };
  let gr = x.createRadialGradient(cx, cx, R, cx, cx, W / 2); gr.addColorStop(0, "#f1efec"); gr.addColorStop(.5, "#ece4df"); gr.addColorStop(1, "#d9c4bf"); x.fillStyle = gr; x.fillRect(0, 0, W, W);
  // petits vaisseaux très discrets vers les coins
  x.strokeStyle = "rgba(190,90,90,.12)"; x.lineWidth = 1; let sd = col % 997 + 7; const rn = () => (sd = sd * 16807 % 2147483647) / 2147483647;
  for (let i = 0; i < 14; i++) { const a = rn() * 2 * PI, r0 = W * (.4 + rn() * .08); x.beginPath(); x.moveTo(cx + Math.cos(a) * r0, cx + Math.sin(a) * r0); x.quadraticCurveTo(cx + Math.cos(a + .1) * (r0 - 12), cx + Math.sin(a + .1) * (r0 - 12), cx + Math.cos(a + .05) * (R * 1.3), cx + Math.sin(a + .05) * (R * 1.3)); x.stroke(); }
  // iris : fond, plus sombre au bord, plus clair autour de la pupille
  gr = x.createRadialGradient(cx, cx, R * .2, cx, cx, R); gr.addColorStop(0, hex(1.25, .25, 0xc8a050)); gr.addColorStop(.45, hex(1.05)); gr.addColorStop(.85, hex(.8)); gr.addColorStop(1, hex(.5));
  x.fillStyle = gr; x.beginPath(); x.arc(cx, cx, R, 0, 2 * PI); x.fill();
  // fibres
  for (let i = 0; i < 160; i++) { const a = rn() * 2 * PI, k = .65 + rn() * .7; x.strokeStyle = hex(k, k > 1.1 ? .25 : 0, 0xffffff); x.globalAlpha = .35 + rn() * .35; x.lineWidth = .8 + rn() * 1.4;
    const r1 = R * (.36 + rn() * .1), r2 = R * (.75 + rn() * .23), da = (rn() - .5) * .12; x.beginPath(); x.moveTo(cx + Math.cos(a) * r1, cx + Math.sin(a) * r1); x.lineTo(cx + Math.cos(a + da) * r2, cx + Math.sin(a + da) * r2); x.stroke(); }
  // cryptes (petites taches sombres) et collerette
  x.globalAlpha = .35; x.fillStyle = hex(.45); for (let i = 0; i < 18; i++) { const a = rn() * 2 * PI, rr = R * (.5 + rn() * .35); x.beginPath(); x.ellipse(cx + Math.cos(a) * rr, cx + Math.sin(a) * rr, 1.5 + rn() * 2.5, 1 + rn() * 1.5, a, 0, 2 * PI); x.fill(); }
  x.globalAlpha = .5; x.strokeStyle = hex(1.35, .35, 0xd8b070); x.lineWidth = 2.2; x.beginPath();
  for (let i = 0; i <= 48; i++) { const a = i / 48 * 2 * PI, rr = R * (.48 + .04 * Math.sin(i * 7.3)); i ? x.lineTo(cx + Math.cos(a) * rr, cx + Math.sin(a) * rr) : x.moveTo(cx + Math.cos(a) * rr, cx + Math.sin(a) * rr); } x.stroke();
  x.globalAlpha = 1;
  // anneau limbique sombre, au bord doux
  gr = x.createRadialGradient(cx, cx, R * .86, cx, cx, R * 1.07); gr.addColorStop(0, "rgba(20,14,12,0)"); gr.addColorStop(.45, "rgba(20,14,12,.55)"); gr.addColorStop(.7, "rgba(20,14,12,.35)"); gr.addColorStop(1, "rgba(20,14,12,0)");
  x.fillStyle = gr; x.beginPath(); x.arc(cx, cx, R * 1.08, 0, 2 * PI); x.fill();
  // pupille (bord doux)
  gr = x.createRadialGradient(cx, cx, R * .3, cx, cx, R * .39); gr.addColorStop(0, "#060504"); gr.addColorStop(1, "rgba(6,5,4,0)"); x.fillStyle = gr; x.beginPath(); x.arc(cx, cx, R * .4, 0, 2 * PI); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.userData.partage = true;
  TEX_IRIS.set(col, t); return t;
}
const MAT_OEIL = new Map();
function matOeil(col) {
  if (MAT_OEIL.has(col)) return MAT_OEIL.get(col);
  const m = new THREE.MeshPhysicalMaterial({ map: texIris(col), roughness: .38, clearcoat: 1, clearcoatRoughness: .04, emissive: 0xffffff, emissiveMap: texIris(col), emissiveIntensity: .06 });
  m.userData.partage = true; MAT_OEIL.set(col, m); return m;
}

// ---------------- Paupières (peau) ----------------
// Anneau autour de l'ouverture : bord roulé contre le globe, puis la peau de sdfTeteFermee, qui finit sous la peau du corps.
// Positions pour k = 0 (ouvert), .5 et 1 (fermé) : deux cibles de morphing.
function patron(type, qualite) {
  const M = mesuresTete(type), O = ouv(type), E = M.oeil, r = M.r, t = M.t, f = (x, y, z) => sdfTeteFermee(x, y, z, type);
  const nH = qualite === "leger" ? 8 : 18, cols = [], v = new THREE.Vector3();
  // colonnes : bord du haut (coin intérieur → extérieur) puis bord du bas (extérieur → intérieur)
  for (let i = 0; i < 2 * nH; i++) { const haut = i < nH, u = haut ? i / nH : 1 - (i - nH) / nH, th = O.tm + (O.tl - O.tm) * (.5 - .5 * Math.cos(PI * u));
    const [up, lo, fe] = bords(O, th); cols.push({ th, ph: haut ? up : lo, phF: fe, haut, u }); }
  // normale vers l'extérieur de l'ouverture (dans le plan θ, φ)
  const n = cols.length;
  for (let i = 0; i < n; i++) { const a = cols[(i + n - 1) % n], b = cols[(i + 1) % n]; let dt = b.th - a.th, dp = b.ph - a.ph; const l = Math.hypot(dt, dp) || 1; cols[i].nt = dp / l; cols[i].np = -dt / l; }
  for (let i = 0; i < n; i++) { const c = cols[i]; if (c.haut ? c.np < 0 : c.np > 0) { c.nt = -c.nt; c.np = -c.np; } }
  // coins : la normale part de côté
  cols[0].nt = -1; cols[0].np = 0; cols[nH].nt = 1; cols[nH].np = 0;
  // étendue de chaque colonne : au-delà du creux du corps (0,15 rad après le bord), un peu plus aux coins
  for (const c of cols) c.S = .3 - .08 * Math.max(0, -c.nt) - .02 * Math.max(0, c.nt);
  const S0 = .12, SR = qualite === "leger" ? [0, .06, .14] : [0, .02, .05, .09, .14], SF = qualite === "leger" ? [.5, .9, 1] : [.25, .5, .72, .9, 1];
  return { M, O, E, r, t, f, cols, nH, S0, SR, SF };
}
// position d'un point de la paupière (colonne c, distance s au bord, état k) → Vector3 dans le repère de la tête (œil droit)
function pointPaupiere(T, c, s, k, out, n) {
  const { E, r, t, f, S0 } = T, w = s <= S0 ? 1 : Math.max(0, 1 - (s - S0) / (c.S - S0)) ** 1.6;
  const th = c.th + c.nt * s, ph = c.ph + c.np * s + w * k * (c.phF - c.ph);
  const d = dirOeil(-1, th, ph, new THREE.Vector3());
  const rf = rayon(f, -E[0], E[1], E[2], d.x, d.y, d.z, .004, .09, .0012) ?? .05;
  // bord roulé : de l'œil (r + 0,4 mm) jusqu'à la peau fermée, en quart de cercle
  const rr = Math.max(r + t, rf), roul = s < S0 ? r + .0004 + (rr - r - .0004) * Math.sqrt(1 - (1 - s / S0) ** 2) : rr + (s - S0) * .2;
  const del = .0004 - .0028 * sst(c.S * .92, c.S, s); // au dernier rang, la paupière plonge sous la peau du corps
  const sm = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * .25; };
  // rayon qui file dans la tête (coin intérieur, vers le nez) : la paupière passe sous la peau du corps
  const wf = sst(r + .017, r + .028, rf), rho = sm(rf * (1 - wf) + (T.M.creux - .002) * wf + del, roul, .0012);
  out.set(-E[0] + d.x * rho, E[1] + d.y * rho, E[2] + d.z * rho);
  if (n) { if (s >= S0) gradient(f, out.x, out.y, out.z, n); else n.set(0, 0, 0); }
  return out;
}
// Masque du visage (nez, philtrum, lèvres, menton) : grille dense posée sur sdfTeteFermee (rayons venant d'un peu dessous,
// pour voir le dessous du nez), lignes qui suivent le sourire ; au bord, elle plonge sous la peau du corps (simplifiée là).
const MASQUES = new Map();
function masque(type, qualite) {
  const cle = type + qualite; if (MASQUES.has(cle)) return MASQUES.get(cle);
  const M = mesuresTete(type), B = M.bouche, f = (x, y, z) => sdfTeteFermee(x, y, z, type), lo = qualite !== "plein";
  const nx = lo ? 16 : 32, xs = [...Array(nx + 1)].map((_, i) => { const t = i / nx * 2 - 1; return Math.sign(t) * .074 * Math.abs(t) ** 1.25; });
  const vs = lo ? [-.085, -.065, -.05, -.035, -.022, -.012, -.005, 0, .005, .012, .02, .03, .042, .056, .072, .09, .11, .13]
    : [-.088, -.075, -.062, -.051, -.042, -.034, -.027, -.021, -.016, -.012, -.009, -.0066, -.0045, -.0028, -.0014, 0, .0014, .0028, .0045, .0066, .009, .012, .015, .0185, .022, .026, .03, .035, .04, .045, .051, .058, .066, .075, .085, .094, .103, .112, .121, .13, .14];
  const D = new THREE.Vector3(0, .27, -1).normalize(), P = [], N = [], ok = [], g = new THREE.Vector3();
  const z0 = M.nezBout[2] + .03, zr = B[1] - .01; // départ des rayons : devant le bout du nez ; rangées calées à la profondeur de la bouche
  for (const v of vs) for (const x of xs) { const y = B[0] + v + B[2] * x * x * Math.exp(-((v / .022) ** 2)), oy = y - D.y / -D.z * (z0 - zr);
    const s = rayon(f, x, oy, z0, D.x, D.y, D.z, 0, .3, .0015); if (s === null) { P.push(0, 0, 0); N.push(0, 0, 1); ok.push(false); continue; }
    const px = x + D.x * s, py = oy + D.y * s, pz = z0 + D.z * s, dm = masqueTete(px, py, type); gradient(f, px, py, pz, g);
    const del = .0004 - .0044 * sst(.0055, .0115, dm); P.push(px + g.x * del, py + g.y * del, pz + g.z * del); N.push(g.x, g.y, g.z); ok.push(dm < .0135); }
  const I = [], w = nx + 1, nv = vs.length; for (let j = 0; j < nv - 1; j++) for (let i = 0; i < nx; i++) { const a = j * w + i, b = a + 1, c = a + w, d = c + 1; if (ok[a] && ok[b] && ok[c] && ok[d]) I.push(a, b, d, a, d, c); }
  // tout sommet au bord de la grille gardée plonge sous la peau (même si la grille s'arrête avant la zone de plongée)
  const bord = q => { const i = q % w, j = (q - i) / w; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii > nx || jj >= nv || !ok[jj * w + ii]) return true; } return false; };
  for (let q = 0; q < ok.length; q++) if (ok[q] && bord(q)) { P[q * 3] -= N[q * 3] * .004; P[q * 3 + 1] -= N[q * 3 + 1] * .004; P[q * 3 + 2] -= N[q * 3 + 2] * .004; }
  // sens : la grille est vue depuis l'avant (x croît vers la gauche du personnage, v vers le haut) → triangles directs
  const r = { P, N, I, ok, nx, nv: vs.length }; MASQUES.set(cle, r); return r;
}
const PAUPIERES = new Map();
function geoPaupieres(type, qualite) {
  const key = type + qualite; if (PAUPIERES.has(key)) return PAUPIERES.get(key);
  const T = patron(type, qualite), { cols } = T, nc = cols.length, nr = T.SR.length + T.SF.length;
  const s1 = T.SR[T.SR.length - 1], sOf = (c, j) => j < T.SR.length ? T.SR[j] : s1 + (c.S - s1) * T.SF[j - T.SR.length];
  const etats = [0, .5, 1].map(k => { const P = new Float32Array(nc * nr * 6), Ng = new Float32Array(nc * nr * 6), p = new THREE.Vector3(), g = new THREE.Vector3();
    for (let j = 0; j < nr; j++) for (let i = 0; i < nc; i++) { const c = cols[i]; pointPaupiere(T, c, sOf(c, j), k, p, g); const q = (j * nc + i) * 3; P[q] = p.x; P[q + 1] = p.y; P[q + 2] = p.z; Ng[q] = g.x; Ng[q + 1] = g.y; Ng[q + 2] = g.z; }
    return { P, Ng }; });
  // indices (anneau fermé), puis l'œil gauche en miroir
  const n = nc * nr, I = [];
  for (let j = 0; j < nr - 1; j++) for (let i = 0; i < nc; i++) { const a = j * nc + i, b = j * nc + (i + 1) % nc, c = a + nc, d = b + nc; I.push(a, c, b, b, c, d); }
  const nI = I.length, idx = new Uint16Array(nI * 2); for (let q = 0; q < nI; q += 3) { idx[q] = I[q]; idx[q + 1] = I[q + 1]; idx[q + 2] = I[q + 2]; idx[nI + q] = I[q] + n; idx[nI + q + 1] = I[q + 2] + n; idx[nI + q + 2] = I[q + 1] + n; }
  const uv = new Float32Array(n * 4); for (let j = 0; j < nr; j++) for (let i = 0; i < nc; i++) { const q = j * nc + i; uv[q * 2] = uv[(n + q) * 2] = i / nc; uv[q * 2 + 1] = uv[(n + q) * 2 + 1] = j / (nr - 1); }
  const geos = etats.map(({ P, Ng }) => { for (let q = 0; q < n; q++) { P[(n + q) * 3] = -P[q * 3]; P[(n + q) * 3 + 1] = P[q * 3 + 1]; P[(n + q) * 3 + 2] = P[q * 3 + 2]; Ng[(n + q) * 3] = -Ng[q * 3]; Ng[(n + q) * 3 + 1] = Ng[q * 3 + 1]; Ng[(n + q) * 3 + 2] = Ng[q * 3 + 2]; }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(P, 3)); g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeVertexNormals();
    // au bord extérieur : normales du champ (comme la peau du corps) pour ne pas voir de raccord
    const N = g.attributes.normal; for (let q = 0; q < 2 * n; q++) { const gx = Ng[q * 3], gy = Ng[q * 3 + 1], gz = Ng[q * 3 + 2]; if (gx || gy || gz) { const j = Math.floor((q % n) / nc), w = sst(T.SR.length - 2, T.SR.length, j);
      const x = N.getX(q) * (1 - w) + gx * w, y = N.getY(q) * (1 - w) + gy * w, z = N.getZ(q) * (1 - w) + gz * w, l = Math.hypot(x, y, z); N.setXYZ(q, x / l, y / l, z / l); } }
    return g; });
  // + le masque du nez et de la bouche (immobile) : une seule géométrie, un seul dessin
  const MQ = qualite === "leger" ? { P: [], N: [], I: [] } : masque(type, qualite), nm = MQ.P.length / 3, nt = 2 * n + nm;
  const cat = (A, B) => { const o = new Float32Array(nt * 3); o.set(A); if (B) o.set(B, 2 * n * 3); return o; };
  const geo = new THREE.BufferGeometry(), P0 = geos[0].attributes.position.array, N0 = geos[0].attributes.normal.array;
  geo.setAttribute("position", new THREE.BufferAttribute(cat(P0, MQ.P), 3)); geo.setAttribute("normal", new THREE.BufferAttribute(cat(N0, MQ.N), 3));
  const uv2 = new Float32Array(nt * 2); uv2.set(uv); geo.setAttribute("uv", new THREE.BufferAttribute(uv2, 2));
  const idx2 = new (nt > 65535 ? Uint32Array : Uint16Array)(idx.length + MQ.I.length); idx2.set(idx); MQ.I.forEach((q, k) => idx2[idx.length + k] = q + 2 * n); geo.setIndex(new THREE.BufferAttribute(idx2, 1));
  geo.morphAttributes.position = [1, 2].map(e => { const a = cat(geos[e].attributes.position.array); for (let q = 0; q < 2 * n * 3; q++) a[q] -= P0[q]; return new THREE.BufferAttribute(a, 3); });
  geo.morphAttributes.normal = [1, 2].map(e => { const a = cat(geos[e].attributes.normal.array); for (let q = 0; q < 2 * n * 3; q++) a[q] -= N0[q]; return new THREE.BufferAttribute(a, 3); });
  geo.morphTargetsRelative = true; geo.userData.partage = true;
  const res = { geo, T }; PAUPIERES.set(key, res); return res;
}

// ---------------- Décalque : sourcils, cils, ombre des paupières, lèvres, joues ----------------
// Atlas 1024 × 512 : lèvres [0,512)×[0,256) ; sourcil [512,1024)×[0,256) ; joue [0,256)×[256,512) ;
// trait de cils [256,512)×[256,384) ; cils [256,512)×[384,512) ; ombre de paupière [512,768)×[256,512) ;
// caroncule [768,1024)×[256,384) ; cils du bas [768,1024)×[384,512)
const ZONES = { levres: [0, 0, 512, 256], sourcil: [512, 0, 512, 256], joue: [0, 256, 256, 256], trait: [256, 256, 256, 128], cils: [256, 384, 256, 128], ombre: [512, 256, 256, 256], caroncule: [768, 256, 256, 128], bas: [768, 384, 256, 128] };
const zuv = (z, a, b) => { const [x0, y0, w, h] = ZONES[z]; return [(x0 + 6 + a * (w - 12)) / 1024, 1 - (y0 + 6 + b * (h - 12)) / 512]; }; // marge : pas de bavure entre zones
// zone des lèvres dans le repère de la tête (avant) : x dans [−LX, LX], y dans [yb − LY, yb + LY]
const LX = .040, LY = .024;
const TEX_DETAIL = new Map();
function texDetail(type, cheveux, peau) {
  const key = type + "-" + cheveux + "-" + peau; if (TEX_DETAIL.has(key)) return TEX_DETAIL.get(key);
  const c = document.createElement("canvas"); c.width = 1024; c.height = 512; const x = c.getContext("2d"), M = mesuresTete(type), B = M.bouche, adulte = type === "femme" || type === "homme";
  const P = new THREE.Color(peau), H = new THREE.Color(cheveux), css = (q, a) => `rgba(${Math.round(q.r * 255)},${Math.round(q.g * 255)},${Math.round(q.b * 255)},${a})`;
  // lèvres : vermillon d'après la peau (plus rose et plus sombre), dessiné pixel par pixel d'après les ellipsoïdes des lèvres
  { const [X0, Y0, W, Hh] = ZONES.levres, img = x.createImageData(W, Hh), lum = P.r * .3 + P.g * .59 + P.b * .11;
    const L = P.clone().multiply(new THREE.Color(.9, .62, .62)).lerp(new THREE.Color(.72, .32, .34), .15 + .15 * lum), Ld = L.clone().multiplyScalar(.5);
    const inside = (e, xx, yb) => ((xx - e[0]) / e[3]) ** 2 + ((yb - e[1]) / e[4]) ** 2;
    for (let j = 0; j < Hh; j++) for (let i = 0; i < W; i++) { const xx = (i / W * 2 - 1) * LX, yy = B[0] + (1 - j / Hh * 2) * LY, yb = yy - B[2] * xx * xx;
      const qh = inside(M.levreH, xx, yb + .0012), qb = inside(M.levreB, xx, yb - .001), q = Math.min(qh, qb), a = sst(1.25, .75, q) * sst(B[4] + .004, B[4] - .006, Math.abs(xx));
      const fente = Math.exp(-(((yb - B[0]) / .0009) ** 2)) * sst(B[4] + .003, B[4] - .008, Math.abs(xx)), coin = Math.exp(-(((Math.abs(xx) - B[4] + .001) / .0035) ** 2 + ((yb - B[0]) / .0025) ** 2));
      let col = L.clone().lerp(new THREE.Color(1, .85, .85), .12 * Math.max(0, 1 - Math.abs(yb - (M.levreB[1] + .002)) / .004) * (qb < 1 ? 1 : 0)), al = a * (adulte ? .38 : .45);
      col.lerp(Ld, Math.min(1, fente * .95 + coin * .5)); al = Math.max(al, fente * .85, coin * .5);
      const o = (j * W + i) * 4; img.data[o] = col.r * 255; img.data[o + 1] = col.g * 255; img.data[o + 2] = col.b * 255; img.data[o + 3] = al * 255; }
    x.putImageData(img, X0, Y0); }
  // sourcil (droit, du nez vers la tempe = gauche → droite) : traits fins, plus denses à la tête du sourcil
  { const [X0, Y0, W, Hh] = ZONES.sourcil, Hc = H.clone().multiplyScalar(.9).lerp(P, adulte ? .06 : .18);
    let sd = 31; const rn = () => (sd = sd * 16807 % 2147483647) / 2147483647, ep = type === "homme" ? 1.1 : type === "femme" ? .7 : .72;
    const arc = u => Hh * (.52 - .05 * u), haut = u => Hh * .2 * ep * (1 - u * .55) * Math.sin(PI * Math.min(1, .08 + u * .95)) ** .4;
    x.lineCap = "round";
    for (let i = 0; i < 700; i++) { const u = rn() ** .9, y0 = arc(u) + (rn() - .5) * 2 * haut(u) * (1 - .4 * rn()), l = 9 + rn() * 14, a = u < .25 ? -1.1 + rn() * .4 : -.25 - rn() * .25;
      x.strokeStyle = css(Hc.clone().multiplyScalar(.75 + rn() * .45), (.22 + rn() * .34) * (u > .9 ? (1 - u) * 10 : 1) * (adulte ? 1.1 : .9)); x.lineWidth = 1.2 + rn() * 1.6;
      const px = X0 + 20 + u * (W - 60); x.beginPath(); x.moveTo(px, Y0 + y0); x.lineTo(px + Math.cos(a) * l, Y0 + y0 + Math.sin(a) * l * .5); x.stroke(); } }
  // joue : rose doux
  { const [X0, Y0, W] = ZONES.joue, g = x.createRadialGradient(X0 + W / 2, Y0 + W / 2, 0, X0 + W / 2, Y0 + W / 2, W / 2), Rc = P.clone().lerp(new THREE.Color(.95, .42, .42), .5);
    g.addColorStop(0, css(Rc, adulte ? .14 : .2)); g.addColorStop(1, css(Rc, 0)); x.fillStyle = g; x.fillRect(X0, Y0, W, W); }
  // trait de cils (haut) : sombre au bord, se fond vers le haut
  { const [X0, Y0, W, Hh] = ZONES.trait, g = x.createLinearGradient(0, Y0, 0, Y0 + Hh); g.addColorStop(0, "rgba(28,18,16,.95)"); g.addColorStop(.45, "rgba(30,20,18,.6)"); g.addColorStop(1, "rgba(30,20,18,0)"); x.fillStyle = g; x.fillRect(X0, Y0, W, Hh); }
  // cils : brins courbes, plus longs au milieu
  { const [X0, Y0, W, Hh] = ZONES.cils; let sd = 77; const rn = () => (sd = sd * 16807 % 2147483647) / 2147483647; x.lineCap = "round";
    for (let i = 0; i < 70; i++) { const u = (i + rn() * .8) / 70, L = Hh * (.55 + .45 * Math.sin(PI * u)) * (.7 + rn() * .3), px = X0 + u * W;
      x.strokeStyle = `rgba(34,22,18,${.45 + rn() * .35})`; x.lineWidth = .9 + rn() * .9; x.beginPath(); x.moveTo(px, Y0 + 1); x.quadraticCurveTo(px + (u - .5) * 10, Y0 + L * .6, px + (u - .5) * 26 + 6, Y0 + L); x.stroke(); } }
  // ombre de la paupière sur le globe
  { const [X0, Y0, W, Hh] = ZONES.ombre, g = x.createLinearGradient(0, Y0, 0, Y0 + Hh); g.addColorStop(0, "rgba(40,22,18,.6)"); g.addColorStop(.35, "rgba(40,22,18,.25)"); g.addColorStop(1, "rgba(40,22,18,0)"); x.fillStyle = g; x.fillRect(X0, Y0, W, Hh); }
  // caroncule (coin intérieur rose)
  { const [X0, Y0, W, Hh] = ZONES.caroncule, g = x.createRadialGradient(X0 + W * .25, Y0 + Hh / 2, 0, X0 + W * .25, Y0 + Hh / 2, W * .5), Rc = P.clone().lerp(new THREE.Color(.85, .45, .45), .6);
    g.addColorStop(0, css(Rc, .85)); g.addColorStop(1, css(Rc, 0)); x.fillStyle = g; x.fillRect(X0, Y0, W, Hh); }
  // cils du bas : trait léger
  { const [X0, Y0, W, Hh] = ZONES.bas, g = x.createLinearGradient(0, Y0, 0, Y0 + Hh); g.addColorStop(0, "rgba(40,26,22,.55)"); g.addColorStop(1, "rgba(40,26,22,0)"); x.fillStyle = g; x.fillRect(X0, Y0, W, Hh); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.userData.partage = true;
  TEX_DETAIL.set(key, t); return t;
}
const MAT_DETAIL = new Map();
function matDetail(type, cheveux, peau) {
  const key = type + "-" + cheveux + "-" + peau; if (MAT_DETAIL.has(key)) return MAT_DETAIL.get(key);
  const m = new THREE.MeshStandardMaterial({ map: texDetail(type, cheveux, peau), transparent: true, depthWrite: false, roughness: .5, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
  m.userData.partage = true; MAT_DETAIL.set(key, m); return m;
}
// géométrie du décalque (partagée par type) : bandes collées à la peau (projection depuis l'avant) + bandes qui suivent les paupières
const DETAIL = new Map();
function geoDetail(type, qualite) {
  const key = type + qualite; if (DETAIL.has(key)) return DETAIL.get(key);
  const M = mesuresTete(type), E = M.oeil, f = (x, y, z) => sdfTeteFermee(x, y, z, type), { T } = geoPaupieres(type, qualite);
  const P = [[], [], []], UV = [], I = [], g = new THREE.Vector3(), p = new THREE.Vector3();
  // grille posée sur la peau, vue de face : pos(a, b) → [x, y] ; uv(a, b) → [u, v] ; même position pour les 3 états
  const plaque = (na, nb, pos, uv, dec = .0007) => { const o = P[0].length / 3;
    const ok = [];
    for (let j = 0; j <= nb; j++) for (let i = 0; i <= na; i++) { const [X, Y] = pos(i / na, j / nb), s = rayon(f, X, Y, .3, 0, 0, -1, 0, .3, .002), Z = s === null ? 0 : .3 - s;
      gradient(f, X, Y, Z, g); ok.push(s !== null && g.z > .25); for (const A of P) A.push(X + g.x * dec, Y + g.y * dec, Z + g.z * dec); UV.push(...uv(i / na, j / nb)); }
    for (let j = 0; j < nb; j++) for (let i = 0; i < na; i++) { const a = j * (na + 1) + i, b = a + 1, c = a + na + 1, d = c + 1; if (ok[a] && ok[b] && ok[c] && ok[d]) I.push(o + a, o + b, o + d, o + a, o + d, o + c); } };
  // bande qui suit un bord de paupière : colonnes du bord (haut ou bas), s de s0 à s1 (ou un point libre)
  const bande = (haut, rows, uvz, rayonFixe) => { const o = P[0].length / 3, cs = T.cols.filter(c => c.haut === haut || c === T.cols[0] || c === T.cols[T.nH]);
    cs.sort((a, b) => a.th - b.th); const nc = cs.length;
    rows.forEach((row, j) => cs.forEach((c, i) => { for (let e = 0; e < 3; e++) { const k = e * .5;
      if (rayonFixe) { const w = 1, th = c.th + c.nt * row, ph = c.ph + c.np * row + k * (c.phF - c.ph); dirOeil(-1, th, ph, g); const rr = M.r + rayonFixe; p.set(-E[0] + g.x * rr, E[1] + g.y * rr, E[2] + g.z * rr); }
      else if (typeof row === "function") row(c, k, p);
      else { pointPaupiere(T, c, row, k, p); dirOeil(-1, c.th + c.nt * row, c.ph + c.np * row, g); p.addScaledVector(g, .00035); }
      P[e].push(p.x, p.y, p.z); } UV.push(...uvz(i / (nc - 1), j / (rows.length - 1))); }));
    for (let j = 0; j < rows.length - 1; j++) for (let i = 0; i < nc - 1; i++) { const a = o + j * nc + i, b = a + 1, c = a + nc, d = c + 1; I.push(a, b, d, a, d, c); } };
  const Ey = E[1], Ex = E[0];
  // œil droit (x < 0) puis miroir pour le gauche
  const debutDroit = P[0].length / 3, debutI = I.length;
  // sourcil : de l'intérieur (près du nez) vers la tempe
  plaque(10, 3, (a, b) => [-(Ex - M.r * 1.05 + a * M.r * 3.0), Ey + M.r * (1.35 + .55 * Math.sin(PI * Math.min(1, a * 1.15) ** .8) - .25 * a) + (b - .5) * M.r * 1.25], (a, b) => zuv("sourcil", .04 + a * .92, .15 + (1 - b) * .7));
  // joue
  plaque(8, 7, (a, b) => [-(M.joue[0] + .006 + (a - .5) * .05), M.joue[1] + .006 + (b - .5) * .04], (a, b) => zuv("joue", a, 1 - b), .0009);
  // trait de cils du haut (sur le bord de la paupière), cils (carte qui sort du bord), cils du bas, ombre sur le globe, caroncule
  bande(true, [.035, .07, .13], (a, b) => zuv("trait", a, b));
  bande(true, [(c, k, out) => { pointPaupiere(T, c, .06, k, out); }, (c, k, out) => { const b = pointPaupiere(T, c, .06, k, new THREE.Vector3()); dirOeil(-1, c.th + c.nt * .1, c.ph + c.np * .1 + k * (c.phF - c.ph), g);
    const L = M.r * .27 * Math.max(0, Math.sin(PI * (c.th - T.O.tm) / (T.O.tl - T.O.tm))) ** .6 * (1 - .5 * k); out.copy(b).addScaledVector(g, L * .5).add(new THREE.Vector3(0, L * .35 * (1 - k), L * .75 * (1 - k))); }], (a, b) => zuv("cils", .03 + a * .94, b));
  bande(false, [.0, .04, .11], (a, b) => zuv("bas", a, b * .9));
  bande(true, [0, -.1, -.35], (a, b) => zuv("ombre", .5, b * .95), .00035);
  // caroncule : petite plaque au coin intérieur, sur le globe
  { const o = P[0].length / 3; for (let j = 0; j <= 2; j++) for (let i = 0; i <= 2; i++) { const th = T.O.tm + .02 + i * .13, ph = T.O.pm + (j - 1) * .12; dirOeil(-1, th, ph, g); const rr = M.r + .0004;
      for (const A of P) A.push(-E[0] + g.x * rr, E[1] + g.y * rr, E[2] + g.z * rr); UV.push(...zuv("caroncule", i / 2, j / 2)); }
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { const a = o + j * 3 + i; I.push(a, a + 1, a + 4, a, a + 4, a + 3); } }
  // miroir : œil gauche
  const finDroit = P[0].length / 3, finI = I.length;
  for (let q = debutDroit; q < finDroit; q++) { for (const A of P) A.push(-A[q * 3], A[q * 3 + 1], A[q * 3 + 2]); UV.push(UV[q * 2], UV[q * 2 + 1]); }
  for (let q = debutI; q < finI; q += 3) I.push(I[q] + finDroit - debutDroit, I[q + 2] + finDroit - debutDroit, I[q + 1] + finDroit - debutDroit);
  // lèvres (au milieu, une seule plaque)
  // lèvres : sur la grille même du masque (mêmes sommets, un peu au-dessus), pour coller exactement à la peau
  const B = M.bouche, MQ = masque(type, qualite), w = MQ.nx + 1, o0 = P[0].length / 3, dans = q => MQ.ok[q] && Math.abs(MQ.P[q * 3]) <= LX && Math.abs(MQ.P[q * 3 + 1] - B[0]) <= LY, nouv = new Map();
  const som = q => { if (nouv.has(q)) return nouv.get(q); const k = P[0].length / 3, x = MQ.P[q * 3], y = MQ.P[q * 3 + 1];
    for (const A of P) A.push(x + MQ.N[q * 3] * .00035, y + MQ.N[q * 3 + 1] * .00035, MQ.P[q * 3 + 2] + MQ.N[q * 3 + 2] * .00035); UV.push(...zuv("levres", (x / LX + 1) / 2, 1 - ((y - B[0]) / LY + 1) / 2)); nouv.set(q, k); return k; };
  for (let j = 0; j < MQ.nv - 1; j++) for (let i = 0; i < MQ.nx; i++) { const a = j * w + i, b = a + 1, c = a + w, d = c + 1; if (dans(a) && dans(b) && dans(c) && dans(d)) I.push(som(a), som(b), som(d), som(a), som(d), som(c)); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(P[0], 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(UV, 2)); geo.setIndex(I);
  geo.computeVertexNormals();
  geo.morphAttributes.position = [1, 2].map(e => new THREE.Float32BufferAttribute(P[e].map((v, q) => v - P[0][q]), 3)); geo.morphTargetsRelative = true; geo.userData.partage = true;
  DETAIL.set(key, geo); return geo;
}

// ---------------- Foule : yeux peints (couleurs par sommet) ----------------
const LEGER = new Map(), MAT_LEGER = (() => { let m; return () => { if (!m) { m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }); m.userData.partage = true; } return m; }; })();
export function geoVisageLeger(type, yeux, cheveux) {
  // chaque pièce a sa couleur exacte sur tous ses sommets (le corps léger peut remplacer les couleurs codées : iris, sourcils)
  const key = type + "-" + yeux + "-" + cheveux; if (LEGER.has(key)) return LEGER.get(key);
  const M = mesuresTete(type), E = M.oeil, O = ouv(type), B = M.bouche, f = (x, y, z) => sdfTeteLegere(x, y, z, type), P = [], C = [], I = [], g = new THREE.Vector3(), v = new THREE.Vector3();
  const blanc = new THREE.Color(0xd9d3cc), iris = new THREE.Color(yeux), pup = new THREE.Color(0x0a0706), cil = new THREE.Color(0x2a1a15), sour = new THREE.Color(cheveux), bouche = new THREE.Color(0x7a3e3a);
  const pose = (X, Y, col, dec) => { const s = rayon(f, X, Y, .3, 0, 0, -1, 0, .3, .002), Z = s === null ? 0 : .3 - s; gradient(f, X, Y, Z, g); P.push(X + g.x * dec, Y + g.y * dec, Z + g.z * dec); C.push(col.r, col.g, col.b); return P.length / 3 - 1; };
  const eventail = (cx, cy, pts, col, dec) => { const c = pose(cx, cy, col, dec), b = pts.map(([X, Y]) => pose(X, Y, col, dec)); for (let i = 0; i < b.length; i++) I.push(c, b[i], b[(i + 1) % b.length]); };
  const bande = (pts, ep, col, dec) => { const o = P.length / 3; for (const [X, Y] of pts) { pose(X, Y + ep / 2, col, dec); pose(X, Y - ep / 2, col, dec); } for (let i = 0; i < pts.length - 1; i++) { const a = o + i * 2; I.push(a, a + 1, a + 3, a, a + 3, a + 2); } };
  for (const sx of [-1, 1]) {
    const ex = sx * E[0], bordH = [], bordB = [];
    for (let i = 0; i <= 8; i++) { const th = O.tm + (O.tl - O.tm) * i / 8, [up, lo] = bords(O, th); dirOeil(sx < 0 ? -1 : 1, th, up, v); bordH.push([ex + v.x * M.r, E[1] + v.y * M.r]); dirOeil(sx < 0 ? -1 : 1, th, lo, v); bordB.push([ex + v.x * M.r, E[1] + v.y * M.r]); }
    eventail(ex, E[1] - .001, [...bordH, ...bordB.slice(1, -1).reverse()], blanc, .0008);              // blanc en amande
    const cercle = (r, k) => [...Array(k)].map((_, i) => { const a = i / k * 2 * PI; return [ex + Math.cos(a) * r, E[1] - .001 + Math.sin(a) * r * (Math.sin(a) > 0 ? .82 : 1)]; });
    eventail(ex, E[1] - .001, cercle(M.r * .47, 10), iris, .0011);                                       // iris
    eventail(ex, E[1] - .001, cercle(M.r * .2, 6), pup, .0013);                                          // pupille
    bande(bordH, M.r * .16, cil, .0015);                                                                   // trait de cils
    bande([...Array(6)].map((_, i) => { const a = i / 5; return [sx * (E[0] - M.r * 1.0 + a * M.r * 2.8), E[1] + M.r * (1.45 + .5 * Math.sin(PI * a) - .2 * a)]; }), M.r * .42, sour, .0011); // sourcil
  }
  bande([...Array(7)].map((_, i) => { const x = (i / 6 * 2 - 1) * B[4] * .92; return [x, B[0] + B[2] * x * x + .0004]; }), .0022, bouche, .001); // sourire
  // sens des triangles : vers l'avant
  for (let t = 0; t < I.length; t += 3) { const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3, nz = (P[b] - P[a]) * (P[c + 1] - P[a + 1]) - (P[b + 1] - P[a + 1]) * (P[c] - P[a]); if (nz < 0) { const q = I[t + 1]; I[t + 1] = I[t + 2]; I[t + 2] = q; } }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute("color", new THREE.Float32BufferAttribute(C, 3)); geo.setIndex(I); geo.computeVertexNormals();
  geo.userData.partage = true; LEGER.set(key, geo); return geo;
}

// ---------------- Assemblage ----------------
const YEUX_GEO = new Map(), INV = new Map();
function geoYeux(type, qualite) {
  const key = type + qualite; if (YEUX_GEO.has(key)) return YEUX_GEO.get(key);
  const M = mesuresTete(type), O = ouv(type), E = M.oeil, lo = qualite !== "plein";
  const an = lo ? [.2, .4, O.iris * .8, O.iris, O.iris * 1.2, .85, 1.25, 1.7, A_MAX] : [.12, .24, .36, O.iris * .82, O.iris * .95, O.iris * 1.05, O.iris * 1.2, .8, 1.0, 1.25, 1.55, 1.8, A_MAX];
  const { P, UV, I } = globe(M.r, O.iris, lo ? 16 : 26, an), n = P.length / 3;
  const pos = new Float32Array(n * 6), uv = new Float32Array(n * 4), si = new Uint16Array(n * 8), sw = new Float32Array(n * 8), idx = [];
  for (let e = 0; e < 2; e++) { const sx = e ? 1 : -1; for (let q = 0; q < n; q++) { const o = e * n + q; pos[o * 3] = sx * E[0] + P[q * 3]; pos[o * 3 + 1] = E[1] + P[q * 3 + 1]; pos[o * 3 + 2] = E[2] + P[q * 3 + 2];
    uv[o * 2] = e ? 1 - UV[q * 2] : UV[q * 2]; uv[o * 2 + 1] = UV[q * 2 + 1]; si[o * 4] = e; sw[o * 4] = 1; } for (const q of I) idx.push(q + e * n); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geo.setAttribute("skinIndex", new THREE.BufferAttribute(si, 4)); geo.setAttribute("skinWeight", new THREE.BufferAttribute(sw, 4)); geo.setIndex(idx); geo.computeVertexNormals();
  geo.userData.partage = true; YEUX_GEO.set(key, geo); return geo;
}
// construireVisage(g, os, type, o, qualite) → contrôleur { animer(dt), regard(lacet, tangage), regarder(v | null), fermer(k | null) }
export function construireVisage(g, os, type, o = {}, qualite = "plein") {
  const tete = os.tete, M = mesuresTete(type), E = M.oeil, peau = g.userData.mats?.peau || matPeau(o.skin ?? 0xf1c6a0), cheveux = o.hair ?? 0x5a3a22, yeuxC = o.eyes ?? 0x6b4424;
  if (qualite === "leger") { // la foule : yeux peints, rien ne bouge
    const geoL = geoVisageLeger(type, yeuxC, cheveux); let m = null;
    if (!o.visageDansLeCorps) { m = new THREE.Mesh(geoL, MAT_LEGER()); m.name = "visage"; tete.add(m); }
    g.userData.lids = []; return { animer() {}, geoLeger: geoL, maillages: m ? [m] : [] };
  }
  // yeux : un maillage, deux petits os (un par œil) enfants de la tête
  const od = new THREE.Bone(), og = new THREE.Bone(); od.name = "oeil_d"; og.name = "oeil_g"; od.position.set(-E[0], E[1], E[2]); og.position.set(E[0], E[1], E[2]); tete.add(od, og);
  let inv = INV.get(type); if (!inv) { inv = [new THREE.Matrix4().makeTranslation(E[0], -E[1], -E[2]), new THREE.Matrix4().makeTranslation(-E[0], -E[1], -E[2])]; INV.set(type, inv); }
  const yeux = new THREE.SkinnedMesh(geoYeux(type, qualite), matOeil(yeuxC)); yeux.name = "yeux"; tete.add(yeux); yeux.bind(new THREE.Skeleton([od, og], inv), new THREE.Matrix4()); yeux.frustumCulled = false;
  // paupières (peau) et décalque
  const { geo: gp } = geoPaupieres(type, qualite), pau = new THREE.Mesh(gp, peau); pau.name = "paupieres"; pau.receiveShadow = true; tete.add(pau); pau.updateMorphTargets();
  const det = new THREE.Mesh(geoDetail(type, qualite), matDetail(type, cheveux, o.skin ?? 0xf1c6a0)); det.name = "details"; det.renderOrder = 2; tete.add(det); det.updateMorphTargets();
  g.userData.lids = [pau, det]; g.userData.blink = 2 + Math.random() * 3;
  // état : clignement, saccades
  const S = { t: 0, prochain: 1 + Math.random() * 3, double: false, cl: -1, lacet: 0, tangage: 0, cibleL: 0, cibleT: 0, sacc: .5 + Math.random(), force: null, fixe: null, cible: null };
  const v = new THREE.Vector3(), q = new THREE.Quaternion(), m4 = new THREE.Matrix4();
  const courbe = x => x < .07 ? sst(0, .07, x) : x < .11 ? 1 : 1 - sst(.11, .26, x); // fermeture rapide, ouverture plus lente
  const ctl = {
    yeux, paupieres: pau, details: det, os: [od, og],
    regard(l, t) { S.fixe = l === null || l === undefined ? null : [l, t]; },          // lacet (> 0 vers sa gauche), tangage (> 0 vers le bas), en radians
    regarder(p) { S.cible = p ? p.clone() : null; },                                      // un point du monde (ou null)
    fermer(k) { S.force = k === null || k === undefined ? null : k; },                    // 0 ouvert … 1 fermé (ou null = automatique)
    animer(dt = 1 / 60) {
      dt = Math.min(dt, .1); S.t += dt;
      // clignements : toutes les 2 à 6 s, parfois deux de suite
      S.prochain -= dt; if (S.prochain <= 0 && S.cl < 0) { S.cl = 0; S.double = Math.random() < .18; S.prochain = 2 + Math.random() * 4; }
      let k = 0; if (S.cl >= 0) { S.cl += dt; k = courbe(S.cl); if (S.cl > .26) { S.cl = -1; if (S.double) { S.double = false; S.prochain = .12; } } }
      // saccades : petits sauts du regard, puis on tient
      S.sacc -= dt; if (S.sacc <= 0) { S.sacc = .35 + Math.random() * 2.2; const amp = Math.random() < .25 ? .12 : .045; S.cibleL = (Math.random() - .5) * 2 * amp; S.cibleT = (Math.random() - .5) * amp; }
      let L = S.cibleL, T = S.cibleT;
      if (S.cible) { tete.updateWorldMatrix(true, false); m4.copy(tete.matrixWorld).invert(); v.copy(S.cible).applyMatrix4(m4).sub(od.position); const h = Math.hypot(v.x, v.z); L = Math.max(-.5, Math.min(.5, Math.atan2(v.x, v.z))) + L * .4; T = Math.max(-.4, Math.min(.4, -Math.atan2(v.y, h))) + T * .4; }
      if (S.fixe) { L = S.fixe[0]; T = S.fixe[1]; }
      const a = 1 - Math.exp(-dt * 38); S.lacet += (L - S.lacet) * a; S.tangage += (T - S.tangage) * a;
      for (const b of [od, og]) b.rotation.set(S.tangage, S.lacet, 0);
      // la paupière du haut suit un peu le regard vers le bas
      if (S.force !== null) k = S.force; k = Math.max(k, Math.min(.45, Math.max(0, S.tangage) * 1.1));
      g.userData.blink = S.prochain;
      const i0 = k < .5 ? k * 2 : 2 - k * 2, i1 = k < .5 ? 0 : k * 2 - 1;
      pau.morphTargetInfluences[0] = det.morphTargetInfluences[0] = i0; pau.morphTargetInfluences[1] = det.morphTargetInfluences[1] = i1;
    },
  };
  ctl.animer(0);
  return ctl;
}
