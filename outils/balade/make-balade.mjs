#!/usr/bin/env node
/**
 * « La Balade de Millépoques » — le niveau Luminati (https://gitlab.com/stubborn-hug/lumina, licence MIT)
 * qui porte une ville de Millepoques cuite par outils/balade/cuisson/.
 *
 * Copié dans `tools/` du moteur par `outils/balade/fabriquer.sh`, il lit `ville.json` (la cuisson) et écrit
 * `public/levels/balade.json` : un niveau plat, une case de Millepoques = une case du niveau. Le niveau ne
 * sert qu'à marcher : cases bloquées (eau, bâtiments, arbres, rochers), départ devant l'hôtel de ville,
 * caméra, et le nom des bâtiments quand on passe devant (régions). Tout ce qu'on voit est dessiné par
 * src/game/balade/Balade.js à partir de la cuisson (`environment.millepoques`).
 *
 *   node tools/make-balade.mjs <ville.json> [--out=public/levels/balade.json]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEmptyLevel, setTile, addObject, normalizeLevel, parseLevel, validateLevel, serializeLevel } from '../src/engine/level/LevelFormat.js';
import { parseArgs, canonicalObject, keyLevel, keyIssueLines } from './lib/levelgen.mjs';

/** @import { LevelObject } from '../src/engine/level/types.js' */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const args = parseArgs(argv.filter((a) => a.startsWith('--')));
const villeFichier = argv.find((a) => !a.startsWith('--'));
if (!villeFichier) { console.error('usage : make-balade.mjs <ville.json> [--out=…]'); process.exit(1); }
const OUT = path.resolve(root, String(args.out ?? 'public/levels/balade.json'));
const V = JSON.parse(fs.readFileSync(villeFichier, 'utf8'));
const W = V.w, D = V.h;

const L = createEmptyLevel({ name: 'Millépoques', width: W, depth: D, fill: 'g', level: 0, border: 0 });
L.subtitle = 'Le village de Théo';
L.author = 'Les jeux de Théo';
L.description = 'Une ville de Millepoques à parcourir à pied, en 2,5D.';
// une case qu'on ne traverse pas (le dessin vient de Millepoques : le moteur ne la montre pas)
L.legend.X = { top: 'grass', side: 'cliff', walkable: false };
L.legend.W = { top: 'riverbed', side: 'cliff', walkable: false };
for (let j = 0; j < D; j++) {
  for (let i = 0; i < W; i++) {
    const c = V.cases[j][i];
    const bord = i < 1 || j < 1 || i >= W - 1 || j >= D - 1;
    setTile(L, i, j, bord ? 'X' : c === '~' ? 'W' : c === '.' || c === '=' ? 'g' : 'X');
  }
}

L.waterLevel = -2;
// départ : devant l'hôtel de ville, sur la case libre la plus proche
let depart = null;
for (let r = 0; r < 12 && !depart; r++) {
  for (let dj = -r; dj <= r && !depart; dj++) for (let di = -r; di <= r && !depart; di++) {
    const i = Math.floor(V.depart.x) + di, j = Math.floor(V.depart.y) + dj;
    if (Math.max(Math.abs(di), Math.abs(dj)) === r && L.tiles[j]?.[i] === 'g' && L.tiles[j + 1]?.[i] === 'g') depart = { x: i + 0.5, z: j + 0.5 };
  }
}
L.spawn = { ...(depart ?? { x: V.depart.x, z: V.depart.y }), facing: 'down' };
L.environment = {
  ...L.environment,
  timeOfDay: 12.5,
  clock: false,
  weather: 'clear',
  border: 'none',
  outerScenery: false,
  godRays: false,
  dust: false,
  music: true,
  minimap: false,
  combat: false,
  backdrop: '#b2c2d6',
  camera: { distance: 18, pitch: 50, bounds: { minX: 4, maxX: W - 4, minZ: 4, maxZ: D - 2 } },
  title: {
    title: 'La Balade de Millépoques',
    subtitle: 'Le village de Théo, à la Renaissance',
    prompt: 'Touche ou appuie sur une touche',
    credit: 'Dessins de Millépoques · moteur Luminati · three.js',
  },
  // la ville (outils/balade/cuisson) : chemin depuis game.html
  millepoques: { ville: '../ville/ville.json', joueur: 0, passants: 18, vitesse: 0.55, zoomMin: 8, zoomMax: 30 },
};

// le nom des bâtiments, quand on passe devant (un peu plus large que le bâtiment, surtout côté sud)
const batiments = V.objets.filter((o) => o.k === 'batiment' && o.bw);
// les plus petits d'abord : la première région qui contient le joueur gagne
batiments.sort((a, b) => a.bw * a.bh - b.bw * b.bh);
for (const b of batiments) {
  addObject(L, 'region', 0, 0, { name: b.nom, sub: 'Millépoques', minX: b.bx - 0.2, maxX: b.bx + b.bw + 0.2, minZ: b.by, maxZ: b.by + b.bh + 0.9 });
}
addObject(L, 'region', 0, 0, { name: 'Le village de Théo', sub: 'Millépoques · Renaissance', minX: 0, maxX: W, minZ: 0, maxZ: D, banner: 'Promène-toi dans le village' });

const { level, warnings } = normalizeLevel(L);
level.objects = level.objects.map((o) => /** @type {LevelObject} */ (canonicalObject(o)));
keyLevel(level, { root, file: path.relative(root, OUT) });
const errs = [...validateLevel(level), ...keyIssueLines(level)];
const text = serializeLevel(level);
if (serializeLevel(parseLevel(text).level) !== text) errs.push('ne se réécrit pas à l’identique');
for (const m of [...warnings, ...errs]) console.warn('balade :', m);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, text);
console.log(`balade → ${path.relative(root, OUT)} (${W} × ${D}, ${level.objects.length} objets)`);
