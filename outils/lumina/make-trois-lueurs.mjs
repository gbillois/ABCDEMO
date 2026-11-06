#!/usr/bin/env node
/**
 * « Les Trois Lueurs » — une petite campagne de démonstration pour le moteur Luminati
 * (https://gitlab.com/stubborn-hug/lumina, licence MIT), faite pour les jeux de Théo.
 *
 * Copié dans `tools/` du moteur par `outils/lumina/fabriquer.sh`, il écrit
 * `public/campaigns/trois-lueurs/` : `campaign.json`, trois niveaux et l'histoire.
 *
 * Trois styles, trois niveaux posés côte à côte sur le plan de la campagne (on passe de l'un à
 * l'autre en marchant) :
 *
 *   bourg   (48 × 40, au départ) Le Bourg des Prés : prés verts, haies, maisons, un lac, et au nord
 *           un plateau à falaises où se dresse la Grande Lanterne éteinte. Style « vert ».
 *   gorges  (48 × 34, à l'est) Les Gorges d'Ocre : sable rouge, mesas de grès, oasis et palmiers,
 *           sous le ciel sec du climat aride du moteur. Style « ocre ».
 *   marais  (44 × 36, au sud) Le Marais des Brumes : herbe sombre, mares, pontons, cyprès et arbres
 *           morts, brume et lucioles, à la tombée du soir. Style « brume ».
 *
 * L'histoire : Mamie Brindille demande de retrouver les trois lueurs de la Grande Lanterne (une
 * sur le plateau, une dans les gorges, une dans le marais), puis de la rallumer.
 *
 *   node tools/make-trois-lueurs.mjs [--out=<dossier>] [--force]
 *
 * Déterministe (pas de hasard). Toute la campagne passe par `checkCampaign` avant d'être écrite.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEmptyLevel, setTile, setHeightLevel, addObject, normalizeLevel, parseLevel, validateLevel, serializeLevel } from '../src/engine/level/LevelFormat.js';
import { CAMPAIGN_FORMAT, normalizeCampaign, serializeCampaign, levelFile } from '../src/game/campaign/CampaignFormat.js';
import { buildStory, serializeStory, serializeStoryText, storyFile } from '../src/game/campaign/StoryFormat.js';
import { parseScript } from '../src/engine/level/StoryScript.js';
import { carryCampaignText, carryStoryFile, retagStoryText, seededMint, fileKeyIssues } from '../src/engine/i18n/TextKeys.js';
import { parseArgs, canonicalObject, keyLevel, keyIssueLines, previousOutput } from './lib/levelgen.mjs';
import { checkCampaign } from './lib/campaigncheck.mjs';

/** @import { Level, LevelObject } from '../src/engine/level/types.js' */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = parseArgs(process.argv.slice(2));
const NAME = 'trois-lueurs';
const OUT = path.resolve(root, String(args.out ?? `public/campaigns/${NAME}`));
const DIR = `public/campaigns/${NAME}`;

// ---------------------------------------------------------------------------------------------
// Outils
// ---------------------------------------------------------------------------------------------

/** Remplit les cases [i0, i1) × [j0, j1) d'un caractère et / ou d'une hauteur. */
function fill(L, i0, j0, i1, j1, ch, lvl) {
  for (let j = Math.max(0, j0); j < Math.min(L.depth, j1); j++) {
    for (let i = Math.max(0, i0); i < Math.min(L.width, i1); i++) {
      if (ch != null) setTile(L, i, j, ch);
      if (lvl != null) setHeightLevel(L, i, j, lvl);
    }
  }
}

/** Un disque (ellipse) de cases autour de (ci, cj). */
function blob(L, ci, cj, ri, rj, ch, lvl) {
  for (let j = Math.floor(cj - rj); j <= Math.ceil(cj + rj); j++) {
    for (let i = Math.floor(ci - ri); i <= Math.ceil(ci + ri); i++) {
      if (i < 0 || j < 0 || i >= L.width || j >= L.depth) continue;
      const dx = (i + 0.5 - ci) / ri;
      const dz = (j + 0.5 - cj) / rj;
      if (dx * dx + dz * dz > 1) continue;
      if (ch != null) setTile(L, i, j, ch);
      if (lvl != null) setHeightLevel(L, i, j, lvl);
    }
  }
}

/** Un objet avec un identifiant lisible. */
function put(L, id, type, x, z, fields = {}) {
  const o = addObject(L, /** @type {any} */ (type), x, z, fields);
  if (id) o.id = id;
  return o;
}

function tree(L, kind, x, z, height = 4.4, extra = {}) {
  return addObject(L, 'tree', x, z, { opts: { kind, height, seed: Math.round(x * 10 + z * 3) }, ...extra });
}

function event(L, id, [x0, z0, x1, z1], fields) {
  return put(L, id, 'event', 0, 0, { minX: x0, maxX: x1, minZ: z0, maxZ: z1, ...fields });
}

/** Un autel de lueur : une pierre, une lumière qui brille tant que la lueur est là, des étincelles. */
function autel(L, id, x, z, item, stone, color) {
  addObject(L, 'rock', x, z - 0.15, { opts: { size: 0.55, flat: true, stone, seed: 7 } });
  put(L, `${id}_lumiere`, 'light', x, z + 0.4, { color, intensity: 7, distance: 7, dy: 1.3, nightOnly: false, unless: `item:${item} or lanterne-allumee` });
  put(L, `${id}_eclat`, 'emitter', x, z + 0.3, { preset: 'sparkle', size: [1.6, 1.8, 1.6], count: 14, dy: 0.9, unless: `item:${item} or lanterne-allumee` });
}

// ---------------------------------------------------------------------------------------------
// Le Bourg des Prés (vert)
// ---------------------------------------------------------------------------------------------

