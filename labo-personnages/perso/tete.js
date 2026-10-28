// tete.js — la tête façon Mii : UN œuf doux et lisse (le plus large aux pommettes, menton à peine plus étroit), sans
// joues, ni nez, ni lèvres, ni orbites modelés. Le visage (yeux, sourcils, nez, bouche, joues roses) est DESSINÉ par
// visage.js sur cette surface : les personnages se reconnaissent à leurs dessins. Simple = peu de calcul, peu de triangles.
// Tailles (≈ +10 % du réel) : enfant 0,36 (menton → sommet) × 0,30 de large × 0,33 de profondeur ; adultes 0,32 de haut.
import * as THREE from "three";

const sq = Math.sqrt, ab = Math.abs, mx = Math.max, mn = Math.min;
// union douce (polynôme), k = largeur du raccord
export const smin = (a, b, k) => { const h = k - ab(a - b); return h > 0 ? mn(a, b) - h * h * .25 / k : mn(a, b); };
// ellipsoïde e = [cx, cy, cz, 1/a, 1/b, 1/c] — distance approchée (borne d'I. Quilez), rapide
export function ell(x, y, z, e) {
  const ia = e[3], ib = e[4], ic = e[5], X = (x - e[0]) * ia, Y = (y - e[1]) * ib, Z = (z - e[2]) * ic, k0 = sq(X * X + Y * Y + Z * Z);
  const k1 = sq(X * X * ia * ia + Y * Y * ib * ib + Z * Z * ic * ic); return k1 < 1e-9 ? -1 / mx(ia, ib, ic) : k0 * (k0 - 1) / k1;
}
// capsule à rayon variable c = [ax, ay, az, bx, by, bz, ra, rb]
export function cap(x, y, z, c) {
  const bx = c[3] - c[0], by = c[4] - c[1], bz = c[5] - c[2], px = x - c[0], py = y - c[1], pz = z - c[2];
  const t = mx(0, mn(1, (px * bx + py * by + pz * bz) / (bx * bx + by * by + bz * bz))), dx = px - bx * t, dy = py - by * t, dz = pz - bz * t;
  return sq(dx * dx + dy * dy + dz * dz) - (c[6] + (c[7] - c[6]) * t);
}

// Mesures par type. oeuf = [cy, cz, a, bHaut, bBas, cAvant, cArriere] : la tête est UN œuf doux (demi-largeur a, demi-hauteurs,
// profondeur devant / derrière), le plus large au niveau des pommettes, rétréci doucement sous yJ jusqu'au menton
// (tx : largeur, tz : profondeur). crane = repère des cheveux (centre et rayons, inchangé pour cheveux.js).
// Visage dessiné : oeil [x, y, W] (W = demi-largeur), sourcil y, nez [0, y], bouche [y, demi-largeur], rose [x, y, rayon],
// oreille [y, z, demi-hauteur, demi-largeur, écart] ; haut / bas : sommet / menton (y) ; front : naissance des cheveux.
const ENFANT = {
  oeuf: [.125, -.008, .15, .195, .165, .152, .17], yJ: .07, tx: .16, tz: .08,
  crane: [0, .165, -.012, .150, .155, .156],
  cou: [0, -.17, -.030, 0, .02, -.034, .062, .060], kCou: .028,
  oeil: [.054, .118, .03], sourcil: .162, nez: [0, .078], bouche: [.036, .0115], rose: [.084, .082, .022],
  oreille: [.11, -.012, .034, .022, .012], haut: .32, bas: -.04, front: .245,
};
// Adultes : tête plus petite par rapport au corps, visage un peu plus long ; la grand-mère : visage rond et doux
const FEMME = {
  oeuf: [.12, -.014, .13, .17, .15, .138, .15], yJ: .065, tx: .15, tz: .08,
  crane: [0, .150, -.018, .122, .140, .138],
  cou: [0, -.17, -.036, 0, -.012, -.044, .052, .050], kCou: .032,
  oeil: [.046, .112, .026], sourcil: .148, nez: [0, .074], bouche: [.03, .0115], rose: [.072, .074, .019],
  oreille: [.1, -.018, .031, .019, .011], haut: .29, bas: -.03, front: .222,
};
const HOMME = {
  oeuf: [.11, -.016, .134, .175, .145, .142, .155], yJ: .055, tx: .1, tz: .06,
  crane: [0, .145, -.020, .127, .140, .142],
  cou: [0, -.17, -.036, 0, .01, -.038, .058, .056], kCou: .032,
  oeil: [.048, .108, .027], sourcil: .144, nez: [0, .07], bouche: [.027, .0125], rose: [.075, .07, .019],
  oreille: [.098, -.02, .033, .02, .012], haut: .285, bas: -.035, front: .212,
};
const PT = { garcon: ENFANT, fille: ENFANT, femme: FEMME, homme: HOMME };

