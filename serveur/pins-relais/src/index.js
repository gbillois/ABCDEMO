// Relais multijoueur du Domaine des Pins.
//
// Une partie = un code (8 caractères) = une « salle » en mémoire (Durable Object).
// Le relais ne fait que transmettre des positions et des numéros de phrases entre les
// joueurs d'une même salle. Il n'écrit rien sur disque et ne connaît aucun prénom.
// Les phrases sont une liste fermée ; seul le surnom court et filtré est du texte.

const MAX_JOUEURS = 10;
const NB_PHRASES = 64;        // au plus 64 phrases dans la liste PHRASES du jeu (phrases + rendez-vous)
const TAILLE_MAX = 220;       // octets par message reçu
const POS_PAR_SECONDE = 15;   // positions acceptées par joueur et par seconde
const PHRASE_DELAI_MS = 1500; // délai minimal entre deux phrases d'un même joueur
const CODE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/;
const MODES = 5;              // 0 immobile, 1 marche, 2 nage, 3 échelle, 4 toboggan
// Transfert d'une partie d'un appareil à l'autre (comme Millepoques) : un code de 6 chiffres = une petite salle à deux.
// L'appareil qui envoie arrive le premier (?r=send), celui qui reçoit le rejoint (?r=recv) ; chaque message de l'un est
// passé tel quel à l'autre. La partie est chiffrée par les deux appareils (le relais ne voit que des octets illisibles) ;
// rien n'est écrit ; le code meurt au bout de 10 minutes.
const TRANSFERT = /^\/transfert\/(\d{6})$/;
const T_TTL = 10 * 60e3, T_MAX_SEND = 600000, T_MAX_RECV = 4000; // durée, octets envoyés par chacun
const T_INCONNU = [4404, "code inconnu"], T_PRIS = [4409, "code pris"], T_FINI = [4408, "code fini"], T_GROS = [4413, "trop gros"];
const MAILLOTS = ["rouge", "raye", "palmiers", "requin", "arcenciel", "surf", "or"];
// apparence du personnage : uniquement des numéros dans des listes fermées (mêmes bornes que LOOK_MAX du jeu)
// (les 4 derniers : forme des yeux, sourcils, nez, bouche ; un ancien jeu envoie encore 13 numéros : accepté, le jeu complète)
const LOOK_MAX = [8, 12, 9, 6, 3, 3, 9, 8, 14, 12, 8, 5, 4, 6, 6, 5, 6];
const lookValide = l => Array.isArray(l) && (l.length === LOOK_MAX.length || l.length === 13) && l.every((v, i) => Number.isInteger(v) && v >= 0 && v < LOOK_MAX[i]);

