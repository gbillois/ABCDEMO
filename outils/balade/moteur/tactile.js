/*
 * Commandes tactiles de « La Balade de Millépoques » (le moteur Luminati n'a que le clavier et la souris).
 * - un joystick qui apparaît sous le pouce (partie gauche de l'écran) : marcher, et courir tout au bord ;
 * - deux doigts écartés ou rapprochés n'importe où : zoomer (comme la molette) ;
 * - des boutons ronds à droite : zoom + et −, la carte.
 * Chaque geste devient une touche du clavier (KeyboardEvent avec `code`) ou un tour de molette envoyé
 * à la fenêtre, comme si on tapait. Événements « touch » non passifs (Safari interrompt les « pointer »
 * dès qu'il croit à un zoom). La page bloque le zoom du navigateur. Ajouté à game.html par fabriquer.sh.
 */
(() => {
  // ---- le bouton « Accueil » (écran titre) : retour à la page de la balade ----
  const accueil = document.createElement('a');
  accueil.href = '../index.html';
  accueil.textContent = '◂ Accueil';
  accueil.style.cssText = 'position:fixed;left:max(12px,env(safe-area-inset-left));top:max(12px,env(safe-area-inset-top));z-index:50;'
    + 'display:none;padding:8px 14px;background:#f2c14e;color:#3a2410;border:3px solid #3a2410;border-radius:10px;box-shadow:0 3px 0 #3a2410;'
    + 'font:800 16px Nunito,system-ui,sans-serif;text-decoration:none;';
  const lireMode = () => {
    let mode = '';
    try { mode = window.__game?.state?.().mode ?? ''; } catch { mode = ''; }
    accueil.style.display = mode === 'title' ? 'block' : 'none';
    document.body.classList.toggle('bm-cache', mode !== 'play');
  };
  const tactile = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const demarrer = () => {
    document.body.appendChild(accueil);
    if (tactile) installer();
    lireMode();
    setInterval(lireMode, 300);
  };

  if (tactile) {
    const non = (e) => e.preventDefault();
    const opt = { passive: false };
    for (const t of ['gesturestart', 'gesturechange', 'gestureend', 'dblclick']) document.addEventListener(t, non, opt);
    document.addEventListener('touchmove', (e) => { if (e.touches.length > 1 || (e.scale && e.scale !== 1)) e.preventDefault(); }, opt);
    let derniere = 0;
    document.addEventListener('touchend', (e) => {
      const t = e.target, maintenant = Date.now();
      if (maintenant - derniere < 350 && !(t.closest && t.closest('a, button, input, select, textarea, [role=button], [role=option]'))) e.preventDefault();
      derniere = maintenant;
    }, opt);
  }

  function installer() {
    const tenues = new Set();
    const envoyer = (type, code, key) => window.dispatchEvent(new KeyboardEvent(type, { code, key: key ?? code, bubbles: true, cancelable: true }));
    const appuyer = (code, key) => { if (tenues.has(code)) return; tenues.add(code); envoyer('keydown', code, key); };
    const lacher = (code, key) => { if (!tenues.has(code)) return; tenues.delete(code); envoyer('keyup', code, key); };
    const taper = (code, key) => { appuyer(code, key); setTimeout(() => lacher(code, key), 90); };
    const molette = (dy) => window.dispatchEvent(new WheelEvent('wheel', { deltaY: dy, deltaMode: 0, bubbles: true, cancelable: true }));

    const css = document.createElement('style');
    css.textContent = `
      html, body { touch-action: none; overscroll-behavior: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
      #bm-zone { position: fixed; inset: 0; z-index: 40; touch-action: none; }
      #bm-stick { position: fixed; width: 120px; height: 120px; margin: -60px 0 0 -60px; border-radius: 50%;
        border: 3px solid rgba(255, 248, 230, 0.8); background: rgba(58, 36, 16, 0.25); display: none; z-index: 41; pointer-events: none; }
      #bm-bouton { position: absolute; left: 50%; top: 50%; width: 52px; height: 52px; margin: -26px 0 0 -26px; border-radius: 50%;
        background: rgba(242, 193, 78, 0.92); border: 3px solid #3a2410; }
      #bm-boutons { position: fixed; right: max(12px, env(safe-area-inset-right)); bottom: max(24px, calc(env(safe-area-inset-bottom) + 16px));
        display: flex; flex-direction: column; gap: 12px; z-index: 42; }
      .bm-b { width: 58px; height: 58px; border-radius: 50%; border: 3px solid #3a2410; color: #3a2410; display: grid; place-items: center;
        font: 900 26px Nunito, system-ui, sans-serif; background: rgba(255, 248, 230, 0.92); box-shadow: 0 3px 0 #3a2410; touch-action: none; }
      .bm-b.petit { font-size: 13px; font-weight: 800; }
      .bm-b.tenu { background: #f2c14e; transform: translateY(2px); box-shadow: 0 1px 0 #3a2410; }
      @media (max-height: 500px), (max-width: 500px) {
        .bm-b { width: 48px; height: 48px; font-size: 22px; }
        #bm-stick { width: 100px; height: 100px; margin: -50px 0 0 -50px; }
      }
      body.bm-cache #bm-boutons, body.bm-cache #bm-zone { display: none; }
    `;
    document.head.appendChild(css);

    // ---- le joystick (un doigt) et le zoom (deux doigts) ----
    const zone = document.createElement('div');
    zone.id = 'bm-zone';
    const stick = document.createElement('div');
    stick.id = 'bm-stick';
    stick.innerHTML = '<div id="bm-bouton"></div>';
    const bouton = stick.firstChild;
    const DIR = { haut: 'KeyW', bas: 'KeyS', gauche: 'KeyA', droite: 'KeyD' };
    let doigt = null, cx = 0, cy = 0;
    const diriger = (dx, dy) => {
      const r = Math.hypot(dx, dy), voulu = new Set();
      if (r > 12) {
        const a = Math.atan2(dy, dx), s = Math.sin(a), c = Math.cos(a);
        if (c > 0.38) voulu.add(DIR.droite);
        if (c < -0.38) voulu.add(DIR.gauche);
        if (s > 0.38) voulu.add(DIR.bas);
        if (s < -0.38) voulu.add(DIR.haut);
      }
      for (const code of Object.values(DIR)) (voulu.has(code) ? appuyer : lacher)(code);
      (r > 55 ? appuyer : lacher)('ShiftLeft', 'Shift'); // tout au bord : on court
      const k = Math.min(1, 40 / Math.max(r, 1));
      bouton.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
    };
    const finJoystick = () => { doigt = null; stick.style.display = 'none'; diriger(0, 0); };
    let pince = null; // { a, b, d } : deux doigts, leur écart
    const ecart = (l) => {
      const t = [...l].filter((x) => x.identifier === pince.a || x.identifier === pince.b);
      return t.length === 2 ? Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) : null;
    };
    const opt = { passive: false };
    zone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.touches.length >= 2) {
        // deux doigts : on zoome, on ne marche plus
        finJoystick();
        const [a, b] = e.touches;
        pince = { a: a.identifier, b: b.identifier, d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) };
        return;
      }
      if (doigt !== null || pince) return;
      const t = e.changedTouches[0];
      doigt = t.identifier; cx = t.clientX; cy = t.clientY;
      stick.style.left = `${cx}px`; stick.style.top = `${cy}px`; stick.style.display = 'block';
      diriger(0, 0);
    }, opt);
    zone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (pince) {
        const d = ecart(e.touches);
        if (d) { molette((pince.d - d) * 3); pince.d = d; }
        return;
      }
      for (const t of e.changedTouches) if (t.identifier === doigt) diriger(t.clientX - cx, t.clientY - cy);
    }, opt);
    const finir = (e) => {
      e.preventDefault();
      if (pince && e.touches.length < 2) pince = null;
      for (const t of e.changedTouches) if (t.identifier === doigt) finJoystick();
    };
    zone.addEventListener('touchend', finir, opt);
    zone.addEventListener('touchcancel', finir, opt);

    // ---- les boutons ----
    const boutons = document.createElement('div');
    boutons.id = 'bm-boutons';
    const brancher = (el, code, key, tenir) => {
      el.addEventListener('touchstart', (e) => {
        e.preventDefault(); e.stopPropagation();
        el.classList.add('tenu');
        if (tenir) appuyer(code, key); else taper(code, key);
      }, opt);
      const relacher = (e) => { e.preventDefault(); el.classList.remove('tenu'); if (tenir) lacher(code, key); };
      el.addEventListener('touchend', relacher, opt);
      el.addEventListener('touchcancel', relacher, opt);
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    };
    for (const [texte, code, key, tenir, cls] of [['Carte', 'KeyN', 'n', false, 'petit'], ['+', 'KeyZ', 'z', true, ''], ['−', 'KeyX', 'x', true, '']]) {
      const b = document.createElement('div');
      b.className = 'bm-b' + (cls ? ' ' + cls : '');
      b.textContent = texte;
      brancher(b, code, key, tenir);
      boutons.appendChild(b);
    }
    document.body.append(zone, stick, boutons);
    addEventListener('blur', () => { for (const c of [...tenues]) lacher(c); finJoystick(); pince = null; });
  }

  if (document.body) demarrer(); else addEventListener('DOMContentLoaded', demarrer);
})();
