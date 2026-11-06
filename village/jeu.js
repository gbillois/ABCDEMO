// Le Village de Millépoques : une vraie promenade en 3D dans un village de Millépoques.
// Tout ce qu'on voit a été dessiné par le code de Millépoques (cuisson : outils/village/cuisson/), puis posé en 3D :
//   - le sol : les morceaux du sol de Millépoques, à plat (vu de dessus, comme dans le jeu) ;
//   - les bâtiments : un volume (murs, puis toit qui monte vers le faîtage) taillé dans la silhouette du dessin,
//     et la façade de Millépoques projetée dessus ; ce qui dépasse (cheminées, mâts) est posé sur le faîtage, ce qui
//     est à côté (enclos, établis) devant, ce qui est au sol (cour, ombre) à plat ;
//   - les arbres, rochers, drapeaux, bateaux, animaux et les habitants : des images debout qui se tournent vers nous ;
//   - dedans : une pièce aux murs dessinés par Millépoques, et les ouvriers du bâtiment qui travaillent (leurs gestes
//     du jeu, image par image), le nom du métier, ce qu'il transforme et l'explication de Millépoques.
import * as THREE from 'three';

const DONNEES = 'donnees/';
const T = 2.5; // mètres par case
const K = T / 40; // mètres par pixel de Millépoques
const BLOQUE = new Set(['B', '~', 'R', '#']);
const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;

// ------------------------------------------------------------------------------------------------
// Le moteur 3D
// ------------------------------------------------------------------------------------------------
const toile = $('#jeu');
const rendu = new THREE.WebGLRenderer({ canvas: toile, antialias: true, powerPreference: 'high-performance' });
rendu.outputColorSpace = THREE.SRGBColorSpace;
rendu.toneMapping = THREE.NoToneMapping; // les couleurs de Millépoques telles quelles
const CIEL = new THREE.Color('#a9d8f2');
const dehors = new THREE.Scene();
dehors.background = CIEL;
dehors.fog = new THREE.Fog(CIEL, 55, 170);
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);
let qualite = 1;
function taille() {
  const w = innerWidth, h = innerHeight;
  rendu.setPixelRatio(Math.min(devicePixelRatio || 1, 2) * qualite);
  rendu.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', taille);

const chargeur = new THREE.TextureLoader();
function texture(url, { repeter = false, haut = true } = {}) {
  return new Promise((ok, ko) => chargeur.load(DONNEES + url, (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.flipY = !haut ? true : false;
    t.anisotropy = Math.min(8, rendu.capabilities.getMaxAnisotropy());
    if (repeter) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.flipY = true; }
    t.needsUpdate = true;
    ok(t);
  }, undefined, ko));
}

// Matériau des images debout : chaque coin est poussé, dans le shader, le long de l'axe qui fait face à la caméra
// (rotation autour de la verticale seulement). Attributs : centre (pied de l'image), coin (décalage en mètres).
function materiauDebout(map) {
  const m = new THREE.MeshBasicMaterial({ map, alphaTest: 0.5, side: THREE.DoubleSide, fog: true });
  m.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 centre;\nattribute vec2 coin;')
      .replace('#include <begin_vertex>', `
        vec3 versCam = cameraPosition - centre; versCam.y = 0.0;
        vec3 droite = normalize(vec3(versCam.z, 0.0, -versCam.x) + vec3(1e-5, 0.0, 0.0));
        vec3 transformed = centre + droite * coin.x + vec3(0.0, coin.y, 0.0);`);
  };
  return m;
}

// ------------------------------------------------------------------------------------------------
// Les données de la cuisson
// ------------------------------------------------------------------------------------------------
let V, PL = [], IM;
const uvDe = (i) => { const [p, x, y, w, h] = V.images[i].r; return { p, x, y, w, h, W: V.planches[p].w, H: V.planches[p].h }; };

/** Un rectangle d'image debout, en mètres : [gauche, droite] et [bas, haut] par rapport au pied, et ses coins dans la planche. */
function rectImage(i, s = 1) {
  const im = V.images[i], r = uvDe(i), ss = im.ss || V.ss;
  const x0 = im.ox * K * s, x1 = (im.ox + r.w / ss) * K * s;
  const y1 = -im.oy * K * s, y0 = -(im.oy + r.h / ss) * K * s;
  const e = 0.5; // un demi-pixel dedans
  return { p: r.p, x0, x1, y0, y1, u0: (r.x + e) / r.W, u1: (r.x + r.w - e) / r.W, v0: (r.y + r.h - e) / r.H, v1: (r.y + e) / r.H };
}

// Des listes de sommets, une par planche
class Lot {
  constructor() { this.pos = []; this.uv = []; this.col = []; this.centre = []; this.coin = []; }
  geometrie(debout = false) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(debout ? this.centre : this.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    if (this.col.length) g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    if (debout) { g.setAttribute('centre', new THREE.Float32BufferAttribute(this.centre, 3)); g.setAttribute('coin', new THREE.Float32BufferAttribute(this.coin, 2)); }
    g.computeBoundingSphere();
    if (debout) g.boundingSphere.radius += 12;
    return g;
  }
}
const lots = (n) => Array.from({ length: n }, () => new Lot());

// Lumière douce : le soleil vient du sud-est, un peu de haut (les dessins de Millépoques sont éclairés en haut à gauche)
const SOLEIL = new THREE.Vector3(-0.35, 0.75, 0.55).normalize();
function eclairage(n) { return 0.7 + 0.32 * Math.max(0, n.dot(SOLEIL)); }

