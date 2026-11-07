// Cuisson d'une ville de Millepoques pour « Le Village de Millépoques » (vraie 3D, three.js).
//
// Tourne dans un navigateur (Playwright, voir cuire.mjs) avec le code de Millepoques servi sous /mp/.
// Rien n'est redessiné ici : on charge la sauvegarde, on laisse le vrai moteur de rendu de Millepoques
// dessiner, et on range ce qu'il dessine :
//   1. le sol (herbe, routes, eau, champs, ombres) en morceaux de 16 × 16 cases (512 px), et tout le pays de loin ;
//   2. chaque bâtiment : sa façade (pour les murs et le toit en volume), son profil (hauteur de chaque colonne,
//      hauteur des murs) et ce qui dépasse (cheminées, mâts, enclos, établis) en découpes ;
//   3. les arbres, rochers, drapeaux, bateaux, animaux détourés ;
//   4. des habitants qui marchent (face, dos, profils, 8 images) : Millie, puis des passants de métiers variés ;
//   5. pour l'intérieur de chaque sorte de bâtiment : les pièces qui bougent quand on y travaille (ouvriers, presses,
//      roues...), image par image, et les murs et sols dessinés par les fonctions de Millepoques.
// Le résultat (window.CUIT) est relu par cuire.mjs, qui écrit les fichiers.
import { Game } from '/mp/js/sim/game.js';
import { Renderer } from '/mp/js/render/renderer.js';
import { Camera } from '/mp/js/input/camera.js';
import { eraForTier, tierOf } from '/mp/js/data/tiers.js';
import { getEra } from '/mp/js/data/eras/index.js';
import { TILE } from '/mp/js/config.js';
import { drawFlagHD, drawBoatHD } from '/mp/js/render/art/hd/units.js';
import { drawAnimalHD, drawBerryBushHD } from '/mp/js/render/art/hd/prehistory.js';
import { drawBeastHD } from '/mp/js/render/art/hd/garrison.js';
import { drawUnitHD } from '/mp/js/render/art/hd/people.js';
import { millieOutfit } from '/mp/js/render/art/hd/millie.js';
import { drawCityDecor } from '/mp/js/render/city.js';
import { coverBoat } from '/mp/js/render/bridges.js';
import { treePos, treeScale, treeSprite, rockSprite, rockLook, groundLook } from '/mp/js/render/treeArt.js';
import { partsOf, artKey, variantOf } from '/mp/js/render/art/hd/anim.js';
import { buildingArt } from '/mp/js/render/art/registry.js';
import { sprite, blit } from '/mp/js/render/sprites.js';
import { drawGood } from '/mp/js/render/art/icons.js';
import { P, poly, prng, light, shade, vGrad, hGrad, softShadow, strokeOut } from '/mp/js/render/art/hd/common.js';
import { ashlar, brick, halfTimber, paving, croisee, wallLamp, tbeam, chimney, hipRoof, WOOD, TUF } from '/mp/js/render/art/hd/tuffeau.js';
import { HD } from '/mp/js/render/art/hd/buildings.js';
const TOITS_TEX = new Set(['ardoise', 'rslate', 'slate', 'red', 'ochre', 'thatch', 'shingle', 'blue', 'moss']);

const q = new URLSearchParams(location.search);
const X0 = +q.get('x0'), Y0 = +q.get('y0'), NW = +q.get('w'), NH = +q.get('h'); // fenêtre du sol (cases)
const SS = 3; // pixels par pixel de Millepoques pour les images debout
const CH = 16, PXSOL = 40; // cases par morceau de sol, pixels par case (la finesse du jeu)
const log = (...a) => console.log('[cuisson]', ...a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
window.addEventListener('error', (e) => { window.ECHEC = String(e.message); });
window.addEventListener('unhandledrejection', (e) => { window.ECHEC = String(e.reason?.stack || e.reason); });

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
const vus = new Map(); // objet -> élément (k, y)
const ombres = r.shadowsHD.bind(r);
let toutDessiner = false; // la vue de loin : tout, comme dans Millepoques
r.shadowsHD = (ctx, items) => {
  if (toutDessiner) { ombres(ctx, items); return; }
  for (const it of items) if (it.k !== 4 && !vus.has(it.o)) vus.set(it.o, { k: it.k, y: it.y, o: it.o });
  ombres(ctx, items.filter((it) => it.k !== 4));
  items.length = 0;
};
const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms));
async function dessinerVue(cx, cy, pw, ph, zoom) {
  r.resize(pw, ph, 1, 1);
  cam.x = cx; cam.y = cy; cam.zoom = zoom;
  r.warmup = 3000;
  for (let i = 0; i < 300; i++) {
    r.draw(0.016);
    if (i > 2 && !r.terrain.pending()) break;
    await attendre(10);
  }
  r.time = 12.3; // l'heure des animations figées (eau, fenêtres)
  r.draw(0);
}
const enImage = (c, type = 'image/webp', qualite = 0.9) => c.toDataURL(type, qualite);
const SORTIES = []; // { nom, url }

// ------------------------------------------------------------------------------------------------
// 1. Le sol (32 px par case) et le pays de loin (4 px par case)
// ------------------------------------------------------------------------------------------------
const morceaux = [];
for (let cy = 0; cy < Math.ceil(NH / CH); cy++) {
  for (let cx = 0; cx < Math.ceil(NW / CH); cx++) {
    const tx = X0 + cx * CH, ty = Y0 + cy * CH;
    const cw = Math.min(CH, X0 + NW - tx), chh = Math.min(CH, Y0 + NH - ty);
    globalThis.__sansPonts = true; // les ponts sont en 3D
    await dessinerVue((tx + cw / 2) * TILE, (ty + chh / 2) * TILE, cw * PXSOL, chh * PXSOL, PXSOL / TILE);
    globalThis.__sansPonts = false;
    const nom = `sol/${cx}-${cy}.webp`;
    SORTIES.push({ nom, url: enImage(canvas, 'image/webp', 0.88) });
    morceaux.push({ x: cx * CH, y: cy * CH, w: cw, h: chh, f: nom });
  }
  log('sol, rangée', cy + 1, '/', Math.ceil(NH / CH));
}
{
  toutDessiner = true; r.bake = null;
  const PXL = 4;
  await dessinerVue(w.W / 2 * TILE, w.H / 2 * TILE, w.W * PXL, w.H * PXL, PXL / TILE);
  SORTIES.push({ nom: 'loin.webp', url: enImage(canvas, 'image/webp', 0.85) });
  // la carte (touche M) : la fenêtre, 8 px par case
  await dessinerVue((X0 + NW / 2) * TILE, (Y0 + NH / 2) * TILE, NW * 8, NH * 8, 8 / TILE);
  SORTIES.push({ nom: 'carte.webp', url: enImage(canvas, 'image/webp', 0.88) });
  toutDessiner = false;
  log('loin et carte');
}