/** La route de l'est : lignes 18–21 du bourg (z monde 18–22), lignes 12–15 des gorges. */
const ROUTE_EST = { j0: 18, j1: 22 };
/** La route du sud : colonnes 30–33 du bourg et du marais (x monde 30–34). */
const ROUTE_SUD = { i0: 30, i1: 34 };

function bourg() {
  const W = 48;
  const D = 40;
  const L = createEmptyLevel({ name: 'Le Bourg des Prés', width: W, depth: D, fill: 'g', level: 2, border: 2 });
  L.subtitle = 'Là où la Grande Lanterne veille';
  L.author = 'Les jeux de Théo';
  L.description = 'Le départ des Trois Lueurs : un village dans les prés, un lac, et le plateau de la Grande Lanterne.';
  L.environment = {
    ...L.environment,
    timeOfDay: 10,
    camera: { distance: 26, pitch: 50 },
    title: { title: 'LES TROIS LUEURS', subtitle: 'Une démo du moteur Luminati', prompt: 'Appuie sur une touche', credit: 'Moteur Luminati (MIT) · three.js' },
    foliage: {
      seed: 77,
      flowerAreas: [{ minX: 17, maxX: 29, minZ: 27, maxZ: 37, palette: [0, 1, 1, 2, 3] }],
      shrubAreas: [{ minX: 2, maxX: 46, minZ: 12, maxZ: 38, chance: 0.08 }],
    },
  };

  // ---- le plateau du nord (niveau 4) et ses falaises ----
  fill(L, 0, 0, W, 12, 'G', 4);
  fill(L, 0, 0, W, 2, 'T', 4);
  fill(L, 0, 0, 2, 12, 'T');
  fill(L, W - 2, 0, W, 12, 'T');
  fill(L, 2, 2, 8, 12, 'T'); // la forêt au nord-ouest du plateau
  fill(L, 8, 4, 40, 11, 'f');
  fill(L, 16, 4, 32, 9, 'g');
  fill(L, 20, 5, 28, 8, 'k'); // le dallage autour de la Grande Lanterne
  // l'escalier de pierre qui monte au plateau (deux niveaux)
  fill(L, 23, 12, 25, 13, '^', 3);
  fill(L, 23, 13, 25, 14, '^', 2);
  // un rebord de roche le long des falaises, pour les dessiner
  for (const i of [9, 10, 14, 15, 33, 34, 38, 39]) setTile(L, i, 11, 'm');

  // ---- le village ----
  fill(L, 2, 14, W - 2, 27, 'g');
  fill(L, 18, 17, 31, 24, 'c'); // la place pavée
  fill(L, 23, 14, 25, 17, '.'); // le chemin vers l'escalier
  fill(L, 31, ROUTE_EST.j0, W, ROUTE_EST.j1, '.'); // la route de l'est
  fill(L, 6, 19, 18, 21, '.'); // le chemin de l'ouest
  fill(L, ROUTE_SUD.i0, 24, ROUTE_SUD.i1, D, '.'); // la route du sud
  // le lac du sud-ouest, en creux, avec sa grève
  blob(L, 9.5, 32, 7.2, 5.6, 's', 1);
  blob(L, 9.5, 32.2, 5.6, 4.2, 'o', 0);
  // les champs et le pré fleuri
  fill(L, 36, 27, 45, 35, 'F');
  fill(L, 17, 27, 29, 37, 'f');
  fill(L, 2, 14, 6, 27, 'G');

  // ---- maisons ----
  const maisons = [
    ['maison_brindille', 'La maison de Mamie Brindille', 13, 15.6, { width: 4.5, depth: 3, wall: 'timber_frame', roof: 'roof_red', woodpile: true, seed: 3 }, 'Une odeur de tisane passe sous la porte.'],
    ['maison_lison', 'La boutique de Lison', 35.5, 15.4, { width: 5, depth: 3.2, wall: 'plaster', roof: 'roof_blue', sign: true, seed: 11 }, 'La clochette de la boutique tinte doucement.'],
    ['maison_basile', 'La maison de Basile', 41.5, 24.6, { width: 4, depth: 3, wall: 'stone_brick', roof: 'roof_slate', seed: 17 }, 'Personne ne répond. Basile monte la garde sur la route du sud.'],
    ['maison_pilou', 'La maison de Pilou', 6.5, 23.8, { width: 4, depth: 3, wall: 'log_wall', roof: 'roof_thatch', seed: 23 }, 'Un petit cerf-volant est accroché à la fenêtre.'],
  ];
  for (const [id, name, x, z, opts, text] of maisons) put(L, id, 'house', x, z, { name, light: true, text: [text], opts });
  put(L, 'puits', 'well', 24.5, 20.5, { text: ['L\'eau du puits est fraîche.', 'Au fond, tu crois voir briller quelque chose… non, c\'est ton reflet.'] });
  put(L, 'panneau_place', 'signpost', 28.8, 22.6, {
    rotation: 0.2, speaker: 'Panneau', text: ['↑ {La Grande Lanterne}\n→ {Les Gorges d\'Ocre} · ↓ {Le Marais des Brumes}'], opts: { boards: 3 },
  });
  for (const [x, z, r] of [[18.4, 17.4, 0], [30.6, 17.4, Math.PI], [18.4, 23.6, 0], [30.6, 23.6, Math.PI], [22.4, 13.6, 0], [25.6, 13.6, Math.PI]]) addObject(L, 'lamppost', x, z, { rotation: r });
  addObject(L, 'bench', 21, 17.6, { rotation: 0 });
  addObject(L, 'bench', 28, 17.6, { rotation: 0 });
  addObject(L, 'crateStack', 41.6, 16.6, { rotation: -0.3, opts: { count: 2 } });
  addObject(L, 'haystack', 44, 29, { opts: { size: 0.9 } });
  addObject(L, 'fence', 35.6, 26.6, { x1: 45.4, z1: 26.6 });
  addObject(L, 'fence', 35.6, 35.4, { x1: 45.4, z1: 35.4 });

  // ---- arbres ----
  /** @type {[string, number, number, number][]} */
  const arbres = [
    ['oak', 3.6, 15.2, 4.6], ['oak', 4.4, 18.6, 4.2], ['oak', 31.6, 26.8, 4.4],
    ['pine', 44.6, 14.6, 4.8], ['oak', 45, 23.6, 4.2], ['birch', 45, 33, 4.6],
    ['oak', 36.2, 37.4, 4.4], ['birch', 2.8, 37.2, 4.4], ['oak', 17.2, 37.6, 4.2], ['autumn', 25, 37.4, 4.0],
    ['oak', 10, 5.5, 4.6], ['pine', 38.5, 4.4, 4.8], ['birch', 13.6, 9.6, 4.6], ['oak', 36.8, 9.8, 4.4],
  ];
  for (const [kind, x, z, h] of arbres) tree(L, kind, x, z, h);

  // ---- la Grande Lanterne (éteinte, puis rallumée) ----
  put(L, 'lanterne_flamme', 'campfire', 24, 6.4, { opts: { seat: false }, when: 'lanterne-allumee' });
  put(L, 'lanterne_froide', 'rock', 24, 6.4, { opts: { size: 0.7, flat: true, stone: 'basalt', seed: 3 }, unless: 'lanterne-allumee' });
  put(L, 'lanterne_feu', 'light', 24, 6.4, { color: '#ffd27a', intensity: 22, distance: 14, dy: 2.4, nightOnly: false, when: 'lanterne-allumee' });
  put(L, 'lanterne_eclats', 'emitter', 24, 6.4, { preset: 'sparkle', size: [8, 4, 6], count: 40, dy: 1.6, when: 'lanterne-allumee' });
  put(L, 'lanterne_braises', 'emitter', 24, 6.4, { preset: 'embers', size: [1.4, 3, 1.4], count: 18, dy: 0.8, when: 'lanterne-allumee' });
  for (const [x, z, r] of [[20.6, 5.0, 0], [27.4, 5.0, Math.PI], [20.6, 8.0, 0], [27.4, 8.0, Math.PI]]) addObject(L, 'lamppost', x, z, { rotation: r });
  event(L, 'ev_lanterne', [22.6, 5.4, 25.4, 8.2], { on: 'use', label: 'Rallumer', run: ['call lanterne'] });
  put(L, 'lanterne', 'marker', 24, 8.6, { name: 'lanterne', facing: 'up' });

  // ---- la lueur des Prés, sur le plateau, gardée par des gluants ----
  autel(L, 'autel_pres', 35.5, 6, 'lueur-pres', '', '#9cff8a');
  event(L, 'ev_lueur_pres', [34.4, 5.2, 36.6, 7.4], { on: 'use', label: 'Prendre', if: 'not item:lueur-pres and not lanterne-allumee', run: ['call lueur-pres'] });
  put(L, 'gluants_plateau', 'enemy', 32, 7.4, { kind: 'slime', count: 3, radius: 2.4, level: 1, name: 'Gluant' });
  put(L, 'coffre_plateau', 'chest', 11.5, 6, { rotation: 0, gold: 20, potions: 1 });

  // ---- villageois ----
  put(L, 'brindille', 'npc', 15.5, 19.6, { name: 'Mamie Brindille', preset: 'elder', wander: 1.0, speed: 0.6, portraitColor: '#c9a45c', actor: 'brindille' });
  put(L, 'lison', 'npc', 35.6, 19.2, {
    name: 'Lison', preset: 'merchant', wander: 0.5, speed: 0.7, portraitColor: '#78b35b', action: 'shop', item: 'Galette au miel',
    dialogue: ['Des galettes au miel ! Toutes chaudes, toutes dorées.'],
  });
  put(L, 'basile', 'npc', 32.6, 30.6, {
    name: 'Basile', preset: 'guard', behaviour: 'post', wander: 0, facing: 'down', portraitColor: '#8fb3d9', flag: 'basile-a-parle',
    dialogue: ['Le marais est au sud. La brume y tombe tôt, et les gluants aiment l\'humidité.', 'Garde ton épée à portée de main !'],
  });
  put(L, 'pilou', 'npc', 22.5, 25.2, {
    name: 'Pilou', preset: 'child', wander: 2.2, speed: 1.3, portraitColor: '#e27aa8',
    talk: [
      'cycle pilou',
      '  * Pilou: Quand la Lanterne brillait, on voyait les lucioles jusqu\'au lac !',
      '  * Pilou: Les gluants, ça rebondit. Mais ça ne mord pas. Enfin, presque pas.',
      '  * Pilou: Tu es déjà allé dans les gorges ? Il paraît que le sable y est tout rouge.',
    ],
  });
  addObject(L, 'critters', 40, 30, { kind: 'chicken', count: 4, radius: 2 });
  addObject(L, 'critters', 26, 21, { kind: 'cat', count: 1, radius: 3 });
  addObject(L, 'critters', 12, 22, { kind: 'dog', count: 1, radius: 3 });
  addObject(L, 'critters', 30, 6, { kind: 'bird', count: 3, radius: 2.5 });

  put(L, 'pierre_bourg', 'waystone', 27.5, 25.6, { name: 'Pierre du Bourg' });

  // ---- ambiance ----
  addObject(L, 'emitter', 9.5, 32, { preset: 'fireflies', size: [12, 2, 9], count: 26, dy: 0.9 });
  addObject(L, 'emitter', 23, 32, { preset: 'petals', size: [12, 3, 9], count: 22, dy: 1.6 });
  addObject(L, 'emitter', 24, 8, { preset: 'leaves', size: [26, 4, 6], count: 16, dy: 3 });

  // ---- régions ----
  addObject(L, 'region', 0, 0, { name: 'Le plateau de la Lanterne', sub: 'Le Bourg des Prés', minX: 0, maxX: W, minZ: 0, maxZ: 12, minY: 1.6, banner: 'La Grande Lanterne est éteinte' });
  addObject(L, 'region', 0, 0, { name: 'Le lac aux Lucioles', sub: 'Le Bourg des Prés', minX: 2, maxX: 17, minZ: 27, maxZ: D });
  addObject(L, 'region', 0, 0, { name: 'Le Bourg des Prés', sub: 'Le pays vert', minX: 0, maxX: W, minZ: 0, maxZ: D });

  // ---- voyages ----
  fill(L, W - 2, ROUTE_EST.j0, W, ROUTE_EST.j1, '.');
  fill(L, ROUTE_SUD.i0, D - 2, ROUTE_SUD.i1, D, '.');
  put(L, 'sortie_est', 'exit', 0, 0, { minX: W - 1.5, maxX: W, minZ: ROUTE_EST.j0, maxZ: ROUTE_EST.j1, to: 'gorges' });
  put(L, 'sortie_sud', 'exit', 0, 0, { minX: ROUTE_SUD.i0, maxX: ROUTE_SUD.i1, minZ: D - 1.5, maxZ: D, to: 'marais' });
  event(L, 'ev_arrivee', [0, 0, 2, 2], { on: 'arrive', once: true, run: [': Le soleil se lève sur le Bourg des Prés.', ': Mamie Brindille te fait signe près de sa maison.'] });
  L.spawn = { x: 24.5, z: 23.4, facing: 'up' };
  return L;
}

