// mannequin.js — un mannequin rapide (pièces rigides accrochées aux os du vrai squelette) pour juger l'animation :
// pieds avec talon et orteils, mains avec doigts, nez (orientation de la tête), t-shirt et short (jamais nu).
import * as THREE from "three";
import { squelette, typeDe, articulation } from "./squelette.js";
export { animPerson, liveFace } from "./anim.js";

const CACHE = new Map(), M = new Map();
const mat = c => { if (!M.has(c)) M.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: .7 })); return M.get(c); };
// une capsule de a à b (repère de l'os parent, pose zéro), rayons r0 → r1
function membre(a, b, r0, r1 = r0) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length(), g = new THREE.CylinderGeometry(r1, r0, L, 12, 1);
  const s0 = new THREE.SphereGeometry(r0, 12, 8).translate(0, -L / 2, 0), s1 = new THREE.SphereGeometry(r1, 12, 8).translate(0, L / 2, 0);
  const m = new THREE.Group(); for (const x of [g, s0, s1]) m.add(new THREE.Mesh(x)); m.position.copy(a).addScaledVector(d, .5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return m;
}
function boite(c, t, rot = [0, 0, 0]) { const m = new THREE.Group(); m.add(new THREE.Mesh(new THREE.BoxGeometry(...t))); m.position.set(...c); m.rotation.set(...rot); return m; }
function ovale(c, r) { const m = new THREE.Group(); m.add(new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14))); m.position.set(...c); m.scale.set(...r); return m; }
export function person(o) {
  const type = typeDe(o), { os, liste } = squelette(type), g = new THREE.Group(); g.add(os.corps);
  const J = n => new THREE.Vector3(...articulation(type, n)), rel = (n, p) => J(n).sub(J(p)), ad = type === "homme" || type === "femme";
  const peau = mat(o.skin ?? 0xf1c6a0), haut = mat(o.shirt ?? 0x2e86de), bas = mat(o.pants ?? 0x3a4a63), chau = mat(o.shoe ?? 0xffffff), chev = mat(o.hair ?? 0x5a3a22);
  const k = ad ? 1.1 : 1, put = (os_, obj, m) => { obj.traverse(x => { if (x.isMesh) { x.material = m; x.castShadow = true; x.receiveShadow = true; } }); os_.add(obj); };
  // tronc
  put(os.bassin, ovale([0, .02, -.01], [.185 * k, .14, .13 * k]), bas);
  put(os.colonne, ovale([0, .1, .0], [.16 * k, .16, .125 * k]), haut);
  put(os.poitrine, ovale([0, .1, .0], [.175 * k, .19, .13 * k]), haut);
  put(os.cou, membre(new THREE.Vector3(0, -.02, 0), rel("tete", "cou"), .062 * k), peau);
  put(os.tete, ovale([0, .14, .02], [.122 * k, .165 * k, .15 * k]), peau);
  put(os.tete, ovale([0, .22, -.01], [.13 * k, .1 * k, .155 * k]), chev);
  put(os.tete, boite([0, .12, .16 * k], [.03, .05, .05], [.3, 0, 0]), peau); // nez
  for (const c of ["_d", "_g"]) {
    const sx = c === "_d" ? -1 : 1;
    put(os["clavicule" + c], membre(new THREE.Vector3(), rel("bras" + c, "clavicule" + c), .045 * k), haut);
    put(os["bras" + c], membre(new THREE.Vector3(), rel("avantbras" + c, "bras" + c), .05 * k, .043 * k), haut);
    put(os["avantbras" + c], membre(new THREE.Vector3(), rel("main" + c, "avantbras" + c), .042 * k, .031 * k), peau);
    const dm = rel("doigts" + c, "main" + c);
    put(os["main" + c], boite([dm.x / 2, dm.y / 2, dm.z / 2], [.025, Math.abs(dm.y) + .02, .07]), peau);
    put(os["main" + c], membre(new THREE.Vector3(0, -.02, .03), new THREE.Vector3(-sx * .02, -.075, .055), .012), peau); // pouce
    put(os["doigts" + c], boite([0, -.045, 0], [.022, .09, .068]), peau);
    put(os["cuisse" + c], membre(new THREE.Vector3(), rel("jambe" + c, "cuisse" + c), .085 * k, .06 * k), bas);
    put(os["jambe" + c], membre(new THREE.Vector3(), rel("pied" + c, "jambe" + c), .062 * k, .038 * k), peau);
    const dp = rel("orteils" + c, "pied" + c), y0 = -J("pied" + c).y;
    put(os["pied" + c], boite([0, y0 / 2 + .005, (dp.z - .09) / 2], [.1 * k, -y0 + .01, dp.z + .09]), chau);
    put(os["orteils" + c], boite([0, -.012, .04], [.1 * k, .035, .08]), chau);
  }
  g.scale.setScalar(o.scale ?? .76); g.rotation.order = "YXZ"; os.tete.scale.setScalar(o.tete ?? 1);
  g.userData = { type, os, female: !!o.long, legs: [os.cuisse_d, os.cuisse_g], arms: [os.bras_d, os.bras_g], knees: [os.jambe_d, os.jambe_g], elbows: [os.avantbras_d, os.avantbras_g], head: os.tete, lids: [], blink: 3,
    skinColor: o.skin ?? 0xf1c6a0, hairColor: o.hair ?? 0x5a3a22, capColor: o.cap, clothes: { shirt: o.shirt, pants: o.pants, shoe: o.shoe } };
  return g;
}
export function setOutfit(g, id) {}
export function putGlasses(g, i) {}
export function putSwimGear(g, x) {}
