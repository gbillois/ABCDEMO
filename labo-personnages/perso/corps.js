// corps.js — la peau des personnages : un seul maillage continu, de la tête aux orteils, en pose de liaison (pose A).
// 1) une cage de quadrilatères posée sur le squelette : anneaux autour du tronc ; bras et jambes sortis de trous du
//    tronc ; pouce et quatre doigts sortis de la main ; cinq orteils sortis du pied (le gros orteil à part) ;
// 2) Catmull-Clark (1 niveau en « plein », aucun en « léger ») : positions, poids des os et groupes suivent ;
// 3) chaque sommet est plaqué (Newton) sur un champ de distance anatomique : profils elliptiques le long des os,
//    ellipsoïdes (deltoïdes, fesses, rotules, omoplates…), cônes arrondis (doigts, orteils), unions douces ;
// 4) le cou et la tête : des anneaux lancés sur la tête de tete.js (plus serrés sur le visage).
// Construit une fois par type et par qualité, puis partagé (geo.userData.partage).
//
// construireCorps(type, qualite = "plein" | "leger", variante = "" | "chausse") → { geo, meta }   (geo en pose de liaison, indexée)
//   « chausse » : le même corps, mais le pied finit en bout rond sans orteils (pour les chaussures ; la foule l'a toujours)
//   attributs : position, normal (gradient du champ), uv (u = angle autour de l'os de la région, 0,5 côté latéral / devant,
//   couture côté médial / dans le dos, dédoublée ; v = lng), skinIndex/skinWeight (4 os, somme 1, fondus aux articulations),
//   region (0 tronc, 1 cou, 2 tête, 3 bras, 4 avant-bras, 5 main, 6 cuisse, 7 jambe, 8 pied ; côté = signe de x),
//   lng (le long de l'os de la région depuis son articulation proximale : tronc = y − bassin.y, tête = y − tete.y).
//   geo.userData.oreilles = [début, nombre] : les oreilles de tete.js (os « tete ») à la fin de l'index.
//   meta : { type, H, sdf(x,y,z) (pose de liaison, < 0 dedans), champs (le champ par groupe : tronc, cou, tete, bras_d/g,
//   main_d/g, jambe_d/g — utile pour gonfler une manche sans attraper le tronc), joints (Vector3 par os), tete (repères
//   de tete.js en pose de liaison), regions, axes[région][côté] = { o, w, u, v } (repère de uv et lng), longueurs, stats }.
import * as THREE from "three";
import { TYPES, NOMS_OS, INDEX_OS, liaison, articulation } from "./squelette.js";
import { sdfTete, reperesTete, oreilles } from "./tete.js";

