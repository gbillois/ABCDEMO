#!/usr/bin/env node
// Cuisson : fait dessiner une ville de Millepoques par le code de Millepoques, dans Chromium (Playwright),
// et écrit le sol, les planches d'objets et ville.json.
//
//   node outils/balade/cuisson/cuire.mjs <dépôt Millepoques> <ville.json> <dossier de sortie> [x0 y0 largeur hauteur]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { serveur } from './serveur.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');

const [mp, ville, sortie, x0 = 92, y0 = 100, w = 80, h = 96] = process.argv.slice(2);
if (!mp || !ville || !sortie) { console.error('usage : cuire.mjs <dépôt Millepoques> <ville.json> <sortie> [x0 y0 w h]'); process.exit(1); }
const ici = path.dirname(new URL(import.meta.url).pathname);
const { srv, port } = await serveur({ millepoques: path.resolve(mp), ici, ville: path.resolve(ville) });
const nav = await chromium.launch();
const page = await nav.newPage({ viewport: { width: 800, height: 600 } });
page.on('console', (m) => { const t = m.text(); if (t.startsWith('[cuisson]') || m.type() === 'error') console.log(t); });
page.on('pageerror', (e) => console.log('[erreur]', e.message));
await page.goto(`http://127.0.0.1:${port}/cuisson/cuire.html?x0=${x0}&y0=${y0}&w=${w}&h=${h}`);
await page.waitForFunction(() => window.CUIT, null, { timeout: 600000, polling: 500 });
const { json, sorties } = await page.evaluate(() => window.CUIT);
fs.rmSync(sortie, { recursive: true, force: true });
fs.mkdirSync(path.join(sortie, 'sol'), { recursive: true });
for (let i = 0; i < sorties.length; i++) {
  const url = await page.evaluate((n) => window.SORTIES[n].url, i);
  fs.writeFileSync(path.join(sortie, sorties[i]), Buffer.from(url.split(',')[1], 'base64'));
}
fs.writeFileSync(path.join(sortie, 'ville.json'), JSON.stringify(json));
console.log('écrit', sorties.length, 'images et ville.json dans', sortie);
await nav.close(); srv.close();