// ---------------------------------------------------------------------------------------------
// Les Gorges d'Ocre (aride)
// ---------------------------------------------------------------------------------------------

const ARIDE = {
  a: { top: 'dry_grass', side: 'arid_dirt_side', lip: 'dry_grass_side' },
  e: { top: 'arid_dirt', side: 'arid_dirt_side' },
  r: { top: 'red_sand', side: 'redrock_cliff' },
  y: { top: 'cracked_earth', side: 'arid_dirt_side' },
  M: { top: 'sandstone', side: 'sandstone_cliff', walkable: false },
  R: { top: 'redrock', side: 'redrock_cliff', walkable: false },
  q: { top: 'scree', side: 'sandstone_cliff' },
  l: { top: 'flagstone', side: 'sandstone_cliff' },
  O: { top: 'riverbed', side: 'sandstone_cliff', water: true, walkable: false, flow: 0 },
  n: { top: 'flagstone', side: 'sandstone_cliff', riser: 'sandstone_cliff', stairs: 'N' },
  T: { top: 'dry_grass', side: 'sandstone_cliff', lip: 'dry_grass_side', walkable: false },
};

function gorges() {
  const W = 48;
  const D = 34;
  const L = createEmptyLevel({ name: 'Les Gorges d\'Ocre', width: W, depth: D, fill: 'a', level: 2, border: 2 });
  L.legend = { ...L.legend, ...ARIDE };
  L.subtitle = 'Le pays du sable rouge';
  L.author = 'Les jeux de Théo';
  L.description = 'Un canyon de grès et de sable rouge, une oasis, et la lueur d\'Ocre tout en haut des falaises.';
  L.environment = { ...L.environment, timeOfDay: 13, climate: 'arid', camera: { distance: 26, pitch: 50 } };
  fill(L, 0, 0, W, D, 'T');
  fill(L, 2, 2, W - 2, D - 2, 'a');
  const R = { j0: 12, j1: 16 }; // la route (z monde 18–22)
  // le fond du canyon
  fill(L, 10, 7, 44, 30, 'r');
  blob(L, 26, 19, 9, 6, 'y');
  fill(L, 0, R.j0, 30, R.j1, 'e');
  fill(L, 0, R.j0, 2, R.j1, 'e');
  // les mesas (bloquées), hautes de plusieurs niveaux
  fill(L, 12, 2, 20, 7, 'M', 7);
  fill(L, 14, 7, 18, 9, 'M', 6);
  fill(L, 22, 23, 30, 30, 'R', 6);
  blob(L, 36, 26, 4, 3, 'M', 5);
  fill(L, 2, 22, 7, 32, 'R', 5);
  blob(L, 30, 9, 2, 2, 'R', 5);
  // le plateau du nord-est (niveau 5), dallé, et sa volée de marches (trois niveaux)
  fill(L, 33, 2, 46, 11, 'q', 5);
  fill(L, 36, 3, 44, 9, 'l', 5);
  fill(L, 38, 11, 40, 12, 'n', 4);
  fill(L, 38, 12, 40, 13, 'n', 3);
  fill(L, 38, 13, 40, 14, 'n', 2);
  fill(L, 33, 11, 38, 12, 'M', 5);
  fill(L, 40, 11, 46, 12, 'M', 5);
  // l'oasis
  blob(L, 17, 24, 5, 4, 'a');
  blob(L, 17, 24.2, 3.2, 2.4, 'O', 1);

  // le camp des nomades près de l'oasis
  put(L, 'sadia', 'npc', 9.4, 20.2, {
    name: 'Sadia', preset: 'hunter', wander: 0.6, speed: 0.7, portraitColor: '#e2a85c', actor: 'sadia',
  });
  addObject(L, 'campfire', 10.6, 22.4, { opts: { seat: true } });
  addObject(L, 'marketStall', 8.2, 18.4, { rotation: 0, opts: { width: 3, cloth: 'cloth_stripe', seed: 9 } });
  put(L, 'tente', 'house', 9.8, 28.4, {
    name: 'La tente de Sadia', light: true, text: ['Des tapis colorés, une théière, et une carte du canyon.'],
    opts: { width: 3.5, depth: 2.6, wall: 'adobe', roof: 'roof_terracotta', seed: 5 },
  });
  addObject(L, 'barrel', 8.0, 25.4, { rotation: 0.3 });
  addObject(L, 'crate', 13.8, 18.3, { rotation: 0.2 });
  put(L, 'panneau_gorges', 'signpost', 5.5, 11.2, { rotation: 0.15, speaker: 'Panneau', text: ['← {Le Bourg des Prés}\n↗ {La lueur d\'Ocre}'], opts: { boards: 2 } });

  // la nature aride
  /** @type {[string, number, number, number][]} */
  const arbres = [
    ['palm', 13.2, 21.2, 6.4], ['palm', 21.4, 22.0, 6.8], ['palm', 20.6, 27.6, 6.0], ['palm', 13.0, 27.4, 5.6],
    ['juniper', 4.5, 5.5, 3.6], ['juniper', 8.5, 4.0, 3.4], ['deadwood', 25.5, 4.6, 4.2], ['juniper', 31.2, 15.2, 3.8],
    ['deadwood', 43.6, 27.6, 4.0], ['juniper', 44, 17, 3.6], ['cypress', 34.4, 4.2, 7.0], ['cypress', 45, 5.2, 6.6],
  ];
  for (const [kind, x, z, h] of arbres) tree(L, kind, x, z, h);
  for (const [x, z, s, st] of [[24, 13.2, 0.9, 'redrock'], [33.6, 20.2, 1.1, 'sandstone'], [11.4, 9.6, 0.8, 'sandstone'], [41.4, 21.6, 1.0, 'redrock'], [28.6, 17.4, 0.6, 'sandstone']]) {
    addObject(L, 'rock', x, z, { opts: { size: s, stone: st, seed: Math.round(x * 3 + z) } });
  }

  // les adversaires : sangliers dans le canyon, chauves-souris au pied des falaises
  put(L, 'sangliers', 'enemy', 25, 18, { kind: 'boar', count: 2, radius: 3, level: 2, name: 'Sanglier des sables' });
  put(L, 'chauves_souris', 'enemy', 39, 17, { kind: 'bat', count: 3, radius: 2.4, level: 2, name: 'Chauve-souris' });
  put(L, 'pierre_gorges', 'waystone', 7.5, 15.2, { name: 'Pierre des Gorges' });
  put(L, 'coffre_gorges', 'chest', 42.5, 28, { rotation: Math.PI, gold: 40, potions: 1, upgrade: 'maxHp' });

  // la lueur d'Ocre, sur le plateau
  autel(L, 'autel_ocre', 40, 4.8, 'lueur-ocre', 'sandstone', '#ffb35a');
  event(L, 'ev_lueur_ocre', [38.9, 4, 41.1, 6.2], { on: 'use', label: 'Prendre', if: 'not item:lueur-ocre and not lanterne-allumee', run: ['call lueur-ocre'] });

  addObject(L, 'critters', 16, 17, { kind: 'bird', count: 3, radius: 2.5 });
  addObject(L, 'emitter', 26, 18, { preset: 'dust', size: [24, 3, 14], count: 34, dy: 1.2 });
  addObject(L, 'region', 0, 0, { name: 'Le haut plateau', sub: 'Les Gorges d\'Ocre', minX: 33, maxX: 46, minZ: 2, maxZ: 11, minY: 2.2, banner: 'Le vent chaud souffle ici' });
  addObject(L, 'region', 0, 0, { name: 'L\'oasis', sub: 'Les Gorges d\'Ocre', minX: 4, maxX: 23, minZ: 17, maxZ: 30 });
  addObject(L, 'region', 0, 0, { name: 'Les Gorges d\'Ocre', sub: 'Le pays du sable rouge', minX: 0, maxX: W, minZ: 0, maxZ: D, banner: 'Le pays du sable rouge' });
  put(L, 'sortie_ouest', 'exit', 0, 0, { minX: 0, maxX: 1.5, minZ: R.j0, maxZ: R.j1, to: 'bourg' });
  L.spawn = { x: 4, z: 14, facing: 'right' };
  return L;
}