// régions (attribut « region ») ; lng = longueur le long de l'os de la région, 0 à son articulation proximale
export const REGIONS = ["tronc", "cou", "tete", "bras", "avantbras", "main", "cuisse", "jambe", "pied"];
// tout le reste est privé (le jeu colle les modules dans une seule fonction : pas de noms en double avec tete.js, visage.js…)
export const construireCorps = (() => {
const NB = NOMS_OS.length, I = INDEX_OS, PI = Math.PI;
const OS_REGION = [["bassin", null], ["cou", "tete"], ["tete", null], ["bras", "avantbras"], ["avantbras", "main"], ["main", "doigts"], ["cuisse", "jambe"], ["jambe", "pied"], ["pied", "orteils"]];

// ---------- petits outils de vecteurs [x, y, z] (construction seulement, pas dans les boucles chaudes)
const ad = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sb = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const ml = (a, s) => [a[0] * s, a[1] * s, a[2] * s], dt = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const ln = a => Math.hypot(a[0], a[1], a[2]), nr = a => ml(a, 1 / (ln(a) || 1)), lp = (a, b, t) => ad(a, ml(sb(b, a), t));
const som = (...l) => l.reduce(ad), ortho = (u, w) => nr(sb(u, ml(w, dt(u, w))));
const X = (q, s) => [s * q[0], q[1], q[2]]; // miroir (s = −1 : côté droit)
const smst = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const tourne = (v, ax, a) => { const c = Math.cos(a), s = Math.sin(a), k = dt(ax, v); return som(ml(v, c), ml(cr(ax, v), s), ml(ax, k * (1 - c))); };

// ---------- champ de distance : primitives (toutes en pose de liaison), union douce
const smin = (a, b, k) => { const h = k - Math.abs(a - b); return h > 0 ? Math.min(a, b) - h * h * .25 / k : Math.min(a, b); };
const boite = (b, x, y, z) => { const dx = Math.max(b[0] - x, 0, x - b[3]), dy = Math.max(b[1] - y, 0, y - b[4]), dz = Math.max(b[2] - z, 0, z - b[5]); return Math.sqrt(dx * dx + dy * dy + dz * dz); };
const boiteDe = (pts, r) => { const b = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9]; for (const p of pts) for (let i = 0; i < 3; i++) { b[i] = Math.min(b[i], p[i] - r); b[i + 3] = Math.max(b[i + 3], p[i] + r); } return b; };
// ellipsoïde : centre, 3 axes unitaires, 3 rayons (approximation d'Inigo Quilez)
function ellipsoide(c, ax, r) {
  const [cx, cy, cz] = c, [a, b, e] = r, ia = 1 / a, ib = 1 / b, ie = 1 / e, [u, v, w] = ax, m = Math.min(a, b, e);
  const f = (x, y, z) => { const dx = x - cx, dy = y - cy, dz = z - cz;
    const X1 = (dx * u[0] + dy * u[1] + dz * u[2]) * ia, Y1 = (dx * v[0] + dy * v[1] + dz * v[2]) * ib, Z1 = (dx * w[0] + dy * w[1] + dz * w[2]) * ie;
    const k0 = Math.sqrt(X1 * X1 + Y1 * Y1 + Z1 * Z1), k1 = Math.sqrt(X1 * X1 * ia * ia + Y1 * Y1 * ib * ib + Z1 * Z1 * ie * ie);
    return k1 > 1e-12 ? k0 * (k0 - 1) / k1 : -m; };
  return { f, box: boiteDe([c], Math.max(a, b, e)) };
}
const sphere = (c, r) => ellipsoide(c, [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [r, r, r]);
const repere = (a, b) => { const u = nr(a), v = ortho(b, u); return [u, v, cr(u, v)]; }; // axes orthonormés : a, puis b redressé
// courbe lisse (Hermite) dans une table : pts = [[s, v1, v2…]] → Float32Array(n × m)
function courbe(pts, n) {
  const m = pts[0].length - 1, out = new Float32Array(n * m);
  for (let i = 0; i < n; i++) { const s = i / (n - 1); let k = 0; while (k < pts.length - 2 && s > pts[k + 1][0]) k++;
    const p0 = pts[Math.max(k - 1, 0)], p1 = pts[k], p2 = pts[Math.min(k + 1, pts.length - 1)], p3 = pts[Math.min(k + 2, pts.length - 1)];
    const h = p2[0] - p1[0], u = h > 0 ? Math.min(1, Math.max(0, (s - p1[0]) / h)) : 0, u2 = u * u, u3 = u2 * u;
    for (let c = 1; c <= m; c++) { const m1 = (p2[c] - p0[c]) / Math.max(p2[0] - p0[0], 1e-6) * h, m2 = (p3[c] - p1[c]) / Math.max(p3[0] - p1[0], 1e-6) * h;
      let v = (2 * u3 - 3 * u2 + 1) * p1[c] + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * p2[c] + (u3 - u2) * m2;
      const lo = Math.min(p1[c], p2[c]), hi = Math.max(p1[c], p2[c]), mg = (hi - lo) * .2; out[i * m + c - 1] = Math.min(hi + mg, Math.max(lo - mg, v)); } }
  return out;
}
// profil le long d'un segment A→B : section en « œuf » (4 demi-axes u+, u−, v+, v−) décalée de (ou, ov),
// pts = [[s, u+, u−, v+, v−, ou, ov]] ; bouts arrondis (rayon cap × le plus petit demi-axe)
function profil(A, B, U0, V0, pts, cap = 1) {
  const W = nr(sb(B, A)), L = ln(sb(B, A)), U = ortho(U0, W), V = ortho(ortho(V0, W), U), N = 33, T = courbe(pts, N), iL = 1 / L;
  const [ax, ay, az] = A, [wx, wy, wz] = W, [ux, uy, uz] = U, [vx, vy, vz] = V;
  let R = 0; for (let i = 0; i < N; i++) { const o = i * 6; R = Math.max(R, Math.abs(T[o + 4]) + Math.max(T[o], T[o + 1]), Math.abs(T[o + 5]) + Math.max(T[o + 2], T[o + 3])); }
  const f = (x, y, z) => {
    const dx = x - ax, dy = y - ay, dz = z - az, t = dx * wx + dy * wy + dz * wz;
    let s = t * iL, e = 0; if (s < 0) { e = t; s = 0; } else if (s > 1) { e = t - L; s = 1; }
    const fi = s * (N - 1), i0 = fi >= N - 1 ? N - 2 : fi | 0, fr = fi - i0, o = i0 * 6;
    const aup = T[o] + (T[o + 6] - T[o]) * fr, aum = T[o + 1] + (T[o + 7] - T[o + 1]) * fr, avp = T[o + 2] + (T[o + 8] - T[o + 2]) * fr;
    const avm = T[o + 3] + (T[o + 9] - T[o + 3]) * fr, ou = T[o + 4] + (T[o + 10] - T[o + 4]) * fr, ov = T[o + 5] + (T[o + 11] - T[o + 5]) * fr;
    const qu = dx * ux + dy * uy + dz * uz - ou, qv = dx * vx + dy * vy + dz * vz - ov;
    const au = qu > 0 ? aup : aum, av = qv > 0 ? avp : avm, m = au < av ? au : av, ae = cap * m;
    const X1 = qu / au, Y1 = qv / av, Z1 = e / ae, k0 = Math.sqrt(X1 * X1 + Y1 * Y1 + Z1 * Z1);
    const k1 = Math.sqrt(X1 * X1 / (au * au) + Y1 * Y1 / (av * av) + Z1 * Z1 / (ae * ae));
    return k1 > 1e-12 ? k0 * (k0 - 1) / k1 : -m; };
  return { f, box: boiteDe([A, B], R * (1 + cap)), W, U, V, L };
}
// cône arrondi de a (rayon r1) à b (rayon r2), distance exacte (Inigo Quilez)
function cone(a, b, r1, r2) {
  const [ax, ay, az] = a, bx = b[0] - ax, by = b[1] - ay, bz = b[2] - az, l2 = bx * bx + by * by + bz * bz, rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2, sr = Math.sign(rr);
  const f = (x, y, z) => { const px = x - ax, py = y - ay, pz = z - az, yy = px * bx + py * by + pz * bz, zz = yy - l2;
    const qx = px * l2 - bx * yy, qy = py * l2 - by * yy, qz = pz * l2 - bz * yy, x2 = qx * qx + qy * qy + qz * qz, y2 = yy * yy * l2, z2 = zz * zz * l2, k = sr * rr * rr * x2;
    if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
    if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
    return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - r1; };
  return { f, box: boiteDe([a, b], Math.max(r1, r2)) };
}
// pièce : [primitive, k, soustraire?] enchaînées par unions (ou soustractions) douces ; boîte englobante pour sauter le loin
function piece(l) {
  const n = l.length, P = l.map(e => e[0]), K = l.map(e => e[1] || 0), S = l.map(e => !!e[2]), f0 = P[0].f;
  const f = (x, y, z) => { let d = f0(x, y, z);
    for (let i = 1; i < n; i++) { const b = boite(P[i].box, x, y, z);
      if (S[i]) { if (b > K[i]) continue; d = -smin(-d, P[i].f(x, y, z), K[i]); }
      else { if (b > d + K[i]) continue; d = smin(d, P[i].f(x, y, z), K[i]); } }
    return d; };
  const box = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9]; P.forEach((p, i) => { if (!S[i]) for (let j = 0; j < 3; j++) { box[j] = Math.min(box[j], p.box[j]); box[j + 3] = Math.max(box[j + 3], p.box[j + 3]); } });
  return { f, box };
}
// union douce de pièces [pièce, k] (k : rayon du raccord avec ce qui précède)
function union(l) {
  const n = l.length, P = l.map(e => e[0]), K = l.map(e => e[1]);
  return (x, y, z) => { let d = P[0].f(x, y, z);
    for (let i = 1; i < n; i++) { if (boite(P[i].box, x, y, z) > d + K[i]) continue; d = smin(d, P[i].f(x, y, z), K[i]); }
    return d; };
}
// gradient (tétraèdre) : renvoie la valeur, écrit le gradient dans g
function gradient(f, x, y, z, g, h = .0012) {
  const a = f(x + h, y - h, z - h), b = f(x - h, y - h, z + h), c = f(x - h, y + h, z - h), d = f(x + h, y + h, z + h), s = .25 / h;
  g[0] = (a - b - c + d) * s; g[1] = (-a - b + c + d) * s; g[2] = (-a + b - c + d) * s; return (a + b + c + d) * .25;
}

// ---------- morphologie (pose zéro, côté gauche x > 0). Enfant de 8 ans d'après SPEC §6 et la photo de la piscine.
// tronc : [os, dy, demi-largeur, avant, arrière, centre z] ; profils : [s, latéral, médial, avant, arrière, du, dv]
const ENFANT = {
  tronc: [["bassin", -.075, .145, .08, .094, -.004], ["bassin", -.04, .168, .092, .113, -.008], ["bassin", 0, .18, .1, .122, -.01], ["bassin", .05, .176, .107, .114, -.009],
    ["bassin", .105, .166, .115, .104, -.005], ["colonne", 0, .158, .121, .1, -.001], ["colonne", .06, .156, .119, .102, -.004], ["poitrine", -.1, .157, .115, .108, -.008],
    ["poitrine", -.04, .16, .116, .115, -.012], ["poitrine", .02, .161, .117, .121, -.016], ["bras", -.1, .155, .111, .12, -.02], ["bras", -.05, .143, .099, .111, -.025],
    ["cou", -.045, .122, .083, .093, -.03], ["cou", -.005, .1, .072, .08, -.033], ["cou", .025, .08, .066, .072, -.035], ["cou", .055, .066, .058, .066, -.035]],
  capBas: .55,
  joug: { n: [.032, .024, -.004], a: [-.022, .012, -.004], p: [[0, .04, .048, .046, .055, 0, 0], [.5, .033, .044, .043, .05, 0, 0], [1, .028, .04, .04, .046, 0, 0]], k: .055 },
  clav: { a: [.032, -.006, .054], b: [-.035, .03, .0], r: [.0072, .0068], k: .03 },
  omo: { c: [.076, .1, -.116], r: [.052, .064, .016], rot: .22, k: .035 },
  ventre: { c: [0, -.025, .03], r: [.13, .1, .095], k: .05 }, nombril: .0075,
  fesse: { c: [.058, -.022, -.07], r: [.074, .07, .056], k: .035 },
  pecto: null, seins: null,
  cou: [[0, .07, .07, .066, .074, 0, 0], [.4, .066, .066, .063, .068, 0, 0], [.75, .063, .063, .059, .066, 0, 0], [1, .062, .062, .056, .065, 0, 0]], kCou: .045, kTete: .03,
  delt: { c: [.008, -.035, .003], r: [.047, .08, .058], k: .02 },
  bras: [[0, .046, .042, .046, .046, 0, 0], [.25, .044, .043, .046, .045, 0, 0], [.5, .043, .042, .047, .043, 0, .002], [.75, .041, .04, .043, .041, 0, 0], [.92, .039, .039, .038, .041, 0, -.002], [1, .039, .039, .036, .043, 0, -.003]],
  avbras: [[0, .04, .04, .038, .041, 0, -.002], [.2, .042, .041, .039, .038, 0, 0], [.45, .038, .037, .036, .033, 0, 0], [.7, .032, .03, .033, .028, 0, 0], [.9, .025, .023, .031, .026, 0, 0], [1, .022, .021, .03, .028, 0, 0]],
  coude: { c: [0, .008, -.027], r: [.018, .022, .014], k: .015 },
  paume: [[0, .018, .017, .028, .027, 0, 0], [.3, .016, .02, .036, .034, 0, 0], [.6, .0145, .019, .041, .038, 0, 0], [.85, .014, .017, .044, .04, 0, 0], [1, .0145, .0145, .044, .04, 0, 0]],
  doigts: { v: [.031, .0105, -.0105, -.029], w: [-.004, .002, -.001, -.009], L: [.084, .093, .087, .068], r: [.0118, .0123, .0113, .0098],
    flex: [[.07, .12, .08], [.09, .15, .1], [.12, .18, .11], [.15, .21, .13]], ecart: [.035, .006, -.018, -.05] },
  pouce: { base: [.022, .022, -.008], d: [.78, .48, -.4], L: [.036, .027, .023], r: [.016, .0128, .0115, .0102] },
  cuisse: [[0, .07, .092, .082, .082, -.012, 0], [.1, .071, .086, .08, .079, -.016, 0], [.3, .069, .074, .074, .072, -.02, 0], [.55, .063, .066, .066, .064, -.022, 0], [.75, .059, .059, .06, .056, -.022, 0], [.9, .057, .058, .056, .052, -.02, 0], [1, .054, .056, .052, .05, -.018, 0]],
  rotule: { c: [0, .005, .04], r: [.024, .029, .013], k: .022 },
  jambe: [[0, .052, .054, .05, .05, -.018, 0], [.1, .053, .057, .048, .058, -.017, 0], [.25, .054, .06, .045, .066, -.015, 0], [.4, .05, .055, .042, .062, -.012, 0], [.6, .043, .045, .038, .048, -.008, 0], [.8, .037, .037, .034, .038, -.004, 0], [.92, .034, .035, .032, .034, -.002, 0], [1, .034, .034, .033, .034, 0, 0]],
  malleole: { m: [-.032, .012, 0, .014], l: [.03, -.005, -.004, .013] },
  pied: { h: [.042, -.035], b: [-.004, .024, -.01], p: [[0, .038, .037, .035, .042, 0, 0], [.15, .039, .037, .05, .04, 0, 0], [.35, .042, .038, .048, .034, 0, 0], [.6, .048, .042, .036, .028, 0, 0], [.85, .056, .05, .028, .024, 0, 0], [1, .058, .052, .024, .024, 0, 0]],
    voute: [.006, -.009, .42, .02, .013, .05] }, // voûte : sous le bord interne du pied (décalage depuis le bord), légère
  orteils: { b: [[-.03, .016, -.002], [-.006, .012, -.004], [.011, .006, -.005], [.026, -.002, -.006], [.039, -.012, -.007]], L: [.05, .042, .037, .032, .027], r: [.0155, .0105, .01, .0095, .009], a: [-.04, 0, .05, .1, .16] },
  // anneaux de la cage (hauteurs relatives) et largeur des colonnes de la main / du pied
  mainL: .044, piedC: [[-.038, -.022, -.008, .006, .02, .036], [-.044, -.024, -.008, .008, .024, .042], [-.048, -.017, -.002, .012, .026, .04]],
};
// adultes : on part de l'enfant et on change ce qui compte (épaules, bassin, poitrine, épaisseur des membres)
const cp = o => JSON.parse(JSON.stringify(o));
const echelle = (pts, k, kz = k) => pts.map(([s, a, b, c, d, e, f]) => [s, a * k, b * k, c * kz, d * kz, e * k, f * kz]);
// enfants un peu moins maigres que les mesures de base (cuisses, mollets, bras), d'après la photo de la piscine
const ENFANT8 = (() => { const M = cp(ENFANT); M.cuisse = echelle(M.cuisse, 1.06); M.jambe = echelle(M.jambe, 1.05); M.bras = echelle(M.bras, 1.03); M.avbras = echelle(M.avbras, 1.03); return M; })();
function morpho(type) {
  if (TYPES[type].age === "enfant") return ENFANT8;
  const f = type === "femme", M = cp(ENFANT);
  M.tronc = f
    ? [["bassin", -.08, .16, .088, .1, -.004], ["bassin", -.04, .19, .1, .125, -.008], ["bassin", .0, .205, .106, .135, -.012], ["bassin", .06, .195, .105, .118, -.01],
      ["bassin", .12, .172, .1, .1, -.005], ["colonne", 0, .155, .098, .094, -.004], ["colonne", .07, .158, .1, .1, -.006], ["poitrine", -.1, .165, .105, .108, -.01],
      ["poitrine", -.03, .17, .112, .114, -.014], ["poitrine", .04, .172, .115, .12, -.018], ["bras", -.11, .168, .11, .12, -.022], ["bras", -.055, .16, .1, .112, -.026],
      ["cou", -.05, .125, .08, .09, -.03], ["cou", -.005, .082, .062, .072, -.036], ["cou", .03, .062, .055, .064, -.038]]
    : [["bassin", -.08, .15, .085, .1, -.004], ["bassin", -.04, .175, .098, .118, -.008], ["bassin", .0, .186, .104, .124, -.01], ["bassin", .06, .182, .108, .112, -.008],
      ["bassin", .12, .175, .11, .106, -.004], ["colonne", 0, .172, .112, .104, -.002], ["colonne", .07, .178, .115, .108, -.006], ["poitrine", -.1, .19, .12, .116, -.01],
      ["poitrine", -.03, .198, .126, .122, -.014], ["poitrine", .04, .2, .128, .128, -.018], ["bras", -.11, .196, .122, .128, -.022], ["bras", -.055, .182, .108, .118, -.027],
      ["cou", -.05, .135, .085, .095, -.032], ["cou", -.005, .088, .068, .078, -.038], ["cou", .03, .07, .062, .07, -.04]];
  const kb = f ? 1.12 : 1.22, kj = f ? 1.25 : 1.2;
  M.joug.p = echelle(M.joug.p, f ? 1.06 : 1.13); M.joug.a = f ? [-.02, .012, -.004] : [-.015, .014, -.006];
  M.delt.r = f ? [.052, .088, .064] : [.062, .095, .072]; M.delt.c = f ? [.01, -.038, .003] : [.014, -.04, .004];
  M.bras = echelle(M.bras, kb); M.avbras = echelle(M.avbras, kb); M.coude.r = M.coude.r.map(v => v * kb);
  M.paume = echelle(M.paume, 1.12); M.mainL *= 1.12; M.doigts.r = M.doigts.r.map(v => v * 1.14); M.doigts.L = M.doigts.L.map(v => v * 1.3);
  M.doigts.v = M.doigts.v.map(v => v * 1.12); M.pouce.r = M.pouce.r.map(v => v * 1.14); M.pouce.L = M.pouce.L.map(v => v * 1.3); M.pouce.base = M.pouce.base.map(v => v * 1.12);
  M.cuisse = echelle(M.cuisse, kj); M.jambe = echelle(M.jambe, f ? 1.2 : 1.18); M.rotule.r = M.rotule.r.map(v => v * 1.2);
  M.cou = echelle(M.cou, f ? 1.0 : 1.12); M.clav.r = M.clav.r.map(v => v * 1.15);
  M.ventre = f ? { c: [0, -.03, .02], r: [.14, .11, .09], k: .05 } : { c: [0, -.02, .02], r: [.15, .11, .095], k: .05 };
  M.fesse = f ? { c: [.072, -.03, -.078], r: [.088, .082, .066], k: .04 } : { c: [.065, -.025, -.074], r: [.08, .078, .06], k: .035 };
  M.omo = { c: [.088, .1, -.124], r: [.058, .07, .016], rot: .22, k: .035 };
  M.pecto = f ? null : { c: [.07, .095, .072], r: [.09, .06, .036], k: .065 };
  M.seins = f ? { c: [.085, .03, .07], r: [.075, .068, .05], k: .055 } : null;
  M.pied.p = echelle(M.pied.p, .93, .95); M.pied.h = [.046, -.04]; // le profil est déjà mis à la longueur du pied (sp) : largeur ≈ ×1,1 M.orteils.r = M.orteils.r.map(v => v * 1.12); M.orteils.L = M.orteils.L.map(v => v * 1.05);
  M.orteils.b = M.orteils.b.map(p => p.map(v => v * 1.12)); M.piedC = M.piedC.map(l => l.map(v => v * 1.14)); M.malleole.m[3] *= 1.2; M.malleole.l[3] *= 1.2;
  return M;
}

// ---------- groupes de sommets (chacun plaqué sur une union de pièces voisines) et rangs (le « parent » l'emporte)
const GR = { TRONC: 0, COU: 1, TETE: 2, BRAS: 3, PAUME: 5, JAMBE: 7, DOIGT: 9, ORTEIL: 19 }, NG = 29;
const gBras = s => 3 + s, gPaume = s => 5 + s, gJambe = s => 7 + s, gDoigt = (s, i) => 9 + s * 5 + i, gOrteil = (s, i) => 19 + s * 5 + i;
const RANG = [0, 1, 2, 1, 1, 2, 2, 1, 1, ...Array(10).fill(3), ...Array(10).fill(2)];
const miroirG = g => g < 3 ? g : g < 9 ? (g - 3 ^ 1) + 3 : g < 19 ? (g - 9 < 5 ? g + 5 : g - 5) : (g - 19 < 5 ? g + 5 : g - 5);
const MIROIR_OS = NOMS_OS.map(n => I[n.endsWith("_d") ? n.slice(0, -2) + "_g" : n.endsWith("_g") ? n.slice(0, -2) + "_d" : n]);

// passage pose zéro → pose de liaison pour un os (le membre suit son os)
function lieur(type) {
  const L = liaison(type);
  return nom => { const e = L.monde[I[nom]].elements, j = articulation(type, nom);
    return { p: q => { const x = q[0] - j[0], y = q[1] - j[1], z = q[2] - j[2]; return [e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]]; },
      d: q => [e[0] * q[0] + e[4] * q[1] + e[8] * q[2], e[1] * q[0] + e[5] * q[1] + e[9] * q[2], e[2] * q[0] + e[6] * q[1] + e[10] * q[2]] }; };
}

