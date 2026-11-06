// Cuisson d'une ville de Millepoques pour « La Balade de Millépoques » (moteur Luminati).
//
// Tourne dans un navigateur (Playwright, voir cuire.mjs) avec le code de Millepoques servi sous /mp/.
// Rien n'est redessiné ici : on charge la sauvegarde, on laisse le vrai moteur de rendu de Millepoques
// dessiner, et on range ce qu'il dessine en trois sortes d'images :
//   1. le sol (herbe, routes, eau, champs, ombres des arbres) en morceaux de 16 × 16 cases ;
//   2. chaque objet debout (bâtiment, arbre, rocher, drapeau, bateau, animal) détouré, rangé dans des planches ;
//   3. des habitants qui marchent (face, dos, profil), image par image, pour le joueur et les passants.
// Le résultat (window.CUIT) est relu par cuire.mjs, qui écrit les fichiers.
import { Game } from '/mp/js/sim/game.js';
import { Renderer } from '/mp/js/render/renderer.js';
import { Camera } from '/mp/js/input/camera.js';
import { eraForTier, tierOf } from '/mp/js/data/tiers.js';
import { getEra } from '/mp/js/data/eras/index.js';
import { TILE, T } from '/mp/js/config.js';
import { drawFlagHD, drawBoatHD } from '/mp/js/render/art/hd/units.js';
import { drawAnimalHD, drawBerryBushHD } from '/mp/js/render/art/hd/prehistory.js';
import { drawBeastHD } from '/mp/js/render/art/hd/garrison.js';
import { drawUnitHD } from '/mp/js/render/art/hd/people.js';
import { drawVehicleHD } from '/mp/js/render/art/hd/vehicles.js';
import { drawCityDecor } from '/mp/js/render/city.js';
import { coverBoat } from '/mp/js/render/bridges.js';
import { treePos, treeScale, treeSprite, rockSprite, rockLook, groundLook } from '/mp/js/render/treeArt.js';

const q = new URLSearchParams(location.search);
const X0 = +q.get('x0'), Y0 = +q.get('y0'), NW = +q.get('w'), NH = +q.get('h'); // fenêtre du sol (cases)
const SS = +(q.get('ss') || 2); // pixels par pixel de Millepoques pour les objets debout
const CH = 16; // cases par morceau de sol
const log = (...a) => console.log('[cuisson]', ...a);

const V = await (await fetch('/ville.json')).json();
const profile = V.profil;
const g = new Game({ profile, save: V.save, era: eraForTier(getEra(V.save.era), tierOf(profile, V.save)) });
const w = g.world;
log('ville chargée', g.era.id, 'bâtiments', g.buildings.size, 'monde', w.W, w.H);

// ------------------------------------------------------------------------------------------------
// Le moteur de rendu de Millepoques, sans ce qui bouge ou ce qui sert à jouer
// ------------------------------------------------------------------------------------------------
const canvas = document.createElement('canvas');
const cam = new Camera();
const r = new Renderer(canvas, g, cam, { state: {} });
r.quality = 0;
const noop = () => {};
r.fx.draw = noop; r.ambient.drawLife = noop; r.emitSmoke = noop; r.workFx = noop; r.drawCloudShadows = noop;
r.fog.draw = noop; r.chunkFogged = () => false; r.alertShown = () => false; r.updateReveal = noop;
// Les objets debout : on garde leur liste (avec la ligne de profondeur de Millepoques) et leurs ombres au sol,
// mais on ne les dessine pas dans le sol.
const vus = new Map(); // objet -> élément (k, y)
const ombres = r.shadowsHD.bind(r);
let toutDessiner = false; // la carte : tout, comme dans Millepoques
r.shadowsHD = (ctx, items) => {
  if (toutDessiner) { ombres(ctx, items); return; }
  for (const it of items) if (it.k !== 4 && !vus.has(it.o)) vus.set(it.o, { k: it.k, y: it.y, o: it.o });
  ombres(ctx, items.filter((it) => it.k !== 4));
  items.length = 0;
};

const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms));
async function dessinerVue(cx, cy, pw, ph) {
  r.resize(pw, ph, 1, 1);
  cam.x = cx; cam.y = cy; cam.zoom = 1;
  r.warmup = 3000;
  for (let i = 0; i < 200; i++) {
    r.draw(0.016);
    if (i > 2 && !r.terrain.pending()) break;
    await attendre(10);
  }
  r.time = 12.3; // l'heure des animations figées (eau, fenêtres)
  r.draw(0);
}

const enImage = (c, type = 'image/webp', qualite = 0.92) => c.toDataURL(type, qualite);
const SORTIES = []; // { nom, url }