// ------------------------------------------------------------------------------------------------
// Les bâtiments en volume
// ------------------------------------------------------------------------------------------------
const OBSTACLES = []; // cercles : arbres, découpes
const PORTES = []; // { x, z, b }
function batiments(lotsVol, lotsPlat) {
  const v3 = new THREE.Vector3(), a = new THREE.Vector3(), b2 = new THREE.Vector3(), n = new THREE.Vector3();
  for (const B of V.batiments) {
    const M = V.modeles[B.m];
    const AX = B.x * T, AZ = B.y * T; // ancre (milieu du bas de l'emprise)
    const zf = AZ - 2 * K;
    const prof = Math.max(22, B.bh * 40 - 10) * K; // profondeur
    const zb = zf - prof, zm = (zf + zb) / 2;
    let zDessus = zm;
    if (M.facade !== undefined && M.corps.length) {
      const F = rectImage(M.facade), f = V.images[M.facade], fr = uvDe(M.facade);
      const lot = lotsVol[F.p];
      // pixel de Millépoques (x par rapport à l'ancre, hauteur h au-dessus du sol) -> coordonnées dans la planche
      const uvPx = (x, h) => {
        const ix = clamp((x - f.ox) * V.ss, 0.5, fr.w - 0.5), iy = clamp((-h - f.oy) * V.ss, 0.5, fr.h - 0.5);
        return [(fr.x + ix) / fr.W, (fr.y + iy) / fr.H];
      };
      for (const c of M.corps) {
        const xs = c.h.map((_, k) => Math.min(c.a + 2 * k, c.b));
        const hs = c.h.map((h) => h + 0.5);
        const haut = (x) => { const k = clamp((x - c.a) / 2, 0, hs.length - 1), k0 = Math.floor(k), k1 = Math.min(hs.length - 1, k0 + 1); return lerp(hs[k0], hs[k1], k - k0); };
        const centre = new THREE.Vector3(AX + (c.a + c.b) / 2 * K, c.hw * K * 0.5, zm);
        // un triangle : trois sommets [x, y, z] en mètres, et leurs pixels de façade [x, h]
        const tri = (P, U) => {
          a.set(...P[1]).sub(v3.set(...P[0])); b2.set(...P[2]).sub(v3.set(...P[0]));
          n.crossVectors(a, b2).normalize();
          v3.set((P[0][0] + P[1][0] + P[2][0]) / 3, (P[0][1] + P[1][1] + P[2][1]) / 3, (P[0][2] + P[1][2] + P[2][2]) / 3).sub(centre);
          if (n.dot(v3) < 0) n.negate();
          const l = eclairage(n);
          for (let k = 0; k < 3; k++) { lot.pos.push(...P[k]); lot.uv.push(...uvPx(U[k][0], U[k][1])); lot.col.push(l, l, l); }
        };
        const quad = (P, U) => { tri([P[0], P[1], P[2]], [U[0], U[1], U[2]]); tri([P[0], P[2], P[3]], [U[0], U[2], U[3]]); };
        const X = (x) => AX + x * K, Y = (h) => h * K;
        for (let k = 0; k + 1 < xs.length; k++) {
          const x0 = xs[k], x1 = xs[k + 1]; if (x1 <= x0) continue;
          const t0 = hs[k], t1 = hs[k + 1], w0 = Math.min(t0, c.hw), w1 = Math.min(t1, c.hw);
          // mur de devant, pente de devant, pente de derrière, mur de derrière
          quad([[X(x0), 0, zf], [X(x1), 0, zf], [X(x1), Y(w1), zf], [X(x0), Y(w0), zf]], [[x0, 0], [x1, 0], [x1, w1], [x0, w0]]);
          quad([[X(x0), Y(w0), zf], [X(x1), Y(w1), zf], [X(x1), Y(t1), zm], [X(x0), Y(t0), zm]], [[x0, w0], [x1, w1], [x1, t1], [x0, t0]]);
          quad([[X(x0), Y(t0), zm], [X(x1), Y(t1), zm], [X(x1), Y(w1), zb], [X(x0), Y(w0), zb]], [[x0, t0], [x1, t1], [x1, w1], [x0, w0]]);
          quad([[X(x0), Y(w0), zb], [X(x1), Y(w1), zb], [X(x1), 0, zb], [X(x0), 0, zb]], [[x0, w0], [x1, w1], [x1, 0], [x0, 0]]);
        }
        // pignons des deux bouts : la façade étalée sur la profondeur (une fenêtre de côté, comme une vraie maison)
        for (const bout of [0, xs.length - 1]) {
          const x = xs[bout], t = hs[bout], wt = Math.min(t, c.hw), gauche = bout === 0;
          const zs = [zf, zf, zm, zb, zb], ys = [0, wt, t, wt, 0];
          const P = zs.map((z, k) => [X(x), Y(ys[k]), z]);
          const U = zs.map((z, k) => {
            const s = (z - zb) / (zf - zb), ux = gauche ? c.a + s * (c.b - c.a) : c.b - s * (c.b - c.a);
            return [ux, Math.min(ys[k], haut(ux) - 1)];
          });
          tri([P[0], P[1], P[2]], [U[0], U[1], U[2]]); tri([P[0], P[2], P[3]], [U[0], U[2], U[3]]); tri([P[0], P[3], P[4]], [U[0], U[3], U[4]]);
        }
      }
    }
    // ce qui dépasse du toit (sur le faîtage), ce qui est à côté (devant), ce qui est au sol (à plat)
    const plaque = (i, z, y0 = 0) => {
      const R = rectImage(i), lot = lotsPlat[R.p];
      const P = [[AX + R.x0, R.y0 + y0, z], [AX + R.x1, R.y0 + y0, z], [AX + R.x1, R.y1 + y0, z], [AX + R.x0, R.y1 + y0, z]];
      const U = [[R.u0, R.v0], [R.u1, R.v0], [R.u1, R.v1], [R.u0, R.v1]];
      for (const k of [0, 1, 2, 0, 2, 3]) { lot.pos.push(...P[k]); lot.uv.push(...U[k]); }
    };
    if (M.dessus !== undefined) plaque(M.dessus, zDessus);
    if (M.cotes !== undefined) plaque(M.cotes, zf + 0.02);
    if (M.sol !== undefined) {
      const R = rectImage(M.sol), lot = lotsPlat[R.p], y = 0.03;
      // à plat : le haut de l'image est au nord (z plus petit) ; la ligne du sol (ancre) est au bord du bâtiment
      const z0 = AZ - R.y1, z1 = AZ - R.y0;
      const P = [[AX + R.x0, y, z1], [AX + R.x1, y, z1], [AX + R.x1, y, z0], [AX + R.x0, y, z0]];
      const U = [[R.u0, R.v0], [R.u1, R.v0], [R.u1, R.v1], [R.u0, R.v1]];
      for (const k of [0, 1, 2, 0, 2, 3]) { lot.pos.push(...P[k]); lot.uv.push(...U[k]); }
    }
    PORTES.push({ x: (B.bx + B.bw * B.porte) * T, z: AZ + 0.2, b: B });
  }
}

// ------------------------------------------------------------------------------------------------
// Les images debout (arbres, rochers, drapeaux, bateaux, animaux)
// ------------------------------------------------------------------------------------------------
function poserDebout(lot, i, x, z, s = 1, y = 0) {
  const R = rectImage(i, s);
  const C = [[R.x0, R.y0, R.u0, R.v0], [R.x1, R.y0, R.u1, R.v0], [R.x1, R.y1, R.u1, R.v1], [R.x0, R.y1, R.u0, R.v1]];
  for (const k of [0, 1, 2, 0, 2, 3]) { lot.centre.push(x, y, z); lot.coin.push(C[k][0], C[k][1]); lot.uv.push(C[k][2], C[k][3]); }
}

