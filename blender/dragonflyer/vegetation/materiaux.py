# The Dragon Apprentice Chronicles : les matières des arbres (étape 1 de la méthode, dragonflyer/CONCEPTION.md § 7 bis).
# Trois textures, peintes ici par le code (numpy), jamais téléchargées :
# - « ecorce »   (512 × 512, se répète dans les deux sens) : fibres verticales, plaques et fentes, brun chaud ;
# - « pin »      (1024 × 1024) : en haut deux brins de sapin détourés (cartes), en bas des aiguilles serrées, opaques,
#                qui habillent les cônes (se répète en largeur) ;
# - « feuilles » (1024 × 1024) : en haut deux bouquets de feuilles détourés (cartes), en bas un feuillage serré, opaque,
#                qui habille le cœur des touffes (se répète en largeur).
# Les tableaux sont rangés comme les images de Blender : la ligne 0 est en BAS de l'image (v = 0).
# Régions (coordonnées de texture de Blender) : cartes u ∈ [0, .5] ou [.5, 1], v ∈ [.5, 1] (pied de la carte en v = .5) ;
# fond opaque u quelconque (se répète), v ∈ [.02, .48].
import math, os
import numpy as np

def srgb(h):
    h = h.lstrip("#"); return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)], np.float32)

def lin(h):
    """Couleur « #rrggbb » (sRGB) → linéaire (couleurs de sommets de Blender et du glTF)."""
    c = srgb(h); return tuple(float(x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4) for x in c)

# ------------------------------------------------------------------ palette (sRGB, chaude, façon Wind Waker / Oceanhorn)
FEUILLES = {"sombre": "#3f6b2a", "moyen": "#5f9234", "clair": "#8fbf45", "lumiere": "#c3dd62", "fond": "#55852f"}
AIGUILLES = {"sombre": "#2c5e3e", "moyen": "#3f7f4c", "clair": "#5fa25a", "lumiere": "#94cc6c", "fond": "#36704a"}
ECORCE = {"sombre": "#4a3222", "moyen": "#755036", "clair": "#9a7050", "lumiere": "#b48a62"}
# teintes de l'écorce par espèce (couleurs de sommets, multipliées par la texture)
TEINTE_ECORCE = {"sapin": lin("#e0b4a0"), "feuillu": lin("#f2e6d8")}

# ------------------------------------------------------------------ bruit qui se répète
def bruit(w, h, gx, gy, R):
    """Bruit de valeur lisse, raccord à gauche/droite et en haut/en bas (grille gx × gy)."""
    g = R.random((gy, gx)).astype(np.float32)
    x = np.arange(w) / w * gx; y = np.arange(h) / h * gy
    x0 = np.floor(x).astype(int); y0 = np.floor(y).astype(int); fx = x - x0; fy = y - y0
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy)
    x1 = (x0 + 1) % gx; y1 = (y0 + 1) % gy; x0 %= gx; y0 %= gy
    a = g[y0][:, x0]; b = g[y0][:, x1]; c = g[y1][:, x0]; d = g[y1][:, x1]
    fx = fx[None, :]; fy = fy[:, None]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy

def fbm(w, h, gx, gy, R, oct=4):
    s = np.zeros((h, w), np.float32); amp = 1; tot = 0
    for o in range(oct):
        s += amp * bruit(w, h, gx * 2 ** o, gy * 2 ** o, R); tot += amp; amp *= .5
    return s / tot

