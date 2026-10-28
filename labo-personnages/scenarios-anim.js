// scenarios-anim.js — scènes de l'équipe « animation ». &mod=man (mannequin.js) | tmp (index.tmp.js) | rien (index.js)
//   aCycle : n images d'un cycle (&mode=walk&vit=1.3&n=8&vue=profil) ; aRepos : le repos au fil du temps (&n=6&pas=1.5)
//   aModes : chaque mode assis / véhicule avec une copie simplifiée de l'objet du jeu (&quoi=velo,kart,…)
//   aVelo : le pédalage sur plusieurs angles de manivelle (&quoi=velo|pedalo)
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
const MOD = Q => ({ man: "./perso/mannequin.js", tmp: "./perso/index.tmp.js" })[Q.get("mod")] || (Q.get("mod") ? "./perso/" + Q.get("mod") + ".js" : "./perso/index.js");
const LOOK = Q => (Q.get("look") || "1,2,0,0,1,1,0,0,5,2,1,0,1").split(",").map(Number);
const opts = (Q, J, extra = {}) => J.optsDePerso({ sexe: Q.get("sexe") || "g", look: LOOK(Q) }, extra);

// ---- les objets du jeu (dimensions copiées de pins/index.html), en version simple
const M = J => ({ blanc: J.mat(0xf4f6f6, .4), bleu: J.mat(0x1f6fb2, .4), sombre: J.mat(0x2d3436, .5, { metalness: .4 }), noir: J.mat(0x1d1d1d, .7), acier: J.mat(0xcfd3d6, .3, { metalness: .8 }),
  rouge: J.mat(0xe74c3c, .3, { metalness: .4 }), bois: J.mat(0x8a5a35, .8), orange: J.mat(0xfb8500, .4), brun: J.mat(0x9a5a2c, .8), cuir: J.mat(0x5a3520, .7), selle: J.mat(0xc0392b, .6) });
const rbox = (w, h, d, m, r = .03) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2)), m);
const ombres = o => (o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }), o);
function tube(g, a, b, r, m) { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 10), m);
  c.position.copy(A).addScaledVector(d, .5); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); g.add(c); return c; }