// Filtre simple, identique dans le jeu et le relais (accents et substitutions courantes).
function filtrerSurnom(v) {
  if (typeof v !== "string") return null;
  const p = v.normalize("NFC").trim().replace(/\s+/g, " ");
  if (!p) return ""; // sans surnom, on garde le nom de l'animal
  if (p.length < 2 || p.length > 16 || !/^[A-Za-zÀ-ÖØ-öø-ÿ0-9 _'-]+$/.test(p) || !/[A-Za-zÀ-ÖØ-öø-ÿ0-9]/.test(p)) return null;
  const simple = p.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[01345789]/g, c => ({ 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", 8: "b", 9: "g" })[c]);
  const compact = simple.replace(/[^a-z]/g, "");
  if (/(connard|connasse|salope|salopard|encul|putain|pute|merde|batard|abruti|debile|idiot|ta?gueule|fuck|shit|bitch|nazi|negro|negre|bougnoule|salejuif)/.test(compact)
      || /(?:^|[^a-z])(con|cons|pd|fdp|ntm)(?:$|[^a-z])/.test(simple) || /^(con|cons|pd|fdp|ntm)$/.test(compact)) return null;
  return p;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origines = (env.ORIGINES || "").split(",").map(s => s.trim()).filter(Boolean);
    const origine = request.headers.get("Origin") || "";

    if (url.pathname === "/") return new Response("Relais du Domaine des Pins : OK\n", { headers: { "content-type": "text/plain; charset=utf-8" } });

    const t = url.pathname.match(TRANSFERT);
    if (t) {
      const role = url.searchParams.get("r");
      if (request.headers.get("Upgrade") !== "websocket" || (role !== "send" && role !== "recv")) return new Response("WebSocket attendu", { status: 426 });
      if (!origines.includes(origine)) return new Response("Origine refusée", { status: 403 });
      return env.SALLES.get(env.SALLES.idFromName("transfert-" + t[1])).fetch(request);
    }
    const m = url.pathname.match(/^\/salle\/([^/]+)$/);
    if (!m) return new Response("Introuvable", { status: 404 });
    if (request.headers.get("Upgrade") !== "websocket") return new Response("WebSocket attendu", { status: 426 });
    if (!origines.includes(origine)) return new Response("Origine refusée", { status: 403 });
    const code = m[1].toUpperCase();
    if (!CODE.test(code)) return new Response("Code invalide", { status: 400 });

    const salle = env.SALLES.get(env.SALLES.idFromName(code));
    return salle.fetch(request);
  },
};

export class Salle {
  constructor(ctx) {
    this.ctx = ctx;
    this.debit = new Map(); // limites de débit, en mémoire seulement
  }

  async fetch(request) {
    if (TRANSFERT.test(new URL(request.url).pathname)) return this.transfert(request);
    const creer = new URL(request.url).searchParams.get("creer") === "1";
    const presents = this.ctx.getWebSockets().filter(ws => this.place(ws) >= 0);
    const [client, serveur] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(serveur);

    // Une salle n'existe que tant qu'il y a quelqu'un dedans : un code ne sert plus
    // une fois que tout le monde est parti.
    const refuser = c => { serveur.send(JSON.stringify({ t: "refus", c })); serveur.close(c, c === 4004 ? "inconnu" : "pleine"); return new Response(null, { status: 101, webSocket: client }); };
    if (!presents.length && !creer) return refuser(4004);
    if (presents.length >= MAX_JOUEURS) return refuser(4001);

    const pris = new Set(presents.map(ws => this.place(ws)));
    let s = 0; while (pris.has(s)) s++;
    serveur.serializeAttachment({ s, hote: creer && !presents.length }); // celui qui crée la salle est l'hôte : son monde (heure, thème) est celui de tous
    serveur.send(JSON.stringify({ t: "bienvenue", s, joueurs: [...pris] }));
    for (const ws of presents) {
      const a = ws.deserializeAttachment();
      if (a.sexe) serveur.send(JSON.stringify({ t: "profil", s: a.s, pseudo: a.pseudo, sexe: a.sexe, tenue: a.tenue, look: a.look ?? null }));
    }
    if (this.monde) serveur.send(JSON.stringify(this.monde));
    this.diffuser({ t: "arrive", s }, serveur);
    return new Response(null, { status: 101, webSocket: client });
  }

  place(ws) { const a = ws.deserializeAttachment(); return a && Number.isInteger(a.s) ? a.s : -1; }

  // ---- transfert d'une partie : deux appareils, l'un envoie, l'autre reçoit
  refuserT([c, raison]) { const [client, serveur] = Object.values(new WebSocketPair()); this.ctx.acceptWebSocket(serveur, ["fini"]); serveur.close(c, raison); return new Response(null, { status: 101, webSocket: client }); }
  transfert(request) {
    const role = new URL(request.url).searchParams.get("r"), now = Date.now();
    const env = this.ctx.getWebSockets("send")[0], ne = env?.deserializeAttachment()?.t || 0;
    if (env && now - ne > T_TTL) { this.finirT(T_FINI); return this.refuserT(role === "send" ? T_FINI : T_INCONNU); }
    if (role === "send" && env) return this.refuserT(T_PRIS);
    if (role === "recv" && !env) return this.refuserT(T_INCONNU);
    if (role === "recv" && this.ctx.getWebSockets("recv").length) return this.refuserT(T_PRIS);
    const [client, serveur] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(serveur, [role]);
    serveur.serializeAttachment({ tr: true, t: role === "send" ? now : ne, n: 0 });
    if (role === "recv") for (const ws of this.ctx.getWebSockets()) if (ws.deserializeAttachment()?.tr) { try { ws.send('{"relay":"peer"}'); } catch (e) {} }
    return new Response(null, { status: 101, webSocket: client });
  }
  finirT([c, raison]) { for (const ws of this.ctx.getWebSockets()) { try { ws.close(c, raison); } catch (e) {} } }
  messageT(ws, data, a) {
    if (Date.now() - a.t > T_TTL) return this.finirT(T_FINI);
    const send = this.ctx.getTags(ws).includes("send");
    a.n += typeof data === "string" ? data.length * 3 : data.byteLength;
    if (a.n > (send ? T_MAX_SEND : T_MAX_RECV)) return this.finirT(T_GROS);
    ws.serializeAttachment(a);
    for (const o of this.ctx.getWebSockets()) if (o !== ws && o.deserializeAttachment()?.tr) { try { o.send(data); } catch (e) {} }
  }

  diffuser(obj, sauf) {
    const txt = JSON.stringify(obj);
    for (const ws of this.ctx.getWebSockets()) if (ws !== sauf && this.place(ws) >= 0) { try { ws.send(txt); } catch (e) {} }
  }

  async webSocketMessage(ws, data) {
    const at = ws.deserializeAttachment(); if (at && at.tr) return this.messageT(ws, data, at);
    const s = this.place(ws);
    if (s < 0) return;
    if (typeof data !== "string" || data.length > TAILLE_MAX) return ws.close(1009, "trop long");
    let msg; try { msg = JSON.parse(data); } catch (e) { return ws.close(1003, "illisible"); }
    if (!msg || typeof msg !== "object") return;

    const now = Date.now();
    const d = this.debit.get(ws) || { t0: now, n: 0, phrase: 0 };
    this.debit.set(ws, d);

    if (msg.t === "profil") {
      const pseudo = filtrerSurnom(msg.pseudo);
      const look = msg.look === undefined || msg.look === null ? null : lookValide(msg.look) ? msg.look.slice() : false;
      if (pseudo === null || look === false || !["f", "g"].includes(msg.sexe) || (msg.tenue !== null && !MAILLOTS.includes(msg.tenue))) {
        ws.send(JSON.stringify({ t: "profil_refuse" })); return;
      }
      const a = ws.deserializeAttachment();
      // Le choix du surnom et du personnage se fait à la connexion ; la tenue peut changer.
      if (a.sexe && (a.pseudo !== pseudo || a.sexe !== msg.sexe || JSON.stringify(a.look ?? null) !== JSON.stringify(look))) return;
      if (a.sexe && a.tenue === msg.tenue) return;
      const profil = { s, pseudo, sexe: msg.sexe, tenue: msg.tenue, look };
      ws.serializeAttachment(a.hote ? { ...profil, hote: true } : profil);
      this.diffuser({ t: "profil", ...profil }, null);
    } else if (msg.t === "p") {
      if (now - d.t0 > 1000) { d.t0 = now; d.n = 0; }
      if (++d.n > POS_PAR_SECONDE) return;
      const nb = (v, min, max) => typeof v === "number" && Number.isFinite(v) ? Math.round(Math.min(max, Math.max(min, v)) * 100) / 100 : null;
      const x = nb(msg.x, -400, 400), y = nb(msg.y, -5, 40), z = nb(msg.z, -400, 400), r = nb(msg.r, -7, 7);
      const mode = Number.isInteger(msg.m) && msg.m >= 0 && msg.m < MODES ? msg.m : 0;
      if (x === null || y === null || z === null || r === null) return;
      this.diffuser({ t: "p", s, x, y, z, r, m: mode }, ws);
    } else if (msg.t === "m") {
      if (!Number.isInteger(msg.i) || msg.i < 0 || msg.i >= NB_PHRASES) return;
      if (now - d.phrase < PHRASE_DELAI_MS) return;
      d.phrase = now;
      this.diffuser({ t: "m", s, i: msg.i }, null);
    } else if (msg.t === "monde") {
      // le monde de l'hôte : l'heure du jour (0 à 1) et le thème (0 normal, 1 Halloween) ; rien d'autre
      if (!ws.deserializeAttachment()?.hote || now - (d.monde || 0) < 900) return;
      if (typeof msg.h !== "number" || !Number.isFinite(msg.h) || msg.h < 0 || msg.h > 1 || (msg.th !== 0 && msg.th !== 1)) return;
      d.monde = now;
      this.monde = { t: "monde", s, h: Math.round(msg.h * 1000) / 1000, th: msg.th };
      this.diffuser(this.monde, ws);
    }
  }

  async webSocketClose(ws, code) {
    const at = ws.deserializeAttachment(); if (at && at.tr) { // transfert : l'autre appareil est prévenu
      for (const o of this.ctx.getWebSockets()) if (o !== ws && o.deserializeAttachment()?.tr) { try { o.send('{"relay":"gone"}'); } catch (e) {} }
      try { ws.close(code === 1005 || code === 1006 ? 1000 : code, "au revoir"); } catch (e) {} return; }
    this.quitter(ws);
    try { ws.close(code === 1000 || (code >= 3000 && code <= 4999) ? code : 1000, "au revoir"); } catch (e) {}
  }

  async webSocketError(ws) { const at = ws.deserializeAttachment(); if (at && at.tr) return this.webSocketClose(ws, 1000); this.quitter(ws); }

  quitter(ws) {
    const s = this.place(ws);
    this.debit.delete(ws);
    ws.serializeAttachment(null);
    if (s >= 0) this.diffuser({ t: "part", s }, ws);
    if (!this.ctx.getWebSockets().some(o => o !== ws && this.place(o) >= 0)) this.monde = null; // salle vide : on oublie tout
  }
}