// ------------------------------------------------------------------------------------------------
// 1. Le sol
// ------------------------------------------------------------------------------------------------
const morceaux = [];
for (let cy = 0; cy < Math.ceil(NH / CH); cy++) {
  for (let cx = 0; cx < Math.ceil(NW / CH); cx++) {
    const tx = X0 + cx * CH, ty = Y0 + cy * CH;
    const pw = Math.min(CH, X0 + NW - tx) * TILE, ph = Math.min(CH, Y0 + NH - ty) * TILE;
    await dessinerVue(tx * TILE + pw / 2, ty * TILE + ph / 2, pw, ph);
    const nom = `sol/${cx}-${cy}.webp`;
    SORTIES.push({ nom, url: enImage(canvas, 'image/webp', 0.9) });
    morceaux.push({ x: cx * CH, y: cy * CH, w: pw / TILE, h: ph / TILE, f: nom });
  }
  log('sol, rangée', cy + 1, '/', Math.ceil(NH / CH));
}

// ------------------------------------------------------------------------------------------------
// 2. Les objets debout
// ------------------------------------------------------------------------------------------------
const dedans = (x, y) => x >= X0 * TILE && x < (X0 + NW) * TILE && y >= Y0 * TILE && y < (Y0 + NH) * TILE;
/** Détoure une image : rend la plus petite boîte qui contient tous les pixels visibles (et son décalage). */
function detourer(c) {
  const ctx = c.getContext('2d'), { width: W, height: H } = c, d = ctx.getImageData(0, 0, W, H).data;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 6) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return null;
  const o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1;
  o.getContext('2d').drawImage(c, -x0, -y0);
  return { c: o, dx: x0, dy: y0 };
}
/** Dessine un objet seul, dans une boîte du monde (pixels de Millepoques), à SS fois la taille. */
function seul(boite, dessin) {
  const [bx, by, bw, bh] = boite;
  const c = document.createElement('canvas'); c.width = Math.ceil(bw * SS); c.height = Math.ceil(bh * SS);
  const ctx = c.getContext('2d');
  ctx.setTransform(SS, 0, 0, SS, -bx * SS, -by * SS);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  dessin(ctx);
  const d = detourer(c);
  if (!d) return null;
  return { c: d.c, x: bx + d.dx / SS, y: by + d.dy / SS };
}

const IMAGES = []; // { c, ox, oy, sw, sh } : décalage du coin haut gauche par rapport à l'ancre, taille (pixels Millepoques)
const parCle = new Map();
function image(cle, fabrique) {
  if (cle && parCle.has(cle)) return parCle.get(cle);
  const im = fabrique(); if (!im) return -1;
  IMAGES.push(im); const i = IMAGES.length - 1;
  if (cle) parCle.set(cle, i);
  return i;
}
const OBJETS = []; // { i: image, x, y: ancre (pixels Millepoques ; y = ligne de profondeur), s: échelle, k: sorte }
const SORTES = { 0: 'arbre', 1: 'rocher', 2: 'batiment', 3: 'drapeau', 5: 'bateau', 6: 'buisson', 7: 'animal', 9: 'bete', 10: 'bateau', 11: 'decor' };
r.ss = SS; r.bss = Math.max(2, SS); r.bakeSs = SS;
const look = groundLook(w), rlook = rockLook(w);
for (const it of vus.values()) {
  const o = it.o, k = it.k;
  if (k === 0) { // arbre : une image par dessin, partagée (échelle par arbre)
    if (o.falling) continue;
    const p = treePos(o); if (!dedans(p.x, p.y)) continue;
    const s = treeSprite(o, SS, look);
    const big = !(o.kind === 'stump' || o.growth < 0.3);
    const i = image(s.canvas, () => ({ c: s.canvas, ox: s.x, oy: s.y, sw: s.w, sh: s.h }));
    OBJETS.push({ i, x: p.x, y: it.y, ax: p.x, ay: p.y, s: big ? treeScale(o) : 1, k: 'arbre', sorte: o.kind });
  } else if (k === 1) {
    const X = (o.x + 0.5) * TILE, Y = (o.y + 0.5) * TILE + 6; if (!dedans(X, Y)) continue;
    const s = rockSprite(o, SS, rlook);
    const i = image(s.canvas, () => ({ c: s.canvas, ox: s.x, oy: s.y, sw: s.w, sh: s.h }));
    OBJETS.push({ i, x: X, y: it.y, ax: X, ay: Y, s: 1, k: 'rocher' });
  } else {
    let ax, boite, dessin;
    if (k === 2) {
      ax = (o.x + o.w / 2) * TILE;
      boite = [o.x * TILE - 120, o.y * TILE - 260, o.w * TILE + 240, o.h * TILE + 330];
      dessin = (ctx) => r.drawBuilding(ctx, o);
    } else if (k === 3) { ax = o.wx; boite = [o.wx - 40, o.wy - 70, 80, 100]; dessin = (ctx) => drawFlagHD(ctx, o, r.time, false, !!w.lanes); }
    else if (k === 5) { ax = o.x; boite = [o.x - 120, o.y - 160, 240, 220]; dessin = (ctx) => { drawBoatHD(ctx, o, r.time); coverBoat(ctx, g, o, r.time); }; }
    else if (k === 6) { ax = (o.x + 0.5) * TILE; boite = [o.x * TILE - 40, o.y * TILE - 60, 120, 140]; dessin = (ctx) => drawBerryBushHD(ctx, o, r.time); }
    else if (k === 7) { ax = o.x; boite = [o.x - 70, o.y - 90, 140, 130]; dessin = (ctx) => drawAnimalHD(ctx, o, r.time); }
    else if (k === 9) { ax = o.x; boite = [o.x - 70, o.y - 90, 140, 130]; dessin = (ctx) => drawBeastHD(ctx, o, r.time); }
    else if (k === 11) { ax = o.x ?? 0; boite = [ax - 80, it.y - 160, 160, 220]; dessin = (ctx) => drawCityDecor(ctx, o, r.time, g); }
    else continue;
    if (!dedans(ax, it.y - 1)) continue;
    const im = seul(boite, dessin);
    if (!im) continue;
    const i = image(null, () => ({ c: im.c, ox: im.x - ax, oy: im.y - it.y, sw: im.c.width / SS, sh: im.c.height / SS }));
    const extra = k === 2 ? { type: o.type, nom: (g.defOf?.(o.type) || g.data.buildings[o.type])?.name || o.type, bx: o.x - X0, by: o.y - Y0, bw: o.w, bh: o.h } : {};
    OBJETS.push({ i, x: ax, y: it.y, ax, ay: it.y, s: 1, k: SORTES[k] || 'objet', ...extra });
  }
}
log('objets', OBJETS.length, 'images', IMAGES.length);

