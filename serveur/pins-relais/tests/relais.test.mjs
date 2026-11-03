import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/index.js', import.meta.url), 'utf8');
const jeu = readFileSync(new URL('../../../pins/index.html', import.meta.url), 'utf8');
const { Salle } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const extraitFiltre = texte => texte.slice(texte.indexOf('function filtrerSurnom('), texte.indexOf('\n}', texte.indexOf('function filtrerSurnom(')) + 2);
const filtrer = vm.runInNewContext('(' + extraitFiltre(source) + ')');

class Socket {
  messages = [];
  attachment = null;
  closed = false;
  send(data) { this.messages.push(JSON.parse(data)); }
  serializeAttachment(data) { this.attachment = structuredClone(data); }
  deserializeAttachment() { return structuredClone(this.attachment); }
  close(code) { this.closed = true; this.code = code; }
}
function salleAvec(...sockets) {
  const ctx = { getWebSockets: () => sockets.filter(ws => !ws.closed), acceptWebSocket: ws => sockets.push(ws) };
  return new Salle(ctx);
}
function joueur(s) { const ws = new Socket(); ws.serializeAttachment({ s }); return ws; }
const envoyer = (salle, ws, message) => salle.webSocketMessage(ws, JSON.stringify(message));

test('filtre identique côté client et relais, variantes et texte non autorisé refusés', () => {
  assert.equal(extraitFiltre(jeu), extraitFiltre(source));
  for (const nom of ['', 'Petit Panda', 'Dédé', 'Constance', 'Lucas', 'Léo-42', "L'ours"]) assert.equal(filtrer(nom), nom);
  assert.equal(filtrer('  Petit   Panda  '), 'Petit Panda');
  for (const nom of ['a', '--', 'a'.repeat(17), '<img src=x>', 'c0nn4rd', 'C O N N A R D', 'sàlope', 'p.d', 'P D', 'ta gueule', 'merde', 'FDP', null, 42]) assert.equal(filtrer(nom), null, String(nom));
});

test("bornes de l'apparence (LOOK_MAX) identiques dans le jeu et le relais", () => {
  const bornes = texte => texte.match(/const LOOK_MAX = (\[[^\]]*\])/)[1];
  assert.equal(bornes(jeu), bornes(source));
});

test('10 places compatibles avec les 10 animaux du client', () => {
  const animaux = vm.runInNewContext(jeu.match(/const ANIMAUX = ([\s\S]*?);/)[1]);
  assert.equal(animaux.length, 10);
  assert.equal(new Set(animaux.map(a => a[0])).size, 10);
  for (const a of animaux) assert.equal(a[2], parseInt(a[3].slice(1), 16));
});

test('profil validé diffusé, champs supplémentaires ignorés et identité fixe', async () => {
  const a = joueur(0), b = joueur(9), salle = salleAvec(a, b);
  await envoyer(salle, a, { t: 'profil', pseudo: ' Petit Panda ', sexe: 'f', tenue: 'rouge', secret: 'non transmis' });
  const profil = { s: 0, pseudo: 'Petit Panda', sexe: 'f', tenue: 'rouge', look: null };
  assert.deepEqual(a.attachment, profil);
  assert.deepEqual(b.messages.pop(), { t: 'profil', ...profil });
  await envoyer(salle, a, { t: 'profil', pseudo: 'Autre nom', sexe: 'g', tenue: null });
  assert.deepEqual(a.attachment, profil);
  await envoyer(salle, a, { t: 'profil', pseudo: 'Petit Panda', sexe: 'f', tenue: null });
  assert.equal(a.attachment.tenue, null);
  assert.equal(b.messages.pop().tenue, null);
});

