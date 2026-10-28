// scenarios-corps.js — scènes de l'équipe « corps » : la peau des 4 types, les poses difficiles, les mains, les pieds.
// &mod=index.tmp : essayer un autre module que perso/index.js ; &tenue=rouge : maillots ; &short : shorts ; &fil : fil de fer
const T4 = [
  { nom: "Garçon", o: { scale: .6, shirt: 0xf2b134, pants: 0x7b1e2b, shoe: 0xffffff, skin: 0xf1c6a0, hair: 0xb5651d } },
  { nom: "Fille", o: { long: true, scale: .6, shirt: 0xc4c7cc, pants: 0x1f2a44, shoe: 0xe84393, skin: 0xe0ac85, hair: 0x5a3a22 } },
  { nom: "Femme", o: { long: true, adulte: true, scale: .74, shirt: 0xa9e3ea, pants: 0x1f2a44, shoe: 0x9aa0a6, skin: 0xf1c6a0, hair: 0xe4e4e2 } },
  { nom: "Homme", o: { adulte: true, scale: .8, shirt: 0x2e5e8c, pants: 0x3a4a63, shoe: 0x2d3436, skin: 0xc68e6a, hair: 0x2d2018 } },
];
const mod = Q => Q.get("mod") ? "./perso/" + Q.get("mod") + ".js" : undefined;
const fil = Q => g => { if (Q.has("fil")) g.traverse(m => { if (m.isMesh && m.material) m.material.wireframe = true; }); };
const D = { clavicule: ["clavicule_d", "clavicule_g"], bras: ["bras_d", "bras_g"], coude: ["avantbras_d", "avantbras_g"], cuisse: ["cuisse_d", "cuisse_g"], genou: ["jambe_d", "jambe_g"], pied: ["pied_d", "pied_g"] };
// une pose : liste [os, axe, valeur] (côté gauche : même valeur, sauf l'axe z qui change de signe)
const pose = (l, Q) => g => { const os = g.userData.os; for (const [n, ax, v] of l) { const p = D[n]; if (p) p.forEach((b, i) => os[b].rotation[ax] = ax === "z" && i === 0 ? -v : v); else os[n].rotation[ax] = v; }
  if (Q) fil(Q)(g); };
