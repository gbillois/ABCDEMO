// Le Village de Millépoques : une vraie promenade en 3D dans un village de Millépoques.
// Tout ce qu'on voit a été dessiné par le code de Millépoques (cuisson : outils/village/cuisson/), puis posé en 3D :
//   - le sol : les morceaux du sol de Millépoques sur le relief de sa carte (relief.js : prés, montagnes, lits des
//     rivières, eau qui bouge) ; les ponts de la partie en 3D, aux couleurs des ponts de Millépoques ;
//   - les bâtiments : un volume (murs, débord du toit, toit qui monte vers le faîtage, cheminées en blocs) taillé dans
//     la silhouette du dessin, la façade de Millépoques projetée dessus, un trait sombre sur les arêtes ; ce qui dépasse
//     (mâts) est posé sur le faîtage, ce qui est à côté (enclos, établis) devant, en carton épais, ce qui est au sol à plat ;
//   - les arbres, rochers, drapeaux, bateaux, animaux : des images debout qui se tournent vers nous ;
//   - les habitants et Millie : des personnages en 3D (gens.js) au visage dessiné par Millépoques, qui marchent ;
//   - dedans : une pièce aux murs dessinés par Millépoques, et les ouvriers du bâtiment qui travaillent (leurs gestes
//     du jeu, image par image), le nom du métier, ce qu'il transforme et l'explication de Millépoques.
// Le soleil (à l'ouest, comme les ombres peintes des arbres) fait de vraies ombres.
import * as THREE from 'three';
import { Relief, Ponts, eauMateriau, EAU_Y } from './relief.js';
import { Foule } from './gens.js';

const DONNEES = 'donnees/';
const T = 2.5; // mètres par case
const K = T / 40; // mètres par pixel de Millépoques
const ECHELLE_GENS = K * 1.08;
const BLOQUE = new Set(['B', '~', 'R', '#']);
const TRAIT = '#2a1a10';
const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;

// ------------------------------------------------------------------------------------------------
// Le moteur 3D, la lumière, le ciel
// ------------------------------------------------------------------------------------------------
const toile = $('#jeu');
const rendu = new THREE.WebGLRenderer({ canvas: toile, antialias: true, powerPreference: 'high-performance' });
rendu.outputColorSpace = THREE.SRGBColorSpace;
rendu.toneMapping = THREE.NoToneMapping; // les couleurs de Millépoques telles quelles
rendu.shadowMap.enabled = true;
rendu.shadowMap.type = THREE.PCFSoftShadowMap;
const HORIZON = new THREE.Color('#bfe3f4');
const dehors = new THREE.Scene();
dehors.background = HORIZON;
dehors.fog = new THREE.Fog(HORIZON, 70, 230);
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 600);
let qualite = 1;
function taille() {
  const w = innerWidth, h = innerHeight;
  rendu.setPixelRatio(Math.min(devicePixelRatio || 1, 2) * qualite);
  rendu.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', taille);

// Le soleil vient de l'ouest, assez haut : les ombres des bâtiments vont vers l'est, comme celles des arbres peints
// par Millépoques. La lumière ambiante est forte : les façades (au sud) gardent les couleurs du dessin.
const VERS_SOLEIL = new THREE.Vector3(-0.62, 0.74, 0.26).normalize();
const AMBIANTE = new THREE.HemisphereLight('#fff8ec', '#d8e4c8', Math.PI * 0.74);
const SOLEIL = new THREE.DirectionalLight('#fff3dc', Math.PI * 0.56);
SOLEIL.shadow.radius = 3;
SOLEIL.castShadow = true;
SOLEIL.shadow.mapSize.set(2048, 2048);
Object.assign(SOLEIL.shadow.camera, { left: -38, right: 38, top: 38, bottom: -38, near: 1, far: 220 });
SOLEIL.shadow.bias = -0.0004; SOLEIL.shadow.normalBias = 0.03;
dehors.add(AMBIANTE, SOLEIL, SOLEIL.target);
// le ciel : un dégradé, du bleu de Millépoques en haut au blanc bleuté de l'horizon
const ciel = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), new THREE.ShaderMaterial({
  uniforms: { haut: { value: new THREE.Color('#6fb8ea') }, bas: { value: HORIZON } },
  vertexShader: 'varying vec3 vP; void main() { vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: 'uniform vec3 haut; uniform vec3 bas; varying vec3 vP; void main() { float h = clamp(normalize(vP).y * 2.2, 0.0, 1.0); gl_FragColor = vec4(mix(bas, haut, pow(h, 0.8)), 1.0);\n#include <colorspace_fragment>\n}',
  side: THREE.BackSide, depthWrite: false, fog: false,
}));
ciel.renderOrder = -1;
dehors.add(ciel);
function suivreSoleil(x, y, z) {
  // le carré d'ombre suit Millie, calé sur la grille de ses pixels (sinon les ombres scintillent)
  const pas = 76 / 2048;
  const c = SOLEIL.shadow.camera, m = new THREE.Matrix4().lookAt(VERS_SOLEIL, new THREE.Vector3(), new THREE.Vector3(0, 1, 0));
  const p = new THREE.Vector3(x, y, z).applyMatrix4(m.clone().invert());
  p.x = Math.round(p.x / pas) * pas; p.y = Math.round(p.y / pas) * pas;
  p.applyMatrix4(m);
  SOLEIL.target.position.copy(p); SOLEIL.position.copy(p).addScaledVector(VERS_SOLEIL, 110);
  c.updateProjectionMatrix();
}

