// lab.js — scène d'essai des personnages, éclairée comme le jeu (ciel, soleil, lumière du ciel, ACES 0,85).
// Paramètres d'adresse : ?scene=habits&v=neuf|ancien|deux&vue=face|34|profil|dos|visage|haut&mode=walk&t=0&vit=1.3&n=8
import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";
import * as J from "./jeu.js";
import { SCENES } from "./scenarios.js";
// scènes en plus, une par équipe (fichiers facultatifs) : scenarios-corps.js, scenarios-anim.js…
for (const n of ["corps", "visage", "anim", "mat", "habits", "cheveux", "integration"]) { try { Object.assign(SCENES, (await import(`./scenarios-${n}.js`)).SCENES); } catch (e) { if (!/Failed to fetch|404|Importing a module script failed/.test(String(e))) console.error("scenarios-" + n + " : " + (e.stack || e)); } }

const Q = new URLSearchParams(location.search), $ = id => document.getElementById(id);
const info = t => $("info").textContent = t, erreur = t => { const e = $("err"); e.style.display = "block"; e.textContent += t + "\n"; console.error(t); };
addEventListener("error", e => erreur("Erreur : " + e.message + (e.filename ? " (" + e.filename.split("/").pop() + ":" + e.lineno + ")" : "")));
addEventListener("unhandledrejection", e => erreur("Erreur : " + (e.reason?.stack || e.reason)));

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .85;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = J.LOWQ ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(Number(Q.get("fov") || 28), innerWidth / innerHeight, .05, 2000);
const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(Number(Q.get("soleilH") || 48)), THREE.MathUtils.degToRad(Number(Q.get("soleilA") || 210)));
const sky = new Sky(); sky.scale.setScalar(1000); Object.assign(sky.material.uniforms, {}); { const u = sky.material.uniforms; u.turbidity.value = 4.5; u.rayleigh.value = 1.1; u.mieCoefficient.value = .004; u.mieDirectionalG.value = .86; u.sunPosition.value.copy(sunDir); }
scene.add(sky);
{ const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene(), s2 = new Sky(); s2.scale.setScalar(500); s2.material.uniforms.sunPosition.value.copy(sunDir); es.add(s2);
  const eg = new THREE.Mesh(new THREE.CircleGeometry(400, 32), new THREE.MeshBasicMaterial({ color: 0x4f7a3a })); eg.rotation.x = -Math.PI / 2; eg.position.y = -5; es.add(eg);
  scene.environment = pm.fromScene(es, .02).texture; scene.environmentIntensity = .75; }
scene.add(new THREE.HemisphereLight(0xd6eaff, 0x5f7f3e, .7));
const sun = new THREE.DirectionalLight(0xfff0d6, 3); sun.castShadow = true; sun.shadow.mapSize.setScalar(2048);
Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 80 }); sun.shadow.bias = -.0004; sun.shadow.normalBias = .02;
scene.add(sun, sun.target);
const sol = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: Q.get("sol") === "herbe" ? 0x6f9a4a : 0xd8d0c2, roughness: .95 }));
sol.rotation.x = -Math.PI / 2; sol.receiveShadow = true; scene.add(sol);

// les personnages : nouvelle version, ancienne, ou les deux (ancienne à gauche / derrière)
// une scène peut renvoyer une liste d'acteurs, ou { module: "./perso/mannequin.js", acteurs: [...] } pour essayer
// un autre module (qui exporte person/animPerson…), ou { custom: async ctx => [{ g, a }] } pour tout faire soi-même
const v = Q.get("v") || "neuf", scen = SCENES[Q.get("scene") || "habits"];
if (!scen) erreur("scène inconnue : " + Q.get("scene") + " (scènes : " + Object.keys(SCENES).join(", ") + ")");
let res = scen ? scen(Q, J) : []; if (res instanceof Promise) res = await res;
const acteurs = Array.isArray(res) ? res : res.acteurs || [];
async function charger(nom) { try { return await import(nom === "ancien" ? "./ancien/ancien.js" : res.module || "./perso/index.js"); } catch (e) { erreur("Module " + nom + " : " + (e.stack || e)); return null; } }
const MODS = {}; if (!res.custom) for (const n of v === "deux" ? ["ancien", "neuf"] : [v]) MODS[n] = await charger(n);