// ------------------------------------------------------------------------------------------------
// Les gens : Millie et les passants (images de marche de Millépoques, 4 vues × 8 pas)
// ------------------------------------------------------------------------------------------------
const PAS_M = 4.3 * 4 * K; // un cycle de marche, en mètres
class Gens {
  constructor(n, map) {
    this.n = n;
    const g = new THREE.BufferGeometry();
    this.centre = new Float32Array(n * 18); this.coin = new Float32Array(n * 12); this.uv = new Float32Array(n * 12);
    g.setAttribute('position', new THREE.BufferAttribute(this.centre, 3));
    g.setAttribute('centre', new THREE.BufferAttribute(this.centre, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('coin', new THREE.BufferAttribute(this.coin, 2).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('uv', new THREE.BufferAttribute(this.uv, 2).setUsage(THREE.DynamicDrawUsage));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    this.g = g; this.mesh = new THREE.Mesh(g, materiauDebout(map)); this.mesh.frustumCulled = false;
  }
  poser(k, i, x, z, s = 1) {
    const R = rectImage(i, s);
    const C = [[R.x0, R.y0, R.u0, R.v0], [R.x1, R.y0, R.u1, R.v0], [R.x1, R.y1, R.u1, R.v1], [R.x0, R.y1, R.u0, R.v1]];
    [0, 1, 2, 0, 2, 3].forEach((c, j) => {
      const o = k * 6 + j;
      this.centre[o * 3] = x; this.centre[o * 3 + 1] = 0; this.centre[o * 3 + 2] = z;
      this.coin[o * 2] = C[c][0]; this.coin[o * 2 + 1] = C[c][1];
      this.uv[o * 2] = C[c][2]; this.uv[o * 2 + 1] = C[c][3];
    });
  }
  cacher(k) { for (let j = 0; j < 6; j++) { this.coin[(k * 6 + j) * 2] = 0; this.coin[(k * 6 + j) * 2 + 1] = 0; } }
  fini() { for (const n of ['centre', 'coin', 'uv', 'position']) this.g.attributes[n].needsUpdate = true; }
}
/** La vue à montrer : selon le sens de la marche (dx, dz) et la direction de la caméra (yaw). */
function vueDe(dx, dz, yaw) {
  // dans le repère de la caméra : avant = s'éloigne (dos), arrière = vient vers nous (face)
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw); // devant la caméra
  const rx = Math.cos(yaw), rz = -Math.sin(yaw); // à droite de la caméra
  const av = dx * fx + dz * fz, dr = dx * rx + dz * rz;
  if (Math.abs(av) >= Math.abs(dr)) return av > 0 ? 'dos' : 'face';
  return dr > 0 ? 'droite' : 'gauche';
}

// ------------------------------------------------------------------------------------------------
// Le monde : où l'on peut marcher
// ------------------------------------------------------------------------------------------------
function caseLibre(x, z) {
  const cx = Math.floor(x / T), cz = Math.floor(z / T);
  if (cz < 0 || cx < 0 || cz >= V.h || cx >= V.w) return false;
  return !BLOQUE.has(V.cases[cz][cx]);
}
function libre(x, z, r = 0.3) {
  for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r]]) if (!caseLibre(x + dx, z + dz)) return false;
  for (const o of OBSTACLES) { const ddx = x - o.x, ddz = z - o.z; if (ddx * ddx + ddz * ddz < (o.r + r) ** 2) return false; }
  return true;
}
// grille des obstacles ronds pour aller vite
let grilleObs = null;
function obstaclesPres(x, z) { return grilleObs.get(`${Math.floor(x / 4)},${Math.floor(z / 4)}`) || []; }
function libreVite(x, z, r = 0.3) {
  for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r], [r * 0.7, r * 0.7], [-r * 0.7, r * 0.7], [r * 0.7, -r * 0.7], [-r * 0.7, -r * 0.7]]) if (!caseLibre(x + dx, z + dz)) return false;
  for (const o of obstaclesPres(x, z)) { const ddx = x - o.x, ddz = z - o.z; if (ddx * ddx + ddz * ddz < (o.r + r) ** 2) return false; }
  return true;
}

// ------------------------------------------------------------------------------------------------
// Construction de la scène du dehors
// ------------------------------------------------------------------------------------------------
let gens, joueur, passants = [];
async function construire(progres) {
  V = await (await fetch(DONNEES + 'village.json')).json();
  progres(0.1);
  PL = await Promise.all(V.planches.map((p) => texture(p.f)));
  progres(0.4);
  // le sol
  const solMat = [];
  await Promise.all(V.sol.morceaux.map(async (m, k) => {
    const t = await texture(m.f, { haut: false });
    const geo = new THREE.PlaneGeometry(m.w * T, m.h * T);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: t }));
    mesh.rotation.x = -Math.PI / 2; mesh.position.set((m.x + m.w / 2) * T, 0, (m.y + m.h / 2) * T);
    dehors.add(mesh); solMat[k] = mesh;
  }));
  progres(0.7);
  { // le pays de loin (sous le sol de près)
    const t = await texture(V.loin, { haut: false });
    const geo = new THREE.PlaneGeometry(V.monde.w * T, V.monde.h * T);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: t }));
    mesh.rotation.x = -Math.PI / 2; mesh.position.set((V.monde.w / 2 - V.x0) * T, -0.05, (V.monde.h / 2 - V.y0) * T);
    dehors.add(mesh);
  }
  // les bâtiments
  const vol = lots(PL.length), plat = lots(PL.length);
  batiments(vol, plat);
  vol.forEach((l, p) => { if (l.pos.length) dehors.add(new THREE.Mesh(l.geometrie(), new THREE.MeshBasicMaterial({ map: PL[p], vertexColors: true, side: THREE.DoubleSide, alphaTest: 0.5 }))); });
  plat.forEach((l, p) => { if (l.pos.length) dehors.add(new THREE.Mesh(l.geometrie(), new THREE.MeshBasicMaterial({ map: PL[p], side: THREE.DoubleSide, alphaTest: 0.5 }))); });
  // les images debout
  const deb = lots(PL.length);
  for (const o of V.objets) {
    const x = o.x * T, z = o.y * T;
    poserDebout(deb[V.images[o.i].r[0]], o.i, x, z, o.s);
    if (o.k === 'arbre' && o.s > 0.5) OBSTACLES.push({ x, z, r: 0.35 * o.s });
    else if (o.k === 'rocher') OBSTACLES.push({ x, z, r: 0.6 });
  }
  deb.forEach((l, p) => { if (l.centre.length) { const m = new THREE.Mesh(l.geometrie(true), materiauDebout(PL[p])); m.frustumCulled = false; dehors.add(m); } });
  grilleObs = new Map();
  for (const o of OBSTACLES) for (let gx = Math.floor((o.x - o.r - 1) / 4); gx <= Math.floor((o.x + o.r + 1) / 4); gx++) for (let gz = Math.floor((o.z - o.r - 1) / 4); gz <= Math.floor((o.z + o.r + 1) / 4); gz++) {
    const k = `${gx},${gz}`; if (!grilleObs.has(k)) grilleObs.set(k, []); grilleObs.get(k).push(o);
  }
  // les gens (toutes les images de marche sont sur une même planche ? sinon, une couche par planche)
  const pageGens = V.images[V.habitants[0].vues.face[0]].r[0];
  const tous = V.habitants.every((h) => Object.values(h.vues).flat().every((i) => V.images[i].r[0] === pageGens));
  gens = { couches: [] };
  const couche = (p) => { let c = gens.couches[p]; if (!c) { c = gens.couches[p] = new Gens(NB_PASSANTS + 1, PL[p]); dehors.add(c.mesh); } return c; };
  if (tous) couche(pageGens);
  joueur = { x: V.depart.x * T, z: V.depart.y * T, dx: 0, dz: 1, pas: 0, bouge: false, h: V.habitants[0] };
  // les passants : sur les routes, aller et retour
  const routes = V.routes.filter((r) => r.length >= 4);
  for (let k = 0; k < NB_PASSANTS && routes.length; k++) {
    const route = routes[(k * 7919) % routes.length].map(([x, y]) => [(x + 0.5) * T, (y + 0.5) * T]);
    const h = V.habitants[1 + (k % (V.habitants.length - 1))];
    passants.push({ route, i: 0, sens: 1, t: Math.random(), x: route[0][0], z: route[0][1], dx: 0, dz: 1, pas: Math.random() * 3, h, v: 1.05 + Math.random() * 0.3, pause: 0 });
  }
  gens.poser = (k, i, x, z) => { const p = V.images[i].r[0]; for (const [q, c] of gens.couches.entries()) if (c && q !== p) c.cacher(k); couche(p).poser(k, i, x, z); };
  progres(1);
}
const NB_PASSANTS = 26;