// ---------------------------------------------------------------------------------------------
// Le Marais des Brumes (le soir)
// ---------------------------------------------------------------------------------------------

function marais() {
  const W = 44;
  const D = 36;
  const L = createEmptyLevel({ name: 'Le Marais des Brumes', width: W, depth: D, fill: 'G', level: 1, border: 2 });
  L.subtitle = 'Où la brume garde ses secrets';
  L.author = 'Les jeux de Théo';
  L.description = 'Un marais au crépuscule : des mares, des pontons, des cyprès, et la lueur des Brumes sur l\'îlot.';
  L.environment = {
    ...L.environment, timeOfDay: 19.0, clock: false, fogScale: 1.4, camera: { distance: 26, pitch: 50 },
    forest: { areas: [{ minX: -20, maxX: 70, minZ: -10, maxZ: 60, kinds: { pine: 3, oak: 1 } }] },
    foliage: { seed: 31, flowerAreas: [{ minX: 0, maxX: W, minZ: 0, maxZ: D, palette: [3, 3, 2] }], shrubAreas: [{ minX: 0, maxX: W, minZ: 0, maxZ: D, chance: 0.1 }] },
  };
  // la route du nord arrive du bourg (niveau 2), puis descend d'une marche
  fill(L, ROUTE_SUD.i0, 0, ROUTE_SUD.i1, 5, 'd', 2);
  fill(L, ROUTE_SUD.i0, 5, ROUTE_SUD.i1, 14, 'd');
  // les mares
  blob(L, 12, 10, 7, 5, 'o', 0);
  blob(L, 24, 20, 6, 4, 'o', 0);
  blob(L, 37, 24, 5, 6, 'o', 0);
  blob(L, 11, 27, 7, 5, 'o', 0);
  // l'îlot de la lueur, au milieu de la grande mare
  blob(L, 9, 27, 3.2, 2.6, 'm', 1);
  // les pontons (planches au niveau du sol)
  fill(L, 11, 26, 22, 28, 'b');
  fill(L, 21, 14, 23, 26, 'b');
  fill(L, 21, 13, 31, 15, 'b');
  // des taches de mousse et de boue
  blob(L, 30, 30, 4, 3, 'm');
  blob(L, 4, 4, 3, 3, 'm');
  blob(L, 26, 6, 3, 2, 'd');

  // la cabane du pêcheur
  put(L, 'cabane', 'house', 35.5, 9, {
    name: 'La cabane d\'Ambroise', light: true, text: ['Des filets sèchent sur la palissade. Ça sent la soupe aux herbes.'],
    opts: { width: 4, depth: 3, wall: 'wood_planks_dark', roof: 'roof_thatch', seed: 41 },
  });
  put(L, 'ambroise', 'npc', 33, 12.4, { name: 'Ambroise', preset: 'farmer', wander: 0.6, speed: 0.6, portraitColor: '#7fa08a', actor: 'ambroise' });
  addObject(L, 'campfire', 30.4, 9.8, { opts: { seat: true } });
  addObject(L, 'barrel', 38.4, 11.2, { rotation: 0.2 });
  addObject(L, 'crate', 39.8, 12.0, { rotation: -0.4 });
  addObject(L, 'fence', 33.2, 6.2, { x1: 39.6, z1: 6.2 });
  for (const [x, z, r] of [[29.6, 4.6, 0], [34.4, 4.6, Math.PI], [23.6, 12.6, 0], [8.4, 28.6, 0]]) addObject(L, 'lamppost', x, z, { rotation: r });
  put(L, 'panneau_marais', 'signpost', 29.2, 2.6, { rotation: 0.1, speaker: 'Panneau', text: ['↑ {Le Bourg des Prés}\n↙ {L\'îlot de la lueur} — suis les pontons !'], opts: { boards: 2 } });

  /** @type {[string, number, number, number][]} */
  const arbres = [
    ['cypress', 4.5, 15.5, 7.2], ['cypress', 19.5, 4.5, 6.8], ['deadwood', 15.6, 17.2, 4.6], ['deadwood', 3.5, 12.5, 4.2],
    ['cypress', 41.2, 16.4, 7.0], ['deadwood', 6.4, 33.0, 4.4], ['cypress', 27.6, 33.0, 6.4], ['pine', 40.6, 31.6, 5.2],
    ['deadwood', 3.6, 22.2, 4.0], ['cypress', 7.0, 25.2, 5.6], ['pine', 26.4, 9.6, 4.8], ['deadwood', 16.8, 32.6, 4.2],
  ];
  for (const [kind, x, z, h] of arbres) tree(L, kind, x, z, h);
  for (const [x, z, s] of [[18.5, 10.5, 0.9], [33.4, 27.6, 1.1], [27.4, 25.6, 0.7], [5.4, 9.6, 0.8]]) addObject(L, 'rock', x, z, { opts: { size: s, stone: 'basalt', seed: Math.round(x + z * 5) } });

  // les adversaires
  put(L, 'gluants_marais', 'enemy', 27, 28.5, { kind: 'slime', count: 3, radius: 2.6, level: 2, name: 'Gluant des brumes' });
  put(L, 'chauves_souris_marais', 'enemy', 15, 21.5, { kind: 'bat', count: 2, radius: 2.4, level: 2, name: 'Chauve-souris' });
  put(L, 'pierre_marais', 'waystone', 35.5, 15.2, { name: 'Pierre du Marais' });
  put(L, 'coffre_marais', 'chest', 40.6, 33, { rotation: Math.PI, gold: 30, potions: 2 });

  // la lueur des Brumes, sur l'îlot
  autel(L, 'autel_brumes', 8.6, 26.4, 'lueur-brumes', 'basalt', '#8fd8ff');
  event(L, 'ev_lueur_brumes', [7.5, 25.6, 9.7, 27.8], { on: 'use', label: 'Prendre', if: 'not item:lueur-brumes and not lanterne-allumee', run: ['call lueur-brumes'] });

  addObject(L, 'emitter', 14, 22, { preset: 'mist', size: [26, 1.4, 22], count: 40, dy: 0.3 });
  addObject(L, 'emitter', 34, 24, { preset: 'mist', size: [14, 1.4, 14], count: 20, dy: 0.3 });
  addObject(L, 'emitter', 18, 20, { preset: 'fireflies', size: [30, 2.4, 24], count: 46, dy: 1.0 });
  addObject(L, 'critters', 32, 9, { kind: 'cat', count: 1, radius: 2.5 });
  addObject(L, 'region', 0, 0, { name: 'L\'îlot de la lueur', sub: 'Le Marais des Brumes', minX: 4, maxX: 13, minZ: 23, maxZ: 31 });
  addObject(L, 'region', 0, 0, { name: 'Le Marais des Brumes', sub: 'Le pays de la brume', minX: 0, maxX: W, minZ: 0, maxZ: D, banner: 'Le pays de la brume' });
  fill(L, ROUTE_SUD.i0, 0, ROUTE_SUD.i1, 2, 'd', 2);
  put(L, 'sortie_nord', 'exit', 0, 0, { minX: ROUTE_SUD.i0, maxX: ROUTE_SUD.i1, minZ: 0, maxZ: 1.5, to: 'bourg' });
  L.spawn = { x: 32, z: 4, facing: 'down' };
  return L;
}