test('apparence du personnage : numéros bornés transmis, puis fixe pendant la connexion', async () => {
  const a = joueur(0), b = joueur(1), salle = salleAvec(a, b), look = [1, 5, 8, 2, 1, 1, 8, 0, 12, 2, 1, 4, 3];
  await envoyer(salle, a, { t: 'profil', pseudo: 'Lou', sexe: 'f', tenue: null, look });
  assert.deepEqual(b.messages.pop(), { t: 'profil', s: 0, pseudo: 'Lou', sexe: 'f', tenue: null, look });
  await envoyer(salle, a, { t: 'profil', pseudo: 'Lou', sexe: 'f', tenue: 'rouge', look: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] });
  assert.deepEqual(a.attachment.look, look);
  assert.deepEqual(b.messages, []);
});

test('apparence à 17 numéros (traits du visage) transmise ; trait hors bornes refusé', async () => {
  const a = joueur(0), b = joueur(1), salle = salleAvec(a, b), look = [1, 5, 8, 2, 1, 1, 8, 0, 12, 2, 1, 4, 3, 5, 5, 4, 5];
  await envoyer(salle, a, { t: 'profil', pseudo: 'Lou', sexe: 'f', tenue: null, look });
  assert.deepEqual(b.messages.pop(), { t: 'profil', s: 0, pseudo: 'Lou', sexe: 'f', tenue: null, look });
  const c = joueur(0), d = joueur(1), salle2 = salleAvec(c, d);
  await envoyer(salle2, c, { t: 'profil', pseudo: 'Lou', sexe: 'f', tenue: null, look: [...look.slice(0, 16), 6] });
  assert.deepEqual(c.messages, [{ t: 'profil_refuse' }]);
});