// ------------------------------------------------------------------------------------------------
// Les commandes : clavier, souris, tactile, manette
// ------------------------------------------------------------------------------------------------
const touches = new Set();
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  touches.add(e.code);
  if (e.code === 'KeyE' || e.code === 'Enter') { if (enJeu()) actionPorte(); }
  if (e.code === 'KeyM') { if (enJeu() || $('#carte').classList.contains('ouvert')) basculerCarte(); }
  if (e.code === 'Escape' || e.code === 'KeyP') { if ($('#carte').classList.contains('ouvert')) basculerCarte(); else if (enJeu()) pause(true); else if ($('#pause').classList.contains('ouvert')) pause(false); }
});
addEventListener('keyup', (e) => touches.delete(e.code));
addEventListener('blur', () => touches.clear());
let yaw = 0, pitch = 0.32, dist = 5.5;
const joy = { id: null, x0: 0, y0: 0, x: 0, y: 0 }, regard = { id: null, x: 0, y: 0 };
const pointeurs = new Map();
toile.addEventListener('pointerdown', (e) => {
  toile.setPointerCapture(e.pointerId);
  pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (e.pointerType !== 'mouse' && e.clientX < innerWidth * 0.45 && joy.id === null) {
    Object.assign(joy, { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: 0, y: 0 });
    const j = $('#joystick'); j.style.left = e.clientX + 'px'; j.style.top = e.clientY + 'px'; j.classList.add('vu');
  } else if (regard.id === null) Object.assign(regard, { id: e.pointerId, x: e.clientX, y: e.clientY });
});
toile.addEventListener('pointermove', (e) => {
  const p = pointeurs.get(e.pointerId); if (!p) return;
  if (pointeurs.size === 2 && e.pointerType !== 'mouse' && joy.id === null) { // pincer pour s'approcher
    const [a, b] = [...pointeurs.values()], d0 = Math.hypot(a.x - b.x, a.y - b.y);
    p.x = e.clientX; p.y = e.clientY;
    const d1 = Math.hypot(a.x - b.x, a.y - b.y); dist = clamp(dist * d0 / Math.max(1, d1), 2.5, 14); return;
  }
  if (e.pointerId === joy.id) {
    let dx = e.clientX - joy.x0, dy = e.clientY - joy.y0; const l = Math.hypot(dx, dy), m = 60;
    if (l > m) { dx *= m / l; dy *= m / l; }
    joy.x = dx / m; joy.y = dy / m;
    $('#joystick i').style.transform = `translate(${dx}px, ${dy}px)`;
  } else if (e.pointerId === regard.id) {
    yaw -= (e.clientX - regard.x) * 0.006; pitch = clamp(pitch + (e.clientY - regard.y) * 0.004, 0.05, 1.1);
    regard.x = e.clientX; regard.y = e.clientY;
  }
  p.x = e.clientX; p.y = e.clientY;
});
const lacher = (e) => {
  pointeurs.delete(e.pointerId);
  if (e.pointerId === joy.id) { joy.id = null; joy.x = joy.y = 0; $('#joystick').classList.remove('vu'); $('#joystick i').style.transform = ''; }
  if (e.pointerId === regard.id) regard.id = null;
};
toile.addEventListener('pointerup', lacher); toile.addEventListener('pointercancel', lacher);
toile.addEventListener('wheel', (e) => { dist = clamp(dist * (1 + Math.sign(e.deltaY) * 0.1), 2.5, 14); e.preventDefault(); }, { passive: false });
function manette() {
  const p = navigator.getGamepads?.()?.find?.((g) => g && g.connected);
  if (!p) return null;
  const mort = (v) => (Math.abs(v) < 0.18 ? 0 : v);
  const r = { x: mort(p.axes[0] || 0), y: mort(p.axes[1] || 0), cx: mort(p.axes[2] || 0), cy: mort(p.axes[3] || 0), a: p.buttons[0]?.pressed, b: p.buttons[1]?.pressed, start: p.buttons[9]?.pressed };
  const avant = manette.avant || {}; manette.avant = r;
  r.aNouveau = r.a && !avant.a; r.bNouveau = r.b && !avant.b; r.startNouveau = r.start && !avant.start;
  return r;
}
function commande() {
  let x = 0, y = 0, cours = touches.has('ShiftLeft') || touches.has('ShiftRight');
  if (touches.has('KeyW') || touches.has('KeyZ') || touches.has('ArrowUp')) y -= 1;
  if (touches.has('KeyS') || touches.has('ArrowDown')) y += 1;
  if (touches.has('KeyA') || touches.has('KeyQ') || touches.has('ArrowLeft')) x -= 1;
  if (touches.has('KeyD') || touches.has('ArrowRight')) x += 1;
  if (joy.id !== null) { x += joy.x; y += joy.y; if (Math.hypot(joy.x, joy.y) > 0.95) cours = true; }
  const m = manette();
  if (m) {
    x += m.x; y += m.y; yaw -= m.cx * 0.04; pitch = clamp(pitch + m.cy * 0.02, 0.05, 1.1);
    if (m.aNouveau) { if (enJeu()) actionPorte(); }
    if (m.bNouveau && dedans) sortir();
    if (m.startNouveau) pause(enJeu());
  }
  if (touches.has('KeyJ')) yaw += 0.03; if (touches.has('KeyL')) yaw -= 0.03;
  const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
  return { x, y, cours };
}

