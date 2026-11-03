// Contrôle du héros à pied DANS LE JEU (méthode : dragonflyer/CONCEPTION.md § 7 bis) : repos de face et de dos, marche,
// course, saut, coup d'épée, épée au dos, en plein jour, plus un villageois qui marche. Une image par cas + une planche.
// Lancer : node jeu.js <dossier de sortie> [port]   (serveur : python3 -m http.server <port> à la racine du dépôt ;
// CDN_LOCAL=<dossier> pour servir three.js depuis une copie locale si le réseau manque)
const { chromium } = require("playwright"); const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const OUT = process.argv[2] || "jeu", PORT = process.argv[3] || "8123", CDN = process.env.CDN_LOCAL;
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch({ proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: "localhost,127.0.0.1" } : undefined,
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const p = await b.newPage({ serviceWorkers: "block", viewport: { width: 640, height: 640 } });
  const erreurs = []; p.on("pageerror", e => { erreurs.push(e.message); console.log("ERREUR", e.message); });
  p.on("console", m => { if (m.type() === "warning" || m.type() === "error") console.log("console", m.type(), m.text().slice(0, 200)); });
  if (CDN) await p.route("https://cdn.jsdelivr.net/npm/**", r => { const f = path.join(CDN, new URL(r.request().url()).pathname.replace("/npm/", "")); fs.existsSync(f) ? r.fulfill({ path: f, contentType: "application/javascript" }) : r.continue(); });
  await p.goto(`http://localhost:${PORT}/dragonflyer/?test&q=haute`);
  for (let i = 0; i < 150; i++) { await p.waitForTimeout(3000); if (await p.evaluate(() => document.getElementById("chargement").hidden)) break; }
  await p.addStyleTag({ content: "body > *:not(#c) { visibility: hidden !important }" });
  await p.evaluate(() => { const d = window.__df; d.jouer(); d.pas(3); d.MONDE_T.heure = .42;
    const v = d.VILLAGES[0], C = v.place, x = C.x + v.rayon + 25, z = C.z;   // au bord du premier village, bas au-dessus du sol
    d.etat.pos.set(x, Math.max(0, d.hauteur(x, z)) + 12, z); d.etat.yaw = -Math.PI / 2; d.pas(2); d.sePoser(); d.pas(130); });
  const etat = await p.evaluate(() => ({ sol: window.__df.etat.sol, cave: !!window.__df.CAVE }));
  console.log("état", JSON.stringify(etat));
  // photo autour du héros : angle 0 = de face, 180 = de dos, 90 = de côté
  const photo = async (nom, angle, dist = 2.6, haut = 1.0, cible = .75) => {
    await p.evaluate(([angle, dist, haut, cible]) => {
      const d = window.__df, M = d.marche, a = M.yaw + angle * Math.PI / 180;
      const x = M.pos.x + Math.sin(a) * dist, z = M.pos.z + Math.cos(a) * dist;
      d.vue(x, M.pos.y + haut, z, M.pos.x, M.pos.y + cible, M.pos.z); d.rendre();
    }, [angle, dist, haut, cible]);
    await p.screenshot({ path: path.join(OUT, nom + ".png"), timeout: 600000 }); console.log("image", nom);
  };
  const touches = async (codes, images, bas = true) => { for (const c of codes) await p.keyboard[bas ? "down" : "up"](c); if (images) await p.evaluate(n => window.__df.pas(n), images); };
  await p.evaluate(() => window.__df.pas(30));
  await photo("01_repos_face", 0); await photo("02_repos_dos", 180); await photo("03_repos_34", 40, 2.2, 1.2, .9);
  await touches(["KeyW"], 45); await photo("04_marche_cote", 90, 3.0); await touches(["KeyW"], 0, false); await p.evaluate(() => window.__df.pas(40));
  await touches(["KeyW", "ShiftLeft"], 45); await photo("05_course_cote", 90, 3.2); await photo("06_course_face", 0, 3.2);
  await touches(["KeyW", "ShiftLeft"], 0, false); await p.evaluate(() => window.__df.pas(50));
  await touches(["Space"], 6); await touches(["Space"], 0, false); await photo("07_saut", 90, 3.2, 1.2, 1.0); await p.evaluate(() => window.__df.pas(60));
  // l'épée : on la donne au héros (comme après la Caverne des Braises)
  const epee = await p.evaluate(async () => { const d = window.__df; if (!d.CAVE) return "pas de caverne chargée"; d.BRAISES.epee = true; d.majEpeeDos(); d.pas(5); return "ok"; });
  console.log("épée", epee);
  await photo("08_epee_dos", 180, 2.2, 1.2, .9); await photo("09_epee_dos_34", 140, 2.2, 1.2, .9);
  await p.evaluate(() => { window.__df.frapper(); window.__df.pas(7); }); await photo("10_coup_face", 20, 2.8);
  await p.evaluate(() => window.__df.pas(4)); await photo("11_coup_suite", 20, 2.8);
  // un villageois qui marche
  const vil = await p.evaluate(() => { const d = window.__df, V = d.VILLAGEOIS; if (!V || !V.length) return null;
    const v = V.find(v => v.M && v.M.vitesse > .2) || V[0]; return { n: V.length, pos: [v.M.pos.x, v.M.pos.y, v.M.pos.z], yaw: v.M.yaw || 0, v: v.M.vitesse }; });
  console.log("villageois", JSON.stringify(vil));
  if (vil) {
    await p.evaluate(v => { const d = window.__df; d.marche.pos.set(v.pos[0] + 6, v.pos[1], v.pos[2] + 6); d.pas(20); }, vil);
    const v2 = await p.evaluate(() => { const d = window.__df; const v = d.VILLAGEOIS.find(v => v.M && v.M.vitesse > .2) || d.VILLAGEOIS[0];
      const M = v.M, a = (M.yaw || 0) + Math.PI / 2; d.vue(M.pos.x + Math.sin(a) * 3, M.pos.y + 1, M.pos.z + Math.cos(a) * 3, M.pos.x, M.pos.y + .75, M.pos.z); d.rendre(); return M.vitesse; });
    console.log("vitesse du villageois", v2); await p.screenshot({ path: path.join(OUT, "12_villageois.png"), timeout: 600000 });
  }
  fs.writeFileSync(path.join(OUT, "erreurs.txt"), erreurs.join("\n") + "\n");
  await b.close();
  try { execFileSync("python3", ["-c", `
from PIL import Image; import glob, sys
d = sys.argv[1]; fs = sorted(glob.glob(d + "/[01]*.png"))[:12]; ims = [Image.open(f) for f in fs]
w, h = ims[0].size[0] // 2, ims[0].size[1] // 2; P = Image.new("RGB", (w * 4, h * ((len(ims) + 3) // 4)))
for i, im in enumerate(ims): P.paste(im.resize((w, h)), ((i % 4) * w, (i // 4) * h))
P.save(d + "/planche.png")`, OUT]); } catch (e) { console.log("planche :", e.message); }
})();