function velo(K) { // makeBike
  const g = new THREE.Group(), R = .31, wheels = [];
  for (const z of [.52, -.52]) { const w = new THREE.Group(); w.position.set(0, R, z); const t = new THREE.Mesh(new THREE.TorusGeometry(R, .034, 10, 40), K.noir); t.rotation.y = Math.PI / 2; w.add(t); g.add(w); wheels.push(w); }
  const BB = [0, .3, -.02], SE = [0, .76, -.24], HT = [0, .8, .34], HB = [0, .62, .4];
  tube(g, BB, SE, .022, K.rouge); tube(g, SE, HT, .02, K.rouge); tube(g, BB, HB, .025, K.rouge); tube(g, HB, HT, .028, K.rouge); tube(g, [0, R, -.52], BB, .012, K.rouge); tube(g, [0, R, .52], HB, .013, K.acier);
  tube(g, SE, [0, .84, -.27], .016, K.acier); const sad = rbox(.13, .06, .27, K.noir); sad.position.set(0, .86, -.28); g.add(sad);
  tube(g, HT, [0, .92, .3], .018, K.acier); tube(g, [-.26, .93, .3], [.26, .93, .3], .016, K.acier);
  for (const s of [-1, 1]) { const gr = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, .1, 10), K.noir); gr.rotation.z = Math.PI / 2; gr.position.set(s * .24, .93, .3); g.add(gr); }
  const crank = new THREE.Group(); crank.position.set(0, .3, -.02);
  for (const s of [-1, 1]) { const arm = rbox(.02, .17, .03, K.acier, .008); arm.position.set(s * .09, s * .08, 0); crank.add(arm); const ped = rbox(.1, .025, .07, K.noir, .01); ped.position.set(s * .14, s * .16, 0); crank.add(ped); }
  g.add(crank); g.userData = { wheels, crank }; g.rotation.order = "YXZ"; return ombres(g);
}
function kart(K) { // makeKart
  const g = new THREE.Group(), wheels = [];
  const ch = rbox(1.1, .1, 1.95, K.sombre, .04); ch.position.y = .14; g.add(ch);
  const nose = rbox(1.0, .24, .55, K.rouge, .1); nose.position.set(0, .28, .82); g.add(nose);
  for (const s of [-1, 1]) { const pod = rbox(.24, .22, .95, K.rouge, .08); pod.position.set(s * .52, .26, -.05); g.add(pod); }
  const seat = rbox(.5, .08, .5, K.sombre, .03); seat.position.set(0, .3, -.3); g.add(seat); const sb = rbox(.5, .52, .08, K.sombre, .04); sb.position.set(0, .56, -.58); sb.rotation.x = -.25; g.add(sb);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .42, 8), K.sombre); col.position.set(0, .45, .38); col.rotation.x = .9; g.add(col);
  const sw = new THREE.Mesh(new THREE.TorusGeometry(.13, .025, 8, 22), K.noir); sw.position.set(0, .58, .24); sw.rotation.x = -1.0; g.add(sw);
  for (const [x, z, r, w] of [[-.6, .66, .17, .16], [.6, .66, .17, .16], [-.62, -.62, .2, .22], [.62, -.62, .2, .22]]) { const wg = new THREE.Group(); wg.position.set(x, r, z); const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 22), K.noir); t.rotation.z = Math.PI / 2; wg.add(t); g.add(wg); wheels.push(wg); }
  g.userData.wheels = wheels; return ombres(g);
}
function pedalo(K) { // makePedalo
  const g = new THREE.Group();
  for (const s of [-1, 1]) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(.42, 2.7, 8, 24), K.blanc); f.scale.set(1, 1, .72); f.rotation.x = Math.PI / 2; f.position.set(s * .98, .2, 0); g.add(f); }
  const deck = rbox(2.3, .12, 2.7, K.blanc, .06); deck.position.y = .48; g.add(deck);
  for (const sx of [-.48, .48]) { const seat = rbox(.72, .14, .62, K.bleu, .08); seat.position.set(sx, .64, -.2); const back = rbox(.72, .62, .1, K.bleu, .06); back.position.set(sx, .98, -.55); back.rotation.x = -.25; g.add(seat, back); }
  const box = rbox(1.6, .34, .55, K.blanc, .1); box.position.set(0, .7, .72); box.material = K.blanc.clone(); box.material.transparent = true; box.material.opacity = .45; g.add(box);
  const crank = new THREE.Group(); crank.position.set(0, .78, .55);
  for (const sx of [-.48, .48]) for (const k of [0, 1]) { const arm = rbox(.04, .22, .04, K.sombre, .01); arm.position.set(sx + (k ? .08 : -.08), k ? .1 : -.1, 0); crank.add(arm); const ped = rbox(.14, .03, .2, K.sombre, .01); ped.position.set(sx + (k ? .1 : -.1), k ? .2 : -.2, 0); crank.add(ped); }
  g.add(crank);
  const lever = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .6, 10), K.sombre); lever.position.set(0, .9, -.05); lever.rotation.x = .3; const knob = new THREE.Mesh(new THREE.SphereGeometry(.06, 14, 10), K.rouge); knob.position.set(0, 1.18, .04); g.add(lever, knob);
  g.userData = { crank }; return ombres(g);
}
function bouee(K) { const g = new THREE.Group(), t = new THREE.Mesh(new THREE.TorusGeometry(.55, .22, 16, 36), K.orange); t.rotation.x = Math.PI / 2; g.add(t);
  for (const a of [0, Math.PI]) { const h = new THREE.Mesh(new THREE.TorusGeometry(.12, .025, 6, 14), K.sombre); h.position.set(Math.cos(a) * .55, .2, Math.sin(a) * .55); h.rotation.y = a; g.add(h); } return ombres(g); }