const stats = { construction_ms: 0, personnages: 0, parPerso: [] };
function fabriquer(P, a) {
  const o = a.look ? J.optsDePerso({ sexe: a.sexe || "g", look: a.look }, a.o || {}) : { ...a.o };
  const t0 = performance.now(), g = P.person(o), ms = performance.now() - t0; stats.construction_ms += ms; stats.personnages++;
  if (o.lunettes && P.putGlasses) P.putGlasses(g, o.lunettes);
  if (a.lunettes && P.putGlasses) P.putGlasses(g, a.lunettes);
  if (a.tenue !== undefined && P.setOutfit) P.setOutfit(g, a.tenue);
  if (a.bain && P.putSwimGear) P.putSwimGear(g, a.bain);
  g.userData.sansTransition = true; // pas de fondu entre deux poses : la pose demandée tout de suite
  let tri = 0, appels = 0; g.traverse(m => { if (m.isMesh && m.visible) { appels++; tri += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; } });
  stats.parPerso.push({ nom: a.nom || "", ms: Math.round(ms * 10) / 10, triangles: Math.round(tri), maillages: appels });
  return g;
}
const vue = Q.get("vue") || "face", ROT = { face: 0, "34": -Math.PI / 4, "34g": Math.PI / 4, profil: -Math.PI / 2, profilg: Math.PI / 2, dos: Math.PI, visage: 0, haut: 0 };
const groupes = [], noms = Object.keys(MODS);
if (res.custom) { try { for (const x of await res.custom({ THREE, scene, J, Q, renderer, camera })) { if (!x.g.parent) scene.add(x.g); groupes.push({ a: {}, P: {}, ...x }); } } catch (e) { erreur("custom : " + (e.stack || e)); } }
noms.forEach((n, k) => {
  const P = MODS[n]; if (!P) return;
  acteurs.forEach((a, i) => {
    let g; try { g = fabriquer(P, a); } catch (e) { erreur(n + " / " + (a.nom || i) + " : " + (e.stack || e)); return; }
    g.position.set(a.x ?? i * 1.1, a.y ?? 0, (a.z ?? 0) - (noms.length > 1 && k === 0 ? 2.2 : 0));
    g.rotation.y = (a.ry ?? 0) + (ROT[vue] ?? 0); if (a.rx) g.rotation.x = a.rx;
    scene.add(g); groupes.push({ g, a, P });
  });
});
const temps = Number(Q.get("t") || 0);
function animer(dt = 1 / 60) {
  for (const { g, a, P } of groupes) {
    const an = a.anim || { mode: "idle", t: 0 };
    if (P.animPerson) { try { P.animPerson(g, an.mode, an.t ?? temps, an.v); } catch (e) { erreur("animPerson : " + (e.stack || e)); } }
    if (a.rx !== undefined) g.rotation.x = a.rx;
    if (an.apres) an.apres(g);
    if (P.liveFace && !a.yeuxFermes) try { P.liveFace(g, dt); } catch (e) { erreur("liveFace : " + (e.stack || e)); }
  }
}
// cadrage automatique : tout le monde entre dans l'image (ou seulement les têtes pour la vue « visage »)
function cadrer() {
  const b = new THREE.Box3(); for (const { g } of groupes) { g.updateMatrixWorld(true); b.expandByObject(g); }
  if (b.isEmpty()) b.set(new THREE.Vector3(-1, 0, -1), new THREE.Vector3(1, 1.5, 1));
  const c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3());
  if (vue === "visage") { // les têtes : en haut de la boîte
    const hy = b.max.y - (groupes[0]?.g.scale.y || .6) * .22; c.y = hy; s.y = (groupes[0]?.g.scale.y || .6) * .62; }
  const asp = innerWidth / innerHeight, fov = THREE.MathUtils.degToRad(camera.fov), marge = Number(Q.get("marge") || 1.12);
  const d = Math.max(s.y * marge / 2 / Math.tan(fov / 2), s.x * marge / 2 / Math.tan(fov / 2) / asp) + s.z / 2;
  const haut = vue === "haut" ? 1 : Number(Q.get("cy") || .12);
  camera.position.set(c.x, c.y + d * haut, c.z + d); camera.lookAt(c.x, c.y, c.z);
  sun.position.copy(c).addScaledVector(sunDir, 30); sun.target.position.copy(c);
  const r = Math.max(s.x, s.y, s.z) * .8 + 1; Object.assign(sun.shadow.camera, { left: -r, right: r, top: r, bottom: -r }); sun.shadow.camera.updateProjectionMatrix();
}
let images = 0; const N = Number(Q.get("images") || 6);
for (let i = 0; i < 40; i++) animer(1 / 60); // pour les transitions et le visage
cadrer();
function boucle() {
  animer(1 / 60); renderer.render(scene, camera); images++;
  if (images === N) {
    stats.triangles_rendus = renderer.info.render.triangles; stats.appels_dessin = renderer.info.render.calls;
    window.labStats = stats; window.labPret = true;
    info(`${Q.get("scene") || "habits"} · ${v} · vue ${vue} · ${stats.personnages} perso · ${Math.round(stats.construction_ms)} ms · ${stats.triangles_rendus} tri · ${stats.appels_dessin} appels`);
  }
  if (Q.get("anime") || images < N) requestAnimationFrame(boucle);
}
window.lab = { THREE, scene, camera, renderer, MODS, groupes, animer, cadrer, rendre: () => renderer.render(scene, camera), J };
boucle();