// ------------------------------------------------------------------------------------------------
// Outils d'images
// ------------------------------------------------------------------------------------------------
const toile = (W, H) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(W)); c.height = Math.max(1, Math.ceil(H)); return c; };
/** La plus petite boîte qui contient tous les pixels visibles (et son décalage). */
function detourer(c) {
  const ctx = c.getContext('2d'), { width: W, height: H } = c, d = ctx.getImageData(0, 0, W, H).data;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 6) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return null;
  const o = toile(x1 - x0 + 1, y1 - y0 + 1);
  o.getContext('2d').drawImage(c, -x0, -y0);
  return { c: o, dx: x0, dy: y0 };
}
/** Dessine dans une boîte du monde (pixels de Millepoques), à SS fois la taille, sans détourer. */
const FANIONS = new Set(['#3e6db5', '#c8432f']);
function dansBoite(boite, dessin, masque = false, ss = SS) {
  const [bx, by, bw, bh] = boite;
  const c = toile(bw * ss, bh * ss), ctx = c.getContext('2d');
  if (masque) { const f = ctx.fill.bind(ctx); ctx.fill = (...a) => { if (!FANIONS.has(String(ctx.fillStyle).toLowerCase())) f(...a); }; }
  ctx.setTransform(ss, 0, 0, ss, -bx * ss, -by * ss);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  dessin(ctx);
  return c;
}
function seul(boite, dessin, ss = SS) {
  const c = dansBoite(boite, dessin, false, ss), d = detourer(c);
  return d ? { c: d.c, x: boite[0] + d.dx / ss, y: boite[1] + d.dy / ss, ss } : null;
}
/** Empreinte d'une image (pour ne garder qu'un exemplaire des dessins identiques). */
function empreinte(c) {
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let h1 = 2166136261 >>> 0, h2 = 5381;
  for (let i = 0; i < d.length; i += 7) { h1 = Math.imul(h1 ^ d[i], 16777619) >>> 0; h2 = (Math.imul(h2, 33) + d[i]) >>> 0; }
  return `${c.width}x${c.height}:${h1.toString(36)}:${h2.toString(36)}`;
}
const IMAGES = []; // { c, ox, oy } : coin haut gauche par rapport à l'ancre (pixels de Millepoques)
const parCle = new Map();
function image(c, ox, oy, cle = null, ss = SS) {
  const k = cle ?? empreinte(c) + `:${ox.toFixed(1)}:${oy.toFixed(1)}`;
  if (parCle.has(k)) return parCle.get(k);
  IMAGES.push({ c, ox, oy, ss }); parCle.set(k, IMAGES.length - 1);
  return IMAGES.length - 1;
}

// ------------------------------------------------------------------------------------------------
// 2. Les bâtiments en volume : profil de la silhouette (ouverture : sans mâts, cordes, cheminées)
// ------------------------------------------------------------------------------------------------
const OUV = 5 * SS; // rayon de l'ouverture (5 pixels de Millepoques)
/** Masque plein de la silhouette au-dessus du sol (ligne `sol` de l'image), ouvert et sans trous. */
function silhouettePleine(c, sol) {
  const W = c.width, H = c.height, d = c.getContext('2d').getImageData(0, 0, W, H).data;
  let m = new Uint8Array(W * H);
  for (let y = 0; y < Math.min(sol, H); y++) for (let x = 0; x < W; x++) m[y * W + x] = d[(y * W + x) * 4 + 3] > 128 ? 1 : 0;
  const passe = (src, garder, horizontal) => {
    const o = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let v = garder ? 1 : 0;
      for (let k = -OUV; k <= OUV; k++) {
        const xx = horizontal ? x + k : x, yy = horizontal ? y : y + k;
        // (sous la ligne du sol : plein pendant l'érosion, pour ne pas ronger le pied des murs)
        const s = garder && !horizontal && yy >= sol ? 1 : xx < 0 || yy < 0 || xx >= W || yy >= H ? 0 : src[yy * W + xx];
        if (garder ? !s : s) { v = garder ? 0 : 1; break; }
      }
      o[y * W + x] = v;
    }
    return o;
  };
  m = passe(passe(m, true, true), true, false);
  m = passe(passe(m, false, true), false, false);
  for (let x = 0; x < W; x++) for (let y = sol; y < H; y++) m[y * W + x] = 0;
  // morceaux (4-voisins) : le plus grand, et ceux d'au moins 15 % de sa taille
  const lab = new Int32Array(W * H), tailles = [0];
  for (let i = 0; i < W * H; i++) {
    if (!m[i] || lab[i]) continue;
    const n = tailles.length, pile = [i]; lab[i] = n; let t = 0;
    while (pile.length) {
      const j = pile.pop(); t++;
      const x = j % W, y = (j / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const k = yy * W + xx; if (m[k] && !lab[k]) { lab[k] = n; pile.push(k); }
      }
    }
    tailles.push(t);
  }
  const grand = Math.max(0, ...tailles), garde = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) if (lab[i] && tailles[lab[i]] >= Math.max(300, 0.15 * grand)) garde[i] = 1;
  return { m: garde, W, H };
}
/**
 * Un toit dessiné par Millepoques (voir serveur.mjs) : [gauche, droite, bas] en pixels de la toile en cours.
 * ctx est le premier argument de toutes ces fonctions.
 */
function toitDe(nom, a) {
  const ctx = a[0], m = ctx.getTransform(), P = (x, y) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
  let x0, x1, y;
  if (['hipRoof', 'gableRoof', 'mansard', 'shingleRoof', 'longRoof'].includes(nom)) [x0, x1, y] = [a[1], a[2], a[3]];
  else if (nom === 'shedRoofHD') [x0, x1, y] = [a[1], a[2], a[4]];
  else if (nom === 'roofHD' || nom === 'thatchQuad') { const q = a[1]; x0 = Math.min(...q.map((p) => p[0])); x1 = Math.max(...q.map((p) => p[0])); y = Math.max(...q.map((p) => p[1])); }
  else if (nom === 'coneHD') [x0, x1, y] = [a[1][0], a[3][0], Math.max(a[1][1], a[3][1])];
  else if (nom === 'thatchCone') [x0, x1, y] = [a[1] - a[4], a[1] + a[4], a[3]];
  else if (nom === 'tileRoof' || nom === 'hallRoof') [x0, x1, y] = [a[1], a[1] + a[2], a[3]];
  else return null;
  if (![x0, x1, y].every(Number.isFinite)) return null;
  const A = P(x0, y), B = P(x1, y);
  // la matière du toit : l'ardoise des toits de tuffeau, sinon le style des toits de buildings.js (après l'époque)
  let style = 'ardoise';
  if (nom === 'roofHD') style = HD.lookRoof(a[2]); else if (nom === 'coneHD') style = HD.lookRoof(a[5]);
  else if (nom.startsWith('thatch')) style = 'thatch'; else if (nom === 'shingleRoof') style = 'shingle'; else if (nom === 'tileRoof' || nom === 'hallRoof') style = 'red';
  return [Math.min(A[0], B[0]), Math.max(A[0], B[0]), Math.max(A[1], B[1]), style];
}
/**
 * Le volume : les colonnes hautes (au moins 40 % de la plus haute) forment des corps de bâtiment. Pour chacun : la
 * hauteur de chaque colonne (tous les 2 pixels de Millepoques) et la hauteur des murs (la ligne la plus basse où
 * la silhouette est la plus large : le bas du toit qui déborde). Au-dessus des murs, le toit monte vers le faîtage.
 */
