// shot.js — photographie une scène du labo (navigateur sans écran, rendu logiciel).
// Usage : node shot.js "scene=habits&v=neuf&vue=face" sortie.png [largeur=1400] [hauteur=800] [js à évaluer après]
// Plusieurs photos d'un coup : node shot.js --lot fichier.json   (fichier : [[requete, sortie, l, h], ...])
// Affiche les erreurs de la page et window.labStats (temps de construction, triangles, appels de dessin).
const { chromium } = require("playwright");
const path = require("path"), fs = require("fs");
const LAB = __dirname, CDN = path.join(LAB, "cdn");
const TYPES = { ".js": "application/javascript", ".html": "text/html", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg" };
async function photo(browser, req, out, w = 1400, h = 800, js = "") {
  const page = await browser.newPage({ viewport: { width: +w, height: +h } });
  const msgs = [];
  page.on("console", m => { if (m.type() === "error" || m.type() === "warning" && !/GPU stall|GL Driver/.test(m.text())) msgs.push("[" + m.type() + "] " + m.text().slice(0, 600)); });
  page.on("pageerror", e => msgs.push("[pageerror] " + (e.stack || e.message).slice(0, 800)));
  await page.route("https://cdn.jsdelivr.net/npm/**", r => { const p = path.join(CDN, new URL(r.request().url()).pathname.replace("/npm/", "")); fs.existsSync(p) ? r.fulfill({ path: p, contentType: "application/javascript" }) : (msgs.push("MANQUE " + p), r.abort()); });
  await page.route("https://lab.local/**", r => { const u = new URL(r.request().url()), p = path.join(LAB, decodeURIComponent(u.pathname)); if (fs.existsSync(p)) return r.fulfill({ path: p, contentType: TYPES[path.extname(p)] || "application/octet-stream", headers: { "cache-control": "no-store" } });
    if (/\/scenarios-\w+\.js$/.test(u.pathname)) return r.fulfill({ body: "export const SCENES = {};", contentType: "application/javascript" }); // fichier de scènes facultatif
    msgs.push("404 " + u.pathname); r.fulfill({ status: 404, body: "" }); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ body: "", contentType: "text/css" }));
  const t0 = Date.now();
  await page.goto("https://lab.local/index.html?" + req);
  await page.waitForFunction(() => window.labPret || document.getElementById("err").style.display === "block", null, { timeout: 240000 }).catch(e => msgs.push("pas prêt : " + e.message));
  if (js) { const r = await page.evaluate(js).catch(e => "ERR " + e.message); if (r !== undefined) console.log("eval:", typeof r === "string" ? r : JSON.stringify(r)); }
  await page.screenshot({ path: out, timeout: 240000 });
  const st = await page.evaluate(() => window.labStats).catch(() => null);
  console.log(`${out}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`); if (st) console.log("  stats:", JSON.stringify(st));
  for (const m of msgs) console.log("  " + m);
  await page.close();
}
(async () => {
  const a = process.argv.slice(2);
  const browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  if (a[0] === "--lot") { for (const [req, out, w, h, js] of JSON.parse(fs.readFileSync(a[1], "utf8"))) await photo(browser, req, out, w, h, js); }
  else await photo(browser, a[0] || "scene=habits", a[1] || path.join(LAB, "out", "photo.png"), a[2], a[3], a[4]);
  await browser.close();
})();