const POSES = [
  ["repos", []], ["bras levés", [["bras", "x", -2.6]]], ["bras levés clavicules", [["bras", "x", -2.5], ["clavicule", "z", .3]]], ["bras devant", [["bras", "x", -1.5]]], ["coudes pliés", [["coude", "x", -2.0], ["bras", "x", -.3]]],
  ["bras en croix", [["bras", "z", 1.45]]], ["assis", [["cuisse", "x", -1.5], ["genou", "x", 1.5]]], ["accroupi", [["cuisse", "x", -2.1], ["genou", "x", 2.3], ["pied", "x", -.5]]],
  ["jambes écartées", [["cuisse", "z", .6]]], ["pas", [["cuisse_d", "x", -.55], ["cuisse_g", "x", .45], ["jambe_d", "x", .15], ["jambe_g", "x", .75], ["pied_g", "x", .35], ["pied_d", "x", -.15], ["bras_d", "x", .45], ["bras_g", "x", -.45], ["avantbras_d", "x", -.25], ["avantbras_g", "x", -.55]]], ["torsion", [["colonne", "y", .35], ["poitrine", "y", .25], ["tete", "y", .6], ["cou", "x", .3]]],
];
// gros plan : la scène cadre une petite boîte invisible autour d'un os (après la pose) ; &os=…&taille=…&types=…&pose=…
async function grosPlan({ THREE, scene, Q }, osDef, tailleDef, regl) {
  const P = await import(mod(Q) || "./perso/index.js"), l = [], ty = (Q.get("types") || "garcon").split(","), vue = { face: 0, "34": -Math.PI / 4, "34g": Math.PI / 4, profil: -Math.PI / 2, profilg: Math.PI / 2, dos: Math.PI }[Q.get("vue") || "face"] ?? 0;
  const os = Q.get("os") || osDef, taille = Number(Q.get("taille") || tailleDef), marque = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ visible: false })), b = new THREE.Box3();
  const nP = Q.get("pose") && POSES.find(p => p[0] === Q.get("pose"));
  ty.forEach((t, i) => { const o = T4[["garcon", "fille", "femme", "homme"].indexOf(t)].o, g = P.person({ ...o, lite: Q.has("lite") });
    if (Q.get("tenue")) P.setOutfit(g, Q.get("tenue")); P.animPerson?.(g, "idle", 0); regl?.(g); if (nP) pose(nP[1])(g); fil(Q)(g); g.rotation.y = vue; scene.add(g); g.updateMatrixWorld(true);
    const p = g.userData.os[os].getWorldPosition(new THREE.Vector3()); g.position.x = i * taille * 1.1 - p.x; g.position.z = -p.z; l.push(g); });
  scene.updateMatrixWorld(true); for (const g of l) b.expandByPoint(g.userData.os[os].getWorldPosition(new THREE.Vector3()));
  marque.position.copy(b.getCenter(new THREE.Vector3())); marque.scale.set(b.max.x - b.min.x + taille, taille, taille); scene.add(marque);
  return [{ g: marque }];
}
// mesure : temps de la 1re construction de chaque type (géométrie), puis d'un personnage quand la géométrie est prête
async function perf({ THREE, scene }) {
  const P = await import("./perso/index.js"), C = await import("./perso/corps.js"), r = { geo: {}, perso: {} }, l = [];
  for (const [q, v] of [["plein", ""], ["plein", "chausse"], ["leger", ""]]) for (const t of ["garcon", "fille", "femme", "homme"]) { const t0 = performance.now(); C.construireCorps(t, q, v); r.geo[t + "/" + q + (v ? "/" + v : "")] = Math.round(performance.now() - t0); }
  const V = await import("./perso/visage.js"); // le visage seul (équipe visage), pour séparer les coûts
  { const S = await import("./perso/squelette.js"), M = await import("./perso/materiaux.js"), n = 10, t0 = performance.now();
    for (let i = 0; i < n; i++) { const s = S.squelette("garcon"), g = new THREE.Group(); g.add(s.os.corps); g.userData = { mats: { peau: M.matPeau(0xf1c6a0) } }; V.construireVisage(g, s.os, "garcon", { skin: 0xf1c6a0, hair: 0x5a3a22 }, "plein"); }
    r.visageSeul = Math.round((performance.now() - t0) / n * 100) / 100; }
  for (const [nom, o] of [["enfant", { scale: .6 }], ["adulte", { scale: .76, long: true }], ["foule", { lite: true, scale: .55 }]]) { const n = 20, t0 = performance.now();
    for (let i = 0; i < n; i++) { const g = P.person({ ...o, shirt: 0xff0000 + i }); if (i === 0) { g.position.x = l.length * .6; scene.add(g); l.push({ g }); } }
    r.perso[nom] = Math.round((performance.now() - t0) / n * 100) / 100; }
  window.labPerfCorps = r; return l;
}
export const SCENES = {
  corpsPerf: Q => ({ custom: perf }),
  // les 4 types en habits (ou en maillot avec &tenue=…), de face / 3/4 / profil / dos
  corps: Q => ({ module: mod(Q), acteurs: T4.map((a, i) => ({ ...a, x: (i - 1.5) * .72, tenue: Q.get("tenue") || undefined, o: { ...a.o, shorts: Q.has("short") }, anim: { mode: Q.get("mode") || "idle", t: 0, apres: fil(Q) } })) }),
  // poses difficiles pour la peau (épaules, aisselles, coudes, hanches, genoux) : &types=garcon,femme
  corpsPoses: Q => ({ module: mod(Q), acteurs: (Q.get("types") || "garcon").split(",").flatMap((t, k) => POSES.map(([nom, l], i) => ({ nom: t + " " + nom, x: i * .62, z: -k * 1.2,
    o: { ...T4[["garcon", "fille", "femme", "homme"].indexOf(t)].o }, tenue: Q.get("tenue") || undefined, anim: { mode: "idle", t: 0, apres: pose(l, Q) } }))) }),
  // gros plans : mains (os de la main gauche, bras un peu levé et paume vers nous) et pieds
  corpsMains: Q => ({ custom: ctx => grosPlan(ctx, "main_g", .16, g => { const os = g.userData.os; os.bras_g.rotation.set(-.35, 0, .3); os.avantbras_g.rotation.x = -1.35; os.main_g.rotation.y = Number(Q.get("rot") || 0); }) }),
  corpsPieds: Q => ({ custom: ctx => grosPlan(ctx, "pied_g", .22) }),
  corpsGros: Q => ({ custom: ctx => grosPlan(ctx, "bassin", .5) }),
};
