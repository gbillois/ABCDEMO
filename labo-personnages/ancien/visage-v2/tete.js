// tete.js — la tête en champ de distance signé (SDF) : crâne, front, mâchoire, menton, pommettes et joues, orbites,
// nez (arête, bout, ailes, narines), philtrum, lèvres qui sourient, coins de la bouche, dessous du menton et cou.
// Repère local de l'os « tete » (pivot = atlas, axes du monde, le visage regarde +z), unités du modèle.
// sdfTete : la peau du corps (les yeux y sont des creux où se logent les globes) ; sdfTeteFermee : la même tête,
// paupières fermées (sert aux paupières et aux décalques de visage.js, et à la foule qui n'a pas de vrais yeux).
import * as THREE from "three";

const sq = Math.sqrt, ab = Math.abs, mx = Math.max, mn = Math.min;
// union et intersection douces (polynôme), k = largeur du raccord
const smin = (a, b, k) => { const h = k - ab(a - b); return h > 0 ? mn(a, b) - h * h * .25 / k : mn(a, b); };
const smax = (a, b, k) => { const h = k - ab(a - b); return h > 0 ? mx(a, b) + h * h * .25 / k : mx(a, b); };
// ellipsoïde e = [cx, cy, cz, a, b, c] (+ 1/a, 1/b, 1/c, min, ajoutés au chargement) — borne d'I. Quilez, rapide
function ell(x, y, z, e) {
  const ia = e[6], ib = e[7], ic = e[8], X = (x - e[0]) * ia, Y = (y - e[1]) * ib, Z = (z - e[2]) * ic, k0 = sq(X * X + Y * Y + Z * Z);
  const k1 = sq(X * X * ia * ia + Y * Y * ib * ib + Z * Z * ic * ic); return k1 < 1e-9 ? -e[9] : k0 * (k0 - 1) / k1;
}
const prepEll = e => e.length === 6 ? [...e, 1 / e[3], 1 / e[4], 1 / e[5], mn(e[3], e[4], e[5])] : e;
// capsule à rayon variable c = [ax, ay, az, bx, by, bz, ra, rb]
function cap(x, y, z, c) {
  const bx = c[3] - c[0], by = c[4] - c[1], bz = c[5] - c[2], px = x - c[0], py = y - c[1], pz = z - c[2];
  const t = mx(0, mn(1, (px * bx + py * by + pz * bz) / (bx * bx + by * by + bz * bz))), dx = px - bx * t, dy = py - by * t, dz = pz - bz * t;
  return sq(dx * dx + dy * dy + dz * dz) - (c[6] + (c[7] - c[6]) * t);
}
const sph = (x, y, z, cx, cy, cz, r) => { const dx = x - cx, dy = y - cy, dz = z - cz; return sq(dx * dx + dy * dy + dz * dz) - r; };

