// cheveux.js — les 9 coupes (volumes doux qui épousent la tête : coque sdfTete décalée + mèches en capsules / boules),
// casquette, nœud, bandeau, lunettes (GLASSES 1..5), bonnet et lunettes de natation. Tout est maillé depuis un champ de distance
// (maillerSDF), en repère de l'os « tete » ; les géométries sont partagées par type et par coupe.
// coiffer(g, o) pose cheveux + accessoire ; putGlasses(g, i) ; putSwimGear(g, { bonnet, lunettes }).
// geoCheveux(type, coupe, h) / geoAccessoire(type, acc, h) servent aussi à la foule (index.js, maillage fusionné au corps).
import * as THREE from "three";
import { sdfTete, mesuresTete, reperesTete, maillerSDF, smin, ell, cap } from "./tete.js";
import { matCheveux, matPlastique, matSilicone, matTissu, matVerre } from "./materiaux.js";
import { GLASSES, mergeGeometries } from "../jeu.js";

const mx = Math.max, mn = Math.min, ab = Math.abs, PI = Math.PI;
const E = (cx, cy, cz, a, b, c) => { const e = [cx, cy, cz, 1 / a, 1 / b, 1 / c]; return (x, y, z) => ell(x, y, z, e); };
const C = (ax, ay, az, bx, by, bz, ra, rb) => { const c = [ax, ay, az, bx, by, bz, ra, rb]; return (x, y, z) => cap(x, y, z, c); };
const U = (k, ...f) => (x, y, z) => { let d = f[0](x, y, z); for (let i = 1; i < f.length; i++) d = smin(d, f[i](x, y, z), k); return d; };
const R = (n, s = 7) => { let a = s; return () => (a = (a * 16807) % 2147483647) / 2147483647 * n; };

// ligne d'implantation : u = y − centre du crâne, w = z − centre ; positif = sous la ligne (pas de cheveux)
const masque = (cy, cz, dec, k = .53, arriere = 0) => (x, y, z) => { const w = z - cz, u = y - cy, l = -.03 + dec + k * w - 1.5 * x * x - (w < 0 ? arriere * -w : 0); return (l - u) * .8; };
// coque de cheveux : tête décalée de t, coupée sous la ligne d'implantation
const coque = (type, t, m) => (x, y, z) => mx(sdfTete(x, y, z, type) - t, m(x, y, z));

