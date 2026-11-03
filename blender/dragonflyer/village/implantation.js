// Contrôle de l'implantation des villages de DragonFlyer, dans le vrai jeu (méthode : dragonflyer/CONCEPTION.md § 7 bis).
// Pour chaque village : 12 vues toujours prises de la même façon (depuis la place vers les 4 points cardinaux, de dessus,
// en plongée, de côté depuis les champs, dans deux rues devant une porte, à l'approche) + une planche + un rapport chiffré
// (pente sous chaque maison, soubassement découvert, porte face au vide, porte bouchée, maisons trop serrées, dans l'eau).
// Lancer : node implantation.js <dossier de sortie> [port] [village]   (serveur : python3 -m http.server <port> à la racine du dépôt)
const { chromium } = require("playwright"); const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
// planche 4 × 3 des 12 vues (Python et Pillow)
const planche = dos => { try { execFileSync("python3", ["-c", `
from PIL import Image; import glob, sys
d = sys.argv[1]; fs = sorted(glob.glob(d + "/[01]*.png"))[:12]; ims = [Image.open(f) for f in fs]
w, h = ims[0].size[0] // 2, ims[0].size[1] // 2; P = Image.new("RGB", (w * 4, h * 3))
for i, im in enumerate(ims): P.paste(im.resize((w, h)), ((i % 4) * w, (i // 4) * h))
P.save(d + "/planche.png")`, dos]); } catch (e) { console.log("planche :", e.message); } };
const OUT = process.argv[2] || "implantation", PORT = process.argv[3] || "8099", SEUL = process.argv[4];
const CDN = process.env.CDN_LOCAL;   // dossier optionnel qui contient une copie des fichiers du CDN
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch({ proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: "localhost,127.0.0.1" } : undefined,
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const p = await b.newPage({ serviceWorkers: "block", viewport: { width: 800, height: 500 } });
  p.on("pageerror", e => console.log("ERREUR", e.message));
  if (CDN) await p.route("https://cdn.jsdelivr.net/npm/**", r => { const f = path.join(CDN, new URL(r.request().url()).pathname.replace("/npm/", "")); fs.existsSync(f) ? r.fulfill({ path: f, contentType: "application/javascript" }) : r.continue(); });
  await p.goto(`http://localhost:${PORT}/dragonflyer/?test&q=haute`);
  for (let i = 0; i < 150; i++) { await p.waitForTimeout(4000); if (await p.evaluate(() => document.getElementById("chargement").hidden)) break; }
  await p.addStyleTag({ content: "body > *:not(#c) { visibility: hidden !important }" });   // seulement l'image du jeu
  await p.evaluate(() => { const d = window.__df; d.jouer(); d.pas(3); d.MONDE_T.heure = .42; });
  const noms = await p.evaluate(() => window.__df.VILLAGES.map(v => v.nom));
  for (const nom of noms) {
    if (SEUL && nom !== SEUL) continue;
    const dos = path.join(OUT, nom); fs.mkdirSync(dos, { recursive: true });
    // le héros à pied sur la place : le jeu met à jour le village, les ombres, la végétation autour
    const cams = await p.evaluate(nom => {
      const d = window.__df, v = d.VILLAGES.find(v => v.nom === nom), C = v.place, R = v.rayon, h = (x, z) => Math.max(0, d.hauteur(x, z));
      if (d.etat.sol !== "pied") { d.etat.pos.set(C.x + 20, h(C.x, C.z) + 40, C.z + 20); d.pas(2); d.sePoser(); d.pas(150); }
      d.marche.pos.set(C.x, h(C.x, C.z), C.z); d.pas(60);
      const hc = h(C.x, C.z), L = [];
      [["01_place_nord", 0, -1], ["02_place_est", 1, 0], ["03_place_sud", 0, 1], ["04_place_ouest", -1, 0]].forEach(([n, dx, dz]) =>
        L.push([n, [C.x + dx * 4, h(C.x + dx * 4, C.z + dz * 4) + 1.7, C.z + dz * 4], [C.x + dx * 40, hc + 3, C.z + dz * 40]]));   // à 4 m du centre (le puits est au milieu)
      L.push(["05_dessus", [C.x + .1, hc + R * 1.7, C.z + .1], [C.x, hc, C.z]]);
      for (const [n, sx, sz] of [["06_plongee_ne", .8, -.8], ["07_plongee_so", -.8, .8]]) { const Rv = Math.min(R, 75), x = C.x + Rv * sx, z = C.z + Rv * sz; L.push([n, [x, Math.max(hc + Rv * .55, h(x, z) + 12), z], [C.x, hc, C.z]]); }   // jamais dans le sol
      const rues = v.rues || [];   // vues de côté et d'approche dans l'axe des rues d'entrée (là où les trouées dégagent la vue)
      for (const [n, k] of [["08_cote_rue2", 1], ["09_cote_rue3", 2]]) { const ru = rues[k] || { dx: Math.cos(k * 2.1), dz: Math.sin(k * 2.1), L: 30 }, d0 = (ru.L || 30) + 14, x = C.x + ru.dx * d0, z = C.z + ru.dz * d0; L.push([n, [x, h(x, z) + 4, z], [C.x, hc + 3, C.z]]); }
      const portes = d.PORTES.filter(q => v.maisons.includes(q.maison));
      portes.slice(0, 2).forEach((q, i) => { const ox = Math.sin(q.yaw), oz = Math.cos(q.yaw), x = q.x + ox * 4.2 + oz * 1.2, z = q.z + oz * 4.2 - ox * 1.2;   // dans la rue, un peu de biais
        L.push([`1${i}_rue_porte_${q.maison.type}`, [x, h(x, z) + 2.2, z], [q.x, q.y + 1.2, q.z]]); });
      { const ru = rues[0] || { dx: 1, dz: 0, L: 30 }, d0 = (ru.L || 30) + 26, x = C.x + ru.dx * d0, z = C.z + ru.dz * d0; L.push(["12_approche", [x, h(x, z) + 7, z], [C.x, hc + 2, C.z]]); }   // en arrivant par la première rue
      return L;
    }, nom);
    for (const [n, pos, cible] of cams) {
      await p.evaluate(([pos, cible]) => { const d = window.__df; d.vue(...pos, ...cible); d.rendre(); }, [pos, cible]);
      await p.screenshot({ path: path.join(dos, n + ".png"), timeout: 600000 });
    }
    // rapport chiffré
    const rapport = await p.evaluate(nom => {
      const d = window.__df, v = d.VILLAGES.find(v => v.nom === nom), C = v.place, L = [`${nom} : ${v.maisons.length} maisons, ${v.props.length} accessoires, rayon ${v.rayon.toFixed(0)} m`];
      v.maisons.forEach((o, i) => {
        const [mn, mx] = d.terrainSous(o.x, o.z, o.yaw, o.hx, o.hz), dc = Math.hypot(o.x - C.x, o.z - C.z);
        // écart réel entre emprises (rectangles tournés) : points du bord de l'une, distance au rectangle de l'autre
        const dRect = (q, x, z) => { const dx = x - q.x, dz = z - q.z, c = Math.cos(q.yaw), s = Math.sin(q.yaw), lx = Math.abs(dx * c - dz * s) - q.hx, lz = Math.abs(dx * s + dz * c) - q.hz;
          return Math.hypot(Math.max(lx, 0), Math.max(lz, 0)) + Math.min(Math.max(lx, lz), 0); };
        let pres = 1e9; v.maisons.forEach((q, j) => { if (j === i) return; const c = Math.cos(o.yaw), s = Math.sin(o.yaw);
          for (let k = 0; k < 40; k++) { const t = k / 40 * 4, a = t % 1 * 2 - 1, cote = t | 0, lx = cote === 0 ? a : cote === 1 ? 1 : cote === 2 ? -a : -1, lz = cote === 0 ? -1 : cote === 1 ? a : cote === 2 ? 1 : -a;
            pres = Math.min(pres, dRect(q, o.x + lx * o.hx * c + lz * o.hz * s, o.z - lx * o.hx * s + lz * o.hz * c)); } });
        const pt = d.PORTES.find(q => q.maison === o) || o.seuil; let porte = "pas de porte";
        if (pt) {
          const ox = Math.sin(pt.yaw), oz = Math.cos(pt.yaw), devant = [1, 2, 3].map(k => d.hauteur(pt.x + ox * k, pt.z + oz * k));
          const bouche = [1, 2, 3].some(k => { const c = d.dansUnRect(pt.x + ox * k, pt.z + oz * k, .3); return c && Math.abs(c.x - o.x) + Math.abs(c.z - o.z) > .01; });
          const vers = (Math.atan2(C.x - pt.x, C.z - pt.z) - pt.yaw + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
          porte = `seuil ${(pt.y - devant[0]).toFixed(2)} m au-dessus du sol devant, pente devant ${(Math.max(...devant) - Math.min(...devant)).toFixed(2)} m sur 3 m, ` +
            `${bouche ? "PORTE BOUCHÉE par un autre objet" : "passage libre"}, tournée à ${Math.round(Math.abs(vers) * 180 / Math.PI)}° de la place`;
        }
        L.push(`- ${o.type} n°${i + 1} à ${dc.toFixed(0)} m de la place : terrain ${mn.toFixed(1)} à ${mx.toFixed(1)} m (soubassement découvert ${(o.y - mn).toFixed(2)} m), ` +
          `écart à la maison voisine ${pres.toFixed(1)} m${mn < .5 ? ", DANS L'EAU" : ""} ; ${porte}`);
      });
      return L.join("\n");
    }, nom);
    fs.writeFileSync(path.join(dos, "rapport.txt"), rapport + "\n"); console.log(rapport);
    await p.evaluate(() => 0);
    planche(dos);
  }
  await b.close();
})();
