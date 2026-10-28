// index.js — le personnage assemblé : squelette (squelette.js), peau d'un seul tenant (corps.js), visage (visage.js),
// matériaux (materiaux.js), animation (anim.js). Habits PROVISOIRES peints sur la peau dans le shader (d'après la région,
// la longueur le long de l'os et la position en pose de liaison) en attendant habits.js et cheveux.js.
// person(o) → Group (échelle o.scale ?? .76, ordre YXZ). g.userData : type, os (os par nom), meta (corps.js), corps (la peau),
//   female, legs/arms/knees/elbows [droite, gauche], head, lids, blink, skinColor, hairColor, capColor, clothes, mats { peau (nue :
//   paupières…), corps (peau + habits peints) }, habitsU (uniformes des habits peints), tongs (vide : habits.js), visage (visage.js),
//   tenue ; foule (o.lite) : un seul SkinnedMesh, un seul matériau, une = uniformes. setOutfit change aussi la géométrie :
//   corps « chausse » (pied sans orteils) en habits, pieds nus en maillot.
import * as THREE from "three";
import { squelette, typeDe } from "./squelette.js";
import { construireCorps } from "./corps.js";
import * as MAT from "./materiaux.js";
import { construireVisage } from "./visage.js";
import { reperesTete } from "./tete.js";
import { SUITS, suitTex, GLASSES, mulberry, rnd, mergeGeometries } from "../jeu.js";
export { animPerson, liveFace } from "./anim.js";