// Le champ d'un type : l'œuf (rayons qui dépendent de y et du côté avant / arrière) + le cou en capsule douce
function fabrique(P) {
  const [cy, cz, a, bh, bb, cf, cb] = P.oeuf, yJ = P.yJ, tx = P.tx, tz = P.tz, lJ = yJ - P.bas, Co = Float64Array.from(P.cou), kC = P.kCou, E = new Float64Array(6);
  E[1] = cy; E[2] = cz;
  return (x, y, z) => {
    const u = y < yJ ? mn(1.2, (yJ - y) / lJ) : 0, u2 = u * u; // sous les pommettes : rétréci en douceur (C¹)
    E[3] = 1 / (a * (1 - tx * u2)); E[4] = 1 / (y > cy ? bh : bb); E[5] = 1 / ((z > cz ? cf : cb) * (1 - tz * u2));
    let d = ell(x, y, z, E);
    if (y < cy) d = smin(d, cap(x, y, z, Co), kC);
    return d;
  };
}
for (const P of new Set(Object.values(PT))) P.F = fabrique(P);
const FG = ENFANT.F, FF = FEMME.F, FH = HOMME.F, Fde = type => type === "femme" ? FF : type === "homme" ? FH : FG;
export const sdfTete = (x, y, z, type) => Fde(type)(x, y, z);
// anciens noms (la tête n'a ni paupières ni détails cachés : c'est le même champ)
export const sdfTeteFermee = sdfTete, sdfTeteLegere = sdfTete;
export const mesuresTete = type => PT[type] || ENFANT;

// gradient (différences centrées), dans v (Vector3) ; f = (x, y, z) => distance
export function gradient(f, x, y, z, v = new THREE.Vector3(), e = .0006) {
  return v.set(f(x + e, y, z) - f(x - e, y, z), f(x, y + e, z) - f(x, y - e, z), f(x, y, z + e) - f(x, y, z - e)).normalize();
}
// premier point de la surface le long d'un rayon (o + s·d, s dans [s0, s1]) : pas adaptatif puis dichotomie ; null si rien
export function rayon(f, ox, oy, oz, dx, dy, dz, s0 = 0, s1 = .3, pas = .002) {
  let a = s0, fa = f(ox + dx * a, oy + dy * a, oz + dz * a); const neg = fa < 0, pmin = pas * .25;
  while (a < s1) {
    const s = mn(s1, a + mx(pmin, mn(pas * 8, ab(fa) * .7))), fs = f(ox + dx * s, oy + dy * s, oz + dz * s);
    if ((fs < 0) !== neg) { let b = s; for (let i = 0; i < 12; i++) { const m = (a + b) * .5, fm = f(ox + dx * m, oy + dy * m, oz + dz * m); if ((fm < 0) === neg) a = m; else b = m; } return (a + b) * .5; }
    a = s; fa = fs;
  }
  return null;
}
// point de la peau vu de face en (x, y) : z, ou null
export const devant = (type, x, y) => { const s = rayon(Fde(type), x, y, .3, 0, 0, -1, 0, .3, .002); return s === null ? null : .3 - s; };

