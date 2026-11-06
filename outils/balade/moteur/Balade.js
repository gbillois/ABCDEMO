/**
 * « La Balade de Millépoques » — une ville de Millepoques posée dans le moteur Luminati.
 *
 * Le niveau Luminati ne sert qu'à marcher (cases bloquées, caméra, joueur, interface). Tout ce qu'on
 * voit vient de Millepoques, cuit par outils/balade/cuisson/ (dans balade/ville/) :
 *   - le sol, à plat, en morceaux de 16 × 16 cases, sans lumière ni brume (les couleurs de Millepoques) ;
 *   - les bâtiments, arbres, rochers, drapeaux, bateaux et animaux, debout, face à la caméra ;
 *   - le joueur et des passants qui marchent sur les routes, dessinés image par image.
 * Une case de Millepoques = une unité du monde. Les images debout sont des panneaux verticaux posés sur
 * leur ligne de profondeur (celle qui trie les dessins dans Millepoques) : avec la caméra qui regarde
 * toujours vers le nord, l'ordre des panneaux est celui de Millepoques. Leur hauteur est multipliée
 * par tan(inclinaison) : à l'écran, chaque objet garde les proportions de son dessin par rapport au sol.
 *
 * Branché dans Game.js par moteur/balade.patch : `createBalade(game)` après la construction du niveau,
 * `balade.update(dt)` à chaque image.
 */
import * as THREE from 'three';

const DEG = Math.PI / 180;
/** Longueur d'un pas complet (cases) : 4 demi-foulées de 4,3 pixels de Millepoques (people.js). */
const CYCLE = (4 * 4.3) / 40;
const VITESSE_PASSANT = 1.05; // cases par seconde (42 pixels/s dans Millepoques)

const VERTEX = /* glsl */ `
attribute vec3 aAncre;
attribute vec4 aRect;
attribute vec4 aUV;
attribute vec2 aAnim;
uniform float uTemps;
uniform float uHaut;
varying vec2 vUv;
void main() {
  // position.xy dans [0, 1] (y = 1 en haut) ; aRect : coin haut gauche (x, y vers le bas) et taille, en cases
  float dx = aRect.x + position.x * aRect.z;
  float dy = aRect.y + (1.0 - position.y) * aRect.w; // < 0 au-dessus de la ligne de profondeur
  vec3 p = aAncre;
  // balancement des arbres : rien sous le tronc, de plus en plus vers la cime
  if (aAnim.x > 0.0) {
    float h = max(0.0, -dy - aAnim.y);
    dx += h * aAnim.x * (sin(uTemps * 1.3 + aAncre.x * 0.7 + aAncre.z * 0.3) * 0.03 + sin(uTemps * 2.9 + aAncre.x) * 0.008);
  } else if (aAnim.x < 0.0) {
    // bateaux : ils dansent sur l'eau
    dy += sin(uTemps * 1.6 + aAncre.x * 3.1) * 0.035;
  }
  p.x += dx;
  p.y -= dy * uHaut;
  vUv = mix(aUV.xy, aUV.zw, vec2(position.x, 1.0 - position.y));
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}
`;
const FRAGMENT = /* glsl */ `
uniform sampler2D uPlanche;
varying vec2 vUv;
void main() {
  vec4 c = texture2D(uPlanche, vUv);
  if (c.a < 0.03) discard;
  gl_FragColor = c;
  #include <colorspace_fragment>
}
`;

/** Le joueur caché derrière une maison : sa silhouette claire, dessinée seulement là où il est caché. */
const FRAGMENT_SILHOUETTE = /* glsl */ `
uniform sampler2D uPlanche;
varying vec2 vUv;
void main() {
  float a = texture2D(uPlanche, vUv).a;
  if (a < 0.5) discard;
  gl_FragColor = vec4(1.0, 0.95, 0.78, 0.55);
}
`;

