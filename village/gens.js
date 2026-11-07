// Les habitants du Village de Millépoques, en vraie 3D.
// Chaque personnage garde l'allure de Millépoques : grosse tête ronde, petit corps, bras courts, chaussures rondes, un
// gros trait sombre tout autour (comme le contour des dessins), des couleurs en aplats à deux ou trois tons. Sa tête
// porte le visage et les cheveux que Millépoques lui dessine (de face et de dos, planche tetes.webp) ; sa tenue, ses
// couleurs et son chapeau sont ceux que Millépoques lui donne (faces.js lookOf, habits.js). Les chapeaux sont modelés.
//
// Pour aller vite (peu d'appels de dessin) : une seule « pièce » de chaque sorte pour tout le village (InstancedMesh),
// chaque personnage en est une copie placée et colorée ; le contour est la même pièce, gonflée et vue de dos.
// Les gestes (marche, course, repos, tête qui regarde) sont calculés à chaque image sur un petit squelette.
import * as THREE from 'three';

const TRAIT = '#2a1a10'; // la couleur des contours de Millépoques (common.js P.out)
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;

// dégradé en trois tons (lumière, demi-teinte, ombre) : le modelé des dessins de Millépoques
function degrade() {
  const d = new Uint8Array([168, 168, 168, 255, 218, 218, 218, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat); t.magFilter = t.minFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
}

// ------------------------------------------------------------------------------------------------
// Les pièces (en pixels de Millépoques, les pieds à y = 0, le personnage regarde vers +z)
// ------------------------------------------------------------------------------------------------
function lathe(pts, seg = 14) { const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg); g.computeVertexNormals(); return g; }
function decale(g, x, y, z) { g.translate(x, y, z); return g; }
const PIECES = {
  // buste : de la taille au cou (le bas évasé de la tunique)
  torse: () => lathe([[0.01, 0], [5.0, 0], [5.15, 0.6], [4.75, 2.6], [4.45, 4.6], [4.7, 6.2], [4.45, 7.2], [2.4, 7.9], [0.01, 8.0]]),
  // la jupe (ou la robe longue) : de la taille aux chevilles
  jupe: () => lathe([[0.01, 0.3], [4.4, 0.3], [5.3, -0.4], [6.05, -3.3], [6.6, -5.25], [6.35, -5.65], [0.01, -5.65]], 24),
  // le tablier sur la jupe : il en suit la forme, devant seulement
  tablierJupe: () => { const g = new THREE.LatheGeometry([[5.55, -0.2], [6.2, -3.2], [6.6, -4.9]].map(([r, y]) => new THREE.Vector2(r, y)), 12, -0.85, 1.7); g.computeVertexNormals(); return g; },
  culotte: () => { const g = new THREE.SphereGeometry(1, 20, 14); g.scale(4.75, 2.25, 3.4); return g; },
  jambe: () => decale(new THREE.CylinderGeometry(1.15, 1.0, 4.2, 10), 0, -2.1, 0),
  chaussure: () => { const g = new THREE.SphereGeometry(1, 14, 10); g.scale(1.45, 0.95, 2.05); return decale(g, 0, 0, 0.55); },
  bras: () => { const g = new THREE.CapsuleGeometry(1.45, 2.6, 4, 10); return decale(g, 0, -1.9, 0); },
  avantBras: () => { const g = new THREE.CapsuleGeometry(1.2, 2.1, 4, 10); return decale(g, 0, -1.6, 0); },
  main: () => new THREE.SphereGeometry(1.5, 12, 10),
  ceinture: () => { const g = new THREE.TorusGeometry(4.62, 0.48, 6, 28); g.rotateX(Math.PI / 2); return g; },
  boucle: () => new THREE.BoxGeometry(1.5, 1.2, 0.6),
  tablier: () => { const g = new THREE.CylinderGeometry(4.95, 5.5, 1, 18, 1, true, -0.85, 1.7); return decale(g, 0, -0.5, 0); },
  fraise: () => { const g = new THREE.TorusGeometry(2.7, 0.95, 8, 24); g.rotateX(Math.PI / 2); return g; },
  col: () => { const g = new THREE.TorusGeometry(2.6, 0.55, 6, 20); g.rotateX(Math.PI / 2); return g; },
  tete: () => new THREE.SphereGeometry(1, 26, 18),
  natte: () => { const g = new THREE.CapsuleGeometry(0.8, 3.2, 4, 8); return decale(g, 0, -2.4, 0); },
  noeud: () => new THREE.SphereGeometry(0.75, 8, 6),
  // chapeaux (posés sur le dessus de la tête, unités de rayon de tête : x = rx, y = ry)
  'c-cap': () => { const g = new THREE.SphereGeometry(1, 20, 12, 0, TAU, 0, Math.PI * 0.55); g.scale(1.07, 0.75, 1.07); return decale(g, 0, 0.18, -0.03); },
  'c-beret': () => { const g = new THREE.SphereGeometry(1, 20, 10); g.scale(1.18, 0.38, 1.12); g.rotateZ(0.18); return decale(g, 0.08, 0.86, -0.05); },
  'c-woolcap': () => { const g = lathe([[0.01, 1.6], [0.35, 1.45], [0.75, 1.0], [1.02, 0.45], [1.05, 0.2], [0.01, 0.2]], 18); g.rotateZ(-0.35); return decale(g, 0.1, 0.05, -0.08); },
  'c-toque': () => lathe([[0.01, 0.35], [0.98, 0.35], [1.0, 0.75], [1.08, 1.35], [1.2, 1.75], [1.05, 2.05], [0.6, 2.18], [0.01, 2.2]], 20),
  'c-straw': () => lathe([[0.01, 0.62], [0.82, 0.62], [0.95, 0.75], [1.0, 1.15], [0.8, 1.42], [0.01, 1.5], [0.01, 0.62]], 22)
    .clone(), // calotte (le bord est une pièce à part)
  'c-bord': () => lathe([[0.95, 0.66], [2.05, 0.5], [2.15, 0.44], [2.05, 0.4], [0.95, 0.52]], 26),
  'c-bande': () => lathe([[0.97, 0.66], [1.02, 0.95], [0.97, 0.95]], 22),
  'c-widebrim': () => lathe([[0.01, 0.62], [0.9, 0.62], [1.0, 0.85], [0.95, 1.35], [0.01, 1.42], [0.01, 0.62]], 22),
  'c-plume': () => { const g = new THREE.CapsuleGeometry(0.16, 2.0, 3, 6); g.rotateZ(1.15); g.rotateY(0.6); return decale(g, -0.55, 1.45, -0.2); },
  'c-tricorne': () => { // un bord retroussé en trois cornes
    const g = lathe([[0.01, 0.55], [0.9, 0.55], [1.0, 0.85], [0.92, 1.25], [0.01, 1.3], [0.01, 0.55]], 24);
    const b = new THREE.CylinderGeometry(1.75, 1.75, 0.18, 36, 1);
    const p = b.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), r = Math.hypot(x, z) / 1.75; p.setY(i, p.getY(i) + 0.62 + r * r * (0.35 + 0.35 * Math.cos(3 * (a - Math.PI / 2)))); }
    b.computeVertexNormals();
    return fusion([g, b]);
  },
  'c-squarecap': () => fusion([decale(lathe([[0.01, 0.3], [1.02, 0.3], [1.0, 0.85], [0.01, 0.9]], 18), 0, 0, 0), decale(new THREE.BoxGeometry(2.0, 0.22, 2.0), 0, 0.98, 0)]),
  'c-coif': () => { const g = new THREE.SphereGeometry(1, 22, 14, 0, TAU, 0, Math.PI * 0.62); g.scale(1.14, 0.95, 1.18); g.rotateX(-0.42); return decale(g, 0, 0.05, -0.12); },
  'c-mobcap': () => { const g = new THREE.SphereGeometry(1, 22, 14, 0, TAU, 0, Math.PI * 0.6); g.scale(1.2, 0.9, 1.2); g.rotateX(-0.3); return decale(g, 0, 0.1, -0.1); },
  'c-frenchhood': () => { const g = new THREE.TorusGeometry(1.02, 0.17, 6, 20, Math.PI); g.scale(1, 1.05, 1); return decale(g, 0, 0.05, 0.25); },
};
function fusion(liste) { // fusionne des géométries (positions, normales) sans indices
  const pos = [], nor = [];
  for (let g of liste) { g = g.index ? g.toNonIndexed() : g; pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); }
  const r = new THREE.BufferGeometry(); r.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); r.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); return r;
}
const CHAPEAUX = { cap: ['c-cap'], beret: ['c-beret'], woolcap: ['c-woolcap'], toque: ['c-toque'], straw: ['c-straw', 'c-bord', 'c-bande'], widebrim: ['c-widebrim', 'c-bord', 'c-plume'],
  tricorne: ['c-tricorne'], squarecap: ['c-squarecap'], coif: ['c-coif'], mobcap: ['c-mobcap'], frenchhood: ['c-frenchhood'], chaperon: ['c-cap'], bonnet: ['c-cap'], helmet: ['c-cap'], veil: ['c-coif'] };