// ------------------------------------------------------------------------------------------------
// 3. Les habitants qui marchent (le joueur et les passants)
// ------------------------------------------------------------------------------------------------
const PAS = 4.3 * 4; // longueur d'un cycle de marche (people.js : STRIDE × 4)
const NB_IMAGES = 8;
const VUES = { face: [0, 1, 1], dos: [0, -1, 1], droite: [1, 0, 1], gauche: [-1, 0, -1] };
function habitant(id, job) {
  const u = { id, job, x: 0, y: 0, moving: true, speed: 42, walkT: 0, game: g, visible: true };
  const vues = {};
  for (const [nom, [mx, my, dir]] of Object.entries(VUES)) {
    vues[nom] = [];
    for (let f = 0; f < NB_IMAGES; f++) {
      Object.assign(u, { moving: true, mdx: mx, mdy: my, dir, _fdir: dir, _turnT: undefined, _view: my ? (my > 0 ? 'front' : 'back') : 'side' });
      const phase = f / NB_IMAGES - ((id * 0.37) % 1);
      u._gd = ((phase % 1) + 1) % 1 * PAS; u._gx = 0; u._gy = 0; u._gw = 0; u.walkT = 0;
      const im = seul([-40, -70, 80, 90], (ctx) => drawUnitHD(ctx, u, 3.3, null));
      vues[nom].push(image(null, () => ({ c: im.c, ox: im.x, oy: im.y, sw: im.c.width / SS, sh: im.c.height / SS })));
    }
  }
  // debout, de face
  Object.assign(u, { moving: false, idleT: 2, mdx: 0, mdy: 1, dir: 1, _fdir: 1, _view: 'front' });
  const im = seul([-40, -70, 80, 90], (ctx) => drawUnitHD(ctx, u, 3.3, null));
  vues.debout = [image(null, () => ({ c: im.c, ox: im.x, oy: im.y, sw: im.c.width / SS, sh: im.c.height / SS }))];
  return vues;
}
const IDS = (q.get('habitants') || '7,12,23,31,44,58,63').split(',').map(Number);
const HABITANTS = IDS.map((id) => ({ id, vues: habitant(id, 'carrier') }));
log('habitants', HABITANTS.length);

// ------------------------------------------------------------------------------------------------
// La carte (touche N) : toute la fenêtre vue de loin, avec les arbres et les bâtiments
// ------------------------------------------------------------------------------------------------
{
  const PX = 8; // pixels par case
  toutDessiner = true;
  r.resize(NW * PX, NH * PX, 1, 1);
  cam.x = (X0 + NW / 2) * TILE; cam.y = (Y0 + NH / 2) * TILE; cam.zoom = PX / TILE;
  r.warmup = 3000; r.bake = null;
  for (let i = 0; i < 300; i++) { r.draw(0.016); if (i > 4 && !r.terrain.pending()) break; await attendre(10); }
  r.draw(0);
  SORTIES.push({ nom: 'carte.webp', url: enImage(canvas, 'image/webp', 0.9) });
  toutDessiner = false;
  log('carte');
}