function profil({ m, W }, sol, toits = []) {
  const haut = new Int32Array(W).fill(0);
  for (let x = 0; x < W; x++) for (let y = 0; y < sol; y++) if (m[y * W + x]) { haut[x] = sol - y; break; }
  const maxH = Math.max(...haut);
  if (maxH < 12 * SS) return [];
  const seuil = 0.4 * maxH, corps = [];
  for (let x = 0; x < W;) {
    if (haut[x] < seuil) { x++; continue; }
    let x1 = x; while (x1 + 1 < W && haut[x1 + 1] >= seuil * 0.75) x1++;
    // on élargit aux colonnes basses collées (avant-toits qui débordent)
    let a = x, b = x1;
    while (a > 0 && haut[a - 1] >= seuil * 0.65) a--;
    while (b + 1 < W && haut[b + 1] >= seuil * 0.65) b++;
    if (b - a + 1 >= 24 * SS / 2) corps.push([a, b]);
    x = b + 1;
  }
  return corps.map(([a, b]) => {
    let hmax = 0; for (let x = a; x <= b; x++) hmax = Math.max(hmax, haut[x]);
    const yTop = sol - hmax, yLim = yTop + 0.75 * hmax;
    const larg = [];
    let lmax = 0;
    for (let y = yTop; y <= yLim; y++) { let n = 0; for (let x = a; x <= b; x++) n += m[y * W + x]; larg[y] = n; if (n > lmax) lmax = n; }
    let toit = yTop;
    for (let y = yTop; y <= yLim; y++) if (larg[y] >= 0.96 * lmax) toit = y;
    let hw = sol - toit;
    if (toit - yTop < 0.12 * hmax) hw = hmax; // toit plat (ou sans toit)
    // mieux : le bas du toit que Millepoques a dessiné au-dessus de ce corps (celui qui le couvre le plus)
    let best = null, bl = 0.3 * (b - a), style = null;
    for (const [t0, t1, ty, st] of toits) { const l = Math.min(b, t1) - Math.max(a, t0); if (l > bl && ty < sol - 4 * SS) { bl = l; best = ty; style = st; } }
    if (best !== null) hw = sol - best;
    hw = clamp(hw, 0.2 * hmax, hmax);
    const h = [];
    for (let x = a; x <= b; x += 2 * SS) h.push(haut[x]);
    if ((b - a) % (2 * SS)) h.push(haut[b]);
    return { a, b, hw, h, haut, toit: best !== null, style };
  });
}
/**
 * Range l'image d'un bâtiment en trois : la façade (ce que montre le volume : pleine, ses trous bouchés par les
 * couleurs voisines), ce qui dépasse au-dessus du toit (posé sur le faîtage) et ce qui est à côté (posé devant).
 */
function decouper(img, ix, iy, sol, corps, cheminees = []) { // img : l'image du bâtiment ; (ix, iy) : son coin dans le masque
  const W = img.width, H = img.height, src = img.getContext('2d').getImageData(0, 0, W, H);
  const dans = new Uint8Array(W * H), dessus = new Uint8Array(W * H);
  let fx0 = 1e9, fx1 = -1, fy0 = 1e9;
  // les cheminées (blocs 3D) : leurs pixels vont dans la façade
  for (const [c0, c1, ct] of cheminees) {
    for (let mx = Math.floor(c0); mx <= Math.ceil(c1); mx++) {
      const x = mx - ix; if (x < 0 || x >= W) continue;
      for (let my = Math.floor(ct); my < sol; my++) { const y = my - iy; if (y >= 0 && y < H) dans[y * W + x] = 1; }
      fx0 = Math.min(fx0, x); fx1 = Math.max(fx1, x); fy0 = Math.min(fy0, Math.floor(ct) - iy);
    }
  }
  for (const c of corps) {
    for (let mx = c.a; mx <= c.b; mx++) {
      const x = mx - ix; if (x < 0 || x >= W) continue;
      const top = Math.floor(sol - c.haut[mx] - 1.5 * SS); // 1,5 pixel de plus : le trait du contour
      for (let y = 0; y < H; y++) {
        const my = y + iy; if (my >= sol + 2) continue;
        if (my >= top) dans[y * W + x] = 1; else if (!dans[y * W + x]) dessus[y * W + x] = 1;
      }
      fx0 = Math.min(fx0, x); fx1 = Math.max(fx1, x); fy0 = Math.min(fy0, top - iy);
    }
  }
  const fy1 = Math.min(H - 1, sol + 1 - iy);
  const parts = { facade: null, dessus: null, cotes: null, sol: null };
  // façade : les pixels du volume, posés sur un fond flou de leurs propres couleurs (trous et bords bouchés)
  if (fx1 >= fx0) {
    const fw = fx1 - fx0 + 1, fh = fy1 - Math.max(0, fy0) + 1, oy0 = Math.max(0, fy0);
    const net = toile(fw, fh), nctx = net.getContext('2d');
    const id = nctx.createImageData(fw, fh);
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
      const s = ((y + oy0) * W + x + fx0) * 4, d = (y * fw + x) * 4;
      if (!dans[(y + oy0) * W + x + fx0]) continue;
      id.data[d] = src.data[s]; id.data[d + 1] = src.data[s + 1]; id.data[d + 2] = src.data[s + 2]; id.data[d + 3] = src.data[s + 3];
    }
    nctx.putImageData(id, 0, 0);
    const out = toile(fw, fh), o = out.getContext('2d');
    for (const b of [16, 8, 3]) { o.filter = `blur(${b}px)`; o.drawImage(net, 0, 0); o.drawImage(net, 0, 0); }
    o.filter = 'none'; o.drawImage(net, 0, 0);
    // garder seulement le volume (le flou déborde)
    const od = o.getImageData(0, 0, fw, fh);
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) { const d = (y * fw + x) * 4; od.data[d + 3] = dans[(y + oy0) * W + x + fx0] ? 255 : 0; }
    o.putImageData(od, 0, 0);
    parts.facade = { c: out, dx: fx0, dy: oy0 };
  }
  // dessus et côtés : ce qui reste de l'image
  // (sol : ce qui est dessiné sous la ligne du sol est vu de dessus dans Millepoques : posé à plat devant le bâtiment)
  for (const sorte of ['dessus', 'cotes', 'sol']) {
    const c = toile(W, H), ctx = c.getContext('2d'), id = ctx.createImageData(W, H);
    let n = 0;
    const ySol = sol - 1 - iy;
    for (let i = 0; i < W * H; i++) {
      const bas = ((i / W) | 0) >= ySol;
      const garde = sorte === 'dessus' ? dessus[i] : sorte === 'cotes' ? !dans[i] && !dessus[i] && !bas : !dans[i] && !dessus[i] && bas;
      if (!garde || src.data[i * 4 + 3] < 8) continue;
      id.data.set(src.data.subarray(i * 4, i * 4 + 4), i * 4); n++;
    }
    if (n < 30) continue;
    ctx.putImageData(id, 0, 0);
    const d = detourer(c); if (d) parts[sorte] = d;
  }
  return parts;
}