// ------------------------------------------------------------------------------------------------
// Le joueur, la caméra
// ------------------------------------------------------------------------------------------------
const ombre = (() => { // petite ombre ronde sous les pieds
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(20,30,18,0.45)'); g.addColorStop(1, 'rgba(20,30,18,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
const ombreJoueur = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.55), new THREE.MeshBasicMaterial({ map: ombre, transparent: true, depthWrite: false }));
ombreJoueur.rotation.x = -Math.PI / 2;

function bougerJoueur(dt, c, monde) {
  const v = (c.cours ? 4.2 : 2.1) * dt;
  const l = Math.hypot(c.x, c.y);
  joueur.bouge = l > 0.05;
  if (!joueur.bouge) return;
  // dans le repère de la caméra
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
  const dx = (rx * c.x - fx * c.y), dz = (rz * c.x - fz * c.y);
  const nx = joueur.x + dx * v, nz = joueur.z + dz * v;
  const ok = monde.libre;
  if (ok(nx, nz)) { joueur.x = nx; joueur.z = nz; } else if (ok(nx, joueur.z)) joueur.x = nx; else if (ok(joueur.x, nz)) joueur.z = nz;
  joueur.dx = dx; joueur.dz = dz;
  joueur.pas += v;
}
function imageMarche(h, dx, dz, pas, bouge) {
  const vue = vueDe(dx, dz, yaw);
  if (!bouge) return vue === 'face' ? h.vues.debout[0] : h.vues[vue][0];
  return h.vues[vue][Math.floor(pas / PAS_M * 8) % 8];
}
const cible = new THREE.Vector3();
let distVue = 5;
function placerCamera(dt, monde) {
  cible.set(joueur.x, 1.1, joueur.z);
  let d = dist;
  // la caméra ne passe pas dans les murs (dehors : dans les cases fermées ; dedans : dans la pièce)
  for (let s = 0.6; s <= dist; s += 0.3) {
    const x = cible.x + Math.sin(yaw) * Math.cos(pitch) * s, z = cible.z + Math.cos(yaw) * Math.cos(pitch) * s;
    if (!monde.cameraLibre(x, z)) { d = Math.max(dedans ? 1.6 : 2.6, s - 0.4); break; }
  }
  distVue = dt ? lerp(distVue, d, Math.min(1, dt * (d < distVue ? 10 : 3))) : d; d = distVue;
  camera.position.set(cible.x + Math.sin(yaw) * Math.cos(pitch) * d, cible.y + Math.sin(pitch) * d, cible.z + Math.cos(yaw) * Math.cos(pitch) * d);
  camera.lookAt(cible);
}

// ------------------------------------------------------------------------------------------------
// Les passants
// ------------------------------------------------------------------------------------------------
function bougerPassants(dt) {
  for (const p of passants) {
    if (p.pause > 0) { p.pause -= dt; p.bouge = false; continue; }
    const [tx, tz] = p.route[p.i];
    const dx = tx - p.x, dz = tz - p.z, l = Math.hypot(dx, dz);
    // on s'arrête un peu si Millie est juste devant
    if (Math.hypot(joueur.x - p.x, joueur.z - p.z) < 0.9 && !dedans) { p.bouge = false; continue; }
    if (l < 0.05) {
      p.i += p.sens;
      if (p.i >= p.route.length || p.i < 0) { p.sens = -p.sens; p.i += 2 * p.sens; p.pause = 1 + Math.random() * 3; }
      p.i = clamp(p.i, 0, p.route.length - 1);
      continue;
    }
    const s = Math.min(l, p.v * dt);
    p.x += dx / l * s; p.z += dz / l * s; p.dx = dx; p.dz = dz; p.pas += s; p.bouge = true;
  }
}

// ------------------------------------------------------------------------------------------------
// Les portes : « Entrer »
// ------------------------------------------------------------------------------------------------
let porteProche = null;
function chercherPorte() {
  let best = null, bd = 1.7;
  for (const p of PORTES) {
    const d = Math.hypot(p.x - joueur.x, p.z - joueur.z);
    if (d < bd && joueur.z > p.z - 0.4) { bd = d; best = p; }
  }
  if (best !== porteProche) {
    porteProche = best;
    const b = $('#entrer');
    if (best) { $('#entrer-nom').textContent = best.b.nom; b.classList.add('vu'); } else b.classList.remove('vu');
  }
}
let nomProche = null;
function batimentProche() { // le nom du bâtiment devant lequel on passe
  let best = null, bd = 6;
  for (const p of PORTES) { const d = Math.hypot(p.x - joueur.x, p.z - joueur.z); if (d < bd) { bd = d; best = p; } }
  const n = best ? best.b.nom : null;
  if (n !== nomProche) { nomProche = n; const e = $('#lieu'); e.textContent = n || ''; e.classList.toggle('vu', !!n); }
}
function actionPorte() { if (dedans) sortir(); else if (porteProche) entrer(porteProche); }

// ------------------------------------------------------------------------------------------------
// Dedans
// ------------------------------------------------------------------------------------------------
const MATIERE = {
  tuffeau: ['r_printshop', 'r_college', 'hq', 'mint', 'r_manufacture', 'monument'],
  brique: ['r_house', 'glassworks', 'tilery', 'limekiln', 'smelter'],
  colombage: ['bakery', 'weaver', 'spinner', 'butcher', 'saloir', 'tanner', 'cooper', 'r_cartwright', 'toolsmith', 'armory', 'potter'],
  pierre: ['tower', 'guardpost', 'barracks', 'goldmine', 'ironmine', 'coalmine', 'mquarry', 'vestige', 'r_slate', 'warehouse'],
};
const matiereDe = (type) => Object.keys(MATIERE).find((k) => MATIERE[k].includes(type)) || 'bois';
// pièces sans ouvrier (drapeaux, ailes de moulin) : on y voit les habitants
const SANS_TRAVAIL = new Set(['hq', 'tower', 'guardpost', 'vestige', 'mill', 'monument', 'pier', 'r_house', 'scout', 'forester']);
const PIECE = { w: 14, d: 13, h: 5 };
let dedans = null, texDedans = {};
async function texDe(f, rx, ry) {
  const t = texDedans[f] ||= await texture(f, { repeter: true });
  const c = t.clone(); c.repeat.set(rx, ry); c.needsUpdate = true; return c;
}
let entreeEnCours = false;
async function entrer(porte) {
  if (entreeEnCours || dedans) return;
  entreeEnCours = true;
  try { await entrerVraiment(porte); } catch (e) { console.error(e); fondu(false); } finally { entreeEnCours = false; }
}
async function entrerVraiment(porte) {
  const B = porte.b, I = V.interieurs[B.type] || { nom: B.nom, info: '', entree: {}, sortie: {} };
  $('#entrer').classList.remove('vu'); porteProche = null;
  fondu(true);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#2a1a0e');
  scene.fog = new THREE.Fog('#2a1a0e', 14, 30);
  const mat = matiereDe(B.type), M = V.matieres[mat], sol = ['tuffeau', 'brique', 'pierre'].includes(mat) ? 'sol-pave' : 'sol-bois';
  const W = PIECE.w, D = PIECE.d, H = PIECE.h;
  const mw = M.w * K, mh = M.h * K; // taille du dessin du mur, en mètres
  const mur = async (larg, x, z, ry) => {
    const t = await texDe(V.matieres[mat].f, larg / mw, H / mh);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(larg, H), new THREE.MeshBasicMaterial({ map: t, color: ry === 0 ? 0xffffff : 0xe6e0d8 }));
    m.position.set(x, H / 2, z); m.rotation.y = ry; scene.add(m);
  };
  await mur(W, 0, -D / 2, 0); await mur(D, -W / 2, 0, Math.PI / 2); await mur(D, W / 2, 0, -Math.PI / 2); await mur(W, 0, D / 2, Math.PI);
  const tSol = await texDe(V.matieres[sol].f, W / (128 * K), D / (128 * K));
  const plancher = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshBasicMaterial({ map: tSol }));
  plancher.rotation.x = -Math.PI / 2; scene.add(plancher);
  const tPl = await texDe(V.matieres.plafond.f, W / (128 * K), D / (128 * K));
  const plafond = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshBasicMaterial({ map: tPl, color: 0xcfc6bc }));
  plafond.rotation.x = Math.PI / 2; plafond.position.y = H; scene.add(plafond);
  // la porte (pour sortir), au milieu du mur de devant
  const porteMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.3), new THREE.MeshBasicMaterial({ map: textePorte() }));
  porteMesh.position.set(0, 1.15, D / 2 - 0.02); porteMesh.rotation.y = Math.PI; scene.add(porteMesh);
  const obst = [];
  const anim = [];
  // le travail : les pièces qui bougent dans Millépoques (ouvriers, presses, roues...), image par image
  if (I.travail && !SANS_TRAVAIL.has(B.type)) {
    const tr = I.travail, t = await texture(tr.f, { haut: false });
    const lw = tr.fw / tr.ss * K, lh = tr.fh / tr.ss * K;
    const s = Math.min(1.4, (W - 4) / lw, (H - 0.6) / lh);
    const geo = new THREE.PlaneGeometry(lw * s, lh * s);
    t.repeat.set(1 / tr.nc, 1 / Math.ceil(tr.n / tr.nc));
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: t, alphaTest: 0.5, side: THREE.DoubleSide }));
    // le pied (ancre) au sol : le bas de l'image est à -(oy + fh) pixels sous l'ancre
    const bas = -(tr.oy + tr.fh / tr.ss) * K * s;
    m.position.set(0, bas + lh * s / 2, -2.6);
    scene.add(m);
    obst.push({ x: 0, z: -2.6, rx: lw * s / 2 + 0.2, rz: 0.6 });
    const rangs = Math.ceil(tr.n / tr.nc);
    anim.push((temps) => { const k = Math.floor(temps / tr.dt) % tr.n; t.offset.set((k % tr.nc) / tr.nc, 1 - (Math.floor(k / tr.nc) + 1) / rangs); });
  } else {
    // les habitants chez eux, autour de la table
    const tTable = await texDe(V.matieres['sol-bois'].f, 2.2 / (128 * K), 1.1 / (128 * K));
    const table = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 1.1), new THREE.MeshBasicMaterial({ map: tTable, color: 0xd8b890 }));
    table.position.set(0, 0.4, -2.2); scene.add(table);
    obst.push({ x: 0, z: -2.2, rx: 1.3, rz: 0.75 });
    const lt = lots(PL.length);
    [[-1.7, -2.2], [1.7, -2.2], [0.6, -3.4]].forEach(([x, z], k) => { const h = V.habitants[2 + ((B.id + k * 3) % (V.habitants.length - 2))], i = h.vues.debout[0]; poserDebout(lt[V.images[i].r[0]], i, x, z); obst.push({ x, z, rx: 0.4, rz: 0.4 }); });
    lt.forEach((l, p) => { if (!l.centre.length) return; const m = new THREE.Mesh(l.geometrie(true), materiauDebout(PL[p])); m.frustumCulled = false; scene.add(m); });
    feuDeCheminee(scene, anim, W, D);
  }
  // les marchandises : ce qui entre (à gauche) et ce qui sort (à droite), sur des caisses
  const tCaisse = await texDe(V.matieres['sol-bois'].f, 0.9 / (128 * K) * 2, 0.7 / (128 * K) * 2);
  const matCaisse = new THREE.MeshBasicMaterial({ map: tCaisse, color: 0xf0d8b8 });
  const etal = (liste, x0, sens) => {
    Object.keys(liste).slice(0, 4).forEach((m, k) => {
      const i = V.marchandises[m]; if (i === undefined || i < 0) return;
      const x = x0, z = -3.4 + k * 1.4;
      const caisse = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.9), matCaisse);
      caisse.position.set(x, 0.35, z); scene.add(caisse);
      const lot = new Lot(); poserDebout(lot, i, x, z, 1.3, 0.7);
      // l'icône est posée par son coin haut gauche : on la centre au-dessus de la caisse
      const R = rectImage(i, 1.3); for (let j = 0; j < lot.coin.length; j += 2) { lot.coin[j] -= (R.x0 + R.x1) / 2; lot.coin[j + 1] -= R.y0; }
      const mesh = new THREE.Mesh(lot.geometrie(true), materiauDebout(PL[V.images[i].r[0]])); mesh.frustumCulled = false; scene.add(mesh);
      obst.push({ x, z, rx: 0.6, rz: 0.6 });
    });
  };
  etal(I.entree, -W / 2 + 0.9, 1); etal(I.sortie, W / 2 - 0.9, -1);
  // le panneau
  $('#fiche-nom').textContent = I.nom;
  $('#fiche-info').textContent = I.info || 'Ici, des habitants du village vivent et travaillent.';
  const recette = $('#fiche-recette'); recette.innerHTML = '';
  const icones = (liste) => Object.entries(liste).map(([m, n]) => `<span class="marchandise">${n > 1 ? `<b>${n}</b>` : ''}<img alt="${m}" src="${iconeURL(m)}"></span>`).join('');
  if (Object.keys(I.entree).length || Object.keys(I.sortie).length) recette.innerHTML = `${icones(I.entree)}${Object.keys(I.entree).length ? '<span class="fleche">➜</span>' : ''}${icones(I.sortie)}`;
  $('#fiche').classList.add('vu');
  const monde = {
    libre: (x, z) => {
      if (Math.abs(x) > W / 2 - 0.4 || z < -D / 2 + 0.4 || z > D / 2 - 0.3) return false;
      return !obst.some((o) => Math.abs(x - o.x) < o.rx && Math.abs(z - o.z) < o.rz);
    },
    cameraLibre: (x, z) => Math.abs(x) < W / 2 - 0.2 && Math.abs(z) < D / 2 - 0.2,
  };
  dedans = { scene, anim, monde, retour: { x: porte.x, z: porte.z + 0.8, yaw }, B };
  joueur.x = 0; joueur.z = 1.2; joueur.dx = 0; joueur.dz = -1; yaw = 0; pitch = 0.42; dist = 4.5;
  for (const c of gens.couches) if (c) scene.add(c.mesh);
  scene.add(ombreJoueur);
  son.porte();
  setTimeout(() => fondu(false), 80);
}
function sortir() {
  if (!dedans) return;
  fondu(true);
  const r = dedans.retour;
  dedans = null;
  for (const c of gens.couches) if (c) dehors.add(c.mesh);
  dehors.add(ombreJoueur);
  joueur.x = r.x; joueur.z = r.z; joueur.dx = 0; joueur.dz = 1; yaw = 0; pitch = 0.32; dist = 5.5;
  $('#fiche').classList.remove('vu'); $('#entrer').classList.remove('vu'); porteProche = null;
  son.porte();
  setTimeout(() => fondu(false), 80);
}
function feuDeCheminee(scene, anim, W, D) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 160; const x = c.getContext('2d');
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2), new THREE.MeshBasicMaterial({ map: t, transparent: true }));
  m.position.set(-3.6, 1, -D / 2 + 0.03); scene.add(m);
  anim.push((temps) => {
    x.clearRect(0, 0, 128, 160);
    // la cheminée de pierre et son feu (couleurs et trait de Millépoques)
    x.lineWidth = 6; x.strokeStyle = '#2a1a10'; x.fillStyle = '#cfc2a6'; x.beginPath(); x.roundRect(6, 30, 116, 126, 6); x.fill(); x.stroke();
    x.fillStyle = '#2a1a10'; x.beginPath(); x.roundRect(26, 70, 76, 86, [30, 30, 0, 0]); x.fill();
    for (let k = 0; k < 3; k++) {
      const f = 0.8 + 0.2 * Math.sin(temps * 9 + k * 2);
      x.fillStyle = ['#e8582a', '#f2a03a', '#ffe08a'][k];
      x.beginPath(); x.ellipse(64, 146 - k * 6, 26 - k * 7, (40 - k * 10) * f, 0, 0, Math.PI * 2); x.fill();
    }
    x.fillStyle = '#6b4a2e'; x.fillRect(36, 146, 56, 8);
    t.needsUpdate = true;
  });
}
function textePorte() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 224; const x = c.getContext('2d');
  x.fillStyle = '#6a3f22'; x.strokeStyle = '#2a160a'; x.lineWidth = 8;
  x.beginPath(); x.moveTo(8, 220); x.lineTo(8, 64); x.arc(64, 64, 56, Math.PI, 0); x.lineTo(120, 220); x.closePath(); x.fill(); x.stroke();
  x.lineWidth = 3; for (const px of [40, 64, 88]) { x.beginPath(); x.moveTo(px, 20); x.lineTo(px, 218); x.stroke(); }
  x.fillStyle = '#f2c14e'; x.beginPath(); x.arc(96, 130, 7, 0, 7); x.fill(); x.stroke();
  x.fillStyle = 'rgba(255,214,120,0.9)'; x.font = '900 22px Nunito, sans-serif'; x.textAlign = 'center';
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// les icônes de Millépoques (marchandises) en images pour la fiche
const icones = new Map();
function iconeURL(m) {
  if (icones.has(m)) return icones.get(m);
  const i = V.marchandises[m]; if (i === undefined || i < 0) return '';
  const [p, x, y, w, h] = V.images[i].r, img = PL[p].image;
  const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, x, y, w, h, 0, 0, w, h);
  const u = c.toDataURL(); icones.set(m, u); return u;
}

