// banc.js — banc de test des personnages du Domaine des Pins, dans le VRAI jeu (méthode : blender/pins/METHODE.md § 4 et § 6).
// Les personnages sont faits en code par le jeu (person, animPerson) : on les pose dans un studio (scène à part, sol gradué,
// ciel uni, soleil), et on fait toujours les mêmes trois planches et le même rapport :
//   A_repos.png       : garçon, fille, homme, femme au repos, 12 vues (face, droite, dos, gauche, 4 plongées, visages de près, dessus, contre-plongée)
//   B_postures.png    : les postures du jeu (assis, allongé, saut, nage, sur place dans l'eau, échelle, toboggan, bouée, tyrolienne,
//                       marche et course figées au milieu du pas, repos) : rien ne doit traverser ni se plier en « papier de bonbon »
//   C_<allure>_cote.png / _face.png : animations en images fixes régulières, caméra qui suit, disques au sol sous chaque pied
//                       réellement posé (rouge = droit, bleu = gauche, fixes dans le monde), ligne graduée tous les 50 cm
//   controle.txt      : pour chaque allure, vitesse, cadence, longueur de pas et, pour CHAQUE appui de chaque pied, le glissement
//                       d'un point de semelle (talon et plante du pied) pendant qu'il touche le sol (cible : 3 cm au plus), enfoncement.
// Usage : node blender/pins/personnages/banc.js <dossier_sortie> [fichier.html=pins/index.html]   (PINS_CDN : dossier de three@0.170.0)
const { chromium } = require("playwright");   // (installé avec Playwright dans l'environnement ; sinon : npm i playwright)
const path = require("path"), fs = require("fs"), http = require("http");
const [OUT = "banc", HTML = path.join(__dirname, "../../../pins/index.html")] = process.argv.slice(2), CDN = process.env.PINS_CDN || path.join(__dirname, "../cdn");
// les allures du jeu : promeneurs ≈ 1,2 m/s, enfant de la foule 1,6, joueur qui marche 4,2, joueur qui court 7,5 (pins/index.html)
const ALLURES_TOUTES = [["promenade_adulte", "homme", 1.25], ["promenade_enfant", "garcon", 1.6], ["marche_joueur", "garcon", 4.2], ["course_joueur", "garcon", 7.5]];

