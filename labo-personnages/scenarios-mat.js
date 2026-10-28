// scenarios-mat.js — scènes de l'équipe matières : nuanciers (peaux, tissus, cheveux, accessoires), foule, comparaison
// avec l'ancien rendu « dessin animé » (&ancien=1 dans tissus / cheveux) ; &mod=… : autre module perso (mat-perso).
//   scene=mat-peaux        8 peaux : sphères + capsules (devant : nouveau ; milieu : ancien toon ; derrière : provisoire gris)
//   scene=mat-tissus       coton, jean, lycra, molleton, maille × couleurs du jeu (manchons plissés)
//   scene=mat-cheveux      les 12 couleurs + blanc (grand-mère) : calotte + nappe ; &bords=1&ho=meches:1 : tuile des mèches
//   scene=mat-tetes        têtes seules (tete.js + visage.js) : &peaux=0,3,6&types=garcon,femme&decal=peau
//   scene=mat-acc          plastique, silicone, caoutchouc, semelles, verres
//   scene=mat-legere       la foule : un maillage, un matériau (parties montrées / cachées)
//   scene=mat-perso&base=habits|piscine|adultes|foule   les personnages actuels (perso/index.js ou &mod=…) ; &ao=1 : occlusion
import * as THREE from "three";
import { SCENES as BASE } from "./scenarios.js";

// &dessin=0 (réaliste) … 1 (aplats doux) : règle STYLE avant de créer les matières (aussi &lift=, &rim=)
const charger = async Q => { const M = await import("./perso/materiaux.js"); for (const k of ["dessin", "lift", "rim"]) if (Q.get(k)) M.STYLE[k] = Number(Q.get(k)); return M; };
// l'ancien rendu (copie de ancien.js) : ombres en aplats, peau éclaircie, contre-jour
const RAMPE = (() => { const t = new THREE.DataTexture(new Uint8Array([165, 165, 165, 255, 175, 175, 175, 255, 255, 255, 255, 255, 255, 255, 255, 255]), 4, 1); t.magFilter = t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true; return t; })();
const eclaircir = sh => { sh.fragmentShader = sh.fragmentShader.replace("vec3 outgoingLight =", "totalEmissiveRadiance += diffuseColor.rgb * .3;\n\t{ float rim = 1. - max(dot(normalize(vViewPosition), normal), 0.); totalEmissiveRadiance += diffuseColor.rgb * pow(rim, 3.) * .45; }\n\tvec3 outgoingLight ="); };
const toon = (color, x = {}) => { const m = new THREE.MeshToonMaterial({ color, gradientMap: RAMPE, ...x }); m.onBeforeCompile = eclaircir; return m; };
const toonPeau = c => { const s = new THREE.Color(c); return toon(s, { emissive: s.clone().lerp(new THREE.Color(0xff7050), .5).multiplyScalar(.06) }); };