// ---------------------------------------------------------------------------------------------
// La campagne et l'histoire
// ---------------------------------------------------------------------------------------------

const campaignRaw = {
  format: CAMPAIGN_FORMAT,
  version: 1,
  name: 'Les Trois Lueurs',
  subtitle: 'Une démo du moteur Luminati',
  look: 'retro',
  title: { title: 'LES TROIS LUEURS', subtitle: 'Une démo du moteur Luminati pour Théo', credit: 'Moteur Luminati 2.5D (MIT) · three.js' },
  start: { level: 'bourg', entrance: '' },
  levels: [
    { id: 'bourg', at: [0, 0] },
    { id: 'gorges', at: [48, 6] },
    { id: 'marais', at: [0, 40] },
  ],
  chapters: [
    { id: 'lanterne', title: 'Chapitre un', subtitle: 'La Lanterne éteinte' },
  ],
  story: ['main.json', 'dialogue.story'],
};

const STORY_MAIN = {
  vars: {},
  items: {
    'lueur-pres': { name: 'Lueur des Prés', text: 'Une petite flamme verte qui sent l\'herbe coupée.', key: true },
    'lueur-ocre': { name: 'Lueur d\'Ocre', text: 'Une flamme orange, chaude comme le sable à midi.', key: true },
    'lueur-brumes': { name: 'Lueur des Brumes', text: 'Une flamme bleue et fraîche, qui danse comme une luciole.', key: true },
    'galette-au-miel': { name: 'Galette au miel', text: 'Une galette de Lison, toute dorée.' },
  },
  quests: {
    lueurs: {
      title: 'Les Trois Lueurs',
      text: 'La Grande Lanterne du bourg s\'est éteinte. Ses trois lueurs se sont envolées aux quatre vents.',
      stages: [
        { id: 'demande', text: 'Mamie Brindille m\'a demandé de retrouver les trois lueurs : une sur le plateau, une dans les Gorges d\'Ocre à l\'est, une dans le Marais des Brumes au sud.' },
        { id: 'reunies', text: 'J\'ai les trois lueurs ! Il faut les porter à la Grande Lanterne, sur le plateau.' },
        { id: 'fin', text: 'La Grande Lanterne brille de nouveau sur le Bourg des Prés.' },
      ],
      goals: [
        { text: 'La lueur des Prés (sur le plateau)', done: 'item:lueur-pres or lanterne-allumee' },
        { text: 'La lueur d\'Ocre (dans les gorges, à l\'est)', done: 'item:lueur-ocre or lanterne-allumee' },
        { text: 'La lueur des Brumes (dans le marais, au sud)', done: 'item:lueur-brumes or lanterne-allumee' },
      ],
    },
  },
  actors: {
    brindille: { name: 'Mamie Brindille', preset: 'elder', portraitColor: '#c9a45c', talk: 'brindille' },
    sadia: { name: 'Sadia', preset: 'hunter', portraitColor: '#e2a85c', talk: 'sadia' },
    ambroise: { name: 'Ambroise', preset: 'farmer', portraitColor: '#7fa08a', talk: 'ambroise' },
  },
  events: [
    { id: 'trois-reunies', on: 'change', if: 'item:lueur-pres and item:lueur-ocre and item:lueur-brumes', once: true, run: ['quest lueurs stage reunies', 'banner Les trois lueurs ! | Retourne à la Grande Lanterne'] },
  ],
  starts: {
    'trois-lueurs': { level: 'bourg', items: { 'lueur-pres': 1, 'lueur-ocre': 1, 'lueur-brumes': 1 }, quests: { lueurs: 'reunies' } },
  },
};

