// Le relief du Village de Millépoques : l'altitude de la carte de Millépoques (world.elev, aux coins des cases) devient
// un sol en 3D. Les prés restent presque plats, les montagnes se dressent, les rivières et le lac ont un lit creusé et
// une eau qui bouge ; les ponts de la partie (bois, pierre romaine ou médiévale, grand pont de la Renaissance) sont
// construits en 3D aux couleurs des ponts de Millépoques (render/bridges.js).
import * as THREE from 'three';

const NIVEAU_EAU = 0.36; // config.js de Millépoques : WATER_LEVEL
export const EAU_Y = -0.38; // la surface de l'eau (mètres)
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const debase64 = (s) => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };

// petit bruit de valeur (reproductible) pour la roche des montagnes
function hash(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function bruit(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  return lerp(lerp(hash(xi, yi), hash(xi + 1, yi), sx), lerp(hash(xi, yi + 1), hash(xi + 1, yi + 1), sx), sy);
}
const fbm = (x, y) => bruit(x, y) * 0.55 + bruit(x * 2.1 + 7, y * 2.1 + 3) * 0.3 + bruit(x * 4.3 + 1, y * 4.3 + 9) * 0.15;

/** La hauteur d'un pré ou d'une montagne (mètres) pour une altitude e de Millépoques. */
function hauteurTerre(e) {
  const pre = (e - NIVEAU_EAU) * 4.5;
  const mont = e > 0.6 ? Math.pow((e - 0.6) / 0.4, 1.5) * 26 : 0;
  return pre + mont;
}

/**
 * Le relief : une grille de 2 sommets par case sur la fenêtre (et la carte entière, plus grossière, pour le loin).
 * T : mètres par case. Les coordonnées du monde 3D partent du coin de la fenêtre (x0, y0).
 */
export class Relief {
  constructor(V, T) {
    this.V = V; this.T = T;
    const R = V.relief;
    this.CW = R.w; this.CH = R.h; this.MW = R.w - 1; this.MH = R.h - 1;
    const a = new Uint16Array(debase64(R.alt).buffer);
    this.elev = new Float32Array(a.length); for (let i = 0; i < a.length; i++) this.elev[i] = a[i] / 65535;
    this.nature = debase64(R.nature); this.pont = debase64(R.pont);
    // hauteur de chaque coin de la carte entière
    this.coin = new Float32Array(this.CW * this.CH);
    for (let y = 0; y < this.CH; y++) for (let x = 0; x < this.CW; x++) this.coin[y * this.CW + x] = this.hauteurCoin(x, y);
    // la grille fine de la fenêtre : 2 sommets par case
    this.N = 2; this.GW = V.w * this.N + 1; this.GH = V.h * this.N + 1;
    this.g = new Float32Array(this.GW * this.GH);
    for (let j = 0; j < this.GH; j++) for (let i = 0; i < this.GW; i++) this.g[j * this.GW + i] = this.hauteurFine(i / this.N, j / this.N);
    this.adoucir(2);
    this.aplanir();
  }
  eau(tx, ty) { // case d'eau de la carte (coordonnées de la carte)
    if (tx < 0 || ty < 0 || tx >= this.MW || ty >= this.MH) return true;
    const n = this.nature[ty * this.MW + tx]; return n === 0 || n === 1;
  }
  hauteurCoin(cx, cy) {
    const e = this.elev[cy * this.CW + cx];
    let n = 0; for (const [dx, dy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) if (this.eau(cx + dx, cy + dy)) n++;
    if (n === 4) return -1.25 - clamp((NIVEAU_EAU - e) * 10, 0, 1) * 0.9; // le lit
    if (n === 3) return -0.75; // le coin d'une rive rentrante
    if (n > 0) return Math.min(-0.04 - 0.08 * n, hauteurTerre(e)); // la rive
    return Math.max(0.02, hauteurTerre(e));
  }
  /** Hauteur fine en (tx, ty) cases de la fenêtre : les coins, et la roche des montagnes en plus. */
  hauteurFine(tx, ty) {
    const X = tx + this.V.x0, Y = ty + this.V.y0, x0 = Math.floor(X), y0 = Math.floor(Y), fx = X - x0, fy = Y - y0;
    const c = (x, y) => this.coin[clamp(y, 0, this.CH - 1) * this.CW + clamp(x, 0, this.CW - 1)];
    let h = lerp(lerp(c(x0, y0), c(x0 + 1, y0), fx), lerp(c(x0, y0 + 1), c(x0 + 1, y0 + 1), fx), fy);
    const e = this.elev[clamp(Math.round(Y), 0, this.CH - 1) * this.CW + clamp(Math.round(X), 0, this.CW - 1)];
    if (e > 0.64) h += (fbm(X * 0.6, Y * 0.6) - 0.5) * clamp((e - 0.64) / 0.12, 0, 1) * 1.6; // rochers et ravines
    return h;
  }
  /** Un flou léger du relief (les facettes « en carton » disparaissent), sans toucher au lit des rivières. */
  adoucir(n) {
    const W = this.GW, H = this.GH;
    for (let p = 0; p < n; p++) {
      const o = this.g.slice();
      for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) {
        const k = j * W + i; if (o[k] < 0) continue;
        this.g[k] = Math.max(0.02, (o[k] * 4 + o[k - 1] + o[k + 1] + o[k - W] + o[k + W]) / 8);
      }
    }
  }
  /** Les bâtiments posés à plat : un plateau sous l'emprise (et un peu autour), raccordé en pente douce. */
  aplanir() {
    const N = this.N, plateaux = [];
    for (const B of this.V.batiments) {
      let s = 0, k = 0;
      for (let j = B.by * N; j <= (B.by + B.bh) * N; j++) for (let i = B.bx * N; i <= (B.bx + B.bw) * N; i++) { const v = this.g[clamp(j, 0, this.GH - 1) * this.GW + clamp(i, 0, this.GW - 1)]; s += v; k++; }
      B.base = Math.max(0.02, s / k);
      plateaux.push(B);
    }
    const orig = this.g.slice();
    const poids = new Float32Array(this.g.length), somme = new Float32Array(this.g.length);
    for (const B of plateaux) {
      // marge plate, puis raccord (cases) : plus long si le relief autour est raide (pas de falaise au pied d'une mine)
      let ecart = 0;
      for (let j = Math.floor((B.by - 4) * N); j <= (B.by + B.bh + 4) * N; j += 2) for (let i = Math.floor((B.bx - 4) * N); i <= (B.bx + B.bw + 4) * N; i += 2) {
        const v = orig[clamp(j, 0, this.GH - 1) * this.GW + clamp(i, 0, this.GW - 1)]; if (v > -0.2) ecart = Math.max(ecart, Math.abs(v - B.base));
      }
      const m = 1.4, r = clamp(2.2 + ecart * 0.55, 2.2, 9);
      const i0 = Math.floor((B.bx - m - r) * N), i1 = Math.ceil((B.bx + B.bw + m + r) * N), j0 = Math.floor((B.by - m - r) * N), j1 = Math.ceil((B.by + B.bh + m * 0.6 + r) * N);
      for (let j = Math.max(0, j0); j <= Math.min(this.GH - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(this.GW - 1, i1); i++) {
        const tx = i / N, ty = j / N;
        const dx = Math.max(B.bx - m - tx, 0, tx - (B.bx + B.bw + m)), dy = Math.max(B.by - m - ty, 0, ty - (B.by + B.bh + m * 0.6));
        const d = Math.hypot(dx, dy), w = d <= 0 ? 1 : clamp(1 - d / r, 0, 1);
        if (w <= 0) continue;
        const k = j * this.GW + i, ww = w * w * (3 - 2 * w);
        poids[k] = Math.max(poids[k], ww); somme[k] = ww >= poids[k] ? B.base : somme[k];
      }
    }
    for (let k = 0; k < this.g.length; k++) if (poids[k] > 0 && orig[k] > -0.2) this.g[k] = lerp(orig[k], somme[k], poids[k]);
  }
  /** La hauteur du sol en (x, z) mètres : les mêmes triangles que le maillage. */
  hauteur(x, z) {
    const s = this.T / this.N, gi = clamp(x / s, 0, this.GW - 1.001), gj = clamp(z / s, 0, this.GH - 1.001);
    const i = Math.floor(gi), j = Math.floor(gj), fx = gi - i, fz = gj - j, G = this.g, W = this.GW;
    const h00 = G[j * W + i], h10 = G[j * W + i + 1], h01 = G[(j + 1) * W + i], h11 = G[(j + 1) * W + i + 1];
    if (fx + fz <= 1) return h00 + (h10 - h00) * fx + (h01 - h00) * fz;
    return h11 + (h01 - h11) * (1 - fx) + (h10 - h11) * (1 - fz);
  }
  normale(x, z, n = new THREE.Vector3()) {
    const e = 0.6; return n.set(this.hauteur(x - e, z) - this.hauteur(x + e, z), 2 * e, this.hauteur(x, z - e) - this.hauteur(x, z + e)).normalize();
  }
  /** Un morceau du sol (m : morceau de la cuisson, en cases de la fenêtre), sur la grille fine. */
  morceau(m) {
    const N = this.N, T = this.T, nx = m.w * N, nz = m.h * N;
    const pos = new Float32Array((nx + 1) * (nz + 1) * 3), nor = new Float32Array(pos.length), uv = new Float32Array((nx + 1) * (nz + 1) * 2);
    const W = this.GW, G = this.g, s = T / N;
    let p = 0, q = 0;
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
      const gi = m.x * N + i, gj = m.y * N + j, h = G[gj * W + gi];
      pos[p] = gi * s; pos[p + 1] = h; pos[p + 2] = gj * s;
      const hl = G[gj * W + Math.max(0, gi - 1)], hr = G[gj * W + Math.min(W - 1, gi + 1)], hu = G[Math.max(0, gj - 1) * W + gi], hd = G[Math.min(this.GH - 1, gj + 1) * W + gi];
      const n = new THREE.Vector3(hl - hr, 2 * s, hu - hd).normalize();
      nor[p] = n.x; nor[p + 1] = n.y; nor[p + 2] = n.z; p += 3;
      uv[q++] = i / nx; uv[q++] = 1 - j / nz;
    }
    const idx = [];
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
      idx.push(a, c, b, c, d, b); // diagonale de (1,0) à (0,1), comme hauteur()
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeBoundingSphere();
    return g;
  }
  /** Le pays de loin : toute la carte, un sommet par coin, sans la fenêtre (déjà couverte par le sol fin). */
  loin() {
    const T = this.T, V = this.V, CW = this.CW, CH = this.CH;
    const pos = new Float32Array(CW * CH * 3), uv = new Float32Array(CW * CH * 2);
    for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
      const k = y * CW + x;
      pos[k * 3] = (x - V.x0) * T; pos[k * 3 + 1] = this.coin[k] - 0.12 + (this.elev[k] > 0.64 ? (fbm(x * 0.6, y * 0.6) - 0.5) * clamp((this.elev[k] - 0.64) / 0.12, 0, 1) * 1.6 : 0); pos[k * 3 + 2] = (y - V.y0) * T;
      uv[k * 2] = x / (CW - 1); uv[k * 2 + 1] = 1 - y / (CH - 1);
    }
    const idx = [], P = 2; // un carré tous les 2 coins
    for (let y = 0; y + P < CH; y += P) for (let x = 0; x + P < CW; x += P) {
      const dedans = x >= V.x0 + 2 && x + P <= V.x0 + V.w - 2 && y >= V.y0 + 2 && y + P <= V.y0 + V.h - 2;
      if (dedans) continue;
      const a = y * CW + x, b = a + P, c = a + P * CW, d = c + P;
      idx.push(a, c, b, c, d, b);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingSphere();
    return g;
  }
  /** L'eau : un carré par case d'eau de la carte (et une demi-case autour, que la rive cache). */
  eauGeometrie() {
    const T = this.T, V = this.V, pos = [], uv = [], idx = [];
    for (let y = 0; y < this.MH; y++) for (let x = 0; x < this.MW; x++) {
      if (!this.eau(x, y)) continue;
      const x0 = (x - V.x0 - 0.5) * T, x1 = (x - V.x0 + 1.5) * T, z0 = (y - V.y0 - 0.5) * T, z1 = (y - V.y0 + 1.5) * T;
      const k = pos.length / 3;
      pos.push(x0, EAU_Y, z0, x1, EAU_Y, z0, x0, EAU_Y, z1, x1, EAU_Y, z1);
      uv.push(x0 / 8, z0 / 8, x1 / 8, z0 / 8, x0 / 8, z1 / 8, x1 / 8, z1 / 8);
      idx.push(k, k + 2, k + 1, k + 2, k + 3, k + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(pos.length).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
    g.setIndex(idx); g.computeBoundingSphere();
    return g;
  }
}

// ------------------------------------------------------------------------------------------------
// L'eau qui bouge : des vaguelettes (carte de normales dessinée ici, qui glisse) et le reflet du soleil
// ------------------------------------------------------------------------------------------------
function carteVagues() {
  const n = 256, c = document.createElement('canvas'); c.width = c.height = n;
  const x = c.getContext('2d'), im = x.createImageData(n, n), h = new Float32Array(n * n);
  const TAU = Math.PI * 2;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const u = i / n * TAU, v = j / n * TAU;
    h[j * n + i] = Math.sin(u * 3 + Math.sin(v * 2) * 1.5) * 0.5 + Math.sin(v * 5 + u * 2) * 0.3 + Math.sin(u * 7 - v * 4) * 0.2 + Math.sin(u * 11 + v * 9 + Math.sin(u * 3)) * 0.12;
  }
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const dx = h[j * n + (i + 1) % n] - h[j * n + (i + n - 1) % n], dy = h[((j + 1) % n) * n + i] - h[((j + n - 1) % n) * n + i];
    const k = (j * n + i) * 4, l = Math.hypot(dx, dy, 0.5);
    im.data[k] = (-dx / l * 0.5 + 0.5) * 255; im.data[k + 1] = (-dy / l * 0.5 + 0.5) * 255; im.data[k + 2] = (0.5 / l * 0.5 + 0.5) * 255; im.data[k + 3] = 255;
  }
  x.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
export function eauMateriau() {
  const nm = carteVagues();
  const m = new THREE.MeshPhongMaterial({ color: '#3f93d4', transparent: true, opacity: 0.62, shininess: 90, specular: new THREE.Color('#fff6dc'), normalMap: nm, normalScale: new THREE.Vector2(0.55, 0.55), depthWrite: false });
  m.userData.animer = (t) => { nm.offset.set(t * 0.012, t * 0.007); };
  return m;
}

// ------------------------------------------------------------------------------------------------
// Les ponts en 3D
// ------------------------------------------------------------------------------------------------
// demi-largeur du tablier (pixels de Millépoques, render/bridges.js SIZE), un peu élargie pour qu'on y marche à l'aise
const DEMI = { wood: 11, roman: 13, medieval: 13, renaissance: 17 };
const FLECHE = { wood: 0.45, roman: 1.25, medieval: 1.35, renaissance: 0.8 }; // montée au milieu (mètres)
const lookDe = (p) => (DEMI[p.look] ? p.look : p.kind === 'wood' ? 'wood' : p.kind === 'grand' ? 'renaissance' : 'medieval');

export class Ponts {
  constructor(V, T, K, relief) {
    this.liste = [];
    for (const p of V.ponts || []) {
      const look = lookDe(p), h = p.dir !== 'v';
      const lo = h ? Math.min(p.a[0], p.b[0]) : Math.min(p.a[1], p.b[1]), hi = h ? Math.max(p.a[0], p.b[0]) : Math.max(p.a[1], p.b[1]);
      const axe = h ? p.a[1] : p.a[0]; // la rangée (ou colonne) du pont
      const s0 = (lo + 0.5) * T, s1 = (hi + 0.5) * T, c = (axe + 0.5) * T; // de centre de case à centre de case
      const pt = (s) => (h ? [s, c] : [c, s]);
      const hA = relief.hauteur(...pt(s0)), hB = relief.hauteur(...pt(s1));
      const demi = DEMI[look] * K * 1.45;
      this.liste.push({ look, h, lo, hi, s0, s1, c, hA, hB, demi, fleche: FLECHE[look] * Math.min(1, (hi - lo) / 4), eaux: [] });
      const P = this.liste[this.liste.length - 1];
      for (let k = lo + 1; k < hi; k++) P.eaux.push(k);
    }
  }
  /** Hauteur du tablier à l'abscisse s (mètres le long du pont). */
  dessus(P, s) { const t = clamp((s - P.s0) / (P.s1 - P.s0), 0, 1); return lerp(P.hA, P.hB, t) + P.fleche * Math.pow(Math.sin(Math.PI * t), 0.7); }
  /** Si (x, z) est sur un tablier : sa hauteur ; sinon null. */
  hauteur(x, z) {
    for (const P of this.liste) {
      const s = P.h ? x : z, c = P.h ? z : x;
      if (s >= P.s0 - 0.2 && s <= P.s1 + 0.2 && Math.abs(c - P.c) <= P.demi + 0.05) return this.dessus(P, s);
    }
    return null;
  }
  /** Les maillages : pierre (arches, tympans, parapets) ou bois (tablier, pieux, garde-corps). */
  construire(textures) {
    const groupe = new THREE.Group();
    for (const P of this.liste) {
      const tx = textures[P.look] || textures.medieval;
      const g = P.look === 'wood' ? this.bois(P, tx) : this.pierre(P, tx);
      if (!P.h) { g.rotation.y = -Math.PI / 2; g.position.set(P.c, 0, 0); g.updateMatrix(); } else g.position.set(0, 0, P.c);
      groupe.add(g);
    }
    groupe.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    // le trait sombre des arêtes, comme les contours des ponts de Millépoques
    const trait = new THREE.LineBasicMaterial({ color: '#2a1a10', transparent: true, opacity: 0.85 }), traits = [];
    groupe.updateMatrixWorld(true);
    groupe.traverse((o) => { if (o.isMesh) { const l = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 30), trait); l.matrixAutoUpdate = false; l.matrix.copy(o.matrixWorld); traits.push(l); } });
    for (const l of traits) groupe.add(l);
    return groupe;
  }
  // profil le long du pont (s, y) : le dessus du tablier, échantillonné
  profil(P, dy = 0, n = 32) { const pts = []; for (let k = 0; k <= n; k++) { const s = lerp(P.s0, P.s1, k / n); pts.push([s, this.dessus(P, s) + dy]); } return pts; }
  pierre(P, tex) {
    const g = new THREE.Group(), T = (P.s1 - P.s0) / (P.hi - P.lo);
    const fond = -2.6, ep = 0.42;
    // le corps du pont : de la rive à la rive, sous le tablier, percé d'une arche par case d'eau
    const forme = new THREE.Shape();
    const haut = this.profil(P, -0.02);
    forme.moveTo(P.s0 - 0.6, fond);
    forme.lineTo(P.s0 - 0.6, haut[0][1] - 0.02);
    for (const [s, y] of haut) forme.lineTo(s, y);
    forme.lineTo(P.s1 + 0.6, haut[haut.length - 1][1] - 0.02);
    forme.lineTo(P.s1 + 0.6, fond);
    forme.closePath();
    const pile = P.look === 'renaissance' ? 0.75 : 0.62;
    for (const k of P.eaux) {
      const a = (k + 0.5) * T - T / 2 + (P.s0 - (P.lo + 0.5) * T) + pile / 2, b = a + T - pile, m = (a + b) / 2;
      const sous = this.dessus(P, m) - ep - 0.12, r0 = (b - a) / 2;
      const nais = Math.min(sous - r0 * (P.look === 'renaissance' ? 0.55 : 1.15), EAU_Y + 0.9);
      if (nais < fond + 0.8) continue;
      const trou = new THREE.Path();
      trou.moveTo(a, fond + 0.2); trou.lineTo(a, nais);
      if (P.look === 'renaissance') trou.absellipse(m, nais, r0, r0 * 0.55, Math.PI, 0, true);
      else if (P.look === 'medieval') { trou.quadraticCurveTo(a, nais + r0 * 1.15, m, nais + r0 * 1.15); trou.quadraticCurveTo(b, nais + r0 * 1.15, b, nais); }
      else trou.absarc(m, nais, r0, Math.PI, 0, true);
      trou.lineTo(b, fond + 0.2); trou.closePath();
      forme.holes.push(trou);
    }
    const largeur = P.demi * 2;
    const geo = new THREE.ExtrudeGeometry(forme, { depth: largeur, bevelEnabled: false, curveSegments: 14 });
    geo.translate(0, 0, -largeur / 2);
    geo.computeVertexNormals();
    const corps = new THREE.Mesh(geo, [tex.face, tex.dalles]);
    g.add(corps);
    // les parapets, de chaque côté
    for (const cote of [-1, 1]) {
      const f = new THREE.Shape(), bas = this.profil(P, -0.05), hautP = this.profil(P, P.look === 'renaissance' ? 0.75 : 0.62);
      f.moveTo(bas[0][0] - 0.6, bas[0][1]);
      for (const [s, y] of bas) f.lineTo(s, y);
      f.lineTo(bas[bas.length - 1][0] + 0.6, bas[bas.length - 1][1]);
      f.lineTo(hautP[hautP.length - 1][0] + 0.6, hautP[hautP.length - 1][1]);
      for (let k = hautP.length - 1; k >= 0; k--) f.lineTo(hautP[k][0], hautP[k][1]);
      f.lineTo(hautP[0][0] - 0.6, hautP[0][1]);
      f.closePath();
      const ep2 = 0.28, gp = new THREE.ExtrudeGeometry(f, { depth: ep2, bevelEnabled: false, curveSegments: 4 });
      gp.translate(0, 0, cote > 0 ? P.demi - ep2 : -P.demi);
      gp.computeVertexNormals();
      g.add(new THREE.Mesh(gp, [tex.face, tex.dalles]));
    }
    // avant-becs pointus devant les piles (pont médiéval) et demi-lunes (Renaissance)
    if (P.look !== 'roman') {
      for (let k = P.lo + 1; k < P.hi - 1; k++) {
        const s = (k + 1) * T + (P.s0 - (P.lo + 0.5) * T);
        const haut2 = this.dessus(P, s) - (P.look === 'renaissance' ? 0.1 : 0.6);
        const geoB = new THREE.CylinderGeometry(0, pile * 0.75, 1, P.look === 'medieval' ? 3 : 12, 1, false);
        for (const cote of [-1, 1]) {
          const bec = new THREE.Mesh(new THREE.BoxGeometry(pile, haut2 - fond, pile * 0.9), tex.face);
          bec.position.set(s, (haut2 + fond) / 2, cote * (P.demi + pile * 0.4));
          g.add(bec);
          const toit = new THREE.Mesh(geoB, tex.dalles); toit.scale.set(1, 0.6, 1); toit.position.set(s, haut2 + 0.3, cote * (P.demi + pile * 0.4)); toit.rotation.y = cote > 0 ? 0 : Math.PI;
          g.add(toit);
        }
      }
    }
    return g;
  }
  bois(P, tex) {
    const g = new THREE.Group(), T = (P.s1 - P.s0) / (P.hi - P.lo);
    // le tablier : une bande qui suit le profil, épaisse de 0,2 m
    const f = new THREE.Shape(), hautP = this.profil(P, 0), basP = this.profil(P, -0.22);
    f.moveTo(hautP[0][0] - 0.5, hautP[0][1]);
    for (const [s, y] of hautP) f.lineTo(s, y);
    f.lineTo(hautP[hautP.length - 1][0] + 0.5, hautP[hautP.length - 1][1]);
    f.lineTo(basP[basP.length - 1][0] + 0.5, basP[basP.length - 1][1]);
    for (let k = basP.length - 1; k >= 0; k--) f.lineTo(basP[k][0], basP[k][1]);
    f.lineTo(basP[0][0] - 0.5, basP[0][1]);
    f.closePath();
    const geo = new THREE.ExtrudeGeometry(f, { depth: P.demi * 2, bevelEnabled: false });
    geo.translate(0, 0, -P.demi);
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, [tex.poutre, tex.planches]));
    // pieux (sous le tablier) et poteaux du garde-corps, à chaque bout de case
    const pieu = new THREE.CylinderGeometry(0.13, 0.15, 1, 8), poteau = new THREE.BoxGeometry(0.16, 1, 0.16);
    const poteaux = [], arrets = [P.s0 + 0.2];
    for (let k = P.lo + 1; k <= P.hi; k++) arrets.push(k * T);
    arrets.push(P.s1 - 0.2);
    arrets.forEach((s, n) => {
      const y = this.dessus(P, s), dansEau = n > 0 && n < arrets.length - 1;
      for (const cote of [-1, 1]) {
        if (dansEau) {
          const m = new THREE.Mesh(pieu, tex.poteau); m.scale.y = y + 2.4; m.position.set(s, (y - 2.4) / 2 - 0.1, cote * (P.demi - 0.25)); g.add(m);
        }
        const m2 = new THREE.Mesh(poteau, tex.poteau); m2.scale.y = 1.0; m2.position.set(s, y + 0.5, cote * (P.demi - 0.08)); g.add(m2);
        poteaux.push([s, y, cote]);
      }
    });
    // les lisses du garde-corps entre les poteaux
    const lisse = new THREE.BoxGeometry(1, 0.11, 0.12);
    for (const cote of [-1, 1]) {
      const pts = poteaux.filter((p) => p[2] === cote);
      for (let k = 0; k + 1 < pts.length; k++) {
        const [sa, ya] = pts[k], [sb, yb] = pts[k + 1];
        for (const dy of [0.95, 0.5]) {
          const m = new THREE.Mesh(lisse, tex.poutre);
          const l = Math.hypot(sb - sa, yb - ya); m.scale.x = l; m.position.set((sa + sb) / 2, (ya + yb) / 2 + dy, cote * (P.demi - 0.08)); m.rotation.z = Math.atan2(yb - ya, sb - sa);
          g.add(m);
        }
      }
    }
    return g;
  }
}