class Toile:
    """Une image RGBA en flottants (sRGB), ligne 0 en bas. wrap : les dessins qui dépassent à gauche/droite reviennent de l'autre côté."""
    def __init__(s, w, h, fond=None, alpha=0.0):
        s.w, s.h = w, h
        s.rgb = np.zeros((h, w, 3), np.float32) + (srgb(fond) if fond else 0)
        s.a = np.full((h, w), alpha, np.float32)
    def _boite(s, x0, y0, x1, y1):
        return max(0, int(math.floor(x0))), max(0, int(math.floor(y0))), min(s.w, int(math.ceil(x1)) + 1), min(s.h, int(math.ceil(y1)) + 1)
    def _poser(s, x0, y0, x1, y1, f, wrap, zone=None):
        """f(X, Y) → (couverture, couleur rgb) sur une boîte ; wrap : recopie décalée de ±w."""
        decal = (0, -s.w, s.w) if wrap else (0,)
        for dx in decal:
            a, b, c, d = s._boite(x0 + dx, y0, x1 + dx, y1)
            if zone: a, b, c, d = max(a, zone[0]), max(b, zone[1]), min(c, zone[2]), min(d, zone[3])
            if c <= a or d <= b: continue
            X, Y = np.meshgrid(np.arange(a, c) + .5 - dx, np.arange(b, d) + .5)
            cov, col = f(X, Y)
            if cov is None: continue
            cov = np.clip(cov, 0, 1)[..., None]
            s.rgb[b:d, a:c] = s.rgb[b:d, a:c] * (1 - cov) + col * cov
            s.a[b:d, a:c] = np.maximum(s.a[b:d, a:c], cov[..., 0])

    def feuille(s, cx, cy, long, larg, ang, base, clair, sombre, nervure=True, wrap=False, zone=None, bord=.82):
        """Une feuille en amande, du pétiole (cx, cy) vers la pointe dans la direction ang ; plus claire vers la pointe,
        nervure claire, bord un peu plus sombre (dessin net, façon peinture)."""
        ca, sa = math.cos(ang), math.sin(ang); R = long + larg
        def f(X, Y):
            dx, dy = X - cx, Y - cy; u = (dx * ca + dy * sa) / long; v = (-dx * sa + dy * ca) / (larg / 2)
            uu = np.clip(u, 0, 1); prof = (4 * uu * (1 - uu)) ** .62 * (1.08 - .25 * uu)
            cov = np.clip((prof - np.abs(v)) * larg / 2 * .9, 0, 1) * (u > 0) * (u < 1)
            if not cov.any(): return None, None
            t = np.clip(.25 + .6 * uu - .18 * v, 0, 1)[..., None]
            col = sombre * (1 - t) + clair * t
            if nervure:
                nv = np.clip(1 - np.abs(v) / .1, 0, 1) * (uu > .06) * (uu < .85)
                col = col + (clair * 1.12 - col) * (nv[..., None] * .55)
            e = np.clip((np.abs(v) / np.maximum(prof, 1e-3) - bord) / (1 - bord), 0, 1)[..., None]
            col = col * (1 - .22 * e)
            return cov, col
        s._poser(cx - R, cy - R, cx + R, cy + R, f, wrap, zone)

    def trait(s, x0, y0, x1, y1, ep, c0, c1, wrap=False, zone=None, pointe=True):
        """Un trait (aiguille, brindille) de (x0, y0) à (x1, y1), qui s'affine vers le bout ; couleur c0 → c1."""
        dx, dy = x1 - x0, y1 - y0; L2 = dx * dx + dy * dy + 1e-6
        def f(X, Y):
            t = np.clip(((X - x0) * dx + (Y - y0) * dy) / L2, 0, 1)
            d = np.hypot(X - x0 - t * dx, Y - y0 - t * dy)
            e = ep * ((1 - .75 * t) if pointe else 1)
            cov = np.clip(e / 2 - d + .5, 0, 1)
            if not cov.any(): return None, None
            return cov, c0 * (1 - t[..., None]) + c1 * t[..., None]
        m = ep + 1
        s._poser(min(x0, x1) - m, min(y0, y1) - m, max(x0, x1) + m, max(y0, y1) + m, f, wrap, zone)

    def remplir_transparent(s, couleur):
        """Couleur des pixels transparents = couleur moyenne des feuilles (pas de liseré sombre en s'éloignant)."""
        k = (1 - s.a)[..., None]; s.rgb = s.rgb * (1 - k) + srgb(couleur) * k

    def enregistrer(s, chemin):
        import bpy
        img = bpy.data.images.new(os.path.basename(chemin), s.w, s.h, alpha=True)
        px = np.concatenate([np.clip(s.rgb, 0, 1), s.a[..., None]], 2).astype(np.float32)
        img.pixels.foreach_set(px.ravel()); img.filepath_raw = chemin
        img.file_format = "WEBP" if chemin.endswith(".webp") else "PNG"; img.save()
        return img