// ---------- l'anatomie : pièces, groupes, repères (côté gauche en pose zéro pour la cage)
function anatomie(type, qualite, variante) {
  const M = morpho(type), J = n => articulation(type, n), lie = lieur(type), leger = qualite !== "plein", bloc = leger || variante === "chausse"; // bloc : orteils fondus (foule, pied chaussé)
  const hb = J("bassin")[1], hn = J("cou")[1], S = J("bras_g"), E = J("avantbras_g"), Wr = J("main_g"), K = J("doigts_g");
  const Ht = J("cuisse_g"), Kn = J("jambe_g"), An = J("pied_g"), To = J("orteils_g"), Jt = J("tete"), Jc = J("cou");
  // ---- tronc
  const tr = M.tronc.map(([os, dy, a, zf, zb, zc]) => [J(os)[1] + dy, a, zf, zb, zc]), y0 = tr[0][0], y1 = tr[tr.length - 1][0];
  const axeTronc = y => { let k = 0; while (k < tr.length - 2 && y > tr[k + 1][0]) k++; const t = Math.min(1, Math.max(0, (y - tr[k][0]) / (tr[k + 1][0] - tr[k][0])));
    const a = tr[k], b = tr[k + 1], zc = a[4] + (b[4] - a[4]) * t, zf = a[2] + (b[2] - a[2]) * t, zb = a[3] + (b[3] - a[3]) * t; return zc + (zf - zb) * .5; };
  const lt = [[profil([0, y0, 0], [0, y1, 0], [1, 0, 0], [0, 0, 1], tr.map(([y, a, zf, zb, zc]) => [(y - y0) / (y1 - y0), a, a, zf, zb, 0, zc]), M.capBas)]];
  const zAvant = y => { let k = 0; while (k < tr.length - 2 && y > tr[k + 1][0]) k++; const t = Math.min(1, Math.max(0, (y - tr[k][0]) / (tr[k + 1][0] - tr[k][0]))); return tr[k][4] + tr[k][2] + (tr[k + 1][4] + tr[k + 1][2] - tr[k][4] - tr[k][2]) * t; };
  for (const s of [-1, 1]) {
    const j = M.joug, n0 = X([j.n[0], hn + j.n[1], Jc[2] + j.n[2]], s), a0 = X(ad(S, j.a), s);
    lt.push([profil(n0, a0, [0, 1, 0], [0, 0, 1], j.p, 1), j.k]);
    const c = M.clav; lt.push([cone(X([c.a[0], hn + c.a[1], c.a[2]], s), X(ad(S, c.b), s), c.r[0], c.r[1]), c.k]);
    const o = M.omo, ca = Math.cos(o.rot), sa = Math.sin(o.rot) * s;
    lt.push([ellipsoide(X([o.c[0], J("poitrine")[1] + o.c[1], o.c[2]], s), [[ca, sa, 0], [-sa, ca, 0], [0, 0, 1]], o.r), o.k]);
    const fe = M.fesse; lt.push([ellipsoide(X([fe.c[0], hb + fe.c[1], fe.c[2]], s), [[1, 0, 0], [0, 1, 0], [0, 0, 1]], fe.r), fe.k]);
    if (M.pecto) { const p = M.pecto; lt.push([ellipsoide(X([p.c[0], J("poitrine")[1] + p.c[1], p.c[2]], s), [[1, 0, 0], [0, 1, 0], [0, 0, 1]], p.r), p.k]); }
    if (M.seins) { const p = M.seins; lt.push([ellipsoide(X([p.c[0], J("poitrine")[1] + p.c[1], p.c[2]], s), [[1, 0, 0], [0, 1, 0], [0, 0, 1]], p.r), p.k]); }
  }
  { const v = M.ventre, yv = J("colonne")[1] + v.c[1]; lt.push([ellipsoide([0, yv, v.c[2]], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], v.r), v.k]);
    lt.push([sphere([0, hn + .018, zAvant(hn + .012) + .008], .01), .012, true]); } // creux sous la gorge
  const tronc = piece(lt);
  // ---- cou, tête
  const cou = piece([[profil(sb(Jc, [0, .05, 0]), ad(Jt, [0, .03, .01]), [1, 0, 0], [0, 0, 1], M.cou, 1)]]);
  const tete = { f: (x, y, z) => sdfTete(x - Jt[0], y - Jt[1], z - Jt[2], type), box: [Jt[0] - .2, Jt[1] - .12, Jt[2] - .2, Jt[0] + .2, Jt[1] + .36, Jt[2] + .26] };
  // ---- membres (pose zéro côté gauche, puis miroir et pose de liaison)
  const rep = { axeTronc, S, E, Wr, K, Ht, Kn, An, To, M };
  const Wu = nr(sb(E, S)), Uu = ortho([1, 0, 0], Wu), Vu = ortho(ortho([0, 0, 1], Wu), Uu);
  const Wf = nr(sb(Wr, E)), Uf = ortho([1, 0, 0], Wf), Vf = ortho(ortho([0, 0, 1], Wf), Uf);
  const Wh = nr(sb(K, Wr)), Vh = ortho(ortho([0, 0, 1], Wh), [1, 0, 0]), Uh = nr(cr(Vh, Wh));
  Object.assign(rep, { Wu, Uu, Vu, Wf, Uf, Vf, Wh, Uh, Vh, Lu: ln(sb(E, S)), Lf: ln(sb(Wr, E)), Lh: ln(sb(K, Wr)) });
  // doigts : chaînes MCP → PIP → DIP → bout ; pouce : CMC → MCP → IP → bout
  const D = M.doigts, chaines = [];
  for (let i = 0; i < 4; i++) {
    let d = nr(ad(ml(Wh, Math.cos(D.ecart[i])), ml(Vh, Math.sin(D.ecart[i])))); const p0 = som(K, ml(Vh, D.v[i]), ml(Wh, D.w[i])), pts = [p0], L = D.L[i], fr = [.46, .3, .24];
    let p = p0; for (let k = 0; k < 3; k++) { const u = ortho(Uh, d), ax = nr(cr(d, u)); d = tourne(d, ax, -D.flex[i][k]); p = ad(p, ml(d, L * fr[k] - (k === 2 ? D.r[i] * .72 : 0))); pts.push(p); }
    chaines.push({ pts, r: [D.r[i], D.r[i] * .88, D.r[i] * .8, D.r[i] * .72] });
  }
  { const P = M.pouce, c0 = som(Wr, ml(Wh, P.base[0]), ml(Vh, P.base[1]), ml(Uh, P.base[2])); let d = nr(som(ml(Wh, P.d[0]), ml(Vh, P.d[1]), ml(Uh, P.d[2])));
    const pts = [c0]; let p = c0; p = ad(p, ml(d, P.L[0])); pts.push(p); d = nr(som(ml(d, .92), ml(Wh, .25), ml(Uh, -.12))); p = ad(p, ml(d, P.L[1])); pts.push(p);
    d = nr(som(ml(d, .92), ml(Wh, .12), ml(Uh, -.2))); p = ad(p, ml(d, P.L[2] - P.r[3])); pts.push(p); chaines.push({ pts, r: P.r }); }
  rep.chaines = chaines;
  // jambe et pied
  const Wt = nr(sb(Kn, Ht)), Ut = ortho([1, 0, 0], Wt), Vt = ortho(ortho([0, 0, 1], Wt), Ut), Ws = nr(sb(An, Kn)), Us = ortho([1, 0, 0], Ws), Vs = ortho(ortho([0, 0, 1], Ws), Us);
  const sp = ln(sb(To, An)) / .188, Hc = [An[0], M.pied.h[0] * sp, An[2] + M.pied.h[1] * sp], Bc = [To[0] + M.pied.b[0] * sp, M.pied.b[1] * sp, To[2] + M.pied.b[2] * sp];
  const Wp = nr(sb(Bc, Hc)), Up = ortho([1, 0, 0], Wp), Vp = ortho(ortho([0, 1, 0], Wp), Up);
  Object.assign(rep, { Wt, Ut, Vt, Ws, Us, Vs, Lt: ln(sb(Kn, Ht)), Ls: ln(sb(An, Kn)), Hc, Bc, Wp, Up, Vp, Lp: ln(sb(Bc, Hc)), sp });
  const Od = M.orteils, ort = [];
  for (let i = 0; i < 5; i++) { const b = som(Bc, ml(Up, Od.b[i][0]), ml(Wp, Od.b[i][1]), ml(Vp, Od.b[i][2])), d = nr(ad(Wp, ml(Up, Od.a[i]))), L = Od.L[i], rt = Od.r[i] * .85;
    const tip = ad(b, ml(d, L - rt)); tip[1] = rt + .0008; const mid = lp(b, tip, .55); mid[1] += .003; ort.push({ pts: [b, mid, tip], r: [Od.r[i], Od.r[i] * .93, rt] }); }
  rep.orteils = ort;
  const pieces = [tronc, cou, tete], ip = {}, K_ = { cou: M.kCou, tete: M.kTete, bras: .04, paume: .018, doigt: .006, pouce: .014, jambe: .035, orteil: .005 };
  for (const [sd, s] of [[0, -1], [1, 1]]) {
    const LB = lie(s < 0 ? "bras_d" : "bras_g"), LJ = lie(s < 0 ? "cuisse_d" : "cuisse_g"), pa = q => LB.p(X(q, s)), da = q => LB.d(X(q, s)), pj = q => LJ.p(X(q, s)), dj = q => LJ.d(X(q, s));
    // bras : deltoïde, bras, coude, avant-bras
    const de = M.delt, la = [[profil(pa(S), pa(E), da(Uu), da(Vu), M.bras, 1)]];
    la.push([ellipsoide(pa(som(S, ml(Uu, de.c[0]), [0, de.c[1], 0], ml(Vu, de.c[2]))), repere(da(Uu), da([0, 1, 0])), de.r), de.k]);
    la.push([profil(pa(E), pa(Wr), da(Uf), da(Vf), M.avbras, 1), .02]);
    la.push([ellipsoide(pa(som(E, [0, M.coude.c[1], 0], ml(Vu, M.coude.c[2]))), [da(Uu), da(Wu), da(Vu)], M.coude.r), M.coude.k]);
    const bras = piece(la);
    // paume (+ éminences), doigts, pouce
    const lpm = [[profil(pa(ad(Wr, ml(Wh, -.012))), pa(ad(K, ml(Wh, -.006))), da(Uh), da(Vh), M.paume, .5)]];
    const ch = chaines[4]; lpm.push([ellipsoide(pa(som(lp(ch.pts[0], ch.pts[1], .4), ml(Uh, -.006), ml(Wh, .004))), repere(da(nr(sb(ch.pts[1], ch.pts[0]))), da(Vh)), [.03 * M.mainL / .044, .018 * M.mainL / .044, .0165 * M.mainL / .044]), .016]);
    lpm.push([ellipsoide(pa(som(Wr, ml(Wh, .036), ml(Vh, -.028 * M.mainL / .044), ml(Uh, -.009))), [da(Wh), da(Vh), da(Uh)], [.03, .013, .012]), .012]);
    if (leger) { const c1 = chaines[1].pts, m0 = ad(K, ml(Wh, -.006)), m1 = lp(c1[0], c1[3], 1), r1 = chaines[1].r[0];
      lpm.push([profil(pa(m0), pa(m1), da(Uh), da(Vh), [[0, r1, r1, M.mainL, M.mainL * .9, 0, 0], [.6, r1 * .9, r1 * .9, M.mainL * .92, M.mainL * .8, 0, 0], [1, r1 * .8, r1 * .8, M.mainL * .7, M.mainL * .6, 0, 0]], 1), .015]); }
    const paume = piece(lpm);
    const doigts = chaines.map((c, i) => piece(c.pts.slice(0, -1).map((p, k) => [cone(pa(p), pa(c.pts[k + 1]), c.r[k], c.r[k + 1]), .004])));
    // jambe : cuisse, rotule, jambe, malléoles, pied (voûte), orteils
    const lj = [[profil(pj(Ht), pj(Kn), dj(Ut), dj(Vt), M.cuisse, 1)]];
    lj.push([ellipsoide(pj(som(Kn, [0, M.rotule.c[1], 0], ml(Vt, M.rotule.c[2]))), [dj(Ut), dj(Wt), dj(Vt)], M.rotule.r), M.rotule.k]);
    lj.push([profil(pj(Kn), pj(An), dj(Us), dj(Vs), M.jambe, 1), .03]);
    for (const m of [M.malleole.m, M.malleole.l]) lj.push([sphere(pj(som(An, ml(Us, m[0]), [0, m[1], 0], ml(Vs, m[2]))), m[3]), .012]);
    lj.push([profil(pj(Hc), pj(Bc), dj(Up), dj(Vp), M.pied.p.map(r => [r[0], r[1] * sp, r[2] * sp, r[3] * sp, r[4] * sp, 0, 0]), 1), .028]);
    { const v = M.pied.voute, pp = M.pied.p, k = pp.findIndex(r => r[0] >= v[2]), bord = (pp[Math.max(k, 0)][2] + pp[Math.max(k - 1, 0)][2]) / 2 * sp; // demi-largeur côté médial
      const c = som(lp(Hc, Bc, v[2]), ml(Up, -bord + v[0] * sp)); c[1] = v[1]; lj.push([ellipsoide(pj(c), [dj(Up), dj(Vp), dj(Wp)], [v[3] * sp, v[4], v[5] * sp]), .012, true]); } // hauteur absolue : juste sous la plante
    if (bloc) { const a = ort[0].pts[0], b = ort[4].pts[0], ta = ort[0].pts[2], tb = ort[4].pts[2], h = leger ? [.018, .012] : [.022, .016], k = leger ? 1 : 1.08;
      lj.push([profil(pj(lp(a, b, .45)), pj(lp(ta, tb, .3)), dj(Up), dj(Vp), [[0, .045 * sp * k, .045 * sp * k, h[0], h[0], 0, 0], [1, .035 * sp * k, .035 * sp * k, h[1], h[1], 0, 0]], 1), .01]); }
    const jambe = piece(lj), orteils = ort.map(o => piece([[cone(pj(o.pts[0]), pj(o.pts[1]), o.r[0], o.r[1])], [cone(pj(o.pts[1]), pj(o.pts[2]), o.r[1], o.r[2]), .003]]));
    ip[sd] = { bras: pieces.push(bras) - 1, paume: pieces.push(paume) - 1, doigts: doigts.map(d => pieces.push(d) - 1), jambe: pieces.push(jambe) - 1, orteils: orteils.map(o => pieces.push(o) - 1) };
  }
  // groupes : une union de pièces chacun (même ordre partout pour que les raccords coïncident)
  const P = i => pieces[i], G = new Array(NG);
  G[0] = union([[P(0), 0], [P(1), K_.cou], [P(2), K_.tete], [P(ip[0].bras), K_.bras], [P(ip[1].bras), K_.bras], [P(ip[0].jambe), K_.jambe], [P(ip[1].jambe), K_.jambe]]);
  G[1] = union([[P(0), 0], [P(1), K_.cou], [P(2), K_.tete]]);
  G[2] = union([[P(1), 0], [P(2), K_.tete]]);
  const dg = (s, i) => [P(ip[s].doigts[i]), i === 4 ? K_.pouce : K_.doigt];
  for (const s of [0, 1]) {
    G[gBras(s)] = union([[P(0), 0], [P(ip[s].bras), K_.bras], [P(ip[s].paume), K_.paume]]);
    G[gPaume(s)] = union([[P(ip[s].bras), 0], [P(ip[s].paume), K_.paume], ...(leger ? [dg(s, 4)] : [0, 1, 2, 3, 4].map(i => dg(s, i)))]);
    for (let i = 0; i < 5; i++) G[gDoigt(s, i)] = union([[P(ip[s].paume), 0], dg(s, i)]);
    G[gJambe(s)] = union([[P(0), 0], [P(ip[s].jambe), K_.jambe], ...(bloc ? [] : ip[s].orteils.map(o => [P(o), K_.orteil]))]);
    for (let i = 0; i < 5; i++) G[gOrteil(s, i)] = union([[P(ip[s].jambe), 0], [P(ip[s].orteils[i]), K_.orteil]]);
  }
  const tout = union([[P(0), 0], [P(1), K_.cou], [P(2), K_.tete], ...[0, 1].map(s => [P(ip[s].bras), K_.bras]), ...[0, 1].map(s => [P(ip[s].paume), K_.paume]),
    ...(leger ? [0, 1].map(s => dg(s, 4)) : [0, 1].flatMap(s => [0, 1, 2, 3, 4].map(i => dg(s, i)))), ...[0, 1].map(s => [P(ip[s].jambe), K_.jambe]),
    ...(bloc ? [] : [0, 1].flatMap(s => ip[s].orteils.map(o => [P(o), K_.orteil])))]);
  // pièce « propre » de chaque groupe, pour lancer les rayons de la cage
  const propre = new Array(NG); propre[0] = P(0).f; propre[1] = G[1]; propre[2] = G[2];
  for (const s of [0, 1]) { propre[gBras(s)] = P(ip[s].bras).f; propre[gPaume(s)] = P(ip[s].paume).f; propre[gJambe(s)] = P(ip[s].jambe).f;
    for (let i = 0; i < 5; i++) { propre[gDoigt(s, i)] = P(ip[s].doigts[i]).f; propre[gOrteil(s, i)] = P(ip[s].orteils[i]).f; } }
  return { G, tout, propre, rep, lie };
}

