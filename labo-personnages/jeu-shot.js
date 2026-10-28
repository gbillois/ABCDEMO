// jeu-shot.js — photographie le VRAI jeu (pins/index.html ou une copie) dans une situation donnée.
// Usage : node jeu-shot.js <fichier.html> <sortie.png> "<actions js (async, window.__pins = P)>" [largeur=960] [hauteur=540] [attente ms=2500]
// Plusieurs photos d'un coup : node jeu-shot.js --lot fichier.json   ([[html, sortie, actions, l, h, attente], ...])
// Le personnage gardé est un garçon (look du créateur) : pas d'écran de création au départ ; tous les maillots achetés.
// Dans les actions : P (window.__pins), THREE (window.THREE si exposé), attendre(ms), et toute la portée globale de la page.
const { chromium } = require("playwright");
const path = require("path"), fs = require("fs");
const CDN = path.join(__dirname, "cdn");
async function photo(browser, html, out, actions = "", w = 960, h = 540, attente = 2500, persos) {
  const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
  const msgs = [];
  page.on("console", m => { if (m.type() === "error") msgs.push("[error] " + m.text().slice(0, 500)); });
  page.on("pageerror", e => msgs.push("[pageerror] " + (e.stack || e.message).slice(0, 800)));
  await page.route("https://cdn.jsdelivr.net/npm/**", r => { const p = path.join(CDN, new URL(r.request().url()).pathname.replace("/npm/", "")); fs.existsSync(p) ? r.fulfill({ path: p, contentType: "application/javascript" }) : (msgs.push("MANQUE " + p), r.abort()); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ body: "", contentType: "text/css" }));
  await page.route(/sw\.js$/, r => r.abort());
  await page.addInitScript(p => { try { localStorage.setItem("pins-persos", JSON.stringify(p)); localStorage.setItem("pins-perso", "0"); localStorage.setItem("pins-maillots", JSON.stringify(["rouge", "raye", "palmiers", "requin", "arcenciel", "surf", "or"])); } catch (e) {} },
    persos || [{ nom: "Théo", sexe: "g", look: [0, 6, 0, 3, 1, 1, 0, 0, 2, 3, 1, 0, 1] }]);
  const t0 = Date.now();
  await page.goto("file://" + path.resolve(html));
  await page.waitForFunction(() => window.__pins, null, { timeout: 180000 }).catch(e => msgs.push("pas chargé : " + e.message));
  await page.evaluate(() => document.getElementById("startBtn")?.click());
  if (actions) { const r = await page.evaluate(`(async () => { const P = window.__pins, attendre = ms => new Promise(r => setTimeout(r, ms)); ${actions} })()`).catch(e => "ERR " + e.message); if (r !== undefined) console.log("  actions:", typeof r === "string" ? r : JSON.stringify(r)); }
  await page.waitForTimeout(+attente);
  await page.screenshot({ path: out, timeout: 300000 });
  console.log(`${out}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`); for (const m of msgs) console.log("  " + m);
  await page.close();
}
(async () => {
  const a = process.argv.slice(2);
  const browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  if (a[0] === "--lot") { for (const x of JSON.parse(fs.readFileSync(a[1], "utf8"))) await photo(browser, ...x); }
  else await photo(browser, a[0], a[1], a[2], a[3], a[4], a[5]);
  await browser.close();
})();
