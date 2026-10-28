// habits.js — les vêtements : des copies GONFLÉES du corps (mêmes os, mêmes poids de peau : ils suivent l'animation), découpées
// à la bonne hauteur (coupe exacte des triangles le long de y ou de la longueur lng, pas de bord en dents de scie).
// habiller(g, o) : haut (t-shirt / sweat), bas (short / pantalon / jean / legging), baskets ; maillot(g, su) : boxer (garçon),
// une-pièce (fille), combinaison ; tongs avec le maillot (cachées dans l'eau par anim.js : g.userData.tongs).
// Pudeur : tout est lisse à l'entrejambe (pas de relief), les enfants sont toujours habillés ou en maillot.
import * as THREE from "three";
import { construireCorps } from "./corps.js";
import { INDEX_OS } from "./squelette.js";
import { matTissu, matSemelle, matCaoutchouc } from "./materiaux.js";
import { suitTex, SUITS, mergeGeometries } from "../jeu.js";

const mx = Math.max, mn = Math.min, ab = Math.abs, ss = (a, b, x) => { const t = mn(1, mx(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const GEOS = new Map();

// ---- découpe : champ(i) ≥ 0 garde le sommet i ; dec(i) = décalage le long de la normale ; k = échelle des uv
function extraire(src, champ, dec, k = [1, 1]) {
  const A = src.attributes, I = src.index.array, n = A.position.count, s = new Float32Array(n), O = new Float32Array(n);
  for (let i = 0; i < n; i++) { s[i] = champ(i); O[i] = s[i] >= 0 ? dec(i) : 0; }
  const P = [], N = [], UV = [], SI = [], SW = [], R = [], L = [], OF = [], map = new Map(), idx = [];
  const ajoute = i => { let j = map.get(i); if (j !== undefined) return j; j = P.length / 3; map.set(i, j);
    P.push(A.position.getX(i), A.position.getY(i), A.position.getZ(i)); N.push(A.normal.getX(i), A.normal.getY(i), A.normal.getZ(i)); UV.push(A.uv.getX(i) * k[0], A.uv.getY(i) * k[1]);
    SI.push(A.skinIndex.getX(i), A.skinIndex.getY(i), A.skinIndex.getZ(i), A.skinIndex.getW(i)); SW.push(A.skinWeight.getX(i), A.skinWeight.getY(i), A.skinWeight.getZ(i), A.skinWeight.getW(i)); R.push(A.region.getX(i)); L.push(A.lng.getX(i)); OF.push(O[i]); return j; };
  const coupe = (a, b) => { const t = s[a] / (s[a] - s[b]), j = P.length / 3, l = (x, y) => x + (y - x) * t;
    P.push(l(A.position.getX(a), A.position.getX(b)), l(A.position.getY(a), A.position.getY(b)), l(A.position.getZ(a), A.position.getZ(b)));
    const nx = l(A.normal.getX(a), A.normal.getX(b)), ny = l(A.normal.getY(a), A.normal.getY(b)), nz = l(A.normal.getZ(a), A.normal.getZ(b)), q = Math.hypot(nx, ny, nz) || 1; N.push(nx / q, ny / q, nz / q);
    UV.push(l(A.uv.getX(a), A.uv.getX(b)) * k[0], l(A.uv.getY(a), A.uv.getY(b)) * k[1]); const d = s[a] >= 0 ? a : b;
    SI.push(A.skinIndex.getX(d), A.skinIndex.getY(d), A.skinIndex.getZ(d), A.skinIndex.getW(d)); SW.push(A.skinWeight.getX(d), A.skinWeight.getY(d), A.skinWeight.getZ(d), A.skinWeight.getW(d));
    R.push(A.region.getX(d)); L.push(l(A.lng.getX(a), A.lng.getX(b))); OF.push(l(O[a], O[b]) + 0); return j; };
  for (let t = 0; t < I.length; t += 3) { const v = [I[t], I[t + 1], I[t + 2]], ok = v.map(i => s[i] >= 0), c = ok[0] + ok[1] + ok[2];
    if (c === 0) continue; if (c === 3) { idx.push(ajoute(v[0]), ajoute(v[1]), ajoute(v[2])); continue; }
    if (c === 1) { const k0 = ok.indexOf(true), a = v[k0], b = v[(k0 + 1) % 3], d = v[(k0 + 2) % 3]; idx.push(ajoute(a), coupe(a, b), coupe(a, d)); }
    else { const k0 = ok.indexOf(false), a = v[k0], b = v[(k0 + 1) % 3], d = v[(k0 + 2) % 3], e = coupe(a, b), f = coupe(a, d), jb = ajoute(b), jd = ajoute(d); idx.push(e, jb, jd, e, jd, f); } }
  for (let j = 0; j < OF.length; j++) for (let c = 0; c < 3; c++) P[j * 3 + c] += N[j * 3 + c] * OF[j];
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(UV, 2));
  g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(SI, 4)); g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(SW, 4)); g.setIndex(idx); g.userData.partage = true; return g;
}
// quelques mesures d'après le corps (pose de liaison)
function repere(type, variante) {
  const { geo, meta } = construireCorps(type, "plein", variante), A = geo.attributes, J = meta.joints, enfant = type === "garcon" || type === "fille", Lg = meta.longueurs;
  return { geo, meta, J, enfant, Lg, reg: i => A.region.getX(i), lng: i => A.lng.getX(i), X: i => A.position.getX(i), Y: i => A.position.getY(i), Z: i => A.position.getZ(i) };
}
const memo = (cle, f) => { if (!GEOS.has(cle)) GEOS.set(cle, f()); return GEOS.get(cle); };