// ------------------------------------------------------------------------------------------------
// Matériaux : aplats en trois tons (couleur par copie), visage peint, contour gonflé
// ------------------------------------------------------------------------------------------------
function materiauContour(epais) {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { couleur: { value: new THREE.Color(TRAIT) }, epais: { value: epais } }]),
    vertexShader: `
      #include <common>
      #include <fog_pars_vertex>
      uniform float epais;
      void main() {
        vec4 p = instanceMatrix * vec4(position, 1.0);
        vec3 n = normalize(mat3(instanceMatrix) * normal);
        vec4 mvPosition = modelViewMatrix * p;
        vec3 nv = normalize(normalMatrix * n);
        mvPosition.xyz += nv * epais * clamp(-mvPosition.z * 0.06, 1.0, 3.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      #include <common>
      #include <fog_pars_fragment>
      uniform vec3 couleur;
      void main() {
        gl_FragColor = vec4(couleur, 1.0);
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
    side: THREE.BackSide, fog: true,
  });
}
// la tête : le visage de Millépoques de face (z > 0) et les cheveux de dos (z < 0), projetés sur la sphère
function materiauTete(map, planche) {
  const m = new THREE.MeshToonMaterial({ map, gradientMap: degrade() });
  const caseU = planche.case / planche.w, caseV = planche.case / planche.h, parU = planche.px / planche.case;
  m.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 cases;\nattribute vec3 rayon;\nattribute vec3 cheveux;\nvarying vec4 vCases;\nvarying vec3 vRayon;\nvarying vec3 vLoc;\nvarying vec3 vCheveux;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCases = cases; vRayon = rayon; vLoc = position; vCheveux = cheveux;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec4 vCases;\nvarying vec3 vRayon;\nvarying vec3 vLoc;\nvarying vec3 vCheveux;`)
      .replace('#include <map_fragment>', `
        vec2 tailleCase = vec2(${caseU.toFixed(6)}, ${caseV.toFixed(6)});
        float k = ${parU.toFixed(6)};
        vec2 qF = clamp(vec2(0.5 + vLoc.x * vRayon.x * k, 0.5 - vLoc.y * vRayon.y * k), 0.0, 1.0);
        vec2 qB = clamp(vec2(0.5 - vLoc.x * vRayon.x * k, 0.5 - vLoc.y * vRayon.y * k), 0.0, 1.0);
        vec4 cF = texture2D(map, vCases.xy + qF * tailleCase);
        vec4 cB = texture2D(map, vCases.zw + qB * tailleCase);
        float wF = smoothstep(-0.18, 0.22, vLoc.z);
        vec4 c = mix(cB, cF, wF);
        diffuseColor.rgb *= mix(vCheveux, c.rgb, smoothstep(0.35, 0.8, c.a));`);
  };
  return m;
}