// Repères de la tête (repère local de l'os « tete »), mis en cache par type
const REP = new Map();
export function reperesTete(type) {
  if (REP.has(type)) return REP.get(type);
  const P = PT[type] || ENFANT, f = Fde(type), V = (x, y, z) => new THREE.Vector3(x, y, z), E = P.oeil, O = P.oreille;
  const avant = (x, y) => V(x, y, devant(type, x, y) ?? 0);
  const cote = (y, z) => { const s = rayon(f, .25, y, z, -1, 0, 0, 0, .25, .002); return s === null ? 0 : .25 - s; };
  const ze = devant(type, E[0], E[1]), r = E[2] * .75; // œil peint : « globe » virtuel de rayon r posé sous la peau (lunettes, masque)
  const nez = avant(0, P.nez[1]), cy = (P.haut + P.bas) / 2;
  const rp = {
    yeux: [-1, 1].map(s => ({ centre: V(s * E[0], E[1], ze - r), rayon: r, paupiere: 0 })),
    nez: V(0, P.nez[1], nez.z), bouche: avant(0, P.bouche[0]), menton: avant(0, P.bas + .02), haut: V(0, P.haut, P.crane[2]),
    centre: V(0, cy, P.crane[2] + .012), demiLargeur: cote(P.crane[1], P.crane[2]),
    oreilles: [-1, 1].map(s => V(s * cote(O[0], O[1]), O[0], O[1])), front: P.front,
    // en plus : pour les lunettes, les sourcils, les cheveux, le masque de natation
    nasion: avant(0, E[1] + .006), sourcils: [-1, 1].map(s => avant(s * E[0], E[1] + E[2] * 1.4)), tempes: [-1, 1].map(s => V(s * cote(E[1] + .01, -.005), E[1] + .01, -.005)),
    yeuxPeau: [-1, 1].map(s => V(s * E[0], E[1], ze)), oeilL: E[2], oeilH: E[2] * .74, bas: P.bas,
  };
  REP.set(type, rp); return rp;
}

// Maillage d'un champ (« surface nets ») dans la boîte [x0,x1]×[y0,y1]×[z0,z1], pas h (essais du labo).
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
  const N = new Float32Array(P.length), g = new THREE.Vector3();
  for (let p = 0; p < P.length; p += 3) { for (let it = 0; it < 2; it++) { const d = f(P[p], P[p + 1], P[p + 2]); gradient(f, P[p], P[p + 1], P[p + 2], g, h * .25); P[p] -= g.x * d; P[p + 1] -= g.y * d; P[p + 2] -= g.z * d; }
    gradient(f, P[p], P[p + 1], P[p + 2], g, h * .3); N[p] = g.x; N[p + 1] = g.y; N[p + 2] = g.z; }
  const I = [], quad = (a, b, c, d) => { if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (garder) { const m = (u, o) => (P[u * 3 + o] + P[d * 3 + o]) * .5; if (!garder(m(a, 0), m(a, 1), m(a, 2))) return; }
    I.push(a, b, c, a, c, d); };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const q = i + j * nx + k * nxy, s0 = v[q] < 0;
    if (s0 !== (v[q + 1] < 0)) { const a = id[q], b = id[q - nxy], c = id[q - nxy - nx], d = id[q - nx]; s0 ? quad(a, b, c, d) : quad(a, d, c, b); }
    if (s0 !== (v[q + nx] < 0)) { const a = id[q], b = id[q - 1], c = id[q - 1 - nxy], d = id[q - nxy]; s0 ? quad(a, b, c, d) : quad(a, d, c, b); }
    if (s0 !== (v[q + nxy] < 0)) { const a = id[q], b = id[q - nx], c = id[q - nx - 1], d = id[q - 1]; s0 ? quad(a, b, c, d) : quad(a, d, c, b); }
  }
  for (let t = 0; t < I.length; t += 3) { const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    if ((uy * vz - uz * vy) * (N[a] + N[b] + N[c]) + (uz * vx - ux * vz) * (N[a + 1] + N[b + 1] + N[c + 1]) + (ux * vy - uy * vx) * (N[a + 2] + N[b + 2] + N[c + 2]) < 0) { const s = I[t + 1]; I[t + 1] = I[t + 2]; I[t + 2] = s; } }
  const used = new Int32Array(P.length / 3).fill(-1), P2 = [], N2 = []; let m = 0;
  for (let t = 0; t < I.length; t++) { const a = I[t]; if (used[a] < 0) { used[a] = m++; P2.push(P[a * 3], P[a * 3 + 1], P[a * 3 + 2]); N2.push(N[a * 3], N[a * 3 + 1], N[a * 3 + 2]); } I[t] = used[a]; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(P2, 3)); geo.setAttribute("normal", new THREE.Float32BufferAttribute(N2, 3));
  geo.setIndex(m > 65535 ? new THREE.Uint32BufferAttribute(I, 1) : new THREE.Uint16BufferAttribute(I, 1)); return geo;
}