// Mesures par type (x des pièces doubles en valeur absolue : côté gauche, le droit est le miroir).
// enfant de 8 ans : crâne rond, front grand et bombé, joues pleines, petit nez à l'arête basse, petit menton
const ENFANT = {
  crane: [0, .150, -.010, .1155, .146, .146], effil: .06,          // crâne (plus étroit devant, plus large derrière)
  front: [0, .176, .052, .093, .086, .093], kFront: .03,            // front bombé
  face: [0, .088, .040, .094, .078, .102], kFace: .032,              // masse du visage (maxillaire, pommettes)
  bas: [0, .040, .038, .079, .060, .095], kBas: .032,                // bas du visage plein (joues basses, mâchoire ronde)
  museau: [0, .030, .098, .046, .040, .052], kMuseau: .022,         // arcade dentaire sous les lèvres
  joue: [.053, .066, .083, .044, .039, .043], kJoue: .026,          // boule de Bichat : joue pleine d'enfant
  pommette: [.066, .098, .074, .032, .020, .034], kPom: .022,
  zygo: [.068, .098, .058, .090, .094, .004, .010, .005], kZygo: .022,
  masseter: [.068, .086, .018, .064, .022, -.012, .016, .017], kMass: .024, // masséter : de la pommette à l'angle de la mâchoire    // arcade zygomatique (vers l'oreille)
  mach: [.054, .012, -.018, .016, -.021, .097, .020, .016], kMach: .03, // branche horizontale de la mâchoire
  menton: [0, -.014, .117, .027, .022, .025], kMenton: .016,
  cou: [0, -.17, -.030, 0, .02, -.034, .062, .060], kCou: .038,
  arcade: [.042, .160, .112, .034, .011, .014], kArcade: .02, kGlobe: .007,
  coussin: [.0445, .136, .1215, .025, .016, .016], kCoussin: .012,   // graisse de la paupière du haut (pas de creux chez l'enfant)
  canthus: [.0255, .1195, .1305, .0062, .0085, .0095], kCanthus: .004, // creux du coin intérieur de l'œil      // arcade sourcilière (douce chez l'enfant)
  oeil: [.0445, .121, .1165], r: .019, t: .0026,                    // globe (centre, rayon), épaisseur de paupière
  orbite: [.0445, .1225, .1290, .0305, .0205, .0165], kOrb: .009,        // creux de l'orbite (pli de la paupière)
  nezPont: [0, .126, .131, 0, .067, .162, .0090, .0110], kNez: .018,
  nezBout: [0, .0595, .1665, .0130, .0118, .0120],
  aile: [.0128, .0545, .1550, .0094, .0090, .0100], kAile: .007,
  narine: [.0068, .0455, .1560, .0030, .0020, .0042],
  philtrum: [0, .041, .1585, .0032, .0075, .0032],
  bouche: [.0235, .1505, 8, 14, .026],                             // fente (y, z), sourire κ, enroulement β, demi-largeur
  levreH: [0, .0306, .1470, .0272, .0072, .0072], levreB: [0, .0160, .1458, .0224, .0080, .0078],
  tub: [0, .0260, .1505, .0050, .0030, .0030],                       // petit tubercule de la lèvre du haut
  coin: [.0290, .0235, .1470, .0026],                               // fossette du coin de la bouche
  haut: .295, bas_y: -.035, front_y: .215, oreille: [.104, .100, -.008], masque: [.030, .057, .046, .065, .033, .050],
};
// Adultes (menton y = −0,025 / −0,03, sommet 0,275 / 0,26) : yeux à mi-hauteur, visage plus long, nez et menton marqués,
// lèvres plus fines. Femme : visage doux et rond (la grand-mère) ; homme : mâchoire et arcades plus fortes.
const FEMME = {
  crane: [0, .152, -.014, .0960, .123, .121], effil: .05,
  front: [0, .158, .042, .076, .070, .074], kFront: .028,
  face: [0, .082, .028, .078, .088, .090], kFace: .032,
  bas: [0, .044, .030, .060, .050, .083], kBas: .028,
  museau: [0, .042, .082, .038, .036, .044], kMuseau: .02,
  joue: [.040, .062, .056, .030, .030, .028], kJoue: .016,
  pommette: [.056, .100, .056, .026, .016, .026], kPom: .016,
  zygo: [.058, .099, .046, .078, .094, -.004, .007, .003], kZygo: .018,
  masseter: [.060, .084, .012, .056, .020, -.016, .014, .014], kMass: .022,
  mach: [.050, .012, -.024, .022, -.011, .074, .016, .012], kMach: .024,
  menton: [0, -.005, .088, .027, .023, .024], kMenton: .026,
  cou: [0, -.17, -.036, 0, -.012, -.044, .052, .050], kCou: .032,
  arcade: [.038, .147, .100, .030, .010, .013], kArcade: .018, kGlobe: .006,
  coussin: [.0405, .132, .1055, .021, .014, .014], kCoussin: .01,
  canthus: [.0235, .124, .1150, .0055, .0075, .0085], kCanthus: .0035,
  oeil: [.0405, .125, .1015], r: .0158, t: .0022,
  orbite: [.0405, .127, .1130, .027, .018, .0145], kOrb: .008,
  nezPont: [0, .127, .1175, 0, .075, .1465, .0072, .0094], kNez: .015,
  nezBout: [0, .0685, .1445, .0108, .0100, .0102],
  aile: [.0118, .0645, .1305, .0082, .0080, .0092], kAile: .006,
  narine: [.0060, .0555, .1350, .0028, .0019, .0038],
  philtrum: [0, .0500, .1325, .0030, .0068, .0030],
  bouche: [.0360, .1300, 7, 12, .0300],
  levreH: [0, .0422, .1268, .0290, .0058, .0060], levreB: [0, .0290, .1250, .0240, .0068, .0064],
  tub: [0, .0375, .1298, .0044, .0026, .0026],
  coin: [.0300, .0360, .1215, .0026],
  haut: .275, bas_y: -.025, front_y: .205, oreille: [.088, .106, -.012], masque: [.041, .053, .046, .075, .030, .045],
};
const HOMME = {
  crane: [0, .125, -.014, .0980, .135, .128], effil: .05,
  front: [0, .148, .044, .080, .066, .076], kFront: .028,
  face: [0, .080, .032, .082, .084, .092], kFace: .03,
  bas: [0, .040, .030, .064, .052, .086], kBas: .026,
  museau: [0, .035, .085, .040, .036, .046], kMuseau: .02,
  joue: [.043, .060, .060, .030, .030, .028], kJoue: .016,
  pommette: [.062, .094, .062, .028, .017, .027], kPom: .018,
  zygo: [.063, .093, .048, .082, .089, -.006, .008, .003], kZygo: .018,
  masseter: [.066, .080, .012, .062, .014, -.016, .016, .016], kMass: .022,
  mach: [.056, .006, -.022, .024, -.016, .078, .019, .014], kMach: .02,
  menton: [0, -.010, .094, .029, .024, .024], kMenton: .024,
  cou: [0, -.17, -.036, 0, .01, -.038, .058, .056], kCou: .032,
  arcade: [.039, .140, .1075, .036, .013, .017], kArcade: .016, kGlobe: .006,
  coussin: [.042, .1245, .1085, .022, .013, .014], kCoussin: .01,
  canthus: [.0245, .1165, .1170, .0055, .0075, .0085], kCanthus: .0035,
  oeil: [.042, .117, .1035], r: .0162, t: .0022,
  orbite: [.042, .119, .1155, .028, .018, .015], kOrb: .008,
  nezPont: [0, .120, .1205, 0, .067, .1515, .0078, .0098], kNez: .015,
  nezBout: [0, .0595, .1495, .0114, .0106, .0108],
  aile: [.0128, .0560, .1345, .0088, .0085, .0098], kAile: .006,
  narine: [.0066, .0470, .1392, .0030, .0020, .0040],
  philtrum: [0, .0420, .1355, .0031, .0068, .0030],
  bouche: [.0260, .1335, 4, 12, .0280],
  levreH: [0, .0318, .1302, .0272, .0050, .0056], levreB: [0, .0196, .1284, .0225, .0060, .0060],
  tub: [0, .0272, .1332, .0044, .0024, .0024],
  coin: [.0280, .0260, .1258, .0026],
  haut: .260, bas_y: -.030, front_y: .190, oreille: [.093, .100, -.014], masque: [.031, .056, .047, .066, .032, .047],
};
const PT = { garcon: ENFANT, fille: ENFANT, femme: FEMME, homme: HOMME };
// Ouverture des paupières, en angles autour du centre du globe (θ vers la tempe, φ vers le haut) : coins (intérieur m,
// extérieur l), hauteur des arcs du haut / du bas, et où tombe leur sommet (γ) ; iris = demi-angle de l'iris.
export const OUVERTURES = {
  enfant: { tm: -1.28, pm: -.06, tl: 1.36, pl: .08, au: .37, gu: .8, al: .41, gl: 1.05, iris: .52 },
  adulte: { tm: -1.24, pm: -.05, tl: 1.34, pl: .09, au: .32, gu: .76, al: .38, gl: 1.1, iris: .56 },
};
ENFANT.ouv = OUVERTURES.enfant; FEMME.ouv = HOMME.ouv = OUVERTURES.adulte;
// bords des paupières pour θ : [φ du haut, φ du bas, φ où elles se rejoignent quand l'œil se ferme]
export function bords(O, th) {
  const t = mx(0, mn(1, (th - O.tm) / (O.tl - O.tm))), b = O.pm + (O.pl - O.pm) * t;
  const up = b + O.au * Math.sin(Math.PI * t ** O.gu), lo = b - O.al * Math.sin(Math.PI * t ** O.gl);
  return [up, lo, lo + (up - lo) * .16];
}
// rayon et centre des creux du corps autour des yeux (le globe s'y loge, les paupières de visage.js le recouvrent)
for (const P of Object.values(PT)) { P.creux = P.r + .013; P.prox = P.r - .003; }