function poney(K) { // makePony, simplifié : tonneau, encolure, croupe, selle, étriers, tête, pattes
  const g = new THREE.Group(), cap = (r, l, p, rx = 0, m = K.brun) => { const c = new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 6, 18), m); c.position.set(...p); c.rotation.x = rx; g.add(c); return c; };
  cap(.4, .95, [0, 1.08, 0], Math.PI / 2).scale.set(1, 1.05, 1); cap(.2, .55, [0, 1.5, .74], .6).scale.set(1, 1, 1.2); const cr = new THREE.Mesh(new THREE.SphereGeometry(.36, 18, 12), K.brun); cr.position.set(0, 1.12, -.55); g.add(cr);
  const h = cap(.14, .44, [0, 1.9 - .13, 1.0 + .2], -1.15);
  for (const [x, z] of [[-.2, .55], [.2, .55], [-.2, -.55], [.2, -.55]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.075, .07, .96, 10), K.brun); l.position.set(x, .48, z); g.add(l); }
  const s1 = rbox(.66, .05, .8, K.selle, .02); s1.position.set(0, 1.47, .02); const s2 = rbox(.5, .1, .6, K.cuir, .04); s2.position.set(0, 1.52, .02); const po = new THREE.Mesh(new THREE.SphereGeometry(.06), K.cuir); po.position.set(0, 1.6, .28);
  const ca = rbox(.5, .14, .1, K.cuir, .04); ca.position.set(0, 1.6, -.26); g.add(s1, s2, po, ca);
  for (const s of [-1, 1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(.03, .55, .05), K.cuir); st.position.set(s * .43, 1.2, .05); st.rotation.z = s * .1; g.add(st); const ri = new THREE.Mesh(new THREE.TorusGeometry(.07, .016, 6, 14), K.acier); ri.position.set(s * .46, .9, .05); ri.rotation.y = Math.PI / 2; g.add(ri); }
  return ombres(g);
}
function chaiseTable(K) { // la terrasse du cottage : plancher à 0,2, chaise (assise à 0,55), table ronde à 1,05 m devant
  const g = new THREE.Group(), ch = new THREE.Group(), seat = rbox(.5, .07, .5, K.bois); seat.position.y = .55; const back = rbox(.5, .55, .06, K.bois); back.position.set(0, .85, -.23); ch.add(seat, back);
  for (const sx of [-.2, .2]) for (const sz of [-.2, .2]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .55, 6), K.bois); l.position.set(sx, .28, sz); ch.add(l); }
  ch.position.y = .2; g.add(ch); const top = new THREE.Mesh(new THREE.CylinderGeometry(.8, .8, .06, 40), K.bois); top.position.set(0, .98, 1.05); const ft = new THREE.Mesh(new THREE.CylinderGeometry(.07, .32, .76, 16), K.bois); ft.position.set(0, .58, 1.05);
  const pl = new THREE.Mesh(new THREE.BoxGeometry(2, .2, 2.4), K.blanc); pl.position.set(0, .1, .5); g.add(top, ft, pl); return ombres(g);
}
function transat(K) { const l = new THREE.Group(), fr = rbox(.75, .12, 1.9, K.blanc, .05); fr.position.y = .38; const cu = rbox(.68, .1, 1.3, K.bleu, .05); cu.position.set(0, .48, .25); const bk = rbox(.68, .1, .8, K.bleu, .05); bk.position.set(0, .7, -.62); bk.rotation.x = .7;
  l.add(fr, cu, bk); for (const sx of [-.3, .3]) for (const sz of [-.8, .8]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .38, 8), K.acier); leg.position.set(sx, .19, sz); l.add(leg); } l.position.y = .2; const g = new THREE.Group(); g.add(l); return ombres(g); }
function echelle(K) { const g = new THREE.Group(); for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 4, 8), K.acier); r.position.set(s * .34, 2, 0); g.add(r); }
  for (let i = 0; i < 11; i++) { const r = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .68, 6), K.acier); r.rotation.z = Math.PI / 2; r.position.set(0, .35 + i * .36, 0); g.add(r); } return ombres(g); }