def _c(pal, nom, R=None, k=.0):
    c = srgb(pal[nom]); return c if R is None else np.clip(c * (1 + R.uniform(-k, k)), 0, 1)

# ------------------------------------------------------------------ écorce
def peindre_ecorce(R, taille=512):
    T = Toile(taille, taille, ECORCE["moyen"], 1.0); w = h = taille
    fibres = fbm(w, h, 48, 3, R, 3)                       # fibres verticales : beaucoup de variation en largeur, peu en hauteur
    plaques = fbm(w, h, 6, 4, R, 3)
    t = np.clip(.5 + (fibres - .5) * 1.6 + (plaques - .5) * .6, 0, 1)[..., None]
    T.rgb = srgb(ECORCE["sombre"]) * (1 - t) + srgb(ECORCE["clair"]) * t
    # fentes : lignes sombres qui ondulent vers le haut, avec un liseré clair à gauche (relief peint)
    ys = np.arange(h); ond = fbm(w, h, 2, 6, R, 2)
    for k in range(13):
        x0 = (k + R.uniform(-.3, .3)) * w / 13; amp = R.uniform(4, 9); ph = R.uniform(0, 6.28); ep = R.uniform(2.2, 4.5)
        xs = x0 + amp * np.sin(ys / h * 2 * math.pi * R.choice((1, 2)) + ph) + (ond[:, int(x0) % w] - .5) * 18
        larg = ep * np.clip(.35 + 1.3 * fbm(1, h, 1, 7, R, 2)[:, 0], 0, 1.4)   # par endroits la fente se referme (plaques)
        X = np.arange(w)[None, :]
        for dx in (0, -w, w):
            d = X - (xs[:, None] + dx)
            fente = np.clip(larg[:, None] / 2 - np.abs(d) + .5, 0, 1)
            lis = np.clip(1 - np.abs(d + larg[:, None] / 2 + 2.2) / 2, 0, 1) * (larg[:, None] > .8)
            T.rgb = T.rgb * (1 - fente[..., None] * .7) + srgb("#2e1e14") * fente[..., None] * .7
            T.rgb = T.rgb + (srgb(ECORCE["lumiere"]) - T.rgb) * lis[..., None] * .35
    # coupures horizontales courtes entre les plaques
    for k in range(40):
        x = R.uniform(0, w); y = R.uniform(0, h); L = R.uniform(8, 22)
        T.trait(x, y, x + L, y + R.uniform(-2, 2), R.uniform(1.5, 2.5), srgb("#3a281a"), srgb("#3a281a"), wrap=True, pointe=False)
    T.a[:] = 1
    return T