// bornes : rayon de la sphère qui contient chaque pièce (pour sauter les pièces trop loin, sans couture)
const RB = e => e.length === 6 ? mx(e[3], e[4], e[5]) : sq((e[3] - e[0]) ** 2 + (e[4] - e[1]) ** 2 + (e[5] - e[2]) ** 2) / 2 + mx(e[6], e[7]);
const CB = e => e.length === 6 ? [e[0], e[1], e[2]] : [(e[0] + e[3]) / 2, (e[1] + e[4]) / 2, (e[2] + e[5]) / 2];
const NOMS = ["masseter", "zygo", "canthus", "coussin", "front", "face", "bas", "museau", "joue", "pommette", "mach", "menton", "cou", "arcade", "orbite", "nezPont", "nezBout", "aile", "narine", "philtrum", "levreH", "levreB", "tub"];
for (const P of new Set(Object.values(PT))) { P.B = {}; for (const n of NOMS) if (P[n]) { const c = CB(P[n]); P.B[n] = [c[0], c[1], c[2], RB(P[n])]; P[n] = prepEll(P[n]); } P.crane = prepEll(P.crane); }
// distance minimale possible à la pièce n (≤ vraie distance)
const lb = (x, y, z, b) => { const dx = x - b[0], dy = y - b[1], dz = z - b[2]; return sq(dx * dx + dy * dy + dz * dz) - b[3]; };
// la pièce b peut-elle compter ? (distance à sa sphère < lim), sans racine carrée
const pres = (x, y, z, b, lim) => { const t = b[3] + lim; if (t <= 0) return false; const dx = x - b[0], dy = y - b[1], dz = z - b[2]; return dx * dx + dy * dy + dz * dz < t * t; };