const STORY_TEXT = {
  brindille: [
    'if lanterne-allumee',
    '  - Regarde comme elle brille ! Le bourg ne l\'oubliera jamais.',
    '  stop',
    'if quest:lueurs',
    '  if item:lueur-pres and item:lueur-ocre and item:lueur-brumes',
    '    - Les trois lueurs ! Monte vite au plateau et rallume la {Grande Lanterne}.',
    '    stop',
    '  cycle brindille-rappel',
    '    * - Une lueur sur le plateau, une dans les {Gorges d\'Ocre}, une dans le {Marais des Brumes}.',
    '    * - Si tu es fatigué, touche une pierre de route : elle te soigne.',
    '    * - Les gluants n\'aiment pas les coups d\'épée. Ni les roulades !',
    '  stop',
    '- Ah, te voilà ! Il est arrivé un grand malheur.',
    '- Cette nuit, la {Grande Lanterne} du plateau s\'est éteinte. Ses trois lueurs se sont envolées.',
    '- Une est restée sur le plateau. Une autre est partie vers les {Gorges d\'Ocre}, à l\'est. La dernière dans le {Marais des Brumes}, au sud.',
    'choice Veux-tu nous aider ?',
    '  > Oui, je vais les retrouver !',
    '    - Merci ! Prends ton épée : des gluants traînent sur le plateau.',
    '    - L\'escalier est juste au nord de la place.',
    '    quest lueurs stage demande',
    '  > Pas tout de suite',
    '    - Reviens me voir quand tu seras prêt.',
  ],
  sadia: [
    'if item:lueur-ocre',
    '  - Ta flamme orange va bien avec le sable, tu ne trouves pas ?',
    '  stop',
    '- Bienvenue à l\'oasis, voyageur. Assieds-toi près du feu.',
    'loop',
    '  choice Que veux-tu savoir ?',
    '    > [once] Tu as vu une lueur ?',
    '      - Une flamme orange est passée au-dessus des gorges hier soir.',
    '      - Elle s\'est posée sur le {haut plateau}, au nord-est. Les marches sont au pied des falaises.',
    '    > [once] Pourquoi le sable est rouge ?',
    '      - Le vent use les falaises depuis des milliers d\'années. Le sable, c\'est leur poussière.',
    '    > Merci, Sadia.',
    '      - Bonne route ! Méfie-toi des sangliers, ils foncent tout droit.',
    '      break',
  ],
  ambroise: [
    'if item:lueur-brumes',
    '  - Sans la lueur bleue, le marais paraît plus sombre. Mais je sais qu\'elle sera mieux là-haut.',
    '  stop',
    '- Oh ! Un visiteur, à cette heure ? Ici, il fait toujours un peu soir.',
    '- Tu cherches la flamme bleue ? Elle danse sur l\'{îlot}, au sud-ouest.',
    '- Suis les pontons. Et ne tombe pas dans l\'eau, elle est froide !',
  ],
  'lueur-pres': [
    'sfx chime',
    ': Une petite flamme verte se pose dans tes mains. Elle sent l\'herbe coupée.',
    'give lueur-pres',
  ],
  'lueur-ocre': [
    'sfx chime',
    ': Une flamme orange, chaude comme le sable à midi, vient se blottir contre toi.',
    'give lueur-ocre',
  ],
  'lueur-brumes': [
    'sfx chime',
    ': Une flamme bleue sort de la brume et tourne trois fois autour de toi.',
    'give lueur-brumes',
  ],
  lanterne: [
    'if lanterne-allumee',
    '  : La Grande Lanterne brille, chaude et claire.',
    '  stop',
    'if not item:lueur-pres or not item:lueur-ocre or not item:lueur-brumes',
    '  : La Grande Lanterne est froide. Il lui manque des lueurs.',
    '  : Regarde ta liste de quêtes (touche B) pour savoir lesquelles.',
    '  stop',
    'cutscene',
    'camera lanterne 1.2',
    ': Tu poses les trois lueurs dans la Grande Lanterne…',
    'take lueur-pres',
    'take lueur-ocre',
    'take lueur-brumes',
    'fade out 0.6',
    'sfx chime',
    'set lanterne-allumee',
    'quest lueurs stage fin',
    'quest lueurs done',
    'wait 0.5',
    'fade in 1',
    'shake 0.3',
    ': Verte, orange et bleue, la flamme se rallume et monte haut dans le ciel !',
    'banner La Grande Lanterne brille ! | Merci, héros du bourg',
    'camera reset 1',
    'ending lanterne La Lanterne rallumée',
  ],
};

