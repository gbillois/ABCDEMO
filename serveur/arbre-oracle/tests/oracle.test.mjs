import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/index.js', import.meta.url), 'utf8');
const jeu = readFileSync(new URL('../../../jeux/le-grand-arbre.html', import.meta.url), 'utf8');
const { default: worker, Quota } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const commun = texte => texte.slice(texte.indexOf("// --- Recette d'animal"), texte.indexOf('// --- fin de la partie commune ---'));
const ctx = vm.runInNewContext(commun(source) + ';({ nettoyerRecette, filtrerTexte, RECETTE, EXTRAS })');
const { filtrerTexte, RECETTE, EXTRAS } = ctx, nettoyerRecette = r => JSON.parse(JSON.stringify(ctx.nettoyerRecette(r)));

const ORIGINE = 'https://gbillois.github.io';
const BONNE = { forme: 'quadrupede', taille: 'petit', corps: 'rond', couleur: 'violet', couleur2: 'rose', motif: 'ventre', tete: 'museau', oreilles: 'longues', cornes: 'deux',
  ailes: 'chauve_souris', queue: 'dragon', deplacement: 'saute', cri: 'rugit', extras: ['crete'] };

class Stockage { m = new Map(); async get(k) { return structuredClone(this.m.get(k)); } async put(k, v) { this.m.set(k, structuredClone(v)); } }
function environnement({ reponse = { response: BONNE }, limite = true, quotaJour = '150', quotaAdresse = '30', erreurIA = false } = {}) {
  const env = { ORIGINES: ORIGINE, ACTIF: 'oui', QUOTA_JOUR: quotaJour, QUOTA_ADRESSE_JOUR: quotaAdresse, appels: [] };
  env.AI = { run: async (modele, entree) => { env.appels.push({ modele, entree }); if (erreurIA) throw new Error('panne'); return reponse; } };
  env.LIMITE = { limit: async () => ({ success: limite }) };
  const quota = new Quota({ storage: new Stockage() }, env);
  env.QUOTA = { idFromName: n => n, get: () => ({ fetch: (url, init) => quota.fetch(new Request(url, init)) }) };
  return env;
}
const demande = (corps, { origine = ORIGINE, ip = '203.0.113.7', methode = 'POST' } = {}) => new Request('https://arbre-oracle.exemple.workers.dev/creer', {
  method: methode, headers: { Origin: origine, 'content-type': 'application/json', 'CF-Connecting-IP': ip }, body: methode === 'POST' ? (typeof corps === 'string' ? corps : JSON.stringify(corps)) : undefined });

test('partie commune identique dans le jeu et le Worker', () => {
  assert.ok(commun(source).length > 1000);
  assert.equal(commun(jeu), commun(source));
});

test('filtre du texte : animaux acceptés, gros mots, violence et caractères bizarres refusés', () => {
  for (const t of ['un lapin-dragon violet', 'Une licorne arc-en-ciel !', "l'éléphant qui vole", 'une tortue', 'un chat confiture', 'un hérisson tout piquant', 'Un cœur de chat']) assert.ok(filtrerTexte(t), t);
  assert.equal(filtrerTexte('  un   chat  '), 'un chat');
  for (const t of ['a', 'x'.repeat(61), '<script>', 'un chat {json}', 'un chat qui tue', 'un dragon mort', 'un lapin avec un fusil', 'c0nn4rd', 'un chien de merde', 'un lapin nu', 'FDP', null, 42, '!!!']) assert.equal(filtrerTexte(t), null, String(t));
});

test('recette nettoyée : seulement des valeurs des listes, valeurs par défaut sinon', () => {
  assert.deepEqual(nettoyerRecette(BONNE), BONNE);
  const r = nettoyerRecette({ forme: 'Quadrupède', couleur: 'arc-en-ciel', couleur2: 'arc-en-ciel', ailes: '<img>', extras: ['crete', 'crete', 'laser', 'cou long', 'brillant', 'piquants', 'carapace'], phrase: 'texte libre' });
  assert.equal(r.forme, 'quadrupede'); assert.equal(r.couleur, 'arc_en_ciel'); assert.equal(r.couleur2, 'beige'); assert.equal(r.ailes, 'aucune');
  assert.deepEqual(r.extras, ['crete', 'cou_long', 'brillant', 'piquants']);
  assert.equal(r.phrase, undefined);
  for (const v of [null, 'x', [], 5]) { const d = nettoyerRecette(v); for (const k in RECETTE) assert.ok(RECETTE[k].includes(d[k])); assert.deepEqual(d.extras, []); }
  assert.equal(Object.keys(nettoyerRecette({})).length, Object.keys(RECETTE).length + 1);
  assert.ok(EXTRAS.length === 8);
});