// La tête, paupières fermées (f = true) ou peau du corps (f = false : creux des yeux + globe de remplissage, nez et
// bouche simplifiés sous le masque). Une fonction par type, toutes les mesures en constantes locales (rapide).
function fabrique(P) {
  const F = a => Float64Array.from(a), B = P.B, b_ = n => F(B[n] || [0, 0, 0, -1e9]);
  const C = F(P.crane), effil = P.effil, cou = F(P.cou), front = F(P.front), face = F(P.face), bas = P.bas ? F(P.bas) : null, museau = F(P.museau), mach = F(P.mach), menton = F(P.menton);
  const mass = F(P.masseter), zygo = F(P.zygo), joue = F(P.joue), pom = F(P.pommette), arcade = F(P.arcade), orbite = F(P.orbite), coussin = P.coussin ? F(P.coussin) : null, canthus = P.canthus ? F(P.canthus) : null;
  const nezPont = F(P.nezPont), nezBout = F(P.nezBout), aile = F(P.aile), narine = F(P.narine), philtrum = F(P.philtrum), levreH = F(P.levreH), levreB = F(P.levreB), tub = F(P.tub), coin = F(P.coin), M = F(P.bouche), E = F(P.oeil), MQ = F(P.masque);
  const bCou = b_("cou"), bFront = b_("front"), bFace = b_("face"), bBas = b_("bas"), bMus = b_("museau"), bMach = b_("mach"), bMen = b_("menton"), bJoue = b_("joue"), bPom = b_("pommette"), bZyg = b_("zygo"), bMass = b_("masseter");
  const bArc = b_("arcade"), bOrb = b_("orbite"), bCous = b_("coussin"), bCan = b_("canthus"), bPont = b_("nezPont"), bAile = b_("aile"), bNar = b_("narine"), bPhi = b_("philtrum"), bLH = b_("levreH"), bLB = b_("levreB");
  const kCou = P.kCou, kFront = P.kFront, kFace = P.kFace, kBas = P.kBas, kMus = P.kMuseau, kMach = P.kMach, kMen = P.kMenton, kJoue = P.kJoue, kPom = P.kPom, kZyg = P.kZygo, kMass = P.kMass, kArc = P.kArcade, kOrb = P.kOrb;
  const kCous = P.kCoussin, kCan = P.kCanthus, kg = P.kGlobe || .008, kNez = P.kNez, kAile = P.kAile, rt = P.r + P.t, creux = P.creux, prox = P.prox, O = P.ouv;
  const tm = O.tm, tl = O.tl, pm = O.pm, pl = O.pl, au = O.au, al = O.al, gu = O.gu, gl = O.gl, PIr = Math.PI;
  // boîte de l'œil : union des sphères de ses pièces (+ largeur des raccords)
  const bo = [1, 1, -1, -1]; for (const [b, k] of [[bArc, kArc], [bOrb, kOrb], [bCous, kCous || 0], [bCan, kCan || 0], [[E[0], E[1], E[2], creux + .004], 0]]) if (b[3] > 0) {
    bo[0] = mn(bo[0], b[0] - b[3] - k); bo[2] = mx(bo[2], b[0] + b[3] + k); bo[1] = mn(bo[1], b[1] - b[3] - k); bo[3] = mx(bo[3], b[1] + b[3] + k); }
  const ox0 = bo[0] - .012, ox1 = bo[2] + .012, oy0 = bo[1] - .012, oy1 = bo[3] + .012; // marge : continu jusqu’à d ≈ 0,012
  return (x, y, z, f) => { // f : 0 = peau du corps, 1 = paupières fermées (détaillée), 2 = foule (fermée et simplifiée)
    const corps = f === 0;
    const X = ab(x);
    // crâne : ellipsoïde un peu effilé vers l'avant
    const zn = (z - C[2]) / C[5], w = 1 - effil * mx(-1, mn(1, zn));
    let d = ell(x / w, y, z, C) * (w < 1 ? w : 1);
    if (pres(x, y, z, bCou, d + kCou)) d = smin(d, cap(x, y, z, cou), kCou);
    if (d > .12) return d; // loin de la tête
    if (pres(x, y, z, bFront, d + kFront)) d = smin(d, ell(x, y, z, front), kFront);
    if (pres(x, y, z, bFace, d + kFace)) d = smin(d, ell(x, y, z, face), kFace);
    if (bas && pres(x, y, z, bBas, d + kBas)) d = smin(d, ell(x, y, z, bas), kBas);
    if (pres(x, y, z, bMus, d + kMus)) d = smin(d, ell(x, y, z, museau), kMus);
    if (pres(X, y, z, bMach, d + kMach)) d = smin(d, cap(X, y, z, mach), kMach);
    if (pres(x, y, z, bMen, d + kMen)) d = smin(d, ell(x, y, z, menton), kMen);
    if (pres(X, y, z, bJoue, d + kJoue)) d = smin(d, ell(X, y, z, joue), kJoue);
    if (pres(X, y, z, bPom, d + kPom)) d = smin(d, ell(X, y, z, pom), kPom);
    if (pres(X, y, z, bZyg, d + kZyg)) d = smin(d, cap(X, y, z, zygo), kZyg);
    if (pres(X, y, z, bMass, d + kMass)) d = smin(d, cap(X, y, z, mass), kMass);
    if (z < .03 || d < -.03 || d > .06) return d; // l'arrière, le dedans profond, le loin : les détails n'y changent rien
    // orbites, arcades et yeux (seulement dans la boîte de l'œil)
    const ex = X - E[0], ey = y - E[1], ez = z - E[2], de = sq(ex * ex + ey * ey + ez * ez);
    if (X > ox0 && X < ox1 && y > oy0 && y < oy1) {
      if (pres(X, y, z, bArc, d + kArc)) d = smin(d, ell(X, y, z, arcade), kArc);
      if (pres(X, y, z, bOrb, kOrb - d)) d = smax(d, -ell(X, y, z, orbite), kOrb);
      if (coussin && pres(X, y, z, bCous, d + kCous)) d = smin(d, ell(X, y, z, coussin), kCous);
      if (canthus && pres(X, y, z, bCan, kCan - d)) d = smax(d, -ell(X, y, z, canthus), kCan);
      if (de - rt < d + kg) d = smin(d, de - rt, kg); // le globe sous les paupières fermées
    }
    // peau du corps : un creux en amande derrière l'ouverture des paupières (+ 0,17 rad), fermé par un globe plus petit ;
    // les paupières de visage.js recouvrent le bord, le vrai globe se loge devant
    if (corps && de < creux + .0012 - d) {
      const th = Math.atan2(ex, ez), ph = Math.asin(mx(-1, mn(1, ey / de)));
      const t = mx(0, mn(1, (th - tm) / (tl - tm))), b0 = pm + (pl - pm) * t;
      const m = mx(ph - b0 - au * Math.sin(PIr * t ** gu) - .17, b0 - al * Math.sin(PIr * t ** gl) - ph - .17, tm - th - .07, th - tl - .08);
      const dV = mx(de - creux, m * de); d = smax(d, -dV, .0012);
    }
    if (corps && de - prox < d + .002) d = smin(d, de - prox, .002);
    // peau du corps sur le nez et la bouche : visage simplifié (nez aminci, sans lèvres ni narines) et un peu en retrait ;
    // le masque de visage.js (dense) dessine le vrai nez et la vraie bouche par-dessus
    let wm = 0; if (f !== 1 && z > .05 && X < .07) { const k1 = sq((X / MQ[1]) ** 2 + ((y - MQ[0]) / MQ[2]) ** 2), k2 = sq((X / MQ[4]) ** 2 + ((y - MQ[3]) / MQ[5]) ** 2);
      const dm = mn((k1 - 1) * mn(MQ[1], MQ[2]), (k2 - 1) * mn(MQ[4], MQ[5])); if (dm < -.004) { const a = mn(1, (-.004 - dm) / .008), b = mn(1, (z - .05) / .035); wm = a * a * (3 - 2 * a) * b * b * (3 - 2 * b); } }
    let ds = d;
    // nez
    if (pres(x, y, z, bPont, d + kNez) || pres(X, y, z, bAile, d + kNez)) {
      let n = cap(x, y, z, nezPont); n = smin(n, ell(x, y, z, nezBout), .012);
      if (wm > 0) ds = smin(ds, n + .0035, kNez);
      n = smin(n, ell(X, y, z, aile), kAile); d = smin(d, n, kNez);
    }
    if (pres(X, y, z, bNar, .0018 - d)) d = smax(d, -ell(X, y, z, narine), .0018);
    // bouche : espace courbé (sourire κ, enroulement β autour de l'arcade dentaire)
    if (X < M[4] + .03 && ab(y - M[0]) < .045 && z > M[1] - .05) {
      const x2 = x * x, yb = y - M[2] * x2, zb = z + M[3] * x2;
      if (pres(x, y, z, bPhi, .004 - d)) d = smax(d, -ell(x, y, z, philtrum), .004);
      if (pres(x, yb, zb, bLH, d + .006) || pres(x, yb, zb, bLB, d + .006)) {
        let l = ell(x, yb, zb, levreH); l = smin(l, ell(x, yb, zb, tub), .004); l = smin(l, ell(x, yb, zb, levreB), .003); d = smin(d, l, .006); }
      // fente entre les lèvres, et petits creux aux coins (sourire)
      const fe = mx(ab(yb - M[0]) - .0005, M[1] - .0022 - zb, X - M[4]); if (fe < .0026 - d) d = smax(d, -fe, .0026);
      const dc = sph(X, yb, zb, coin[0], coin[1], coin[2], coin[3]); if (dc < .003 - d) d = smax(d, -dc, .003);
    }
    return wm > 0 ? d + (ds + (corps ? .0036 : 0) - d) * wm : d;
  };
}
for (const P of new Set(Object.values(PT))) P.F = fabrique(P);
const champ = (x, y, z, P, f) => P.F(x, y, z, f ? 1 : 0);
// zone du masque (nez, philtrum, bouche, menton) : distance 2D (approchée) à l'union de deux ellipses, < 0 dedans
function distMasque(X, y, P) {
  const m = P.masque, k1 = sq((X / m[1]) ** 2 + ((y - m[0]) / m[2]) ** 2), k2 = sq((X / m[4]) ** 2 + ((y - m[3]) / m[5]) ** 2);
  return mn((k1 - 1) * mn(m[1], m[2]), (k2 - 1) * mn(m[4], m[5]));
}
function poidsMasque(X, y, z, P) {
  if (z < .05 || X > .07) return 0; const dm = distMasque(X, y, P); if (dm > -.004) return 0;
  const a = mn(1, (-.004 - dm) / .008), b = mn(1, mx(0, (z - .05) / .035)); return a * a * (3 - 2 * a) * b * b * (3 - 2 * b);
}
// pour visage.js : distance au bord du masque (x, y du repère de la tête) ; le corps n'est simplifié que pour dm < −0,004
export const masqueTete = (x, y, type) => distMasque(ab(x), y, PT[type] || ENFANT);
const FG = ENFANT.F, FF = FEMME.F, FH = HOMME.F, Fde = type => type === "femme" ? FF : type === "homme" ? FH : FG;
export const sdfTete = (x, y, z, type) => Fde(type)(x, y, z, 0);
export const sdfTeteFermee = (x, y, z, type) => Fde(type)(x, y, z, 1);
// pour la foule (« leger ») : paupières fermées, nez et bouche simplifiés (le visage y est peint)
export const sdfTeteLegere = (x, y, z, type) => Fde(type)(x, y, z, 2);
export const mesuresTete = type => PT[type] || ENFANT;