// ---------- la cage (côté gauche, puis miroir)
const COTE = new Set(["clavicule", "bras", "avantbras", "main", "doigts", "cuisse", "jambe", "pied", "orteils"]);
const poids = o => { const w = new Float32Array(NB); for (const k in o) w[I[COTE.has(k) ? k + "_g" : k]] += o[k]; return w; };
const melange = (a, b, t) => { const w = new Float32Array(NB); for (let i = 0; i < NB; i++) w[i] = a[i] * (1 - t) + b[i] * t; return w; };
function construireCage(type, qualite, A, variante) {
  const J = n => articulation(type, n), plein = qualite === "plein", orteils = plein && variante !== "chausse", R = A.rep, M = R.M, lie = A.lie, LB = lie("bras_g"), LJ = lie("cuisse_g");
  const O = [], D = [], Wt = [], Gv = [], Mid = [], F = [], FR = [], FG = [];
  const sommet = (o, d, w, g, mid = false) => { O.push(o); D.push(nr(d)); Wt.push(w); Gv.push(g); Mid.push(mid); return O.length - 1; };
  const face = (l, r) => { F.push(l); FR.push(r); FG.push(-1); };
  const bande = (a, b, r, saut) => { for (let j = 0; j < a.length; j++) { if (saut && saut(j)) continue; const k = (j + 1) % a.length; face([a[j], a[k], b[k], b[j]], r); } };
  const hb = J("bassin")[1], hw = J("colonne")[1], hc = J("poitrine")[1], hn = J("cou")[1], S = R.S, sc = (hn - hb) / .635;
  // ---- tronc : 10 anneaux × 10 colonnes (demi-tour de 0° devant à 180° derrière, pas de 20°)
  const th = c => c * PI / 9, wTronc = y => { const a = smst(hb + .04 * sc, hw + .015 * sc, y), b = smst(hw + .015 * sc, hc - .01 * sc, y); return poids({ bassin: 1 - a, colonne: a - b, poitrine: b }); };
  const anneauT = (ys, wf, saut) => { const l = []; for (let c = 0; c < 10; c++) { if (saut && saut(c)) { l.push(-1); continue; } const y = typeof ys === "function" ? ys(c) : ys;
    l.push(sommet([0, y, R.axeTronc(y)], [Math.sin(th(c)), 0, Math.cos(th(c))], wf ? wf(c, y) : wTronc(y), GR.TRONC, c === 0 || c === 9)); } return l; };
  const r0dy = [-.05, -.047, -.036, -.026, -.02, -.022, -.034, -.052, -.07, -.078];
  const T = [];
  T.push(anneauT(c => hb + r0dy[c] * sc, (c, y) => c === 0 || c === 9 ? poids({ bassin: .6, cuisse_d: .2, cuisse_g: .2 }) : poids({ bassin: c < 3 ? .55 : .48, cuisse: c < 3 ? .45 : .52 })));
  T.push(anneauT(hb + .015 * sc, (c, y) => c === 9 ? poids({ bassin: .9, cuisse_d: .05, cuisse_g: .05 }) : c > 3 ? poids({ bassin: .82, cuisse: .18 }) : poids({ bassin: 1 })));
  T.push(anneauT(hb + .085 * sc)); T.push(anneauT(hw)); T.push(anneauT(hw + .1 * sc)); T.push(anneauT(hc + .01 * sc));
  T.push(anneauT(S[1] - .1 * sc, (c, y) => c >= 3 && c <= 6 ? poids({ poitrine: .7, bras: .3 }) : c === 2 || c === 7 ? poids({ poitrine: .92, bras: .08 }) : wTronc(y)));
  T.push(anneauT(c => S[1] + (c < 3 ? -.05 : c === 3 ? -.03 : -.04) * sc, (c, y) => c === 3 || c === 6 ? poids({ poitrine: .5, clavicule: .2, bras: .3 }) : c === 2 || c === 7 ? poids({ poitrine: .82, clavicule: .12, bras: .06 }) : wTronc(y), c => c === 4 || c === 5));
  const r8 = anneauT(c => S[1] + (c < 3 ? -.005 : .012) * sc, (c, y) => c >= 3 && c <= 6 ? poids({ poitrine: .3, clavicule: .6, bras: .1 }) : c === 2 || c === 7 ? poids({ poitrine: .75, clavicule: .25 }) : wTronc(y));
  const zc = [.034, .012, -.012, -.034]; for (let c = 3; c <= 6; c++) { O[r8[c]] = [S[0] - .045, S[1] - .07, S[2] + zc[c - 3]]; D[r8[c]] = [0, 1, 0]; }
  T.push(r8);
  T.push(anneauT(c => hn + (.01 + .04 * (1 - Math.cos(th(c))) / 2) * sc, c => c >= 3 && c <= 6 ? poids({ poitrine: .5, cou: .35, clavicule: .15 }) : poids({ poitrine: .6, cou: .4 })));
  for (let k = 0; k < 9; k++) for (let c = 0; c < 9; c++) { if ((k === 6 || k === 7) && c >= 3 && c <= 5) continue; face([T[k][c], T[k][c + 1], T[k + 1][c + 1], T[k + 1][c]], 0); }
  const cou0 = T[9];
  // entrejambe : deux sommets sur la ligne du milieu
  const cf = sommet([0, hb - .02, .028], [0, -1, 0], poids({ bassin: .5, cuisse_d: .25, cuisse_g: .25 }), GR.TRONC, true), cb = sommet([0, hb - .02, -.036], [0, -1, 0], poids({ bassin: .5, cuisse_d: .25, cuisse_g: .25 }), GR.TRONC, true);
  // ---- bras : boucle du trou → anneaux de 10 ; ψ_j = 144° + 36° j depuis le côté (U) vers l'avant (V)
  const boucleB = [T[6][3], T[6][4], T[6][5], T[6][6], T[7][6], T[8][6], T[8][5], T[8][4], T[8][3], T[7][3]];
  const psi = j => (144 + 36 * j) * PI / 180, boiteMain = j => j >= 4 && j <= 8 ? [1, 8 - j] : [-1, (j + 1) % 10];
  const anneauTube = (base, W, U, V, t, tau, w, g, boite, larg, mapP, mapD) => { const l = [];
    for (let j = 0; j < 10; j++) { const ps = psi(j), m = -Math.cos(ps), tj = t + tau * m, ro = [Math.cos(ps), Math.sin(ps)];
      let off = [0, 0], dr = ro; if (boite) { const [sg, k] = boiteMain(j), v = larg * (1 - k / 2); off = [0, v * .8 * boite]; dr = nr2([ro[0] * (1 - boite) + sg * boite, ro[1] * (1 - boite)]); }
      const o = som(base, ml(W, tj), ml(U, off[0]), ml(V, off[1])), d = ad(ml(U, dr[0]), ml(V, dr[1]));
      l.push(sommet(mapP(o), mapD(d), typeof w === "function" ? w(m) : w, g)); } return l; };
  const nr2 = a => { const n = Math.hypot(a[0], a[1]) || 1; return [a[0] / n, a[1] / n]; };
  const pa = LB.p, da = LB.d, pj = LJ.p, dj = LJ.d, gb = gBras(1), gp = gPaume(1), gj = gJambe(1);
  const anB = [boucleB], regB = [];
  const ajB = (base, W, U, V, t, tau, w, g, r, bx = 0) => { anB.push(anneauTube(base, W, U, V, t, tau, w, g, bx, M.mainL, pa, da)); regB.push(r); };
  const ep = (haut, bas) => m => { const t = (m + 1) / 2; return melange(poids(haut), poids(bas), t); }; // m = −1 dessus, +1 aisselle
  ajB(S, R.Wu, R.Uu, R.Vu, .035 * sc, .045 * sc, ep({ bras: .42, clavicule: .43, poitrine: .15 }, { bras: .55, poitrine: .45 }), gb, 3);
  ajB(S, R.Wu, R.Uu, R.Vu, .1 * sc, .025 * sc, ep({ bras: .76, clavicule: .24 }, { bras: .8, poitrine: .2 }), gb, 3);
  ajB(S, R.Wu, R.Uu, R.Vu, .2 * sc, .008, ep({ bras: .96, clavicule: .04 }, { bras: .97, poitrine: .03 }), gb, 3);
  ajB(S, R.Wu, R.Uu, R.Vu, R.Lu - .035, 0, poids({ bras: .85, avantbras: .15 }), gb, 3);
  ajB(S, R.Wu, R.Uu, R.Vu, R.Lu, 0, poids({ bras: .5, avantbras: .5 }), gb, 3);
  ajB(R.E, R.Wf, R.Uf, R.Vf, .04, 0, poids({ bras: .15, avantbras: .85 }), gb, 4);
  ajB(R.E, R.Wf, R.Uf, R.Vf, R.Lf - .06, 0, poids({ avantbras: 1 }), gb, 4, .2);
  ajB(R.E, R.Wf, R.Uf, R.Vf, R.Lf, 0, poids({ avantbras: .5, main: .5 }), gb, 4, .45);
  ajB(R.Wr, R.Wh, R.Uh, R.Vh, .012, 0, poids({ main: .85, avantbras: .15 }), gp, 5, .85);
  ajB(R.Wr, R.Wh, R.Uh, R.Vh, .042 * R.Lh / .1, 0, poids({ main: 1 }), gp, 5, 1);
  ajB(R.Wr, R.Wh, R.Uh, R.Vh, R.Lh - .004, 0, plein ? poids({ main: .6, doigts: .4 }) : poids({ main: .8, doigts: .2 }), gp, 5, 1);
  const iPouce = anB.length - 3; // la face du pouce : entre les anneaux de la main (côté index, colonnes 8-9)
  for (let k = 0; k < anB.length - 1; k++) bande(anB[k], anB[k + 1], regB[k], k === iPouce ? j => j === 8 : null);
  // doigts (plein) ou moufle (léger)
  const ch = R.chaines, tubeDoigt = (base, c, g, nAn, poidsAn) => { let prev = base;
    for (let k = 0; k < nAn.length; k++) { const [seg, t] = nAn[k], p = lp(c.pts[seg], c.pts[seg + 1], t), d = nr(sb(c.pts[seg + 1], c.pts[seg])), u = ortho(R.Uh, d), v = nr(cr(d, u)), vv = dt(v, R.Vh) < 0 ? ml(v, -1) : v;
      const dirs = c.pouce ? (() => { const a = u, b = ortho(ml(R.Wh, -1), d); return [ad(a, b), ad(ml(a, -1), b), sb(ml(a, -1), b), sb(a, b)]; })() : [ad(u, vv), sb(u, vv), sb(ml(u, -1), vv), ad(ml(u, -1), vv)];
      const l = dirs.map(dd => sommet(pa(p), da(dd), poidsAn[k], g)); bande(prev, l, 5); prev = l; }
    const [seg, t] = nAn[nAn.length - 1], q = lp(c.pts[seg], c.pts[seg + 1], t), pole = sommet(pa(q), da(sb(c.pts[3], c.pts[2])), poidsAn[nAn.length - 1], g);
    for (let i = 0; i < 4; i++) face([prev[i], prev[(i + 1) % 4], pole], 5); };
  const h3 = anB[anB.length - 1];
  if (plein) { for (let f = 0; f < 4; f++) tubeDoigt([h3[8 - f], h3[7 - f], h3[(10 + f) % 10], h3[(9 + f) % 10]], ch[f], gDoigt(1, f), [[0, .55], [2, .35]], [poids({ doigts: .9, main: .1 }), poids({ doigts: 1 })]); }
  else { const c1 = ch[1], m1 = anneauTube(R.K, R.Wh, R.Uh, R.Vh, ln(sb(c1.pts[2], R.K)), 0, poids({ doigts: 1 }), gp, 1, M.mainL * .95, pa, da), m2 = anneauTube(R.K, R.Wh, R.Uh, R.Vh, ln(sb(c1.pts[3], R.K)) * .92, 0, poids({ doigts: 1 }), gp, 1, M.mainL * .75, pa, da);
    bande(h3, m1, 5); bande(m1, m2, 5);
    const pm = sommet(pa(som(R.K, ml(R.Wh, ln(sb(c1.pts[3], R.K)) * .85), ml(R.Uh, -.006))), da(R.Wh), poids({ doigts: 1 }), gp); for (let j = 0; j < 10; j++) face([m2[j], m2[(j + 1) % 10], pm], 5); }
  { const hA = anB[iPouce], hB = anB[iPouce + 1], c = { ...ch[4], pouce: true };
    tubeDoigt([hA[8], hA[9], hB[9], hB[8]], c, gDoigt(1, 4), plein ? [[0, .6], [1, .45], [2, .5]] : [[1, 0], [2, .7]], (plein ? [1, 1, 1] : [1, 1]).map(() => poids({ main: 1 }))); }
  // ---- jambe : boucle de l'aine (12) ; ψ_j = 135° − 30° j depuis le côté (U) vers l'avant (V)
  const boucleJ = [...T[0], cb, cf], psiJ = j => (135 - 30 * j) * PI / 180, boitePied = j => j === 11 || j <= 4 ? [1, (j + 1) % 12] : [-1, 10 - j];
  const anneauJ = (base, W, U, V, t, tau, w, g, bx, cols, n0) => { const l = [];
    for (let j = 0; j < 12; j++) { const ps = psiJ(j), m = -Math.cos(ps - PI / 4), tj = t + tau * m, ro = [Math.cos(ps), Math.sin(ps)];
      let off = 0, dr = ro; if (bx) { const [sg, k] = boitePied(j); off = cols[k] * .85 * bx; dr = nr2([ro[0] * (1 - bx), ro[1] * (1 - bx) + sg * bx]); }
      const o = som(base, ml(W, tj), ml(U, off)), d = ad(ml(U, dr[0]), ml(V, dr[1])); l.push(sommet(pj(o), dj(d), w, g)); } return l; };
  const anJ = [boucleJ], regJ = [], ajJ = (...a) => { const r = a.pop(); anJ.push(anneauJ(...a)); regJ.push(r); };
  ajJ(R.Ht, R.Wt, R.Ut, R.Vt, .07 * sc, .035 * sc, poids({ cuisse: .85, bassin: .15 }), gj, 0, null, 6);
  ajJ(R.Ht, R.Wt, R.Ut, R.Vt, .16 * sc, .012 * sc, poids({ cuisse: 1 }), gj, 0, null, 6);
  ajJ(R.Ht, R.Wt, R.Ut, R.Vt, R.Lt - .035, 0, poids({ cuisse: .85, jambe: .15 }), gj, 0, null, 6);
  ajJ(R.Ht, R.Wt, R.Ut, R.Vt, R.Lt, 0, poids({ cuisse: .5, jambe: .5 }), gj, 0, null, 6);
  ajJ(R.Kn, R.Ws, R.Us, R.Vs, .045, 0, poids({ cuisse: .15, jambe: .85 }), gj, 0, null, 7);
  for (const t of [.14, .3]) ajJ(R.Kn, R.Ws, R.Us, R.Vs, t * R.Ls / .507, 0, poids({ jambe: 1 }), gj, 0, null, 7);
  ajJ(R.Kn, R.Ws, R.Us, R.Vs, R.Ls - .06, 0, poids({ jambe: 1 }), gj, 0, null, 7);
  ajJ(R.Kn, R.Ws, R.Us, R.Vs, R.Ls - .015, 0, poids({ jambe: .55, pied: .45 }), gj, 0, M.piedC[0], 7);
  // pied : tube coudé de la cheville aux orteils (plans inclinés de 35°, 65°, puis verticaux)
  const An = R.An, Bc = R.Bc, sp = R.sp, Up = [1, 0, 0];
  const anP = (c, ang, w, bx, cols) => { const a = ang * PI / 180, Vv = [0, Math.sin(a), Math.cos(a)], Wv = [0, -Math.cos(a), Math.sin(a)]; anJ.push(anneauJ(c, Wv, Up, Vv, 0, 0, w, gj, bx, cols)); regJ.push(8); };
  // éventail de plans autour d'un pivot devant la cheville : les rayons partent près du centre du talon (talon rond)
  { const yp = An[1] + .008 * sp, zp = An[2] + .068 * sp, cf = (a, dc) => [An[0], yp - Math.sin(a * PI / 180) * dc * sp, zp - Math.cos(a * PI / 180) * dc * sp];
    for (const [a, dc, w, bx] of [[20, .076, poids({ pied: .7, jambe: .3 }), 0], [42, .08, poids({ pied: .95, jambe: .05 }), 0], [65, .076, poids({ pied: 1 }), .3], [90, .07, poids({ pied: 1 }), .6]]) anP(cf(a, dc), a, w, bx, M.piedC[0]);
  }
  anP([Bc[0] - .002, .033 * sp, Bc[2] - .022 * sp], 90, poids({ pied: 1 }), 1, M.piedC[1]);
  anP([Bc[0] - .002, .027 * sp, Bc[2] + .004 * sp], 90, orteils ? poids({ pied: .55, orteils: .45 }) : poids({ pied: .7, orteils: .3 }), 1, M.piedC[2]);
  if (!orteils) anP([Bc[0] - .002, .02 * sp, Bc[2] + .03 * sp], 90, poids({ orteils: 1 }), 1, M.piedC[2].map(v => v * .85));
  for (let k = 0; k < anJ.length - 1; k++) bande(anJ[k], anJ[k + 1], regJ[k]); // une bande prend la région de l'anneau du bas
  const pF = anJ[anJ.length - 1];
  const quadOrteil = t => [pF[(t + 11) % 12], pF[t % 12], pF[9 - t], pF[10 - t]];
  if (orteils) for (let t = 0; t < 5; t++) { const o = R.orteils[t], g = gOrteil(1, t); let prev = quadOrteil(t);
    for (const [seg, tt, w] of [[0, .5, poids({ orteils: .9, pied: .1 })], [1, .72, poids({ orteils: 1 })]]) {
      const p = lp(o.pts[seg], o.pts[seg + 1], tt), d = nr(sb(o.pts[seg + 1], o.pts[seg])), u = ortho([1, 0, 0], d), v = nr(cr(u, d)), vv = v[1] < 0 ? ml(v, -1) : v;
      const l = [ad(ml(u, -1), vv), ad(u, vv), sb(u, vv), sb(ml(u, -1), vv)].map(dd => sommet(pj(p), dj(dd), w, g)); bande(prev, l, 8); prev = l; }
    const q = lp(o.pts[1], o.pts[2], .72), pole = sommet(pj(q), dj(sb(o.pts[2], o.pts[1])), poids({ orteils: 1 }), g); for (let i = 0; i < 4; i++) face([prev[i], prev[(i + 1) % 4], pole], 8); }
  else { const pp = sommet(pj([Bc[0] - .006, .018 * sp, Bc[2] + .03 * sp]), dj([0, -.15, 1]), poids({ orteils: 1 }), gj); for (let j = 0; j < 12; j++) face([pF[j], pF[(j + 1) % 12], pp], 8); }
  // ---- miroir : côté droit (les sommets du milieu sont partagés)
  const n = O.length, mi = new Int32Array(n);
  for (let i = 0; i < n; i++) { if (Mid[i]) { mi[i] = i; continue; } const w = new Float32Array(NB); for (let b = 0; b < NB; b++) w[MIROIR_OS[b]] = Wt[i][b];
    mi[i] = sommet(X(O[i], -1), X(D[i], -1), w, miroirG(Gv[i])); }
  const nf = F.length; for (let f = 0; f < nf; f++) face(F[f].map(v => mi[v]).reverse(), FR[f]);
  // ---- position : rayon lancé sur la pièce propre du groupe
  const P = new Float64Array(O.length * 3);
  for (let i = 0; i < O.length; i++) { const p = rayon(A.propre[Gv[i]], O[i], D[i]); P[i * 3] = p[0]; P[i * 3 + 1] = p[1]; P[i * 3 + 2] = p[2]; }
  for (let f = 0; f < F.length; f++) { let g = 0; for (const v of F[f]) if (RANG[Gv[v]] >= RANG[g]) g = Gv[v]; FG[f] = g; }
  return { P, W: Wt, G: Int32Array.from(Gv), F, FR, FG, cou: [...cou0, ...cou0.slice(1, 9).reverse().map(v => mi[v])] };
}
// rayon : depuis o + t0·d (dedans) le long de d jusqu'à la surface (marche, puis fausse position) ; renvoie t
function rayonT(f, o, d, t0 = 0, tmax = .35) {
  const at = t => f(o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t);
  let ta = t0, va = at(ta);
  for (let k = 0; va > 0 && k < 40 && ta > -.25; k++) { ta -= .008; va = at(ta); } if (va > 0) return t0;
  let tb = ta, vb = va;
  while (tb < tmax) { tb = ta + Math.max(.0015, Math.min(.016, -va * .85)); vb = at(tb); if (vb > 0) break; ta = tb; va = vb; }
  if (vb <= 0) return tb;
  for (let k = 0, cote = 0; k < 6; k++) { const tm = ta - va * (tb - ta) / (vb - va), vm = at(tm); if (Math.abs(vm) < 1e-6) return tm;
    if (vm > 0) { tb = tm; vb = vm; if (cote === 1) va *= .5; cote = 1; } else { ta = tm; va = vm; if (cote === -1) vb *= .5; cote = -1; } }
  return ta - va * (tb - ta) / (vb - va);
}
const rayon = (f, o, d, tmax) => { const t = rayonT(f, o, d, 0, tmax); return [o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t]; };