// ------------------------------------------------------------------------------------------------
// Les sons (Web Audio, synthétisés) : le vent, des oiseaux, les pas ; dedans, le bruit du travail
// ------------------------------------------------------------------------------------------------
const son = (() => {
  let ac = null, maitre = null, coupe = false, vent = null;
  const S = {
    demarrer() {
      if (ac) return;
      ac = new (window.AudioContext || window.webkitAudioContext)();
      maitre = ac.createGain(); maitre.gain.value = coupe ? 0 : 0.5; maitre.connect(ac.destination);
      // le vent : un bruit doux filtré
      const n = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = n.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = ac.createBufferSource(); src.buffer = n; src.loop = true;
      const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
      vent = ac.createGain(); vent.gain.value = 0.05;
      src.connect(f).connect(vent).connect(maitre); src.start();
    },
    couper(v) { coupe = v; if (maitre) maitre.gain.value = v ? 0 : 0.5; },
    get coupe() { return coupe; },
    note(freq, duree, type = 'sine', vol = 0.1, glisse = 0) {
      if (!ac || coupe) return;
      const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
      o.type = type; o.frequency.setValueAtTime(freq, t); if (glisse) o.frequency.exponentialRampToValueAtTime(freq * glisse, t + duree);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
      o.connect(g).connect(maitre); o.start(t); o.stop(t + duree + 0.05);
    },
    oiseau() { const f = 2200 + Math.random() * 1600; for (let k = 0; k < 2 + Math.floor(Math.random() * 3); k++) setTimeout(() => S.note(f * (1 + Math.random() * 0.2), 0.09, 'sine', 0.05, 1.3), k * 120); },
    pas() { S.note(140 + Math.random() * 40, 0.06, 'triangle', 0.05, 0.6); },
    porte() { S.note(220, 0.25, 'triangle', 0.1, 0.7); setTimeout(() => S.note(160, 0.2, 'triangle', 0.08, 0.8), 120); },
    toc() { S.note(320 + Math.random() * 60, 0.07, 'square', 0.03, 0.5); },
    dedans(v) { if (vent) vent.gain.value = v ? 0.01 : 0.05; },
  };
  return S;
})();