// ---------------- Oreilles ----------------
// Une oreille de figurine : une coquille douce en forme de « D » (bord roulé, creux léger au milieu), posée sur le côté de
// la tête, plus décollée derrière que devant ; sa racine rentre dans la tête (pas de raccord visible).
// Repère de l'oreille : a vers l'arrière, b vers le haut, c vers l'extérieur ; anneaux du creux au bord puis au dos.
const OREILLES = new Map();
export function oreilles(type, qualite = "plein") {
  const key = type + qualite; if (OREILLES.has(key)) return OREILLES.get(key);
  const P = PT[type] || ENFANT, f = Fde(type), [oy, oz, Hh, Wd, ec] = P.oreille, leger = qualite === "leger", N = leger ? 7 : 12;
  // anneaux : [échelle du contour, sortie (× profil), décalage vers l'intérieur]
  const AN = leger ? [[.45, .55, 0], [1, 1, .001], [.7, .2, .012]] : [[.5, .62, 0], [.84, .95, 0], [1, .92, .003], [.92, .5, .007], [.66, 0, .014]];
  const pos = [], idx = [], g = new THREE.Vector3(), cotes = [];
  for (const s of [-1, 1]) {
    // racine : la peau sur le côté, à la hauteur de l'oreille ; normale de la peau = « dehors », inclinée vers l'arrière
    const r = rayon(f, s * .25, oy, oz, -s, 0, 0, 0, .25, .001), x0 = s * (.25 - (r ?? .1)); gradient(f, x0, oy, oz, g);
    const C = new THREE.Vector3(x0, oy, oz), out = g.clone(), up = new THREE.Vector3(0, 1, 0).applyAxisAngle(new THREE.Vector3(s, 0, 0), -.26 * s);
    up.addScaledVector(out, -up.dot(out)).normalize(); const back = new THREE.Vector3().crossVectors(up, out).multiplyScalar(s); // vers −z
    if (back.z > 0) back.negate();
    const o = pos.length / 3, pt = (a, b, c) => pos.push(C.x + back.x * a + up.x * b + out.x * c, C.y + back.y * a + up.y * b + out.y * c, C.z + back.z * a + up.z * b + out.z * c);
    const prof = a => .004 + ec * (a / Wd + 1) / 2; // décollée derrière, collée devant
    pt(.003, .002, prof(0) * .4);
    for (const [k, so, de] of AN) for (let i = 0; i < N; i++) { const t = i / N * 2 * Math.PI, a = Wd * k * Math.cos(t), b = Hh * k * Math.sin(t) * (1 + .1 * Math.cos(t));
      pt(a, b, prof(a) * so - de); }
    for (let i = 0; i < N; i++) idx.push(o, o + 1 + i, o + 1 + (i + 1) % N);
    for (let j = 0; j < AN.length - 1; j++) for (let i = 0; i < N; i++) { const a = o + 1 + j * N + i, b = o + 1 + j * N + (i + 1) % N, c = a + N, d = b + N; idx.push(a, c, b, b, c, d); }
    cotes.push([o, pos.length / 3, s]);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx);
  // sens : la face externe regarde dehors (x < 0 pour l'oreille droite) ; on corrige chaque oreille d'après sa normale moyenne
  geo.computeVertexNormals(); const nm = geo.attributes.normal, I = geo.index.array;
  for (const [a, b, s] of cotes) { let sx = 0; for (let i = a; i < b; i++) sx += nm.getX(i);
    if (sx * s < 0) for (let t = 0; t < I.length; t += 3) if (I[t] >= a && I[t] < b) { const q = I[t + 1]; I[t + 1] = I[t + 2]; I[t + 2] = q; } }
  geo.computeVertexNormals();
  const uv = new Float32Array(pos.length / 3 * 2); for (let i = 0; i < pos.length / 3; i++) { uv[i * 2] = pos[i * 3 + 2]; uv[i * 2 + 1] = pos[i * 3 + 1]; }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); geo.userData.partage = true; OREILLES.set(key, geo); return geo;
}
