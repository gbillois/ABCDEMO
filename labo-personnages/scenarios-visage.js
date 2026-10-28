// scenarios-visage.js — scènes de l'équipe visage : têtes seules (SDF maillé ici), yeux, paupières, oreilles, sourcils.
//   scene=tetes&types=garcon,fille,femme,homme&peaux=1,3,5&yeux=0,1&vues=face,34,profil&h=.0025&ferme=1&nu=1
//   &cadre=oeil|oreille|bouche|nez|visage (gros plan)   &regard=x,y (yeux tournés)   &cligne=.5 (paupières mi-closes)
import * as THREE from "three";
import { sdfTete, sdfTeteFermee, sdfTeteLegere, maillerSDF, oreilles, reperesTete } from "./perso/tete.js";
import { construireVisage } from "./perso/visage.js";
import { matPeau } from "./perso/materiaux.js";
import { squelette } from "./perso/squelette.js";

const GEO = new Map(), hauteurTete = os => { let y = 0; for (let b = os.tete; b && b.isBone; b = b.parent) y += b.position.y; return y; };
function teteSeule(type, h, ferme) {
  const k = type + h + ferme; if (GEO.has(k)) return GEO.get(k);
  const f = ferme === "l" ? (x, y, z) => sdfTeteLegere(x, y, z, type) : ferme ? (x, y, z) => sdfTeteFermee(x, y, z, type) : (x, y, z) => sdfTete(x, y, z, type);
  const g = maillerSDF(f, -.15, -.1, -.19, .15, .32, .24, h, (x, y, z) => y > -.085); GEO.set(k, g); return g;
}
const ROT = { dos34: -2.4, face: 0, "34": -Math.PI / 4, "34g": Math.PI / 4, profil: -Math.PI / 2, profilg: Math.PI / 2, dos: Math.PI, haut: 0, bas: 0 };
// gros plans : point visé (repère de la tête) et taille du champ
const CADRES = { oeil: R => [R.yeux[0].centre.clone().add(new THREE.Vector3(.004, .006, .02)), .085], oreille: R => [R.oreilles[1].clone().add(new THREE.Vector3(.02, .005, -.02)), .16],
  bouche: R => [R.bouche.clone(), .09], nez: R => [R.nez.clone().add(new THREE.Vector3(0, .02, -.01)), .1], visage: R => [R.centre.clone().add(new THREE.Vector3(0, -.02, .05)), .3], yeux: R => [R.nasion.clone(), .15], coin: R => [R.yeux[0].centre.clone().add(new THREE.Vector3(-.018, .004, .01)), .035], joue: R => [new THREE.Vector3(-.095, .07, .03), .08], coinint: R => [R.yeux[0].centre.clone().add(new THREE.Vector3(.018, .0, .01)), .035] };
