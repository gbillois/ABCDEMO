// ancien.js — les personnages AVANT la refonte (copie exacte du jeu), pour comparer.
import * as THREE from "three";
import { mergeGeometries, mulberry, rnd, indexe, suitTex, SUITS, GLASSES, mat } from "../jeu.js";
// grain de tissu : petites mailles en relief, partagé par tous les vêtements
const fabricBump = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d");
  x.fillStyle = "#808080"; x.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 64; i += 4) for (let j = 0; j < 64; j += 4) { const v = 110 + ((i * 7 + j * 13) % 40); x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(i, j, 2, 4); x.fillStyle = `rgb(${v + 30},${v + 30},${v + 30})`; x.fillRect(i + 2, j, 2, 2); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 10); return t; })();
// visage dessiné façon dessin animé : un « décalque » posé sur la tête (yeux, sourcils, sourire, joues roses)
const ATLAS_VISAGE = {};
function atlasVisage(iris, sourcil, f) {
  const key = iris + "-" + sourcil + (f ? "f" : "g"); if (ATLAS_VISAGE[key]) return ATLAS_VISAGE[key];
  const c = document.createElement("canvas"); c.width = 512; c.height = 256; const x = c.getContext("2d"), col = (h, k, w = 0) => "#" + new THREE.Color(h).multiplyScalar(k).lerp(new THREE.Color(0xffffff), w).getHexString();
  // œil (case 256 × 256) : blanc, iris en dégradé, pupille, reflets, trait de cils épais, sourcil
  const blanc = () => { x.beginPath(); x.moveTo(32, 142); x.bezierCurveTo(55, 84, 175, 70, 226, 118); x.bezierCurveTo(216, 196, 160, 230, 120, 228); x.bezierCurveTo(70, 226, 40, 192, 32, 142); x.closePath(); };
  blanc(); x.fillStyle = "#fbfbfd"; x.fill();
  x.save(); blanc(); x.clip();
  const gi = x.createLinearGradient(0, 84, 0, 236); gi.addColorStop(0, col(iris, .3)); gi.addColorStop(.45, col(iris, 1)); gi.addColorStop(1, col(iris, 1.25, .45));
  x.fillStyle = gi; x.beginPath(); x.ellipse(126, 162, 60, 74, 0, 0, Math.PI * 2); x.fill();
  x.lineWidth = 5; x.strokeStyle = col(iris, .35); x.stroke();
  x.fillStyle = col(iris, .18); x.beginPath(); x.ellipse(126, 170, 25, 36, 0, 0, Math.PI * 2); x.fill();
  const om = x.createLinearGradient(0, 70, 0, 140); om.addColorStop(0, "rgba(40,20,20,.45)"); om.addColorStop(1, "rgba(40,20,20,0)"); x.fillStyle = om; x.fillRect(0, 60, 256, 80);
  x.fillStyle = "rgba(255,255,255,.95)"; x.beginPath(); x.ellipse(100, 130, 21, 25, -.3, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.arc(158, 200, 9, 0, Math.PI * 2); x.fill();
  x.restore();
  x.strokeStyle = "#2a1a16"; x.lineCap = "round"; x.lineWidth = 15; x.beginPath(); x.moveTo(26, 148); x.bezierCurveTo(52, 82, 178, 64, 232, 110); x.stroke();
  x.lineWidth = 9; x.beginPath(); x.moveTo(224, 106); x.lineTo(246, 90); x.stroke();
  if (f) { x.lineWidth = 6; for (const [a1, b1, a2, b2] of [[212, 96, 230, 72], [196, 88, 208, 64], [236, 112, 252, 104]]) { x.beginPath(); x.moveTo(a1, b1); x.lineTo(a2, b2); x.stroke(); } }
  x.lineWidth = 4; x.globalAlpha = .65; x.beginPath(); x.moveTo(150, 226); x.quadraticCurveTo(196, 214, 216, 186); x.stroke(); x.globalAlpha = 1;
  x.strokeStyle = col(sourcil, .7); x.lineWidth = f ? 7 : 10; x.beginPath(); x.moveTo(58, 44); x.quadraticCurveTo(130, 10, 206, 34); x.stroke();
  // bouche (case 256 × 128) : petit sourire ouvert
  x.save(); x.translate(256, 0);
  x.fillStyle = "#8c3030"; x.beginPath(); x.moveTo(98, 48); x.quadraticCurveTo(128, 100, 158, 48); x.quadraticCurveTo(128, 60, 98, 48); x.fill();
  x.fillStyle = "#e9828a"; x.beginPath(); x.ellipse(128, 70, 13, 7, 0, 0, Math.PI * 2); x.fill();
  x.strokeStyle = "#6e2626"; x.lineWidth = 3; x.beginPath(); x.moveTo(94, 46); x.quadraticCurveTo(128, 58, 162, 46); x.stroke();
  // joues roses (case 256 × 128)
  x.translate(0, 128); const gb = x.createRadialGradient(128, 64, 4, 128, 64, 84); gb.addColorStop(0, "rgba(255,120,135,.5)"); gb.addColorStop(1, "rgba(255,120,135,0)");
  x.fillStyle = gb; x.fillRect(0, 0, 256, 128); x.strokeStyle = "rgba(235,90,105,.45)"; x.lineWidth = 4; for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(100 + i * 22, 78); x.lineTo(114 + i * 22, 50); x.stroke(); }
  x.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return ATLAS_VISAGE[key] = t;
}
// ombres en aplats doux, comme dans les dessins animés, et contour foncé autour des personnages
const RAMPE = (() => { const t = new THREE.DataTexture(new Uint8Array([165, 165, 165, 255, 175, 175, 175, 255, 255, 255, 255, 255, 255, 255, 255, 255]), 4, 1); t.magFilter = t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true; return t; })();
// le côté à l'ombre garde un peu de sa couleur (lumière du ciel), comme dans un dessin animé
// et un contre-jour doux sur les bords (comme dans les dessins animés)
const eclaircir = sh => { sh.fragmentShader = sh.fragmentShader.replace("vec3 outgoingLight =", "totalEmissiveRadiance += diffuseColor.rgb * .3;\n\t{ float rim = 1. - max(dot(normalize(vViewPosition), normal), 0.); totalEmissiveRadiance += diffuseColor.rgb * pow(rim, 3.) * .45; }\n\tvec3 outgoingLight ="); };
// cheveux : un reflet brillant en anneau sur le dessus de la tête
const eclaircirCheveux = sh => { eclaircir(sh); sh.fragmentShader = sh.fragmentShader.replace("vec3 outgoingLight =", "{ float an = smoothstep(.42, .58, normal.y) * (1. - smoothstep(.66, .82, normal.y)); totalEmissiveRadiance += (diffuseColor.rgb * .9 + .12) * an * .55; }\n\tvec3 outgoingLight ="); };
const toon = (color, x = {}) => { const m = new THREE.MeshToonMaterial({ color, gradientMap: RAMPE, ...x }); m.onBeforeCompile = eclaircir; return m; };
const matContour = new THREE.MeshBasicMaterial({ color: 0x2b1d18, side: THREE.BackSide });
matContour.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed += normalize(normal) * .011;"); };
matContour.userData.partage = true;
const MAT_VISAGE = {};
function matVisage(iris, sourcil, f) {
  const key = iris + "-" + sourcil + f; if (MAT_VISAGE[key]) return MAT_VISAGE[key];
  const m = toon(0xffffff, { map: atlasVisage(iris, sourcil, f), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  m.userData.partage = true; return MAT_VISAGE[key] = m;
}
// motifs des habits (rayures, imprimé étoiles, cerises, jean), dessinés en code
const MOTIFS = {};
function motif(k, col) {
  const key = k + col; if (MOTIFS[key]) return MOTIFS[key];
  const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d"), hx = "#" + new THREE.Color(col).getHexString();
  if (k === "rayures") { x.fillStyle = "#f6f5ef"; x.fillRect(0, 0, 128, 128); x.fillStyle = hx; for (let y = 0; y < 128; y += 16) x.fillRect(0, y, 128, 5); }
  else if (k === "etoiles") { x.fillStyle = hx; x.fillRect(0, 0, 128, 128); const st = (cx, cy, r, f) => { x.fillStyle = f; x.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * .45 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.fill(); };
    for (const [cx, cy, r, f] of [[10, 52, 9, "#ffffff"], [118, 60, 8, "#b39ddb"], [6, 74, 6, "#ffc93c"], [122, 40, 6, "#ff8fb1"], [16, 32, 5, "#ffffff"]]) st(cx, cy, r, f); }
  else if (k === "arcenciel") { x.fillStyle = "#f7f6f0"; x.fillRect(0, 0, 128, 128); ["#f3a6c0", "#f7dc5a", "#3a7fd5"].forEach((cc, i) => { x.fillStyle = cc; x.fillRect(0, 40 + i * 9, 30, 6); x.fillRect(98, 40 + i * 9, 30, 6); }); }
  else if (k === "cerises") { x.fillStyle = "#f8f6f0"; x.fillRect(0, 0, 128, 128); for (let i = 0; i < 26; i++) { const px = (i * 37) % 128, py = (i * 53 + (i >> 2) * 11) % 128; x.strokeStyle = "#3d7a3a"; x.lineWidth = 1.5; x.beginPath(); x.moveTo(px, py); x.lineTo(px + 3, py - 7); x.stroke(); x.fillStyle = hx; x.beginPath(); x.arc(px, py, 3.2, 0, 7); x.fill(); } }
  else if (k === "jean") { x.fillStyle = hx; x.fillRect(0, 0, 128, 128); for (let i = 0; i < 128; i += 2) { x.fillStyle = `rgba(255,255,255,${.05 + (i % 6 === 0 ? .06 : 0)})`; x.fillRect(i, 0, 1, 128); } x.fillStyle = "rgba(240,200,80,.6)"; x.fillRect(0, 60, 128, 1.5); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); return MOTIFS[key] = t;
}
const PERSO_GEO = new Map(), VISAGE_GEO = new Map(), PERSO_UNE = new Map();
// foule : tout le corps en un seul maillage et un seul matériau ; la couleur de chaque partie (peau, t-shirt, short…)
// et ce qui est caché (habits ou maillot) sont choisis dans le shader
const PARTIES = ["sk", "skl", "sh", "pa", "so", "sole", "hr", "deco", "sw", "cap"];
const BLANC1 = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); BLANC1.needsUpdate = true;
const toonUneCompile = sh => { eclaircir(sh);
  sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute float pk; attribute vec2 uvs; uniform float vis[10]; flat varying float vPk; varying vec2 vUvs;")
    .replace("#include <begin_vertex>", "#include <begin_vertex>\nvPk = pk; vUvs = uvs; if (vis[int(pk + .5)] < .5) transformed = vec3(0.);");
  sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform vec3 pal[10]; uniform float texK; uniform sampler2D suitMap; flat varying float vPk; varying vec2 vUvs;")
    .replace("vec4 diffuseColor = vec4( diffuse, opacity );", "vec3 pc = pal[int(vPk + .5)]; if (abs(vPk - texK) < .5) pc = texture2D(suitMap, vUvs).rgb;\nvec4 diffuseColor = vec4( diffuse * pc, opacity );"); };
function toonUne() {
  const m = new THREE.MeshToonMaterial({ gradientMap: RAMPE, vertexColors: true });
  const u = { pal: { value: PARTIES.map(() => new THREE.Color(1, 1, 1)) }, vis: { value: new Float32Array(10).fill(1) }, texK: { value: -1 }, suitMap: { value: BLANC1 } };
  m.onBeforeCompile = sh => { Object.assign(sh.uniforms, u); toonUneCompile(sh); }; m.customProgramCacheKey = () => "toon-une"; m.userData.u = u; return m;
}
function geoUne(geos) {
  const l = []; for (const [k, geo] of Object.entries(geos)) { const g = geo.clone(), n = g.attributes.position.count, pk = new Float32Array(n).fill(PARTIES.indexOf(k));
    g.setAttribute("pk", new THREE.BufferAttribute(pk, 1)); g.setAttribute("uvs", g.attributes.uv.clone());
    if (!g.attributes.color) g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3)); l.push(g); }
  const m = mergeGeometries(l); m.userData.partage = true; l.forEach(x => x.dispose()); return m;
}
function person(o) {
  // corps humain réaliste : un squelette articulé (hanches, genoux, chevilles, épaules, coudes, poignets, tête),
  // la peau d'un seul tenant, et les vêtements posés par-dessus (on peut les enlever pour le maillot de bain).
  const g = new THREE.Group(), body = new THREE.Bone(); body.name = "corps"; g.add(body);
  const female = !!o.long, R = mulberry(o.seed ?? Math.floor(rnd() * 1e6));
  // les personnages du même genre partagent la même forme (une seule copie en mémoire) ; 3 coiffures par genre
  // coiffure (0 courts, 1 longs, 2 queue de cheval, 3 couettes, 4 carré, 5 bouclés, 6 chignon, 7 très courts) et accessoire de tête
  const coif = o.coiffure ?? (female ? 1 : 0), acc = o.acc ?? (o.cap ? "casquette" : null);
  const hv = Math.floor(R() * 3), RH = mulberry(17 + hv), ckey = [female, !!o.shorts, !!o.lite, acc, hv, coif, !!o.manches, !!o.capuche].join("|"), dejaFait = PERSO_GEO.has(ckey);
  const skinC = new THREE.Color(o.skin ?? 0xf1c6a0), hairC = new THREE.Color(o.hair ?? 0x5a3a22);
  const M = {
    sk: toon(skinC, { emissive: skinC.clone().lerp(new THREE.Color(0xff7050), .5).multiplyScalar(.06) }),
    sh: toon(o.shirt, { bumpMap: fabricBump, bumpScale: .6 }), pa: toon(o.pants ?? 0x3a4a63, { bumpMap: fabricBump, bumpScale: .6 }), so: toon(o.shoe ?? 0xf5f5f5), sole: toon(0x2b2b2b),
    hr: Object.assign(toon(hairC), { onBeforeCompile: eclaircirCheveux }), deco: toon(0xffffff, { vertexColors: true }),
    sw: toon(0xffffff), // maillot de bain (motif posé par setOutfit)
  };
  const bins = new Map();
  const T = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), Sc = new THREE.Vector3();
  function put(bone, key, geo, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1], col) {
    if (key === "sk" && bone.name !== "corps" && bone.name !== "tete") key = "skl"; // peau des bras et des jambes : sans contour
    if (dejaFait) { if (!bins.has(bone)) bins.set(bone, new Map()); bins.get(bone).set(key, null); geo.dispose(); return; }
    E.set(r[0], r[1], r[2]); Q.setFromEuler(E); T.compose(V.set(p[0], p[1], p[2]), Q, Sc.set(s[0], s[1], s[2])); geo.applyMatrix4(T);
    let gg = indexe(geo); for (const k of Object.keys(gg.attributes)) if (!["position", "normal", "uv"].includes(k)) gg.deleteAttribute(k);
    if (key === "deco") { const c = new THREE.Color(col), n = gg.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } gg.setAttribute("color", new THREE.BufferAttribute(a, 3)); }
    if (!bins.has(bone)) bins.set(bone, new Map()); const m = bins.get(bone); if (!m.has(key)) m.set(key, []); m.get(key).push(gg);
  }
  const q = o.lite ? .3 : .6, Q2 = n => Math.max(6, Math.round(n * q));
  // pièce tournée : les points vont toujours de bas en haut, sinon ses faces regardent vers l'intérieur
  const lathe = (pts, seg = 32) => new THREE.LatheGeometry((pts[0][1] > pts[pts.length - 1][1] ? pts.slice().reverse() : pts).map(([x, y]) => new THREE.Vector2(x, y)), Q2(seg));
  const sph = (r, w = 28, h = 20) => new THREE.SphereGeometry(r, Q2(w), Q2(h)), cap = (r, l) => new THREE.CapsuleGeometry(r, l, o.lite ? 2 : 6, Q2(16));
  const tube = (pts, r, seg = 12) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), Q2(seg), r, o.lite ? 4 : 6);
  const legs = [], arms = [], knees = [], elbows = [], lids = [];
  // ---- jambes
  for (const s of [-1, 1]) {
    const hip = new THREE.Bone(); hip.position.set(s * .15, .94, 0); body.add(hip);
    put(hip, "sk", sph(.13)); put(hip, "sk", lathe([[0, .02], [.13, 0], [.145, -.08], [.135, -.24], [.11, -.4], [.098, -.46], [0, -.48]]));
    if (o.shorts) { put(hip, "pa", lathe([[.15, -.035], [.163, -.07], [.16, -.28], [.155, -.3]], 32)); put(hip, "pa", new THREE.TorusGeometry(.156, .012, 6, 32), [0, -.3, 0], [Math.PI / 2, 0, 0]); }
    else put(hip, "pa", lathe([[.15, -.035], [.162, -.07], [.155, -.2], [.137, -.38], [.126, -.5]], 32)); // pantalon : cuisse qui s'affine jusqu'au genou, sans ourlet

    const knee = new THREE.Bone(); knee.position.y = -.46; hip.add(knee);
    put(knee, "sk", sph(.1)); put(knee, "sk", lathe([[0, .02], [.098, 0], [.108, -.1], [.1, -.2], [.075, -.36], [.062, -.42], [0, -.44]]));
    if (!o.shorts) put(knee, "pa", lathe([[.124, .06], [.12, -.15], [.106, -.38], [.104, -.41]], 28));
    const foot = new THREE.Bone(); foot.position.y = -.44; knee.add(foot);
    put(foot, "sk", sph(.06), [0, -.005, .05], [0, 0, 0], [1.05, .75, 2.1]); for (let t = 0; t < 5; t++) put(foot, "sk", sph(.017, 10, 8), [(t - 2) * .022 * (t === 0 ? 1.3 : 1), -.01, .17 - Math.abs(t - 1.2) * .008]);
    const shoe = sph(.07, 32, 20); put(foot, "so", shoe, [0, .005, .055], [0, 0, 0], [1.08, .82, 2.05]);
    put(foot, "sole", new THREE.CapsuleGeometry(.07, .2, 4, 16), [0, -.045, .055], [Math.PI / 2, 0, 0], [1.1, 1, .25]);
    put(foot, "so", new THREE.TorusGeometry(.06, .012, 6, 24), [0, .055, .0], [Math.PI / 2, 0, 0]);
    legs.push(hip); knees.push(knee);
  }
  // ---- bras et mains
  for (const s of [-1, 1]) {
    const sho = new THREE.Bone(); sho.position.set(s * .35, 1.55, 0); body.add(sho);
    put(sho, "sk", sph(.082)); put(sho, "sk", lathe([[0, .03], [.094, 0], [.1, -.1], [.088, -.28], [.078, -.35], [0, -.36]]));
    put(sho, "sh", lathe([[.0, .05], [.075, .045], [.108, .01], [.114, -.06], [.117, -.16], o.manches ? [.112, -.37] : [.118, -.19]], 32)); // manche près du bras put(sho, "sh", new THREE.TorusGeometry(.136, .012, 6, 32), [0, -.19, 0], [Math.PI / 2, 0, 0]);
    const elb = new THREE.Bone(); elb.position.y = -.35; sho.add(elb);
    put(elb, "sk", sph(.078)); put(elb, "sk", lathe([[0, .01], [.077, 0], [.082, -.07], [.066, -.22], [.052, -.31], [0, -.33]]));
    if (o.manches) { put(elb, "sh", sph(.096), [0, .0, 0]); put(elb, "sh", lathe([[.098, .02], [.1, -.08], [.084, -.22], [.074, -.29], [.07, -.3]], 28)); } // manches longues
    const hand = new THREE.Bone(); hand.position.y = -.33; elb.add(hand);
    put(hand, "sk", sph(.055, 24, 18), [0, -.045, 0], [0, 0, 0], [.95, 1.15, .45]);
    put(hand, "sk", cap(.03, .04), [0, -.105, .006], [.22, 0, 0], [1.5, 1, .62]); // doigts serrés, comme une moufle
    put(hand, "sk", cap(.013, .035), [-s * .045, -.045, .025], [.5, 0, s * .8]);
    arms.push(sho); elbows.push(elb);
  }
  // ---- tronc, vêtements du haut, cou
  put(body, "sk", sph(.27), [0, .97, 0], [0, 0, 0], [.98, .55, .72]); // ventre : reste sous le t-shirt
  const torsoPts = female ? [[0, 0], [.25, .02], [.22, .2], [.25, .38], [.27, .5], [.25, .59], [.17, .65], [.09, .68], [0, .69]] : [[0, 0], [.25, .02], [.25, .18], [.28, .38], [.3, .5], [.27, .59], [.18, .66], [.1, .69], [0, .7]];
  put(body, "sk", lathe(torsoPts, 40), [0, .95, 0], [0, 0, 0], [1, 1, .7]);
  put(body, "sk", new THREE.CylinderGeometry(.07, .086, .23, 24), [0, 1.7, 0]);
  // épaules : une pente douce du cou jusqu'au bras (peau dessous, t-shirt dessus)
  for (const s of [-1, 1]) { const pts = [[s * .06, 1.655, 0], [s * .2, 1.625, 0], [s * .35, 1.552, 0]];
    put(body, "sk", tube(pts, .072, 12)); put(body, "sh", tube([...pts.map(([x, y, z]) => [x, y + .01, z]), [s * .4, 1.52, 0]], .09, 14)); }
  const shirtPts = torsoPts.slice(1, -1).map(([x, y]) => [x + .028, y]); shirtPts.unshift([.3 + (female ? .01 : 0), -.075]); shirtPts.push([.115, .69]);
  put(body, "sh", lathe(shirtPts, 44), [0, .95, 0], [0, 0, 0], [1, 1, .78]);
  put(body, "sh", new THREE.TorusGeometry(.118, .025, 10, 32), [0, 1.645, 0], [Math.PI / 2, 0, 0]);
  put(body, "sh", new THREE.TorusGeometry(.3 + (female ? .01 : 0), .014, 6, 40), [0, .875, 0], [Math.PI / 2, 0, 0], [1, .78, 1]);
  put(body, "pa", lathe([[.278, -.04], [.292, -.08], [.3, -.11], [.2, -.16], [0, -.17]], 40), [0, .97, 0], [0, 0, 0], [1.02, 1, .74]); // le haut reste caché sous le t-shirt
  if (o.capuche) { // sweat : capuche dans le dos et fermeture éclair
    put(body, "sh", new THREE.SphereGeometry(.2, 28, 16, 0, Math.PI * 2, 0, Math.PI * .55), [0, 1.62, -.16], [-1.9, 0, 0], [1.15, .8, .75]);
    put(body, "deco", new THREE.BoxGeometry(.016, .6, .012), [0, 1.3, .222], [-.08, 0, 0], [1, 1, 1], 0xd0d0d0); }
  // ---- maillot de bain, porté à la place des habits
  put(body, "sw", lathe([[0, -.165], [.2, -.155], [.302, -.07], [.298, .03], [.288, .14]], 40), [0, .97, 0], [0, 0, 0], [1.04, 1, .82]);
  if (!female) { // short de bain : ceinture, cordon et jambes jusqu'à mi-cuisse
    put(body, "sw", new THREE.TorusGeometry(.29, .024, 10, 40), [0, 1.105, 0], [Math.PI / 2, 0, 0], [1.04, .82, 1]);
    for (const leg of legs) { put(leg, "sw", lathe([[.182, -.27], [.184, -.2], [.176, -.02], [.168, .08]], 32)); put(leg, "sw", new THREE.TorusGeometry(.182, .013, 6, 32), [0, -.27, 0], [Math.PI / 2, 0, 0]); }
  } else { // maillot une pièce échancré, avec bretelles
    put(body, "sw", lathe([[.262, 0], [.236, .2], [.266, .38], [.296, .48], [.286, .53]], 40), [0, .95, 0], [0, 0, 0], [1, 1, .73]);
    put(body, "sw", new THREE.TorusGeometry(.284, .012, 6, 40), [0, 1.48, 0], [Math.PI / 2, 0, 0], [1, .73, 1]);
    for (const s of [-1, 1]) put(body, "sw", tube([[s * .11, 1.46, .2], [s * .17, 1.62, .1], [s * .19, 1.67, -.02], [s * .14, 1.55, -.17], [s * .11, 1.46, -.2]], .017, 14));
  }
  // ---- tête
  const head = new THREE.Bone(); head.name = "tete"; head.position.y = 1.97; body.add(head);
  put(head, "sk", sph(.23, 48, 40), [0, .02, 0], [0, 0, 0], [.95, .99, .98]); // tête ronde d'enfant
  put(head, "sk", sph(.17, 40, 32), [0, -.07, .03], [0, 0, 0], [.96, .74, .9]);
  put(head, "sk", sph(.058, 24, 18), [0, -.145, .11], [0, 0, 0], [1.1, .6, .7]);
  for (const s of [-1, 1]) { // oreilles
    put(head, "sk", sph(.05, 20, 16), [s * .205, -.01, -.005], [0, 0, 0], [.42, 1, .75]);
    put(head, "sk", new THREE.TorusGeometry(.036, .011, 8, 20, Math.PI * 1.4), [s * .214, -.005, -.005], [0, s * Math.PI / 2, -Math.PI * .2]);
  }
  // petit nez
  put(head, "sk", sph(.016, 14, 10), [0, -.04, .218], [0, 0, 0], [1, .7, .6]);
  // visage dessiné : grands yeux (ils clignent), sourire et joues roses, posés sur la tête
  const irisC = o.eyes ?? [0x6b4424, 0x3a78b5, 0x4f8a3a, 0x8a5a2b][Math.floor(R() * 4)];
  const ELL = [[0, .02, 0, .2185, .2277, .2254], [0, -.07, .03, .1632, .1258, .153], [0, -.145, .11, .064, .035, .041]];
  const surf = (x, y) => { let z = 0; for (const [cx, cy, cz, rx, ry, rz] of ELL) { const k = 1 - ((x - cx) / rx) ** 2 - ((y - cy) / ry) ** 2; if (k > 0) z = Math.max(z, cz + rz * Math.sqrt(k)); } return z; };
  const fm = matVisage(irisC, hairC.getHex(), female), nD = o.lite ? 3 : 6;
  const decal = (cx, cy, w, h, u0, v0, du, dv, mir) => { // petite grille qui épouse le visage, centrée sur (cx, cy)
    const pos = [], uv = [], idx = [], cz = surf(cx, cy);
    for (let j = 0; j <= nD; j++) for (let i = 0; i <= nD; i++) { const a = i / nD, b = j / nD, X = cx + (a - .5) * w, Y = cy + (b - .5) * h;
      pos.push(X - cx, Y - cy, surf(X, Y) + .003 - cz); uv.push((u0 + (mir ? 1 - a : a) * du) / 512, 1 - (v0 + (1 - b) * dv) / 256); }
    for (let j = 0; j < nD; j++) for (let i = 0; i < nD; i++) { const p = j * (nD + 1) + i; idx.push(p, p + 1, p + nD + 2, p, p + nD + 2, p + nD + 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    return { geo, c: new THREE.Vector3(cx, cy, cz) };
  };
  // une seule géométrie pour tous les visages ; les yeux à part (ils clignent), sauf pour la foule
  const vk = o.lite ? "l" : "p"; let VG = VISAGE_GEO.get(vk);
  if (!VG) { const yeux = [-1, 1].map(s => decal(s * .082, .018, .13, .13, 0, 0, 256, 256, s < 0)), reste = [decal(0, -.105, .1, .05, 256, 0, 256, 128, false), ...[-1, 1].map(s => decal(s * .118, -.06, .075, .0375, 256, 128, 256, 128, false))];
    const fusion = l => { const m = mergeGeometries(l.map(d => d.geo.translate(d.c.x, d.c.y, d.c.z))); m.userData.partage = true; return m; };
    VG = o.lite ? { tout: fusion([...yeux, ...reste]) } : { yeux: yeux.map(d => { d.geo.userData.partage = true; return d; }), reste: fusion(reste) }; VISAGE_GEO.set(vk, VG); }
  const pose = (geo, c) => { const m = new THREE.Mesh(geo, fm); if (c) m.position.copy(c); m.renderOrder = 1; head.add(m); return m; };
  if (o.lite) pose(VG.tout); else { for (const d of VG.yeux) lids.push(pose(d.geo, d.c)); pose(VG.reste); }
  // cheveux : une calotte, puis la coiffure choisie
  if (coif !== 7) put(head, "hr", new THREE.SphereGeometry(.243, 48, 24, 0, Math.PI * 2, 0, Math.PI * .5), [0, .045, -.02], [-.35, 0, 0]);
  put(head, "hr", sph(.232, 40, 28), [0, .01, -.055], [0, 0, 0], coif === 7 ? [.96, .95, .9] : [.98, .97, .9]);
  const meches = n => { for (let i = 0; i < n; i++) { const th = RH() * 1.25, ph = RH() * Math.PI * 2; if (Math.cos(ph) > .5 && th > .95) continue;
      const d = new THREE.Vector3(Math.sin(th) * Math.sin(ph), Math.cos(th), Math.sin(th) * Math.cos(ph)), base = d.clone().multiplyScalar(.238).add(new THREE.Vector3(0, .04, -.02));
      const out = d.clone().multiplyScalar(.3).add(new THREE.Vector3((RH() - .5) * .3, -.6, d.z > .35 ? .55 : -.65)).normalize(), L = .07 + RH() * .05;
      const geo = new THREE.ConeGeometry(.028 + RH() * .012, L, 10, 2); geo.translate(0, L / 2, 0); geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), out)); geo.translate(base.x, base.y, base.z); put(head, "hr", geo); } };
  const longs = (n, Lmin, Lvar, cote) => { for (let i = 0; i < n; i++) { const ph = Math.PI * .45 + RH() * Math.PI * 1.1, th = .3 + RH() * 1.0, d = new THREE.Vector3(Math.sin(th) * Math.sin(ph), Math.cos(th), Math.sin(th) * Math.cos(ph));
      const p0 = d.clone().multiplyScalar(.24).add(new THREE.Vector3(0, .04, -.02)), L = Lmin + RH() * Lvar, sx = d.x * 1.1;
      put(head, "hr", tube([[p0.x, p0.y, p0.z], [p0.x * 1.18 + sx * .02, p0.y - .1, p0.z - .03], [p0.x * 1.15, -.14, -.12 - RH() * .05], [p0.x * 1.08 + (RH() - .5) * .04, -.14 - L, -.12 - RH() * .06]], .02 + RH() * .008, 12)); }
    for (const s of [-1, 1]) put(head, "hr", tube([[s * .12, .2, .11], [s * .2, .06, .1], [s * .215, -.12, .05], [s * .2, -.12 - cote, .02]], .028, 14)); };
  const nL = o.lite ? 24 : 64, nC = o.lite ? 26 : 70;
  if (coif === 0) meches(nC);
  else if (coif === 1) longs(nL, .32, .14, .18);
  else if (coif === 2) { meches(nC >> 1); put(head, "hr", tube([[0, .16, -.2], [0, .06, -.3], [0, -.12, -.31], [0, -.3, -.27]], .05, 14)); put(head, "hr", sph(.06, 14, 10), [0, .14, -.22]); }
  else if (coif === 3) { meches(nC >> 1); for (const s of [-1, 1]) { put(head, "hr", sph(.055, 14, 10), [s * .2, .1, -.06]); put(head, "hr", tube([[s * .21, .09, -.06], [s * .3, .0, -.07], [s * .32, -.16, -.05], [s * .3, -.28, -.03]], .045, 12)); } }
  else if (coif === 4) longs(nL, .06, .05, .02);
  else if (coif === 5) for (let i = 0; i < (o.lite ? 22 : 56); i++) { const th = RH() * 1.5, ph = RH() * Math.PI * 2; if (Math.cos(ph) > .55 && th > .85) continue;
      const d = new THREE.Vector3(Math.sin(th) * Math.sin(ph), Math.cos(th), Math.sin(th) * Math.cos(ph)); put(head, "hr", sph(.055 + RH() * .025, 10, 8), [d.x * .25, .04 + d.y * .25, -.02 + d.z * .25]); }
  else if (coif === 6) { meches(nC >> 1); put(head, "hr", sph(.1, 18, 14), [0, .25, -.12]); }
  else if (coif === 8) { longs(nL >> 1, .12, .1, .08); for (let i = 0; i < (o.lite ? 26 : 64); i++) { const ph = Math.PI * .35 + RH() * Math.PI * 1.3, y = .22 - RH() * .5, r = .21 + RH() * .07 + Math.max(0, -y) * .15;
      put(head, "hr", sph(.05 + RH() * .025, 10, 8), [Math.sin(ph) * r, y, Math.cos(ph) * r - .03]); } }
  // accessoire de tête : casquette, nœud ou bandeau (les lunettes sont posées à part)
  if (acc) { M.cap = toon(o.accCol ?? o.cap ?? 0xff5a4e);
    if (acc === "casquette") { put(head, "cap", new THREE.SphereGeometry(.252, 40, 16, 0, Math.PI * 2, 0, Math.PI * .5), [0, .055, -.01], [-.12, 0, 0], [1, .8, 1.02]);
      const brim = new THREE.CylinderGeometry(.19, .2, .016, 32, 1, false, -Math.PI / 2, Math.PI); put(head, "cap", brim, [0, .085, .19], [.12, 0, 0], [1, 1, 1.3]); put(head, "cap", sph(.022, 12, 8), [0, .26, -.02]); }
    else if (acc === "noeud") { for (const s of [-1, 1]) put(head, "cap", new THREE.ConeGeometry(.05, .1, 12), [.13 + s * .05, .2, .08], [0, 0, s * Math.PI / 2], [1, 1, .55]); put(head, "cap", sph(.025, 12, 8), [.13, .2, .085]); }
    else if (acc === "bandeau") put(head, "cap", new THREE.TorusGeometry(.236, .02, 8, 40), [0, .09, -.02], [Math.PI / 2 - .35, 0, 0], [1, 1.04, 1]); }
  // assemblage : une seule pièce par matériau pour tout le corps, accrochée aux articulations (peu d'appels de dessin)
  g.updateMatrixWorld(true);
  const bones = [...bins.keys()];
  if (!dejaFait) { const byKey = {};
    bones.forEach((bone, bi) => { for (const [key, list] of bins.get(bone)) for (const gg of list) { gg.applyMatrix4(bone.matrixWorld); const n = gg.attributes.position.count, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) { si[i * 4] = bi; sw[i * 4] = 1; } gg.setAttribute("skinIndex", new THREE.BufferAttribute(si, 4)); gg.setAttribute("skinWeight", new THREE.BufferAttribute(sw, 4)); (byKey[key] ??= []).push(gg); } });
    const geos = {}; for (const [key, list] of Object.entries(byKey)) { const m = mergeGeometries(list); m.userData.partage = true; geos[key] = m; list.forEach(x => x.dispose()); }
    PERSO_GEO.set(ckey, geos); }
  const skel = new THREE.Skeleton(bones); head.scale.setScalar(o.tete ?? 1); // taille du visage (après la pose de départ)
  const parts = { sh: [], pa: [], so: [], sole: [], hr: [], sw: [] }, top = [], sleeves = [], zone = new THREE.Sphere(new THREE.Vector3(0, 1.1, 0), 1.8);
  M.skl = M.sk;
  if (o.lite) { // la foule : un seul maillage
    let une = PERSO_UNE.get(ckey); if (!une) { une = geoUne(PERSO_GEO.get(ckey)); PERSO_UNE.set(ckey, une); }
    const mu = toonUne(), mesh = new THREE.SkinnedMesh(une, mu); mesh.bind(skel, new THREE.Matrix4()); mesh.boundingSphere = zone; mesh.receiveShadow = true; g.add(mesh);
    g.scale.setScalar(o.scale ?? .76); g.rotation.order = "YXZ";
    g.userData = { une: mu.userData.u, female, legs, arms, knees, elbows, head, lids, blink: 2 + R() * 4, skinColor: skinC.getHex(), hairColor: hairC.getHex(), capColor: o.cap, clothes: { shirt: o.shirt, pants: o.pants ?? 0x3a4a63, shoe: o.shoe ?? 0xf5f5f5 } };
    setOutfit(g, null); return g;
  }
  for (const [key, geo] of Object.entries(PERSO_GEO.get(ckey))) { const mesh = new THREE.SkinnedMesh(geo, M[key]); mesh.bind(skel, new THREE.Matrix4()); mesh.boundingSphere = zone;
    mesh.castShadow = !o.lite; mesh.receiveShadow = true; g.add(mesh); if (parts[key]) parts[key].push(mesh); if (key === "sh") top.push(mesh);
    // contour foncé (pas sur la peau des bras et des jambes : il dessinerait les articulations)
    if (!o.lite && key !== "deco" && key !== "skl") { const c = new THREE.SkinnedMesh(geo, matContour); c.bind(skel, new THREE.Matrix4()); c.boundingSphere = zone; mesh.add(c); } }
  g.scale.setScalar(o.scale ?? .76); g.rotation.order = "YXZ";
  parts.sw.forEach(m => m.visible = false);
  const shM = o.motifHaut ? motif(o.motifHaut, o.shirt) : null, paM = o.motifBas ? motif(o.motifBas, o.pants) : null;
  g.userData = { swim: parts.sw, suit: M.sw, pantsParts: parts.pa, female, top, sleeves, legs, arms, knees, elbows, head, lids, blink: 2 + R() * 4, shirt: M.sh, pants: M.pa, shoe: M.so, skin: M.sk, skinColor: skinC.getHex(), shirtParts: parts.sh, shoeParts: parts.so.concat(parts.sole), longPants: o.shorts ? [] : [],
    clothes: { shirt: shM ? 0xffffff : o.shirt, pants: paM ? 0xffffff : o.pants ?? 0x3a4a63, shoe: o.shoe ?? 0xf5f5f5, shirtMap: shM, pantsMap: paM } };
  return g;
}
// clignement des yeux et respiration, pour tous les personnages
function liveFace(g, dt) {
  const u = g.userData; if (!u.lids) return; u.blink -= dt;
  const closing = u.blink < .12 && u.blink > 0; const a = closing ? .12 : 1; for (const l of u.lids) l.scale.y += (a - l.scale.y) * Math.min(1, dt * 30);
  if (u.blink <= 0) u.blink = 2.5 + Math.random() * 4;
}
function animPerson(g, mode, t) {
  const { legs, arms, knees, elbows } = g.userData; g.rotation.x = 0;
  const set = (hl, hr, kl, kr, al, ar, el, er, az = 0) => { legs[0].rotation.z = legs[1].rotation.z = 0; legs[0].rotation.x = hl; legs[1].rotation.x = hr; knees[0].rotation.x = kl; knees[1].rotation.x = kr; arms[0].rotation.x = al; arms[1].rotation.x = ar; elbows[0].rotation.x = el; elbows[1].rotation.x = er; arms[0].rotation.z = -az; arms[1].rotation.z = az; };
  const s = Math.sin(t);
  if (mode === "walk") set(s * .55, -s * .55, Math.max(0, -s) * .9 + .05, Math.max(0, s) * .9 + .05, -s * .45, s * .45, -.25 - Math.max(0, s) * .3, -.25 - Math.max(0, -s) * .3, .06);
  else if (mode === "swim") { g.rotation.x = 1.35; const a = t % (Math.PI * 2); set(Math.sin(t * 2) * .35, -Math.sin(t * 2) * .35, .15, .15, -a, -((a + Math.PI) % (Math.PI * 2)), -.2, -.2, .15); }
  else if (mode === "tread") set(Math.sin(t) * .3 - .2, -Math.sin(t) * .3 - .2, .6 + Math.sin(t) * .2, .6 - Math.sin(t) * .2, -.3, -.3, -.6 + Math.sin(t * 1.5) * .3, -.6 - Math.sin(t * 1.5) * .3, .9);
  else if (mode === "climb") set(-.5 + s * .5, -.5 - s * .5, .9 - s * .3, .9 + s * .3, -2.6 + s * .35, -2.6 - s * .35, -.3, -.3);
  else if (mode === "pedal") set(-1.3 + s * .35, -1.3 - s * .35, 1.2 - s * .3, 1.2 + s * .3, -.8, -.8, -.6, -.6);
  else if (mode === "ride") set(-1.45, -1.45, .2, .2, -2.9, -2.9, 0, 0, .3);
  else if (mode === "bike") set(-.95 + .4 * s, -.95 - .4 * s, 1.1 - .45 * s, 1.1 + .45 * s, -1.0, -1.0, -.35, -.35, .12);
  else if (mode === "kart") set(-1.45, -1.45, .25, .25, -.95, -.95, -.45, -.45, .1);
  else if (mode === "saddle") { set(-.85, -.85, .95, .95, -.7 + s * .04, -.7 - s * .04, -.9, -.9, .1); legs[0].rotation.z = -.38; legs[1].rotation.z = .38; }
  else if (mode === "sit") set(-1.5, -1.5, 1.5, 1.5, -.35, -.35, -.5, -.5);
  else if (mode === "buoy") set(-1.25, -1.25, .6 + s * .1, .6 - s * .1, -.3, -.3, -.2, -.2, .75);
  else { for (const p of [...legs, ...arms, ...knees, ...elbows]) { p.rotation.x *= .8; p.rotation.z *= .8; } arms[0].rotation.z = -.06; arms[1].rotation.z = .06; elbows[0].rotation.x = elbows[1].rotation.x = -.15; }
}
// tenue : habits ou maillot de bain
function setOutfit(g, id) {
  const u = g.userData, su = SUITS.find(x => x.id === id), show = (arr, v) => arr.forEach(m => m.visible = v);
  if (u.une) { // la foule : couleurs et parties visibles dans le shader
    const P = u.une.pal.value, Vi = u.une.vis.value, I = k => PARTIES.indexOf(k), col = (k, c) => P[I(k)].set(c), vis = (ks, v) => ks.forEach(k => Vi[I(k)] = v ? 1 : 0);
    col("sk", u.skinColor); col("skl", u.skinColor); col("hr", u.hairColor); col("sole", 0x2b2b2b); col("cap", u.capColor ?? 0xffffff);
    col("sh", su?.full ? su.a : u.clothes.shirt); col("pa", u.clothes.pants); col("so", u.clothes.shoe);
    vis(["sh", "pa"], !su || su.full); vis(["so", "sole"], !su); vis(["sw"], !!su && !su.full);
    u.une.texK.value = su ? I(su.full ? "pa" : "sw") : -1; u.une.suitMap.value = su ? suitTex(su) : BLANC1; return;
  }
  show(u.swim, !!su && !su.full);
  if (!su) { // habits
    show(u.shirtParts, true); show(u.pantsParts, true); show(u.shoeParts, true);
    u.shirt.color.setHex(u.clothes.shirt); u.shirt.map = u.clothes.shirtMap ?? null; u.pants.color.setHex(u.clothes.pants); u.pants.map = u.clothes.pantsMap ?? null; u.pants.metalness = 0; u.pants.roughness = .8;
  } else if (su.full) { // combinaison de surf : haut à manches et bas, pieds nus
    show(u.shirtParts, true); show(u.pantsParts, true); show(u.shoeParts, false);
    u.shirt.color.set(su.a); u.shirt.map = null; u.pants.color.setHex(0xffffff); u.pants.map = suitTex(su); u.pants.metalness = 0; u.pants.roughness = .7;
  } else { // short de bain ou maillot une pièce, pieds nus
    show(u.shirtParts, false); show(u.pantsParts, false); show(u.shoeParts, false);
    u.suit.map = suitTex(su); u.suit.metalness = su.gold ? .7 : 0; u.suit.roughness = su.gold ? .22 : .55; u.suit.needsUpdate = true;
  }
  u.shirt.needsUpdate = true; u.pants.needsUpdate = true;
}
function putGlasses(g, i) {
  const h = g.userData.head; if (g.userData.glasses) { h.remove(g.userData.glasses); g.userData.glasses = null; } if (!i) return;
  const [, fc, lc] = GLASSES[i], gl = new THREE.Group(), fm = mat(fc, .3, { metalness: i === 4 ? .8 : .2 }), lm = new THREE.MeshStandardMaterial({ color: lc, transparent: true, opacity: i === 3 ? .85 : .3, roughness: .05 });
  for (const s of [-1, 1]) { const rim = new THREE.Mesh(new THREE.TorusGeometry(.058, .012, 8, 24), fm); rim.position.set(s * .082, .02, .218); gl.add(rim); const lens = new THREE.Mesh(new THREE.CircleGeometry(.056, 20), lm); lens.position.set(s * .082, .02, .222); gl.add(lens);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(.01, .012, .2), fm); arm.position.set(s * .2, .03, .12); arm.rotation.y = s * .25; gl.add(arm); }
  const bridge = new THREE.Mesh(new THREE.TorusGeometry(.025, .009, 6, 10, Math.PI), fm); bridge.position.set(0, .035, .222); gl.add(bridge);
  h.add(gl); g.userData.glasses = gl;
}
export { person, animPerson, liveFace, setOutfit, putGlasses };