// ---------- Catmull-Clark (bord ouvert : le cou) sur positions + poids ; groupes et régions suivent
function catmull(C) {
  const { P, W, G, F, FR, FG } = C, nv = G.length, nf = F.length, emap = new Map(), E = [];
  F.forEach((f, fi) => { for (let i = 0; i < f.length; i++) { const a = f[i], b = f[(i + 1) % f.length], key = a < b ? a * nv + b : b * nv + a; const e = emap.get(key);
    if (e === undefined) { emap.set(key, E.length); E.push([a, b, fi, -1]); } else E[e][3] = fi; } });
  const ne = E.length, N = nv + nf + ne, C2 = 3 + NB, val = new Float64Array(nv * C2), V2 = new Float64Array(N * C2);
  for (let i = 0; i < nv; i++) { val.set([P[i * 3], P[i * 3 + 1], P[i * 3 + 2]], i * C2); for (let b = 0; b < NB; b++) val[i * C2 + 3 + b] = W[i][b]; }
  // points de face
  F.forEach((f, fi) => { const o = (nv + fi) * C2; for (const v of f) for (let c = 0; c < C2; c++) V2[o + c] += val[v * C2 + c] / f.length; });
  // points d'arête
  const bord = new Uint8Array(nv), sF = new Float64Array(nv * C2), sE = new Float64Array(nv * C2), nF = new Int32Array(nv), nE = new Int32Array(nv), sB = new Float64Array(nv * C2);
  E.forEach(([a, b, f1, f2], ei) => { const o = (nv + nf + ei) * C2;
    for (let c = 0; c < C2; c++) { const m = (val[a * C2 + c] + val[b * C2 + c]) / 2; V2[o + c] = f2 < 0 ? m : (val[a * C2 + c] + val[b * C2 + c] + V2[(nv + f1) * C2 + c] + V2[(nv + f2) * C2 + c]) / 4;
      sE[a * C2 + c] += m; sE[b * C2 + c] += m; if (f2 < 0) { sB[a * C2 + c] += val[b * C2 + c]; sB[b * C2 + c] += val[a * C2 + c]; } }
    nE[a]++; nE[b]++; if (f2 < 0) { bord[a] = 1; bord[b] = 1; } });
  F.forEach((f, fi) => { for (const v of f) { nF[v]++; for (let c = 0; c < C2; c++) sF[v * C2 + c] += V2[(nv + fi) * C2 + c]; } });
  for (let v = 0; v < nv; v++) { const o = v * C2, n = nE[v];
    for (let c = 0; c < C2; c++) V2[o + c] = bord[v] ? (sB[o + c] + 6 * val[o + c]) / 8 : (sF[o + c] / nF[v] + 2 * sE[o + c] / n + (n - 3) * val[o + c]) / n; }
  // groupes : sommet gardé, face → groupe de la face, arête → le plus « parent » des deux bouts
  const G2 = new Int32Array(N); G2.set(G); FG.forEach((g, fi) => G2[nv + fi] = g);
  E.forEach(([a, b], ei) => G2[nv + nf + ei] = RANG[G[a]] <= RANG[G[b]] ? G[a] : G[b]);
  const F2 = [], FR2 = [], FG2 = [], ek = (a, b) => emap.get(a < b ? a * nv + b : b * nv + a) + nv + nf;
  F.forEach((f, fi) => { const k = f.length; for (let i = 0; i < k; i++) { F2.push([f[i], ek(f[i], f[(i + 1) % k]), nv + fi, ek(f[(i + k - 1) % k], f[i])]); FR2.push(FR[fi]); FG2.push(FG[fi]); } });
  const P2 = new Float64Array(N * 3), W2 = []; for (let i = 0; i < N; i++) { P2[i * 3] = V2[i * C2]; P2[i * 3 + 1] = V2[i * C2 + 1]; P2[i * 3 + 2] = V2[i * C2 + 2]; W2.push(Float32Array.from(V2.subarray(i * C2 + 3, i * C2 + C2))); }
  // le bord du cou : suivre les arêtes de bord dans l'ordre
  const cou = []; { const C0 = C.cou, n0 = C0.length; for (let i = 0; i < n0; i++) { cou.push(C0[i]); cou.push(ek(C0[i], C0[(i + 1) % n0])); } }
  return { P: P2, W: W2, G: G2, F: F2, FR: FR2, FG: FG2, cou };
}