export const SCENES = {
  tetes: Q => ({ custom: async ({ J, camera }) => {
    const types = (Q.get("types") || "garcon,fille,femme,homme").split(","), peaux = (Q.get("peaux") || "1").split(",").map(Number), yeux = (Q.get("yeux") || "0").split(",").map(Number);
    const cheveux = (Q.get("cheveux") || "2").split(",").map(Number), h = Number(Q.get("h") || .0025), out = [];
    const vues = (Q.get("vues") || Q.get("vue") || "face").split(","), liste = [], cadre = CADRES[Q.get("cadre")];
    for (const t of types) for (const p of peaux) for (const e of yeux) for (const v of vues) liste.push([t, p, e, v]);
    const dx = Number(Q.get("dx") || (cadre ? .4 : .26));
    liste.forEach(([type, p, e, vue], i) => {
      const { os } = squelette(type), g = new THREE.Group(); g.add(os.corps);
      const adulte = type === "femme" || type === "homme", sc = adulte ? .76 : .6, skin = J.PEAUX[p], peau = matPeau(skin);
      g.userData = { os, type, mats: { peau }, head: os.tete };
      const m = new THREE.Mesh(teteSeule(type, h, Q.get("leger") ? "l" : Q.get("ferme") === "1"), peau); m.castShadow = m.receiveShadow = Q.get("ombres") !== "0"; os.tete.add(m);
      if (!Q.get("sansOreilles")) { const o = new THREE.Mesh(oreilles(type, Q.get("leger") ? "leger" : "plein"), peau); o.castShadow = true; os.tete.add(o); }
      const o = { long: type === "fille" || type === "femme", skin, eyes: J.YEUX[e], hair: J.CHEVEUX[cheveux[i % cheveux.length]], adulte };
      if (!Q.get("nu")) try { g.userData.visage = construireVisage(g, os, type, o, Q.get("leger") ? "leger" : "plein"); } catch (err) { console.error("visage : " + (err.stack || err)); }
      if (Q.get("debug") && g.userData.visage) { const V = g.userData.visage; if (V.paupieres) V.paupieres.material = new THREE.MeshStandardMaterial({ color: 0xd04040, roughness: .6 }); if (Q.get("debug") === "2" && V.details) V.details.visible = false; }
      g.scale.setScalar(sc); g.position.x = (i - (liste.length - 1) / 2) * dx; g.rotation.y = ROT[vue] ?? 0;
      g.position.y = 1.2 - hauteurTete(os) * sc; // toutes les têtes à la même hauteur
      if (vue === "bas") g.rotation.x = -.5; if (vue === "haut") g.rotation.x = .5;
      const V = g.userData.visage, rgs = Q.get("regards"), cls = Q.get("clignes"), rg = rgs ? rgs.split(";")[i % rgs.split(";").length] : Q.get("regard"), cl = cls ? cls.split(",")[i % cls.split(",").length] : Q.get("cligne");
      const apres = gg => { if (V && rg) V.regard?.(...rg.split(",").map(Number)); if (V && cl) V.fermer?.(Number(cl)); };
      out.push({ g, a: { anim: { mode: "idle", apres } }, P: { liveFace: (gg, dt) => gg.userData.visage?.animer?.(dt) } });
    });
    // gros plan : la caméra vise la même pièce sur toutes les têtes (après le cadrage du labo, à chaque image)
    if (cadre) { const c0 = out[0].a.anim.apres; out[0].a.anim.apres = gg => { c0(gg);
      const pts = out.map(({ g }) => { g.updateMatrixWorld(true); return g.userData.os.tete.localToWorld(cadre(reperesTete(g.userData.type))[0]); });
      const c = pts.reduce((a, b) => a.add(b), new THREE.Vector3()).multiplyScalar(1 / pts.length), [, taille] = cadre(reperesTete(liste[0][0]));
      const L = taille * out[0].g.scale.x * Number(Q.get("marge") || 1), w = Math.max(L, (pts.length - 1) * dx + L) / camera.aspect;
      const d = Math.max(L, w) / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
      camera.position.set(c.x, c.y + d * .05, c.z + d); camera.lookAt(c); camera.near = d * .2; camera.updateProjectionMatrix(); }; }
    return out; } }),
};
// gros plan du visage sur le vrai corps (perso/index.js) : &types=garcon,fille,femme,homme&peaux=1&vue=face|34|profil&champ=.3
SCENES.visagesCorps = Q => ({ custom: async ({ THREE, scene, J, camera }) => {
  const P = await import("./perso/index.js"), types = (Q.get("types") || "garcon,fille,femme,homme").split(","), peaux = (Q.get("peaux") || "1").split(",").map(Number), out = [];
  const vue = ROT[Q.get("vue") || "face"] ?? 0, yeux = (Q.get("yeux") || "0,1,2,3").split(",").map(Number), dx = Number(Q.get("dx") || .26); let i = 0;
  for (const t of types) for (const p of peaux) { const ad = t === "femme" || t === "homme", o = { long: t === "fille" || t === "femme", adulte: ad, scale: ad ? .76 : .6, skin: J.PEAUX[p], eyes: J.YEUX[yeux[i % yeux.length]], hair: J.CHEVEUX[[2, 6, 1, 4][i % 4]], shirt: 0x2e86de, pants: 0x1f2a44, shorts: true, lite: Q.has("leger") };
    const g = P.person(o); g.position.x = i * dx; g.rotation.y = vue; if (Q.get("incl")) g.rotation.x = Number(Q.get("incl")); g.updateMatrixWorld(true); g.position.y = 1.2 - g.userData.os.tete.getWorldPosition(new THREE.Vector3()).y; out.push({ g, a: { anim: { mode: "idle" } }, P }); i++; }
  const dbg = Q.get("debug") || ""; for (const { g } of out) { const V = g.userData.visage; if (!V) continue;
    if (dbg.includes("r") && V.paupieres) V.paupieres.material = new THREE.MeshStandardMaterial({ color: 0xd04040, roughness: .6 });
    if (dbg.includes("d") && V.details) V.details.visible = false; if (dbg.includes("c") && g.userData.corps) g.userData.corps.visible = false;
    if (dbg.includes("f") && g.userData.corps) { const m = g.userData.corps.material.clone(); m.wireframe = true; g.userData.corps.material = m; } }
  const champ = Number(Q.get("champ") || .3);
  out[0].a.anim.apres = () => { let c = new THREE.Vector3(); for (const { g } of out) { g.updateMatrixWorld(true); c.add(g.userData.os.tete.localToWorld(new THREE.Vector3(0, Number(Q.get("cy") ?? .1), .06))); } c.multiplyScalar(1 / out.length);
    const L = champ * .6, w = ((out.length - 1) * dx + L) / camera.aspect, d = Math.max(L, w) / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    camera.position.set(c.x, c.y + d * .05, c.z + d); camera.lookAt(c); camera.near = d * .2; camera.updateProjectionMatrix(); };
  return out; } });