// les 9 coupes → { f (champ), b (boîte : x, ymin, ymax, zmin, zmax) }
function coupe(type, c) {
  const P = mesuresTete(type), cy = P.crane[1], cz = P.crane[2], ad = type === "femme" || type === "homme", s = ad ? .92 : 1, r = R(1, 11 + c);
  const dessus = (x, y, z) => .006 * mx(0, (y - cy) / .15); // un peu plus de volume sur le dessus
  const base = (t, dec = 0, arr = 0) => { const m = masque(cy, cz, dec, .53, arr); return (x, y, z) => coque(type, t + dessus(x, y, z), m)(x, y, z); };
  const bx = [.22, -.03, cy + .2, cz - .2, cz + .2];
  switch (c) {
    case 1: { // longs : rideau derrière et deux mèches devant les oreilles
      const dos = (x, y, z) => mx(E(0, cy - .2, cz - .06, .152 * s, .24, .105 * s)(x, y, z), (z - (cz + .02)) * .9);
      const l = [-1, 1].map(sg => C(sg * .127, cy - .01, cz + .005, sg * .125, cy - .27, cz - .035, .042, .034));
      return { f: U(.025, base(.015, 0, .8), dos, l[0], l[1]), b: [.22, -.3, cy + .2, cz - .2, cz + .2] }; }
    case 2: // queue de cheval
      return { f: U(.02, base(.014), C(0, cy + .03, cz - .13, 0, cy - .04, cz - .21, .05, .038), C(0, cy - .04, cz - .21, 0, cy - .2, cz - .2, .038, .016)), b: [.2, -.25, cy + .2, cz - .3, cz + .2] };
    case 3: // couettes
      return { f: U(.02, base(.014), ...[-1, 1].flatMap(sg => [C(sg * .125, cy + .0, cz - .04, sg * .2, cy - .07, cz - .06, .042, .04), C(sg * .2, cy - .07, cz - .06, sg * .2, cy - .24, cz - .05, .04, .016)])), b: [.3, -.3, cy + .2, cz - .25, cz + .2] };
    case 4: { // carré
      const ext = E(0, cy - .07, cz - .02, .185 * s, .17, .175 * s), cav = E(0, cy - .09, cz + .01, .152 * s, .3, .145 * s);
      const bol = (x, y, z) => mx(mx(ext(x, y, z), -cav(x, y, z)), (z - (cz + .06)) * .8);
      return { f: U(.02, base(.014, 0, .6), bol), b: [.22, -.12, cy + .2, cz - .25, cz + .2] }; }
    case 5: case 8: { // bouclés : boules posées sur la coque
      const bs = [], n = c === 5 ? 20 : 26; for (let i = 0; i < n; i++) { const th = (c === 5 ? .2 : .25) + r() * 1.35, ph = r() * 2 * PI, ny = Math.cos(th), nx = Math.sin(th) * Math.sin(ph), nz = Math.sin(th) * Math.cos(ph);
        if (nz > .45 && ny < .6) continue; const low = c === 8 && i % 3 === 0, k = (low ? 1.1 : 1) * .15; bs.push(E(nx * k, cy + ny * k * 1.02 - (low ? .08 : 0), cz + nz * k, .047, .047, .047)); }
      if (c === 8) for (const sg of [-1, 1]) for (let j = 0; j < 3; j++) bs.push(E(sg * (.135 - j * .01), cy - .1 - j * .06, cz - .03 - j * .02, .045, .045, .045)); bs.push(E(0, cy - .12, cz - .15, .06, .1, .045));
      return { f: U(.025, base(.016, 0, c === 8 ? .5 : 0), ...bs), b: [.25, c === 8 ? -.26 : -.03, cy + .26, cz - .25, cz + .22] }; }
    case 6: // chignon
      return { f: U(.025, base(.014), E(0, cy + .165, cz - .07, .06, .052, .06), E(0, cy + .12, cz - .06, .05, .06, .05)), b: [.2, -.03, cy + .28, cz - .2, cz + .2] };
    case 7: // très courts
      return { f: base(.007, .045), b: bx };
    default: // 0 courts, une frange sur le côté
      return { f: U(.02, base(.015), E(.035, cy + .085, cz + .108, .1, .036, .05)), b: bx };
  }
}
const GEOS = new Map();
function mailler(cle, f, b, h, garder) {
  const k = cle + "|" + h; if (GEOS.has(k)) return GEOS.get(k);
  const g = maillerSDF(f, -b[0], b[1], b[3], b[0], b[2], b[4], h, garder); g.userData.partage = true; GEOS.set(k, g); return g;
}
// garder : on jette la face cachée dans la tête (coupe à la ligne d'implantation), un bon tiers des triangles
export const geoCheveux = (type, c, h = .021) => { const o = coupe(type, c); return mailler("h" + type + c, o.f, o.b, h, (x, y, z) => sdfTete(x, y, z, type) > -.008); };

// ---- accessoires : casquette, nœud, bandeau
function accessoire(type, a) {
  const P = mesuresTete(type), cy = P.crane[1], cz = P.crane[2];
  if (a === "casquette") { const yb = z => cy - .045 + .1 * ((z - cz) / .15), dome = (x, y, z) => mx(sdfTete(x, y, z, type) - .026, yb(z) - y), vv = E(0, cy + .04, cz + .17, .085, .011, .075);
    const vis = (x, y, z) => vv(x, y + (z - cz - .17) * .3, z);
    return { f: U(.012, dome, vis), b: [.2, cy - .2, cy + .22, cz - .2, cz + .28] }; }
  if (a === "noeud") { const x0 = .085, y0 = cy + .125, z0 = cz + .06, ailes = [-1, 1].map(sg => (x, y, z) => E(x0 + sg * .045, y0, z0 + .03, .045, .028, .014)(x, y, z));
    return { f: U(.012, ailes[0], ailes[1], E(x0, y0, z0 + .03, .016, .016, .016)), b: [.2, y0 - .05, y0 + .05, z0 - .01, z0 + .08], dec: true }; }
  // bandeau : un ruban sur la ligne des cheveux
  return { f: (x, y, z) => mx(ab(sdfTete(x, y, z, type) - .013) - .008, ab(y - (cy + .015 + .2 * (z - cz))) - .017), b: [.2, cy - .06, cy + .2, cz - .2, cz + .2] };
}
export const geoAccessoire = (type, a, h = .016) => { const o = accessoire(type, a); return mailler("a" + type + a, o.f, o.b, h); };