// gradient (différences centrées), dans v (Vector3) ; f = (x, y, z) => distance
export function gradient(f, x, y, z, v = new THREE.Vector3(), e = .0006) {
  return v.set(f(x + e, y, z) - f(x - e, y, z), f(x, y + e, z) - f(x, y - e, z), f(x, y, z + e) - f(x, y, z - e)).normalize();
}
// premier point de la surface le long d'un rayon (o + s·d, s dans [s0, s1]) : pas adaptatif (≈ 0,7 × la distance, au moins
// « pas / 4 », au plus « pas ») puis dichotomie ; null si rien
export function rayon(f, ox, oy, oz, dx, dy, dz, s0 = 0, s1 = .3, pas = .002) {
  let a = s0, fa = f(ox + dx * a, oy + dy * a, oz + dz * a); const neg = fa < 0, pmin = pas * .25;
  while (a < s1) {
    const s = mn(s1, a + mx(pmin, mn(pas * 8, ab(fa) * .7))), fs = f(ox + dx * s, oy + dy * s, oz + dz * s);
    if ((fs < 0) !== neg) { let b = s; for (let i = 0; i < 12; i++) { const m = (a + b) * .5, fm = f(ox + dx * m, oy + dy * m, oz + dz * m); if ((fm < 0) === neg) a = m; else b = m; } return (a + b) * .5; }
    a = s; fa = fs;
  }
  return null;
}