function eau(y) { const m = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), new THREE.MeshStandardMaterial({ color: 0x42cbef, roughness: .05, transparent: true, opacity: .45, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = y; m.renderOrder = 1; const g = new THREE.Group(); g.add(m); return g; }
function toboggan(K) { const g = new THREE.Group(), p = rbox(.9, .06, 3, K.bleu, .02); p.rotation.x = .35; p.position.set(0, .55, 0); g.add(p); return ombres(g); }

// ---- les stations : objet + personnage, placés comme dans le jeu
const STATIONS = {
  velo: (K, P, o, a) => { const b = velo(K); b.userData.crank.rotation.x = a; const g = P.person(o); g.position.set(0, .33, -.27); return { obj: b, g, an: { mode: "bike", t: a }, monde: true }; },
  cycliste: (K, P, o, a) => { const b = velo(K); b.userData.crank.rotation.x = a; const g = P.person({ ...o, scale: .7, adulte: true }); g.position.set(0, .24, -.27); b.add(g); return { obj: b, g, an: { mode: "bike", t: a } }; },
  kart: (K, P, o) => { const k = kart(K), g = P.person(o); g.position.set(0, -.2, -.3); return { obj: k, g, an: { mode: "kart", t: 0 }, monde: true }; },
  pedalo: (K, P, o, a) => { const b = pedalo(K); b.userData.crank.rotation.x = a; const g = P.person(o); g.position.set(-.48, .18, 0); return { obj: b, g, an: { mode: "pedal", t: a }, monde: true }; },
  poney: (K, P, o) => { const p = poney(K), g = P.person(o); g.position.set(0, 1.03, .05); return { obj: p, g, an: { mode: "saddle", t: 0 }, monde: true }; },
  bouee: (K, P, o) => { const b = bouee(K); b.position.y = .75; const g = P.person({ ...o }); g.position.set(0, .75 - .62, 0); return { obj: b, g, an: { mode: "buoy", t: 0 }, monde: true, maillot: true }; },
  chaise: (K, P, o) => { const c = chaiseTable(K), g = P.person(o); g.position.set(0, .27, 0); return { obj: c, g, an: { mode: "sit", t: 0 }, monde: true }; },
  transat: (K, P, o) => { const c = transat(K), g = P.person(o); g.position.set(0, .8, .78); return { obj: c, g, an: { mode: "lie", t: 0 }, monde: true, maillot: true }; },
  echelle: (K, P, o, a) => { const e = echelle(K), g = P.person(o); g.position.set(0, .9, -.35); return { obj: e, g, an: { mode: "climb", t: a }, monde: true, maillot: true }; },
  toboggan: (K, P, o) => { const e = toboggan(K), g = P.person(o); g.position.set(0, .45, .3); return { obj: e, g, an: { mode: "ride", t: 0 }, monde: true, maillot: true }; },
  // l'eau : nage rapide à y = −0,42 et sur-place à −0,98 sous la surface (−0,22) dans le jeu
  nage: (K, P, o, a) => { const g = P.person(o); g.position.set(0, .55, -.6); return { obj: eau(.55 + .2), g, an: { mode: "swim", t: a }, monde: true, maillot: true }; },
  surplace: (K, P, o, a) => { const g = P.person(o); g.position.set(0, .4, 0); return { obj: eau(.4 + .76), g, an: { mode: "tread", t: a }, monde: true, maillot: true }; },
  saut: (K, P, o, a) => { const g = P.person(o); g.position.set(0, .3, 0); return { obj: null, g, an: { mode: "jump", t: 0, v: a }, monde: true }; },
};
async function stations(ctx, liste, angles) {
  const { THREE: T, J, Q } = ctx, P = await import(MOD(Q)), K = M(J), out = [], dx = Number(Q.get("dx") || 2.4), ry = { face: 0, "34": -Math.PI / 4, "34g": Math.PI / 4, profil: -Math.PI / 2, profilg: Math.PI / 2, dos: Math.PI }[Q.get("vue") || "34"] ?? 0;
  liste.forEach((nom, i) => {
    const a = angles ? angles[i] : Number(Q.get("t") || .7), st = STATIONS[nom](K, P, opts(Q, J, Q.get("adulte") ? { adulte: true, scale: .76 } : {}), a);
    const base = new T.Group(); base.position.x = (i - (liste.length - 1) / 2) * dx; base.rotation.y = ry; ctx.scene.add(base);
    if (st.obj) base.add(st.obj); if (st.monde || !st.obj) base.add(st.g);
    if (st.maillot && P.setOutfit) P.setOutfit(st.g, Q.get("tenue") || "rouge"); else if (Q.get("tenue") && P.setOutfit) P.setOutfit(st.g, Q.get("tenue"));
    st.g.userData.sansTransition = true; out.push({ g: st.g, a: { anim: st.an }, P });
  });
  return out;
}
const rang = (l, dx = .75) => l.map((a, i) => ({ x: (i - (l.length - 1) / 2) * dx, ...a }));
export const SCENES = {
  // un cycle : &mode=walk&vit=6.5&n=8 (t = i/n · 2π) ; &periode=… ; &sexe=f ; &adulte=1
  aCycle: (Q, J) => { const n = Number(Q.get("n") || 8), mode = Q.get("mode") || "walk", v = Q.get("vit") ? Number(Q.get("vit")) : undefined, per = Number(Q.get("periode") || Math.PI * 2);
    return { module: MOD(Q), acteurs: rang([...Array(n)].map((_, i) => ({ nom: mode + " " + i, ...(Q.get("adulte") ? { o: { long: Q.get("sexe") === "f", adulte: true, scale: .76, shirt: 0x2e86de, pants: 0x3a4a63 } } : { sexe: Q.get("sexe") || "g", look: LOOK(Q) }),
      tenue: Q.get("tenue") || undefined, anim: { mode, t: i / n * per + Number(Q.get("t") || 0), v: mode === "jump" ? 6 - 12 * i / Math.max(1, n - 1) : v } })), Number(Q.get("dx") || .75)) }; },
  // le repos au fil du temps : n copies à t0 + i·pas secondes (g.userData.horloge)
  aRepos: (Q, J) => { const n = Number(Q.get("n") || 6), pas = Number(Q.get("pas") || 1.5), t0 = Number(Q.get("t0") || 10), mode = Q.get("mode") || "idle";
    return { module: MOD(Q), acteurs: rang([...Array(n)].map((_, i) => ({ nom: "repos " + i, ...(Q.get("adulte") ? { o: { long: Q.get("sexe") === "f", adulte: true, scale: .76, shirt: 0x16a085, pants: 0x3a4a63 } } : { sexe: Q.get("sexe") || "g", look: LOOK(Q) }),
      tenue: Q.get("tenue") || undefined, anim: { mode, t: 0, apres: g => { const u = g.userData; u.horloge = t0 + i * pas; if (Q.get("graine")) { u.animGraine = Number(Q.get("graine")); if (u.anim && u.anim.id !== u.animGraine) delete u.anim; } } } })), Number(Q.get("dx") || .6)) }; },
  // ce que le jeu fait après animPerson : manger (assis, bras gauche levé), bornes d'arcade (bras devant), porter un plateau
  aJeu: (Q, J) => ({ module: MOD(Q), acteurs: rang([
    { nom: "mange", sexe: "g", look: LOOK(Q), anim: { mode: "sit", t: 0, apres: g => { g.userData.arms[1].rotation.x = -1.4; g.userData.elbows[1].rotation.x = -1.9; } } },
    { nom: "mange (proposé)", sexe: "g", look: LOOK(Q), anim: { mode: "sit", t: 0, apres: g => { const k = Number(Q.get("k") ?? 1); g.userData.arms[1].rotation.x = -.45 - k * .65; g.userData.elbows[1].rotation.x = -1 - k * 1.15; } } },
    { nom: "mange (proposé, repos)", sexe: "f", look: [1, 4, 1, 0, 1, 1, 0, 0, 12, 10, 1, 3, 2], anim: { mode: "sit", t: 0, apres: g => { g.userData.arms[1].rotation.x = -.45; g.userData.elbows[1].rotation.x = -1; } } },
    { nom: "arcade", sexe: "g", look: LOOK(Q), anim: { mode: "idle", t: 0, apres: g => { g.userData.arms[0].rotation.x = -1.05; g.userData.arms[1].rotation.x = -1.1; } } },
    { nom: "plateau", sexe: "f", look: [2, 1, 8, 0, 1, 0, 0, 0, 10, 4, 6, 2, 3], anim: { mode: "walk", t: 1, v: 1.3 }, porter: true },
  ], .8).map(a => a.porter ? { ...a, anim: { ...a.anim, apres: g => { g.userData.porter = true; } } } : a) }),
  // marche des adultes et des enfants côte à côte (&vit=1.4)
  aGens: (Q, J) => ({ module: MOD(Q), acteurs: rang([
    { nom: "grand-mère", o: { long: true, adulte: true, scale: .72, shirt: 0xa9e3ea, pants: 0x1f2a44, shoe: 0x9aa0a6, hair: 0xe4e4e2 } }, { nom: "homme", o: { adulte: true, scale: .8, shirt: 0x2e5e8c, pants: 0x3a4a63 } },
    { nom: "fille", sexe: "f", look: [1, 4, 1, 0, 1, 1, 0, 0, 12, 10, 1, 3, 2] }, { nom: "garçon", sexe: "g", look: [0, 6, 0, 3, 1, 1, 0, 0, 2, 3, 1, 0, 1] },
    { nom: "foule enfant", o: { lite: true, scale: .55, shirt: 0xe74c3c, pants: 0x34495e, shorts: true, seed: 3 } }, { nom: "foule adulte", o: { lite: true, long: true, scale: .74, shirt: 0x27ae60, pants: 0x34495e, seed: 4 } },
  ].map((a, i) => ({ ...a, anim: { mode: Q.get("mode") || "walk", t: Number(Q.get("t") || 0) + i * .9, v: Q.get("vit") ? Number(Q.get("vit")) : 1.4 } })), .75) }),
  // les modes avec leur objet : &quoi=velo,kart,pedalo,poney,bouee,chaise,transat,echelle,toboggan,nage,surplace,saut,cycliste
  aModes: Q => ({ custom: ctx => stations(ctx, (Q.get("quoi") || "velo,kart,pedalo,poney,bouee,chaise").split(",")) }),
  // le pédalage : la même station à n angles de manivelle
  aVelo: Q => ({ custom: ctx => { const n = Number(Q.get("n") || 4), q = Q.get("quoi") || "velo"; return stations(ctx, Array(n).fill(q), [...Array(n)].map((_, i) => i / n * Math.PI * 2 + Number(Q.get("t") || 0))); } }),
};