/** Une série de panneaux tirés d'une même planche (un seul appel de dessin). */
class Panneaux {
  constructor(planche, capacite, uniforms, ordre, silhouette = false) {
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0], 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    this.ancre = new THREE.InstancedBufferAttribute(new Float32Array(capacite * 3), 3);
    this.rect = new THREE.InstancedBufferAttribute(new Float32Array(capacite * 4), 4);
    this.uv = new THREE.InstancedBufferAttribute(new Float32Array(capacite * 4), 4);
    this.anim = new THREE.InstancedBufferAttribute(new Float32Array(capacite * 2), 2);
    g.setAttribute('aAncre', this.ancre); g.setAttribute('aRect', this.rect);
    g.setAttribute('aUV', this.uv); g.setAttribute('aAnim', this.anim);
    g.instanceCount = 0;
    const m = silhouette ? new THREE.ShaderMaterial({
      uniforms: { ...uniforms, uPlanche: { value: planche } },
      vertexShader: VERTEX, fragmentShader: FRAGMENT_SILHOUETTE,
      transparent: true, depthWrite: false, depthTest: true, depthFunc: THREE.GreaterDepth,
      toneMapped: false, fog: false, side: THREE.DoubleSide,
    }) : new THREE.ShaderMaterial({
      uniforms: { ...uniforms, uPlanche: { value: planche } },
      vertexShader: VERTEX, fragmentShader: FRAGMENT,
      // bords doux sans trier : la couverture de l'anticrénelage (la scène est dessinée avec MSAA)
      alphaToCoverage: true, transparent: false, depthWrite: true, depthTest: true,
      premultipliedAlpha: true, toneMapped: false, fog: false, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(g, m);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = ordre;
    this.mesh.name = 'Balade.panneaux';
    this.geometry = g;
    this.n = 0;
  }
  /** Ajoute (ou remplace, si i est donné) un panneau. im : image de ville.json ; r : rectangle dans la planche. */
  poser(x, y, z, im, P, echelle = 1, balance = 0, tronc = 0, i = this.n++) {
    const [, px, py, pw, ph] = im.r;
    this.ancre.array.set([x, y, z], i * 3);
    this.rect.array.set([im.ox * echelle / 40, im.oy * echelle / 40, im.sw * echelle / 40, im.sh * echelle / 40], i * 4);
    this.uv.array.set([px / P.w, 1 - py / P.h, (px + pw) / P.w, 1 - (py + ph) / P.h], i * 4);
    this.anim.array.set([balance, tronc], i * 2);
    return i;
  }
  fini(n = this.n) {
    this.geometry.instanceCount = n;
    for (const a of [this.ancre, this.rect, this.uv, this.anim]) { a.needsUpdate = true; a.addUpdateRange?.(0, n * a.itemSize); }
  }
}

function charger(url, chargeur) {
  return new Promise((ok, non) => chargeur.load(url, ok, undefined, () => non(new Error(`image introuvable : ${url}`))));
}

/**
 * @param {any} game le jeu (src/game/Game.js), niveau construit
 */
export async function createBalade(game) {
  const env = game.level?.environment ?? {};
  const reglage = env.millepoques;
  if (!reglage) return null;
  const base = new URL(reglage.ville || 'ville/ville.json', document.baseURI);
  const V = await (await fetch(base)).json();
  const balade = new Balade(game, V, base, reglage);
  await balade.construire();
  return balade;
}

class Balade {
  constructor(game, V, base, reglage) {
    this.game = game; this.V = V; this.base = base; this.reglage = reglage;
    this.temps = 0;
    this.uniforms = { uTemps: { value: 0 }, uHaut: { value: 1 } };
    this.groupe = new THREE.Group();
    this.groupe.name = 'Balade';
  }

  async construire() {
    const { game, V } = this;
    const { engine } = game;
    const renderer = engine.renderer;
    const chargeur = new THREE.TextureLoader();
    const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy?.() ?? 1);
    const url = (f) => new URL(f, this.base).href;

    // ---- le sol ----
    const sols = await Promise.all(V.sol.morceaux.map((m) => charger(url(m.f), chargeur)));
    V.sol.morceaux.forEach((m, i) => {
      const t = sols[i];
      t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso;
      t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
      const mat = new THREE.MeshBasicMaterial({ map: t, toneMapped: false, fog: false, depthWrite: false, depthTest: false });
      const geo = new THREE.PlaneGeometry(m.w, m.h);
      geo.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(m.x + m.w / 2, 0, m.y + m.h / 2);
      mesh.renderOrder = -100;
      mesh.name = 'Balade.sol';
      this.groupe.add(mesh);
    });

    // ---- les planches d'objets ----
    const planches = await Promise.all(V.planches.map((p) => charger(url(p.f), chargeur)));
    for (const t of planches) {
      t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; t.premultiplyAlpha = true;
      t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
    }
    this.planches = planches;