# ------------------------------------------------------------------ aiguilles du sapin
def _brin(T, R, x0, x1, y0, y1):
    """Un brin de sapin détouré dans la case [x0, x1] × [y0, y1] : tige du bas vers le haut, aiguilles des deux côtés,
    forme de plume large au milieu et pointue au bout ; quelques rameaux secondaires (le brin a du volume)."""
    W, H = x1 - x0, y1 - y0; cx = (x0 + x1) / 2; zone = (x0 + 2, y0, x1 - 2, y1 - 2)
    sombre, moyen, clair, lum = (_c(AIGUILLES, k) for k in ("sombre", "moyen", "clair", "lumiere"))
    def axe(t):   # la tige se courbe un peu
        return cx + W * .06 * math.sin(t * 2.4), y0 + H * (.02 + .94 * t)
    def env(t):   # demi-largeur du brin selon la hauteur
        return W * .47 * (math.sin(math.pi * min(1, t * 1.05) ** .8) ** .9) * (1 - .35 * t) + W * .05 * (1 - t)
    # trois couches : aiguilles sombres derrière, moyennes, claires devant
    for couche, (ca, cb, n, ep) in enumerate(((sombre, moyen, 170, 12), (sombre * 1.08, clair * .95, 200, 10.5), (moyen, clair, 110, 9))):
        for i in range(n):
            t = R.uniform(.0, .97); ax, ay = axe(t); cote = R.choice((-1, 1))
            L = env(t) * R.uniform(.6, .98) * (.9 if couche == 0 else 1)   # les aiguilles sombres restent dans la silhouette (pas de poils qui dépassent)
            a = math.radians(R.uniform(28, 62)); a = math.pi / 2 - a if cote > 0 else math.pi / 2 + a
            T.trait(ax, ay, ax + math.cos(a) * L, ay + math.sin(a) * L, ep * R.uniform(.8, 1.2) * W / 512,
                    ca * R.uniform(.92, 1.05), cb * R.uniform(.92, 1.08), zone=zone)
    # cœur du brin plein (pas de jour au milieu), puis la tige
    for i in range(110):
        t = R.uniform(0, .92); ax, ay = axe(t); L = env(t) * .7
        a = math.pi / 2 + R.uniform(-1.0, 1.0)
        T.trait(ax, ay, ax + math.cos(a) * L, ay + math.sin(a) * L, 16 * W / 512, moyen * .95, clair, zone=zone)
    for i in range(30):
        t0, t1 = i / 30 * .9, (i + 1) / 30 * .9; a0, a1 = axe(t0), axe(t1)
        T.trait(*a0, *a1, 7 * W / 512 * (1 - t0 * .6), srgb("#6b4a30"), srgb("#7a5838"), zone=zone, pointe=False)