test('profil invalide refusé sans diffusion ni stockage', async () => {
  for (const modifications of [{ pseudo: 'C0NN4RD' }, { sexe: 'autre' }, { tenue: '<script>' }, { pseudo: 'a'.repeat(17) }, { look: [1, 2, 3] }, { look: [1, 5, 8, 2, 1, 1, 8, 0, 12, 2, 1, 4, 3, 0] }, { look: [99, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, { look: 'texte' }]) {
    const a = joueur(0), b = joueur(1), salle = salleAvec(a, b);
    await envoyer(salle, a, { t: 'profil', pseudo: 'Panda', sexe: 'g', tenue: null, ...modifications });
    assert.deepEqual(a.messages, [{ t: 'profil_refuse' }]);
    assert.deepEqual(b.messages, []);
    assert.deepEqual(a.attachment, { s: 0 });
  }
});

test('bienvenue inchangée, profils transmis aux arrivants, onzième joueur refusé', async () => {
  const OriginalResponse = globalThis.Response;
  const OriginalPair = globalThis.WebSocketPair;
  globalThis.Response = class { constructor(body, options) { Object.assign(this, options); } };
  globalThis.WebSocketPair = class { constructor() { const serveur = new Socket(); this[0] = { serveur }; this[1] = serveur; } };
  try {
    const salle = salleAvec();
    for (let i = 0; i < 10; i++) {
      const rep = await salle.fetch(new Request('https://test/salle/ABCDEFGH?creer=1'));
      const ws = rep.webSocket.serveur;
      assert.equal(rep.status, 101);
      assert.deepEqual(ws.messages[0], { t: 'bienvenue', s: i, joueurs: Array.from({ length: i }, (_, k) => k) });
      assert.equal(ws.messages.filter(m => m.t === 'profil').length, i);
      await envoyer(salle, ws, { t: 'profil', pseudo: 'Panda ' + i, sexe: i % 2 ? 'g' : 'f', tenue: 'rouge' });
    }
    const rep = await salle.fetch(new Request('https://test/salle/ABCDEFGH?creer=1'));
    assert.deepEqual(rep.webSocket.serveur.messages, [{ t: 'refus', c: 4001 }]);
    assert.equal(rep.webSocket.serveur.code, 4001);
  } finally { globalThis.Response = OriginalResponse; globalThis.WebSocketPair = OriginalPair; }
});

test('les positions et phrases continuent de fonctionner pour la place 9', async () => {
  const a = joueur(9), b = joueur(0), salle = salleAvec(a, b);
  await envoyer(salle, a, { t: 'p', x: 1, y: 2, z: 3, r: 0, m: 2 });
  assert.deepEqual(b.messages.pop(), { t: 'p', s: 9, x: 1, y: 2, z: 3, r: 0, m: 2 });
  await envoyer(salle, a, { t: 'm', i: 0 });
  assert.deepEqual(b.messages.pop(), { t: 'm', s: 9, i: 0 });
  await salle.webSocketClose(a, 1000);
  assert.equal(a.attachment, null);
  assert.deepEqual(b.messages.pop(), { t: 'part', s: 9 });
});

test('maillots identiques dans le jeu et le relais ; maillot fille/garçon et combinaison gérés par le jeu', () => {
  const ids = [...jeu.match(/const SUITS = \[([\s\S]*?)\n\];/)[1].matchAll(/id: "(\w+)"/g)].map(m => m[1]);
  const maillots = vm.runInNewContext(source.match(/const MAILLOTS = (\[[^\]]*\]);/)[1]);
  assert.deepEqual(ids, [...maillots]);
  const fonction = jeu.slice(jeu.indexOf('function setOutfitBrut('), jeu.indexOf('\n }', jeu.indexOf('function setOutfitBrut(')));
  for (const mot of ['su.full', 'u.female', 'suitTex(su)', 'u.tongs']) assert.ok(fonction.includes(mot), mot);
});

test('transfert d\'une partie : 6 chiffres, un envoi et une réception, messages passés tels quels, rien gardé', async () => {
  const OriginalResponse = globalThis.Response, OriginalPair = globalThis.WebSocketPair;
  globalThis.Response = class { constructor(body, options) { Object.assign(this, options); } };
  globalThis.WebSocketPair = class { constructor() { const serveur = new Socket(); this[0] = { serveur }; this[1] = serveur; } };
  try {
    const tous = [], tags = new Map();
    const ctx = { getWebSockets: t => tous.filter(ws => !ws.closed && (!t || (tags.get(ws) || []).includes(t))), acceptWebSocket: (ws, tg = []) => { tous.push(ws); tags.set(ws, tg); }, getTags: ws => tags.get(ws) || [] };
    const salle = new Salle(ctx), ouvrir = async r => (await salle.fetch(new Request('https://test/transfert/123456?r=' + r))).webSocket.serveur;
    const sansEnvoi = await ouvrir('recv'); assert.equal(sansEnvoi.code, 4404); // personne n'envoie encore : code inconnu
    const env = await ouvrir('send'); assert.equal(env.closed, false);
    assert.equal((await ouvrir('send')).code, 4409); // un seul envoi par code
    const rec = await ouvrir('recv'); assert.deepEqual(env.messages.pop(), { relay: 'peer' });
    assert.equal((await ouvrir('recv')).code, 4409); // une seule réception
    await salle.webSocketMessage(env, JSON.stringify({ t: 'hello', pub: 'abc' })); assert.deepEqual(rec.messages.pop(), { t: 'hello', pub: 'abc' });
    await salle.webSocketMessage(rec, JSON.stringify({ t: 'done' })); assert.deepEqual(env.messages.pop(), { t: 'done' });
    await salle.webSocketMessage(rec, 'x'.repeat(5000)); assert.equal(env.closed, true); // la réception n'envoie que de petits messages
  } finally { globalThis.Response = OriginalResponse; globalThis.WebSocketPair = OriginalPair; }
});

test("monde de l'hôte : seul l'hôte l'envoie, bornes vérifiées, gardé pour les arrivants", async () => {
  const hote = new Socket(); hote.serializeAttachment({ s: 0, hote: true }); const invite = joueur(1);
  const salle = salleAvec(hote, invite);
  await envoyer(salle, invite, { t: 'monde', h: .5, th: 1 });
  assert.equal(hote.messages.length, 0, "un invité ne change pas le monde");
  await envoyer(salle, hote, { t: 'monde', h: 1.5, th: 1 }); await envoyer(salle, hote, { t: 'monde', h: .4, th: 'oui' });
  assert.equal(invite.messages.length, 0, 'valeurs hors liste refusées');
  await envoyer(salle, hote, { t: 'monde', h: .123456, th: 1, extra: 'texte' });
  assert.deepEqual(invite.messages.at(-1), { t: 'monde', s: 0, h: .123, th: 1 });
  await envoyer(salle, hote, { t: 'monde', h: .2, th: 0 });
  assert.equal(invite.messages.length, 1, 'une fois par seconde au plus');
  // le profil garde la marque d'hôte
  await envoyer(salle, hote, { t: 'profil', pseudo: 'Petit Panda', sexe: 'g', tenue: null });
  assert.equal(hote.deserializeAttachment().hote, true);
  assert.equal(invite.messages.at(-1).hote, undefined, "la marque d'hôte n'est pas diffusée");
});

test("monde de l'hôte : la boum et les vagues, en liste fermée", async () => {
  const hote = new Socket(); hote.serializeAttachment({ s: 0, hote: true }); const invite = joueur(1);
  const salle = salleAvec(hote, invite);
  await envoyer(salle, hote, { t: 'monde', h: .5, th: 0, b: 2 });
  await envoyer(salle, hote, { t: 'monde', h: .5, th: 0, v: 12.5 });
  await envoyer(salle, hote, { t: 'monde', h: .5, th: 0, v: 301 });
  assert.equal(invite.messages.length, 0, 'boum ou vagues hors bornes refusées');
  await envoyer(salle, hote, { t: 'monde', h: .5, th: 0, b: 1, v: 42 });
  assert.deepEqual(invite.messages.at(-1), { t: 'monde', s: 0, h: .5, th: 0, b: 1, v: 42 });
  assert.deepEqual(salle.monde, { t: 'monde', s: 0, h: .5, th: 0, b: 1, v: 42 }, 'gardé pour les arrivants');
});

test('bouton des vagues : 0 ou 1, envoyé aux autres, une fois par seconde au plus', async () => {
  const a = joueur(0), b = joueur(1), salle = salleAvec(a, b);
  await envoyer(salle, b, { t: 'vagues', on: 'oui' });
  assert.equal(a.messages.length, 0);
  await envoyer(salle, b, { t: 'vagues', on: 1, texte: 'coucou' });
  assert.deepEqual(a.messages.at(-1), { t: 'vagues', s: 1, on: 1 });
  assert.equal(b.messages.length, 0, "pas renvoyé à celui qui appuie");
  await envoyer(salle, b, { t: 'vagues', on: 0 });
  assert.equal(a.messages.length, 1, 'une fois par seconde au plus');
});

test('se donner un objet : un numéro de la liste, seulement à celui qui le reçoit, merci en retour', async () => {
  const a = joueur(0), b = joueur(1), c = joueur(2), salle = salleAvec(a, b, c);
  await envoyer(salle, a, { t: 'don', a: 1, o: 3, texte: 'non transmis' });
  assert.deepEqual(b.messages.pop(), { t: 'don', s: 0, o: 3 });
  assert.equal(c.messages.length, 0, 'les autres ne voient rien');
  await envoyer(salle, b, { t: 'merci', a: 0, o: 3 });
  assert.deepEqual(a.messages.pop(), { t: 'merci', s: 1, o: 3 });
  await envoyer(salle, a, { t: 'don', a: 1, o: 4 });
  assert.equal(b.messages.length, 0, 'un cadeau à la fois (délai)');
  for (const m of [{ a: 1, o: 64 }, { a: 1, o: -1 }, { a: 1, o: 'pain' }, { a: 0, o: 1 }, { a: 'tous', o: 1 }]) {
    const x = joueur(0), y = joueur(1), s2 = salleAvec(x, y);
    await envoyer(s2, x, { t: 'don', ...m });
    assert.equal(y.messages.length + x.messages.length, 0, JSON.stringify(m));
  }
});