// Repères de la tête (repère local de l'os « tete »), mis en cache par type
const REP = new Map();
export function reperesTete(type) {
  if (REP.has(type)) return REP.get(type);
  const P = PT[type] || ENFANT, f = (x, y, z) => champ(x, y, z, P, true), V = (x, y, z) => new THREE.Vector3(x, y, z), E = P.oeil;
  const avant = (x, y) => { const s = rayon(f, x, y, .3, 0, 0, -1, 0, .3, .002); return V(x, y, s === null ? 0 : .3 - s); };
  const cote = (y, z) => { const s = rayon(f, .2, y, z, -1, 0, 0, 0, .2, .002); return s === null ? 0 : .2 - s; };
  const nez = avant(0, P.nezBout[1]), bouche = avant(0, P.bouche[0]), menton = avant(0, P.menton[1] - .008);
  const cy = (P.haut + P.bas_y) / 2, dl = cote(P.crane[1], P.crane[2]);
  const O = P.oreille;
  const r = {
    yeux: [-1, 1].map(s => ({ centre: V(s * E[0], E[1], E[2]), rayon: P.r, paupiere: P.t })),
    nez, bouche, menton, haut: V(0, P.haut, P.crane[2]), centre: V(0, cy, (P.crane[2] + nez.z - .03) / 2 - .01), demiLargeur: dl,
    oreilles: [-1, 1].map(s => V(s * cote(O[1], O[2]), O[1], O[2])), front: P.front_y,
    // en plus : pour les lunettes, les sourcils, les cheveux
    nasion: avant(0, E[1] + .006), sourcils: [-1, 1].map(s => avant(s * E[0], E[1] + .033)), tempes: [-1, 1].map(s => V(s * cote(E[1] + .01, E[2] - .03), E[1] + .01, E[2] - .03)),
    bas: P.bas_y,
  };
  REP.set(type, r); return r;
}