// ---- haut : t-shirt (manches courtes) ou sweat (manches longues), dessous coupé aux hanches
export const geoHaut = (type, long, mot) => memo(`haut|${type}|${long}|${mot === 'etoiles'}`, () => {
  const { geo, J, enfant, Lg, reg, lng, Y } = repere(type, "chausse"), hem = J.bassin.y - (long ? .035 : .015), Lm = long ? Lg.bras : enfant ? .13 : .16, ep = long ? .016 : .011;
  return extraire(geo, i => { const r = reg(i); return r === 0 ? Y(i) - hem : r === 3 ? Lm - lng(i) : r === 4 && long ? Lg.avantbras - .014 - lng(i) : -1; },
    i => { const r = reg(i); return ep + (r === 0 ? .008 * (1 - ss(hem, hem + .13, Y(i))) * (long ? .6 : 1) : r === 4 ? .003 - .005 * ss(Lg.avantbras - .07, Lg.avantbras - .014, lng(i)) : .003 * ss(0, Lm, lng(i))); }, [3, 14]); // avant-bras : continu au coude, poignet resserré
});
// ---- bas : short, pantalon (jean), legging
export const geoBas = (type, sorte) => memo(`bas|${type}|${sorte}`, () => {
  const { geo, J, enfant, Lg, reg, lng, Y } = repere(type, "chausse"), taille = J.bassin.y + .055, ep = sorte === "legging" ? .006 : sorte === "short" ? .01 : .011;
  const Lc = sorte === "short" ? (enfant ? .2 : .24) : Lg.cuisse + .01, Lj = Lg.jambe - .03;
  return extraire(geo, i => { const r = reg(i); return r === 0 ? taille - Y(i) : r === 6 ? Lc - lng(i) : r === 7 && sorte !== "short" ? Lj - lng(i) : -1; },
    i => { const r = reg(i), L = lng(i); return ep + (sorte === "short" ? .006 * ss(0, Lc, L) : sorte === "legging" ? 0 : .004 * ss(Lg.cuisse, Lg.cuisse + Lj, L + (r === 7 ? Lg.cuisse : 0))); }, [3, 12]);
});
// ---- baskets : l'empeigne (pied gonflé + col sur le bas du tibia) et la semelle (bande basse plus large)
export const geoBasket = (type, partie) => memo(`bask|${type}|${partie}`, () => {
  const { geo, J, Lg, reg, lng, Y } = repere(type, "chausse"), ch = J.pied_g.y;
  if (partie === "semelle") return extraire(geo, i => reg(i) === 8 ? .031 - Y(i) : -1, i => .017, [1, 1]);
  return extraire(geo, i => { const r = reg(i); return r === 8 ? 1 : r === 7 ? lng(i) - (Lg.jambe - .045) : -1; }, i => reg(i) === 8 ? .0115 : .009 * ss(Lg.jambe - .045, Lg.jambe - .02, lng(i)), [1, 1]);
});
// ---- tongs : semelle plate sous le pied nu (extrusion du contour) et lanière en Y ; collées à l'os du pied (un côté : "d" ou "g")
const NI = g => { const o = g.index ? g.toNonIndexed() : g; for (const a of Object.keys(o.attributes)) if (a !== "position" && a !== "normal") o.deleteAttribute(a); return o; };
export const geoTongs = (type, cote) => memo(`tongs|${type}|${cote}`, () => {
  const { J, enfant } = repere(type, ""), pz = J.pied_g.z, tz = J.orteils_g.z, W = enfant ? .052 : .058, X = J["pied_" + cote].x, z0 = pz - .055, z1 = tz + .075;
  const f = new THREE.Shape(); f.moveTo(0, z0 + .02); f.bezierCurveTo(-W, z0, -W * 1.05, z1 - .09, -W * .7, z1 - .02); f.bezierCurveTo(-W * .4, z1 + .008, W * .4, z1 + .008, W * .7, z1 - .02); f.bezierCurveTo(W * 1.05, z1 - .09, W, z0, 0, z0 + .02);
  const sole = new THREE.ExtrudeGeometry(f, { depth: .01, bevelEnabled: true, bevelThickness: .0025, bevelSize: .0025, bevelSegments: 1, curveSegments: 8 }); sole.rotateX(Math.PI / 2); sole.translate(0, .014, 0);
  const br = (a, b, r) => { const d = new THREE.Vector3().subVectors(b, a), c = new THREE.CylinderGeometry(r, r, d.length(), 5, 1); c.translate(0, d.length() / 2, 0); c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); c.translate(a.x, a.y, a.z); return c; };
  const V = (x, y, z) => new THREE.Vector3(x, y, z), gap = V(0, .02, tz + .03);
  const g = mergeGeometries([sole, br(gap, V(-W * .78, .05, pz + .03), .0065), br(gap, V(W * .78, .05, pz + .03), .0065), br(gap, V(0, .052, pz + .07), .0055)].map(NI)); g.translate(X, 0, 0); return lierOs(g, "pied_" + cote);
});
// ---- maillots
export const geoMaillot = (type, sorte) => memo(`mai|${type}|${sorte}`, () => {
  const { geo, J, enfant, Lg, reg, lng, X, Y, Z } = repere(type, ""), by = J.bassin.y, ep = .0075;
  if (sorte === "boxer") { const top = by + .07, Lb = enfant ? .17 : .2; return extraire(geo, i => { const r = reg(i); return r === 0 ? top - Y(i) : r === 6 ? Lb - lng(i) : -1; }, i => ep + .004 * ss(0, Lb, lng(i)) * (reg(i) === 6 ? 1 : 0), [2, 3]); }
  if (sorte === "combi") return extraire(geo, i => { const r = reg(i); return r === 0 || r === 6 ? 1 : r === 3 ? 1 : r === 4 ? Lg.avantbras - .012 - lng(i) : r === 7 ? Lg.jambe - .02 - lng(i) : -1; }, i => .006, [2, 3]);
  // une-pièce : haut devant au-dessus de la poitrine (échancré), plus bas dans le dos, jambes très échancrées, emmanchures
  const xs = enfant ? .085 : .1, yf = J.poitrine.y + (enfant ? .1 : .11), yb = J.poitrine.y + .02, ya = J.bras_g.y - .17, cr = by - .1;
  return extraire(geo, i => { const r = reg(i); if (r !== 0 && r !== 6) return -1; const x = ab(X(i)), y = Y(i), z = Z(i), f = ss(-.04, .04, z), top0 = yb + (yf - yb) * f, ech = ss(.02, .07, x) * .02 * f, top = mn(top0 - ech, mn(top0, ya + ss(xs + .045, xs + .08, x) * 9));
    const jb = cr - .05 + (mix(by - .05, by + .02, f) - cr + .05) * ss(.015, .14, x); return mn(top - y, y - jb); }, i => ep, [2, 3]);
});
const mix = (a, b, t) => a + (b - a) * t;
// bretelles de la une-pièce : deux tubes qui passent sur l'épaule (points posés sur le corps par le champ de distance)
function geoBretelles(type) { return memo("bret|" + type, () => {
  const { meta, J, enfant } = repere(type, ""), sdf = meta.sdf, xs = enfant ? .085 : .1, y0 = J.poitrine.y + (enfant ? .1 : .11);
  const V = (x, y, z) => new THREE.Vector3(x, y, z), lance = (o, d) => { let t = 0, p = o.clone(); for (let k = 0; k < 80; k++) { const v = sdf(p.x, p.y, p.z); if (v < .0005) break; t += mx(.003, v * .9); p.copy(o).addScaledVector(d, t); } return p.addScaledVector(d, -.0055); };
  const L = []; for (const s of [-1, 1]) { const x = s * xs, pts = [lance(V(x, y0 - .005, .3), V(0, 0, -1)), lance(V(x, y0 + .03, .15), V(0, -.7, -.7).normalize()), lance(V(x, J.cou.y + .03, .0), V(0, -1, 0)), lance(V(x, J.poitrine.y + .1, -.3), V(0, -.2, 1).normalize())];
    pts.splice(2, 0, lance(V(x, J.cou.y + .03, .045), V(0, -1, 0))); const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, .0095, 5, false); L.push(tube); }
  const m = mergeGeometries(L.map(NI)); const n = m.attributes.position.count, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4); for (let i = 0; i < n; i++) { si[i * 4] = INDEX_OS.poitrine; sw[i * 4] = 1; }
  m.setAttribute("skinIndex", new THREE.BufferAttribute(si, 4)); m.setAttribute("skinWeight", new THREE.BufferAttribute(sw, 4)); m.userData.partage = true; return m; }); }