// manchon plissé (uv en unités du modèle : u autour, v le long)
function manchon(r = .1, L = .42, seg = 56, rg = 36, pli = 1) {
  const P = [], UV = [], I = [];
  for (let j = 0; j <= rg; j++) { const y = j / rg * L; for (let i = 0; i <= seg; i++) { const a = i / seg * Math.PI * 2, rr = r * (1 + pli * (.07 * Math.sin(a * 5 + y * 14) + .04 * Math.sin(y * 31 + a * 3) + .03 * Math.sin(a * 11 - y * 20)));
    P.push(Math.cos(a) * rr, y, Math.sin(a) * rr); UV.push(a * r, y); } }
  for (let j = 0; j < rg; j++) for (let i = 0; i < seg; i++) { const p = j * (seg + 1) + i; I.push(p, p + seg + 1, p + 1, p + 1, p + seg + 1, p + seg + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(I); g.computeVertexNormals(); return g;
}
// calotte de cheveux : de la couronne (v = 0) au bord (v = 1), u = longueur en travers
function calotte(R = .135, th1 = 1.95, seg = 64, rg = 28) {
  const P = [], UV = [], I = [];
  for (let j = 0; j <= rg; j++) { const t = j / rg, th = .02 + t * th1, rr = R * (1 + .04 * Math.sin(t * 3)); for (let i = 0; i <= seg; i++) { const ph = i / seg * Math.PI * 2;
    P.push(rr * Math.sin(th) * Math.sin(ph), rr * Math.cos(th), rr * Math.sin(th) * Math.cos(ph)); UV.push(ph * R, t); } }
  for (let j = 0; j < rg; j++) for (let i = 0; i < seg; i++) { const p = j * (seg + 1) + i; I.push(p, p + seg + 1, p + 1, p + 1, p + seg + 1, p + seg + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(I); g.computeVertexNormals(); g.computeTangents(); return g;
}
// nappe de cheveux longs (derrière la tête) : demi-cylindre ondulé, pointes libres en bas
function nappe(R = .14, L = .36, seg = 40, rg = 30) {
  const P = [], UV = [], I = [];
  for (let j = 0; j <= rg; j++) { const t = j / rg, y = -t * L; for (let i = 0; i <= seg; i++) { const ph = Math.PI * (.5 + i / seg), rr = R * (1 + .1 * t) + .006 * Math.sin(i * 1.7 + t * 6);
    P.push(rr * Math.cos(ph) * -1, y, rr * Math.sin(ph) - .01); UV.push(ph * R, t); } }
  for (let j = 0; j < rg; j++) for (let i = 0; i < seg; i++) { const p = j * (seg + 1) + i; I.push(p, p + seg + 1, p + 1, p + 1, p + seg + 1, p + seg + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(I); g.computeVertexNormals(); g.computeTangents(); return g;
}
const ombre = m => { m.castShadow = m.receiveShadow = true; return m; };
const AO = new Map();
function aoSur(g, M) { const c = g.userData.corps, meta = g.userData.meta; if (g.userData.aoFait || !c || !meta?.sdf) return;
  let geo = AO.get(c.geometry); if (!geo) { const t0 = performance.now(); geo = M.occlusion(c.geometry.clone(), meta.sdf); geo.userData.partage = true; AO.set(c.geometry, geo); console.log("occlusion " + Math.round(performance.now() - t0) + " ms"); }
  c.geometry = geo; g.userData.aoFait = true; }

export const SCENES = {
  "mat-peaux": Q => ({ custom: async ({ J }) => { const M = await charger(Q), out = [], sp = new THREE.SphereGeometry(.16, 48, 32), ca = new THREE.CapsuleGeometry(.065, .3, 8, 24);
    const rangs = (Q.get("rangs") || "neuf,ancien,gris").split(",");
    rangs.forEach((r, k) => J.PEAUX.forEach((c, i) => { const m = r === "neuf" ? M.matPeau(c) : r === "ancien" ? toonPeau(c) : new THREE.MeshStandardMaterial({ color: c, roughness: .6 }), g = new THREE.Group();
      const s = ombre(new THREE.Mesh(sp, m)); s.position.y = .62; s.scale.set(.95, 1.15, 1.05); const b = ombre(new THREE.Mesh(ca, m)); b.position.set(.17, .26, 0); b.rotation.z = .12; g.add(s, b);
      g.position.set((i - 3.5) * .5, k * .95, 0); out.push({ g }); })); return out; } }),
  "mat-tissus": Q => ({ custom: async ({ J }) => { const M = await charger(Q), out = [], geo = manchon(), nc = Number(Q.get("n") || 8), sortes = (Q.get("sortes") || "coton,jean,lycra,molleton,maille").split(",");
    const cols = { coton: [0xffc93c, 0xff5a4e, 0x27ae60, 0x2e86de, 0xffffff, 0x34495e, 0x2d3436, 0xc4c7cc], jean: [0x3b5b8c, 0x1f2a44, 0x3a4a63, 0x7f8c99, 0x2d3436, 0x6c5ce7, 0xc0392b, 0x1f9e8f],
      lycra: [0xe74c3c, 0x1f4e8c, 0x16a085, 0x5d6d7e, 0x17202a, 0xd4a017, 0xe84393, 0x00b894], molleton: [0xc4c7cc, 0x7b1e2b, 0x34495e, 0xf78fb3, 0x8e44ad, 0xff8a2b, 0x5f8f6a, 0xffffff], maille: [0xf39c12, 0x3a4a63, 0x1f2a44, 0x7b1e2b, 0xe84393, 0xffffff, 0x2d3436, 0x27ae60] };
    sortes.forEach((s, k) => (cols[s] || cols.coton).slice(0, nc).forEach((c, i) => { const m = Q.get("ancien") ? toon(c) : M.matTissu(c, { sorte: s === "lycra" && c === 0xd4a017 ? "or" : s, map: s === "lycra" && Q.get("motifs") ? J.suitTex(J.SUITS[i % 7]) : null });
      const g = new THREE.Group(), t = ombre(new THREE.Mesh(geo, m)); t.rotation.z = Math.PI / 2; t.position.set(.21, .14, 0); g.add(t); g.position.set((i - 3.5) * .5, k * .34, -k * .25); out.push({ g }); })); return out; } }),
  "mat-cheveux": Q => ({ custom: async ({ J }) => { const M = await charger(Q), out = [], cal = calotte(), np = nappe(), tete = new THREE.SphereGeometry(.128, 40, 28), peau = M.matPeau(J.PEAUX[1]);
    const cols = Q.get("cols") ? Q.get("cols").split(",").map(Number) : [...J.CHEVEUX, 0xe4e4e2];
    cols.forEach((c, i) => { const ho = Object.fromEntries((Q.get("ho") || "").split(",").filter(Boolean).map(x => [x.split(":")[0], Number(x.split(":")[1])]));
      const g = new THREE.Group(), m = Q.get("ancien") ? toon(c) : M.matCheveux(c, ho), mb = Q.get("ancien") ? m : M.matCheveux(c, Q.get("bords") ? { ...ho, bords: true } : ho);
      const h = ombre(new THREE.Mesh(tete, peau)); h.scale.set(.92, 1.05, 1); const ca = ombre(new THREE.Mesh(cal, m)); ca.scale.set(.98, 1.02, 1.04); ca.rotation.x = -.25; ca.position.set(0, .005, -.012);
      const n = ombre(new THREE.Mesh(np, mb)); n.position.set(0, .03, -.03); g.add(h, ca, n); g.position.set((i - (cols.length - 1) / 2) * .34, .45, 0); g.rotation.y = Number(Q.get("ry") || .5); out.push({ g }); }); return out; } }),
  "mat-acc": Q => ({ custom: async () => { const M = await charger(Q), out = [], sp = new THREE.SphereGeometry(.12, 40, 28), cap = new THREE.SphereGeometry(.13, 40, 20, 0, Math.PI * 2, 0, Math.PI * .56);
    const l = [M.matPlastique(0x2e86de), M.matPlastique(0xf06292), M.matPlastique(0xffc93c), M.matPlastique(0x1b1b1b), M.matSilicone(0xe8534a), M.matSilicone(0x1b1b1b), M.matSilicone(0xd81b60), M.matSilicone(0x22304a),
      M.matCaoutchouc(0x2b2b2b), M.matSemelle(0xf2f0ea), M.matCaoutchouc(0x2e86de), M.matPlastique(0xd4af37, { metal: .8, rough: .3 }), M.matYeux(), M.matTissu(0xd4a017, { sorte: "or" })];
    l.forEach((m, i) => { const g = new THREE.Group(), s = ombre(new THREE.Mesh(i >= 4 && i < 8 ? cap : sp, m)); s.position.y = .12; g.add(s); g.position.set((i - 6.5) * .34, 0, 0);
      if (i === 12) { const c = new THREE.Mesh(sp, M.matCornee()); c.scale.setScalar(1.02); c.position.y = .12; g.add(c); } out.push({ g }); }); return out; } }),
  // petites poupées de la foule faites de capsules (une géométrie fusionnée, un matériau)
  "mat-legere": Q => ({ custom: async ({ J }) => { const M = await charger(Q), out = [], cap = (r, l, x, y, z = 0) => new THREE.CapsuleGeometry(r, l, 4, 12).translate(x, y, z);
    const parties = { sk: [cap(.05, .5, -.13, .55), cap(.05, .5, .13, .55), cap(.035, .5, -.26, 1.25), cap(.035, .5, .26, 1.25), new THREE.SphereGeometry(.15, 24, 16).translate(0, 1.92, 0)],
      sh: [cap(.17, .45, 0, 1.35), cap(.05, .14, -.25, 1.55), cap(.05, .14, .25, 1.55)], pa: [cap(.16, .1, 0, 1.0), cap(.065, .22, -.12, .8), cap(.065, .22, .12, .8)], so: [cap(.06, .14, -.13, .07, .05).rotateX(0), cap(.06, .14, .13, .07, .05)],
      sole: [new THREE.BoxGeometry(.13, .03, .3).translate(-.13, .015, .04), new THREE.BoxGeometry(.13, .03, .3).translate(.13, .015, .04)], hr: [new THREE.SphereGeometry(.16, 24, 16, 0, Math.PI * 2, 0, 1.7).translate(0, 1.95, -.02)],
      sw: [cap(.17, .05, 0, 1.08)], tongs: [new THREE.BoxGeometry(.12, .02, .28).translate(-.13, .01, .04), new THREE.BoxGeometry(.12, .02, .28).translate(.13, .01, .04)] };
    const { mergeGeometries } = await import("three/addons/utils/BufferGeometryUtils.js"), P = {}; for (const [k, l] of Object.entries(parties)) P[k] = mergeGeometries(l);
    const geo = M.geoLegere(P, "essai-poupee");
    for (let i = 0; i < 8; i++) { const m = M.matLegere(J.PEAUX[i]), maillot = i % 2 === 1;
      M.partie(m, "sh", { c: J.COULS[i] }); M.partie(m, "pa", { c: J.SHORTS[i] }); M.partie(m, "hr", { c: J.CHEVEUX[i] }); M.partie(m, "so", { c: J.CHAUSS[i] }); M.partie(m, "tongs", { c: J.CHAUSS[i], vis: maillot });
      for (const k of ["sh", "pa", "so", "sole"]) M.partie(m, k, { vis: !maillot }); M.partie(m, "sw", { vis: maillot }); if (maillot) M.texturePartie(m, "sw", J.suitTex(J.SUITS[i % 7]), [3, 3]);
      const g = new THREE.Group(), me = new THREE.Mesh(geo, m); me.receiveShadow = true; me.castShadow = true; me.customDepthMaterial = M.matLegereOmbre(m); g.add(me); g.scale.setScalar(.6); g.position.x = (i - 3.5) * .45; out.push({ g }); }
    return out; } }),
  // têtes seules (comme scenarios-visage.js) avec les matières en essai : &types=garcon,femme&peaux=0,3,6&vue=34&decal=peau (décalque du visage éclairé comme la peau)
  "mat-tetes": Q => ({ custom: async ({ J, camera }) => {
    const M = await charger(Q), T = await import("./perso/tete.js"), V = await import("./perso/visage.js"), { squelette } = await import("./perso/squelette.js");
    const types = (Q.get("types") || "garcon").split(","), peaux = (Q.get("peaux") || "0,1,2,3,4,5,6,7").split(",").map(Number), ry = { face: 0, "34": -Math.PI / 4, profil: -Math.PI / 2, dos: Math.PI }[Q.get("vue") || "34"] ?? 0;
    const out = [], liste = []; for (const t of types) for (const p of peaux) liste.push([t, p]); const dx = Number(Q.get("dx") || .3);
    liste.forEach(([type, p], i) => { const { os } = squelette(type), g = new THREE.Group(); g.add(os.corps); const ad = type === "femme" || type === "homme", skin = J.PEAUX[p], peau = M.matPeau(skin);
      g.userData = { os, type, mats: { peau }, head: os.tete }; const f = (x, y, z) => T.sdfTete(x, y, z, type);
      const m = new THREE.Mesh(T.maillerSDF(f, -.15, -.1, -.19, .15, .32, .24, .003, (x, y, z) => y > -.085), peau); m.castShadow = m.receiveShadow = true; os.tete.add(m);
      const or = new THREE.Mesh(T.oreilles(type), peau); or.castShadow = true; os.tete.add(or);
      g.userData.visage = V.construireVisage(g, os, type, { long: type === "fille" || type === "femme", skin, eyes: J.YEUX[i % 6], hair: J.CHEVEUX[2], adulte: ad }, "plein");
      const det = g.userData.visage.details; if (det && Q.get("decal") === "peau") det.material = M.matPeau(0xffffff, { map: det.material.map, relief: 0, forceRouge: 0, extra: { transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 } });
      g.scale.setScalar(ad ? .76 : .6); g.position.x = (i - (liste.length - 1) / 2) * dx; g.rotation.y = ry; let h = 0; for (let b = os.tete; b && b.isBone; b = b.parent) h += b.position.y; g.position.y = 1.2 - h * g.scale.x;
      out.push({ g, a: { anim: { mode: "idle" } }, P: { liveFace: (gg, dt) => gg.userData.visage?.animer?.(dt) } }); });
    out[0].a.anim.apres = () => { const c = new THREE.Vector3(0, 1.2 + .06, 0), L = .32 * .6 * Number(Q.get("marge") || 1), w = Math.max(L, (liste.length - 1) * dx + L) / camera.aspect, d = Math.max(L, w) / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
      camera.position.set(c.x, c.y + d * .05, c.z + d); camera.lookAt(c); camera.near = d * .2; camera.updateProjectionMatrix(); };
    return out; } }),
  // &ao=1 : occlusion par sommet calculée ici sur la peau du corps (démonstration de occlusion(geo, sdf))
  "mat-perso": async (Q, J) => { const b = BASE[Q.get("base") || "habits"](Q, J), mod = Q.get("mod");
    if (Q.get("ao")) { const M = await charger(Q); for (const a of b) { const an = a.anim || { mode: "idle", t: 0 }, av = an.apres; a.anim = { ...an, apres: g => { av?.(g); aoSur(g, M); } }; } }
    return mod ? { module: (mod.includes("/") ? "./" : "./perso/") + mod + ".js", acteurs: b } : b; },
};
