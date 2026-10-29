// anim.js — l'animation des personnages sur le squelette commun (squelette.js), pour tous les modes du jeu.
// Marche / course : chaque pied suit une trajectoire posée au sol (attaque du talon, pied à plat, déroulé, poussée sur
// l'avant du pied, puis vol de la jambe), les jambes sont calculées par IK à deux os (hanche–genou–cheville) ; le bassin
// monte et descend deux fois par cycle, se balance, tourne et s'incline ; le buste contre-tourne ; les bras balancent à
// l'opposé des jambes avec du retard au coude ; la tête reste stable. Avec v (m/s), la cadence vient de la vitesse
// (les pieds ne glissent pas) ; t n'a alors qu'à avancer. Repos : appui d'une jambe sur l'autre, respiration, regards.
// Véhicules : pieds sur les pédales (angle de manivelle t), mains au guidon, au volant, aux rênes, aux poignées (IK des
// bras). Fondu entre les modes (état dans g.userData.anim ; g.userData.sansTransition = pas de fondu).
// Aucune allocation par image : tout passe par des objets de travail du module.
import * as THREE from "three";
import { TYPES, NOMS_OS, INDEX_OS, PARENT_OS, HANCHES_ANCIEN, articulation } from "./squelette.js";

const NB = NOMS_OS.length, PAR = NOMS_OS.map(n => n === "corps" ? -1 : INDEX_OS[PARENT_OS[n]]), I = INDEX_OS;
const COTE = n => [I[n + "_d"], I[n + "_g"]];
const CLAV = COTE("clavicule"), BRAS = COTE("bras"), AVB = COTE("avantbras"), MAIN = COTE("main"), DOIGTS = COTE("doigts"),
  CUISSE = COTE("cuisse"), JAMBE = COTE("jambe"), PIED = COTE("pied"), ORTEILS = COTE("orteils");
const CORPS = I.corps, BASSIN = I.bassin, COLONNE = I.colonne, POITRINE = I.poitrine, COU = I.cou, TETE = I.tete;
const PI = Math.PI, TAU = PI * 2, G = 9.81;
const mix = (a, b, t) => a + (b - a) * t, cl = (x, a, b) => x < a ? a : x > b ? b : x, fract = x => x - Math.floor(x);
const lisse = (a, b, x) => { const t = cl((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const bosse = x => x <= 0 || x >= 1 ? 0 : Math.sin(PI * x);
function hache(a, b) { let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x27d4eb2f, 0xc2b2ae35); h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; return (h >>> 0) / 4294967296; }
// bruit lisse (pour les petits mouvements de repos) : somme de deux sinus incommensurables
const ondule = (t, a) => Math.sin(t * 1.13 + a * 6.1) * .6 + Math.sin(t * .47 + a * 3.7) * .4;

// ---- objets de travail
const V3 = () => new THREE.Vector3(), QT = () => new THREE.Quaternion();
const LQ = Array.from({ length: NB }, QT), WQ = Array.from({ length: NB }, QT), WP = Array.from({ length: NB }, V3);
const RAC = V3(); let TANG = 0, D = null;
const _e = new THREE.Euler(), _m = new THREE.Matrix4(), _q1 = QT(), _q2 = QT(), _q3 = QT(), _q4 = QT();
const _a = V3(), _b = V3(), _c = V3(), _d = V3(), _p = V3(), _x = V3(), _y = V3(), _z = V3(), _t = V3(), _w = V3(); // réservés aux outils
const cC = V3(), cW = V3(), cU = V3(), cO = V3(), cT = V3(); // réservés aux modes
const AXE_X = new THREE.Vector3(1, 0, 0), AXE_Y = new THREE.Vector3(0, 1, 0);
const CIB = [V3(), V3()], QPI = [QT(), QT()], APP = [false, false], ORT = [0, 0], CH = [0, 0], VOL = [0, 0], FIN = [0, 0], POLE = [V3(), V3()];

// ---- données constantes par type de corps
const DT = new Map();
function donnees(type) {
  let d = DT.get(type); if (d) return d;
  const T = TYPES[type] || TYPES.garcon, J = n => new THREE.Vector3().fromArray(articulation(TYPES[type] ? type : "garcon", n));
  const base = dir => { const Y = dir.clone().negate(), X = AXE_X.clone().addScaledVector(Y, -AXE_X.dot(Y)).normalize(), Z = new THREE.Vector3().crossVectors(X, Y);
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z)).invert(); };
  d = { type, enfant: T.age === "enfant", femme: T.sexe === "f", OFF: NOMS_OS.map(n => n === "corps" ? new THREE.Vector3() : J(n).sub(J(PARENT_OS[n]))),
    hipH: T.J.bassin[1], hipX: Math.abs(T.J.cuisse[0]), ay: T.J.pied[1], qJ0: [], s0: [], qB0: [], f0: [], qM0: [], epaule: J("bras_g").sub(J("bassin")) };
  ["_d", "_g"].forEach((c, k) => {
    const H = J("cuisse" + c), K = J("jambe" + c), A = J("pied" + c), S = J("bras" + c), E = J("avantbras" + c), W = J("main" + c), M = J("doigts" + c);
    d.L1 = H.distanceTo(K); d.L2 = K.distanceTo(A); d.A1 = S.distanceTo(E); d.A2 = E.distanceTo(W); d.Lm = W.distanceTo(M);
    d.qJ0[k] = base(K.clone().sub(H).normalize()); d.s0[k] = A.clone().sub(K).normalize();
    d.qB0[k] = base(E.clone().sub(S).normalize()); d.f0[k] = W.clone().sub(E).normalize();
    const F = M.clone().sub(W).normalize(), Y = F.clone().negate(), X = new THREE.Vector3(k ? -1 : 1, 0, 0); X.addScaledVector(Y, -X.dot(Y)).normalize();
    d.qM0[k] = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, new THREE.Vector3().crossVectors(X, Y))).invert();
    if (k) { const lp = J("orteils" + c).z - A.z; d.balle = new THREE.Vector3(0, -A.y, lp); d.talon = new THREE.Vector3(0, -A.y, -.3 * lp); }
  });
  DT.set(type, d); return d;
}

// ---- petits outils de pose (repère du personnage, unités du modèle)
const rot = (i, x, y, z) => LQ[i].setFromEuler(_e.set(x, y, z, "XYZ"));
const rotYXZ = (i, x, y, z) => LQ[i].setFromEuler(_e.set(x, y, z, "YXZ"));
// valeurs du côté gauche (z > 0 : vers l'extérieur) ; le côté droit est le miroir (y et z changent de signe)
const rotP = (i, k, x, y, z) => { const s = k ? 1 : -1; LQ[i].setFromEuler(_e.set(x, s * y, s * z, "XYZ")); };
function fk(i) { const p = PAR[i]; if (p < 0) { WQ[i].copy(LQ[i]); WP[i].copy(RAC); return; } WQ[i].multiplyQuaternions(WQ[p], LQ[i]); WP[i].copy(D.OFF[i]).applyQuaternion(WQ[p]).add(WP[p]); }
const fkTronc = () => { fk(CORPS); fk(BASSIN); fk(COLONNE); fk(POITRINE); fk(COU); };
// orientation voulue (repère du personnage) d'un os dont le parent est calculé
function orienter(i, q) { _q4.copy(WQ[PAR[i]]).invert(); LQ[i].multiplyQuaternions(_q4, q); WQ[i].copy(q); }