// ------------------------------------------------------------------------------------------------
// Écrans : titre, pause, carte, fondu
// ------------------------------------------------------------------------------------------------
let etat = 'titre';
const enJeu = () => etat === 'jeu';
function pause(oui) {
  if (etat === 'titre') return;
  etat = oui ? 'pause' : 'jeu';
  $('#pause').classList.toggle('ouvert', oui);
}
function basculerCarte() {
  const ouvert = $('#carte').classList.toggle('ouvert');
  etat = ouvert ? 'carte' : 'jeu';
  if (ouvert) dessinerCarte();
}
function dessinerCarte() {
  const c = $('#carte canvas'), img = $('#carte-img');
  if (!img.complete) { img.onload = dessinerCarte; return; }
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  const s = c.width / (V.w * T);
  const px = (dedans ? dedans.retour.x : joueur.x) * s, pz = (dedans ? dedans.retour.z : joueur.z) * s;
  x.save(); x.translate(px, pz); x.rotate(-yaw);
  x.beginPath(); x.moveTo(0, -14); x.lineTo(9, 9); x.lineTo(0, 4); x.lineTo(-9, 9); x.closePath();
  x.fillStyle = '#f2c14e'; x.fill(); x.lineWidth = 3; x.strokeStyle = '#3a2410'; x.stroke(); x.restore();
}
function fondu(oui) { $('#fondu').classList.toggle('vu', oui); }