    // ---- les objets debout, triés comme dans Millepoques (ligne de profondeur, puis colonne) ----
    const objets = V.objets.slice().sort((a, b) => (a.y - b.y) || (a.x - b.x));
    const parPlanche = planches.map(() => []);
    for (const o of objets) { const im = V.images[o.i]; if (im) parPlanche[im.r[0]].push(o); }
    this.fixes = parPlanche.map((liste, n) => {
      const p = new Panneaux(planches[n], Math.max(1, liste.length), this.uniforms, 0);
      liste.forEach((o, k) => {
        const im = V.images[o.i];
        const arbre = o.k === 'arbre' && o.sorte !== 'cactus' && o.sorte !== 'deadtree' && o.s !== 1;
        const tronc = { oak: 20, birch: 30, pine: 12, palm: 44 }[o.sorte] ?? 18;
        // (un léger décalage vers la caméra départage deux dessins sur la même ligne, comme l'ordre de Millepoques)
        p.poser(o.ax, 0, o.y + k * 1e-5 + n * 1e-6, im, V.planches[n], o.s, arbre ? 1 : o.k === 'bateau' ? -1 : 0, tronc * o.s / 40);
      });
      p.fini();
      this.groupe.add(p.mesh);
      return p;
    });

    // ---- les personnages : le joueur et les passants ----
    const H = V.habitants;
    this.looks = H.map((h) => h.vues);
    const routes = V.routes || [];
    const nbPassants = Math.min(this.reglage.passants ?? 16, routes.length);
    this.persos = new Map(); // planche -> Panneaux dynamique
    this.silhouettes = new Map(); // planche -> la silhouette du joueur
    const capacite = nbPassants + 1;
    planches.forEach((t, n) => {
      const p = new Panneaux(t, capacite, this.uniforms, 1);
      this.persos.set(n, p);
      this.groupe.add(p.mesh);
      const sil = new Panneaux(t, 1, this.uniforms, 50, true);
      this.silhouettes.set(n, sil);
      this.groupe.add(sil.mesh);
    });
    // le joueur : un habitant de Millepoques (le premier de la liste)
    this.joueur = { look: this.looks[this.reglage.joueur ?? 0] ?? this.looks[0], dist: 0, vue: 'face', bouge: false };
    // les passants : chacun sur une route, d'un bout à l'autre, puis sur une route voisine
    this.routes = routes.map((pts) => pts.map(([x, y]) => [x + 0.5, y + 0.5]));
    this.parBout = new Map();
    this.routes.forEach((r, i) => {
      for (const bout of [r[0], r[r.length - 1]]) {
        const k = bout.join(',');
        if (!this.parBout.has(k)) this.parBout.set(k, []);
        this.parBout.get(k).push(i);
      }
    });
    let graine = 7;
    this.hasard = () => ((graine = (graine * 16807) % 2147483647) / 2147483647);
    this.passants = [];
    for (let i = 0; i < nbPassants; i++) {
      const r = Math.floor(this.hasard() * this.routes.length);
      const pts = this.routes[r];
      this.passants.push({
        look: this.looks[(i + 1) % this.looks.length], route: pts, sens: this.hasard() < 0.5 ? 1 : -1,
        s: this.hasard() * (pts.length - 1), cote: (this.hasard() - 0.5) * 0.22, dist: this.hasard() * 10,
        vue: 'face', pause: 0,
      });
    }

    // ---- le moteur : on cache son monde, on garde ses commandes, sa caméra et son interface ----
    game.world.root.visible = false;
    game.player.sprite.visible = false;
    game.player.speedMul = this.reglage.vitesse ?? 0.55;
    engine.scene.add(this.groupe);
    renderer.shadowMap.enabled = false;
    const rig = game.rig;
    rig.yawLimit = 0; rig.yawTarget = rig.yawCenter; rig.yaw = rig.yawCenter; // la caméra regarde toujours le nord
    rig.minDistance = this.reglage.zoomMin ?? 7;
    rig.maxDistance = this.reglage.zoomMax ?? 26;
    rig.targetOffsetY = 0.4;
    rig.lookAhead = 0.8;
    this.reglerImage();
    this.brancherCarte(url);
    // les images du sol et des planches envoyées à la carte graphique avant de jouer
    for (const t of [...sols, ...planches]) renderer.initTexture?.(t);
  }