// IK à deux os : i1 (cuisse / bras) et i2 (jambe / avant-bras) visent le point (tx, ty, tz) ; pole : où pointe le genou / le coude
function ik2(i1, i2, L1, L2, q0i, s0, tx, ty, tz, pole, bras) {
  fk(i1); const P = WP[i1];
  _d.set(tx - P.x, ty - P.y, tz - P.z); let d = _d.length();
  if (d < 1e-6) _d.set(0, -1, 0); else _d.multiplyScalar(1 / d);
  const Lm = (L1 + L2) * .9995, Ld = (L1 + L2) * .985;  // IK douce : au-delà de Ld, la distance est amortie
  if (d > Ld) d = Ld + (Lm - Ld) * (1 - Math.exp(-(d - Ld) / (Lm - Ld)));
  d = Math.max(d, Math.abs(L1 - L2) + 1e-4);
  _p.copy(pole).addScaledVector(_d, -pole.dot(_d)); if (_p.lengthSq() < 1e-8) _p.set(0, 0, 1).addScaledVector(_d, -_d.z); _p.normalize();
  const ca = cl((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1), sa = Math.sqrt(1 - ca * ca);
  _a.copy(_d).multiplyScalar(ca).addScaledVector(_p, sa);                 // direction du premier os
  _b.copy(P).addScaledVector(_a, L1);                                     // genou / coude
  _c.copy(P).addScaledVector(_d, d).sub(_b).normalize();                  // direction du second os
  if (bras) _x.crossVectors(_d, _p); else _x.crossVectors(_p, _d); _x.normalize();
  _y.copy(_a).negate(); _z.crossVectors(_x, _y);
  _m.makeBasis(_x, _y, _z); _q1.setFromRotationMatrix(_m).multiply(q0i);
  orienter(i1, _q1);
  _q2.copy(_q1).invert(); _c.applyQuaternion(_q2);
  const th = Math.atan2(-_c.z, -_c.y) - Math.atan2(-s0.z, -s0.y);
  LQ[i2].setFromAxisAngle(AXE_X, th); WQ[i2].multiplyQuaternions(WQ[i1], LQ[i2]); WP[i2].copy(_b);
  return th;
}
// jambe k : cheville en (x, y, z), pied orienté par q (repère du personnage)
function jambe(k, x, y, z, q, pole) {
  ik2(CUISSE[k], JAMBE[k], D.L1, D.L2, D.qJ0[k], D.s0[k], x, y, z, pole, false);
  fk(PIED[k]); orienter(PIED[k], q);
}
// bras k : poignet en (x, y, z), coude vers pole
function brasIK(k, x, y, z, pole) { fk(CLAV[k]); ik2(BRAS[k], AVB[k], D.A1, D.A2, D.qB0[k], D.f0[k], x, y, z, pole, true); }
// main k : doigts vers f, paume vers n ; une part (part) de la torsion du poignet passe dans l'avant-bras
function mainVers(k, fx, fy, fz, nx, ny, nz, part = .6) {
  _y.set(-fx, -fy, -fz).normalize(); _x.set(nx, ny, nz).addScaledVector(_y, -_x.dot(_y)).normalize(); _z.crossVectors(_x, _y);
  _m.makeBasis(_x, _y, _z); _q3.setFromRotationMatrix(_m).multiply(D.qM0[k]);
  const ia = AVB[k], f0 = D.f0[k]; _q2.copy(WQ[ia]).invert().multiply(_q3);
  let tw = 2 * Math.atan2(_q2.x * f0.x + _q2.y * f0.y + _q2.z * f0.z, _q2.w); if (tw > PI) tw -= TAU; if (tw < -PI) tw += TAU;
  _q2.setFromAxisAngle(f0, cl(tw * part, -1.5, 1.5)); LQ[ia].multiply(_q2); WQ[ia].multiply(_q2);
  fk(MAIN[k]); orienter(MAIN[k], _q3);
}
// la tête regarde (lacet, tangage, roulis) dans le repère du personnage ; k = part de stabilisation (0 : suit le buste)
function teteVers(lacet, tangage, roulis, k, partCou = .4) {
  _q1.setFromEuler(_e.set(tangage, lacet, roulis, "YXZ")); _q2.copy(WQ[POITRINE]).slerp(_q1, k);
  _q3.copy(WQ[POITRINE]).invert().multiply(_q2);
  LQ[COU].identity().slerp(_q3, partCou); _q2.copy(LQ[COU]).invert(); LQ[TETE].multiplyQuaternions(_q2, _q3);
}
// pied posé : position de la cheville quand le pied tourne de « tangage » autour du talon (< 0) ou de l'avant du pied (> 0)
// F = cheville quand le pied est à plat ; lacet = pointe du pied vers l'extérieur
function piedRoule(F, tangage, lacet, sortie) {
  const v = tangage < 0 ? D.talon : D.balle, c = Math.cos(tangage), s = Math.sin(tangage);
  const ry = v.y - (v.y * c - v.z * s), rz = v.z - (v.y * s + v.z * c);
  sortie.set(F.x + rz * Math.sin(lacet), F.y + ry, F.z + rz * Math.cos(lacet));
  return sortie;
}
const qPied = (q, tangage, lacet, roulis = 0) => q.setFromEuler(_e.set(tangage, lacet, roulis, "YXZ"));

// ---- cadence naturelle : longueur du pas d'après la vitesse réduite (nombre de Froude), pour toutes les tailles
// pas ≈ 1,3 · L · (v / √(gL))^0,6 (L = hauteur des hanches, m) ; un cycle = deux pas
export function cadence(v, L) { v = Math.max(.05, v); const pas = L * 1.3 * Math.pow(v / Math.sqrt(G * L), .6); return PI * Math.min(5.4, v / pas); }
const vitesseDe = (om, L) => Math.pow(1.3 * (om / PI) * Math.pow(L, .7) * Math.pow(G, -.3), 2.5);

// ---- marche, course, sprint (φ = phase : 0 = le talon droit touche le sol)
function marche(A, ph, v, s, hor, porter) {
  const r = A.r, en = D.enfant ? 1 : 0, Lw = D.hipH * s, vh = v / Math.sqrt(G * Lw), kr = lisse(.5, .8, vh), ks = lisse(1.7, 3.1, vh);
  const om = cadence(v, Lw), beta = mix(.61, .37, kr) - .11 * ks, Lmax = D.L1 + D.L2, ent = 1 + .35 * en * (1 - ks);  // ent : les enfants rebondissent plus
  const Ls = Math.min((v / s) * beta * TAU / om, Lmax * mix(1.3, 1.15, kr));   // course du pied posé (unités du modèle), bornée par la jambe
  const pm = PI * beta, cM = Math.cos(ph - pm), c2 = Math.cos(2 * (ph - pm));
  // bassin : balancement vers le pied d'appui, rotation avec la jambe qui avance, la hanche libre descend
  const lacetB = mix(.07, .11, kr) * (1 + .1 * en) * Math.cos(ph - .15), roulisB = -mix(.05, .03, kr) * ent * cM;
  const tangB = mix(.03, .1, kr) + .04 * ks + mix(.012, .02, kr) * c2;
  RAC.set(-mix(.026, .01, kr) * ent * cM, 0, 0); rotYXZ(BASSIN, tangB, lacetB, roulisB); fk(CORPS); fk(BASSIN);
  // les pieds
  const hs = mix(-.27, -.06, kr) + .2 * ks, to = mix(1.0, 1.05, kr), ho = mix(.55, .42, kr), zc = -.02 - Ls * mix(.09, .16, kr);
  const H = mix(.17, .34, kr) + .26 * ks + .03 * en, gam = mix(.3, .36, kr), mt = -Ls * (1 - beta) / beta * mix(.7, .4, kr);
  for (let k = 0; k < 2; k++) {
    const sx = k ? 1 : -1, p = fract(ph / TAU + k * .5), lac = sx * (mix(.09 - .02 * en, .03, kr) + .04 * (r[2 + k] - .5));
    let Fz, tg, lev = 0, orteil = 0;
    if (p < beta) { const u = p / beta; Fz = zc + Ls * (.5 - u); APP[k] = kr > .5 || u < .62 || fract(p + .5) >= beta; CH[k] = bosse(cl(u / .4, 0, 1)); FIN[k] = kr * lisse(.55, .9, u);
      tg = u < .2 ? mix(hs, 0, lisse(0, .2, u)) : u < ho ? 0 : to * Math.pow(cl((u - ho) / (1 - ho), 0, 1), 1.15);
      if (hs > 0 && u < .2) tg = hs * (1 - lisse(0, .25, u));
      orteil = tg > 0 ? -tg : 0; }
    else { const u = (p - beta) / (1 - beta), u2 = u * u, u3 = u2 * u; APP[k] = false; CH[k] = 0; FIN[k] = 0;
      Fz = (2 * u3 - 3 * u2 + 1) * (zc - Ls / 2) + (u3 - 2 * u2 + u) * mt + (-2 * u3 + 3 * u2) * (zc + Ls / 2) + (u3 - u2) * mt;
      tg = u < .45 ? mix(to, -.05, lisse(0, .45, u)) : mix(-.05, hs, lisse(.5, 1, u));
      lev = H * (u < gam ? lisse(0, gam, u) : 1 - lisse(gam, 1, u)); orteil = -to * (1 - lisse(0, .3, u)) + (hs < 0 ? -.12 * lisse(.6, 1, u) : 0); }
    cT.set(sx * (D.hipX + mix(.012, -.03, kr)), D.ay, Fz); piedRoule(cT, tg, lac, CIB[k]); CIB[k].y += lev; VOL[k] = p < beta ? 0 : (p - beta) / (1 - beta);
    qPied(QPI[k], tg, lac); ORT[k] = orteil;
    POLE[k].set(sx * .1 + Math.sin(lac) * .5, .15, 1);
  }
  // hauteur du bassin : la courbe voulue, mais jamais plus haut que ce que les jambes d'appui permettent
  let dy = mix(-.012 + .02 * ent * c2, -D.hipH * .025 - .03 * ks - .045 * ent * c2, kr);
  // (mise en charge : le genou plie un peu après l'attaque ; en courant, la jambe se tend à la poussée ; la jambe qui va
  // se poser fait descendre le bassin à temps, sans saut au contact)
  for (let k = 0; k < 2; k++) { const at = APP[k] ? 1 : lisse(.75, 1, VOL[k]); if (at <= 0) continue;
    const Lr = Lmax * (APP[k] ? .984 - .03 * (1 - kr) * CH[k] * ent + .0145 * FIN[k] : .984);
    fk(CUISSE[k]); const h = WP[CUISSE[k]], dx = h.x - CIB[k].x, dz = h.z - CIB[k].z, q = Lr * Lr - dx * dx - dz * dz;
    if (q > 0) dy = Math.min(dy, mix(dy, CIB[k].y + Math.sqrt(q) - h.y, at)); }
  RAC.y = dy; fkTronc();
  // buste : penché en avant quand on court, contre-rotation des épaules, épaules à peu près de niveau
  const pen = mix(.04, .17, kr) + .14 * ks, cl1 = -lacetB * (1 + mix(.45, .8, kr)), lat = .022 * en * cM;
  const sou = Math.sin(hor * TAU / (en ? 2.4 : 3.4) + r[0] * 6) * .008;
  rotYXZ(COLONNE, (pen - tangB) * .45 - .012 * c2 * kr, cl1 * .45, -roulisB * .55 + lat);
  rotYXZ(POITRINE, (pen - tangB) * .55 - sou, cl1 * .55, -roulisB * .35);
  fkTronc();
  teteVers(0, mix(.03, .13, kr) + .04 * ks, .03 * en * cM * (1 - kr), en ? .72 : .85);  // les enfants : la tête balance un peu
  // jambes
  for (let k = 0; k < 2; k++) {
    // jambe en vol : la cible reste dans une sphère autour de la hanche (le genou ne se tend jamais d'un coup)
    if (VOL[k] > 0) { fk(CUISSE[k]); const h = WP[CUISSE[k]], R = Lmax * (.984 - mix(.06, .1, kr) * Math.pow(bosse(VOL[k]), 2)); cT.subVectors(CIB[k], h); const l = cT.length(); if (l > R) CIB[k].copy(h).addScaledVector(cT, R / l); }
    cU.copy(POLE[k]).normalize(); jambe(k, CIB[k].x, CIB[k].y, CIB[k].z, QPI[k], cU); rot(ORTEILS[k], ORT[k], 0, 0); }
  // bras : balancement opposé aux jambes, retard du coude ; mains souples en marchant, poings légers en courant
  const Aa = (mix(.1 + .12 * Math.min(v, 2.2), .5, kr) + .25 * ks) * (1 + .18 * en) * (.9 + .2 * r[4]), off = mix(.02, -.03, kr) - .08 * ks, lag = mix(.3, .14, kr);
  const eb = mix(.2, 1.22, kr) + .15 * ks, ea = mix(.35, .3, kr), ab = mix(.08, .13, kr) + .03 * en + .03 * (r[5] - .5), ir = mix(.08, .32, kr);
  for (let k = 0; k < 2; k++) {
    const sg = k ? 1 : -1, fw = sg * Math.cos(ph - lag), fe = sg * Math.cos(ph - lag - .45);
    rotP(CLAV[k], k, 0, -mix(.035, .08, kr) * fw, mix(0, .04, kr) + sou * .6);
    if (porter) continue;
    rotP(BRAS[k], k, off - Aa * fw - pen * .35 * (1 - kr), -ir, ab + .04 * kr * Math.max(0, -fw));
    rot(AVB[k], -(eb + ea * (.5 + .5 * fe)), 0, 0);
    rotP(MAIN[k], k, 0, 0, -mix(.14, .05, kr)); rotP(DOIGTS[k], k, 0, 0, -mix(.4, 1.05, kr));
  }
  if (porter) plateau(hor);
}
// porter un plateau devant soi (g.userData.porter) : avant-bras à l'horizontale, paumes vers le haut
function plateau(hor) {
  fkTronc();
  for (let k = 0; k < 2; k++) { const sx = k ? 1 : -1; fk(CLAV[k]);
    cU.set(sx * .5, -.6, -.6); brasIK(k, sx * .19, D.hipH + .22, .36, cU.normalize());
    mainVers(k, sx * -.15, .05, 1, 0, 1, 0, .7); rotP(DOIGTS[k], k, 0, 0, -.25); }
}

// ---- repos debout (et allongé sur un transat)
// regards : une suite de cibles tirées au hasard (par personnage), avec un tour de tête rapide puis on tient
function cibleRegard(sd, k, out) { const h = hache(sd, k), h2 = hache(sd + 17, k), h3 = hache(sd + 41, k);
  if (h < .38) return out.set(.04 * (h2 - .5), .03 * (h3 - .5), 0); return out.set((h2 - .5) * .9, (h3 - .5) * .28 + .03, (hache(sd + 5, k) - .5) * .12); }
function regard(A, hor, out) {
  const sd = A.id, D1 = 2.1 + 1.8 * A.r[6], x = hor / D1 + A.r[7] * 50, k = Math.floor(x), f = x - k;
  cibleRegard(sd, k - 1, _w); cibleRegard(sd, k, out); return out.lerpVectors(_w, out, lisse(0, .2, f));
}
// petites envies de bouger (enfants surtout) : de temps en temps, 2 s de rebonds, de torsion du buste ou de pointes de pieds
function bougeotte(A, hor, out) {
  const en = D.enfant, Pf = en ? 8 + 6 * A.r[7] : 16 + 8 * A.r[7], x = hor + A.r[6] * 37, e = Math.floor(x / Pf), lt = x - e * Pf;
  out.set(0, 0, 0); if (lt > 2 || hache(A.id + 3, e) > (en ? .75 : .25)) return out;
  const env = lisse(0, .35, lt) * (1 - lisse(1.55, 2, lt)), sorte = en ? Math.floor(hache(A.id + 9, e) * 3) : 1;
  return out.set(sorte, env, lt);
}
function repos(A, hor, couche) {
  const r = A.r, en = D.enfant ? 1 : 0;
  // appui : le poids passe d'une jambe à l'autre toutes les quelques secondes (+1 : sur la gauche) ; plus souvent chez les enfants
  const Pw = en ? 5 + 4 * r[1] : 8 + 6 * r[1], w = Math.tanh(2.6 * Math.sin(hor * TAU / Pw + r[2] * 9)) * (en ? .6 + .4 * r[3] : .45 + .35 * r[3]) + .12 * ondule(hor * .7, r[4]);
  const br = Math.sin(hor * TAU / (en ? 2.7 : 3.8) + r[0] * 6), oy = ondule(hor * .3, r[5]);
  if (couche) return allonge(A, hor, br, A.s);
  bougeotte(A, hor, cW); const sorte = cW.x, env = cW.y, lt = cW.z;
  const reb = sorte === 0 ? env * (.5 - .5 * Math.cos(TAU * 2.1 * lt)) : 0, tor = sorte === 1 ? env * Math.sin(TAU * .85 * lt) : 0, pte = sorte === 2 ? env * (.5 - .5 * Math.cos(TAU * 1.2 * lt)) : 0;
  RAC.set(.034 * w * (1 - .5 * env), 0, 0); const roulisB = .05 * w * (1 - .5 * env), lacetB = .05 * oy + .06 * (r[6] - .5) + .1 * tor;
  rotYXZ(BASSIN, .02 + .03 * en, lacetB, roulisB); fk(CORPS); fk(BASSIN);
  // pieds plantés : un peu écartés, pointes vers l'extérieur, l'un un peu devant
  const ec = .02 + .035 * r[1], av = .05 * (r[3] - .5), ouv = .14 + .1 * r[5];
  for (let k = 0; k < 2; k++) { const sx = k ? 1 : -1, libre = Math.max(0, -sx * w); // la jambe sans appui se relâche : talon un peu levé
    cT.set(sx * (D.hipX + ec), D.ay, -.02 + (k ? av : -av)); const tg = .1 * libre * libre + .32 * pte + .06 * reb; piedRoule(cT, tg, sx * ouv, CIB[k]); qPied(QPI[k], tg, sx * ouv); ORT[k] = -tg; APP[k] = true; }
  let dy = -.004 + .045 * pte - .055 * reb; const Lr = (D.L1 + D.L2) * .984;
  for (let k = 0; k < 2; k++) { fk(CUISSE[k]); const h = WP[CUISSE[k]], dx = h.x - CIB[k].x, dz = h.z - CIB[k].z, q = Lr * Lr - dx * dx - dz * dz; if (q > 0) dy = Math.min(dy, CIB[k].y + Math.sqrt(q) - h.y); }
  RAC.y = dy; fkTronc();
  // buste : les épaules penchent un peu à l'opposé du bassin, respiration ; la torsion tourne surtout le haut du corps
  const voute = en ? -.035 : .01 * r[7];
  rotYXZ(COLONNE, voute - .02 * en + .04 * reb, -lacetB * .5 + .03 * oy + .15 * tor, -roulisB * .65);
  rotYXZ(POITRINE, .03 - .014 * br + .02 * (r[4] - .5), -lacetB * .4 + .2 * tor, -roulisB * .5);
  fkTronc();
  regard(A, hor, cO); teteVers(cO.x * (1 - .6 * env), cO.y + .02 - .05 * pte, cO.z + .03 * (r[0] - .5) + .06 * env * (r[1] - .5), .7);
  for (let k = 0; k < 2; k++) { const sx = k ? 1 : -1; cU.set(sx * .12, .1, 1).normalize(); jambe(k, CIB[k].x, CIB[k].y, CIB[k].z, QPI[k], cU); rot(ORTEILS[k], ORT[k], 0, 0); }
  // bras relâchés, qui pendent malgré l'inclinaison du buste ; coudes un peu pliés, mains souples ; ils ballottent pendant la torsion
  const rb = roulisB * (1 - .65 - .5), pb = .02 + .03 * en + voute + .03;
  for (let k = 0; k < 2; k++) { const sx = k ? 1 : -1, osc = .025 * Math.sin(hor * 1.3 + k * 2 + r[6] * 5), bal = Math.sin(TAU * .85 * lt - .9) * env * (sorte === 1 ? 1 : 0);
    rotP(CLAV[k], k, 0, .01, .012 * br + .01 + .04 * pte);
    rotP(BRAS[k], k, -.03 - pb * .8 + osc + .35 * bal * sx - .12 * reb, -.12, .07 + .04 * r[5] - sx * rb * .9 + .01 * br + .2 * Math.abs(bal) + .1 * reb);
    rot(AVB[k], -(.18 + .12 * r[3 + k]) + osc * .5 - .25 * Math.abs(bal) - .15 * reb, 0, 0);
    rotP(MAIN[k], k, .02, -.05, -.12); rotP(DOIGTS[k], k, 0, 0, -.38 - .1 * r[k]); }
}
// allongé sur un transat (le jeu tourne tout le corps de −1,5 autour des pieds, posés au bout du transat) : le dossier
// commence à ~1,08 m des pieds ; on plie là (enfant : la nuque ; adulte : le dos), jambes posées, mains sur le ventre
function allonge(A, hor, br, s) {
  const r = A.r, hb = 1.08 / s, P = D.OFF, yC = P[BASSIN].y + P[COLONNE].y, yP = yC + P[POITRINE].y, yN = yP + P[COU].y;
  const kc = lisse(yC - .1, yP, hb), kn = lisse(yP, yN + .05, hb), pli = .55;  // où le corps plie pour suivre le dossier
  TANG = -1.5; rot(BASSIN, 0, 0, 0); fk(CORPS); fk(BASSIN);
  const plie = r[2] < .5 ? 0 : 1;
  for (let k = 0; k < 2; k++) { const up = k === plie ? .3 + .25 * r[3] : 0;
    rotP(CUISSE[k], k, -up, .22, .05); rot(JAMBE[k], .08 + up * 2.1, 0, 0); rotP(PIED[k], k, .45 - up * .6, .12, 0); rot(ORTEILS[k], -.1, 0, 0); }
  rot(COLONNE, pli * (1 - kc) * .5 + .01 * br, 0, 0); rot(POITRINE, pli * (1 - kc) * .5 + pli * kc * (1 - kn) * .6 - .02 * br, 0, 0); fkTronc();
  rot(COU, pli * kn * .5 + .05, .15 * ondule(hor * .2, r[5]), 0); rot(TETE, pli * kn * .4 + pli * kc * (1 - kn) * .25 + .05, .12 * (r[6] - .5), .05);
  // les mains posées sur le ventre, l'une à côté de l'autre (paumes vers le corps)
  fk(COLONNE);
  for (let k = 0; k < 2; k++) { const sx = k ? 1 : -1; rotP(CLAV[k], k, 0, -.04, .01 * br);
    cW.set(sx * .075 - .015, .05 + .015 * br, D.enfant ? .19 : .21).applyQuaternion(WQ[COLONNE]).add(WP[COLONNE]); cU.set(sx, -.2, -.5).normalize();
    brasIK(k, cW.x, cW.y, cW.z, cU); cT.set(0, 0, -1).applyQuaternion(WQ[COLONNE]); cO.set(-sx, -.35, .2).applyQuaternion(WQ[COLONNE]);
    mainVers(k, cO.x, cO.y, cO.z, cT.x, cT.y, cT.z, .6); rotP(DOIGTS[k], k, 0, 0, -.3); }
}

// ---- nager le crawl (le corps est couché : g.rotation.x = 1,35)
function crawl(A, t) {
  const r = A.r, cote = r[1] < .5 ? 0 : 1; TANG = 1.35;   // côté où l'on respire
  const uR = fract(t / TAU), roul = Math.cos(TAU * (uR - .3)) * .5;  // roulis : l'épaule qui tire descend
  rot(CORPS, 0, roul * .55, 0); rot(BASSIN, -.04, -roul * .15, 0); rot(COLONNE, 0, roul * .2, 0); rot(POITRINE, -.05, roul * .25, 0);
  for (let k = 0; k < 2; k++) {
    const u = fract(uR + k * .5); let th, ec, ab;
    if (u < .6) { const v = u / .6, e = v * v * (3 - 2 * v) * .7 + v * .3; th = -2.95 + 3.3 * e; ec = -(.3 + 1.1 * bosse(v)); ab = .15 - .2 * bosse(v); }
    else { const v = (u - .6) / .4, e = v * v * (3 - 2 * v); th = .35 + (3.33 - .35) * e; ec = -(.3 + 1.45 * bosse(v)); ab = .15 + .5 * bosse(v); }
    rotP(BRAS[k], k, th, -.25 * bosse((u - .6) / .4), ab); rot(AVB[k], ec, 0, 0);
    rotP(MAIN[k], k, .1, 0, -.1); rotP(DOIGTS[k], k, 0, 0, -.15); rotP(CLAV[k], k, 0, u > .6 ? -.08 : .04, .06 * bosse((u - .6) / .4));
    // battements de jambes : six par cycle de bras
    const kb = Math.sin(t * 3 + k * PI);
    rotP(CUISSE[k], k, .22 * kb, .05, .03); rot(JAMBE[k], .12 + .28 * Math.max(0, Math.sin(t * 3 + k * PI + .9)), 0, 0); rotP(PIED[k], k, .9 + .15 * kb, -.15, 0); rot(ORTEILS[k], .2, 0, 0);
  }
  // respiration : la tête tourne vers le côté qui sort de l'eau
  const uB = fract(uR + cote * .5), resp = lisse(.52, .68, uB) * (1 - lisse(.82, .97, uB)), sB = cote ? 1 : -1;
  rot(COU, -.12, sB * .3 * resp, 0); rot(TETE, -.16 + .1 * resp, sB * .55 * resp, 0);
}
// faire du sur-place : jambes en « batteur à œufs », mains qui godillent, tête hors de l'eau
function surPlace(A, t, hor) {
  const r = A.r;
  rot(BASSIN, .1, 0, 0); rot(COLONNE, .03, 0, 0); rot(POITRINE, .02 - .01 * Math.sin(hor * 2.2), 0, 0); fkTronc();
  regard(A, hor, cO); teteVers(cO.x, cO.y * .5 - .05, 0, .8);
  for (let k = 0; k < 2; k++) {
    const sx = k ? 1 : -1, a = t + k * PI;
    rotP(CUISSE[k], k, -1.05 + .12 * Math.sin(a), .3 * Math.cos(a), .55); rot(JAMBE[k], 1.45 + .35 * Math.sin(a + .6), 0, 0);
    rotP(PIED[k], k, -.15 + .25 * Math.sin(a + 1.4), .2, 0); rot(ORTEILS[k], 0, 0, 0);
    const go = Math.sin(t * 1.6 + r[k] * .5);
    rotP(CLAV[k], k, 0, -.03, .03); rotP(BRAS[k], k, -.5, -.25 + .45 * go, .7); rot(AVB[k], -.85 - .15 * go, 0, 0);
    rotP(MAIN[k], k, 0, 0, -.25 * go); rotP(DOIGTS[k], k, 0, 0, -.15);
  }
}
// grimper à l'échelle (de face) : mains et pieds alternés, la main droite monte avec le pied gauche
function echelle(A, t, s) {
  const u = fract(t / TAU), zl = .35 / s;  // l'échelle est à 0,35 m devant (jeu : 2,3 − 1,95)
  RAC.set(0, -.05 + .03 * Math.cos(TAU * u * 2), .08); rot(BASSIN, .12, 0, 0); fk(CORPS); fk(BASSIN);
  rot(COLONNE, .06, .04 * Math.sin(TAU * u), 0); rot(POITRINE, .04, .03 * Math.sin(TAU * u), 0); fkTronc();
  teteVers(0, -.3, 0, .8);
  for (let k = 0; k < 2; k++) {
    const sx = k ? 1 : -1;
    // h : 0 = bas, 1 = haut ; la main monte vite (demi-cycle), puis descend avec le corps qui monte
    const um = fract(u + (k ? .5 : 0)), mont = um < .5, hm = mont ? lisse(0, .5, um) : 1 - (um - .5) * 2, arc = mont ? bosse(um * 2) : 0;
    rotP(CLAV[k], k, 0, -.04, .06 + .06 * hm); cU.set(sx * .7, -.4, -.6).normalize();
    brasIK(k, sx * .3, D.OFF[BASSIN].y + D.epaule.y + .12 + .45 * hm, zl - .07 - .12 * arc, cU);
    mainVers(k, 0, .55, 1, 0, -.25, 1, .5); rotP(DOIGTS[k], k, 0, 0, mont ? -.4 : -1.25);
    const up = fract(u + (k ? 0 : .5)), mp = up < .5, hp = mp ? lisse(0, .5, up) : 1 - (up - .5) * 2, ap = mp ? bosse(up * 2) : 0;
    qPied(QPI[k], -.05 + .25 * ap, sx * .08); cU.set(sx * .15, .2, 1).normalize();
    jambe(k, sx * (D.hipX + .02), D.ay + .05 + .5 * hp + .08 * ap, zl - D.balle.z - .02 - .12 * ap, QPI[k], cU); rot(ORTEILS[k], -.1, 0, 0);
  }
}

// ---- assis (le bassin reste où était celui de l'ancien personnage : HANCHES_ANCIEN)
const assis = (dy = 0, dz = 0) => RAC.set(0, HANCHES_ANCIEN - D.hipH + dy, dz);
// un point de l'accessoire (repère de l'objet, mètres) → repère du personnage (unités du modèle) ; o = place du personnage
const loc = (out, x, y, z, ox, oy, oz, s) => out.set((x - ox) / s, (y - oy) / s, (z - oz) / s);
// buste penché d'un angle tel que les mains atteignent (cx, cy, cz) : bissection sur l'angle
function pencherVers(lat, cy, cz, frac, amin = -.2, amax = 1.1) {
  const ep = D.epaule, h = D.OFF[BASSIN].y + RAC.y, reach = (D.A1 + D.A2) * frac;
  let a0 = amin, a1 = amax;
  for (let i = 0; i < 12; i++) { const a = (a0 + a1) / 2, c = Math.cos(a), s = Math.sin(a), y = h + ep.y * c - ep.z * s, z = RAC.z + ep.y * s + ep.z * c;
    const dd = Math.hypot(lat, cy - y, cz - z); if (dd > reach) a0 = a; else a1 = a; }
  return cl((a0 + a1) / 2, amin, amax);
}
function buste(a, roulis = 0, lacet = 0) { rotYXZ(BASSIN, a * .4, lacet * .3, roulis); rotYXZ(COLONNE, a * .3, lacet * .35, -roulis * .6); rotYXZ(POITRINE, a * .3, lacet * .35, -roulis * .3); fkTronc(); }
// pied sur une pédale (centre de la pédale en p, pied incliné de tg) : vise l'avant du pied ; si la jambe est trop courte, la pointe descend
function piedPedale(k, p, tg, pole) {
  fk(CUISSE[k]); const h = WP[CUISSE[k]], Lmax = (D.L1 + D.L2) * .999;
  for (let it = 0; it < 2; it++) { const c = Math.cos(tg), s = Math.sin(tg), by = D.balle.y * c - D.balle.z * s, bz = D.balle.y * s + D.balle.z * c;
    _t.set(p.x, p.y - by + .015, p.z - bz); const manque = _t.distanceTo(h) - Lmax; if (manque <= 0 || it) break; tg = Math.min(1.1, tg + manque * 2.2); }
  qPied(QPI[k], tg, 0); jambe(k, _t.x, _t.y, _t.z, QPI[k], pole);
}
const VELO = new THREE.Vector3(0, .33, -.27), KART = new THREE.Vector3(0, -.2, -.3), PONEY = new THREE.Vector3(0, 1.03, .05), PEDALO = new THREE.Vector3(-.48, .18, 0), BOUEE = new THREE.Vector3(0, -.62, 0);
// où est le personnage sur l'objet : s'il en est l'enfant (cyclistes et karts du jeu : n roues), sa position ; sinon la place du joueur
function place(g, roues, defaut) { const u = g.parent && g.parent.userData; return u && u.wheels && u.wheels.length === roues ? g.position : defaut; }

function velo(A, g, a, s, hor) {
  const O = place(g, 2, VELO);
  assis(-.03, .1); const sw = Math.sin(a);
  rotYXZ(BASSIN, 0, 0, .045 * sw); fk(CORPS); fk(BASSIN);
  loc(cC, .24, .93, .3, O.x, O.y, O.z, s); cC.y += .035 / s; cC.z -= .055 / s;
  const pen = pencherVers(Math.max(0, cC.x - D.epaule.x), cC.y, cC.z, .9, .1, 1.0); buste(pen, .045 * sw * .5);
  teteVers(0, .05, 0, .95, .5);
  loc(cC, 0, .3, -.02, O.x, O.y, O.z, s); const R = .16 / s;
  for (let k = 0; k < 2; k++) { const sx = k ? 1 : -1, c = Math.cos(a) * sx, sn = Math.sin(a) * sx;
    cW.set(sx * .14 / s, cC.y + R * c, cC.z + R * sn); cU.set(sx * .18, .45, 1).normalize();
    piedPedale(k, cW, .3 + .22 * Math.max(0, -c) + .1 * sn, cU); rot(ORTEILS[k], -.05, 0, 0); }
  for (let k = 0; k < 2; k++) { const sx = k ? 1 : -1; loc(cW, sx * .24, .93, .3, O.x, O.y, O.z, s);
    rotP(CLAV[k], k, 0, -.08, .03); cU.set(sx * .9, -.6, -.3).normalize(); brasIK(k, cW.x - sx * .01 / s, cW.y + .035 / s, cW.z - .055 / s, cU);
    mainVers(k, sx * .1, -.6, 1, 0, -1, .2, .6); rotP(DOIGTS[k], k, 0, 0, -1.25); }
}
function kart(A, g, s, hor) {
  const O = place(g, 4, KART);
  assis(.02, 0);
  rot(BASSIN, 0, 0, 0); fk(CORPS); fk(BASSIN);
  // volant : anneau de rayon 0,13 autour de (0, 0,58, 0,24), incliné (rotation x −1) ; mains à « 10 h 10 »
  const R = .13, cy = .58, cz = .24, c1 = Math.cos(-1), s1 = Math.sin(-1);
  loc(cC, 0, cy, cz, O.x, O.y, O.z, s); const pen = pencherVers(.02, cC.y, cC.z, .88, -.1, .8); buste(pen);
  teteVers(.04 * ondule(hor * .6, A.r[3]), .04, 0, .9, .5);
  for (let k = 0; k < 2; k++) { const sx = k ? 1 : -1, al = k ? .55 : PI - .55, rx = R * Math.cos(al), ry = R * Math.sin(al);
    rotP(CLAV[k], k, 0, -.06, 0); loc(cW, rx, cy + ry * c1, cz + ry * s1, O.x, O.y, O.z, s); cU.set(sx * .9, -.7, -.2).normalize();
    brasIK(k, cW.x + sx * .025 / s, cW.y + .02 / s, cW.z - .045 / s, cU);
    mainVers(k, -sx * .45, .2, 1, sx * -.8, -.3, -.2, .5); rotP(DOIGTS[k], k, 0, 0, -1.2); }
  // jambes allongées vers l'avant, talons sur le plancher, pointes relevées sur les pédales
  fk(BASSIN);
  for (let k = 0; k < 2; k++) { const sx = k ? 1 : -1; fk(CUISSE[k]); const h = WP[CUISSE[k]], fy = (.19 - O.y) / s + D.ay + .02, L = (D.L1 + D.L2) * .96;
    const z = h.z + Math.sqrt(Math.max(.01, L * L - (h.y - fy) * (h.y - fy))); qPied(QPI[k], -.35, sx * .1);
    cU.set(sx * .2, 1, .4).normalize(); jambe(k, sx * (D.hipX + .05), fy, z, QPI[k], cU); rot(ORTEILS[k], 0, 0, 0); }
}
function pedalo(A, a, s, hor) {
  const O = PEDALO; assis(0, 0);
  rot(BASSIN, -.08, 0, .02 * Math.sin(a)); fk(CORPS); fk(BASSIN); buste(.02);
  regard(A, hor, cO); teteVers(cO.x * .6, .02 + cO.y * .5, 0, .8);
  // manivelle en (0, 0,78, 0,55) du pédalo ; pédales à ±0,1 de la place, rayon 0,2
  loc(cC, -.48, .78, .55, O.x, O.y, O.z, s); const R = .2 / s;
  for (let k = 0; k < 2; k++) { const sx = k ? 1 : -1, c = Math.cos(a) * sx, sn = Math.sin(a) * sx;
    cW.set(sx * .1 / s, cC.y + R * c, cC.z + R * sn); cU.set(sx * .25, 1, .3).normalize();
    piedPedale(k, cW, -1.25 + .2 * sn, cU); rot(ORTEILS[k], 0, 0, 0); }
  // main gauche sur la barre du gouvernail (entre les deux sièges), main droite posée sur la cuisse
  rotP(CLAV[1], 1, 0, 0, .03); rotP(CLAV[0], 0, 0, -.03, 0); loc(cW, 0, 1.18, .04, O.x, O.y, O.z, s); cU.set(.3, -.8, -.4).normalize(); brasIK(1, cW.x - .03 / s, cW.y - .02 / s, cW.z - .02 / s, cU);
  mainVers(1, -.6, -.2, .7, -.4, 0, .6, .5); rotP(DOIGTS[1], 1, 0, 0, -1.2);
  fk(JAMBE[0]); cW.copy(WP[JAMBE[0]]); cU.set(-.8, -.5, -.4).normalize(); brasIK(0, cW.x - .02, cW.y + .09, cW.z - .1, cU);
  mainVers(0, .05, -.6, 1, 0, -1, 0, .5); rotP(DOIGTS[0], 0, 0, 0, -.45);
}
function poney(A, g, t, v, s, hor) {
  const O = PONEY; assis(0, 0);
  const vit = v === undefined ? .4 : cl(v / 3, 0, 1), ba = Math.sin(t * (v === undefined ? 1.8 : 2));
  rot(BASSIN, .06 * vit * ba, 0, 0); fk(CORPS); fk(BASSIN); buste(.05 + .06 * vit * ba * .5);
  regard(A, hor, cO); teteVers(cO.x * .5, .05 + cO.y * .3, 0, .9);
  // le dos du poney : un tonneau de rayon 0,4 dont l'axe est à y = 1,08 ; les jambes l'enjambent
  const cyl = (1.08 - O.y) / s, Rk = .4 / s + .075;
  for (let k = 0; k < 2; k++) { const sx = k ? 1 : -1; fk(CUISSE[k]); const h = WP[CUISSE[k]], hx = Math.abs(h.x), hy = h.y - cyl, rh = Math.hypot(hx, hy), bh = Math.atan2(hx, hy);
    const dz = .18, L1 = Math.sqrt(D.L1 * D.L1 - dz * dz), c1 = cl((rh * rh + Rk * Rk - L1 * L1) / (2 * rh * Rk), -1, 1), b1 = bh + Math.acos(c1);
    const ch = 2 * Math.asin(cl(D.L2 * .98 / (2 * (Rk + .02)), 0, 1)), b2 = Math.min(b1 + ch, 1.75);
    cW.set(sx * (Rk + .02) * Math.sin(b2), cyl + (Rk + .02) * Math.cos(b2), h.z + dz + .06);
    cU.set(sx * Math.sin(b1), Math.cos(b1), .6).normalize(); qPied(QPI[k], -.15, sx * .25, sx * -.25);
    jambe(k, cW.x, cW.y, cW.z, QPI[k], cU); rot(ORTEILS[k], 0, 0, 0); }
  // les mains tiennent les rênes au-dessus du garrot
  for (let k = 0; k < 2; k++) { const sx = k ? 1 : -1; rotP(CLAV[k], k, 0, -.03, 0); loc(cW, sx * .085, 1.72, .3, O.x, O.y, O.z, s);
    cU.set(sx * .7, -.8, -.2).normalize(); brasIK(k, cW.x, cW.y + .02 * vit * ba / s, cW.z, cU);
    mainVers(k, -sx * .3, -.5, 1, -sx, -.2, 0, .5); rotP(DOIGTS[k], k, 0, 0, -1.3); }
}
function chaise(A, hor) {
  const r = A.r, en = D.enfant ? 1 : 0; assis(0, 0);
  rot(BASSIN, -.05, 0, 0); fk(CORPS); fk(BASSIN); rot(COLONNE, .08, 0, 0); rot(POITRINE, .06 - .012 * Math.sin(hor * 2.3), 0, 0); fkTronc();
  regard(A, hor, cO); teteVers(cO.x * .7, .18 + cO.y * .5, 0, .7);
  for (let k = 0; k < 2; k++) { const ba = en ? .28 * Math.sin(hor * 2.6 + k * PI + r[k] * 2) * (.5 + .5 * Math.sin(hor * .4 + r[3] * 6)) : 0;
    rotP(CUISSE[k], k, -1.45, -.06, .07); rot(JAMBE[k], en ? 1.25 + ba : 1.48, 0, 0); rotP(PIED[k], k, en ? .3 - ba * .5 : .05, .08, 0); rot(ORTEILS[k], 0, 0, 0); }
  // avant-bras devant soi (sur la table) ; le jeu lève ensuite le bras gauche (arms[1]) pour manger
  // le bras gauche est tourné vers l'intérieur : quand le jeu lève arms[1] (x seul) et plie le coude, la main arrive à la bouche
  for (let k = 0; k < 2; k++) { rotP(CLAV[k], k, 0, -.04, 0); if (k) rotP(BRAS[k], k, -.45, -.7, .2); else rotP(BRAS[k], k, -.42, -.12, .12);
    rot(AVB[k], -1.0, 0, 0); rotP(MAIN[k], k, 0, -.3, -.15); rotP(DOIGTS[k], k, 0, 0, -.45); }
}
function bouee(A, t, s, hor) {
  const O = BOUEE, r = A.r; assis(0, 0);
  rot(BASSIN, -.2, 0, 0); fk(CORPS); fk(BASSIN); rot(COLONNE, -.02, 0, 0); rot(POITRINE, -.02 - .012 * Math.sin(hor * 2.2), 0, 0); fkTronc();
  regard(A, hor, cO); teteVers(cO.x, .05 + cO.y * .5, 0, .8);
  for (let k = 0; k < 2; k++) { const ba = .12 * Math.sin(t + k * PI);
    rotP(CUISSE[k], k, -1.25, -.12, .22); rot(JAMBE[k], 1.0 + ba, 0, 0); rotP(PIED[k], k, .45, .1, 0); rot(ORTEILS[k], .1, 0, 0); }
  // les mains tiennent les poignées, de chaque côté de la bouée (±0,55 ; 0,2 au-dessus du centre)
  for (let k = 0; k < 2; k++) { const sx = k ? 1 : -1; loc(cW, sx * .55, .2, 0, O.x, O.y, O.z, s);
    rotP(CLAV[k], k, 0, 0, .05); cU.set(0, -1, -.3).normalize(); brasIK(k, cW.x - sx * .07 / s, cW.y + .07 / s, cW.z, cU);
    mainVers(k, sx * 1, -.4, .2, 0, -1, 0, .5); rotP(DOIGTS[k], k, 0, 0, -1.2); }
}
// glisser assis (toboggan), et les sauts des anciens appels : jambes devant, bras levés
function glisse(A, hor) {
  const r = A.r; assis(0, 0);
  rot(BASSIN, -.22, 0, 0); fk(CORPS); fk(BASSIN); rot(COLONNE, -.05, 0, 0); rot(POITRINE, .02, 0, 0); fkTronc(); teteVers(0, .08, 0, .8);
  for (let k = 0; k < 2; k++) { rotP(CUISSE[k], k, -1.2, -.06, .08); rot(JAMBE[k], .18, 0, 0); rotP(PIED[k], k, .35, .1, 0); rot(ORTEILS[k], 0, 0, 0);
    const w = .1 * Math.sin(hor * 7 + k * 2 + r[k] * 3);
    rotP(CLAV[k], k, 0, -.04, .22); rotP(BRAS[k], k, -2.65 + w, .3, .38); rot(AVB[k], -.3 - w, 0, 0); rotP(MAIN[k], k, 0, .4, .1); rotP(DOIGTS[k], k, 0, 0, -.12); }
}
// sauter (nouveau mode « jump », v = vitesse verticale en m/s : > 0 on monte, < 0 on retombe)
function saut(A, v, hor) {
  const k1 = v === undefined ? 0 : cl(v / 5, -1, 1), up = Math.max(0, k1), dn = Math.max(0, -k1), ap = 1 - up - dn;
  rot(BASSIN, .05 * ap - .05 * up, 0, 0); RAC.set(0, .03 * ap, 0); fkTronc(); rot(COLONNE, .08 * ap - .04 * up, 0, 0); rot(POITRINE, .04 * ap, 0, 0); fkTronc(); teteVers(0, .05 + .1 * dn, 0, .8);
  for (let k = 0; k < 2; k++) {
    rotP(CUISSE[k], k, .1 * up - (.8 + .1 * k) * ap - .4 * dn, 0, .08); rot(JAMBE[k], .15 * up + 1.25 * ap + .45 * dn, 0, 0); rotP(PIED[k], k, .6 * up + .3 * ap - .1 * dn, .1, 0); rot(ORTEILS[k], 0, 0, 0);
    rotP(CLAV[k], k, 0, -.04, .1 * up + .05); rotP(BRAS[k], k, -2.5 * up - 1.2 * ap - .5 * dn, .1, .3 * up + .45 * ap + 1.05 * dn); rot(AVB[k], -.25 * up - .6 * ap - .3 * dn, 0, 0);
    rotP(MAIN[k], k, 0, 0, -.1); rotP(DOIGTS[k], k, 0, 0, -.3); }
}

// ---- l'état d'un personnage, le fondu entre les modes
// slerp de a vers b (fraction e) sans prendre forcément le plus court chemin : des deux chemins, celui qui reste le plus
// près de la pose de l'image précédente (p) — sinon un bras qui fait un tour complet pendant le fondu « saute »
function slerpBrut(a, bx, by, bz, bw, e, out) {
  let c = a.x * bx + a.y * by + a.z * bz + a.w * bw;
  if (c > .9995 || c < -.9995) { out.set(a.x + (bx - a.x) * e, a.y + (by - a.y) * e, a.z + (bz - a.z) * e, a.w + (bw - a.w) * e); return out.normalize(); }
  const th = Math.acos(c), sn = Math.sin(th), k0 = Math.sin((1 - e) * th) / sn, k1 = Math.sin(e * th) / sn;
  return out.set(a.x * k0 + bx * k1, a.y * k0 + by * k1, a.z * k0 + bz * k1, a.w * k0 + bw * k1);
}
function fondu(a, b, e, p) {
  slerpBrut(a, b.x, b.y, b.z, b.w, e, _q3); slerpBrut(a, -b.x, -b.y, -b.z, -b.w, e, _q4);
  b.copy(Math.abs(_q3.dot(p)) >= Math.abs(_q4.dot(p)) ? _q3 : _q4);
}
const MODES = { idle: .3, walk: .22, swim: .5, tread: .45, climb: .25, pedal: .35, ride: .3, bike: .35, kart: .35, saddle: .4, sit: .4, buoy: .45, lie: .5, jump: .2 };
const NF = NB * 4 + 4, SYNC = NOMS_OS.map(n => /^(bras|avantbras|cuisse|jambe)_/.test(n));
function etat(g, u, os, t) {
  const id = (u.animGraine ?? g.id) | 0, r = new Float32Array(8); for (let i = 0; i < 8; i++) r[i] = hache(id * 7 + 3, i + 1); // animGraine : graine imposée (labo)
  return { os, b: NOMS_OS.map(n => os[n]), D: donnees(u.type || "garcon"), id, r, tI: -1e9, dt: 0, cur: 0, prev: 1, neuf: true, eau: null,
    out: [new Float32Array(NF), new Float32Array(NF)], src: [new Float32Array(NF), new Float32Array(NF)],
    mode: "", w: 1, dur: .25, is: 0, ph: t || 0, tg: t || 0, om: 0, vs: 0, mode0: "", w0: 1, dur0: .25, is0: 0, ph0: 0, tg0: 0, om0: 0, vs0: 0 };
}

// animPerson(g, mode, t, v) : pose complète de tous les os pour ce mode (voir SPEC.md §5)
let PAR_LF = false;
export function animPerson(g, mode, t = 0, v) {
  const u = g.userData, os = u.os; if (!os) return;
  let A = u.anim; if (!A || A.os !== os) A = u.anim = etat(g, u, os, t);
  A.lf = PAR_LF;
  D = A.D; const now = performance.now();
  // plusieurs appels dans la même image (ex. marcher puis sauter) : le dernier compte, on repart de l'état du début de l'image
  if (now - A.tI > 2.5) { A.dt = Math.min(.25, (now - A.tI) / 1000); A.tI = now; A.prev = A.cur; A.cur ^= 1;
    A.mode0 = A.mode; A.w0 = A.w; A.dur0 = A.dur; A.is0 = A.is; A.ph0 = A.ph; A.tg0 = A.tg; A.om0 = A.om; A.vs0 = A.vs; }
  else { A.mode = A.mode0; A.w = A.w0; A.dur = A.dur0; A.is = A.is0; A.ph = A.ph0; A.tg = A.tg0; A.om = A.om0; A.vs = A.vs0; }
  const dt = A.dt, hor = u.horloge ?? now / 1000, s = A.s = g.scale.x || 1, snap = A.neuf || u.sansTransition || dt >= .25;
  let m = MODES[mode] !== undefined ? mode : "idle";
  if (m === "idle" && g.rotation.x < -1.2) m = "lie";   // allongé : le jeu a mis rotation.x = −1,5 après l'appel précédent
  if (m !== A.mode) { if (!A.neuf) { A.is = A.is0 ^ 1; A.src[A.is].set(A.out[A.prev]); } A.w = 0; A.dur = Math.max(MODES[m], MODES[A.mode] || 0) * (m === "jump" || A.mode === "jump" ? .6 : 1); A.mode = m; }
  A.w = snap ? 1 : Math.min(1, A.w + dt / A.dur);
  // phase et vitesse de la marche
  if (m === "walk") {
    const Lw = D.hipH * s, dtg = t - A.tg; A.tg = t;
    if (dt > 0 && dtg > 0 && dtg < 3) A.om += (dtg / dt - A.om) * Math.min(1, dt * 4);
    const vd = v !== undefined && v >= 0, vv = vd ? v : A.om > .6 ? vitesseDe(A.om, Lw) : D.enfant ? 1.2 : 1.35;
    A.vs = snap || A.vs < .05 && A.mode0 !== "walk" ? vv : A.vs + cl(vv - A.vs, -dt * 12, dt * 10);
    if (!vd) A.ph = t; else if (dtg > 0 && dtg < 3) A.ph += dt * cadence(A.vs, Lw); else if (dtg !== 0) A.ph = t;
  } else { A.vs *= Math.max(0, 1 - dt * 4); A.tg = t; }
  // la pose cible
  for (let i = 0; i < NB; i++) LQ[i].identity(); RAC.set(0, 0, 0); TANG = 0;
  switch (m) {
    case "walk": marche(A, A.ph, Math.max(.05, A.vs), s, hor, !!u.porter); break;
    case "swim": crawl(A, t); break;
    case "tread": surPlace(A, t, hor); break;
    case "climb": echelle(A, t, s); break;
    case "pedal": pedalo(A, t, s, hor); break;
    case "bike": velo(A, g, t, s, hor); break;
    case "kart": kart(A, g, s, hor); break;
    case "saddle": poney(A, g, t, v, s, hor); break;
    case "sit": chaise(A, hor); break;
    case "buoy": bouee(A, t, s, hor); break;
    case "ride": glisse(A, hor); break;
    case "jump": saut(A, v, hor); break;
    default: repos(A, hor, m === "lie"); if (u.porter && m === "idle") plateau(hor);
  }
  // fondu depuis la pose affichée au moment du changement de mode
  const e = A.w >= 1 ? 1 : lisse(0, 1, A.w), o = A.out[A.cur], sr = A.src[A.is], op = A.out[A.prev], B = A.b;
  for (let i = 0; i < NB; i++) { const q = LQ[i], j = i * 4;
    if (e < 1) { _q1.set(sr[j], sr[j + 1], sr[j + 2], sr[j + 3]); _q2.set(op[j], op[j + 1], op[j + 2], op[j + 3]); fondu(_q1, q, e, _q2); }
    o[j] = q.x; o[j + 1] = q.y; o[j + 2] = q.z; o[j + 3] = q.w;
    // os que le jeu modifie ensuite (bras, coudes, cuisses, genoux) : rotation (Euler) tenue à jour ; les autres : quaternion seul (moins de calcul)
    if (SYNC[i]) B[i].quaternion.copy(q); else { const bq = B[i].quaternion; bq._x = q.x; bq._y = q.y; bq._z = q.z; bq._w = q.w; } }
  const j = NB * 4; if (e < 1) { RAC.set(mix(sr[j], RAC.x, e), mix(sr[j + 1], RAC.y, e), mix(sr[j + 2], RAC.z, e)); TANG = mix(sr[j + 3], TANG, e); }
  o[j] = RAC.x; o[j + 1] = RAC.y; o[j + 2] = RAC.z; o[j + 3] = TANG;
  os.corps.position.copy(RAC); g.rotation.x = TANG;
  if (A.neuf) { A.out[A.prev].set(o); A.neuf = false; }
  // tongs : enlevées dans l'eau (g.userData.tongs : les maillages des tongs portées ; foule : g.userData.montrerTongs)
  const eau = m === "swim" || m === "tread" || m === "buoy";
  if (A.eau !== eau) { A.eau = eau; if (u.tongs) for (const x of u.tongs) x.visible = !eau; u.montrerTongs?.(!eau); }
}

// liveFace(g, dt) : clignements et petits mouvements des yeux (visage.js) ; les personnages que le jeu n'anime jamais
// (ceux qui parlent) respirent et bougent quand même : la pose de repos est jouée ici
export function liveFace(g, dt) {
  const u = g.userData;
  if (u.os && (!u.anim || u.anim.lf || performance.now() - u.anim.tI > 400)) { PAR_LF = true; animPerson(g, "idle", 0); PAR_LF = false; }
  if (u.visage?.animer) { u.visage.animer(dt); return; }
  if (!u.lids || !u.lids.length) return; u.blink -= dt;  // ancien clignement (paupières à l'échelle)
  const a = u.blink < .12 && u.blink > 0 ? .12 : 1; for (const l of u.lids) if (l.scale) l.scale.y += (a - l.scale.y) * Math.min(1, dt * 30);
  if (u.blink <= 0) u.blink = 2.5 + Math.random() * 4;
}
