// Relais multijoueur du Domaine des Pins.
//
// Une partie = un code (8 caractères) = une « salle » en mémoire (Durable Object).
// Le relais ne fait que transmettre des positions et des numéros de phrases entre les
// joueurs d'une même salle. Il n'écrit rien sur disque, ne connaît aucun prénom, et
// refuse tout texte libre : les messages sont des numéros d'une liste fermée.

const MAX_JOUEURS = 6;
const NB_PHRASES = 12;        // doit correspondre à la liste PHRASES du jeu
const TAILLE_MAX = 160;       // octets par message reçu
const POS_PAR_SECONDE = 15;   // positions acceptées par joueur et par seconde
const PHRASE_DELAI_MS = 1500; // délai minimal entre deux phrases d'un même joueur
const CODE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/;
const MODES = 5;              // 0 immobile, 1 marche, 2 nage, 3 échelle, 4 toboggan

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origines = (env.ORIGINES || "").split(",").map(s => s.trim()).filter(Boolean);
    const origine = request.headers.get("Origin") || "";

    if (url.pathname === "/") return new Response("Relais du Domaine des Pins : OK\n", { headers: { "content-type": "text/plain; charset=utf-8" } });

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
    serveur.serializeAttachment({ s });
    serveur.send(JSON.stringify({ t: "bienvenue", s, joueurs: [...pris] }));
    this.diffuser({ t: "arrive", s }, serveur);
    return new Response(null, { status: 101, webSocket: client });
  }

  place(ws) { const a = ws.deserializeAttachment(); return a ? a.s : -1; }

  diffuser(obj, sauf) {
    const txt = JSON.stringify(obj);
    for (const ws of this.ctx.getWebSockets()) if (ws !== sauf && this.place(ws) >= 0) { try { ws.send(txt); } catch (e) {} }
  }

  async webSocketMessage(ws, data) {
    const s = this.place(ws);
    if (s < 0) return;
    if (typeof data !== "string" || data.length > TAILLE_MAX) return ws.close(1009, "trop long");
    let msg; try { msg = JSON.parse(data); } catch (e) { return ws.close(1003, "illisible"); }
    if (!msg || typeof msg !== "object") return;

    const now = Date.now();
    const d = this.debit.get(ws) || { t0: now, n: 0, phrase: 0 };
    this.debit.set(ws, d);

    if (msg.t === "p") {
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
    }
  }

  async webSocketClose(ws, code) {
    this.quitter(ws);
    try { ws.close(code === 1000 || (code >= 3000 && code <= 4999) ? code : 1000, "au revoir"); } catch (e) {}
  }

  async webSocketError(ws) { this.quitter(ws); }

  quitter(ws) {
    const s = this.place(ws);
    this.debit.delete(ws);
    ws.serializeAttachment(null);
    if (s >= 0) this.diffuser({ t: "part", s }, ws);
  }
}
