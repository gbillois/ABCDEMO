// Tests du relais de The Dragon Apprentice Chronicles : node --test serveur/dragonflyer-relais/tests/
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/index.js', import.meta.url), 'utf8');
const jeu = readFileSync(new URL('../../../dragonflyer/index.html', import.meta.url), 'utf8');
const { Salle } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const extraitFiltre = texte => texte.slice(texte.indexOf('function filtrerSurnom('), texte.indexOf('\n}', texte.indexOf('function filtrerSurnom(')) + 2);
const filtrer = vm.runInNewContext('(' + extraitFiltre(source) + ')');
const constante = (texte, nom) => texte.match(new RegExp(`const ${nom} = ([^;]+);`))[1];

class Socket {
  messages = []; attachment = null; closed = false;
  send(data) { this.messages.push(typeof data === 'string' ? JSON.parse(data) : data); }
  serializeAttachment(data) { this.attachment = structuredClone(data); }
  deserializeAttachment() { return structuredClone(this.attachment); }
  close(code) { this.closed = true; this.code = code; }
}
function salleAvec(...sockets) {
  const tags = new Map();
  const ctx = { getWebSockets: t => sockets.filter(ws => !ws.closed && (!t || (tags.get(ws) || []).includes(t))), acceptWebSocket: (ws, t) => { sockets.push(ws); tags.set(ws, t || []); }, getTags: ws => tags.get(ws) || [] };
  return { salle: new Salle(ctx), tags };
}
function joueur(s) { const ws = new Socket(); ws.serializeAttachment({ s }); return ws; }
const envoyer = (salle, ws, message) => salle.webSocketMessage(ws, JSON.stringify(message));

test('filtre des surnoms identique dans le jeu et le relais', () => {
  assert.equal(extraitFiltre(jeu), extraitFiltre(source));
  for (const nom of ['', 'Astrid', 'Léo-42', "L'ours"]) assert.equal(filtrer(nom), nom);
  for (const nom of ['a', 'a'.repeat(17), '<b>x</b>', 'c0nn4rd', 'merde', null, 42]) assert.equal(filtrer(nom), null, String(nom));
});

test('listes fermées : phrases et couleurs du jeu dans les bornes du relais', () => {
  const phrases = vm.runInNewContext(jeu.match(/const PHRASES = (\[[^\]]*\]);/)[1]);
  const couleurs = vm.runInNewContext(jeu.match(/const COULEURS_DRAGON = (\[[\s\S]*?\]\]);/)[1]);
  assert.ok(phrases.length <= Number(constante(source, 'NB_PHRASES')));
  assert.equal(couleurs.length, Number(constante(source, 'NB_COULEURS')));
});

test('profil validé, diffusé une seule fois, puis fixe', async () => {
  const a = joueur(0), b = joueur(1), { salle } = salleAvec(a, b);
  await envoyer(salle, a, { t: 'profil', pseudo: ' Astrid ', couleur: 3, secret: 'non' });
  assert.deepEqual(b.messages.pop(), { t: 'profil', s: 0, pseudo: 'Astrid', couleur: 3 });
  await envoyer(salle, a, { t: 'profil', pseudo: 'Autre', couleur: 1 });
  assert.equal(b.messages.length, 0);
  const c = joueur(2), { salle: s2 } = salleAvec(c);
  await envoyer(s2, c, { t: 'profil', pseudo: 'merde', couleur: 1 });
  assert.deepEqual(c.messages.pop(), { t: 'profil_refuse' });
  await envoyer(s2, c, { t: 'profil', pseudo: 'Ok', couleur: 99 });
  assert.deepEqual(c.messages.pop(), { t: 'profil_refuse' });
});

test('positions bornées, arrondies, sans champ en trop, limitées à 15 par seconde', async () => {
  const a = joueur(0), b = joueur(1), { salle } = salleAvec(a, b);
  await envoyer(salle, a, { t: 'p', x: 99999, y: 120.456, z: -10.04, r: 1.234, a: .5, b: -9, m: 2, f: 1, nom: 'x' });
  assert.deepEqual(b.messages.pop(), { t: 'p', s: 0, x: 3200, y: 120.5, z: -10, r: 1.23, a: .5, b: -2, m: 2, f: 1 });
  await envoyer(salle, a, { t: 'p', x: 'a', y: 0, z: 0, r: 0, a: 0, b: 0 });
  assert.equal(b.messages.length, 0);
  for (let i = 0; i < 30; i++) await envoyer(salle, a, { t: 'p', x: 0, y: 0, z: 0, r: 0, a: 0, b: 0 });
  assert.ok(b.messages.length <= 15);
});

test('phrases : numéro de la liste fermée, une toutes les 1,5 s', async () => {
  const a = joueur(0), b = joueur(1), { salle } = salleAvec(a, b);
  await envoyer(salle, a, { t: 'm', i: 2 }); await envoyer(salle, a, { t: 'm', i: 3 }); await envoyer(salle, a, { t: 'm', i: 99 });
  assert.deepEqual(b.messages, [{ t: 'm', s: 0, i: 2 }]);
});

test('message trop long : connexion fermée', async () => {
  const a = joueur(0), { salle } = salleAvec(a);
  await salle.webSocketMessage(a, 'x'.repeat(500));
  assert.ok(a.closed);
});

test('transfert : chaque message passe tel quel à l\'autre appareil, sans être lu', async () => {
  const env = new Socket(), rec = new Socket(), { salle, tags } = salleAvec(env, rec);
  tags.set(env, ['send']); tags.set(rec, ['recv']);
  env.serializeAttachment({ tr: true, t: Date.now(), n: 0 }); rec.serializeAttachment({ tr: true, t: Date.now(), n: 0 });
  await salle.webSocketMessage(env, '{"t":"data","d":"octets-illisibles"}');
  assert.deepEqual(rec.messages.pop(), { t: 'data', d: 'octets-illisibles' });
});