// ------------------------------------------------------------------------------------------------
// 3. Les objets debout
// ------------------------------------------------------------------------------------------------
const dedans = (x, y) => x >= X0 * TILE && x < (X0 + NW) * TILE && y >= Y0 * TILE && y < (Y0 + NH) * TILE;
const OBJETS = []; // { i, x, y (ancre, pixels Millepoques), s, k }
const BATIMENTS = []; // un par bâtiment : { m: modèle, x, y, type, nom, ... }
const MODELES = []; // un par dessin différent : { facade, corps, dessus, cotes }
const modeleParEmpreinte = new Map();
const SORTES = { 0: 'arbre', 1: 'rocher', 3: 'drapeau', 5: 'bateau', 6: 'buisson', 7: 'animal', 9: 'bete', 10: 'bateau', 11: 'decor' };
r.ss = SS; r.bss = Math.max(2, SS); r.bakeSs = SS;
const look = groundLook(w), rlook = rockLook(w);
// Le dessin d'un bâtiment comme drawBuildingAnimHD (anim.js), sans la lueur des fenêtres ni la porte qui s'ouvre
// (propres à chaque bâtiment) : deux maisons pareilles donnent la même image, donc un seul modèle.
function dessinFixe(ctx, b) {
  const A = buildingArt(artKey(b), b.w, b.h), v = variantOf(b), X = b.x * TILE, Y = b.y * TILE;
  if (A.missing) { r.drawBuilding(ctx, b); return; }
  // directement sur notre toile (pas par le cache des sprites) : les toits préviennent avec notre repère
  ctx.save(); ctx.translate(X, Y); A.draw(ctx, v, true); ctx.restore();
  const f = partsOf(artKey(b)); if (!f) return;
  ctx.save(); ctx.translate(X, Y);
  try { f(ctx, b, 12.3, 1000, r, { rise: 1, done: true, prod: 0 }); } catch (e) { log('pièces', b.type, e.message); }
  ctx.restore();
}
const defOf = (t) => g.defOf?.(t) || g.data.buildings[t] || {};
for (const it of vus.values()) {
  const o = it.o, k = it.k;
  if (k === 0) {
    if (o.falling) continue;
    const p = treePos(o); if (!dedans(p.x, p.y)) continue;
    const s = treeSprite(o, SS, look);
    const big = !(o.kind === 'stump' || o.growth < 0.3);
    const i = image(s.canvas, s.x, s.y, s.canvas);
    OBJETS.push({ i, x: p.x, y: p.y, s: big ? treeScale(o) : 1, k: 'arbre', sorte: o.kind });
  } else if (k === 1) {
    const X = (o.x + 0.5) * TILE, Y = (o.y + 0.5) * TILE + 6; if (!dedans(X, Y)) continue;
    const s = rockSprite(o, SS, rlook);
    OBJETS.push({ i: image(s.canvas, s.x, s.y, s.canvas), x: X, y: Y, s: 1, k: 'rocher' });
  } else if (k === 2) {
    const ax = (o.x + o.w / 2) * TILE, ay = it.y;
    if (!dedans(ax, ay - 1)) continue;
    const boite = [o.x * TILE - 120, o.y * TILE - 260, o.w * TILE + 240, o.h * TILE + 330];
    const plein = dansBoite(boite, (ctx) => dessinFixe(ctx, o));
    const cle = empreinte(plein) + `:${o.w}x${o.h}`;
    let mi = modeleParEmpreinte.get(cle);
    if (mi === undefined) {
      const toits = [], cheminees = [];
      globalThis.__toit = (nom, a) => {
        if (nom === 'chimney') { // (ctx, x, base, w, h) : le bloc, sa corniche et sa mitre (5 pixels au-dessus)
          const m = a[0].getTransform(), [x, base, cw, ch] = [a[1], a[2], a[3], a[4]];
          if ([x, base, cw, ch].every(Number.isFinite)) cheminees.push([m.a * (x - 2) + m.e, m.a * (x + cw + 2) + m.e, m.d * (base - ch - 5) + m.f, m.d * base + m.f]);
          return;
        }
        const t = toitDe(nom, a); if (t) toits.push(t);
      };
      const masque = dansBoite(boite, (ctx) => dessinFixe(ctx, o), true);
      globalThis.__toit = null;
      const sol = Math.round((ay - boite[1]) * SS);
      const plein2 = silhouettePleine(masque, sol);
      const corps = profil(plein2, sol, toits);
      if (q.get('voir') === o.type) { // débogage : le dessin, le masque, la silhouette
        const v = toile(plein2.W, plein2.H), vx = v.getContext('2d'), id = vx.createImageData(plein2.W, plein2.H);
        for (let i = 0; i < plein2.m.length; i++) { id.data[i * 4] = plein2.m[i] * 255; id.data[i * 4 + 3] = 255; }
        vx.putImageData(id, 0, 0);
        SORTIES.push({ nom: 'voir-plein.png', url: plein.toDataURL() }, { nom: 'voir-masque.png', url: masque.toDataURL() }, { nom: 'voir-silhouette.png', url: v.toDataURL() });
        log('voir', JSON.stringify(corps.map((c) => [c.a, c.b, c.hw])), JSON.stringify(cheminees), JSON.stringify(toits));
      }
      const d = detourer(plein);
      // une cheminée compte si elle dépasse d'un corps (pas celles cachées dans un mur)
      const chem = cheminees.filter(([c0, c1, ct]) => corps.some((c) => (c0 + c1) / 2 > c.a && (c0 + c1) / 2 < c.b && ct < sol - c.haut[Math.round((c0 + c1) / 2)] - SS));
      const parts = d ? decouper(d.c, d.dx, d.dy, sol, corps, chem) : {};
      const enMP = (px) => +(px / SS).toFixed(2);
      const ox = (px) => enMP(px) + boite[0] - ax; // abscisse dans l'image du masque -> par rapport à l'ancre
      const oy = (py) => enMP(py) + boite[1] - ay;
      { const n = {}; for (const t of toits) if (t[3]) n[t[3]] = (n[t[3]] || 0) + (t[1] - t[0]); const maj = Object.keys(n).sort((x, y) => n[y] - n[x])[0];
        for (const c of corps) if (!c.style && maj) c.style = maj; }
      const mod = {
        corps: corps.map((c) => ({ a: ox(c.a), b: ox(c.b), hw: enMP(c.hw), h: c.h.map(enMP), ...(c.toit ? {} : { devine: 1 }), ...(c.style && TOITS_TEX.has(c.style) ? { toit: c.style } : {}) })),
      };
      if (chem.length) mod.cheminees = chem.map(([c0, c1, ct]) => [ox(c0), ox(c1), +(-oy(ct)).toFixed(2)]); // gauche, droite, hauteur du haut
      if (parts.facade) mod.facade = image(parts.facade.c, ox(d.dx + parts.facade.dx), oy(d.dy + parts.facade.dy), parts.facade.c);
      if (parts.dessus) mod.dessus = image(parts.dessus.c, ox(d.dx + parts.dessus.dx), oy(d.dy + parts.dessus.dy), parts.dessus.c);
      if (parts.cotes) mod.cotes = image(parts.cotes.c, ox(d.dx + parts.cotes.dx), oy(d.dy + parts.cotes.dy), parts.cotes.c);
      if (parts.sol) mod.sol = image(parts.sol.c, ox(d.dx + parts.sol.dx), oy(d.dy + parts.sol.dy), parts.sol.c);
      if (!corps.length && d) mod.cotes = image(d.c, ox(d.dx), oy(d.dy), d.c); // rien d'assez haut : tout en découpe
      MODELES.push(mod); mi = MODELES.length - 1; modeleParEmpreinte.set(cle, mi);
    }
    const def = defOf(o.type);
    BATIMENTS.push({ m: mi, id: o.id, x: ax, y: ay, type: o.type, art: artKey(o), nom: def.name || o.type, bx: o.x - X0, by: o.y - Y0, bw: o.w, bh: o.h, porte: def.doorX ?? 0.5 });
  } else {
    let ax, boite, dessin;
    if (k === 3) { ax = o.wx; boite = [o.wx - 40, o.wy - 70, 80, 100]; dessin = (ctx) => drawFlagHD(ctx, o, r.time, false, !!w.lanes); }
    else if (k === 5) { ax = o.x; boite = [o.x - 120, o.y - 160, 240, 220]; dessin = (ctx) => { drawBoatHD(ctx, o, r.time); coverBoat(ctx, g, o, r.time); }; }
    else if (k === 6) { ax = (o.x + 0.5) * TILE; boite = [o.x * TILE - 40, o.y * TILE - 60, 120, 140]; dessin = (ctx) => drawBerryBushHD(ctx, o, r.time); }
    else if (k === 7) { ax = o.x; boite = [o.x - 70, o.y - 90, 140, 130]; dessin = (ctx) => drawAnimalHD(ctx, o, r.time); }
    else if (k === 9) { ax = o.x; boite = [o.x - 70, o.y - 90, 140, 130]; dessin = (ctx) => drawBeastHD(ctx, o, r.time); }
    else if (k === 11) { ax = o.x ?? 0; boite = [ax - 80, it.y - 160, 160, 220]; dessin = (ctx) => drawCityDecor(ctx, o, r.time, g); }
    else continue;
    if (!dedans(ax, it.y - 1)) continue;
    const im = seul(boite, dessin);
    if (!im) continue;
    OBJETS.push({ i: image(im.c, im.x - ax, im.y - it.y), x: ax, y: it.y, s: 1, k: SORTES[k] || 'objet' });
  }
}
log('objets', OBJETS.length, 'bâtiments', BATIMENTS.length, 'modèles', MODELES.length, 'images', IMAGES.length);