// ------------------------------------------------------------------------------------------------
// La foule
// ------------------------------------------------------------------------------------------------
const NOMS = ['torse', 'jupe', 'tablierJupe', 'culotte', 'jambe', 'chaussure', 'bras', 'avantBras', 'main', 'ceinture', 'boucle', 'tablier', 'fraise', 'col', 'tete', 'natte', 'noeud',
  ...new Set(Object.values(CHAPEAUX).flat())];
// combien de copies par personnage (gauche et droite)
const PAIRES = { jambe: 2, chaussure: 2, bras: 2, avantBras: 2, main: 2, natte: 2, noeud: 2 };
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

export class Foule {
  /**
   * V : les données (habitants, planche des têtes) ; texTetes : la planche des têtes ; places : combien de personnages
   * au plus ; echelle : mètres par pixel de Millépoques.
   */
  constructor(V, texTetes, places, echelle) {
    this.V = V; this.n = places; this.S = echelle;
    this.groupe = new THREE.Group();
    const toon = new THREE.MeshToonMaterial({ color: '#ffffff', gradientMap: degrade() });
    const tete = materiauTete(texTetes, V.tetes);
    const contour = materiauContour(0.018), contourFin = materiauContour(0.011);
    this.pieces = {};
    for (const nom of NOMS) {
      const geo = PIECES[nom]();
      const nb = places * (PAIRES[nom] || 1);
      const mesh = new THREE.InstancedMesh(geo, nom === 'tete' ? tete : toon, nb);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      if (nom !== 'tete') { mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(nb * 3).fill(1), 3); }
      mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
      mesh.count = 0;
      const fins = new Set(['boucle', 'noeud', 'c-plume', 'c-bande', 'natte']);
      const bord = new THREE.InstancedMesh(geo, fins.has(nom) ? contourFin : contour, nb);
      bord.instanceMatrix = mesh.instanceMatrix; bord.frustumCulled = false; bord.count = 0;
      this.groupe.add(mesh, bord);
      this.pieces[nom] = { mesh, bord };
    }
    const t = this.pieces.tete.mesh, nb = places;
    this.attrCases = new THREE.InstancedBufferAttribute(new Float32Array(nb * 4), 4);
    this.attrRayon = new THREE.InstancedBufferAttribute(new Float32Array(nb * 3).fill(6), 3);
    this.attrCheveux = new THREE.InstancedBufferAttribute(new Float32Array(nb * 3), 3);
    t.geometry.setAttribute('cases', this.attrCases); t.geometry.setAttribute('rayon', this.attrRayon); t.geometry.setAttribute('cheveux', this.attrCheveux);
    this.gens = [];
    this.tmpC = new THREE.Color();
  }

  /** Habille la place k avec l'habitant h (données de la cuisson). */
  habiller(k, h) {
    const L = h.look || {}, j = h.tenue || {}, P = this.pieces;
    const fem = !!L.fem, robe = fem || !!j.robe || h.metier === 'teacher';
    const peau = L.skin?.[0] || '#f2c49b', cheveux = L.hairC || '#6a4428';
    const tunique = L.tunic || j.tunic || '#9a7a5a';
    const tablier = j.apron || L.apronF || null;
    const chausses = L.hose || L.pants || j.pants || '#5a4a40';
    const chapeau = CHAPEAUX[L.hat] ? L.hat : null;
    const e = h.tete.e, rx = Math.max(e[0], e[1]) * 0.93, ry = Math.min(e[2] * 0.97, rx * 1.02), rz = rx * 0.92;
    const g = {
      k, h, fem, robe, rx, ry, rz, chapeau, natte: L.style === 'braids',
      couleurs: {
        torse: tunique, jupe: robe ? tunique : null, culotte: robe ? null : (L.pants || j.pants || '#5a4a40'), jambe: chausses, chaussure: '#3a2416',
        bras: shade(tunique, 0.12), avantBras: shade(tunique, 0.12), main: peau, ceinture: '#4a2e18', boucle: tablier ? null : '#f2c14e', tablier, tablierJupe: robe ? tablier : null,
        fraise: L.ren?.ruff ? '#f6f2e8' : null, col: !L.ren?.ruff && L.ren?.collar ? '#f4efe4' : null, natte: L.style === 'braids' ? cheveux : null, noeud: L.style === 'braids' ? (L.ribbon || '#f2c14e') : null,
      },
      x: 0, y: 0, z: 0, cap: 0, capCible: 0, phase: Math.random(), marche: 0, temps: Math.random() * 10, regard: 0, visible: true,
    };
    if (chapeau) {
      const [a, b, c] = CHAPEAUX[chapeau];
      g.couleurs[a] = L.hatC || '#4a3a2e';
      if (b) g.couleurs[b] = L.hatC || '#4a3a2e';
      if (c) g.couleurs[c] = c === 'c-bande' ? '#c8432f' : '#f4f0e6';
    }
    g.cols = {};
    for (const [nom, col] of Object.entries(g.couleurs)) if (col) g.cols[nom] = new THREE.Color(col);
    // la tête : ses deux cases dans la planche (face, dos), sa taille, la couleur des cheveux
    const T = this.V.tetes, cell = (n) => [((n % T.nc) * T.case) / T.w, (Math.floor(n / T.nc) * T.case) / T.h];
    g.cases = [...cell(h.tete.face), ...cell(h.tete.dos)];
    g.cheveux = new THREE.Color(cheveux);
    g.os = this.squelette(g);
    this.gens[k] = g;
    return g;
  }

  /** Le petit squelette d'un personnage : des nœuds qui portent les pièces. */
  squelette(g) {
    const O = () => new THREE.Object3D();
    const s = { racine: O(), bassin: O(), buste: O(), cou: O(), tete: O(), chapeau: O(), epaule: [O(), O()], coude: [O(), O()], hanche: [O(), O()] };
    const ws = g.h.look?.ws || 1;
    s.racine.add(s.bassin); s.bassin.position.y = 6.0;
    s.bassin.add(s.buste);
    s.buste.add(s.cou); s.cou.position.y = 7.7;
    s.cou.add(s.tete); s.tete.position.y = g.ry * 0.86;
    s.tete.add(s.chapeau); s.chapeau.scale.set(g.rx, g.ry, g.rx);
    for (const c of [0, 1]) {
      const d = c ? 1 : -1;
      s.buste.add(s.epaule[c]); s.epaule[c].position.set(d * 4.35 * ws, 6.4, 0.1);
      s.epaule[c].add(s.coude[c]); s.coude[c].position.y = -3.9;
      s.bassin.add(s.hanche[c]); s.hanche[c].position.set(d * 2.15 * ws, -0.6, 0);
    }
    s.buste.scale.x = ws;
    return s;
  }

  /**
   * Place et anime le personnage k. x, y, z : ses pieds (mètres) ; dx, dz : où il va ; v : sa vitesse (m/s) ;
   * dt : le temps écoulé. cours : il court.
   */
  animer(k, x, y, z, dx, dz, v, dt, cours = false) {
    const g = this.gens[k]; if (!g) return;
    g.x = x; g.y = y; g.z = z; g.temps += dt;
    if (Math.hypot(dx, dz) > 1e-4) g.capCible = Math.atan2(dx, dz);
    let dc = g.capCible - g.cap; dc = Math.atan2(Math.sin(dc), Math.cos(dc));
    g.cap += dc * Math.min(1, dt * 10);
    const vise = v > 0.05 ? 1 : 0;
    g.marche = lerp(g.marche, vise, Math.min(1, dt * 8));
    g.course = lerp(g.course || 0, cours && v > 0.05 ? 1 : 0, Math.min(1, dt * 5));
    g.phase = (g.phase + v * dt / (1.15 + 0.45 * g.course)) % 1;
    g.vu = true;
  }
  cacher(k) { const g = this.gens[k]; if (g) g.vu = false; }

  /** Écrit les matrices de toutes les pièces (une fois par image) : seulement les pièces portées, à la suite. */
  fini() {
    const P = this.pieces, m = new THREE.Matrix4(), tmp = new THREE.Object3D(), nb = {};
    for (const nom of NOMS) nb[nom] = 0;
    let gk = null;
    const poser = (nom, parent, px, py, pz, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => {
      tmp.position.set(px, py, pz); tmp.scale.set(sx, sy, sz); tmp.rotation.set(rx, ry, rz); tmp.updateMatrix();
      m.multiplyMatrices(parent.matrixWorld, tmp.matrix);
      const slot = nb[nom]++, mesh = P[nom].mesh;
      mesh.setMatrixAt(slot, m);
      if (mesh.instanceColor) mesh.setColorAt(slot, gk.cols[nom] || BLANC);
      else { // la tête
        this.attrCases.setXYZW(slot, ...gk.cases); this.attrRayon.setXYZ(slot, gk.rx, gk.ry, gk.rz);
        this.attrCheveux.setXYZ(slot, gk.cheveux.r, gk.cheveux.g, gk.cheveux.b);
      }
    };
    for (let k = 0; k < this.n; k++) {
      const g = this.gens[k];
      if (!g || !g.vu) continue;
      gk = g;
      const s = g.os, w = g.marche, c = g.course || 0, ph = g.phase * TAU, t = g.temps;
      const sw = Math.sin(ph);
      // -------- la pose : marche (w), course (c), repos (1 - w)
      const amp = lerp(0.5, 0.95, c) * w;
      s.racine.position.set(g.x, g.y, g.z); s.racine.rotation.set(0, g.cap, 0); s.racine.scale.setScalar(this.S * (g.h.look?.hs || 1) * 1.02);
      s.bassin.position.y = 6.0 + w * (lerp(0.32, 0.7, c) * Math.abs(Math.cos(ph)) - 0.3) + (1 - w) * 0.05 * Math.sin(t * 2.1);
      s.bassin.rotation.set(0, sw * 0.12 * w, 0);
      s.buste.rotation.set(lerp(0.04, 0.2, c) * w, -sw * 0.16 * w, Math.sin(t * 0.9) * 0.015 * (1 - w));
      s.buste.scale.y = 1 + (1 - w) * 0.014 * Math.sin(t * 2.1);
      // la tête regarde autour d'elle au repos, suit la marche sinon
      g.regard = lerp(g.regard, (1 - w) * 0.45 * Math.sin(t * 0.37 + k) * (Math.sin(t * 0.13 + k * 2) > 0 ? 1 : 0.2), 0.05);
      s.tete.rotation.set(-0.04 + 0.05 * w * Math.abs(sw), g.regard + sw * 0.1 * w, Math.sin(t * 0.7 + k) * 0.03 * (1 - w));
      for (const cote of [0, 1]) {
        const d = cote ? 1 : -1, ss = cote ? -sw : sw;
        s.hanche[cote].rotation.set(ss * amp, 0, 0);
        s.epaule[cote].rotation.set(-ss * amp * 0.85, 0, d * (0.2 + 0.03 * Math.sin(t * 1.3 + cote) * (1 - w)));
        s.coude[cote].rotation.set(-0.3 - w * (0.25 + 0.6 * c) - Math.max(0, -ss) * 0.4 * w, 0, 0);
      }
      s.racine.updateMatrixWorld(true);
      // -------- les pièces
      const C = g.couleurs;
      poser('torse', s.buste, 0, -0.2, 0);
      poser('ceinture', s.buste, 0, 1.9, 0, s.buste.scale.x, 1, 1);
      if (C.boucle) poser('boucle', s.buste, 0, 1.9, 4.95);
      if (C.tablier) poser('tablier', s.buste, 0, 6.1, 0, 1, g.robe ? 4.4 : 7.2, 1);
      if (C.tablierJupe) poser('tablierJupe', s.bassin, 0, 0, 0, 1, 1 + 0.03 * w * Math.abs(sw), 1, 0, 0, sw * 0.04 * w);
      if (C.fraise) poser('fraise', s.buste, 0, 7.75, 0);
      if (C.col) poser('col', s.buste, 0, 7.6, 0);
      if (g.robe) poser('jupe', s.bassin, 0, 0, 0, 1, 1 + 0.03 * w * Math.abs(sw), 1, 0, 0, sw * 0.04 * w);
      else poser('culotte', s.bassin, 0, -0.35, 0);
      poser('tete', s.tete, 0, 0, 0, g.rx, g.ry, g.rz);
      for (const cote of [0, 1]) {
        poser('jambe', s.hanche[cote], 0, 0, 0);
        poser('chaussure', s.hanche[cote], 0, -4.65, 0.1);
        poser('bras', s.epaule[cote], 0, 0, 0);
        poser('avantBras', s.coude[cote], 0, 0, 0);
        poser('main', s.coude[cote], 0, -3.65, 0.15);
        if (g.natte) {
          const d = cote ? 1 : -1;
          poser('natte', s.tete, d * g.rx * 0.78, -g.ry * 0.35, -g.rz * 0.25, 1, 1, 1, 0.15, 0, d * 0.12);
          poser('noeud', s.tete, d * g.rx * 0.86, -g.ry * 0.35 - 4.6, -g.rz * 0.2);
        }
      }
      // le chapeau : ses pièces, posées sur la tête (à l'échelle de la tête)
      if (g.chapeau) for (const nom of CHAPEAUX[g.chapeau]) poser(nom, s.chapeau, 0, 0, 0);
    }
    for (const nom of NOMS) {
      const { mesh, bord } = P[nom];
      mesh.count = bord.count = nb[nom];
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    this.attrCases.needsUpdate = this.attrRayon.needsUpdate = this.attrCheveux.needsUpdate = true;
  }
}
const BLANC = new THREE.Color('#ffffff');
function shade(hex, t) { const c = new THREE.Color(hex), d = new THREE.Color('#1c2440'); return '#' + c.lerp(d, t).getHexString(); }