// ---------- le cou et la tête : anneaux lancés depuis l'axe du cou puis depuis le centre de la tête
function construireTete(type, qualite, A, C) {
  const J = n => articulation(type, n), Jt = J("tete"), Jc = J("cou"), rp = reperesTete(type), plein = qualite === "plein";
  const hc = [rp.centre.x + Jt[0], rp.centre.y + Jt[1], rp.centre.z + Jt[2]], men = rp.menton.y + Jt[1];
  const P = Array.from(C.P), W = C.W.slice(), G = Array.from(C.G), F = C.F.slice(), FR = C.FR.slice(), FG = C.FG.slice();
  const ajoute = (p, w, g) => { P.push(p[0], p[1], p[2]); W.push(w); G.push(g); return G.length - 1; };
  const ang = i => { const x = P[i * 3], z = P[i * 3 + 2] - Jc[2]; let a = Math.atan2(x, z); if (a < 0) a += 2 * PI; return a; };
  // bord du cou, trié par angle (0 devant, vers +x)
  let bord = C.cou.slice(); { const a0 = bord.map(ang); let k = 0; for (let i = 1; i < bord.length; i++) if (a0[i] < a0[k]) k = i; bord = [...bord.slice(k), ...bord.slice(0, k)]; if (ang(bord[1]) < ang(bord[0]) || ang(bord[1]) > PI) bord = [bord[0], ...bord.slice(1).reverse()]; }
  const nb = bord.length, angB = bord.map(ang);
  // anneaux du cou : plans inclinés de la base (devant plus bas) jusque sous la mâchoire
  const yF = men - .015, zF = Jt[2] + .065, yB = Jt[1] + .012, zB = Jt[2] - .068, cTop = [0, (yF + yB) / 2, (zF + zB) / 2], nTop = nr([0, zF - zB, -(yF - yB)]);
  let cB = [0, 0, 0]; for (const v of bord) cB = ad(cB, [P[v * 3] / nb, P[v * 3 + 1] / nb, P[v * 3 + 2] / nb]);
  const nBase = nr(sb(Jt, Jc)), anneaux = [{ idx: bord, a: angB }], cg = A.G;
  const poidsC = o => { const w = new Float32Array(NB); for (const k in o) w[I[k]] = o[k]; return w; };
  let tPrec = null; const lancer = (g, c, dir, t0 = 0) => { const t = rayonT(cg[g], c, dir, t0, .32); tPrec?.push(t); return [c[0] + dir[0] * t, c[1] + dir[1] * t, c[2] + dir[2] * t]; };
  const neck = [[.34, { cou: .78, poitrine: .22 }], [.68, { cou: 1 }], [1, { cou: .45, tete: .55 }]];
  for (const [t, w] of neck) { const c = lp(cB, cTop, t), n = nr(lp(nBase, nTop, t)), fwd = ortho([0, 0, 1], n), side = nr(cr(n, fwd)), sd = side[0] < 0 ? ml(side, -1) : side;
    const idx = angB.map(a => ajoute(lancer(GR.COU, c, nr(ad(ml(fwd, Math.cos(a)), ml(sd, Math.sin(a))))), poidsC(w), GR.COU)); anneaux.push({ idx, a: angB.slice(), cou: true }); }
  // anneaux de la tête : élévation depuis le centre de la tête ; dessous : −62° devant, −32° derrière
  const NH = plein ? 72 : 36, Af = plein ? .3 : .2, el0 = a => (-32 + (-62 + 32) * (1 + Math.cos(a)) / 2) * PI / 180;
  const pas = plein ? [0, .025, .055, .09, .125, .16, .195, .23, .265, .3, .333, .366, .399, .432, .465, .498, .531, .566, .605, .65, .7, .76, .82, .88, .935, .975] : [0, .07, .16, .26, .36, .46, .56, .66, .76, .86, .94];
  const nbr = plein ? [Math.round(nb * 1.33), Math.round(nb * 1.7), NH, NH, NH] : [Math.round(nb * 1.4), NH];
  for (let k = 0; k < pas.length; k++) { const tau = pas[k], hautK = Math.sin(tau * PI / 2);
    let n = k < nbr.length ? nbr[k] : NH; if (tau > .7) n = Math.max(6, Math.round(NH * Math.cos((tau - .7) / .3 * PI / 2 * .93) / 2) * 2);
    const A2 = Af * Math.min(1, k / 3), a = [], idx = [], tP = tPrec; tPrec = [];
    for (let i = 0; i < n; i++) { const s = i / n, ph = 2 * PI * s - A2 * Math.sin(2 * PI * s), e0 = el0(ph), el = e0 + (PI / 2 - e0) * tau;
      const dir = [Math.cos(el) * Math.sin(ph), Math.sin(el), Math.cos(el) * Math.cos(ph)], t0 = tP ? Math.max(0, tP[Math.round(i / n * tP.length) % tP.length] - .012) : 0;
      idx.push(ajoute(lancer(GR.TETE, hc, dir, t0), k === 0 ? poidsC({ tete: .88, cou: .12 }) : poidsC({ tete: 1 }), GR.TETE)); a.push(ph); }
    anneaux.push({ idx, a }); }
  const pole = ajoute(lancer(GR.TETE, hc, [0, 1, 0]), poidsC({ tete: 1 }), GR.TETE);
  // coutures en triangles entre anneaux successifs (nombres de sommets différents)
  for (let k = 0; k < anneaux.length - 1; k++) { const A1 = anneaux[k], B1 = anneaux[k + 1], r = B1.cou ? 1 : 2, g = B1.cou ? GR.COU : GR.TETE;
    let i = 0, j = 0; const na = A1.idx.length, nB = B1.idx.length;
    while (i < na || j < nB) { const ai = A1.a[(i + 1) % na] + (i + 1 >= na ? 2 * PI : 0), bj = B1.a[(j + 1) % nB] + (j + 1 >= nB ? 2 * PI : 0);
      if (j >= nB || (i < na && ai <= bj)) { F.push([A1.idx[i % na], A1.idx[(i + 1) % na], B1.idx[j % nB]]); i++; } else { F.push([A1.idx[i % na], B1.idx[(j + 1) % nB], B1.idx[j % nB]]); j++; }
      FR.push(r); FG.push(g); } }
  { const L = anneaux[anneaux.length - 1]; for (let i = 0; i < L.idx.length; i++) { F.push([L.idx[i], L.idx[(i + 1) % L.idx.length], pole]); FR.push(2); FG.push(GR.TETE); } }
  return { P: Float64Array.from(P), W, G: Int32Array.from(G), F, FR, FG, nCorps: C.G.length };
}