// Maillage d'un champ (« surface nets ») dans la boîte [x0,x1]×[y0,y1]×[z0,z1], pas h.
// garder(x, y, z) facultatif : filtre des triangles (centre). Renvoie une BufferGeometry indexée (position, normal).
export function maillerSDF(f, x0, y0, z0, x1, y1, z1, h, garder) {
  const nx = Math.ceil((x1 - x0) / h) + 1, ny = Math.ceil((y1 - y0) / h) + 1, nz = Math.ceil((z1 - z0) / h) + 1, nxy = nx * ny;
  const v = new Float32Array(nx * ny * nz);
  for (let k = 0, q = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++, q++) v[q] = f(x0 + i * h, y0 + j * h, z0 + k * h);
  const id = new Int32Array(nx * ny * nz).fill(-1), P = [];
  const EA = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const co = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]], val = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const q = i + j * nx + k * nxy; let neg = 0;
    for (let c = 0; c < 8; c++) { val[c] = v[q + co[c][0] + co[c][1] * nx + co[c][2] * nxy]; if (val[c] < 0) neg++; }
    if (neg === 0 || neg === 8) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of EA) { if ((val[a] < 0) === (val[b] < 0)) continue; const t = val[a] / (val[a] - val[b]);
      sx += co[a][0] + (co[b][0] - co[a][0]) * t; sy += co[a][1] + (co[b][1] - co[a][1]) * t; sz += co[a][2] + (co[b][2] - co[a][2]) * t; n++; }
    id[q] = P.length / 3; P.push(x0 + (i + sx / n) * h, y0 + (j + sy / n) * h, z0 + (k + sz / n) * h);
  }
  // projection sur la surface et normales
  const N = new Float32Array(P.length), g = new THREE.Vector3();
  for (let p = 0; p < P.length; p += 3) { for (let it = 0; it < 2; it++) { const d = f(P[p], P[p + 1], P[p + 2]); gradient(f, P[p], P[p + 1], P[p + 2], g, h * .25); P[p] -= g.x * d; P[p + 1] -= g.y * d; P[p + 2] -= g.z * d; }
    gradient(f, P[p], P[p + 1], P[p + 2], g, h * .3); N[p] = g.x; N[p + 1] = g.y; N[p + 2] = g.z; }
  const I = [], quad = (a, b, c, d) => { if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (garder) { const m = (u, o) => (P[u * 3 + o] + P[d * 3 + o]) * .5; if (!garder(m(a, 0), m(a, 1), m(a, 2))) return; }
    I.push(a, b, c, a, c, d); };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const q = i + j * nx + k * nxy, s0 = v[q] < 0;
    if (i < nx - 1 && s0 !== (v[q + 1] < 0)) { const a = id[q], b = id[q - nxy], c = id[q - nxy - nx], d = id[q - nx]; s0 ? quad(a, b, c, d) : quad(a, d, c, b); }
    if (j < ny - 1 && s0 !== (v[q + nx] < 0)) { const a = id[q], b = id[q - 1], c = id[q - 1 - nxy], d = id[q - nxy]; s0 ? quad(a, b, c, d) : quad(a, d, c, b); }
    if (k < nz - 1 && s0 !== (v[q + nxy] < 0)) { const a = id[q], b = id[q - nx], c = id[q - nx - 1], d = id[q - 1]; s0 ? quad(a, b, c, d) : quad(a, d, c, b); }
  }
  // sens des triangles : d'accord avec les normales du champ
  for (let t = 0; t < I.length; t += 3) { const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    const nx_ = uy * vz - uz * vy, ny_ = uz * vx - ux * vz, nz_ = ux * vy - uy * vx;
    if (nx_ * (N[a] + N[b] + N[c]) + ny_ * (N[a + 1] + N[b + 1] + N[c + 1]) + nz_ * (N[a + 2] + N[b + 2] + N[c + 2]) < 0) { const s = I[t + 1]; I[t + 1] = I[t + 2]; I[t + 2] = s; } }
  // on retire les sommets inutilisés
  const used = new Int32Array(P.length / 3).fill(-1), P2 = [], N2 = []; let m = 0;
  for (let t = 0; t < I.length; t++) { const a = I[t]; if (used[a] < 0) { used[a] = m++; P2.push(P[a * 3], P[a * 3 + 1], P[a * 3 + 2]); N2.push(N[a * 3], N[a * 3 + 1], N[a * 3 + 2]); } I[t] = used[a]; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(P2, 3)); geo.setAttribute("normal", new THREE.Float32BufferAttribute(N2, 3));
  geo.setIndex(m > 65535 ? new THREE.Uint32BufferAttribute(I, 1) : new THREE.Uint16BufferAttribute(I, 1)); return geo;
}

// ---------------- Oreilles ----------------
// Une oreille d'enfant dans son repère (u vers l'arrière, v vers le haut, w vers l'extérieur ; origine = conduit),
// en grille polaire autour de la conque : face externe (hélix roulé, scapha, anthélix, conque, tragus, lobe), bord arrondi,
// face interne qui rentre dans la tête devant. Contour (u, v) dessiné pour 9,2 cm de modèle, puis mis à l'échelle.
const CONTOUR = [[.006, .016], [.005, .034], [.013, .045], [.025, .047], [.037, .039], [.044, .022], [.043, .002], [.039, -.016], [.033, -.029], [.026, -.040], [.017, -.045], [.009, -.039],
  [.006, -.028], [.003, -.018], [-.003, -.009], [-.004, .004]];