const built = [['bourg', bourg()], ['gorges', gorges()], ['marais', marais()]];

const problems = [];
const texts = new Map();
const levels = new Map();
for (const [id, raw] of built) {
  const { level, warnings } = normalizeLevel(raw);
  level.objects = level.objects.map((o) => /** @type {LevelObject} */ (canonicalObject(o)));
  keyLevel(level, { root, file: `${DIR}/${levelFile(id)}` });
  const errs = [...validateLevel(level), ...keyIssueLines(level)];
  const text = serializeLevel(level);
  if (serializeLevel(parseLevel(text).level) !== text) errs.push('does not re-serialise byte-identically');
  for (const m of [...warnings, ...errs]) problems.push(`${id}: ${m}`);
  texts.set(levelFile(id), text);
  levels.set(id, parseLevel(text).level);
}

const campaignKeyed = structuredClone(campaignRaw);
carryCampaignText(previousOutput(root, `${DIR}/campaign.json`), campaignKeyed, seededMint(`${DIR}/campaign.json`));
const storyMain = structuredClone(STORY_MAIN);
carryStoryFile(previousOutput(root, `${DIR}/${storyFile('main.json')}`), storyMain, seededMint(`${DIR}/${storyFile('main.json')}`));
const storyText = retagStoryText(previousOutput(root, `${DIR}/${storyFile('dialogue.story')}`, { text: true }) ?? '', serializeStoryText(STORY_TEXT), seededMint(`${DIR}/${storyFile('dialogue.story')}`));
for (const [file, issues] of [
  ['campaign.json', fileKeyIssues('campaign', campaignKeyed)], [storyFile('main.json'), fileKeyIssues('story', storyMain)],
  [storyFile('dialogue.story'), fileKeyIssues('storyText', storyText)],
]) for (const i of issues) problems.push(`${file}: text keys: ${i.where}: ${i.msg}`);