// ------------------------------------------------------------------------------------------------
// 4. Les habitants, pour les personnages en 3D : leur apparence (tenue, couleurs, chapeau) telle que Millepoques la
//    tire (faces.js lookOf), et leur tête dessinée par Millepoques, de face et de dos, sans chapeau, en grand.
// ------------------------------------------------------------------------------------------------
const SS_TETE = 10;
function tete(u, vue) {
  let vu = null;
  globalThis.__tete = (ctx, j, L, view, hx, hy) => { const m = ctx.getTransform(); vu = { j, L, view, x: m.a * hx + m.c * hy + m.e, y: m.b * hx + m.d * hy + m.f, k: m.a }; };
  globalThis.__sansChapeau = true;
  const boite = [-24, -50, 48, 60];
  if (vue === 'face') Object.assign(u, { moving: false, idleT: 2, mdx: 0, mdy: 1, dir: 1, _fdir: 1, _view: 'front', _gd: 0 });
  else Object.assign(u, { moving: true, mdx: 0, mdy: -1, dir: 1, _fdir: 1, _view: 'back', _gd: 0, _gx: 0, _gy: 0, _gw: 0, walkT: 0 });
  const c = dansBoite(boite, (ctx) => drawUnitHD(ctx, u, 1.0, null), false, SS_TETE);
  globalThis.__tete = null; globalThis.__sansChapeau = false;
  if (!vu) return null;
  // on garde le dessus de la tête jusque sous le menton (6,5 pixels sous le centre ; les nattes de Millie sont coupées là)
  const coupe = Math.round(vu.y + 6.5 * SS_TETE);
  const h = toile(c.width, coupe); h.getContext('2d').drawImage(c, 0, 0);
  const d = detourer(h); if (!d) return null;
  // une case de la planche des têtes : le centre de la tête au centre de la case
  const n = TETES.length, cc = toile(CASE_TETE, CASE_TETE);
  cc.getContext('2d').drawImage(h, CASE_TETE / 2 - vu.x, CASE_TETE / 2 - vu.y);
  TETES.push(cc);
  // (gauche, droite, haut, bas) : l'étendue de la tête dessinée autour de son centre, en pixels de Millepoques
  const e = [(vu.x - d.dx) / SS_TETE, (d.dx + d.c.width - vu.x) / SS_TETE, (vu.y - d.dy) / SS_TETE, (d.dy + d.c.height - vu.y) / SS_TETE].map((v) => +v.toFixed(2));
  return { n, e, L: vu.L, j: vu.j };
}
const TETES = [], CASE_TETE = 200; // 20 pixels de Millepoques par case
const garder = (o, cles) => Object.fromEntries(cles.filter((k) => o[k] !== undefined && o[k] !== null && typeof o[k] !== 'function').map((k) => [k, o[k]]));
function villageois(id, job, extra = {}) {
  const u = { id, job, x: 0, y: 0, moving: false, game: g, visible: true, ...extra };
  const f = tete(u, 'face'), b = tete({ ...u }, 'dos');
  if (!f) return null;
  const L = f.L, j = f.j || {};
  return {
    id, metier: job,
    tete: { face: f.n, dos: b?.n ?? f.n, e: f.e, de: b?.e ?? f.e },
    look: { ...garder(L, ['fem', 'old', 'skin', 'hairC', 'hairD', 'style', 'beard', 'build', 'hs', 'ws', 'tunic', 'legs', 'pants', 'pants2', 'pat', 'patC', 'hat', 'hatC', 'apronF', 'trim', 'ribbon', 'hose', 'sleeves']),
      ren: L.ren ? garder(L.ren, Object.keys(L.ren)) : null },
    tenue: garder(j, ['tunic', 'pants', 'apron', 'vest', 'robe', 'cape', 'boot', 'sleeves', 'tool', 'hat', 'hatC', 'plain', 'work', 'notable', 'dress', 'skirt', 'fem', 'braids']),
  };
}
const METIERS = ['carrier', 'baker', 'farmer', 'printer', 'student', 'weaver', 'carter', 'peddler', 'papermaker', 'builder', 'teacher', 'shipwright', 'cartographer', 'slater'];
const HABITANTS = [villageois(900001, 'millie', { outfit: millieOutfit(g.era.id) })];
METIERS.forEach((job, n) => { for (const k of [0, 1]) HABITANTS.push(villageois(101 + n * 37 + k * 1009, job)); });
for (let k = HABITANTS.length - 1; k >= 0; k--) if (!HABITANTS[k]) HABITANTS.splice(k, 1);
log('exemple', JSON.stringify(HABITANTS[1]).slice(0, 900));
log('habitants', HABITANTS.length);
{ // la planche des têtes
  const nc = 8, pl = toile(nc * CASE_TETE, Math.ceil(TETES.length / nc) * CASE_TETE), x = pl.getContext('2d');
  TETES.forEach((c, k) => x.drawImage(c, (k % nc) * CASE_TETE, Math.floor(k / nc) * CASE_TETE));
  SORTIES.push({ nom: 'tetes.webp', url: enImage(pl, 'image/webp', 0.92) });
  var PLANCHE_TETES = { f: 'tetes.webp', nc, case: CASE_TETE, px: SS_TETE, w: pl.width, h: pl.height };
}