def peindre_pin(R, taille=1024):
    T = Toile(taille, taille, AIGUILLES["fond"], 0.0); w = h = taille
    # fond opaque (bas de l'image) : rangs d'aiguilles en éventail, comme des tuiles, pointes vers le bas (vers le bord du cône)
    zb = (0, 0, w, h // 2)
    t = fbm(w, h // 2, 8, 4, R, 3)[..., None]
    T.rgb[:h // 2] = srgb(AIGUILLES["sombre"]) * (1 - t) + srgb(AIGUILLES["moyen"]) * t; T.a[:h // 2] = 1
    pas_y = 40; rangs = int(h / 2 / pas_y) + 2
    for j in range(rangs, -1, -1):            # du haut (sommet du cône) vers le bas : les rangs du bas recouvrent ceux du haut
        y = j * pas_y + 12
        for i in range(int(w / 64)):
            x = (i + (j % 2) * .5) * 64 + R.uniform(-10, 10); yy = y + R.uniform(-6, 6)
            clair = .55 + .45 * R.random()
            for k in range(13):
                a = -math.pi / 2 + R.uniform(-.8, .8); L = R.uniform(34, 58)
                ca = _c(AIGUILLES, "sombre") * 1.05; cb = _c(AIGUILLES, "moyen") * (1 - clair) + _c(AIGUILLES, "clair") * clair
                if R.random() < .18: cb = _c(AIGUILLES, "lumiere") * .9
                T.trait(x, yy, x + math.cos(a) * L, yy + math.sin(a) * L, R.uniform(6, 8.5), ca, cb, wrap=True, zone=zb)
    T.a[:h // 2] = 1
    # cartes : deux brins en haut de l'image
    _brin(T, R, 0, w // 2, h // 2 + 4, h); _brin(T, R, w // 2, w, h // 2 + 4, h)
    m = T.a[h // 2:].copy(); T.remplir_transparent(AIGUILLES["moyen"]); T.a[h // 2:] = m
    return T

# ------------------------------------------------------------------ feuilles du feuillu
def _bouquet(T, R, x0, x1, y0, y1, allonge=1.0):
    """Un bouquet de feuilles détouré : feuilles en rosette autour d'un centre un peu bas, les sombres derrière,
    les claires devant, bord découpé (chaque feuille dépasse) ; centre bien plein."""
    W, H = x1 - x0, y1 - y0; cx, cy = (x0 + x1) / 2, y0 + H * .46; zone = (x0 + 2, y0 + 2, x1 - 2, y1 - 2)
    pal = {k: _c(FEUILLES, k) for k in FEUILLES}
    couches = ((.36, 34, pal["sombre"], pal["moyen"], 1.05), (.30, 38, pal["moyen"], pal["clair"], .95), (.22, 26, pal["clair"], pal["lumiere"], .75))
    for i in range(24):   # le centre, bien plein
        a = R.uniform(0, 2 * math.pi); r = W * .1 * R.random(); L = W * R.uniform(.17, .22)
        T.feuille(cx + math.cos(a) * r - math.cos(a) * L * .45, cy + math.sin(a) * r - math.sin(a) * L * .45, L, L * .6, a, None, pal["moyen"], pal["sombre"], zone=zone)
    for rmax, n, cs, cc, k in couches:
        for i in range(n):
            a = R.uniform(0, 2 * math.pi); r = W * rmax * math.sqrt(R.uniform(.05, 1))
            px, py = cx + math.cos(a) * r, cy + math.sin(a) * r * allonge
            ang = a + R.uniform(-.5, .5)
            L = W * R.uniform(.15, .21) * k; l = L * R.uniform(.5, .62)
            v = R.uniform(.9, 1.08)
            T.feuille(px - math.cos(ang) * L * .3, py - math.sin(ang) * L * .3, L, l, ang, None, cc * v, cs * v, zone=zone)
    for i in range(14):   # quelques feuilles qui se détachent au bord (silhouette découpée)
        a = R.uniform(0, 2 * math.pi); r = W * .36
        px, py = cx + math.cos(a) * r, cy + math.sin(a) * r * allonge; L = W * .15
        T.feuille(px, py, L, L * .55, a + R.uniform(-.3, .3), None, pal["clair"], pal["moyen"], zone=zone)

def peindre_feuilles(R, taille=1024):
    T = Toile(taille, taille, FEUILLES["fond"], 0.0); w = h = taille
    zb = (0, 0, w, h // 2)
    t = fbm(w, h // 2, 6, 3, R, 3)[..., None]
    T.rgb[:h // 2] = srgb(FEUILLES["sombre"]) * (1 - t) * .4 + srgb(FEUILLES["moyen"]) * (.6 + .4 * t); T.a[:h // 2] = 1
    pal = {k: _c(FEUILLES, k) for k in FEUILLES}
    # fond opaque : feuilles serrées, contraste doux (le cœur des touffes, surtout vu entre les bouquets)
    for passe, (cs, cc, n) in enumerate(((pal["sombre"] * 1.15, pal["moyen"], 420), (pal["moyen"], pal["clair"] * .92, 380), (pal["moyen"], pal["clair"], 60))):
        for i in range(n):
            x = R.uniform(0, w); y = R.uniform(8, h / 2 - 8); L = R.uniform(34, 52); ang = R.uniform(-math.pi, math.pi)
            v = R.uniform(.92, 1.06)
            T.feuille(x, y, L, L * .55, ang, None, cc * v, cs * v, wrap=True, zone=zb)
    T.a[:h // 2] = 1
    _bouquet(T, R, 0, w // 2, h // 2 + 4, h); _bouquet(T, R, w // 2, w, h // 2 + 4, h, allonge=.9)
    m = T.a[h // 2:].copy(); T.remplir_transparent(FEUILLES["moyen"]); T.a[h // 2:] = m
    return T

# régions des cartes (u0, u1, v0, v1) dans les textures « pin » et « feuilles »
CARTES = [(0.004, .496, .504, .996), (.504, .996, .504, .996)]
FOND_V = (.02, .48)

def peindre_tout(dossier, graine=7):
    """Peint les trois textures dans `dossier` (PNG) ; renvoie {nom: chemin}."""
    os.makedirs(dossier, exist_ok=True); R = np.random.default_rng(graine)
    class _R:   # petit adaptateur : random.Random-like au-dessus de numpy
        def __init__(s, g): s.g = g
        def random(s, shape=None): return s.g.random(shape) if shape else float(s.g.random())
        def uniform(s, a, b): return float(s.g.uniform(a, b))
        def choice(s, l): return l[int(s.g.integers(len(l)))]
    r = _R(R); res = {}
    for nom, f in (("ecorce", peindre_ecorce), ("pin", peindre_pin), ("feuilles", peindre_feuilles)):
        c = os.path.join(dossier, f"arbres_{nom}.png"); f(r).enregistrer(c); res[nom] = c; print("texture", c)
    return res

# ------------------------------------------------------------------ matières de rendu (aperçus Blender, proches du jeu)
# Lumière des aperçus, la même que le décor (apercu.decor) : soleil chaud du milieu de matinée, ciel bleu clair.
SOLEIL_EULER = (.9, .2, -.75); SOLEIL_FORCE = 3.6; SOLEIL_COUL = (1, .95, .85); CIEL = (.55, .7, .9); CIEL_FORCE = 1.15

def _soleil_vers():
    from mathutils import Euler, Vector
    return -(Euler(SOLEIL_EULER).to_matrix() @ Vector((0, 0, -1)))

def lumiere_haut():
    """Ce que l'éclairage du jeu donne à une face tournée vers le haut (normales des imposteurs)."""
    L = _soleil_vers(); return tuple(SOLEIL_FORCE / math.pi * c * max(0, L.z) + CIEL_FORCE * k for c, k in zip(SOLEIL_COUL, CIEL))

def eclairage_jeu(nt, albedo, normale, traverse=0.0, diviser=None):
    """Éclairage façon jeu, calculé dans la matière (émission) : soleil × normale choisie, ciel selon que la normale
    regarde en haut, un peu de sol, et (feuillage) la lumière qui traverse quand le soleil est derrière.
    Comme dans le jeu : la normale vaut des deux côtés d'une carte, et l'arbre ne reçoit pas d'ombre (il en fait au sol)."""
    N, L = nt.nodes, nt.links
    def vec(v):
        c = N.new("ShaderNodeCombineXYZ"); c.inputs[0].default_value, c.inputs[1].default_value, c.inputs[2].default_value = v; return c.outputs[0]
    def vm(op, a, b=None, sc=None):
        n = N.new("ShaderNodeVectorMath"); n.operation = op; L.new(a, n.inputs[0])
        if b is not None: L.new(b, n.inputs[1])
        if sc is not None:
            if isinstance(sc, float): n.inputs["Scale"].default_value = sc
            else: L.new(sc, n.inputs["Scale"])
        return n.outputs["Value" if op == "DOT_PRODUCT" else "Vector"]
    def m(op, a, b=0.0, c=None):
        n = N.new("ShaderNodeMath"); n.operation = op; L.new(a, n.inputs[0]); n.inputs[1].default_value = b
        if c is not None: n.inputs[2].default_value = c
        return n.outputs[0]
    ndl = vm("DOT_PRODUCT", normale, vec(tuple(_soleil_vers())))
    soleil = vec(tuple(x * SOLEIL_FORCE / math.pi for x in SOLEIL_COUL))
    ciel = vec(tuple(x * CIEL_FORCE for x in CIEL)); sol = vec((.10, .11, .08))
    nz = N.new("ShaderNodeSeparateXYZ"); L.new(normale, nz.inputs[0]); nz = nz.outputs[2]
    tot = vm("ADD", vm("SCALE", soleil, sc=m("MAXIMUM", ndl, 0.0)), vm("SCALE", ciel, sc=m("MULTIPLY_ADD", nz, .5, .5)))
    tot = vm("ADD", tot, vm("SCALE", sol, sc=m("MULTIPLY_ADD", nz, -.5, .5)))
    if traverse: tot = vm("ADD", tot, vm("SCALE", soleil, sc=m("MULTIPLY", m("MAXIMUM", m("MULTIPLY", ndl, -1.0), 0.0), traverse)))
    if diviser: tot = vm("DIVIDE", tot, vec(diviser))
    em = N.new("ShaderNodeEmission"); L.new(vm("MULTIPLY", tot, albedo), em.inputs["Color"]); return em.outputs[0]

def normale_choisie(nt):
    """La normale choisie (attribut « Nf », en repère du monde), la même des deux côtés de la face."""
    N, L = nt.nodes, nt.links
    at = N.new("ShaderNodeAttribute"); at.attribute_name = "Nf"
    vt = N.new("ShaderNodeVectorTransform"); vt.vector_type = "NORMAL"; vt.convert_from = "OBJECT"; vt.convert_to = "WORLD"
    L.new(at.outputs["Vector"], vt.inputs[0]); return vt.outputs[0]

def detourage(nt, alpha, surface):
    """Seuil 0,5 comme le jeu (alphaTest) : en dessous, transparent."""
    N, L = nt.nodes, nt.links
    se = N.new("ShaderNodeMath"); se.operation = "GREATER_THAN"; se.inputs[1].default_value = .5; L.new(alpha, se.inputs[0])
    tp = N.new("ShaderNodeBsdfTransparent"); mx = N.new("ShaderNodeMixShader")
    L.new(se.outputs[0], mx.inputs[0]); L.new(tp.outputs[0], mx.inputs[1]); L.new(surface, mx.inputs[2]); return mx.outputs[0]

def tranche(nt, alpha, uv=None, bas=.1, haut=.25):
    """Une carte vue presque par la tranche s'efface (sinon un trait fin, « poil » ou « tige ») ; seulement la région des
    cartes de la texture (v > 0,5), jamais les cœurs ni les cônes. Même règle à mettre dans le jeu."""
    N, L = nt.nodes, nt.links
    g = N.new("ShaderNodeNewGeometry"); dp = N.new("ShaderNodeVectorMath"); dp.operation = "DOT_PRODUCT"
    L.new(g.outputs["True Normal"], dp.inputs[0]); L.new(g.outputs["Incoming"], dp.inputs[1])
    ab = N.new("ShaderNodeMath"); ab.operation = "ABSOLUTE"; L.new(dp.outputs["Value"], ab.inputs[0])
    mr = N.new("ShaderNodeMapRange"); mr.inputs["From Min"].default_value = bas; mr.inputs["From Max"].default_value = haut; mr.interpolation_type = "SMOOTHSTEP"
    L.new(ab.outputs[0], mr.inputs["Value"]); f = mr.outputs["Result"]
    if uv is not None:   # hors des cartes : 1
        sp = N.new("ShaderNodeSeparateXYZ"); L.new(uv, sp.inputs[0])
        lt = N.new("ShaderNodeMath"); lt.operation = "LESS_THAN"; L.new(sp.outputs[1], lt.inputs[0]); lt.inputs[1].default_value = .5
        mx = N.new("ShaderNodeMath"); mx.operation = "MAXIMUM"; L.new(f, mx.inputs[0]); L.new(lt.outputs[0], mx.inputs[1]); f = mx.outputs[0]
    al = N.new("ShaderNodeMath"); al.operation = "MULTIPLY"; L.new(alpha, al.inputs[0]); L.new(f, al.inputs[1]); return al.outputs[0]

def materiaux_rendu(textures, plat=False):
    """Écorce et feuillage : texture × couleur des sommets, éclairage façon jeu ; feuillage détouré à 0,5 et traversé de lumière.
    plat : pour l'image de l'imposteur, l'éclairage du jeu divisé par celui d'un plan tourné vers le haut (le jeu le multiplie
    ensuite par sa propre lumière : de jour on retrouve l'arbre de près, la nuit l'imposteur s'assombrit avec le reste)."""
    import bpy
    def img(n):
        im = bpy.data.images.load(textures[n], check_existing=True); im.alpha_mode = "STRAIGHT"; return im
    def base(nom, image, feuilles):
        m = bpy.data.materials.new(nom + ("_plat" if plat else "")); m.use_nodes = True; nt = m.node_tree; N = nt.nodes; L = nt.links
        N.remove(N["Principled BSDF"]); out = N["Material Output"]
        ti = N.new("ShaderNodeTexImage"); ti.image = image; ti.interpolation = "Linear"
        tc = N.new("ShaderNodeUVMap"); tc.uv_map = "UVMap"; L.new(tc.outputs["UV"], ti.inputs["Vector"])
        alpha = tranche(nt, ti.outputs["Alpha"], tc.outputs["UV"]) if (feuilles and not plat) else ti.outputs["Alpha"]
        vc = N.new("ShaderNodeVertexColor"); vc.layer_name = "Col"
        mu = N.new("ShaderNodeMix"); mu.data_type = "RGBA"; mu.blend_type = "MULTIPLY"; mu.inputs["Factor"].default_value = 1
        L.new(ti.outputs["Color"], mu.inputs[6]); L.new(vc.outputs["Color"], mu.inputs[7])
        if feuilles:   # teinte de chaque arbre (couleur de l'objet), comme la couleur d'instance du jeu sur le feuillage
            oi = N.new("ShaderNodeObjectInfo"); m2 = N.new("ShaderNodeMix"); m2.data_type = "RGBA"; m2.blend_type = "MULTIPLY"; m2.inputs["Factor"].default_value = 1
            L.new(mu.outputs[2], m2.inputs[6]); L.new(oi.outputs["Color"], m2.inputs[7]); mu = m2
        if plat:   # image de l'imposteur : la lumière du jeu divisée par celle d'un plan tourné vers le haut
            nrm = normale_choisie(nt) if feuilles else N.new("ShaderNodeNewGeometry").outputs["Normal"]
            em = eclairage_jeu(nt, mu.outputs[2], nrm, .35 if feuilles else 0, diviser=lumiere_haut())
            L.new(detourage(nt, alpha, em) if feuilles else em, out.inputs["Surface"])
        elif feuilles:
            L.new(detourage(nt, alpha, eclairage_jeu(nt, mu.outputs[2], normale_choisie(nt), .35)), out.inputs["Surface"])
        else:
            g = N.new("ShaderNodeNewGeometry")
            L.new(eclairage_jeu(nt, mu.outputs[2], g.outputs["Normal"]), out.inputs["Surface"])
        return m
    return {"Ecorce": base("Ecorce", img("ecorce"), False), "Aiguilles": base("Aiguilles", img("pin"), True), "Feuilles": base("Feuilles", img("feuilles"), True)}

if __name__ == "__main__":   # blender -b -P materiaux.py -- <dossier> : peint les textures seules
    import sys
    peindre_tout(sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "/tmp/vegetation_tex")

def teinte_arbre(R):
    """Teinte d'un arbre de la forêt (règle proposée au jeu pour la couleur d'instance) : luminosité ±8 %,
    un arbre sur quatre environ tire vers le jaune (jusqu'à 5° de teinte)."""
    lum = R.uniform(.92, 1.08); j = R.random() ** 3
    return (lum * (1 + .05 * j), lum, lum * (1 - .2 * j))