// ------------------------------------------------------------------------------------------------
// Planches : les images rangées en étagères dans des planches de 2048 × 2048
// ------------------------------------------------------------------------------------------------
const P = 2048, MARGE = 3;
const ordre = IMAGES.map((im, i) => i).sort((a, b) => IMAGES[b].c.height - IMAGES[a].c.height);
const planches = [];
let pl = null, px = 0, py = 0, hauteur = 0;
const RECTS = new Array(IMAGES.length);
function nouvellePlanche() { const c = document.createElement('canvas'); c.width = P; c.height = P; pl = { c, ctx: c.getContext('2d') }; planches.push(pl); px = MARGE; py = MARGE; hauteur = 0; }
nouvellePlanche();
for (const i of ordre) {
  const c = IMAGES[i].c, cw = Math.min(c.width, P - 2 * MARGE), chh = Math.min(c.height, P - 2 * MARGE);
  if (px + cw + MARGE > P) { px = MARGE; py += hauteur + MARGE; hauteur = 0; }
  if (py + chh + MARGE > P) nouvellePlanche();
  pl.ctx.drawImage(c, px, py, cw, chh);
  RECTS[i] = [planches.length - 1, px, py, cw, chh];
  px += cw + MARGE; hauteur = Math.max(hauteur, chh);
}
planches.forEach((p, n) => SORTIES.push({ nom: `objets-${n}.webp`, url: enImage(p.c, 'image/webp', 0.92) }));
log('planches', planches.length);

// ------------------------------------------------------------------------------------------------
// Où l'on peut marcher (une case du sol = une unité de Luminati)
// ------------------------------------------------------------------------------------------------
const lignes = [];
let eau = 0;
for (let y = 0; y < NH; y++) {
  let l = '';
  for (let x = 0; x < NW; x++) {
    const X = X0 + x, Y = Y0 + y, i = w.idx(X, Y);
    let c = '.';
    if (!w.inside(X, Y)) c = '#';
    else if (w.isWater(X, Y) && !w.bridge[i]) { c = '~'; eau++; }
    else if (w.isLava(X, Y)) c = '#';
    else if (w.bldAt[i]) c = 'B';
    else if (w.treeAt[i]) { const t = w.trees.get(w.treeAt[i]); c = t && (t.kind === 'stump' || t.growth < 0.3) ? '.' : 'A'; }
    else if (w.rockAt[i]) c = 'R';
    else if (w.roadAt[i] || w.flagAt[i]) c = '=';
    else if (w.locked(X, Y)) c = '#';
    l += c;
  }
  lignes.push(l);
}
// Les routes (pour les passants) : suites de cases, d'un drapeau à l'autre
const WS = V.save.worlds[V.save.active || 'old'];
const routes = [];
for (const [, , , cases] of WS.roads || []) {
  const pts = cases.map((i) => [i % w.W - X0, Math.floor(i / w.W) - Y0]);
  if (pts.every(([x, y]) => x >= 1 && y >= 1 && x < NW - 1 && y < NH - 1) && pts.length >= 2) routes.push(pts);
}
const hq = g.hq;
const depart = hq ? { x: (hq.x + hq.w / 2) * TILE, y: (hq.y + hq.h + 1.5) * TILE } : { x: (X0 + NW / 2) * TILE, y: (Y0 + NH / 2) * TILE };

window.CUIT = {
  json: {
    format: 'balade-millepoques', version: 1, source: V.source, epoque: g.era.id,
    case: TILE, ss: SS, x0: X0, y0: Y0, w: NW, h: NH,
    sol: { taille: CH, px: TILE, morceaux },
    carte: 'carte.webp',
    planches: planches.map((p, n) => ({ f: `objets-${n}.webp`, w: P, h: P })),
    images: IMAGES.map((im, i) => ({ r: RECTS[i], ox: +im.ox.toFixed(2), oy: +im.oy.toFixed(2), sw: +im.sw.toFixed(2), sh: +im.sh.toFixed(2) })),
    objets: OBJETS.map((o) => ({ ...o, x: +((o.x / TILE) - X0).toFixed(3), y: +((o.y / TILE) - Y0).toFixed(3), ax: +((o.ax / TILE) - X0).toFixed(3), ay: +((o.ay / TILE) - Y0).toFixed(3), s: +o.s.toFixed(3) })),
    habitants: HABITANTS,
    cases: lignes,
    routes,
    depart: { x: +(depart.x / TILE - X0).toFixed(2), y: +(depart.y / TILE - Y0).toFixed(2) },
  },
  sorties: SORTIES.map((s) => s.nom),
};
window.SORTIES = SORTIES;
log('fini');