// ------------------------------------------------------------------------------------------------
// 5. Dedans : les pièces qui bougent quand on travaille (une sorte de bâtiment = un dessin)
// ------------------------------------------------------------------------------------------------
const NB_TRAVAIL = 16, DT_TRAVAIL = 0.1; // 16 images, 10 par seconde
const INTERIEURS = {};
const vusArt = new Set();
for (const B of BATIMENTS) {
  if (vusArt.has(B.type)) continue; vusArt.add(B.type);
  const b = [...g.buildings.values()].find((o) => o.id === B.id);
  const f = partsOf(B.art);
  const def = defOf(B.type);
  const rec = def.recipe || {};
  const info = { nom: def.name || B.type, info: def.info || '', metier: def.job || null, entree: rec.in || def.inputs || {}, sortie: rec.out || (def.produces ? { [def.produces]: 1 } : {}) };
  if (f && b) {
    b.working = true; b.manned = true; b.producedT = undefined;
    const X = b.x * TILE, Y = b.y * TILE, s = { rise: 1, done: true, prod: 0 };
    const boite = [X - 120, Y - 260, b.w * TILE + 240, b.h * TILE + 330];
    const toiles = [];
    for (let n = 0; n < NB_TRAVAIL; n++) {
      const t = 40 + n * DT_TRAVAIL;
      r.time = t;
      toiles.push(dansBoite(boite, (ctx) => { ctx.save(); ctx.translate(X, Y); try { f(ctx, b, t, g.time + n * DT_TRAVAIL, r, s); } catch (e) { log('pièces', B.type, e.message); } ctx.restore(); }));
    }
    // la boîte commune à toutes les images
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (const c of toiles) { const d = detourer(c); if (d) { x0 = Math.min(x0, d.dx); y0 = Math.min(y0, d.dy); x1 = Math.max(x1, d.dx + d.c.width); y1 = Math.max(y1, d.dy + d.c.height); } }
    if (x1 > x0) {
      const ax = (b.x + b.w / 2) * TILE, ay = (b.y + b.h) * TILE - 2;
      // un fichier par sorte de bâtiment (chargé seulement quand on entre) : les images en grille de 4 colonnes
      const fw = x1 - x0, fh = y1 - y0, nc = 4, grille = toile(fw * nc, fh * Math.ceil(NB_TRAVAIL / nc)), gc = grille.getContext('2d');
      toiles.forEach((c, n) => gc.drawImage(c, x0, y0, fw, fh, (n % nc) * fw, Math.floor(n / nc) * fh, fw, fh));
      const nom = `travail/${B.type}.webp`;
      SORTIES.push({ nom, url: enImage(grille, 'image/webp', 0.9) });
      info.travail = { f: nom, n: NB_TRAVAIL, nc, fw, fh, dt: DT_TRAVAIL, ox: +(boite[0] + x0 / SS - ax).toFixed(2), oy: +(boite[1] + y0 / SS - ay).toFixed(2), ss: SS };
    }
    b.working = false;
  }
  INTERIEURS[B.type] = info;
}
log('intérieurs', Object.keys(INTERIEURS).length, 'avec travail', Object.values(INTERIEURS).filter((i) => i.travail).length);

// Les icônes des marchandises (entrées, sorties) : celles de Millepoques
const MARCHANDISES = {};
for (const i of Object.values(INTERIEURS)) for (const m of [...Object.keys(i.entree), ...Object.keys(i.sortie)]) {
  if (MARCHANDISES[m] !== undefined) continue;
  const c = toile(40 * SS, 40 * SS), ctx = c.getContext('2d');
  ctx.setTransform(SS * 1.6, 0, 0, SS * 1.6, 20 * SS, 28 * SS);
  try { drawGood(ctx, m, 1); } catch { /* inconnue */ }
  const d = detourer(c);
  MARCHANDISES[m] = d ? image(d.c, 0, 0, d.c) : -1;
}