const ALLURES = process.env.PINS_ALLURES ? ALLURES_TOUTES.filter(a => process.env.PINS_ALLURES.split(",").includes(a[0])) : ALLURES_TOUTES;
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const RACINE = path.dirname(path.resolve(HTML)), TYPES = { ".html": "text/html", ".js": "text/javascript", ".glb": "model/gltf-binary", ".png": "image/png", ".json": "application/json", ".webmanifest": "application/json" };
  const serveur = http.createServer((q, r) => { const f = path.join(RACINE, decodeURIComponent(new URL(q.url, "http://x").pathname)); const g = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, "index.html") : f;
    if (!g.startsWith(RACINE) || !fs.existsSync(g)) { r.writeHead(404); return r.end(); } r.writeHead(200, { "Content-Type": TYPES[path.extname(g)] || "application/octet-stream" }); fs.createReadStream(g).pipe(r); });
  await new Promise(r => serveur.listen(0, "127.0.0.1", r));
  const browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const page = await browser.newPage({ viewport: { width: 800, height: 500 } }), msgs = [];
  page.on("pageerror", e => msgs.push("[pageerror] " + (e.stack || e.message).slice(0, 600)));
  await page.route("https://cdn.jsdelivr.net/npm/**", r => { const p = path.join(CDN, new URL(r.request().url()).pathname.replace("/npm/", "")); fs.existsSync(p) ? r.fulfill({ path: p, contentType: "application/javascript" }) : r.abort(); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ body: "", contentType: "text/css" }));
  await page.route(/sw\.js$|\.mp3$/, r => r.abort());
  await page.addInitScript(() => { try { localStorage.setItem("pins-persos", JSON.stringify([{ nom: "Théo", sexe: "g", look: [0, 6, 0, 3, 1, 1, 0, 0, 2, 3, 1, 0, 1] }])); localStorage.setItem("pins-perso", "0"); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${serveur.address().port}/` + path.basename(HTML));
  await page.waitForFunction(() => window.__pins, null, { timeout: 300000 }).catch(() => { console.log("pas chargé", msgs); process.exit(1); });
  await page.evaluate(() => document.getElementById("startBtn")?.click()); await page.waitForTimeout(1500);

  // ---------- le studio (dans la page)
  await page.evaluate(() => {
    const P = window.__pins, T = P.THREE, S = new T.Scene(); S.background = new T.Color(0x9fc3e6);
    S.add(new T.HemisphereLight(0xdfefff, 0x6a7350, 1.1)); const sol = new T.DirectionalLight(0xfff1dd, 2.4); sol.position.set(-6, 12, 8); sol.castShadow = true;
    sol.shadow.mapSize.set(2048, 2048); Object.assign(sol.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: .5, far: 60 }); sol.shadow.bias = -.0005; S.add(sol, sol.target);
    const c = document.createElement("canvas"); c.width = c.height = 512; const x = c.getContext("2d"); x.fillStyle = "#7d8466"; x.fillRect(0, 0, 512, 512); x.strokeStyle = "rgba(255,255,255,.35)"; x.lineWidth = 2;
    for (let i = 0; i <= 512; i += 64) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 512); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(512, i); x.stroke(); }
    const tx = new T.CanvasTexture(c); tx.wrapS = tx.wrapT = T.RepeatWrapping; tx.repeat.set(25, 25); tx.colorSpace = T.SRGBColorSpace;   // une case = 50 cm
    const g = new T.Mesh(new T.PlaneGeometry(200, 200), new T.MeshStandardMaterial({ map: tx, roughness: 1 })); g.rotation.x = -Math.PI / 2; g.receiveShadow = true; S.add(g);
    const cam = new T.PerspectiveCamera(32, 720 / 480, .05, 300), rt = new T.WebGLRenderTarget(720, 480, { samples: 4 }); rt.texture.colorSpace = T.SRGBColorSpace;
    const tampon = new Uint8Array(720 * 480 * 4), cv = document.createElement("canvas"); cv.width = 720; cv.height = 480; const cx = cv.getContext("2d");
    const photo = (pos, cible, fov = 32) => { cam.fov = fov; cam.updateProjectionMatrix(); cam.position.set(...pos); cam.lookAt(...cible); const R = P.renderer;
      R.setRenderTarget(rt); R.render(S, cam); R.readRenderTargetPixels(rt, 0, 0, 720, 480, tampon); R.setRenderTarget(null);
      const im = cx.createImageData(720, 480); for (let y = 0; y < 480; y++) im.data.set(tampon.subarray((479 - y) * 2880, (480 - y) * 2880), y * 2880); cx.putImageData(im, 0, 0); return cv.toDataURL("image/png"); };
    // horloge imposée : animPerson lit performance.now() pour son pas de temps ; ici une image = 1/30 s exactement
    const vrai = performance.now.bind(performance); let faux = vrai();
    const pas = (dt = 1 / 30) => { faux += dt * 1000; }, figer = on => { performance.now = on ? () => faux : vrai; };
    const TYPES = { garcon: { scale: .6, shirt: 0x2e86de, pants: 0x3a4a63, shorts: true, hair: 0x5a3a22 }, fille: { scale: .6, long: true, shirt: 0xe84393, pants: 0x34495e, hair: 0x8a5a2b },
      homme: { scale: .76, shirt: 0x27ae60, pants: 0x3a4a63, hair: 0x3b2a1a }, femme: { scale: .74, long: true, shirt: 0xf39c12, pants: 0x2c3e50, hair: 0x5a3a22 } };
    const faire = (k, seed = 7) => { const p = P.person({ ...TYPES[k], seed, skin: 0xf1c6a0 }); p.userData.animGraine = 11; S.add(p); return p; };
    const disques = [], disque = (x, z, droit) => { const d = new T.Mesh(new T.CircleGeometry(.09, 20), new T.MeshBasicMaterial({ color: droit ? 0xe53935 : 0x1e63e5 })); d.rotation.x = -Math.PI / 2; d.position.set(x, .012, z); S.add(d); disques.push(d); };
    const effacerDisques = () => { for (const d of disques.splice(0)) S.remove(d); };
    window.__banc = { P, T, S, photo, pas, figer, faire, disque, effacerDisques, horloge: () => faux / 1000 };
  });

  const ecrire = (nom, data) => fs.writeFileSync(path.join(OUT, nom), Buffer.from(data.split(",")[1], "base64"));
  const planche = async (noms, sortie, col = 4, legendes) => { const imgs = noms.map(n => "data:image/png;base64," + fs.readFileSync(path.join(OUT, n)).toString("base64"));
    const d = await page.evaluate(async ([srcs, col, leg]) => { const W = 360, H = 240, rows = Math.ceil(srcs.length / col), c = document.createElement("canvas"); c.width = W * col; c.height = H * rows; const x = c.getContext("2d");
      for (let i = 0; i < srcs.length; i++) { const im = new Image(); im.src = srcs[i]; await im.decode(); const X = (i % col) * W, Y = Math.floor(i / col) * H; x.drawImage(im, X, Y, W, H);
        x.fillStyle = "#000a"; x.fillRect(X, Y, Math.min(W, 20 + (leg?.[i] || "").length * 7.5), 20); x.fillStyle = "#fff"; x.font = "13px sans-serif"; x.fillText(String(i + 1).padStart(2, "0") + " " + (leg?.[i] || ""), X + 4, Y + 15); }
      return c.toDataURL("image/png"); }, [imgs, col, legendes]);
    ecrire(sortie, d); };
  const rapport = ["Glissement : pour chaque appui d'un point de semelle (il porte : à moins de 1 cm du sol et le plus bas du pied), plus grand déplacement au sol pendant l'appui.",
    "Enfoncement : point de semelle le plus bas en allure stable (après 1 s). Points : talon, plante (sous l'articulation des orteils), pointe des orteils.",
    "Historique de la mesure (même jeu, novembre 2026) : tour 0, articulations cheville et orteils à moins de 2 cm, 30 images/s : glissement max 6 / 7 / 23 / 33 cm",
    "(promenade adulte / enfant / marche / course). Depuis le tour 2 : points de la semelle qui portent (le plus bas du pied, à moins de 1 cm), 60 images/s. Avec",
    "l'ancienne règle (points à moins de 1 cm, sans « le plus bas »), la course du tour 2 donnait 3,8 cm ; avec la nouvelle, 3,2 cm au tour 2."];

  { const tri = await page.evaluate(() => { const B = window.__banc; return ["garcon", "fille", "homme", "femme"].map(k => { const p = B.faire(k); let n = 0; p.traverse(o => { if (o.isMesh && o.visible && o.geometry) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; }); B.S.remove(p); return n; }); });
    rapport.push(`triangles par personnage complet (garçon, fille, homme, femme) : ${tri.join(", ")} (budget 12 000)`); }
  if (!process.env.PINS_C) {   // (PINS_C=1 : seulement les animations, pour aller vite pendant une correction)
  // ---------- A : repos, 12 vues (les quatre personnages côte à côte, à 1,2 m l'un de l'autre)
  const A = await page.evaluate(() => { const B = window.__banc; B.figer(true); const ps = ["garcon", "fille", "homme", "femme"].map((k, i) => { const p = B.faire(k); p.position.set(-1.8 + i * 1.2, 0, 0); return p; });
    for (let f = 0; f < 40; f++) { B.pas(); for (const p of ps) { p.userData.horloge = B.horloge(); B.P.animPerson(p, "idle", 0); } }
    const c = [0, .82, 0], V = [["face", [0, 1.1, 5.6]], ["droite", [5.6, 1.1, 0]], ["dos", [0, 1.1, -5.6]], ["gauche", [-5.6, 1.1, 0]], ["pl_fd", [3.6, 3.4, 3.8]], ["pl_dg", [-3.6, 3.4, -3.8]]];
    const imgs = V.map(([n, p]) => B.photo(p, c));
    ps.forEach((p, i) => { const h = p.userData.head.getWorldPosition(new B.T.Vector3()); imgs.push(B.photo([h.x, h.y + .12, h.z + 1.25], [h.x, h.y + .06, h.z], 30)); });   // portrait de face de chacun (tête entière et épaules)
    { const h = ps[0].userData.head.getWorldPosition(new B.T.Vector3()), k = ps[1].userData.head.getWorldPosition(new B.T.Vector3()); imgs.push(B.photo([(h.x + k.x) / 2 + 1.3, h.y + .15, 2.0], [(h.x + k.x) / 2, h.y - .05, 0], 30)); }   // trois quarts, enfants
    { const h = ps[2].userData.head.getWorldPosition(new B.T.Vector3()), k = ps[3].userData.head.getWorldPosition(new B.T.Vector3()); imgs.push(B.photo([(h.x + k.x) / 2 + 1.4, h.y + .15, 2.2], [(h.x + k.x) / 2, h.y - .05, 0], 30)); }   // trois quarts, adultes
    const tri = ps.map(p => { let n = 0; p.traverse(o => { if (o.isMesh && o.visible && o.geometry) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; }); return n; });
    for (const p of ps) B.S.remove(p); B.figer(false); return { imgs, tri }; });
  A.imgs.forEach((d, i) => ecrire(`A_${String(i + 1).padStart(2, "0")}.png`, d));
  await planche(A.imgs.map((_, i) => `A_${String(i + 1).padStart(2, "0")}.png`), "A_repos.png", 4, ["face", "droite", "dos", "gauche", "plongée avant", "plongée arrière", "portrait garçon", "portrait fille", "portrait homme", "portrait femme", "trois quarts enfants", "trois quarts adultes"]);


  // ---------- B : postures du jeu (garçon et femme), de trois quarts
  const MODES_B = [["idle", 0], ["walk", .25], ["walk", .75], ["jump", 0], ["sit", 0], ["lie", 0], ["swim", 1], ["tread", 1], ["climb", 1], ["ride", 0], ["buoy", 1], ["zip", 1]];
  const Bp = await page.evaluate(MODES => { const B = window.__banc; B.figer(true); const out = [];
    for (const [m, ph] of MODES) { const ps = ["garcon", "femme"].map((k, i) => { const p = B.faire(k, 3 + i); p.position.set(i ? .8 : -.8, m === "lie" ? .5 : m === "swim" ? .4 : 0, m === "swim" || m === "lie" ? (i ? -.6 : .6) : 0); return p; });
      for (let f = 0; f < 45; f++) { B.pas(); for (const p of ps) { p.userData.horloge = B.horloge(); if (m === "lie") p.rotation.x = -1.5;
        B.P.animPerson(p, m, m === "walk" ? f * .3 + ph * 2 * Math.PI : m === "swim" || m === "tread" || m === "climb" || m === "buoy" ? f * .15 : 0, m === "walk" ? (ph < .5 ? 1.3 : 6) : m === "jump" ? 2 : m === "zip" ? 3 : undefined); } }
      out.push(B.photo(m === "swim" || m === "lie" ? [2.6, 2.4, 2.9] : [2.0, 1.4, 2.7], [0, m === "lie" || m === "swim" ? .45 : .8, 0], 40)); for (const p of ps) B.S.remove(p); }
    B.figer(false); return out; }, MODES_B);
  Bp.forEach((d, i) => ecrire(`B_${String(i + 1).padStart(2, "0")}.png`, d));
  await planche(Bp.map((_, i) => `B_${String(i + 1).padStart(2, "0")}.png`), "B_postures.png", 4, ["repos", "marche lente", "course", "saut", "assis", "allongé", "nage", "sur place (eau)", "échelle", "toboggan", "bouée", "tyrolienne"]);

  }
  // ---------- C : animations (images fixes régulières, caméra qui suit, disques sous les pieds posés) + mesure du glissement
  for (const [nom, type, v] of ALLURES) {
    const R = await page.evaluate(([type, v]) => { const B = window.__banc, T = B.T; B.figer(true); B.effacerDisques();
      const p = B.faire(type), u = p.userData, os = u.os, dt = 1 / 60, N = 300; let wt = 0;   // 60 images par seconde, comme le jeu
      for (let f = 0; f < 40; f++) { B.pas(dt); u.horloge = B.horloge(); B.P.animPerson(p, "idle", 0); }
      p.updateMatrixWorld(true); const w = new T.Vector3(), rep = { ch: [0, 0], or: [0, 0] };
      // points de la semelle (comme le jeu : D.talon et D.balle) : le talon au sol, un peu derrière la cheville ; la plante au sol sous
      // l'articulation des orteils. Pris au repos (pied à plat), puis suivis dans le repère de l'os du pied.
      const loc = [];
      for (const [s, a, b] of [[0, "pied_d", "orteils_d"], [1, "pied_g", "orteils_g"]]) { const A = new T.Vector3(), O = new T.Vector3(); os[a].getWorldPosition(A); os[b].getWorldPosition(O);
        const inv = os[a].matrixWorld.clone().invert(), invO = os[b].matrixWorld.clone().invert();
        loc[s] = { ch: new T.Vector3(A.x, 0, A.z - .3 * (O.z - A.z)).applyMatrix4(inv), or: new T.Vector3(O.x, 0, O.z).applyMatrix4(inv), po: new T.Vector3(O.x, 0, O.z + .45 * (O.z - A.z)).applyMatrix4(invO) }; }
      const traces = [[], []], frames = [];
      for (let f = 0; f < N; f++) { B.pas(dt); u.horloge = B.horloge(); p.position.z += v * dt; wt += dt * 9 * (v > 6 ? 1.5 : 1); B.P.animPerson(p, "walk", wt, v); p.updateMatrixWorld(true);
        const t = []; for (const [s, a, b] of [[0, "pied_d", "orteils_d"], [1, "pied_g", "orteils_g"]]) { const ch = loc[s].ch.clone().applyMatrix4(os[a].matrixWorld), or = loc[s].or.clone().applyMatrix4(os[a].matrixWorld), po = loc[s].po.clone().applyMatrix4(os[b].matrixWorld);
          traces[s].push({ f, ch: [ch.x, ch.y, ch.z], or: [or.x, or.y, or.z], po: [po.x, po.y, po.z] }); }
      }
      // appuis : un point (cheville ou orteils) à moins de 2 cm de sa hauteur de repos ; glissement = son déplacement au sol pendant l'appui
      const appuis = [];
      // un point porte quand il est à moins de 1 cm du sol ET le plus bas du pied (à 5 mm près) : un point qui se soulève en tournant ne porte plus
      const porte = (e, k) => e[k][1] < .01 && e[k][1] <= Math.min(e.ch[1], e.or[1], e.po[1]) + .005;
      for (const s of [0, 1]) for (const k of ["ch", "or", "po"]) { let deb = -1; const tr = traces[s];
        for (let i = 0; i <= tr.length; i++) { const bas = i < tr.length && porte(tr[i], k) && tr[i].f >= 60;
          if (bas && deb < 0) deb = i; if (!bas && deb >= 0) { if (i - deb >= 2) { const a = tr[deb][k], b = tr[i - 1][k], ch = tr.slice(deb, i).map(e => e[k]);
            let gl = 0; for (const q of ch) for (const r of ch) gl = Math.max(gl, Math.hypot(q[0] - r[0], q[2] - r[2]));
            appuis.push({ pied: s ? "gauche" : "droit", point: k === "ch" ? "talon" : k === "or" ? "plante" : "pointe", deb: tr[deb].f, fin: tr[i - 1].f, glisse: gl, x: (a[0] + b[0]) / 2, z: (a[2] + b[2]) / 2 }); } deb = -1; } } }
      const bas = k => Math.min(...traces.flatMap(tr => tr.filter(e => e.f >= 60).map(e => e[k][1]))) /* allure stable (après le passage du repos à la marche) */, enfonce = Math.min(bas("ch"), bas("or"), bas("po")), basPts = { talon: bas("ch"), plante: bas("or"), pointe: bas("po") };
      // les disques : un par appui des orteils (là où le pied est posé)
      for (const a of appuis) if (a.point === "plante") B.disque(a.x, a.z, a.pied === "droit");
      // pas : appuis du pied droit entier (un point quelconque de la semelle porte), début et place moyenne
      const od = [], tr0 = traces[0]; { let deb = -1; for (let i = 0; i <= tr0.length; i++) { const b = i < tr0.length && tr0[i].f >= 60 && ["ch", "or", "po"].some(k => porte(tr0[i], k));
        if (b && deb < 0) deb = i; if (!b && deb >= 0) { if (i - deb >= 2) { const m = tr0.slice(deb, i); od.push({ deb: tr0[deb].f, x: m.reduce((a, e) => a + e.or[0], 0) / m.length, z: m.reduce((a, e) => a + e.or[2], 0) / m.length }); } deb = -1; } } }
      const pasL = [], per = [];
      for (let i = 1; i < od.length; i++) { pasL.push(Math.hypot(od[i].x - od[i - 1].x, od[i].z - od[i - 1].z)); per.push((od[i].deb - od[i - 1].deb) * dt); }
      // les 12 photos couvrent exactement un cycle (deux pas), quelle que soit l'allure
      { const od0 = od.filter(a => a.deb >= 100), cyc = od0.length > 1 ? od0[1].deb - od0[0].deb : 48, f0 = od0.length ? od0[0].deb : 120;
        for (let i = 0; i < 12; i++) frames.push(f0 + Math.round(i * cyc / 12)); }
      // rejouer pour les photos (même horloge, mêmes poses)
      B.S.remove(p); const q = B.faire(type); const uq = q.userData; wt = 0; const imgsC = [], imgsF = [];
      for (let f = 0; f < 40; f++) { B.pas(dt); uq.horloge = B.horloge(); B.P.animPerson(q, "idle", 0); }
      for (let f = 0; f < N; f++) { B.pas(dt); uq.horloge = B.horloge(); q.position.z += v * dt; wt += dt * 9 * (v > 6 ? 1.5 : 1); B.P.animPerson(q, "walk", wt, v);
        if (frames.includes(f)) { const z = q.position.z, H = type === "homme" ? 1 : .8; imgsC.push(B.photo([4.2, H, z], [0, H * .85, z], 30)); imgsF.push(B.photo([.6, H, z + 4.6], [0, H * .85, z], 30)); } }
      B.S.remove(q); B.figer(false);
      // longueur de pas et cadence : entre deux appuis successifs des orteils du même pied
      const moy = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;
      return { appuis, enfonce, imgsC, imgsF, foulee: moy(pasL), periode: moy(per), frames, traces, basPts };
    }, [type, v]);
    R.imgsC.forEach((d, i) => ecrire(`C_${nom}_cote_${String(i + 1).padStart(2, "0")}.png`, d)); R.imgsF.forEach((d, i) => ecrire(`C_${nom}_face_${String(i + 1).padStart(2, "0")}.png`, d));
    await planche(R.imgsC.map((_, i) => `C_${nom}_cote_${String(i + 1).padStart(2, "0")}.png`), `C_${nom}_cote.png`, 4, R.frames.map(f => `image ${f}`));
    await planche(R.imgsF.map((_, i) => `C_${nom}_face_${String(i + 1).padStart(2, "0")}.png`), `C_${nom}_face.png`, 4, R.frames.map(f => `image ${f}`));
    fs.writeFileSync(path.join(OUT, `traces_${nom}.json`), JSON.stringify(R.traces));
    const orteils = R.appuis.filter(a => a.point === "plante"), max = Math.max(0, ...R.appuis.map(a => a.glisse));
    rapport.push("", `${nom} (${type}, ${v} m/s) : foulée (un cycle, même pied) ${R.foulee.toFixed(2)} m, cycle ${R.periode.toFixed(2)} s (${(2 / R.periode).toFixed(1)} pas/s), ` +
      `${orteils.length} appuis de la plante, glissement max ${(max * 100).toFixed(1)} cm (cible ≤ 3 cm : ${max <= .03 ? "OK" : "TROP"}), point le plus bas ${(R.enfonce * 100).toFixed(1)} cm sous le sol (talon ${(R.basPts.talon * 100).toFixed(1)}, plante ${(R.basPts.plante * 100).toFixed(1)}, pointe ${(R.basPts.pointe * 100).toFixed(1)} ; négatif = s'enfonce)`);
    for (const a of R.appuis.sort((a, b) => a.deb - b.deb)) rapport.push(`  pied ${a.pied}, ${a.point}, images ${a.deb}-${a.fin} : glisse ${(a.glisse * 100).toFixed(1)} cm${a.glisse > .03 ? "  ← TROP" : ""}`);
  }
  await page.evaluate(() => window.__banc.effacerDisques());
  fs.writeFileSync(path.join(OUT, "controle.txt"), rapport.join("\n") + "\n" + msgs.join("\n") + "\n"); console.log(rapport.join("\n"), msgs);
  await browser.close(); serveur.close();
})();