// ---- pose sur le personnage
function enlever(g, cle) { const u = g.userData, o = u[cle]; if (!o) return; o.parent?.remove(o); o.traverse?.(m => { if (m.geometry && !m.geometry.userData.partage) m.geometry.dispose(); if (m.material && !m.material.userData?.partage) m.material.dispose?.(); }); u[cle] = null; }
export function coiffer(g, o) {
  const u = g.userData, type = u.type, tete = u.head, mh = matCheveux(o.hair ?? 0x5a3a22);
  const h = new THREE.Mesh(geoCheveux(type, o.coiffure ?? (o.long ? 1 : 0)), mh); h.name = "cheveux"; h.castShadow = true; tete.add(h); u.cheveux = h;
  const a = o.cap != null ? "casquette" : o.acc, col = o.cap ?? o.accCol ?? 0xe8534a;
  if (a) { const m = new THREE.Mesh(geoAccessoire(type, a), matTissu(col)); m.name = "accessoire"; m.castShadow = true; tete.add(m); u.accessoire = m; }
}
const vec = (x, y, z) => new THREE.Vector3(x, y, z), fusion = l => mergeGeometries(l.map(([geo, p, r, sc]) => { const o = new THREE.Object3D(); o.position.copy(p); if (r) o.rotation.copy(r); if (sc) o.scale.copy(sc); o.updateMatrix(); return geo.applyMatrix4(o.matrix); }));
// lunettes : 0 enlève, 1..5 = GLASSES ; deux maillages (monture, verres)
export function putGlasses(g, i) {
  const u = g.userData; enlever(g, "lunettes"); if (!i || !GLASSES[i]) return;
  const rp = reperesTete(u.type), [, fc, lc] = GLASSES[i], gr = new THREE.Group(), e = rp.yeux, r = e[0].rayon * 1.2, z = e[0].centre.z + e[0].rayon + .014, zo = rp.oreilles[0].z, mont = [], verres = [];
  const soleil = i === 3, ch = new THREE.Euler(0, 0, 0);
  for (const y of e) { const c = y.centre, s = Math.sign(c.x); mont.push([new THREE.TorusGeometry(r, .0055, 6, 22), vec(c.x, c.y, z)], [new THREE.BoxGeometry(.005, .006, z - zo), vec(s * (rp.demiLargeur + .003), c.y + .004, (z + zo) / 2)]); verres.push([new THREE.CircleGeometry(r, 18), vec(c.x, c.y, z)]); }
  mont.push([new THREE.TorusGeometry(ab(e[0].centre.x) - r, .005, 6, 10, PI), vec(0, e[0].centre.y + .002, z)]);
  const m = new THREE.Mesh(fusion(mont), matPlastique(fc, { metal: i === 4 ? .8 : 0 })), v = new THREE.Mesh(fusion(verres), matVerre(lc, soleil ? .85 : .25));
  gr.add(m, v); u.head.add(gr); u.lunettes = gr; void ch;
}
// bonnet et lunettes de natation ; le bonnet cache les cheveux
const BONNETS = new Map();
export function putSwimGear(g, x = {}) {
  const u = g.userData, type = u.type, h = u.head; enlever(g, "bain"); if (u.cheveux) u.cheveux.visible = !x.bonnet; if (u.accessoire) u.accessoire.visible = !x.bonnet;
  if (!x.bonnet && !x.lunettes) return;
  const rp = reperesTete(type), P = mesuresTete(type), gr = new THREE.Group();
  if (x.bonnet) { let ge = BONNETS.get(type); if (!ge) { const m = masque(P.crane[1], P.crane[2], .0, .5, 0); ge = maillerSDF(coque(type, .011, (X, y, z) => m(X, y, z) + .02 + (ab(X) > .1 ? -.012 : 0)), -.2, -.03, -.2, .2, P.crane[1] + .2, .2, .02); ge.userData.partage = true; BONNETS.set(type, ge); }
    const b = new THREE.Mesh(ge, matSilicone(x.bonnet)); b.castShadow = true; gr.add(b); }
  if (x.lunettes) { const c = x.lunettes, e = rp.yeux, z = e[0].centre.z + e[0].rayon + .004, cad = [], ve = [];
    for (const y of e) { const p = vec(y.centre.x, y.centre.y, z); ve.push([new THREE.SphereGeometry(y.rayon * 1.28, 10, 6), p, null, vec(1.1, .85, .4)]); cad.push([new THREE.TorusGeometry(y.rayon * 1.3, .0055, 4, 14), p, null, vec(1.1, .85, 1)]); }
    cad.push([new THREE.TorusGeometry(1, .0045, 4, 24), vec(0, e[0].centre.y + .005, P.crane[2] - .005), new THREE.Euler(PI / 2 - .08, 0, 0), vec(rp.demiLargeur + .018, (rp.demiLargeur + .018) * 1.12, 1)]);
    gr.add(new THREE.Mesh(fusion(cad), matSilicone(c)), new THREE.Mesh(fusion(ve), matVerre(0x9fd8ff, .5))); }
  h.add(gr); u.bain = gr;
}