// ---- peinture des habits dans le shader de la peau (provisoire)
const BLANC_HABITS = (() => { const t = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); t.needsUpdate = true; return t; })();
const V_HAB = "attribute float region;\nattribute float lng;\nattribute vec3 couleur;\nuniform float uHMode;\nuniform vec4 uHL;\nuniform float uHPied;\nuniform vec2 uHPiedZ;\nflat varying float vReg;\nvarying float vLng;\nvarying vec3 vLie;\nvarying vec2 vUvH;\nvarying vec3 vCoul;\n";
// habits : corps « chausse » (pied sans orteils, corps.js) qui gonfle un peu le long de la normale, moins sous la semelle
// (fonction continue de la position et de la normale de liaison : pas de fente entre sommets dédoublés)
const V_CHAUS = "if (uHMode < .5) { float ch = 1. - smoothstep(uHPiedZ.y, uHPiedZ.y + .05, position.y); ch *= mix(.12, 1., smoothstep(-.85, -.35, normal.y)); transformed += normal * uHPied * ch; }";
const F_HAB = `uniform float uHPied, uHMode, uHShorts, uHManches, uHMotif, uHMetal; uniform vec3 uHHaut, uHBas, uHChaus, uHYeux, uHSourcil; uniform sampler2D uHSuit; uniform vec4 uHY, uHL, uHS;
flat varying float vReg; varying float vLng; varying vec3 vLie; varying vec2 vUvH; varying vec3 vCoul;
`;
// uHY : ourlet du haut, haut du maillot, entrejambe, haut de la poitrine ; uHL : manche, avant-bras, short, tibia ; uHS : bretelle x, aisselle, dos, boxer
const F_PEINT = `{ float r = floor(vReg + .5); vec3 p = vLie; float ax = abs(p.x), hab = 0., ru = .82; vec3 hc = vec3(1.);
  if (r > 8.5) { vec3 c = vCoul; if (c.r > .5 && c.g < .2) c = uHYeux; else if (c.g > .5 && c.r < .2) c = uHSourcil; diffuseColor.rgb = c; }
  else if (uHMode < .5) {
    bool chaus = r > 7.5 || (r > 6.5 && r < 7.5 && vLng > uHL.w - .035);
    bool haut = (r < .5 && p.y > uHY.x) || (r > 2.5 && r < 3.5 && (uHManches > .5 || vLng < uHL.x)) || (r > 3.5 && r < 4.5 && uHManches > .5 && vLng < uHL.y - .012);
    bool bas = (r < .5 && p.y <= uHY.x) || (r > 5.5 && r < 6.5 && (uHShorts < .5 || vLng < uHL.z)) || (r > 6.5 && r < 7.5 && uHShorts < .5);
    if (chaus) { hab = 1.; hc = p.y < .017 ? (dot(uHChaus, vec3(.3, .6, .1)) > .5 ? vec3(.12) : vec3(.88)) : uHChaus; ru = .55; } else if (haut) { hab = 1.; hc = uHHaut; if (uHMotif > .5 && fract(vLng * 16.) < .38) hc = vec3(.92, .91, .86); } else if (bas) { hab = 1.; hc = uHBas; }
  } else {
    vec3 sw = texture2D(uHSuit, vUvH * vec2(2., 3.)).rgb; bool m = false;
    if (uHMode < 1.5) m = (r < .5 && p.y < uHY.y) || (r > 5.5 && r < 6.5 && vLng < uHS.w);
    else if (uHMode < 2.5) { float jambe = mix(uHY.z - .05, mix(uHY.y - .05, uHY.y + .02, smoothstep(-.04, .04, p.z)), smoothstep(.015, .14, ax)), top = p.z > 0. ? uHY.w : uHS.z; if (ax > uHS.x + .045) top = min(top, uHS.y);
      m = (r < .5 || (r > 5.5 && r < 6.5)) && ((p.y > jambe && p.y < top) || (r < .5 && abs(ax - uHS.x) < .0105 && p.y > top - .02)); }
    else { m = r < .5 || (r > 2.5 && r < 3.5) || (r > 3.5 && r < 4.5 && vLng < uHL.y - .012) || (r > 5.5 && r < 6.5) || (r > 6.5 && r < 7.5 && vLng < uHL.w - .02);
      if (m && (r < 4.5)) sw = uHHaut; }
    if (m) { hab = 1.; hc = sw; ru = .42; }
  }
  diffuseColor.rgb = mix(diffuseColor.rgb, hc, hab); roughnessFactor = mix(roughnessFactor, ru, hab); metalnessFactor = mix(metalnessFactor, uHMetal, hab * step(.5, uHMode)); }
`;
function peindreHabits(m, U) {
  const avant = m.onBeforeCompile, cle = m.customProgramCacheKey.bind(m);
  m.onBeforeCompile = (sh, r) => { avant?.call(m, sh, r); Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\n" + V_HAB).replace("#include <begin_vertex>", "#include <begin_vertex>\nvReg = region; vLng = lng; vLie = position; vUvH = uv; vCoul = couleur;\n" + V_CHAUS);
    const ancre = sh.fragmentShader.includes("#include <emissivemap_fragment>") ? "#include <emissivemap_fragment>" : "#include <lights_physical_fragment>";
    const pbr = sh.fragmentShader.includes("#include <roughnessmap_fragment>"), code = pbr ? F_PEINT : F_PEINT.replace(/roughnessFactor = [^;]*;|metalnessFactor = [^;]*;/g, "");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\n" + F_HAB).replace(ancre, code + ancre); };
  m.customProgramCacheKey = () => cle() + "|habits-provisoires-3";
  return m;
}
function uniformesHabits(meta) {
  const J = meta.joints, y = n => J[n].y, L = (a, b) => J[a].distanceTo(J[b]), enfant = meta.type === "garcon" || meta.type === "fille";
  return { uHPied: { value: enfant ? .005 : .006 }, uHPiedZ: { value: new THREE.Vector2(J.orteils_g.z, J.pied_g.y + .01) }, uHMode: { value: 0 }, uHShorts: { value: 0 }, uHManches: { value: 0 }, uHMotif: { value: 0 }, uHMetal: { value: 0 },
    uHHaut: { value: new THREE.Color(0x2e86de) }, uHBas: { value: new THREE.Color(0x3a4a63) }, uHChaus: { value: new THREE.Color(0xf5f5f5) }, uHSuit: { value: BLANC_HABITS },
    uHYeux: { value: new THREE.Color(0x6b4424) }, uHSourcil: { value: new THREE.Color(0x5a3a22) },
    uHY: { value: new THREE.Vector4(y("bassin") + .045, y("bassin") + .07, y("bassin") - .1, y("poitrine") + (enfant ? .1 : .11)) },
    uHL: { value: new THREE.Vector4(enfant ? .13 : .16, L("avantbras_g", "main_g"), enfant ? .2 : .24, L("jambe_g", "pied_g")) },
    uHS: { value: new THREE.Vector4(enfant ? .085 : .1, y("bras_g") - .16, y("poitrine") + .03, enfant ? .17 : .2) } };
}

// foule : le corps léger et le visage peint (visage.js) dans UNE géométrie, partagée par type ; région 9 = visage peint,
// ses couleurs codées (rouge = iris, vert = sourcils) sont remplacées dans le shader par celles du personnage
const CORPS_LEGERS = new Map(), CODE_YEUX = 0xff0000, CODE_SOURCIL = 0x00ff00;
function corpsLeger(type, geo, geoV, meta) {
  if (CORPS_LEGERS.has(type)) return CORPS_LEGERS.get(type);
  const n0 = geo.attributes.position.count, vp = geoV?.attributes.position, n1 = vp ? vp.count : 0, N = n0 + n1, Jt = meta.joints.tete, A = geo.attributes;
  const cat = (nom, k, T, f) => { const o = new T(N * k); o.set(A[nom].array.subarray(0, n0 * k)); for (let i = 0; i < n1; i++) f(o, n0 + i, i); return new THREE.BufferAttribute(o, k); };
  const g = new THREE.BufferGeometry(), vn = geoV?.attributes.normal, vc = geoV?.attributes.color;
  g.setAttribute("position", cat("position", 3, Float32Array, (o, j, i) => o.set([vp.getX(i) + Jt.x, vp.getY(i) + Jt.y, vp.getZ(i) + Jt.z], j * 3)));
  g.setAttribute("normal", cat("normal", 3, Float32Array, (o, j, i) => o.set([vn.getX(i), vn.getY(i), vn.getZ(i)], j * 3)));
  g.setAttribute("uv", cat("uv", 2, Float32Array, () => {}));
  g.setAttribute("skinIndex", cat("skinIndex", 4, Uint16Array, (o, j) => o.set([5, 0, 0, 0], j * 4)));
  g.setAttribute("skinWeight", cat("skinWeight", 4, Float32Array, (o, j) => o.set([1, 0, 0, 0], j * 4)));
  g.setAttribute("region", cat("region", 1, Float32Array, (o, j) => o[j] = 9)); g.setAttribute("lng", cat("lng", 1, Float32Array, () => {}));
  const cl = new Float32Array(N * 3); for (let i = 0; i < n1; i++) cl.set([vc.getX(i), vc.getY(i), vc.getZ(i)], (n0 + i) * 3); g.setAttribute("couleur", new THREE.BufferAttribute(cl, 3));
  const i0 = Array.from(geo.index.array); if (geoV) for (const v of geoV.index.array) i0.push(v + n0);
  g.setIndex(N > 65535 ? new THREE.Uint32BufferAttribute(i0, 1) : new THREE.Uint16BufferAttribute(i0, 1)); g.boundingSphere = geo.boundingSphere.clone(); g.userData.partage = true;
  CORPS_LEGERS.set(type, g); return g;
}
// ---- le personnage
const ZONE_PERSO = new THREE.Sphere(new THREE.Vector3(0, 1.1, 0), 1.9);
export function person(o) {
  const type = typeDe(o), lite = !!o.lite, qualite = lite ? "leger" : "plein", { geo, meta } = construireCorps(type, qualite, "chausse"), { os, skeleton } = squelette(type);
  const g = new THREE.Group(); g.add(os.corps);
  const R = mulberry(o.seed ?? Math.floor(rnd() * 1e6)), skin = o.skin ?? 0xf1c6a0, hair = o.hair ?? 0x5a3a22, U = uniformesHabits(meta);
  U.uHYeux.value.setHex(o.eyes ?? 0x6b4424).multiplyScalar(.8); U.uHSourcil.value.setHex(hair).multiplyScalar(.8);
  g.scale.setScalar(o.scale ?? .76); g.rotation.order = "YXZ";
  // peau nue (paupières, détails du visage…) et peau du corps (même matériau + habits peints)
  const peau = MAT.matPeau(skin), mc = peindreHabits(lite && MAT.matLegere ? MAT.matLegere(skin) : MAT.matPeau(skin), U);
  g.userData = { type, os, meta, female: !!o.long, legs: [os.cuisse_d, os.cuisse_g], arms: [os.bras_d, os.bras_g], knees: [os.jambe_d, os.jambe_g], elbows: [os.avantbras_d, os.avantbras_g],
    head: os.tete, lids: [], blink: 2 + R() * 4, skinColor: skin, hairColor: hair, capColor: o.cap, mats: { peau, corps: mc }, habitsU: U, tongs: [],
    clothes: { shirt: o.shirt ?? 0x2e86de, pants: o.pants ?? 0x3a4a63, shoe: o.shoe ?? 0xf5f5f5, shorts: !!o.shorts, manches: !!o.manches, motifHaut: o.motifHaut ?? null, motifBas: o.motifBas ?? null } };
  let gc = geo;
  if (lite) { const vis = construireVisage(g, os, type, { ...o, eyes: CODE_YEUX, hair: CODE_SOURCIL, visageDansLeCorps: true }, qualite); gc = corpsLeger(type, geo, vis.geoLeger, meta); g.userData.visage = vis; g.userData.une = U; }
  const corps = new THREE.SkinnedMesh(gc, mc); corps.bind(skeleton, new THREE.Matrix4()); corps.boundingSphere = ZONE_PERSO;
  corps.castShadow = !lite; corps.receiveShadow = true; corps.name = "corps"; g.add(corps); g.userData.corps = corps;
  if (!lite) g.userData.visage = construireVisage(g, os, type, o, qualite);
  os.tete.scale.setScalar(o.tete ?? 1);
  setOutfit(g, null);
  return g;
}
// tenue : habits (null) ou maillot (id de SUITS) : boxer pour les garçons, une-pièce pour les filles, combinaison si « full »
export function setOutfit(g, id) {
  const u = g.userData, U = u.habitsU, su = SUITS.find(s => s.id === id), c = u.clothes; if (!U) return;
  u.tenue = su ? su.id : null;
  if (u.corps && !u.une) { const ge = construireCorps(u.type, "plein", su ? "" : "chausse").geo; if (u.corps.geometry !== ge) u.corps.geometry = ge; } // pieds nus en maillot, chaussés en habits
  if (!su) { U.uHMode.value = 0; U.uHHaut.value.setHex(c.shirt); U.uHBas.value.setHex(c.motifBas === "jean" ? 0x3b5b8c : c.pants); U.uHChaus.value.setHex(c.shoe);
    U.uHShorts.value = c.shorts ? 1 : 0; U.uHManches.value = c.manches ? 1 : 0; U.uHMotif.value = c.motifHaut === "rayures" ? 1 : 0; U.uHSuit.value = BLANC_HABITS; U.uHMetal.value = 0; }
  else { U.uHMode.value = su.full ? 3 : u.female ? 2 : 1; U.uHSuit.value = suitTex(su); U.uHHaut.value.set(su.a ?? "#e74c3c"); U.uHMetal.value = su.gold ? .6 : 0; }
  for (const t of u.tongs ?? []) t.visible = !!su;
}
// petites pièces fusionnées : un maillage par matériau (géométries posées avec leur matrice)
const fusionPieces = (l, m) => { const g = mergeGeometries(l.map(([geo, p, r, sc]) => { const o = new THREE.Object3D(); o.position.copy(p); if (r) o.rotation.copy(r); if (sc) o.scale.copy(sc); o.updateMatrix(); return geo.applyMatrix4(o.matrix); })); return new THREE.Mesh(g, m); };
const vecP = (x, y, z) => new THREE.Vector3(x, y, z), eulP = (x, y, z) => new THREE.Euler(x, y, z);
// lunettes (provisoire : l'équipe cheveux les refait) : 0 enlève, 1..5 = GLASSES ; 2 maillages (monture, verres)
export function putGlasses(g, i) {
  const h = g.userData.head; if (g.userData.glasses) { h.remove(g.userData.glasses); g.userData.glasses.traverse(m => { m.geometry?.dispose(); m.material?.dispose?.(); }); g.userData.glasses = null; } if (!i || !GLASSES[i]) return;
  const rp = reperesTete(g.userData.type), [, fc, lc] = GLASSES[i], gl = new THREE.Group(), fm = new THREE.MeshStandardMaterial({ color: fc, roughness: .3, metalness: i === 4 ? .8 : .1 });
  const lm = new THREE.MeshStandardMaterial({ color: lc, transparent: true, opacity: i === 3 ? .85 : .25, roughness: .05 }), e = rp.yeux, r = e[0].rayon * 1.55, z = Math.max(e[0].centre.z, e[1].centre.z) + e[0].rayon + .012, zo = rp.oreilles[0].z;
  const mont = [], verres = [];
  for (const y of e) { const c = y.centre, s = Math.sign(c.x); mont.push([new THREE.TorusGeometry(r, .0045, 6, 24), vecP(c.x, c.y, z)], [new THREE.BoxGeometry(.004, .005, z - zo), vecP(s * (rp.demiLargeur + .004), c.y + .004, (z + zo) / 2)]);
    verres.push([new THREE.CircleGeometry(r, 20), vecP(c.x, c.y, z)]); }
  mont.push([new THREE.TorusGeometry(Math.abs(e[0].centre.x) - r, .004, 6, 10, Math.PI), vecP(0, e[0].centre.y + .002, z)]);
  gl.add(fusionPieces(mont, fm), fusionPieces(verres, lm)); h.add(gl); g.userData.glasses = gl;
}
// bonnet et lunettes de natation (provisoire : l'équipe cheveux les refait) ; 3 maillages au plus
export function putSwimGear(g, x = {}) {
  const u = g.userData, h = u.head; if (u.bain) { h.remove(u.bain); u.bain.traverse(m => { m.geometry?.dispose(); m.material?.dispose?.(); }); u.bain = null; }
  if (u.cheveux) u.cheveux.visible = !x.bonnet; if (!x.bonnet && !x.lunettes) return;
  const rp = reperesTete(u.type), gr = new THREE.Group(), c = rp.centre, top = rp.haut.y, dl = rp.demiLargeur;
  if (x.bonnet) { const b = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 18, 0, Math.PI * 2, 0, Math.PI * .56), new THREE.MeshStandardMaterial({ color: x.bonnet, roughness: .35 }));
    b.scale.set(dl + .006, top - c.y + .006, (dl + .006) * 1.18); b.position.set(0, c.y, c.z - .012); b.rotation.x = -.3; gr.add(b); }
  if (x.lunettes) { const m = new THREE.MeshStandardMaterial({ color: x.lunettes, roughness: .3 }), v = new THREE.MeshStandardMaterial({ color: 0x9fd8ff, roughness: .05, metalness: .2, transparent: true, opacity: .55 }), cad = [], ve = [];
    for (const y of rp.yeux) { const p = vecP(y.centre.x, y.centre.y, y.centre.z + y.rayon * .9); ve.push([new THREE.SphereGeometry(y.rayon * 1.35, 16, 10), p, null, vecP(1.15, .8, .45)]); cad.push([new THREE.TorusGeometry(y.rayon * 1.4, .004, 6, 20), p, null, vecP(1.15, .8, 1)]); }
    cad.push([new THREE.TorusGeometry(1, .006, 6, 40), vecP(0, rp.yeux[0].centre.y + .01, c.z - .005), eulP(Math.PI / 2 - .12, 0, 0), vecP(dl + .008, (dl + .008) * 1.2, 1)]);
    gr.add(fusionPieces(cad, m), fusionPieces(ve, v)); }
  h.add(gr); u.bain = gr;
}