  /**
   * La carte du monde (N) : la vue de Millepoques de toute la ville (carte.webp) au lieu des couleurs des
   * cases du niveau, sous les noms des bâtiments, la flèche du joueur et les marques du moteur.
   */
  brancherCarte(url) {
    const wm = this.game.ui?.worldMap;
    if (!wm || !this.V.carte || typeof wm._drawBase !== 'function') return;
    const img = new Image();
    img.src = url(this.V.carte);
    const cache = new Map();
    const dessin = (w, h) => {
      const k = w + 'x' + h;
      if (!cache.has(k)) {
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, w, h);
        cache.set(k, c);
      }
      return cache.get(k);
    };
    const avant = wm._drawBase.bind(wm);
    wm._drawBase = () => {
      if (wm._base && img.complete && img.naturalWidth) wm._base = dessin(wm._base.width, wm._base.height);
      avant();
    };
  }

  /** Pas de flou, pas d'éclat, pas d'étalonnage : les couleurs de Millepoques telles quelles. */
  reglerImage() {
    const { game } = this;
    const S = game.postfx?.settings;
    if (S) {
      S.enabled = true; // (la scène est dessinée avec MSAA : bords doux des panneaux)
      S.dof.enabled = false;
      S.bloom.enabled = false;
      if (S.cinematic) S.cinematic.enabled = false;
      S.grade.enabled = false;
    }
    const r = game.engine.renderer;
    if (r.toneMapping !== THREE.NoToneMapping) r.toneMapping = THREE.NoToneMapping;
  }

  update(dt) {
    this.temps += dt;
    this.uniforms.uTemps.value = this.temps;
    const rig = this.game.rig;
    // hauteur des panneaux : tan(inclinaison), pour garder à l'écran les proportions des dessins
    this.uniforms.uHaut.value = Math.min(2.2, Math.tan(Math.max(20 * DEG, rig.pitch ?? 50 * DEG)));
    this.reglerImage();

    for (const p of this.persos.values()) p.n = 0;
    for (const p of this.silhouettes.values()) p.n = 0;
    // ---- le joueur ----
    const pl = this.game.player;
    const j = this.joueur;
    const v = pl.speed || 0;
    j.dist += v * dt;
    const f = pl.facing;
    if (v > 0.05) j.vue = Math.abs(f.z) > Math.abs(f.x) * 0.9 ? (f.z > 0 ? 'face' : 'dos') : f.x > 0 ? 'droite' : 'gauche';
    this.dessinerPerso(j.look, j.vue, v > 0.05, j.dist, pl.position.x, pl.position.z, true);

    // ---- les passants ----
    for (const p of this.passants) {
      if (p.pause > 0) { p.pause -= dt; this.dessinerPerso(p.look, 'face', false, 0, p.x, p.z); continue; }
      const pts = p.route;
      p.s += p.sens * VITESSE_PASSANT * dt;
      p.dist += VITESSE_PASSANT * dt;
      if (p.s <= 0 || p.s >= pts.length - 1) {
        // au bout : une route qui part d'ici, sinon demi-tour (et parfois une petite pause)
        const bout = p.s <= 0 ? pts[0] : pts[pts.length - 1];
        const autres = (this.parBout.get(bout.join(',')) || []).map((i) => this.routes[i]).filter((r) => r !== pts);
        if (autres.length && this.hasard() < 0.85) {
          const r = autres[Math.floor(this.hasard() * autres.length)];
          p.route = r;
          const debut = r[0][0] === bout[0] && r[0][1] === bout[1];
          p.sens = debut ? 1 : -1; p.s = debut ? 0 : r.length - 1;
        } else { p.sens = -p.sens; p.s = Math.max(0, Math.min(pts.length - 1, p.s)); }
        if (this.hasard() < 0.15) p.pause = 1 + this.hasard() * 2.5;
      }
      const r = p.route;
      const i = Math.max(0, Math.min(r.length - 2, Math.floor(p.s)));
      const t = Math.max(0, Math.min(1, p.s - i));
      const a = r[i], b = r[i + 1];
      const dx = (b[0] - a[0]) * p.sens, dz = (b[1] - a[1]) * p.sens;
      // de côté sur la route (chacun sa file) : perpendiculaire au sens de marche
      const len = Math.hypot(dx, dz) || 1;
      p.x = a[0] + (b[0] - a[0]) * t - (dz / len) * p.cote;
      p.z = a[1] + (b[1] - a[1]) * t + (dx / len) * p.cote;
      p.vue = Math.abs(dz) > Math.abs(dx) ? (dz > 0 ? 'face' : 'dos') : dx > 0 ? 'droite' : 'gauche';
      this.dessinerPerso(p.look, p.vue, true, p.dist, p.x, p.z);
    }
    for (const p of this.persos.values()) p.fini();
    for (const p of this.silhouettes.values()) p.fini();
  }

  dessinerPerso(look, vue, marche, dist, x, z, joueur = false) {
    const V = this.V;
    const imgs = marche ? look[vue] : look.debout;
    const n = marche ? Math.floor((dist / CYCLE) * imgs.length) % imgs.length : 0;
    const im = V.images[imgs[n]];
    if (!im) return;
    this.persos.get(im.r[0]).poser(x, 0, z, im, V.planches[im.r[0]]);
    if (joueur) this.silhouettes.get(im.r[0]).poser(x, 0, z, im, V.planches[im.r[0]]);
  }
}
