// Écrit public/i18n/fr/common.json (les textes communs du moteur en français) et ajoute
// le français à public/i18n/index.json. Lancé par fabriquer.sh dans le dossier du moteur.
import fs from 'node:fs';
const ja = JSON.parse(fs.readFileSync('public/i18n/ja/common.json', 'utf8'));
const FR_UNITS = {
  'dlg.action.music-ask': 'Encore une chanson, ou un peu de calme ?',
  'dlg.action.music-quiet': 'Un peu de calme',
  'dlg.action.music-toast': '♪ Musique',
  'dlg.action.obtained': 'Obtenu : ${item}',
  'dlg.action.obtained-count': 'Obtenu : ${item} ×${count}',
  'dlg.action.shop-ask': 'Tu veux une ${item} ?',
  'dlg.action.shop-ask-price': 'Tu veux une ${item} ? (${price} pièces d\'or)',
  'dlg.action.shop-yes': 'Oui, s\'il te plaît',
  'dlg.music.fades': 'La musique s\'arrête…',
  'dlg.music.keep-playing': 'Continue de jouer',
  'dlg.rest.ask': 'Veux-tu dormir jusqu\'au matin ?',
  'dlg.rest.not-yet': 'Pas encore',
  'dlg.rest.until-morning': 'Dormir jusqu\'au matin',
  'dlg.shop.cannot-carry-more': 'Tu ne peux pas en porter plus',
  'dlg.shop.just-looking': 'Je regarde seulement',
  'dlg.shop.not-enough-gold': 'Pas assez d\'or',
  'dlg.shop.not-for-sale': 'Pas à vendre',
  'dlg.shopkeeper.bought': 'Obtenu : ${name}',
  'dlg.shopkeeper.nothing-more': 'Rien d\'autre',
  'dlg.shopkeeper.tell-me-again': 'Redis-moi',
  'dlg.shopkeeper.ware': '${name} (${gain}) — ${price} or',
  'dlg.shopkeeper.ware-short': '${name} (${gain}) — ${price} or (pas assez)',
  'dlg.shopkeeper.menu-first': 'Qu\'est-ce qui te ferait plaisir ? Tu as {${gold} or} · ATT ${atk} · DÉF ${def}.',
  'dlg.shopkeeper.menu-again': 'Autre chose ? Tu as {${gold} or} · ATT ${atk} · DÉF ${def}.',
  'dlg.shopkeeper.foes-near': 'Pas avec des ennemis sur les talons ! Sème-les d\'abord.',
  'dlg.shopkeeper.farewell-bought': 'Merci ! Bonne route.',
  'dlg.shopkeeper.farewell-none': 'Comme tu veux. Je ne bouge pas d\'ici.',
};
const FR_TERMS = { Signpost: 'Panneau', Untitled: 'Sans titre', 'Untitled campaign': 'Aventure sans titre', Villager: 'Villageois', Waystone: 'Pierre de route' };
const units = {};
for (const [k, v] of Object.entries(FR_UNITS)) if (ja.units[k]) units[k] = { source: ja.units[k].source, target: v };
const terms = {};
for (const [k, v] of Object.entries(FR_TERMS)) if (k in ja.terms) terms[k] = v;
const out = { ...ja, lang: 'fr', terms, units };
fs.mkdirSync('public/i18n/fr', { recursive: true });
fs.writeFileSync('public/i18n/fr/common.json', JSON.stringify(out, null, 2) + '\n');
const idx = JSON.parse(fs.readFileSync('public/i18n/index.json', 'utf8'));
idx.languages = { fr: { tables: ['common'] }, ...idx.languages };
fs.writeFileSync('public/i18n/index.json', JSON.stringify(idx, null, 2) + '\n');
console.log(`fr/common.json : ${Object.keys(units).length} textes, ${Object.keys(terms).length} termes`);