// capuche du sweat : une demi-boule molle derrière le cou
function geoCapuche(type) { return memo("capu|" + type, () => {
  const { J, enfant } = repere(type, "chausse"), g = new THREE.SphereGeometry(1, 12, 8); g.scale(enfant ? .105 : .12, enfant ? .075 : .085, enfant ? .07 : .08); g.translate(0, J.cou.y + .012, J.cou.z - .05); g.deleteAttribute("uv");
  const n = g.attributes.position.count, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4); for (let i = 0; i < n; i++) { si[i * 4] = INDEX_OS.poitrine; sw[i * 4] = 1; }
  g.setAttribute("skinIndex", new THREE.BufferAttribute(si, 4)); g.setAttribute("skinWeight", new THREE.BufferAttribute(sw, 4)); g.userData.partage = true; return g; }); }
// lie une géométrie à un os (poids 1)
function lierOs(g, nom) { const n = g.attributes.position.count, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4); for (let i = 0; i < n; i++) { si[i * 4] = INDEX_OS[nom]; sw[i * 4] = 1; }
  const o = g.clone(); o.userData.partage = true; o.setAttribute("skinIndex", new THREE.BufferAttribute(si, 4)); o.setAttribute("skinWeight", new THREE.BufferAttribute(sw, 4)); return o; }