// ---------- plaquer (Newton sur le champ du groupe), détendre, normales, puis le maillage final (coutures, régions, uv, lng, poids)
function plaquer(G, P, Gv, n0, n1, it, g, N) {
  for (let i = n0; i < n1; i++) { const f = G[Gv[i]], it1 = it > 1 && RANG[Gv[i]] >= 2 ? it + 1 : it; let x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
    for (let k = 0; k < it1; k++) { const v = gradient(f, x, y, z, g), g2 = g[0] * g[0] + g[1] * g[1] + g[2] * g[2]; if (g2 < 1e-10) break; let s = v / g2;
      const m = Math.abs(s) * Math.sqrt(g2); if (m > .03) s *= .03 / m; x -= g[0] * s; y -= g[1] * s; z -= g[2] * s;
      if (N && k === it1 - 1) { const l = 1 / Math.sqrt(g2); N[i * 3] = g[0] * l; N[i * 3 + 1] = g[1] * l; N[i * 3 + 2] = g[2] * l; } else if (Math.abs(v) < 2e-5) break; }
    P[i * 3] = x; P[i * 3 + 1] = y; P[i * 3 + 2] = z; }
}
// détente : chaque sommet glisse (dans le plan tangent) vers la moyenne de ses voisins ; puis on replaque
function detendre(A, H, n1, fixe, N) {
  const { P, F } = H, deg = new Int32Array(n1 + 1);
  for (const f of F) for (let i = 0; i < f.length; i++) { const a = f[i], b = f[(i + 1) % f.length]; if (a < n1) deg[a + 1]++; if (b < n1) deg[b + 1]++; }
  for (let i = 0; i < n1; i++) deg[i + 1] += deg[i]; const vo = new Int32Array(deg[n1]), pos = deg.slice(0, n1);
  for (const f of F) for (let i = 0; i < f.length; i++) { const a = f[i], b = f[(i + 1) % f.length]; if (a < n1) vo[pos[a]++] = b; if (b < n1) vo[pos[b]++] = a; }
  const Q = P.slice(0, n1 * 3);
  for (let i = 0; i < n1; i++) { if (fixe.has(i)) continue; let sx = 0, sy = 0, sz = 0; const n = deg[i + 1] - deg[i]; if (!n) continue;
    for (let k = deg[i]; k < deg[i + 1]; k++) { const j = vo[k]; sx += P[j * 3]; sy += P[j * 3 + 1]; sz += P[j * 3 + 2]; }
    const nx = N[i * 3], ny = N[i * 3 + 1], nz = N[i * 3 + 2];
    let dx = sx / n - P[i * 3], dy = sy / n - P[i * 3 + 1], dz = sz / n - P[i * 3 + 2]; const dn = dx * nx + dy * ny + dz * nz;
    Q[i * 3] = P[i * 3] + (dx - dn * nx) * .5; Q[i * 3 + 1] = P[i * 3 + 1] + (dy - dn * ny) * .5; Q[i * 3 + 2] = P[i * 3 + 2] + (dz - dn * nz) * .5; }
  P.set(Q);
}
const CACHE = new Map();
function construireCorps(type, qualite = "plein", variante = "") {
  if (qualite !== "plein") variante = ""; const cle = type + "|" + qualite + "|" + variante; if (CACHE.has(cle)) return CACHE.get(cle);
  const t0 = performance.now(), ch = {}, top = n => ch[n] = Math.round(performance.now() - t0), A = anatomie(type, qualite, variante); top("anatomie");
  const cage = construireCage(type, qualite, A, variante); top("cage");
  const C = qualite === "plein" ? catmull(cage) : cage; top("catmull"); const H = construireTete(type, qualite, A, C), P = H.P, nv = H.G.length, g = [0, 0, 0]; top("tete");
  // le corps : plaquer, détendre une fois, puis un dernier pas pour tous (la tête est déjà sur la surface) qui donne les normales
  const nCorps = H.nCorps, N = new Float32Array(nv * 3);
  plaquer(A.G, P, H.G, 0, nCorps, 2, g, N); top("plaquer");
  detendre(A, H, nCorps, new Set(C.cou ?? []), N); plaquer(A.G, P, H.G, 0, nv, 1, g, N); top("detendre");
  const geo = assembler(type, qualite, A, H, N), ms = performance.now() - t0; top("assembler");
  const rp = reperesTete(type), Jt = new THREE.Vector3(...articulation(type, "tete")), tete = {};
  for (const [k, v] of Object.entries(rp)) tete[k] = v?.isVector3 ? v.clone().add(Jt) : Array.isArray(v) ? v.map(e => e?.isVector3 ? e.clone().add(Jt) : e?.centre ? { ...e, centre: e.centre.clone().add(Jt) } : e) : k === "front" || k === "bas" ? v + Jt.y : v;
  const L = liaison(type), joints = {}; for (const [k, v] of Object.entries(L.positions)) joints[k] = v.clone();
  // pour les habits et les cheveux : repères des régions (côté droit, côté gauche), longueurs des os, champs par groupe
  const RF = reperesRegions(type), V3 = (o, k) => new THREE.Vector3(RF[o + k], RF[o + k + 1], RF[o + k + 2]);
  const axes = REGIONS.map((n, r) => [0, 1].map(s => { const o = (r * 2 + s) * 12; return { o: V3(o, 0), w: V3(o, 3), u: V3(o, 6), v: V3(o, 9) }; }));
  const longueurs = {}; for (const [a, b] of [["bras", "avantbras"], ["avantbras", "main"], ["main", "doigts"], ["cuisse", "jambe"], ["jambe", "pied"], ["pied", "orteils"]]) longueurs[a] = joints[a + "_g"].distanceTo(joints[b + "_g"]);
  longueurs.cou = joints.cou.distanceTo(joints.tete);
  const champs = { tronc: A.G[0], cou: A.G[1], tete: A.G[2], bras_d: A.G[3], bras_g: A.G[4], main_d: A.G[5], main_g: A.G[6], jambe_d: A.G[7], jambe_g: A.G[8] };
  const meta = { type, variante, H: TYPES[type].H, sdf: A.tout, champs, joints, tete, regions: REGIONS, axes, longueurs, stats: { triangles: geo.index.count / 3, sommets: geo.attributes.position.count, ms: Math.round(ms * 10) / 10, etapes: ch, corps: nCorps, tete: nv - nCorps } };
  const r = { geo, meta }; CACHE.set(cle, r); return r;
}
// repères des régions (pose de liaison), 9 régions × 2 côtés × [origine, os (w), latéral (u), avant (v)] :
// u de l'uv = angle autour de w depuis u (0,5 = côté u, couture à l'opposé), lng = (p − origine)·w
function reperesRegions(type) {
  const L = liaison(type).positions, RF = new Float64Array(9 * 2 * 12), Vn = n => [L[n].x, L[n].y, L[n].z], DBL = ["bras", "avantbras", "main", "doigts", "cuisse", "jambe", "pied", "orteils"];
  for (let r = 0; r < 9; r++) for (const s of [0, 1]) { const [a, b] = OS_REGION[r], o = Vn(a + (DBL.includes(a) ? (s ? "_g" : "_d") : ""));
    const w = r === 0 || r === 2 ? [0, 1, 0] : nr(sb(Vn(b + (DBL.includes(b) ? (s ? "_g" : "_d") : "")), o)), u = r <= 2 ? [0, 0, 1] : ortho([s ? 1 : -1, 0, 0], w), v = r <= 2 ? [1, 0, 0] : r === 8 ? ortho([0, 1, 0], w) : ortho(ortho([0, 0, 1], w), u);
    RF.set([...o, ...w, ...u, ...v], (r * 2 + s) * 12); }
  return RF;
}
// les 4 plus grands poids (sans tri)
function top4(w, SI, SW, o) {
  const id = [-1, -1, -1, -1], v = [-1, -1, -1, -1];
  for (let b = 0; b < NB; b++) { const x = w[b]; if (x <= v[3]) continue; let k = 3; while (k > 0 && x > v[k - 1]) { v[k] = v[k - 1]; id[k] = id[k - 1]; k--; } v[k] = x; id[k] = b; }
  let s = 0; for (let k = 0; k < 4; k++) if (v[k] > 0) s += v[k]; s = s || 1;
  for (let k = 0; k < 4; k++) { SI[o + k] = id[k] < 0 ? 0 : id[k]; SW[o + k] = v[k] > 0 ? v[k] / s : 0; }
}
function assembler(type, qualite, A, H, N) {
  const { P, W, G, F, FR } = H, L = liaison(type).positions, nv = G.length;
  // triangles (diagonale la plus courte), tournés vers l'extérieur d'après la normale du champ
  const nT = F.reduce((t, f) => t + f.length - 2, 0), T = new Int32Array(nT * 3), TR = new Uint8Array(nT); let m = 0;
  const d2 = (a, b) => (P[a * 3] - P[b * 3]) ** 2 + (P[a * 3 + 1] - P[b * 3 + 1]) ** 2 + (P[a * 3 + 2] - P[b * 3 + 2]) ** 2;
  const tri = (a, b, c, r) => { const ux = P[b * 3] - P[a * 3], uy = P[b * 3 + 1] - P[a * 3 + 1], uz = P[b * 3 + 2] - P[a * 3 + 2], vx = P[c * 3] - P[a * 3], vy = P[c * 3 + 1] - P[a * 3 + 1], vz = P[c * 3 + 2] - P[a * 3 + 2];
    const s = (uy * vz - uz * vy) * (N[a * 3] + N[b * 3] + N[c * 3]) + (uz * vx - ux * vz) * (N[a * 3 + 1] + N[b * 3 + 1] + N[c * 3 + 1]) + (ux * vy - uy * vx) * (N[a * 3 + 2] + N[b * 3 + 2] + N[c * 3 + 2]);
    T[m * 3] = a; T[m * 3 + 1] = s < 0 ? c : b; T[m * 3 + 2] = s < 0 ? b : c; TR[m++] = r; };
  F.forEach((f, i) => { const r = FR[i]; if (f.length === 3) tri(f[0], f[1], f[2], r); else if (d2(f[0], f[2]) <= d2(f[1], f[3])) { tri(f[0], f[1], f[2], r); tri(f[0], f[2], f[3], r); } else { tri(f[0], f[1], f[3], r); tri(f[1], f[2], f[3], r); } });
  const RF = reperesRegions(type);
  const SI = new Uint16Array(nv * 4), SW = new Float32Array(nv * 4); for (let i = 0; i < nv; i++) top4(W[i], SI, SW, i * 4);
  // sommets dédoublés par région et sur la couture (u qui fait le tour)
  const carte = new Int32Array(nv * 18).fill(-1), M3 = nT * 3, pos = new Float32Array(M3 * 3), nor = new Float32Array(M3 * 3), uv = new Float32Array(M3 * 2), si = new Uint16Array(M3 * 4), sw = new Float32Array(M3 * 4), reg = new Float32Array(M3), lng = new Float32Array(M3), idx = [];
  let n = 0; const us = [0, 0, 0], ls = [0, 0, 0];
  for (let t = 0; t < nT; t++) { const r = TR[t];
    for (let k = 0; k < 3; k++) { const i = T[t * 3 + k], o = (r * 2 + (P[i * 3] >= 0 ? 1 : 0)) * 12, qx = P[i * 3] - RF[o], qy = P[i * 3 + 1] - RF[o + 1], qz = P[i * 3 + 2] - RF[o + 2];
      us[k] = Math.atan2(qx * RF[o + 9] + qy * RF[o + 10] + qz * RF[o + 11], qx * RF[o + 6] + qy * RF[o + 7] + qz * RF[o + 8]) / (2 * PI) + .5; ls[k] = qx * RF[o + 3] + qy * RF[o + 4] + qz * RF[o + 5]; }
    const wrap = Math.max(us[0], us[1], us[2]) - Math.min(us[0], us[1], us[2]) > .5;
    for (let k = 0; k < 3; k++) { const i = T[t * 3 + k], w = wrap && us[k] < .5 ? 1 : 0, key = i * 18 + r * 2 + w; let j = carte[key];
      if (j < 0) { j = carte[key] = n++; pos[j * 3] = P[i * 3]; pos[j * 3 + 1] = P[i * 3 + 1]; pos[j * 3 + 2] = P[i * 3 + 2]; nor[j * 3] = N[i * 3]; nor[j * 3 + 1] = N[i * 3 + 1]; nor[j * 3 + 2] = N[i * 3 + 2];
        uv[j * 2] = us[k] + w; uv[j * 2 + 1] = ls[k]; for (let c = 0; c < 4; c++) { si[j * 4 + c] = SI[i * 4 + c]; sw[j * 4 + c] = SW[i * 4 + c]; } reg[j] = r; lng[j] = ls[k]; }
      idx.push(j); } }
  // oreilles (tete.js) : collées à l'os de la tête, ajoutées à la fin (geo.userData.oreilles = [début, nombre] dans l'index)
  const or = oreilles(type, qualite), Jt = [L.tete.x, L.tete.y, L.tete.z], geo = new THREE.BufferGeometry(), extra = { pos: [], nor: [], uv: [], lng: [] };
  if (or && or.attributes?.position?.count) { const op = or.attributes.position, on = or.attributes.normal, ou = or.attributes.uv, b0 = n, cnt = op.count;
    for (let i = 0; i < cnt; i++) { extra.pos.push(op.getX(i) + Jt[0], op.getY(i) + Jt[1], op.getZ(i) + Jt[2]); extra.nor.push(on ? on.getX(i) : 0, on ? on.getY(i) : 1, on ? on.getZ(i) : 0); extra.uv.push(ou ? ou.getX(i) : 0, op.getY(i)); extra.lng.push(op.getY(i)); }
    const i0 = idx.length; if (or.index) for (let i = 0; i < or.index.count; i++) idx.push(or.index.getX(i) + b0); else for (let i = 0; i < cnt; i++) idx.push(i + b0);
    geo.userData.oreilles = [i0, idx.length - i0]; }
  const ne = extra.pos.length / 3, nn = n + ne, cat = (a, b, k) => { const o = new a.constructor(nn * k); o.set(a.subarray(0, n * k)); if (b) o.set(b, n * k); return o; };
  const siE = new Uint16Array(ne * 4), swE = new Float32Array(ne * 4); for (let i = 0; i < ne; i++) { siE[i * 4] = I.tete; swE[i * 4] = 1; }
  geo.setAttribute("position", new THREE.BufferAttribute(cat(pos, extra.pos, 3), 3)); geo.setAttribute("normal", new THREE.BufferAttribute(cat(nor, extra.nor, 3), 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(cat(uv, extra.uv, 2), 2)); geo.setAttribute("skinIndex", new THREE.BufferAttribute(cat(si, siE, 4), 4)); geo.setAttribute("skinWeight", new THREE.BufferAttribute(cat(sw, swE, 4), 4));
  geo.setAttribute("region", new THREE.BufferAttribute(cat(reg, new Float32Array(ne).fill(2), 1), 1)); geo.setAttribute("lng", new THREE.BufferAttribute(cat(lng, extra.lng, 1), 1));
  geo.setIndex(nn > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
  geo.computeBoundingSphere(); geo.computeBoundingBox(); geo.userData.partage = true; return geo;
}
return construireCorps;
})();
