// The Dragon Apprentice Chronicles : banc de contrôle des VUES AÉRIENNES (ce que voit le joueur à dos de dragon).
// Pour chaque village : 12 vues fixes, toujours les mêmes, prises dans le jeu avec le dragon en vol à l'endroit de la caméra
// (le jeu charge donc ce qu'il chargerait vraiment : terrain, arbres, imposteurs, villages lointains), puis une planche
// et un rapport chiffré. Les images sont notées par un inspecteur séparé (.claude/skills/modele-3d/inspecteur_aerien.md).
// Lancer (serveur local du dépôt sur le port donné) :
//   CDN_LOCAL=<copie du CDN> node vues_aeriennes.js <dossier> [port] [village]
const { chromium } = require("playwright"); const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const PLANCHE = `
import sys, glob
from PIL import Image
d = sys.argv[1]; fs = sorted(glob.glob(d + "/[01]*.png"))[:12]; ims = [Image.open(f) for f in fs]
w, h = ims[0].size; k = 400 / w; W, H = int(w * k), int(h * k); pl = Image.new("RGB", (W * 4, H * 3))
for i, im in enumerate(ims): pl.paste(im.resize((W, H)), ((i % 4) * W, (i // 4) * H))
pl.save(d + "/planche.png")`;
const planche = dos => execFileSync("python3", ["-c", PLANCHE, dos]);
const OUT = process.argv[2] || "aeriennes", PORT = process.argv[3] || "8099", SEUL = process.argv[4];
const CDN = process.env.CDN_LOCAL;
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const p = await b.newPage({ serviceWorkers: "block", viewport: { width: 800, height: 500 } });
  const erreurs = []; p.on("pageerror", e => { erreurs.push(e.message); console.log("ERREUR", e.message); });
  if (CDN) await p.route("https://cdn.jsdelivr.net/npm/**", r => { const f = path.join(CDN, new URL(r.request().url()).pathname.replace("/npm/", "")); fs.existsSync(f) ? r.fulfill({ path: f, contentType: "application/javascript" }) : r.continue(); });
  await p.goto(`http://localhost:${PORT}/dragonflyer/?test&q=haute`);
  for (let i = 0; i < 150; i++) { await p.waitForTimeout(4000); if (await p.evaluate(() => document.getElementById("chargement").hidden)) break; }
  await p.addStyleTag({ content: "body > *:not(#c) { visibility: hidden !important }" });   // seulement l'image du jeu
  await p.evaluate(() => { const d = window.__df; d.jouer(); d.pas(3); d.MONDE_T.heure = .42; });
  const noms = await p.evaluate(() => window.__df.VILLAGES.map(v => v.nom));
  for (const nom of noms) {
    if (SEUL && nom !== SEUL) continue;
    const dos = path.join(OUT, nom); fs.mkdirSync(dos, { recursive: true });
    const cams = await p.evaluate(nom => {
      const d = window.__df, v = d.VILLAGES.find(v => v.nom === nom), C = v.place, h = (x, z) => Math.max(0, d.hauteur(x, z)), hc = h(C.x, C.z);
      const nl = Math.hypot(v.mx, v.mz) || 1, mx = v.mx / nl, mz = v.mz / nl;   // vers la mer
      const L = [], degage = (x, y, z, tx, ty, tz) => { for (let k = 1; k < 40; k++) { const t = k / 40, px = x + (tx - x) * t, pz = z + (tz - z) * t; if (h(px, pz) > y + (ty - y) * t - 4) return false; } return true; };
      const cam = (n, x, z, alt, tx, tz, ty = hc, heure = .42) => {   // si une montagne cache la cible : monter un peu, puis tourner un peu autour (jamais deux vues au même endroit)
        for (const f of [1, 1.4, 2]) for (let k = 0; k < 7; k++) { const a = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * Math.PI / 12, c = Math.cos(a), s = Math.sin(a);
          const X = tx + (x - tx) * c - (z - tz) * s, Z = tz + (x - tx) * s + (z - tz) * c, Y = Math.max(h(X, Z) + 15, hc + alt * f);
          if (degage(X, Y, Z, tx, ty, tz)) { L.push([n, [X, Y, Z], [tx, ty, tz], heure]); return; } }
        L.push([n, [x, Math.max(h(x, z) + 15, hc + alt * 2), z], [tx, ty, tz], heure]); };
      // 01 à 04 : arrivée en vol depuis les quatre côtés, 60 m au-dessus de la place, à 130 m
      [["01_arrivee_mer", mx, mz], ["02_arrivee_terre", -mx, -mz], ["03_arrivee_cote_g", -mz, mx], ["04_arrivee_cote_d", mz, -mx]].forEach(([n, ex, ez]) => cam(n, C.x + ex * 130, C.z + ez * 130, 60, C.x, C.z));
      cam("05_oblique_150m", C.x + (mx - mz) * 150, C.z + (mz + mx) * 150, 150, C.x, C.z);                  // en plongée, de haut
      cam("06_tres_haut_350m", C.x + .1, C.z + 260, 350, C.x, C.z);                                        // très haut : le village dans son île
      cam("07_rase_motte_25m", C.x - mx * 60, C.z - mz * 60, 25, C.x + mx * 60, C.z + mz * 60, hc + 5);     // survol bas qui traverse le village
      cam("08_dessus_220m", C.x + .1, C.z + .1, 220, C.x, C.z);                                            // à la verticale
      cam("09_foret_80m", C.x - mx * 160 - mz * 80, C.z - mz * 160 + mx * 80, 80, C.x - mx * 60, C.z - mz * 60);   // la forêt et les collines derrière le village
      cam("10_cote_40m", C.x + mx * 90 - mz * 120, C.z + mz * 90 + mx * 120, 40, C.x + mx * 40, C.z + mz * 40);     // le long du rivage, depuis la mer
      cam("11_soir_150m", C.x + (mx - mz) * 150, C.z + (mz + mx) * 150, 150, C.x, C.z, hc, .795);          // même vue que 05, au coucher du soleil
      cam("12_horizon_600m", C.x + mx * 600, C.z + mz * 600, 120, C.x, C.z, hc + 20);                      // de très loin : le village à l'horizon (détails lointains)
      return L;
    }, nom);
    const mesures = [];
    for (const [n, pos, cible, heure] of cams) {
      const m = await p.evaluate(([pos, cible, heure]) => {
        const d = window.__df; d.MONDE_T.heure = heure; if (d.majHeure) d.majHeure(0);
        d.etat.pos.set(...pos); d.pas(40);   // le dragon vole là : le jeu charge ce qu'il voit
        if (d.dragon) d.dragon.visible = false;
        d.vue(...pos, ...cible); const inf = d.renderer.info; inf.autoReset = false; inf.reset(); const t0 = performance.now(); d.rendre(); const ms = performance.now() - t0; inf.autoReset = true;
        if (d.dragon) d.dragon.visible = true;
        const ri = d.renderer.info.render; return { appels: ri.calls, triangles: ri.triangles, ms: Math.round(ms) };
      }, [pos, cible, heure]);
      await p.screenshot({ path: path.join(dos, n + ".png"), timeout: 600000 });
      mesures.push(`- ${n} : caméra à ${pos.map(Math.round).join(", ")}, ${m.appels} appels de dessin, ${(m.triangles / 1000).toFixed(0)} k triangles, rendu ${m.ms} ms (SwiftShader, à comparer entre deux tours seulement)`);
    }
    const tete = await p.evaluate(nom => { const d = window.__df, v = d.VILLAGES.find(v => v.nom === nom); return `${nom} : ${v.maisons.length} maisons, rayon ${v.rayon.toFixed(0)} m`; }, nom);
    const rapport = [tete, ...mesures, erreurs.length ? "ERREURS : " + erreurs.join(" | ") : "aucune erreur de la page"].join("\n");
    fs.writeFileSync(path.join(dos, "rapport.txt"), rapport + "\n"); console.log(rapport);
    planche(dos);
  }
  await b.close();
})();
