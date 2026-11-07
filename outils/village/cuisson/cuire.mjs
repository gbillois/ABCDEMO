#!/usr/bin/env node
// Cuisson du Village de Millépoques en 3D : fait dessiner une ville de Millepoques par le code de Millepoques,
// dans Chromium (Playwright), et écrit le sol, les planches d'images et village.json.
//
//   node outils/village/cuisson/cuire.mjs <dépôt Millepoques> <ville.json> <dossier de sortie> [x0 y0 largeur hauteur]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { serveur } from './serveur.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');

const [mp, ville, sortie, x0 = 88, y0 = 62, w = 80, h = 128] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const voir = process.argv.find((a) => a.startsWith('--voir='))?.slice(7) || '';
if (!mp || !ville || !sortie) { console.error('usage : cuire.mjs <dépôt Millepoques> <ville.json> <sortie> [x0 y0 w h]'); process.exit(1); }
const ici = path.dirname(new URL(import.meta.url).pathname);
const { srv, port } = await serveur({ millepoques: path.resolve(mp), ici, ville: path.resolve(ville) });
const nav = await chromium.launch();
const page = await nav.newPage({ viewport: { width: 800, height: 600 } });
page.on('console', (m) => { const t = m.text(); if (t.startsWith('[cuisson]') || m.type() === 'error') console.log(t); });
page.on('pageerror', (e) => console.log('[erreur]', e.message));
await page.goto(`http://127.0.0.1:${port}/cuisson/cuire.html?x0=${x0}&y0=${y0}&w=${w}&h=${h}&voir=${voir}`);
await page.waitForFunction(() => window.CUIT || window.ECHEC, null, { timeout: 900000, polling: 500 });
const echec = await page.evaluate(() => window.ECHEC);
if (echec) { console.error('échec :', echec); process.exit(1); }
const { json, sorties } = await page.evaluate(() => window.CUIT);
fs.rmSync(sortie, { recursive: true, force: true });
for (const d of ['sol', 'travail']) fs.mkdirSync(path.join(sortie, d), { recursive: true });
let octets = 0;
for (let i = 0; i < sorties.length; i++) {
  const url = await page.evaluate((n) => window.SORTIES[n].url, i);
  const buf = Buffer.from(url.split(',')[1], 'base64'); octets += buf.length;
  fs.writeFileSync(path.join(sortie, sorties[i]), buf);
}
fs.writeFileSync(path.join(sortie, 'village.json'), JSON.stringify(json));
console.log('écrit', sorties.length, 'images (', (octets / 1e6).toFixed(1), 'Mo ) et village.json dans', sortie);
await nav.close(); srv.close();