const { campaign, warnings: cw, errors: ce } = normalizeCampaign(campaignKeyed);
problems.push(...cw.map((m) => `campaign.json: ${m}`), ...ce.map((m) => `campaign.json: ${m}`));
texts.set('campaign.json', serializeCampaign(campaign));
texts.set(storyFile('main.json'), serializeStory(storyMain));
texts.set(storyFile('dialogue.story'), storyText);
const { story, warnings: sw } = buildStory(campaign.story.map((f) => ({ name: f, text: texts.get(storyFile(f)) })));
problems.push(...sw.map((m) => `story: ${m}`));
for (const [id, sc] of Object.entries(story.scripts)) for (const e of parseScript(sc.lines).errors) problems.push(`${sc.file} › ${id}:${e.line}: ${e.msg}`);

const report = checkCampaign(campaign, (id) => (levels.has(id) ? { level: levels.get(id), warnings: [] } : null), {
  strict: false, readStory: (f) => texts.get(storyFile(f)) ?? null,
});
let nErr = problems.length + report.errors.length;
for (const [id, r] of report.levels) {
  nErr += r.report.errors.length;
  for (const m of r.report.errors) problems.push(`${id}: ✗ ${m}`);
  for (const m of r.report.warnings) console.log(`  ${id}: ! ${m}`);
}
for (const m of report.warnings) console.log(`  ! ${m}`);
for (const m of [...problems, ...report.errors]) console.error(`  ✗ ${m}`);
console.log(`vérification : ${nErr} erreur(s)`);
if (nErr && !args.force) {
  console.error('rien n\'est écrit (--force écrit quand même)');
  process.exit(1);
}
for (const [file, text] of texts) {
  const f = path.join(OUT, file);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, text);
}
console.log(`Les Trois Lueurs → ${path.relative(root, OUT)} : ${texts.size} fichiers`);
