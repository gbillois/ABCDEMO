// implantation.js — photographie le VRAI jeu (pins/index.html) depuis 12 vues toujours les mêmes, autour des cottages
// (contrôle de l'implantation, méthode de blender/pins/METHODE.md § 7). Interface cachée, caméra posée à la main.
// Usage : node blender/pins/implantation.js <dossier_sortie> [fichier.html=pins/index.html] [cdn=dossier où est three@0.170.0]
// PINS_VUES='[["nom", [x, y, z], [x, y, z]], …]' remplace les 12 vues (pour regarder un endroit de près).
// Le dossier cdn contient « three@0.170.0/… » (npm pack three@0.170.0) : les modules du CDN sont servis depuis le disque.
const { chromium } = require("playwright");
const path = require("path"), fs = require("fs"), http = require("http");
const [OUT = "implantation", HTML = path.join(__dirname, "../../pins/index.html"), CDN = process.env.PINS_CDN || path.join(__dirname, "cdn")] = process.argv.slice(2);
// [nom, position caméra, point visé] (repère du jeu : y vers le haut ; le cottage n°4 est le « tien », en x -16, z 44, porte vers -z)
const VUES = [
  ["01_allee_face", [-16, 1.7, 30.5], [-16, 3, 44]],
  ["02_face_gauche", [-25, 2.2, 32], [-16, 3, 43]],
  ["03_face_droite", [-6, 2.2, 32], [-16, 3, 43]],
  ["04_cote", [-27, 2, 44], [-16, 3.5, 44]],
  ["05_dos", [-12, 2.4, 58], [-16, 3.5, 44]],
  ["06_dessus", [-16, 46, 40.5], [-16, 0, 40]],
  ["07_plongee_face", [-2, 16, 24], [-16, 2, 42]],
  ["08_plongee_dos", [-30, 16, 62], [-16, 2, 44]],
  ["09_terrasse_porte", [-13.5, 1.6, 34.5], [-16, 1.6, 40]],
  ["10_plain_pied", [-26, 2, 31], [-32, 2.4, 43]],
  ["11_rangee", [8, 2.2, 29], [-40, 3, 40]],
  ["12_approche", [10, 9, 8], [-16, 2, 40]],
];
if (process.env.PINS_VUES) VUES.splice(0, VUES.length, ...JSON.parse(process.env.PINS_VUES)); // vues sur mesure (pour chercher un défaut)
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const page = await browser.newPage({ viewport: { width: 960, height: 600 }, deviceScaleFactor: 1 });
  const msgs = [];
  page.on("console", m => { if (m.type() === "error") msgs.push("[error] " + m.text().slice(0, 300)); });
  page.on("pageerror", e => msgs.push("[pageerror] " + (e.stack || e.message).slice(0, 600)));
  await page.route("https://cdn.jsdelivr.net/npm/**", r => { const p = path.join(CDN, new URL(r.request().url()).pathname.replace("/npm/", "")); fs.existsSync(p) ? r.fulfill({ path: p, contentType: "application/javascript" }) : (msgs.push("MANQUE " + p), r.abort()); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ body: "", contentType: "text/css" }));
  await page.route(/sw\.js$/, r => r.abort());
  await page.addInitScript(() => { try { localStorage.setItem("pins-persos", JSON.stringify([{ nom: "Théo", sexe: "g", look: [0, 6, 0, 3, 1, 1, 0, 0, 2, 3, 1, 0, 1] }])); localStorage.setItem("pins-perso", "0"); } catch (e) {} });
  // petit serveur local (avec file://, le jeu ne peut pas lire assets/cottage.glb)
  const RACINE = path.dirname(path.resolve(HTML)), TYPES = { ".html": "text/html", ".js": "text/javascript", ".glb": "model/gltf-binary", ".mp3": "audio/mpeg", ".png": "image/png", ".json": "application/json", ".webmanifest": "application/json" };
  const serveur = http.createServer((q, r) => { const f = path.join(RACINE, decodeURIComponent(new URL(q.url, "http://x").pathname)); const g = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, "index.html") : f;
    if (!g.startsWith(RACINE) || !fs.existsSync(g)) { r.writeHead(404); return r.end(); } r.writeHead(200, { "Content-Type": TYPES[path.extname(g)] || "application/octet-stream" }); fs.createReadStream(g).pipe(r); });
  await new Promise(r => serveur.listen(0, "127.0.0.1", r));
  const t0 = Date.now();
  await page.goto(`http://127.0.0.1:${serveur.address().port}/` + path.basename(HTML));
  await page.waitForFunction(() => window.__pins, null, { timeout: 300000 }).catch(e => { console.log("pas chargé :", msgs.join("\n")); process.exit(1); });
  await page.evaluate(() => document.getElementById("startBtn")?.click());
  await page.waitForTimeout(2000);
  // joueur loin des cottages (aucun mur effacé), interface cachée, caméra imposée juste avant chaque dessin
  await page.evaluate(() => { const P = window.__pins; P.teleporter(-16, 22);
    const cv = P.renderer.domElement; for (const el of document.body.querySelectorAll("*")) if (el !== cv && !el.contains(cv) && el.tagName !== "SCRIPT") el.style.visibility = "hidden";
    window.__vue = null; const r = P.renderer, orig = r.render.bind(r);
    r.render = (s, c) => { if (window.__vue && c === P.camera) { c.position.set(...window.__vue[0]); c.lookAt(...window.__vue[1]); c.updateMatrixWorld(); } return orig(s, c); }; });
  if (process.env.PINS_EVAL) console.log("PINS_EVAL :", JSON.stringify(await page.evaluate(process.env.PINS_EVAL).catch(e => "ERR " + e.message)));   // une question posée au jeu (débogage)
  const rapport = [];
  for (const [nom, pos, cible] of VUES) {
    await page.evaluate(([p, c]) => { window.__vue = [p, c]; }, [pos, cible]);
    await page.waitForTimeout(1800);
    await page.screenshot({ path: path.join(OUT, nom + ".png") });
    rapport.push(nom);
  }
  // planche 4 × 3 dans la page (canvas 2D)
  const imgs = VUES.map(([n]) => "data:image/png;base64," + fs.readFileSync(path.join(OUT, n + ".png")).toString("base64"));
  const planche = await page.evaluate(async srcs => { const W = 480, H = 300, c = document.createElement("canvas"); c.width = W * 4; c.height = H * 3; const x = c.getContext("2d");
    for (let i = 0; i < srcs.length; i++) { const im = new Image(); im.src = srcs[i]; await im.decode(); x.drawImage(im, (i % 4) * W, Math.floor(i / 4) * H, W, H); x.fillStyle = "#000a"; x.fillRect((i % 4) * W, Math.floor(i / 4) * H, 30, 20); x.fillStyle = "#fff"; x.font = "14px sans-serif"; x.fillText(String(i + 1).padStart(2, "0"), (i % 4) * W + 6, Math.floor(i / 4) * H + 15); }
    return c.toDataURL("image/png"); }, imgs);
  fs.writeFileSync(path.join(OUT, "planche.png"), Buffer.from(planche.split(",")[1], "base64"));
  const info = await page.evaluate(() => { const P = window.__pins, r = P.renderer.info.render, tri = g => { let n = 0; g.traverse(o => { if (o.isMesh && o.geometry) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; }); return n; };
    const c = P.cottages.find(c => c.mine), s = P.cottages.find(c => c.single);
    return { appels: r.calls, triangles: r.triangles, cottage_etage: tri(c.g), cottage_plain_pied: tri(s.g) }; });
  fs.writeFileSync(path.join(OUT, "controle.txt"), `vues : ${rapport.length}\ndernière image : ${info.appels} appels de dessin, ${info.triangles} triangles\ntriangles d'un cottage (avec l'intérieur s'il y est) : à étage ${info.cottage_etage}, de plain-pied ${info.cottage_plain_pied}\n${msgs.join("\n")}\n`);
  console.log(`fini en ${((Date.now() - t0) / 1000).toFixed(0)} s`, info, msgs.slice(0, 8));
  await browser.close(); serveur.close();
})();