// Murs et sols des intérieurs, dessinés par les fonctions de Millepoques (tuffeau.js)
const MATIERES = {};
function matiere(nom, W, H, dessin) {
  const c = toile(W * SS, H * SS), ctx = c.getContext('2d');
  ctx.setTransform(SS, 0, 0, SS, 0, 0);
  dessin(ctx, W, H);
  SORTIES.push({ nom: `dedans-${nom}.webp`, url: enImage(c, 'image/webp', 0.9) });
  MATIERES[nom] = { f: `dedans-${nom}.webp`, w: W, h: H };
}
const rect = (x0, y0, x1, y1) => [[x0, y1], [x0, y0], [x1, y0], [x1, y1]];
const MUR_W = 256, MUR_H = 64; // 16 m sur 4 m (pixels de Millepoques)
function fenetres(ctx, W) { for (let x = 40; x < W - 20; x += 72) { croisee(ctx, x, 14, 14, 18, { pal: WOOD, frame: 2, glass: 'lead' }); wallLamp(ctx, x + 36, 22, 1); } }
function plinthe(ctx, W, H) { ctx.fillStyle = vGrad(ctx, H - 6, H, ['rgba(40,24,10,0)', 'rgba(40,24,10,0.35)']); ctx.fillRect(0, H - 6, W, 6); }
matiere('tuffeau', MUR_W, MUR_H, (ctx, W, H) => { ashlar(ctx, rect(-4, -4, W + 4, H + 4), 7, { course: 5, stroke: false }); fenetres(ctx, W); plinthe(ctx, W, H); });
matiere('brique', MUR_W, MUR_H, (ctx, W, H) => { brick(ctx, rect(-4, -4, W + 4, H + 4), 5, { stroke: false }); fenetres(ctx, W); plinthe(ctx, W, H); });
matiere('colombage', MUR_W, MUR_H, (ctx, W, H) => {
  halfTimber(ctx, rect(-4, 2, W + 4, H + 4), -4, W + 4, 2, H, 3, { skip: [[36, 58], [108, 130], [180, 202]] });
  fenetres(ctx, W); plinthe(ctx, W, H);
});
matiere('bois', MUR_W, MUR_H, (ctx, W, H) => {
  const rr = prng(11);
  for (let x = 0; x < W; x += 9) {
    const c = rr() < 0.5 ? WOOD.l : WOOD.b;
    ctx.fillStyle = hGrad(ctx, x, x + 9, [light(c, 0.12), c, shade(c, 0.15)]); ctx.fillRect(x, 0, 9, H);
    ctx.fillStyle = WOOD.dd; ctx.fillRect(x, 0, 0.9, H);
    for (let k = 0; k < 2; k++) { ctx.fillStyle = 'rgba(40,20,8,0.35)'; ctx.beginPath(); ctx.ellipse(x + 2 + rr() * 5, rr() * H, 1, 1.6, 0, 0, 7); ctx.fill(); }
  }
  tbeam(ctx, 0, 6, W, 6, 4); tbeam(ctx, 0, H - 3, W, H - 3, 4);
  for (let x = 0; x <= W; x += 64) tbeam(ctx, x, 6, x, H, 4);
  fenetres(ctx, W); plinthe(ctx, W, H);
});
matiere('pierre', MUR_W, MUR_H, (ctx, W, H) => { ashlar(ctx, rect(-4, -4, W + 4, H + 4), 3, { course: 7, stroke: false, pal: { l: '#d6cdbd', b: '#bfb3a0', d: '#a3967f', joint: 'rgba(90,78,60,0.6)' } }); fenetres(ctx, W); plinthe(ctx, W, H); });
matiere('sol-pave', 128, 128, (ctx, W, H) => paving(ctx, rect(0, 0, W, H), 4, '#cdbf9f'));
// Les toits vus de côté et de dos : la couverture dessinée par Millepoques sur une grande surface (sans bords)
matiere('toit-ardoise', 96, 96, (ctx, W, H) => hipRoof(ctx, -60, W + 60, H + 30, -40, 0, { seed: 5, over: 0, finials: 0 }));
for (const st of ['rslate', 'slate', 'red', 'ochre', 'thatch', 'shingle', 'blue', 'moss']) matiere(`toit-${st}`, 96, 96, (ctx, W, H) => HD.roofHD(ctx, [[-40, H + 20], [W + 40, H + 20], [W + 40, -20], [-40, -20]], st, 14, 0, 7));
// Les ponts en 3D : la pierre et le bois aux couleurs des ponts de Millepoques (render/bridges.js, COL)
const PIERRE_PONT = {
  roman: { l: '#ebe0c3', b: '#d4c3a0', d: '#b09f7c', joint: 'rgba(133,122,96,0.75)', deck: '#b8a988' },
  medieval: { l: '#d6ccb5', b: '#bdb29a', d: '#978c75', joint: 'rgba(122,112,92,0.75)', deck: '#a89e88' },
  renaissance: { l: '#f5efdd', b: '#e6dcc4', d: '#c4b89c', joint: 'rgba(136,125,100,0.7)', deck: '#b1a589' },
};
for (const [nom, pal] of Object.entries(PIERRE_PONT)) {
  matiere(`pont-${nom}`, 128, 64, (ctx, W, H) => ashlar(ctx, rect(-4, -4, W + 4, H + 4), 13, { course: 6, stroke: false, pal, ao: false }));
  matiere(`pont-${nom}-dalles`, 64, 64, (ctx, W, H) => paving(ctx, rect(0, 0, W, H), 9, pal.deck));
}
matiere('pont-bois', 64, 64, (ctx, W, H) => {
  const rr = prng(17);
  for (let x = 0; x < W; x += 8) {
    const c = rr() < 0.5 ? '#b98a52' : '#cfa268';
    ctx.fillStyle = hGrad(ctx, x, x + 8, [light(c, 0.12), c, shade(c, 0.18)]); ctx.fillRect(x, 0, 8, H);
    ctx.fillStyle = '#6a4322'; ctx.fillRect(x, 0, 1, H);
    for (let k = 0; k < 2; k++) { ctx.fillStyle = 'rgba(90,52,24,0.5)'; ctx.beginPath(); ctx.ellipse(x + 2 + rr() * 4, rr() * H, 0.8, 1.4, 0, 0, 7); ctx.fill(); }
  }
});
matiere('sol-bois', 128, 128, (ctx, W, H) => {
  const rr = prng(5);
  for (let y = 0; y < H; y += 8) {
    let x = -rr() * 30;
    while (x < W) { const l = 30 + rr() * 30, c = rr() < 0.5 ? '#b98a5a' : '#a87a4c'; ctx.fillStyle = vGrad(ctx, y, y + 8, [light(c, 0.1), c, shade(c, 0.12)]); ctx.fillRect(x, y, l, 8); ctx.fillStyle = 'rgba(60,34,14,0.7)'; ctx.fillRect(x, y, 0.8, 8); x += l; }
    ctx.fillStyle = 'rgba(60,34,14,0.7)'; ctx.fillRect(0, y, W, 0.8);
  }
});
matiere('plafond', 128, 128, (ctx, W, H) => {
  ctx.fillStyle = '#5a3a20'; ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 6) { ctx.fillStyle = y % 12 ? '#6b4a2e' : '#5e3f24'; ctx.fillRect(0, y, W, 5.4); }
  for (let x = 16; x < W; x += 32) tbeam(ctx, x, 0, x, H, 9);
});
log('matières', Object.keys(MATIERES).length);