// ---- motifs (dessinés en code) : rayures, étoiles, cerises ; l'arc-en-ciel est un décalque sur la poitrine
const TEX = new Map();
function motif(k, col) {
  const cle = k + col; if (TEX.has(cle)) return TEX.get(cle);
  const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d"), hx = "#" + new THREE.Color(col).getHexString();
  if (k === "rayures") { x.fillStyle = "#f6f5ef"; x.fillRect(0, 0, 64, 64); x.fillStyle = hx; x.fillRect(0, 0, 64, 32); }
  else if (k === "etoiles") { x.fillStyle = hx; x.fillRect(0, 0, 64, 64); const st = (cx, cy, r, f) => { x.fillStyle = f; x.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * .45 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.fill(); };
    st(16, 16, 9, "#ffffff"); st(48, 40, 8, "#ffc93c"); st(14, 50, 5, "#ff8fb1"); st(52, 10, 5, "#b39ddb"); }
  else { x.fillStyle = "#f8f6f0"; x.fillRect(0, 0, 64, 64); for (const [px, py] of [[14, 18], [44, 12], [30, 40], [54, 52], [10, 54]]) { x.strokeStyle = "#3d7a3a"; x.lineWidth = 2; x.beginPath(); x.moveTo(px, py); x.lineTo(px + 4, py - 9); x.stroke(); x.fillStyle = hx; x.beginPath(); x.arc(px, py + 3, 5, 0, 7); x.fill(); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.userData = { partage: true }; TEX.set(cle, t); return t;
}
function texArcEnCiel() {
  if (TEX.has("arc")) return TEX.get("arc"); const c = document.createElement("canvas"); c.width = 128; c.height = 64; const x = c.getContext("2d"); x.lineCap = "round"; x.lineWidth = 7;
  ["#e74c3c", "#f39c12", "#f7dc5a", "#3fbf6a", "#3a7fd5", "#8e5bd0"].forEach((cc, i) => { x.strokeStyle = cc; x.beginPath(); x.arc(64, 58, 52 - i * 7.5, Math.PI, 0); x.stroke(); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.userData = { partage: true }; TEX.set("arc", t); return t;
}
function decalArc(type) { return memo("arc|" + type, () => {
  const { meta, J, enfant } = repere(type, "chausse"), sdf = meta.sdf, w = enfant ? .1 : .12, h = w * .5, y = J.poitrine.y + (enfant ? .035 : .04), g = new THREE.PlaneGeometry(w, h, 6, 1), p = g.attributes.position, v = new THREE.Vector3(), e = .002;
  for (let i = 0; i < p.count; i++) { let x = p.getX(i), yy = y + p.getY(i), z = .3; for (let k = 0; k < 28; k++) { const d = sdf(x, yy, z); if (ab(d) < 1e-4) break; z -= mn(.05, mx(-.05, d)); }
    p.setXYZ(i, x, yy, z + .0125); } g.computeVertexNormals(); const n = p.count, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4); for (let i = 0; i < n; i++) { si[i * 4] = INDEX_OS.poitrine; sw[i * 4] = 1; } void v; void e;
  g.setAttribute("skinIndex", new THREE.BufferAttribute(si, 4)); g.setAttribute("skinWeight", new THREE.BufferAttribute(sw, 4)); g.userData.partage = true; return g; }); }

// ---- assemblage sur le personnage
function ajouter(g, geo, mat, nom, ombre = true) {
  const u = g.userData, m = new THREE.SkinnedMesh(geo, mat); m.bind(u.skeleton, new THREE.Matrix4()); m.boundingSphere = u.corps.boundingSphere; m.name = nom; m.castShadow = ombre; m.receiveShadow = true; m.frustumCulled = false; g.add(m); u.habits.push(m); return m;
}
function nettoyer(g) { const u = g.userData; for (const m of u.habits ?? []) { g.remove(m); const mt = m.material; if (mt && !mt.userData?.partage) (Array.isArray(mt) ? mt : [mt]).forEach(x => x.dispose?.()); } u.habits = []; u.tongs = []; }
export function habiller(g, o = {}) {
  nettoyer(g); const u = g.userData, c = u.clothes, type = u.type, jean = c.motifBas === "jean", legg = c.motifBas === "cerises" && !c.shorts, long = !!c.manches;
  // haut
  const mot = c.motifHaut, mh = matTissu(mot === "etoiles" ? 0xffffff : c.shirt, { map: mot === "rayures" ? motif("rayures", c.shirt) : mot === "etoiles" ? motif("etoiles", c.shirt) : null, sorte: long ? "molleton" : "coton" });
  if (mot === "rayures" || mot === "etoiles") mh.map.userData.partage = true;
  ajouter(g, geoHaut(type, long, mot), mh, "haut");
  if (c.capuche) ajouter(g, geoCapuche(type), matTissu(c.shirt, { sorte: "molleton" }), "capuche");
  if (mot === "arcenciel") { const mm = new THREE.MeshStandardMaterial({ map: texArcEnCiel(), transparent: true, roughness: .8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }); ajouter(g, decalArc(type), mm, "motif", false).renderOrder = 2; }
  // bas
  const sorte = c.shorts ? "short" : legg ? "legging" : "long", mb = matTissu(legg && !jean ? 0xffffff : jean ? 0x3b5b8c : c.pants, { sorte: jean ? "jean" : legg ? "lycra" : "coton", map: legg ? motif("cerises", c.pants) : null });
  ajouter(g, geoBas(type, sorte), mb, "bas");
  // baskets
  const ms = matTissu(c.shoe, { sorte: "maille" }); ajouter(g, geoBasket(type, "empeigne"), ms, "baskets"); ajouter(g, geoBasket(type, "semelle"), matSemelle(0xf4f2ec), "semelle");
}
// maillot : id de SUITS (boxer / une-pièce / combinaison) + tongs ; null → habits
export function maillot(g, su) {
  const u = g.userData, type = u.type; nettoyer(g); const c = u.clothes;
  const sorte = su.full ? "combi" : u.female ? "une" : "boxer", tex = suitTex(su), mm = matTissu(0xffffff, { map: tex, sorte: su.gold ? "or" : "lycra" });
  ajouter(g, geoMaillot(type, sorte), mm, "maillot");
  if (sorte === "une") ajouter(g, geoBretelles(type), matTissu(su.a ?? "#e74c3c", { sorte: "lycra" }), "bretelles");
  // tongs : une semelle + lanière par pied, cachées dans l'eau (anim.js)
  const mt = matCaoutchouc(c.shoe); for (const cote of ["d", "g"]) u.tongs.push(ajouter(g, geoTongs(type, cote), mt, "tong", false));
}
export const SUITS_LISTE = SUITS;
