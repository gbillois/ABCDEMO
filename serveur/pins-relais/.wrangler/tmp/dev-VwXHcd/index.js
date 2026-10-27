var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.js
var MAX_JOUEURS = 6;
var NB_PHRASES = 12;
var TAILLE_MAX = 160;
var POS_PAR_SECONDE = 15;
var PHRASE_DELAI_MS = 1500;
var CODE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/;
var MODES = 5;
var src_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origines = (env.ORIGINES || "").split(",").map((s) => s.trim()).filter(Boolean);
    const origine = request.headers.get("Origin") || "";
    if (url.pathname === "/") return new Response("Relais du Domaine des Pins : OK\n", { headers: { "content-type": "text/plain; charset=utf-8" } });
    const m = url.pathname.match(/^\/salle\/([^/]+)$/);
    if (!m) return new Response("Introuvable", { status: 404 });
    if (request.headers.get("Upgrade") !== "websocket") return new Response("WebSocket attendu", { status: 426 });
    if (!origines.includes(origine)) return new Response("Origine refus\xE9e", { status: 403 });
    const code = m[1].toUpperCase();
    if (!CODE.test(code)) return new Response("Code invalide", { status: 400 });
    const salle = env.SALLES.get(env.SALLES.idFromName(code));
    return salle.fetch(request);
  }
};
var Salle = class {
  static {
    __name(this, "Salle");
  }
  constructor(ctx) {
    this.ctx = ctx;
    this.debit = /* @__PURE__ */ new Map();
  }
  async fetch(request) {
    const creer = new URL(request.url).searchParams.get("creer") === "1";
    const presents = this.ctx.getWebSockets().filter((ws) => this.place(ws) >= 0);
    const [client, serveur] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(serveur);
    if (!presents.length && !creer) {
      serveur.close(4004, "inconnu");
      return new Response(null, { status: 101, webSocket: client });
    }
    if (presents.length >= MAX_JOUEURS) {
      serveur.close(4001, "pleine");
      return new Response(null, { status: 101, webSocket: client });
    }
    const pris = new Set(presents.map((ws) => this.place(ws)));
    let s = 0;
    while (pris.has(s)) s++;
    serveur.serializeAttachment({ s });
    serveur.send(JSON.stringify({ t: "bienvenue", s, joueurs: [...pris] }));
    this.diffuser({ t: "arrive", s }, serveur);
    return new Response(null, { status: 101, webSocket: client });
  }
  place(ws) {
    const a = ws.deserializeAttachment();
    return a ? a.s : -1;
  }
  diffuser(obj, sauf) {
    const txt = JSON.stringify(obj);
    for (const ws of this.ctx.getWebSockets()) if (ws !== sauf && this.place(ws) >= 0) {
      try {
        ws.send(txt);
      } catch (e) {
      }
    }
  }
  async webSocketMessage(ws, data) {
    const s = this.place(ws);
    if (s < 0) return;
    if (typeof data !== "string" || data.length > TAILLE_MAX) return ws.close(1009, "trop long");
    let msg;
    try {
      msg = JSON.parse(data);
    } catch (e) {
      return ws.close(1003, "illisible");
    }
    if (!msg || typeof msg !== "object") return;
    const now = Date.now();
    const d = this.debit.get(ws) || { t0: now, n: 0, phrase: 0 };
    this.debit.set(ws, d);
    if (msg.t === "p") {
      if (now - d.t0 > 1e3) {
        d.t0 = now;
        d.n = 0;
      }
      if (++d.n > POS_PAR_SECONDE) return;
      const nb = /* @__PURE__ */ __name((v, min, max) => typeof v === "number" && Number.isFinite(v) ? Math.round(Math.min(max, Math.max(min, v)) * 100) / 100 : null, "nb");
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
    try {
      ws.close(code === 1e3 || code >= 3e3 && code <= 4999 ? code : 1e3, "au revoir");
    } catch (e) {
    }
  }
  async webSocketError(ws) {
    this.quitter(ws);
  }
  quitter(ws) {
    const s = this.place(ws);
    this.debit.delete(ws);
    ws.serializeAttachment(null);
    if (s >= 0) this.diffuser({ t: "part", s }, ws);
  }
};

// ../../../../../tmp/claude-0/-home-user-ABCDEMO/d2231cba-a079-5297-a4d6-722a2be6e63c/scratchpad/wr/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../../tmp/claude-0/-home-user-ABCDEMO/d2231cba-a079-5297-a4d6-722a2be6e63c/scratchpad/wr/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-qJXXS6/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../../../../../tmp/claude-0/-home-user-ABCDEMO/d2231cba-a079-5297-a4d6-722a2be6e63c/scratchpad/wr/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-qJXXS6/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  Salle,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