// ------------------------------------------------------------------------------------------------
// Planches : les images rangées en étagères dans des planches de 2048 × 2048
// ------------------------------------------------------------------------------------------------
const PL = 2048, MARGE = 4;
const ordre = IMAGES.map((im, i) => i).sort((a, b) => IMAGES[b].c.height - IMAGES[a].c.height);
const planches = [];
let pl = null, px = 0, py = 0, hauteur = 0;
const RECTS = new Array(IMAGES.length);
function nouvellePlanche() { const c = toile(PL, PL); pl = { c, ctx: c.getContext('2d') }; planches.push(pl); px = MARGE; py = MARGE; hauteur = 0; }
nouvellePlanche();
for (const i of ordre) {
  const c = IMAGES[i].c, cw = Math.min(c.width, PL - 2 * MARGE), chh = Math.min(c.height, PL - 2 * MARGE);
  if (px + cw + MARGE > PL) { px = MARGE; py += hauteur + MARGE; hauteur = 0; }
  if (py + chh + MARGE > PL) nouvellePlanche();
  pl.ctx.drawImage(c, px, py, cw, chh);
  RECTS[i] = [planches.length - 1, px, py, cw, chh];
  px += cw + MARGE; hauteur = Math.max(hauteur, chh);
}
planches.forEach((p, n) => SORTIES.push({ nom: `objets-${n}.webp`, url: enImage(p.c, 'image/webp', 0.92) }));
log('planches', planches.length);

// ------------------------------------------------------------------------------------------------
// Où l'on peut marcher, les routes, le départ
// ------------------------------------------------------------------------------------------------
const lignes = [];
for (let y = 0; y < NH; y++) {
  let l = '';
  for (let x = 0; x < NW; x++) {
    const X = X0 + x, Y = Y0 + y, i = w.idx(X, Y);
    let c = '.';
    if (!w.inside(X, Y)) c = '#';
    else if (w.isWater(X, Y) && !w.bridge[i]) c = '~';
    else if (w.isLava(X, Y)) c = '#';
    else if (w.bldAt[i]) c = 'B';
    else if (w.rockAt[i]) c = 'R';
    else if (w.bridge[i]) c = 'P';
    else if (w.roadAt[i] || w.flagAt[i]) c = '=';
    else if (w.locked(X, Y)) c = '#';
    l += c;
  }
  lignes.push(l);
}
const WS = V.save.worlds[V.save.active || 'old'];
const routes = [];
for (const [, , , cases] of WS.roads || []) {
  const pts = cases.map((i) => [i % w.W - X0, Math.floor(i / w.W) - Y0]);
  if (pts.every(([x, y]) => x >= 1 && y >= 1 && x < NW - 1 && y < NH - 1) && pts.length >= 2) routes.push(pts);
}
const hq = g.hq;
const depart = hq ? { x: (hq.x + hq.w / 2) * TILE, y: (hq.y + hq.h + 1.5) * TILE } : { x: (X0 + NW / 2) * TILE, y: (Y0 + NH / 2) * TILE };

// Le relief de Millepoques (altitude aux coins des cases, 0 à 1) et la nature de chaque case, pour toute la carte
const b64 = (u8) => { let t = ''; for (let i = 0; i < u8.length; i += 0x8000) t += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(t); };
const alt = new Uint16Array(w.elev.length); for (let i = 0; i < alt.length; i++) alt[i] = Math.round(Math.max(0, Math.min(1, w.elev[i])) * 65535);
const RELIEF = { w: w.W + 1, h: w.H + 1, alt: b64(new Uint8Array(alt.buffer)), nature: b64(new Uint8Array(w.terrain)), pont: b64(new Uint8Array(w.bridge)) };
const PONTS = [...(w.bridges?.values() || [])].map((br) => ({ look: br.look || br.kind, kind: br.kind, dir: br.dir, a: [br.a.x - X0, br.a.y - Y0], b: [br.b.x - X0, br.b.y - Y0] }));
log('ponts', PONTS.length, JSON.stringify(PONTS.slice(0, 3)));
const loc = (px, ref) => +((px / TILE) - ref).toFixed(3); // pixels de Millepoques -> cases de la fenêtre
window.CUIT = {
  json: {
    format: 'village-millepoques', version: 1, source: V.source, epoque: g.era.id,
    case: TILE, ss: SS, x0: X0, y0: Y0, w: NW, h: NH, monde: { w: w.W, h: w.H },
    sol: { taille: CH, px: PXSOL, morceaux }, loin: 'loin.webp', carte: 'carte.webp',
    planches: planches.map((p, n) => ({ f: `objets-${n}.webp`, w: PL, h: PL })),
    images: IMAGES.map((im, i) => ({ r: RECTS[i], ox: +im.ox.toFixed(2), oy: +im.oy.toFixed(2), ...(im.ss !== SS ? { ss: im.ss } : {}) })),
    objets: OBJETS.map((o) => ({ ...o, x: loc(o.x, X0), y: loc(o.y, Y0), s: +o.s.toFixed(3) })),
    modeles: MODELES,
    batiments: BATIMENTS.map((b) => ({ ...b, x: loc(b.x, X0), y: loc(b.y, Y0) })),
    habitants: HABITANTS, interieurs: INTERIEURS, marchandises: MARCHANDISES, matieres: MATIERES,
    cases: lignes, routes, relief: RELIEF, ponts: PONTS, tetes: PLANCHE_TETES,
    depart: { x: loc(depart.x, X0), y: loc(depart.y, Y0) },
  },
  sorties: SORTIES.map((s) => s.nom),
};
window.SORTIES = SORTIES;
log('fini');