// ------------------------------------------------------------------------------------------------
// La boucle
// ------------------------------------------------------------------------------------------------
const horloge = new THREE.Clock();
let temps = 0, tOiseau = 3, tPas = 0, tToc = 0, fpsT = 0, fpsN = 0;
const mondeDehors = { libre: (x, z) => libreVite(x, z), cameraLibre: (x, z) => caseLibre(x, z) || V.cases[Math.floor(z / T)]?.[Math.floor(x / T)] === '~' };
function boucle() {
  requestAnimationFrame(boucle);
  const dt = Math.min(0.05, horloge.getDelta());
  if (etat === 'titre') return;
  temps += dt;
  const monde = dedans ? dedans.monde : mondeDehors;
  if (enJeu()) {
    const c = commande();
    bougerJoueur(dt, c, monde);
    if (joueur.bouge && (tPas -= dt) < 0) { son.pas(); tPas = c.cours ? 0.22 : 0.36; }
  }
  if (!dedans) {
    bougerPassants(dt);
    chercherPorte(); batimentProche();
    if ((tOiseau -= dt) < 0) { son.oiseau(); tOiseau = 2 + Math.random() * 6; }
  } else {
    for (const f of dedans.anim) f(temps);
    if ((tToc -= dt) < 0 && dedans.anim.length) { son.toc(); tToc = 0.5 + Math.random() * 0.5; }
    // la porte de sortie : en approchant du mur de devant
    const pres = joueur.z > PIECE.d / 2 - 0.8 && Math.abs(joueur.x) < 1;
    $('#entrer').classList.toggle('vu', pres);
    if (pres) $('#entrer-nom').textContent = 'Sortir';
  }
  son.dedans(!!dedans);
  // les gens
  const iJ = imageMarche(joueur.h, joueur.dx, joueur.dz, joueur.pas, joueur.bouge);
  gens.poser(0, iJ, joueur.x, joueur.z);
  passants.forEach((p, k) => {
    if (dedans) { for (const c of gens.couches) if (c) c.cacher(k + 1); return; }
    const i = imageMarche(p.h, p.dx, p.dz, p.pas, p.bouge);
    gens.poser(k + 1, i, p.x, p.z);
  });
  for (const c of gens.couches) if (c) c.fini();
  ombreJoueur.position.set(joueur.x, 0.04, joueur.z);
  placerCamera(dt, monde);
  rendu.render(dedans ? dedans.scene : dehors, camera);
  // résolution qui baisse toute seule si l'appareil peine
  fpsT += dt; fpsN++;
  if (fpsT > 3) { const fps = fpsN / fpsT; if (fps < 32 && qualite > 0.6) { qualite -= 0.15; taille(); } fpsT = 0; fpsN = 0; }
}

// ------------------------------------------------------------------------------------------------
// Départ
// ------------------------------------------------------------------------------------------------
taille();
dehors.add(ombreJoueur);
construire((p) => { $('#charge i').style.width = Math.round(p * 100) + '%'; }).then(() => {
  $('#charge').classList.add('fini');
  $('#jouer').disabled = false; $('#jouer').textContent = 'Jouer ▸';
  $('#carte-img').src = DONNEES + V.carte;
  placerCamera(0, mondeDehors);
  requestAnimationFrame(boucle);
}).catch((e) => { console.error(e); $('#charge').textContent = 'Le village n’a pas pu se charger. Ouvre la page depuis le site des jeux.'; });
$('#jouer').addEventListener('click', () => { son.demarrer(); $('#titre').classList.add('cache'); etat = 'jeu'; horloge.getDelta(); });
$('#bouton-pause').addEventListener('click', () => pause(true));
$('#reprendre').addEventListener('click', () => pause(false));
$('#bouton-carte').addEventListener('click', () => { if (enJeu()) basculerCarte(); });
$('#carte').addEventListener('click', () => basculerCarte());
$('#entrer').addEventListener('click', () => actionPorte());
$('#sortir').addEventListener('click', () => sortir());
$('#depart').addEventListener('click', () => { if (dedans) sortir(); joueur.x = V.depart.x * T; joueur.z = V.depart.y * T; yaw = 0; pause(false); });
const majSon = () => { for (const b of document.querySelectorAll('.bouton-son')) b.classList.toggle('coupe', son.coupe); };
for (const b of document.querySelectorAll('.bouton-son')) b.addEventListener('click', () => { son.couper(!son.coupe); majSon(); });
window.VILLAGE = { get joueur() { return joueur; }, get yaw() { return yaw; }, set yaw(v) { yaw = v; }, set pitch(v) { pitch = v; }, set dist(v) { dist = v; }, entrer: (n) => entrer(PORTES.find((p) => p.b.type === n) || PORTES[n]), sortir, PORTES: () => PORTES, jouer: () => $('#jouer').click() };
