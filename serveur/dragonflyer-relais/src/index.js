// Relais multijoueur de The Dragon Apprentice Chronicles (Cloudflare Worker + Durable Object).
//
// Une partie à plusieurs = un code (8 caractères) = une « salle » en mémoire (Durable Object).
// Le relais ne fait que transmettre les positions des dragons (et des cavaliers à pied), les profils
// (surnom court filtré + couleur du dragon) et des numéros de phrases entre les joueurs d'une même salle.
// Il n'écrit rien sur disque, n'a pas de journaux et ne connaît aucun prénom.

const MAX_JOUEURS = 8;
const NB_PHRASES = 32;        // au plus 32 phrases dans la liste PHRASES du jeu
const NB_COULEURS = 8;        // couleurs de dragon : numéros de la liste COULEURS_DRAGON du jeu
const TAILLE_MAX = 220;       // octets par message reçu
const POS_PAR_SECONDE = 15;   // positions acceptées par joueur et par seconde
const PHRASE_DELAI_MS = 1500; // délai minimal entre deux phrases d'un même joueur
const MONDE = 3200;           // demi-taille du monde (m) : les positions sont bornées
const MODES = 3;              // 0 en vol, 1 posé, 2 à pied
const CODE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/;
// Transfert d'une partie d'un appareil à l'autre : un code de 6 chiffres = une petite salle à deux.
// L'appareil qui envoie arrive le premier (?r=send), celui qui reçoit le rejoint (?r=recv) ; chaque message de l'un est
// passé tel quel à l'autre. La partie est chiffrée par les deux appareils (le relais ne voit que des octets illisibles) ;
// rien n'est écrit ; le code meurt au bout de 10 minutes.
const TRANSFERT = /^\/transfert\/(\d{6})$/;
const T_TTL = 10 * 60e3, T_MAX_SEND = 400000, T_MAX_RECV = 4000; // durée, octets envoyés par chacun
const T_INCONNU = [4404, "code inconnu"], T_PRIS = [4409, "code pris"], T_FINI = [4408, "code fini"], T_GROS = [4413, "trop gros"];

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

    if (url.pathname === "/") return new Response("Relais de The Dragon Apprentice Chronicles : OK\n", { headers: { "content-type": "text/plain; charset=utf-8" } });

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
    return env.SALLES.get(env.SALLES.idFromName(code)).fetch(request);
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

    // Une salle n'existe que tant qu'il y a quelqu'un dedans : un code ne sert plus une fois que tout le monde est parti.
    const refuser = c => { serveur.send(JSON.stringify({ t: "refus", c })); serveur.close(c, c === 4004 ? "inconnu" : "pleine"); return new Response(null, { status: 101, webSocket: client }); };
    if (!presents.length && !creer) return refuser(4004);
    if (presents.length >= MAX_JOUEURS) return refuser(4001);

    const pris = new Set(presents.map(ws => this.place(ws)));
    let s = 0; while (pris.has(s)) s++;
    serveur.serializeAttachment({ s });
    serveur.send(JSON.stringify({ t: "bienvenue", s, joueurs: [...pris] }));
    for (const ws of presents) {
      const a = ws.deserializeAttachment();
      if (a.profil) serveur.send(JSON.stringify({ t: "profil", s: a.s, pseudo: a.pseudo, couleur: a.couleur }));
    }
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
      // surnom (facultatif, filtré) et couleur du dragon (numéro dans la liste fermée), fixés pour toute la connexion
      const pseudo = filtrerSurnom(msg.pseudo);
      if (pseudo === null || !Number.isInteger(msg.couleur) || msg.couleur < 0 || msg.couleur >= NB_COULEURS) { ws.send(JSON.stringify({ t: "profil_refuse" })); return; }
      const a = ws.deserializeAttachment();
      if (a.profil) return;
      const profil = { s, pseudo, couleur: msg.couleur };
      ws.serializeAttachment({ ...profil, profil: true });
      this.diffuser({ t: "profil", ...profil }, null);
    } else if (msg.t === "p") {
      if (now - d.t0 > 1000) { d.t0 = now; d.n = 0; }
      if (++d.n > POS_PAR_SECONDE) return;
      const nb = (v, min, max, k = 10) => typeof v === "number" && Number.isFinite(v) ? Math.round(Math.min(max, Math.max(min, v)) * k) / k : null;
      const x = nb(msg.x, -MONDE, MONDE), y = nb(msg.y, -50, 2500), z = nb(msg.z, -MONDE, MONDE);
      const r = nb(msg.r, -7, 7, 100), a = nb(msg.a, -2, 2, 100), b = nb(msg.b, -2, 2, 100);
      const mode = Number.isInteger(msg.m) && msg.m >= 0 && msg.m < MODES ? msg.m : 0, f = msg.f === 1 ? 1 : 0;
      if ([x, y, z, r, a, b].includes(null)) return;
      this.diffuser({ t: "p", s, x, y, z, r, a, b, m: mode, f }, ws);
    } else if (msg.t === "m") {
      if (!Number.isInteger(msg.i) || msg.i < 0 || msg.i >= NB_PHRASES) return;
      if (now - d.phrase < PHRASE_DELAI_MS) return;
      d.phrase = now;
      this.diffuser({ t: "m", s, i: msg.i }, null);
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
  }
}