const chargeur = new THREE.TextureLoader();
function texture(url, { repeter = false, haut = true } = {}) {
  return new Promise((ok, ko) => chargeur.load(DONNEES + url, (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.flipY = !haut;
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

// Le sol : l'image de Millépoques, et un grain très fin par-dessus (de près, l'herbe ne paraît plus floue)
const GRAIN = (() => {
  const n = 128, c = document.createElement('canvas'); c.width = c.height = n; const x = c.getContext('2d'), im = x.createImageData(n, n);
  let r = 7; const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  const v = new Float32Array(n * n).map(() => rnd());
  for (let k = 0; k < 2; k++) for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) v[j * n + i] = (v[j * n + i] * 2 + v[j * n + (i + 1) % n] + v[((j + 1) % n) * n + i]) / 4;
  for (let i = 0; i < n * n; i++) { const g = Math.round(clamp((v[i] - 0.5) * 2.6 + 0.5, 0, 1) * 255); im.data.set([g, g, g, 255], i * 4); }
  x.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
})();
function materiauSol(map) {
  const m = new THREE.MeshLambertMaterial({ map, color: '#ececec' });
  m.onBeforeCompile = (s) => {
    s.uniforms.grain = { value: GRAIN };
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vMonde;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvMonde = (modelMatrix * vec4(transformed, 1.0)).xz;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vMonde;\nuniform sampler2D grain;')
      .replace('#include <map_fragment>', '#include <map_fragment>\nfloat gr = texture2D(grain, vMonde * 0.55).r * 0.6 + texture2D(grain, vMonde * 2.1).r * 0.4;\ndiffuseColor.rgb *= 0.9 + 0.2 * gr;');
  };
  return m;
}

// Un volume tout près de la caméra s'efface (tramé), au lieu de couper l'image en gros morceau
function effacerPres(m) {
  const avant = m.onBeforeCompile;
  m.onBeforeCompile = (s, r) => {
    avant?.call(m, s, r);
    s.fragmentShader = s.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
      { float dc = length(vViewPosition); float tr = fract(dot(floor(gl_FragCoord.xy), vec2(0.5, 0.25)) + 0.125);
        if (dc < 2.6 && tr > (dc - 1.0) / 1.6) discard; }`);
  };
  return m;
}

// ------------------------------------------------------------------------------------------------
// Les données de la cuisson
// ------------------------------------------------------------------------------------------------
let V, PL = [], relief, ponts;
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
  constructor() { this.pos = []; this.uv = []; this.nor = []; this.col = []; this.centre = []; this.coin = []; }
  geometrie(debout = false) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(debout ? this.centre : this.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    if (this.nor.length) g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    if (this.col.length) g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    if (debout) { g.setAttribute('centre', new THREE.Float32BufferAttribute(this.centre, 3)); g.setAttribute('coin', new THREE.Float32BufferAttribute(this.coin, 2)); }
    g.computeBoundingSphere();
    if (debout) g.boundingSphere.radius += 12;
    return g;
  }
}
const lots = (n) => Array.from({ length: n }, () => new Lot());

// ------------------------------------------------------------------------------------------------
// Les bâtiments en volume
// ------------------------------------------------------------------------------------------------
const OBSTACLES = []; // cercles : arbres, rochers
const PORTES = []; // { x, z, y, b }
const DEBORD = 0.24, CHUTE = 0.1; // le toit déborde des murs (mètres), un peu plus bas que le haut du mur
const TOIT_M = 6; // la couverture dessinée couvre 6 m
// ton d'une face selon son orientation (les dessins de Millépoques : ombre côté nord et est)
const tonFace = (n) => 1 - 0.17 * Math.max(0, -n.z) - 0.09 * Math.max(0, n.x) + 0.04 * Math.max(0, n.y);
const MUR_M = [16, 4]; // le dessin d'un mur d'intérieur couvre 16 m sur 4 m
// La place prise par les bâtiments (hauteur du toit, par mètre carré) : la caméra ne rentre pas dedans
let occupation = null;
function occuper(x0, x1, z0, z1, y) {
  for (let z = Math.floor(z0); z <= Math.ceil(z1); z++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
    if (x < 0 || z < 0 || x >= occupation.w || z >= occupation.h) continue;
    const k = z * occupation.w + x; occupation.y[k] = Math.max(occupation.y[k], y);
  }
}
const dansBatiment = (x, z, y) => { if (!occupation) return false; const xi = Math.floor(x), zi = Math.floor(z); if (xi < 0 || zi < 0 || xi >= occupation.w || zi >= occupation.h) return false; return y < occupation.y[zi * occupation.w + xi] + 0.3; };
function batiments(lotsVol, lotsPlat, lotsToit, lotsMur) {
  occupation = { w: Math.ceil(V.w * T), h: Math.ceil(V.h * T) }; occupation.y = new Float32Array(occupation.w * occupation.h).fill(-99);
  const v3 = new THREE.Vector3(), a = new THREE.Vector3(), b2 = new THREE.Vector3(), n = new THREE.Vector3();
  for (const B of V.batiments) {
    const M = V.modeles[B.m];
    const AX = B.x * T, AZ = B.y * T, Y0 = B.base; // ancre (milieu du bas de l'emprise), hauteur du plateau
    const zf = AZ - 2 * K;
    const prof = Math.max(22, B.bh * 40 - 10) * K; // profondeur
    const zb = zf - prof, zm = (zf + zb) / 2;
    if (M.facade !== undefined && M.corps.length) {
      const F = rectImage(M.facade), f = V.images[M.facade], fr = uvDe(M.facade);
      const lot = lotsVol[F.p];
      // pixel de Millépoques (x par rapport à l'ancre, hauteur h au-dessus du sol) -> coordonnées dans la planche
      const uvPx = (x, h) => {
        const ix = clamp((x - f.ox) * V.ss, 0.5, fr.w - 0.5), iy = clamp((-h - f.oy) * V.ss, 0.5, fr.h - 0.5);
        return [(fr.x + ix) / fr.W, (fr.y + iy) / fr.H];
      };
      const X = (x) => AX + x * K, Y = (h) => Y0 + h * K;
      for (const c of M.corps) {
        const xs = c.h.map((_, k) => Math.min(c.a + 2 * k, c.b));
        const hs = c.h.map((h) => h + 0.5);
        const haut = (x) => { const k = clamp((x - c.a) / 2, 0, hs.length - 1), k0 = Math.floor(k), k1 = Math.min(hs.length - 1, k0 + 1); return lerp(hs[k0], hs[k1], k - k0); };
        const centre = new THREE.Vector3(AX + (c.a + c.b) / 2 * K, Y0 + c.hw * K * 0.5, zm);
        // un triangle : trois sommets [x, y, z] en mètres, et leurs pixels de façade [x, h] ; normale vers dehors
        const tri = (P, U) => {
          a.set(...P[1]).sub(v3.set(...P[0])); b2.set(...P[2]).sub(v3.set(...P[0]));
          n.crossVectors(a, b2); if (n.lengthSq() < 1e-12) return; n.normalize();
          v3.set((P[0][0] + P[1][0] + P[2][0]) / 3, (P[0][1] + P[1][1] + P[2][1]) / 3, (P[0][2] + P[1][2] + P[2][2]) / 3).sub(centre);
          if (n.dot(v3) < 0) n.negate();
          const l = tonFace(n);
          for (let k = 0; k < 3; k++) { lot.pos.push(...P[k]); lot.uv.push(...uvPx(U[k][0], U[k][1])); lot.nor.push(n.x, n.y, n.z); lot.col.push(l, l, l); }
        };
        const quad = (P, U) => { tri([P[0], P[1], P[2]], [U[0], U[1], U[2]]); tri([P[0], P[2], P[3]], [U[0], U[2], U[3]]); };
        // un pan de toit vu de côté ou de dos : la couverture de Millépoques, répétée (pas la façade étirée)
        const lt = lotsToit(c.toit || 'rslate');
        const pan = (P) => {
          a.set(...P[1]).sub(v3.set(...P[0])); b2.set(...P[2]).sub(v3.set(...P[0]));
          n.crossVectors(a, b2); if (n.lengthSq() < 1e-12) return false; n.normalize();
          v3.set((P[0][0] + P[2][0]) / 2, (P[0][1] + P[2][1]) / 2, (P[0][2] + P[2][2]) / 2).sub(centre);
          if (n.dot(v3) < 0) n.negate();
          const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
          const uvM = (q) => (ay >= ax && ay >= az ? [q[0], q[2]] : ax >= az ? [q[2], -q[1]] : [q[0], -q[1]]).map((v) => v / TOIT_M);
          const l = tonFace(n);
          for (const k of [0, 1, 2, 0, 2, 3]) { lt.pos.push(...P[k]); lt.uv.push(...uvM(P[k])); lt.nor.push(n.x, n.y, n.z); lt.col.push(l, l, l); }
          return true;
        };
        // la tranche d'une colonne : pied, haut du mur, bord du toit (débord), faîtage, et de même derrière
        const tranche = (x, t) => {
          const w = Math.min(t, c.hw), toit = t > c.hw + 1, ov = toit ? DEBORD : 0, ch = toit ? CHUTE / K : 0;
          return { x, t, w, P: [[X(x), Y0 - 0.4, zf], [X(x), Y(w), zf], [X(x), Y(w) - ch * K, zf + ov], [X(x), Y(t), zm], [X(x), Y(w) - ch * K, zb - ov], [X(x), Y(w), zb], [X(x), Y0 - 0.4, zb]],
            U: [[x, -6], [x, w], [x, w], [x, t], [x, w], [x, w], [x, -6]] };
        };
        let avant = tranche(xs[0], hs[0]);
        for (let k = 0; k + 1 < xs.length; k++) {
          if (xs[k + 1] <= xs[k]) continue;
          const apres = tranche(xs[k + 1], hs[k + 1]);
          for (let s = 0; s < 6; s++) {
            const P = [avant.P[s], apres.P[s], apres.P[s + 1], avant.P[s + 1]];
            // pente de derrière, ou pente de devant tournée sur le côté (croupe) : la couverture
            if (s === 3 || s === 2) {
              a.set(...P[1]).sub(v3.set(...P[0])); b2.set(...P[3]).sub(v3.set(...P[0])); n.crossVectors(a, b2).normalize();
              const toit = avant.t > c.hw + 1 || apres.t > c.hw + 1;
              // pente de derrière, croupe tournée sur le côté, ou dessus plat (vu d'en haut) : la couverture
              if ((toit && (s === 3 || Math.abs(n.x) > 0.55)) || (!toit && Math.abs(n.y) > 0.85)) { if (pan(P)) continue; }
            }
            quad(P, [avant.U[s], apres.U[s], apres.U[s + 1], avant.U[s + 1]]);
          }
          avant = apres;
        }
        // pignons des deux bouts : la façade étalée sur la profondeur (une fenêtre de côté, comme une vraie maison)
        for (const bout of [0, xs.length - 1]) {
          const x = xs[bout], t = hs[bout], wt = Math.min(t, c.hw), gauche = bout === 0;
          const zs = [zf, zf, zm, zb, zb], ys = [-6, wt, t, wt, -6];
          const P = zs.map((z, k) => [X(x), Y(ys[k]), z]);
          const U = zs.map((z, k) => {
            const s = (z - zb) / (zf - zb), ux = gauche ? c.a + s * (c.b - c.a) : c.b - s * (c.b - c.a);
            return [ux, Math.min(ys[k], haut(ux) - 1)];
          });
          // le pignon : le mur de Millépoques (pierre, brique, colombage, bois), ses fenêtres à chaque étage
          const lm = lotsMur(matiereDe(B.type));
          a.set(...P[1]).sub(v3.set(...P[0])); b2.set(...P[2]).sub(v3.set(...P[0])); n.crossVectors(a, b2).normalize();
          if (n.x * (gauche ? -1 : 1) < 0) n.negate();
          const l = tonFace(n), uvM = (q) => [(gauche ? q[2] : -q[2]) / MUR_M[0], (q[1] - Y0) / MUR_M[1]];
          for (const k of [0, 1, 2, 0, 2, 3, 0, 3, 4]) { lm.pos.push(...P[k]); lm.uv.push(...uvM(P[k])); lm.nor.push(n.x, n.y, n.z); lm.col.push(l, l, l); }
        }
        occuper(X(c.a), X(c.b), zb - DEBORD, zf + DEBORD, Y(Math.max(...hs)));
      }
      // les cheminées : des blocs plantés sur le faîtage, la façade de Millépoques projetée dessus
      for (const [x0, x1, top] of M.cheminees || []) {
        const c = M.corps.find((cc) => (x0 + x1) / 2 >= cc.a && (x0 + x1) / 2 <= cc.b) || M.corps[0];
        const bas = c.hw, d = Math.min((x1 - x0) * K, prof * 0.5), z0 = zm - d / 2, z1 = zm + d / 2;
        const centre = new THREE.Vector3(X((x0 + x1) / 2), Y((bas + top) / 2), zm);
        const tri = (P, U) => {
          a.set(...P[1]).sub(v3.set(...P[0])); b2.set(...P[2]).sub(v3.set(...P[0])); n.crossVectors(a, b2).normalize();
          v3.set((P[0][0] + P[1][0] + P[2][0]) / 3, (P[0][1] + P[1][1] + P[2][1]) / 3, (P[0][2] + P[1][2] + P[2][2]) / 3).sub(centre); if (n.dot(v3) < 0) n.negate();
          const l = tonFace(n);
          for (let k = 0; k < 3; k++) { lot.pos.push(...P[k]); lot.uv.push(...uvPx(U[k][0], U[k][1])); lot.nor.push(n.x, n.y, n.z); lot.col.push(l, l, l); }
        };
        const quad = (P, U) => { tri([P[0], P[1], P[2]], [U[0], U[1], U[2]]); tri([P[0], P[2], P[3]], [U[0], U[2], U[3]]); };
        const hx = (z) => x0 + (z - z0) / (z1 - z0) * (x1 - x0); // côtés : la cheminée étalée sur sa profondeur
        for (const z of [z0, z1]) quad([[X(x0), Y(bas), z], [X(x1), Y(bas), z], [X(x1), Y(top), z], [X(x0), Y(top), z]], [[x0, bas], [x1, bas], [x1, top], [x0, top]]);
        for (const x of [x0, x1]) quad([[X(x), Y(bas), z0], [X(x), Y(bas), z1], [X(x), Y(top), z1], [X(x), Y(top), z0]], [[hx(z0), bas], [hx(z1), bas], [hx(z1), top], [hx(z0), top]]);
        quad([[X(x0), Y(top), z0], [X(x1), Y(top), z0], [X(x1), Y(top), z1], [X(x0), Y(top), z1]], [[x0, top - 1], [x1, top - 1], [x1, top - 1], [x0, top - 1]]);
      }
    }
    // ce qui dépasse du toit (sur le faîtage) ; ce qui est à côté (devant), en carton épais ; ce qui est au sol (à plat)
    const plaque = (i, z, couches) => {
      const R = rectImage(i), lot = lotsPlat[R.p];
      for (const [dz, l] of couches) {
        const P = [[AX + R.x0, Y0 + R.y0, z + dz], [AX + R.x1, Y0 + R.y0, z + dz], [AX + R.x1, Y0 + R.y1, z + dz], [AX + R.x0, Y0 + R.y1, z + dz]];
        const U = [[R.u0, R.v0], [R.u1, R.v0], [R.u1, R.v1], [R.u0, R.v1]];
        for (const k of [0, 1, 2, 0, 2, 3]) { lot.pos.push(...P[k]); lot.uv.push(...U[k]); lot.col.push(l, l, l); lot.nor.push(0, 0, 1); }
      }
    };
    const EPAIS = [[0, 1], [-0.03, 0.62], [-0.06, 0.62], [-0.09, 1]];
    if (M.dessus !== undefined) plaque(M.dessus, zm + 0.045, EPAIS);
    if (M.cotes !== undefined) plaque(M.cotes, zf + 0.06, EPAIS);
    if (M.sol !== undefined) {
      const R = rectImage(M.sol), lot = lotsPlat[R.p];
      // à plat : le haut de l'image est au nord (z plus petit) ; la ligne du sol (ancre) est au bord du bâtiment
      const z0 = AZ - R.y1, z1 = AZ - R.y0, hS = (x, z) => relief.hauteur(x, z) + 0.035;
      const P = [[AX + R.x0, 0, z1], [AX + R.x1, 0, z1], [AX + R.x1, 0, z0], [AX + R.x0, 0, z0]];
      const U = [[R.u0, R.v0], [R.u1, R.v0], [R.u1, R.v1], [R.u0, R.v1]];
      // posé sur le relief (découpé en petits carreaux pour suivre le sol)
      const nx = 4, nz = 4;
      for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
        const q = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]].map(([u, v]) => {
          const x = lerp(P[0][0], P[1][0], u / nx), z = lerp(P[0][2], P[3][2], v / nz);
          return { p: [x, hS(x, z), z], uv: [lerp(U[0][0], U[1][0], u / nx), lerp(U[0][1], U[3][1], v / nz)] };
        });
        for (const k of [0, 1, 2, 0, 2, 3]) { lot.pos.push(...q[k].p); lot.uv.push(...q[k].uv); lot.col.push(1, 1, 1); lot.nor.push(0, 1, 0); }
      }
    }
    const px = (B.bx + B.bw * B.porte) * T;
    PORTES.push({ x: px, z: AZ + 0.2, y: Y0, b: B });
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
// Le monde : où l'on peut marcher, à quelle hauteur
// ------------------------------------------------------------------------------------------------
function caseLibre(x, z) {
  const cx = Math.floor(x / T), cz = Math.floor(z / T);
  if (cz < 0 || cx < 0 || cz >= V.h || cx >= V.w) return false;
  return !BLOQUE.has(V.cases[cz][cx]);
}
let grilleObs = null;
function obstaclesPres(x, z) { return grilleObs.get(`${Math.floor(x / 4)},${Math.floor(z / 4)}`) || []; }
function libreVite(x, z, r = 0.3) {
  for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r], [r * 0.7, r * 0.7], [-r * 0.7, r * 0.7], [r * 0.7, -r * 0.7], [-r * 0.7, -r * 0.7]]) if (!caseLibre(x + dx, z + dz)) return false;
  for (const o of obstaclesPres(x, z)) { const ddx = x - o.x, ddz = z - o.z; if (ddx * ddx + ddz * ddz < (o.r + r) ** 2) return false; }
  // pas de pente trop raide (les falaises des montagnes)
  return true;
}
/** La hauteur des pieds en (x, z) : sur un pont, son tablier ; sinon le sol. */
function solEn(x, z) { const p = ponts?.hauteur(x, z); return p ?? relief.hauteur(x, z); }

// ------------------------------------------------------------------------------------------------
// Construction de la scène du dehors
// ------------------------------------------------------------------------------------------------
let foule, joueur, passants = [];
const NB_PASSANTS = 30, NB_CHEZ = 3; // passants dehors ; habitants dans une maison
const SLOT_CHEZ = 1 + NB_PASSANTS;
async function construire(progres) {
  V = await (await fetch(DONNEES + 'village.json')).json();
  progres(0.08);
  relief = new Relief(V, T);
  ponts = new Ponts(V, T, K, relief);
  PL = await Promise.all(V.planches.map((p) => texture(p.f)));
  progres(0.35);
  // le sol, sur le relief
  await Promise.all(V.sol.morceaux.map(async (m) => {
    const t = await texture(m.f, { haut: false });
    t.anisotropy = rendu.capabilities.getMaxAnisotropy();
    const mesh = new THREE.Mesh(relief.morceau(m), materiauSol(t));
    mesh.receiveShadow = true;
    dehors.add(mesh);
  }));
  progres(0.6);
  { // le pays de loin (sous le sol de près)
    const t = await texture(V.loin, { haut: false });
    dehors.add(new THREE.Mesh(relief.loin(), new THREE.MeshLambertMaterial({ map: t, color: '#ececec' })));
  }
  // l'eau
  const eauMat = eauMateriau();
  const eau = new THREE.Mesh(relief.eauGeometrie(), eauMat); eau.renderOrder = 2; eau.receiveShadow = true;
  dehors.add(eau);
  animations.push((t) => eauMat.userData.animer(t));
  // les ponts
  const tm = async (f, rx, ry, couleur = '#ffffff') => { const t = await texture(f, { repeter: true }); t.repeat.set(rx, ry); return new THREE.MeshLambertMaterial({ map: t, color: couleur }); };
  const texPonts = {};
  for (const look of ['roman', 'medieval', 'renaissance']) texPonts[look] = { face: await tm(`dedans-pont-${look}.webp`, 1 / (128 * K), 1 / (64 * K), '#d9d1c4'), dalles: await tm(`dedans-pont-${look}-dalles.webp`, 1 / (64 * K), 1 / (64 * K)) };
  texPonts.wood = { planches: await tm('dedans-pont-bois.webp', 1 / (64 * K), 1 / (64 * K)), poutre: new THREE.MeshLambertMaterial({ color: '#8f6435' }), poteau: new THREE.MeshLambertMaterial({ color: '#5a3418' }) };
  dehors.add(ponts.construire(texPonts));
  progres(0.7);
  // les bâtiments
  const vol = lots(PL.length), plat = lots(PL.length), toits = new Map(), murs = new Map();
  batiments(vol, plat, (st) => { if (!toits.has(st)) toits.set(st, new Lot()); return toits.get(st); }, (m) => { if (!murs.has(m)) murs.set(m, new Lot()); return murs.get(m); });
  for (const [m, l] of murs) {
    const t = await texture(V.matieres[m].f, { repeter: true });
    const mesh = new THREE.Mesh(l.geometrie(), effacerPres(new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide, vertexColors: true, color: new THREE.Color(1.05, 1.05, 1.05) })));
    mesh.castShadow = true; mesh.receiveShadow = true; dehors.add(mesh);
  }
  for (const [st, l] of toits) {
    const t = await texture(`dedans-toit-${st}.webp`, { repeter: true }); t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping;
    const m = new THREE.Mesh(l.geometrie(), effacerPres(new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide, vertexColors: true, color: new THREE.Color(1.05, 1.05, 1.05) })));
    m.castShadow = true; m.receiveShadow = true; dehors.add(m);
  }
  const aretes = [];
  vol.forEach((l, p) => {
    if (!l.pos.length) return;
    const geo = l.geometrie();
    const m = new THREE.Mesh(geo, effacerPres(new THREE.MeshLambertMaterial({ map: PL[p], side: THREE.DoubleSide, alphaTest: 0.5, vertexColors: true, color: new THREE.Color(1.1, 1.1, 1.1) })));
    m.castShadow = true; m.receiveShadow = true; dehors.add(m);
    aretes.push(new THREE.EdgesGeometry(geo, 38));
  });
  // le trait sombre des arêtes (les contours de Millépoques)
  for (const g of aretes) dehors.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: TRAIT, transparent: true, opacity: 0.55 })));
  plat.forEach((l, p) => {
    if (!l.pos.length) return;
    const m = new THREE.Mesh(l.geometrie(), effacerPres(new THREE.MeshLambertMaterial({ map: PL[p], side: THREE.DoubleSide, alphaTest: 0.5, vertexColors: true })));
    m.castShadow = true; m.receiveShadow = true; dehors.add(m);
  });
  // les images debout, posées sur le relief
  const deb = lots(PL.length);
  for (const o of V.objets) {
    const x = o.x * T, z = o.y * T;
    poserDebout(deb[V.images[o.i].r[0]], o.i, x, z, o.s, solEn(x, z) - 0.04);
    if (o.k === 'arbre' && o.s > 0.5) OBSTACLES.push({ x, z, r: 0.35 * o.s });
    else if (o.k === 'rocher') OBSTACLES.push({ x, z, r: 0.6 });
  }
  deb.forEach((l, p) => { if (l.centre.length) { const m = new THREE.Mesh(l.geometrie(true), materiauDebout(PL[p])); m.frustumCulled = false; dehors.add(m); } });
  grilleObs = new Map();
  for (const o of OBSTACLES) for (let gx = Math.floor((o.x - o.r - 1) / 4); gx <= Math.floor((o.x + o.r + 1) / 4); gx++) for (let gz = Math.floor((o.z - o.r - 1) / 4); gz <= Math.floor((o.z + o.r + 1) / 4); gz++) {
    const k = `${gx},${gz}`; if (!grilleObs.has(k)) grilleObs.set(k, []); grilleObs.get(k).push(o);
  }
  progres(0.85);
  // les gens en 3D
  const texTetes = await texture(V.tetes.f);
  texTetes.anisotropy = 4;
  foule = new Foule(V, texTetes, 1 + NB_PASSANTS + NB_CHEZ, ECHELLE_GENS);
  dehors.add(foule.groupe);
  foule.habiller(0, V.habitants[0]);
  joueur = { x: V.depart.x * T, z: V.depart.y * T, dx: 0, dz: 1, v: 0, cours: false };
  // les passants : sur les routes, aller et retour
  const routes = V.routes.filter((r) => r.length >= 4);
  for (let k = 0; k < NB_PASSANTS && routes.length; k++) {
    const route = routes[(k * 7919) % routes.length].map(([x, y]) => [(x + 0.5) * T, (y + 0.5) * T]);
    foule.habiller(1 + k, V.habitants[1 + (k % (V.habitants.length - 1))]);
    passants.push({ route, i: 0, sens: 1, x: route[0][0], z: route[0][1], dx: 0, dz: 1, v: 0, vit: 1.0 + Math.random() * 0.35, pause: Math.random() * 2 });
  }
  progres(1);
}
const animations = [];
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
function bougerJoueur(dt, c, monde) {
  const l = Math.hypot(c.x, c.y);
  joueur.cours = c.cours;
  if (l < 0.05) { joueur.v = 0; return; }
  const v = (c.cours ? 4.4 : 2.2) * Math.min(1, l);
  // dans le repère de la caméra
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
  const dx = (rx * c.x - fx * c.y) / Math.max(l, 1), dz = (rz * c.x - fz * c.y) / Math.max(l, 1);
  const ox = joueur.x, oz = joueur.z;
  const nx = joueur.x + dx * v * dt, nz = joueur.z + dz * v * dt;
  const ok = monde.libre;
  if (ok(nx, nz)) { joueur.x = nx; joueur.z = nz; } else if (ok(nx, joueur.z)) joueur.x = nx; else if (ok(joueur.x, nz)) joueur.z = nz;
  joueur.dx = dx; joueur.dz = dz;
  joueur.v = Math.hypot(joueur.x - ox, joueur.z - oz) / Math.max(dt, 1e-4);
}
const cible = new THREE.Vector3();
let distVue = 5, cibleY = 0;
function placerCamera(dt, monde) {
  const yJ = monde.sol(joueur.x, joueur.z);
  cibleY = dt ? lerp(cibleY, yJ, Math.min(1, dt * 8)) : yJ;
  cible.set(joueur.x, cibleY + 1.15, joueur.z);
  let d = dist;
  // si le relief cache Millie, la caméra monte (elle regarde de plus haut) avant de s'approcher
  let pv = pitch;
  if (!dedans) for (let essai = 0; essai < 14; essai++) {
    let ok = true;
    for (let s = 0.8; s <= dist; s += 0.4) {
      const x = cible.x + Math.sin(yaw) * Math.cos(pv) * s, z = cible.z + Math.cos(yaw) * Math.cos(pv) * s;
      const y = cible.y + Math.sin(pv) * s;
      if (y < monde.sol(x, z) + 0.4 || (s < 3.2 && dansBatiment(x, z, y))) { ok = false; break; }
    }
    if (ok) break; pv = Math.min(0.95, pv + 0.08);
  }
  pitchVue = dt ? lerp(pitchVue, pv, Math.min(1, dt * 4)) : pv;
  const pitch0 = pitch; pitch = pitchVue;
  // la caméra ne passe pas dans les murs (dehors : dans les cases fermées ; dedans : dans la pièce)
  for (let s = 0.6; s <= dist; s += 0.3) {
    const x = cible.x + Math.sin(yaw) * Math.cos(pitch) * s, z = cible.z + Math.cos(yaw) * Math.cos(pitch) * s;
    if (!monde.cameraLibre(x, z) || (!dedans && dansBatiment(x, z, cible.y + Math.sin(pitch) * s))) { d = Math.max(dedans ? 1.6 : 2.2, s - 0.4); break; }
    // le relief (une colline, une montagne) entre Millie et la caméra : on s'approche
    if (cible.y + Math.sin(pitch) * s < monde.sol(x, z) + 0.35) { d = Math.max(1.4, s - 0.3); break; }
  }
  distVue = dt ? lerp(distVue, d, Math.min(1, dt * (d < distVue ? 10 : 3))) : d; d = distVue;
  camera.position.set(cible.x + Math.sin(yaw) * Math.cos(pitch) * d, cible.y + Math.sin(pitch) * d, cible.z + Math.cos(yaw) * Math.cos(pitch) * d);
  // jamais sous le sol (collines, montagnes)
  const sol = monde.sol(camera.position.x, camera.position.z) + 0.5;
  if (camera.position.y < sol) camera.position.y = sol;
  camera.lookAt(cible);
  pitch = pitch0;
}
let pitchVue = 0.32;

// ------------------------------------------------------------------------------------------------
// Les passants
// ------------------------------------------------------------------------------------------------
function bougerPassants(dt) {
  for (const p of passants) {
    p.v = 0;
    if (p.pause > 0) { p.pause -= dt; continue; }
    const [tx, tz] = p.route[p.i];
    const dx = tx - p.x, dz = tz - p.z, l = Math.hypot(dx, dz);
    // on s'arrête un peu si Millie est juste devant (et on la regarde)
    if (Math.hypot(joueur.x - p.x, joueur.z - p.z) < 1.1 && !dedans) { p.dx = joueur.x - p.x; p.dz = joueur.z - p.z; continue; }
    if (l < 0.05) {
      p.i += p.sens;
      if (p.i >= p.route.length || p.i < 0) { p.sens = -p.sens; p.i += 2 * p.sens; p.pause = 1 + Math.random() * 3; }
      p.i = clamp(p.i, 0, p.route.length - 1);
      continue;
    }
    const s = Math.min(l, p.vit * dt);
    p.x += dx / l * s; p.z += dz / l * s; p.dx = dx; p.dz = dz; p.v = s / Math.max(dt, 1e-4);
  }
}

// ------------------------------------------------------------------------------------------------
// Les portes : « Entrer »
// ------------------------------------------------------------------------------------------------
let porteProche = null;
function chercherPorte() {
  let best = null, bd = 1.8;
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
let dedans = null;
const texDedans = {};
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
  scene.fog = new THREE.Fog('#2a1a0e', 16, 34);
  // la lumière du dedans : douce, et une fenêtre à l'ouest qui fait des ombres
  const lampe = new THREE.DirectionalLight('#ffe6c0', Math.PI * 0.35); lampe.position.set(-6, 9, 4); lampe.castShadow = true;
  Object.assign(lampe.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 30 }); lampe.shadow.mapSize.set(1024, 1024); lampe.shadow.normalBias = 0.03;
  scene.add(new THREE.HemisphereLight('#fff2dc', '#b89a78', Math.PI * 0.85), lampe);
  const mat = matiereDe(B.type), M = V.matieres[mat], sol = ['tuffeau', 'brique', 'pierre'].includes(mat) ? 'sol-pave' : 'sol-bois';
  const W = PIECE.w, D = PIECE.d, H = PIECE.h;
  const mw = M.w * K, mh = M.h * K; // taille du dessin du mur, en mètres
  const mur = async (larg, x, z, ry) => {
    const t = await texDe(V.matieres[mat].f, larg / mw, H / mh);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(larg, H), new THREE.MeshLambertMaterial({ map: t, color: ry === 0 ? '#ffffff' : '#ece6de' }));
    m.position.set(x, H / 2, z); m.rotation.y = ry; m.receiveShadow = true; scene.add(m);
  };
  await mur(W, 0, -D / 2, 0); await mur(D, -W / 2, 0, Math.PI / 2); await mur(D, W / 2, 0, -Math.PI / 2); await mur(W, 0, D / 2, Math.PI);
  const tSol = await texDe(V.matieres[sol].f, W / (128 * K), D / (128 * K));
  const plancher = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshLambertMaterial({ map: tSol }));
  plancher.rotation.x = -Math.PI / 2; plancher.receiveShadow = true; scene.add(plancher);
  const tPl = await texDe(V.matieres.plafond.f, W / (128 * K), D / (128 * K));
  const plafond = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshLambertMaterial({ map: tPl, color: '#ffffff', emissive: '#3a2a1a' }));
  plafond.rotation.x = Math.PI / 2; plafond.position.y = H; scene.add(plafond);
  // des poutres sous le plafond
  const tPoutre = new THREE.MeshLambertMaterial({ color: '#8a6040', emissive: '#2a1a0e' });
  for (let x = -W / 2 + 2; x < W / 2; x += 3) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, D), tPoutre); p.position.set(x, H - 0.2, 0); p.castShadow = true; scene.add(p); }
  // la porte (pour sortir), au milieu du mur de devant
  const porteMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.3), new THREE.MeshBasicMaterial({ map: textePorte() }));
  porteMesh.position.set(0, 1.15, D / 2 - 0.02); porteMesh.rotation.y = Math.PI; scene.add(porteMesh);
  const obst = [];
  const anim = [];
  let residents = 0;
  // le travail : les pièces qui bougent dans Millépoques (ouvriers, presses, roues...), image par image
  if (I.travail && !SANS_TRAVAIL.has(B.type)) {
    const tr = I.travail, t = await texture(tr.f, { haut: false });
    const lw = tr.fw / tr.ss * K, lh = tr.fh / tr.ss * K;
    const s = Math.min(1.4, (W - 4) / lw, (H - 0.6) / lh);
    t.repeat.set(1 / tr.nc, 1 / Math.ceil(tr.n / tr.nc));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(lw * s, lh * s), new THREE.MeshLambertMaterial({ map: t, alphaTest: 0.5, side: THREE.DoubleSide }));
    // le pied (ancre) au sol : le bas de l'image est à -(oy + fh) pixels sous l'ancre
    const bas = -(tr.oy + tr.fh / tr.ss) * K * s;
    const xT = Math.min(1.6, W / 2 - lw * s / 2 - 1.4);
    m.position.set(xT, bas + lh * s / 2, -2.6); m.castShadow = true;
    scene.add(m);
    obst.push({ x: xT, z: -2.6, rx: lw * s / 2 + 0.2, rz: 0.6 });
    const rangs = Math.ceil(tr.n / tr.nc);
    anim.push((temps) => { const k = Math.floor(temps / tr.dt) % tr.n; t.offset.set((k % tr.nc) / tr.nc, 1 - (Math.floor(k / tr.nc) + 1) / rangs); });
  } else {
    // les habitants chez eux, autour de la table, en 3D
    const tTable = await texDe(V.matieres['sol-bois'].f, 2.2 / (128 * K), 1.1 / (128 * K));
    const bois = new THREE.MeshLambertMaterial({ map: tTable, color: '#e8c8a0' });
    const XT = 1.6; // à droite de la fiche
    const table = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 1.2), bois); table.position.set(XT, 0.78, -2.2);
    for (const [x, z] of [[-1.05, -0.45], [1.05, -0.45], [-1.05, 0.45], [1.05, 0.45]]) { const pied = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.74, 0.12), bois); pied.position.set(x, -0.42, z); table.add(pied); }
    table.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(table);
    obst.push({ x: XT, z: -2.2, rx: 1.4, rz: 0.8 });
    const places = [[XT - 1.9, -2.2], [XT + 1.9, -2.2], [XT + 0.5, -3.5]];
    places.forEach(([x, z], k) => {
      foule.habiller(SLOT_CHEZ + k, V.habitants[2 + ((B.id + k * 5) % (V.habitants.length - 2))]);
      obst.push({ x, z, rx: 0.45, rz: 0.45 });
    });
    residents = places.length;
    anim.push((temps, dt) => places.forEach(([x, z], k) => foule.animer(SLOT_CHEZ + k, x, 0, z, XT - x, -2.2 - z, 0, dt)));
    feuDeCheminee(scene, anim, W, D);
  }
  // les marchandises : ce qui entre (à gauche) et ce qui sort (à droite), sur des caisses
  const tCaisse = await texDe(V.matieres['sol-bois'].f, 0.9 / (128 * K) * 2, 0.7 / (128 * K) * 2);
  const matCaisse = new THREE.MeshLambertMaterial({ map: tCaisse, color: '#f0d8b8' });
  const etal = (liste, x0) => {
    Object.keys(liste).slice(0, 4).forEach((m, k) => {
      const i = V.marchandises[m]; if (i === undefined || i < 0) return;
      const x = x0, z = -3.4 + k * 1.4;
      const caisse = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.9), matCaisse);
      caisse.position.set(x, 0.35, z); caisse.castShadow = caisse.receiveShadow = true; scene.add(caisse);
      const lot = new Lot(); poserDebout(lot, i, x, z, 1.3, 0.7);
      // l'icône est posée par son coin haut gauche : on la centre au-dessus de la caisse
      const R = rectImage(i, 1.3); for (let j = 0; j < lot.coin.length; j += 2) { lot.coin[j] -= (R.x0 + R.x1) / 2; lot.coin[j + 1] -= R.y0; }
      const mesh = new THREE.Mesh(lot.geometrie(true), materiauDebout(PL[V.images[i].r[0]])); mesh.frustumCulled = false; scene.add(mesh);
      obst.push({ x, z, rx: 0.6, rz: 0.6 });
    });
  };
  etal(I.entree, -W / 2 + 0.9); etal(I.sortie, W / 2 - 0.9);
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
    sol: () => 0,
  };
  dedans = { scene, anim, monde, residents, retour: { x: porte.x, z: porte.z + 0.8, yaw }, B };
  joueur.x = 0; joueur.z = 1.2; joueur.dx = 0; joueur.dz = -1; joueur.v = 0; yaw = 0; pitch = 0.42; dist = 4.5;
  scene.add(foule.groupe);
  son.porte();
  setTimeout(() => fondu(false), 80);
}
function sortir() {
  if (!dedans) return;
  fondu(true);
  const r = dedans.retour;
  dedans = null;
  for (let k = 0; k < NB_CHEZ; k++) foule.cacher(SLOT_CHEZ + k);
  dehors.add(foule.groupe);
  joueur.x = r.x; joueur.z = r.z; joueur.dx = 0; joueur.dz = 1; joueur.v = 0; yaw = 0; pitch = 0.32; dist = 5.5;
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
let temps = 0, tOiseau = 3, tPas = 0, tToc = 0, fpsT = 0, fpsN = 0, lentes = 0;
const mondeDehors = {
  libre: (x, z) => libreVite(x, z),
  cameraLibre: (x, z) => caseLibre(x, z) || V.cases[Math.floor(z / T)]?.[Math.floor(x / T)] === '~',
  sol: (x, z) => solEn(x, z),
};
function boucle() {
  requestAnimationFrame(boucle);
  const dt = Math.min(0.05, horloge.getDelta());
  if (etat === 'titre') return;
  temps += dt;
  const monde = dedans ? dedans.monde : mondeDehors;
  if (enJeu()) {
    const c = commande();
    bougerJoueur(dt, c, monde);
    if (joueur.v > 0.1 && (tPas -= dt) < 0) { son.pas(); tPas = c.cours ? 0.24 : 0.4; }
  } else joueur.v = 0;
  if (!dedans) {
    bougerPassants(dt);
    chercherPorte(); batimentProche();
    if ((tOiseau -= dt) < 0) { son.oiseau(); tOiseau = 2 + Math.random() * 6; }
    for (const f of animations) f(temps);
  } else {
    for (const f of dedans.anim) f(temps, dt);
    if ((tToc -= dt) < 0 && !dedans.residents) { son.toc(); tToc = 0.5 + Math.random() * 0.5; }
    // la porte de sortie : en approchant du mur de devant
    const pres = joueur.z > PIECE.d / 2 - 0.8 && Math.abs(joueur.x) < 1;
    $('#entrer').classList.toggle('vu', pres);
    if (pres) $('#entrer-nom').textContent = 'Sortir';
  }
  son.dedans(!!dedans);
  // les gens
  foule.animer(0, joueur.x, monde.sol(joueur.x, joueur.z), joueur.z, joueur.dx, joueur.dz, joueur.v, dt, joueur.cours);
  passants.forEach((p, k) => {
    if (dedans) { foule.cacher(1 + k); return; }
    // loin de Millie, on ne les montre pas (moins de travail)
    if (Math.hypot(p.x - joueur.x, p.z - joueur.z) > 90) { foule.cacher(1 + k); return; }
    foule.animer(1 + k, p.x, solEn(p.x, p.z), p.z, p.dx, p.dz, p.v, dt);
  });
  foule.fini();
  placerCamera(dt, monde);
  if (!dedans) suivreSoleil(joueur.x, cibleY, joueur.z);
  rendu.render(dedans ? dedans.scene : dehors, camera);
  // résolution qui baisse toute seule si l'appareil peine (après plusieurs mesures lentes, sans faire le yoyo)
  fpsT += dt; fpsN++;
  if (fpsT > 2) {
    const fps = fpsN / fpsT;
    lentes = fps < 34 ? lentes + 1 : 0;
    if (lentes >= 2 && qualite > 0.55) { qualite -= 0.15; taille(); lentes = 0; }
    fpsT = 0; fpsN = 0;
  }
}

// ------------------------------------------------------------------------------------------------
// Départ
// ------------------------------------------------------------------------------------------------
taille();
construire((p) => { $('#charge i').style.width = Math.round(p * 100) + '%'; }).then(async () => {
  $('#carte-img').src = DONNEES + V.carte;
  // tout préparer derrière l'écran de chargement (programmes, textures) : pas d'à-coup au premier pas
  foule.animer(0, joueur.x, solEn(joueur.x, joueur.z), joueur.z, 0, 1, 0, 0.016); foule.fini();
  placerCamera(0, mondeDehors); suivreSoleil(joueur.x, solEn(joueur.x, joueur.z), joueur.z);
  try {
    await rendu.compileAsync(dehors, camera);
    // les programmes des intérieurs aussi (autres lumières) : pas d'à-coup en passant une porte
    const essai = new THREE.Scene(), l = new THREE.DirectionalLight('#fff', 1); l.castShadow = true;
    essai.add(new THREE.HemisphereLight('#fff', '#888', 1), l, foule.groupe);
    const tx = PL[0];
    for (const m of [new THREE.MeshLambertMaterial({ map: tx }), new THREE.MeshLambertMaterial({ map: tx, alphaTest: 0.5, side: THREE.DoubleSide }), new THREE.MeshBasicMaterial({ map: tx }), new THREE.MeshLambertMaterial({ color: '#888' }), materiauDebout(tx)]) {
      const o = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m); o.castShadow = o.receiveShadow = true; essai.add(o);
    }
    essai.fog = new THREE.Fog('#2a1a0e', 16, 34);
    await rendu.compileAsync(essai, camera);
  } catch { /* ancien navigateur */ }
  dehors.add(foule.groupe);
  rendu.render(dehors, camera);
  $('#charge').classList.add('fini');
  $('#jouer').disabled = false; $('#jouer').textContent = 'Jouer ▸';
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
window.VILLAGE = {
  get joueur() { return joueur; }, get yaw() { return yaw; }, set yaw(v) { yaw = v; }, set pitch(v) { pitch = v; }, set dist(v) { dist = v; },
  entrer: (n) => entrer(PORTES.find((p) => p.b.type === n) || PORTES[n]), sortir, PORTES: () => PORTES, jouer: () => $('#jouer').click(),
  get info() { return { ...rendu.info.render, cam: camera.position.toArray().map((v) => +v.toFixed(2)), pv: pitchVue } }, get passants() { return passants; },
};