test('création : la recette du modèle est nettoyée, rien d\'autre ne sort', async () => {
  const env = environnement({ reponse: { response: 'Voici : ' + JSON.stringify({ ...BONNE, couleur: 'fuchsia', phrase: 'coucou' }) + ' fin' } });
  const r = await worker.fetch(demande({ texte: 'un lapin-dragon violet' }), env);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('access-control-allow-origin'), ORIGINE);
  const j = await r.json();
  assert.equal(j.ok, true); assert.equal(j.recette.couleur, 'marron'); assert.equal(j.recette.phrase, undefined);
  assert.deepEqual(Object.keys(j), ['ok', 'recette']);
  const { entree } = env.appels[0];
  assert.match(entree.messages[1].content, /un lapin-dragon violet/);
  assert.equal(entree.response_format.type, 'json_schema');
  assert.ok(entree.max_tokens <= 300);
});

test('origine, méthode, corps et texte contrôlés avant tout appel au modèle', async () => {
  const env = environnement();
  assert.equal((await worker.fetch(demande({ texte: 'un chat' }, { origine: 'https://exemple.com' }), env)).status, 403);
  assert.equal((await worker.fetch(demande(null, { methode: 'GET' }), env)).status, 405);
  const pre = await worker.fetch(new Request('https://x/creer', { method: 'OPTIONS', headers: { Origin: ORIGINE } }), env);
  assert.equal(pre.status, 204); assert.equal(pre.headers.get('access-control-allow-methods'), 'POST');
  assert.equal((await worker.fetch(demande('{"texte":"' + 'a'.repeat(500) + '"}'), env)).status, 413);
  assert.equal((await worker.fetch(demande('pas du json'), env)).status, 400);
  const mot = await worker.fetch(demande({ texte: 'un dragon qui tue' }), env);
  assert.equal(mot.status, 400); assert.equal((await mot.json()).raison, 'mot');
  assert.equal((await worker.fetch(new Request('https://x/'), env)).status, 200);
  assert.equal((await worker.fetch(new Request('https://x/autre'), env)).status, 404);
  assert.equal(env.appels.length, 0);
});

test('limiteurs : par minute, par adresse et par jour, et interrupteur', async () => {
  let env = environnement({ limite: false });
  let r = await worker.fetch(demande({ texte: 'un chat' }), env);
  assert.equal(r.status, 429); assert.equal((await r.json()).raison, 'vite');

  env = environnement({ quotaAdresse: '2' });
  for (let i = 0; i < 2; i++) assert.equal((await worker.fetch(demande({ texte: 'un chat' }), env)).status, 200);
  r = await worker.fetch(demande({ texte: 'un chat' }), env);
  assert.equal(r.status, 429); assert.equal((await r.json()).raison, 'fatigue');
  assert.equal((await worker.fetch(demande({ texte: 'un chat' }, { ip: '198.51.100.9' }), env)).status, 200);

  env = environnement({ quotaJour: '3' });
  for (let i = 0; i < 3; i++) assert.equal((await worker.fetch(demande({ texte: 'un chat' }, { ip: '10.0.0.' + i }), env)).status, 200);
  assert.equal((await worker.fetch(demande({ texte: 'un chat' }, { ip: '10.0.0.9' }), env)).status, 429);
  assert.equal(env.appels.length, 3);

  env = environnement(); env.ACTIF = 'non';
  r = await worker.fetch(demande({ texte: 'un chat' }), env);
  assert.equal(r.status, 503); assert.equal(env.appels.length, 0);
});

test('modèle en panne ou réponse illisible : l\'oracle dort, le jeu crée seul', async () => {
  const env = environnement({ erreurIA: true });
  let r = await worker.fetch(demande({ texte: 'un chat' }), env);
  assert.equal(r.status, 502); assert.equal((await r.json()).raison, 'dort');
  assert.equal(env.appels.length, 2); assert.equal(env.appels[1].entree.response_format, undefined);
  r = await worker.fetch(demande({ texte: 'un chat' }), environnement({ reponse: { response: 'je ne sais pas' } }));
  assert.equal(r.status, 502);
});

test('le quota ne garde sur disque que le total du jour', async () => {
  const stockage = new Stockage(), q = new Quota({ storage: stockage }, { QUOTA_JOUR: '5', QUOTA_ADRESSE_JOUR: '5' });
  const appel = (cle, jour) => q.fetch(new Request('https://quota/', { method: 'POST', body: JSON.stringify({ cle, jour }) })).then(r => r.json());
  assert.equal((await appel('abc', '2026-10-27')).ok, true);
  assert.deepEqual([...stockage.m.keys()], ['total']);
  assert.deepEqual(stockage.m.get('total'), { jour: '2026-10-27', n: 1 });
  for (let i = 0; i < 4; i++) await appel('k' + i, '2026-10-27');
  assert.equal((await appel('z', '2026-10-27')).ok, false);
  assert.equal((await appel('z', '2026-10-28')).ok, true);
});
