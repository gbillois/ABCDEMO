/*
 * Commandes tactiles pour « Les Trois Lueurs » (le moteur Luminati n'a que le clavier et la souris).
 * Un joystick qui apparaît sous le doigt (moitié gauche de l'écran) et des boutons ronds à droite.
 * Chaque geste est traduit en touches du clavier (KeyboardEvent avec `code`) envoyées à la fenêtre,
 * exactement comme si on tapait : WASD pour marcher, J épée, K roulade, Espace parler, C potion…
 *
 * Écrit avec les événements « touch » (touchstart / touchmove / touchend, non passifs) et non les
 * « pointer » : sur iPhone et iPad, Safari interrompt un pointeur dès qu'il croit à un zoom ou à un
 * défilement. La page bloque aussi le zoom (pincement, double-tape).
 * N'apparaît que sur un écran tactile. Fichier ajouté au jeu par outils/lumina/fabriquer.sh.
 */
(() => {
  // ---- le bouton « Accueil » (sur l'écran titre seulement) : retour à la page du jeu ----
  const accueil = document.createElement('a');
  accueil.href = '../index.html';
  accueil.textContent = '◂ Accueil';
  accueil.style.cssText = 'position:fixed;left:max(12px,env(safe-area-inset-left));top:max(12px,env(safe-area-inset-top));z-index:50;'
    + 'display:none;padding:8px 14px;background:#e8c66a;color:#1b1405;border:3px solid #000;box-shadow:3px 3px 0 #000;'
    + 'font:700 16px "Pixelify Sans",system-ui,sans-serif;text-decoration:none;';
  let mode = '';
  const lireMode = () => {
    try { mode = window.__game?.state?.().mode ?? ''; } catch { mode = ''; }
    accueil.style.display = mode === 'title' ? 'block' : 'none';
    document.body.classList.toggle('tl-cache', mode !== 'play');
  };

  const tactile = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  const demarrer = () => {
    document.body.appendChild(accueil);
    if (tactile) installerTactile();
    lireMode();
    setInterval(lireMode, 300);
  };

  // ---- pas de zoom : ni pincement, ni double-tape, ni double-clic ----
  if (tactile) {
    const non = (e) => e.preventDefault();
    const opt = { passive: false };
    for (const t of ['gesturestart', 'gesturechange', 'gestureend', 'dblclick']) document.addEventListener(t, non, opt);
    document.addEventListener('touchmove', (e) => { if (e.touches.length > 1 || (e.scale && e.scale !== 1)) e.preventDefault(); }, opt);
    let derniere = 0;
    document.addEventListener('touchend', (e) => {
      const t = e.target;
      const maintenant = Date.now();
      // deuxième tape rapide hors des liens et des boutons du menu : c'est un double-tape, on l'annule
      if (maintenant - derniere < 350 && !(t.closest && t.closest('a, button, input, select, textarea, [role=button], [role=option]'))) e.preventDefault();
      derniere = maintenant;
    }, opt);
  }

  function installerTactile() {
    const tenues = new Set();
    const envoyer = (type, code, key) => {
      window.dispatchEvent(new KeyboardEvent(type, { code, key: key ?? code, bubbles: true, cancelable: true }));
    };
    const appuyer = (code, key) => { if (tenues.has(code)) return; tenues.add(code); envoyer('keydown', code, key); };
    const lacher = (code, key) => { if (!tenues.has(code)) return; tenues.delete(code); envoyer('keyup', code, key); };
    const taper = (code, key) => { appuyer(code, key); setTimeout(() => lacher(code, key), 90); };

    const css = document.createElement('style');
    css.textContent = `
      html, body { touch-action: none; overscroll-behavior: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
      #tl-zone { position: fixed; left: 0; top: 70px; bottom: 0; width: 50%; z-index: 40; touch-action: none; }
      #tl-stick { position: fixed; width: 120px; height: 120px; margin: -60px 0 0 -60px; border-radius: 50%;
        border: 3px solid rgba(240, 220, 160, 0.75); background: rgba(10, 12, 24, 0.35); display: none; z-index: 41; pointer-events: none; }
      #tl-bouton { position: absolute; left: 50%; top: 50%; width: 52px; height: 52px; margin: -26px 0 0 -26px; border-radius: 50%;
        background: rgba(232, 198, 106, 0.85); border: 3px solid #1b1405; }
      #tl-boutons { position: fixed; right: max(10px, env(safe-area-inset-right)); bottom: max(78px, calc(env(safe-area-inset-bottom) + 70px));
        width: 210px; height: 210px; z-index: 42; touch-action: none; transform-origin: 100% 100%; }
      .tl-b { position: absolute; border-radius: 50%; border: 3px solid #1b1405; color: #1b1405; display: grid; place-items: center;
        font: 700 15px "Pixelify Sans", system-ui, sans-serif; text-align: center; line-height: 1.05;
        background: rgba(232, 198, 106, 0.88); box-shadow: 0 3px 0 rgba(0,0,0,0.6); touch-action: none; }
      .tl-b.tenu { background: #fff1b8; transform: translateY(2px); box-shadow: 0 1px 0 rgba(0,0,0,0.6); }
      #tl-haut { position: fixed; left: 50%; transform: translateX(-50%); top: max(8px, env(safe-area-inset-top));
        display: flex; gap: 8px; z-index: 42; }
      #tl-haut .tl-b { position: static; width: 46px; height: 46px; font-size: 12px; }
      /* petits écrans (téléphone) : boutons plus petits */
      @media (max-height: 500px), (max-width: 500px) {
        #tl-boutons { transform: scale(0.72); bottom: max(62px, calc(env(safe-area-inset-bottom) + 56px)); }
        #tl-haut .tl-b { width: 40px; height: 40px; font-size: 10px; }
        #tl-stick { width: 100px; height: 100px; margin: -50px 0 0 -50px; }
      }
      body.tl-cache #tl-boutons, body.tl-cache #tl-haut, body.tl-cache #tl-zone { display: none; }
    `;
    document.head.appendChild(css);

    const zone = document.createElement('div');
    zone.id = 'tl-zone';
    const stick = document.createElement('div');
    stick.id = 'tl-stick';
    stick.innerHTML = '<div id="tl-bouton"></div>';
    const bouton = stick.firstChild;

    // ---- le joystick ----
    let doigt = null;
    let cx = 0;
    let cy = 0;
    const DIR = { haut: 'KeyW', bas: 'KeyS', gauche: 'KeyA', droite: 'KeyD' };
    const diriger = (dx, dy) => {
      const r = Math.hypot(dx, dy);
      const voulu = new Set();
      if (r > 12) {
        const a = Math.atan2(dy, dx);
        const s = Math.sin(a);
        const c = Math.cos(a);
        if (c > 0.38) voulu.add(DIR.droite);
        if (c < -0.38) voulu.add(DIR.gauche);
        if (s > 0.38) voulu.add(DIR.bas);
        if (s < -0.38) voulu.add(DIR.haut);
      }
      for (const code of Object.values(DIR)) (voulu.has(code) ? appuyer : lacher)(code);
      // tout au bord : on court
      (r > 50 ? appuyer : lacher)('ShiftLeft', 'Shift');
      const k = Math.min(1, 40 / Math.max(r, 1));
      bouton.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
    };
    const trouver = (liste) => { for (const t of liste) if (t.identifier === doigt) return t; return null; };
    const opt = { passive: false };
    zone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (doigt !== null) return;
      const t = e.changedTouches[0];
      doigt = t.identifier;
      cx = t.clientX;
      cy = t.clientY;
      stick.style.left = `${cx}px`;
      stick.style.top = `${cy}px`;
      stick.style.display = 'block';
      diriger(0, 0);
    }, opt);
    zone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const t = trouver(e.changedTouches);
      if (t) diriger(t.clientX - cx, t.clientY - cy);
    }, opt);
    const finir = (e) => {
      if (!trouver(e.changedTouches)) return;
      e.preventDefault();
      doigt = null;
      stick.style.display = 'none';
      diriger(0, 0);
    };
    zone.addEventListener('touchend', finir, opt);
    zone.addEventListener('touchcancel', finir, opt);

    // ---- les boutons ----
    const boutons = document.createElement('div');
    boutons.id = 'tl-boutons';
    const haut = document.createElement('div');
    haut.id = 'tl-haut';
    /** [texte, code, key, x, y, taille, tenir] — x, y : coin haut-gauche dans le bloc de 210 px */
    const ROND = [
      ['Épée', 'KeyJ', 'j', 120, 120, 84, true],
      ['Parler', 'Space', ' ', 128, 22, 70, false],
      ['Roulade', 'KeyK', 'k', 26, 132, 70, false],
      ['Potion', 'KeyC', 'c', 40, 46, 58, false],
    ];
    const PETIT = [['Quêtes', 'KeyB', 'b'], ['Carte', 'KeyN', 'n'], ['Aide', 'KeyH', 'h']];
    const brancher = (el, code, key, tenir) => {
      el.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        el.classList.add('tenu');
        if (tenir) appuyer(code, key); else taper(code, key);
      }, opt);
      const relacher = (e) => { e.preventDefault(); el.classList.remove('tenu'); if (tenir) lacher(code, key); };
      el.addEventListener('touchend', relacher, opt);
      el.addEventListener('touchcancel', relacher, opt);
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    };
    for (const [texte, code, key, x, y, t, tenir] of ROND) {
      const b = document.createElement('div');
      b.className = 'tl-b';
      b.textContent = texte;
      Object.assign(b.style, { left: `${x}px`, top: `${y}px`, width: `${t}px`, height: `${t}px` });
      brancher(b, code, key, tenir);
      boutons.appendChild(b);
    }
    for (const [texte, code, key] of PETIT) {
      const b = document.createElement('div');
      b.className = 'tl-b';
      b.textContent = texte;
      brancher(b, code, key, false);
      haut.appendChild(b);
    }
    document.body.append(zone, stick, boutons, haut);
    // l'appli passe en arrière-plan : on lâche tout
    addEventListener('blur', () => { for (const c of [...tenues]) lacher(c); doigt = null; stick.style.display = 'none'; });
  }

  if (document.body) demarrer(); else addEventListener('DOMContentLoaded', demarrer);
})();