const sst = (a, b, x) => { const t = mx(0, mn(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const bosse = (x, c, l) => { const t = (x - c) / l; return t * t < 1 ? (1 - t * t) ** 2 : 0; };
function grilleOreille(L, N, nL, nM) {
  const s = L / .092, cu = .019, cv = .002, pts = [];
  // contour lissé (Catmull-Rom fermé), N points
  const cr = new THREE.CatmullRomCurve3(CONTOUR.map(([u, v]) => new THREE.Vector3(u, v, 0)), true, "centripetal");
  for (let i = 0; i < N; i++) pts.push(cr.getPointAt(i / N));
  const P = [], UV = [], cols = N + 1, lignes = [];
  // poids des reliefs selon l'endroit du contour (angle autour du centre)
  for (let i = 0; i <= N; i++) {
    const o = pts[i % N], ou = o.x - cu, ov = o.y - cv, ang = Math.atan2(ov, ou); // 0 = arrière, π/2 = haut
    const hel = sst(-1.15, -.55, ang) * sst(2.75, 2.2, ang), anth = sst(-.9, -.4, ang) * sst(2.1, 1.5, ang), lobe = sst(-.9, -1.5, ang) * sst(-2.6, -2.1, ang) + (ang < -2.6 ? 1 : 0) * sst(-3.0, -2.6, ang) * 0;
    const col = [];
    // face externe : du centre (conque) au bord
    for (let j = 0; j <= nL; j++) { const r = j / nL, u = cu + ou * r, v = cv + ov * r;
      const conque = sst(.62, .15, Math.hypot((u - .012) / .014, (v + .004) / .019)), tragus = bosse(Math.hypot((u + .001) / .005, (v + .009) / .007), 0, 1);
      let w = .34 * mx(0, u) + .003 + .0058 * hel * bosse(r, .93, .1) - .0035 * hel * bosse(r, .79, .07) + .005 * anth * bosse(r, .6, .13) + .0035 * tragus + .002 * lobe * (1 - r);
      w = w - (w - .0035) * conque * .95; // la conque descend jusqu'à la tête
      col.push([u, v, w]); }
    // bord arrondi puis face interne (épaisseur ≈ 4 mm, plus au lobe) qui rentre dans la tête vers l'avant
    const ep = .0046 + .002 * lobe + .002 * hel, last = col[nL], nu = ou / Math.hypot(ou, ov), nv = ov / Math.hypot(ou, ov);
    for (const [k, dw] of [[.55, .2], [.75, .5], [.55, .8]]) col.push([last[0] + nu * ep * k * .6, last[1] + nv * ep * k * .6, last[2] - ep * dw]);
    for (let j = 0; j <= nM; j++) { const r = 1 - j / nM * .85, u = cu + ou * r, v = cv + ov * r; col.push([u, v, .34 * mx(0, u) * (.55 + .45 * r) + .002 - ep - .012 * (1 - r)]); }
    lignes.push(col);
  }
  const rows = lignes[0].length;
  for (let j = 0; j < rows; j++) for (let i = 0; i <= N; i++) { const [u, v, w] = lignes[i][j]; P.push(u * s, v * s, w * s); UV.push(i / N, j / (rows - 1)); }
  const I = []; for (let j = 0; j < rows - 1; j++) for (let i = 0; i < N; i++) { const a = j * cols + i, b = a + 1, c = a + cols, d = c + 1; I.push(a, c, b, b, c, d); }
  return { P, UV, I };
}
const OREILLES = new Map();
// oreilles(type, qualite) : les deux oreilles (repère de la tête), BufferGeometry position/normal/uv, partagée
export function oreilles(type, qualite = "plein") {
  const key = type + qualite; if (OREILLES.has(key)) return OREILLES.get(key);
  const P = PT[type] || ENFANT, L = P === ENFANT ? .092 : .086, O = P.oreille, leger = qualite === "leger";
  const x0 = .2 - rayon((x, y, z) => champ(x, y, z, P, true), .2, O[1], O[2], -1, 0, 0, 0, .2, .001) - .002; // côté de la tête au conduit
  const { P: E, UV, I } = grilleOreille(L, leger ? 14 : 30, leger ? 3 : 9, leger ? 2 : 5);
  // placement : racine sur le côté de la tête, oreille inclinée en arrière (≈ 15°) et écartée
  const inc = .26, ci = Math.cos(inc), si = Math.sin(inc), n = E.length / 3, pos = new Float32Array(n * 6), uv = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { const u = E[i * 3], v = E[i * 3 + 1], w = E[i * 3 + 2], u0 = u * ci + v * si, v0 = -u * si + v * ci;
    const x = -(x0 + w), y = O[1] + v0, z = O[2] - u0; pos.set([x, y, z], i * 3); pos.set([-x, y, z], (n + i) * 3);
    uv[i * 2] = uv[(n + i) * 2] = UV[i * 2]; uv[i * 2 + 1] = uv[(n + i) * 2 + 1] = UV[i * 2 + 1]; }
  const nI = I.length, idx = new Uint16Array(nI * 2);
  for (let t = 0; t < nI; t += 3) { idx[t] = I[t]; idx[t + 1] = I[t + 1]; idx[t + 2] = I[t + 2]; idx[nI + t] = I[t] + n; idx[nI + t + 1] = I[t + 2] + n; idx[nI + t + 2] = I[t + 1] + n; }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeVertexNormals();
  // sens : la face externe doit regarder vers l'extérieur (x < 0 pour l'oreille droite)
  const nm = g.attributes.normal; let sx = 0; for (let i = 0; i < n; i++) sx += nm.getX(i);
  if (sx > 0) { for (let t = 0; t < idx.length; t += 3) { const q = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = q; } g.computeVertexNormals(); }
  g.userData.partage = true; OREILLES.set(key, g); return g;
}
