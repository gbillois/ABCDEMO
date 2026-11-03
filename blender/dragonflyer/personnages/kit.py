# Kit des personnages de DragonFlyer (étape 2 de la méthode, CONCEPTION.md § 7 bis) : pièces réutilisables faites par
# le code (tête et visage, cheveux, mains, tronc, membres, vêtements), chacune avec ses couleurs (materiaux.py) et ses
# poids de peau calculés pièce par pièce, jamais « automatiques » :
#  - membres en « articulations à rotule » : chaque segment finit par une demi-sphère centrée sur le pivot de l'os, de
#    même rayon que le segment voisin ; un segment suit un seul os (rigide), donc aucune torsion en papier de bonbon,
#    aucun étirement, et la jointure reste fermée quelle que soit la pose ;
#  - tronc, gilet, ceinture, cou : partage doux Hips → Spine → Chest → Head selon la hauteur (fondus courts) ;
#  - jupe de la tunique : suit les hanches en haut, un peu les cuisses vers l'ourlet (devant surtout).
# Repère : Blender, z en haut, le personnage regarde vers -y, les pieds en z = 0, sa gauche en +x.
import math
import numpy as np
import materiaux as MAT

A = np.array
EZ = A([0., 0., 1.])

def nrm(v):
    v = np.asarray(v, float); n = np.linalg.norm(v); return v / n if n > 1e-12 else v

def lisse(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)

# ---------------------------------------------------------------- maillage + couleurs + poids
class Maillage:
    def __init__(s): s.V, s.F, s.C, s.W, s.N = [], [], [], [], {}
    def ajouter(s, V, F, C, W, nom=None):
        o = len(s.V); V = [A(v, float) for v in V]
        if isinstance(W, (str, dict)): W = [W] * len(V)
        W = [{w: 1.0} if isinstance(w, str) else dict(w) for w in W]
        C = [A(c, float) for c in (C if len(np.shape(C)) == 2 else [C] * len(V))]
        s.V += V; s.C += C; s.W += W; s.F += [[i + o for i in f] for f in F]
        if nom: s.N[nom] = s.N.get(nom, 0) + len(F)
        return o
    def triangles(s): return sum(len(f) - 2 for f in s.F)

# ---------------------------------------------------------------- surfaces de base
def repere(t, ref):
    """Deux axes perpendiculaires à t ; le premier suit « ref » (projeté)."""
    t = nrm(t); r = A(ref, float) - t * (A(ref, float) @ t)
    if np.linalg.norm(r) < 1e-6: r = np.cross(t, A([1., 0, 0]) if abs(t[0]) < .9 else A([0, 1., 0]))
    e1 = nrm(r); return e1, np.cross(t, e1)

def tube(chemin, rayons, nr=12, ref=(0, 0, 1), aplat=1.0, expo=2.0, refs=None):
    """Tube le long d'un chemin ; rayon 0 en bout = pôle (bout fermé). aplat : épaisseur / largeur (section en lentille
    ou ellipse), expo : 2 = ellipse, plus grand = plus carré. Renvoie (V, F, t) avec t ∈ [0, 1] le long du chemin."""
    P = [A(p, float) for p in chemin]; n = len(P); V, F, T, rings = [], [], [], []
    L = np.concatenate([[0], np.cumsum([np.linalg.norm(P[i + 1] - P[i]) for i in range(n - 1)])]); L = L / max(L[-1], 1e-9)
    for j, p in enumerate(P):
        t = P[min(j + 1, n - 1)] - P[max(j - 1, 0)]
        e1, e2 = repere(t, refs[j] if refs is not None else ref)
        r = rayons[j]; ap = aplat[j] if hasattr(aplat, "__len__") else aplat
        if r <= 1e-7:
            rings.append([len(V)]); V.append(p); T.append(L[j]); continue
        ring = []
        for k in range(nr):
            a = 2 * math.pi * k / nr; c, s_ = math.cos(a), math.sin(a)
            c = math.copysign(abs(c) ** (2 / expo), c); s_ = math.copysign(abs(s_) ** (2 / expo), s_)
            ring.append(len(V)); V.append(p + e1 * r * c + e2 * r * ap * s_); T.append(L[j])
        rings.append(ring)
    for j in range(n - 1):
        a, b = rings[j], rings[j + 1]
        if len(a) == 1 and len(b) == 1: continue
        if len(a) == 1: F += [[a[0], b[k], b[(k + 1) % nr]] for k in range(nr)]
        elif len(b) == 1: F += [[a[k], b[0], a[(k + 1) % nr]] for k in range(nr)]
        else: F += [[a[k], b[k], b[(k + 1) % nr], a[(k + 1) % nr]] for k in range(nr)]
    return V, F, A(T)

def capsule(a, b, ra, rb, nr=14, nl=4, ncap=4, ref=(0, 0, 1), aplat=1.0):
    """Segment de membre : demi-sphère centrée en a (rayon ra), corps conique, demi-sphère centrée en b (rayon rb)."""
    a, b = A(a, float), A(b, float); d = nrm(b - a); P, R = [], []
    for k in range(ncap + 1):
        ph = math.pi / 2 * (1 - k / ncap); P.append(a - d * ra * math.sin(ph)); R.append(ra * math.cos(ph))
    for k in range(1, nl):
        u = k / nl; P.append(a + (b - a) * u); R.append(ra + (rb - ra) * u)
    for k in range(ncap + 1):
        ph = math.pi / 2 * k / ncap; P.append(b + d * rb * math.sin(ph)); R.append(rb * math.cos(ph))
    return tube(P, R, nr, ref, aplat)

def superquadrique(c, axes, nu=16, nv=10, e=1.0):
    """Ellipsoïde arrondi (e < 1 : plus carré). axes : trois vecteurs (demi-axes)."""
    c = A(c, float); ax, ay, az = (A(v, float) for v in axes); V, F = [], []
    f = lambda x, p: math.copysign(abs(x) ** p, x)
    V.append(c - az)
    for j in range(1, nv):
        th = math.pi * j / nv
        for i in range(nu):
            ph = 2 * math.pi * i / nu
            V.append(c + ax * f(math.sin(th), e) * f(math.cos(ph), e) + ay * f(math.sin(th), e) * f(math.sin(ph), e) - az * f(math.cos(th), e))
    V.append(c + az); top = len(V) - 1
    for i in range(nu): F.append([0, 1 + (i + 1) % nu, 1 + i])
    for j in range(nv - 2):
        for i in range(nu):
            a0, b0 = 1 + j * nu + i, 1 + j * nu + (i + 1) % nu; F.append([a0, b0, b0 + nu, a0 + nu])
    o = 1 + (nv - 2) * nu
    for i in range(nu): F.append([o + i, o + (i + 1) % nu, top])
    return V, F

def ellipsoide(c, rx, ry, rz, nu=14, nv=9, e=1.0, axes=None):
    ax = axes if axes is not None else (A([rx, 0, 0]), A([0, ry, 0]), A([0, 0, rz]))
    return superquadrique(c, ax, nu, nv, e)

def anneau(centre, rx, ry, epais, haut, nu=32, nv=8, bosses=0.0, graine=0, decal_y=0.0):
    """Anneau horizontal (ceinture, revers, col) : section ovale (épaisseur radiale × hauteur), bosses = fourrure."""
    rng = np.random.default_rng(graine); ph0 = rng.uniform(0, 6.3, 5); V, F, T = [], [], []
    for i in range(nu):
        a = 2 * math.pi * i / nu
        b = 1 + bosses * (.6 * math.sin(7 * a + ph0[0]) + .4 * math.sin(11 * a + ph0[1]) + .3 * math.sin(17 * a + ph0[2]))
        out = A([math.cos(a), math.sin(a), 0]); base = A(centre, float) + A([rx * math.cos(a), ry * math.sin(a) + decal_y, 0])
        for j in range(nv):
            v = 2 * math.pi * j / nv
            V.append(base + out * epais * b * math.cos(v) + EZ * haut * b * math.sin(v)); T.append(.5 + .5 * math.cos(v))
    for i in range(nu):
        for j in range(nv):
            a0, b0 = i * nv + j, i * nv + (j + 1) % nv; a1, b1 = ((i + 1) % nu) * nv + j, ((i + 1) % nu) * nv + (j + 1) % nv
            F.append([a0, a1, b1, b0])
    return V, F, A(T)

def coque(f, nu, nv, epais, ferme_u=False):
    """Coque épaisse (gilet, calotte) : f(u, v) -> (point, normale) sur [0,1]² ; extérieur, intérieur et bords."""
    V, F = [], []; cols = nu if ferme_u else nu + 1
    for s_, off in ((0, 0.0), (1, -epais)):
        for j in range(nv + 1):
            for i in range(cols):
                p, n = f(i / nu, j / nv); V.append(p + n * off)
    def idx(s_, i, j): return s_ * cols * (nv + 1) + j * cols + (i % cols)
    for j in range(nv):
        for i in range(nu if ferme_u else nu):
            if not ferme_u and i == nu: continue
            q = [idx(0, i, j), idx(0, i + 1, j), idx(0, i + 1, j + 1), idx(0, i, j + 1)]
            F.append(q); F.append([idx(1, k_i, k_j) for k_i, k_j in ((i, j + 1), (i + 1, j + 1), (i + 1, j), (i, j))])
    # bords : j = 0 et j = nv toujours, i = 0 et i = nu si ouvert
    for j in (0, nv):
        for i in range(nu):
            a0, b0 = idx(0, i, j), idx(0, i + 1, j); a1, b1 = idx(1, i, j), idx(1, i + 1, j)
            F.append([a0, a1, b1, b0] if j == 0 else [a0, b0, b1, a1])
    if not ferme_u:
        for i in (0, nu):
            for j in range(nv):
                a0, b0 = idx(0, i, j), idx(0, i, j + 1); a1, b1 = idx(1, i, j), idx(1, i, j + 1)
                F.append([a0, b0, b1, a1] if i == 0 else [a0, a1, b1, b0])
    return V, F

# ---------------------------------------------------------------- poids
def poids_chaine(z, bornes, os_, zone):
    """Partage doux le long d'une coordonnée : os_[i] entre bornes[i] et bornes[i+1], fondu de demi-largeur zone."""
    w = {}
    for i, o in enumerate(os_):
        lo = 1.0 if i == 0 else lisse(bornes[i] - zone, bornes[i] + zone, z)
        hi = 1.0 if i == len(os_) - 1 else 1 - lisse(bornes[i + 1] - zone, bornes[i + 1] + zone, z)
        v = lo * hi
        if v > 1e-3: w[o] = w.get(o, 0) + float(v)
    t = sum(w.values()); return {k: v / t for k, v in w.items()}

# Tronc : hanches jusqu'à 0,74, ventre jusqu'à 0,88, poitrine, puis la tête au-dessus du cou.
def poids_tronc(z):
    return poids_chaine(z, [0, .755, .885, 1.075], ["Hips", "Spine", "Chest", "Head"], .045)

# ---------------------------------------------------------------- tête
class Tete:
    """Tête ronde et douce : front haut, joues pleines, petit menton. surf(d) donne le point de la peau dans la
    direction d (repère de la tête) ; les traits du visage sont des « décalques » posés sur cette surface."""
    def __init__(s, centre, R):
        s.c, s.R = A(centre, float), R
    def r(s, d):
        d = nrm(d); x, y, z = d; R = s.R
        p = d * R * A([1.0, .95, .97])
        if y > 0: p[1] *= 1 + .05 * y                                     # arrière du crâne bien rond
        if z < 0:
            k = -z; p[0] *= 1 - .2 * k ** 2.2                             # mâchoire qui s'affine
            p[2] *= 1 - .06 * k                                           # bas du visage un peu plus court
            if y < 0: p[1] *= 1 - .1 * k ** 2 * (-y)                      # petit menton, pas de mâchoire carrée
        jo = math.exp(-((abs(x) - .52) / .2) ** 2 - ((y + .72) / .25) ** 2 - ((z + .32) / .2) ** 2)
        p += d * R * .045 * jo                                            # joues pleines
        return p
    def surf(s, d): return s.c + s.r(d)
    def normale(s, d):
        d = nrm(d); e1, e2 = repere(d, EZ if abs(d[2]) < .95 else A([1., 0, 0])); h = 1e-3
        a = s.r(d + e1 * h) - s.r(d - e1 * h); b = s.r(d + e2 * h) - s.r(d - e2 * h)
        n = nrm(np.cross(a, b)); return n if n @ d > 0 else -n
    def crane(s, M, n=14):
        """Peau de la tête : sphère « cube » (carreaux réguliers, pas de pôles serrés), rose des joues."""
        V, F = [], []; idx = {}
        def sommet(key, d):
            if key not in idx: idx[key] = len(V); V.append(s.surf(d))
            return idx[key]
        faces = [(A([1., 0, 0]), A([0, 1., 0]), A([0, 0, 1.])), (A([-1., 0, 0]), A([0, -1., 0]), A([0, 0, 1.])),
                 (A([0, 1., 0]), A([-1., 0, 0]), A([0, 0, 1.])), (A([0, -1., 0]), A([1., 0, 0]), A([0, 0, 1.])),
                 (A([0, 0, 1.]), A([0, 1., 0]), A([-1., 0, 0])), (A([0, 0, -1.]), A([0, 1., 0]), A([1., 0, 0]))]
        for fi, (c, u, v) in enumerate(faces):
            G = {}
            for j in range(n + 1):
                for i in range(n + 1):
                    a, b = math.tan((i / n * 2 - 1) * math.pi / 4), math.tan((j / n * 2 - 1) * math.pi / 4)
                    d = nrm(c + u * a + v * b); G[i, j] = sommet(tuple(np.round(d, 6)), d)
            for j in range(n):
                for i in range(n): F.append([G[i, j], G[i + 1, j], G[i + 1, j + 1], G[i, j + 1]])
        # orientation des faces vers l'extérieur
        for k, f in enumerate(F):
            a, b, c = (V[i] for i in f[:3])
            if np.cross(b - a, c - a) @ (a - s.c) < 0: F[k] = f[::-1]
        C = MAT.teinte("peau", V)
        w = MAT.joues(V, [s.surf(A([.5, -.8, -.3])), s.surf(A([-.5, -.8, -.3]))], s.R * .2)[:, None]
        C = C * (1 - w) + MAT.COUL["joues"][None, :] * w
        M.ajouter(V, F, C, "Head", "crane")
    # -------- décalques
    def plan(s, d0):
        d0 = nrm(d0); p0 = s.surf(d0); n = s.normale(d0); u = nrm(np.cross(EZ, n)) * -1; u = -u if u[0] < 0 else u
        v = np.cross(n, u)
        if v[2] < 0: v = -v
        return p0, n, u, v
    def poser(s, p0, u, v, xy, off):
        out = []
        for x, y in xy:
            q = p0 + u * x + v * y; d = nrm(q - s.c); out.append(s.surf(d) + s.normale(d) * off)
        return out
    def ellipse(s, M, d0, w, h, off, coul, decal=(0, 0), rot=0.0, nu=20, nv=4, bombe=.0015, nom="visage"):
        p0, n, u, v = s.plan(d0); xy, V = [], []
        cr, sr = math.cos(rot), math.sin(rot)
        xy.append((decal[0], decal[1]))
        for j in range(1, nv + 1):
            for i in range(nu):
                a = 2 * math.pi * i / nu; x, y = w / 2 * math.cos(a) * j / nv, h / 2 * math.sin(a) * j / nv
                xy.append((decal[0] + x * cr - y * sr, decal[1] + x * sr + y * cr))
        offs = [off + bombe] + [off + bombe * (1 - (j / nv) ** 2) for j in range(1, nv + 1) for _ in range(nu)]
        V = [s.poser(p0, u, v, [q], o)[0] for q, o in zip(xy, offs)]
        F = [[0, 1 + i, 1 + (i + 1) % nu] for i in range(nu)]
        for j in range(nv - 1):
            for i in range(nu):
                a, b = 1 + j * nu + i, 1 + j * nu + (i + 1) % nu; F.append([a, a + nu, b + nu, b])
        F = s.orienter(V, F)
        M.ajouter(V, F, coul, "Head", nom)
    def trait(s, M, d0, pts, larg, off, coul, nom="visage"):
        """Trait épais (sourcil, cils, bouche) : bande le long de pts (plan local, mètres), largeur larg[k]."""
        p0, n, u, v = s.plan(d0); pts = [A(p, float) for p in pts]; xy = []
        for k, p in enumerate(pts):
            t = nrm(pts[min(k + 1, len(pts) - 1)] - pts[max(k - 1, 0)]); nn = A([-t[1], t[0]])
            xy += [tuple(p + nn * larg[k] / 2), tuple(p), tuple(p - nn * larg[k] / 2)]
        V = s.poser(p0, u, v, xy, off)
        for k in range(len(pts)): V[3 * k + 1] = V[3 * k + 1] + s.normale(nrm(V[3 * k + 1] - s.c)) * .0012 * (larg[k] > 0)
        F = []
        for k in range(len(pts) - 1):
            a = 3 * k; F += [[a, a + 1, a + 4, a + 3], [a + 1, a + 2, a + 5, a + 4]]
        F = s.orienter(V, F)
        M.ajouter(V, F, coul, "Head", nom)
    def orienter(s, V, F):
        out = []
        for f in F:
            a, b, c = (A(V[i]) for i in f[:3]); nn = np.cross(b - a, c - a)
            out.append(f if nn @ (a - s.c) >= 0 else f[::-1])
        return out

def visage(T, M):
    """Yeux en amande, grands et brillants (iris vert, double reflet), cils, sourcils relevés, nez rond, sourire,
    taches de rousseur. Tout en géométrie colorée : même rendu dans Blender et dans le jeu."""
    C = MAT.COUL; R = T.R
    for sx in (1, -1):
        d = A([sx * .37, -.92, -.06])
        T.ellipse(M, d, .066 * R / .19, .082 * R / .19, .0018, C["oeil_blanc"], rot=sx * .06, bombe=.002)
        T.ellipse(M, d, .047 * R / .19, .06 * R / .19, .0036, C["iris"], decal=(-sx * .004, -.006), bombe=.002)
        T.ellipse(M, d, .028 * R / .19, .036 * R / .19, .0052, C["iris_clair"] * .5 + C["iris"] * .5, decal=(-sx * .004, -.012), nu=16, nv=2, bombe=.001)
        T.ellipse(M, d, .026 * R / .19, .032 * R / .19, .0064, C["pupille"], decal=(-sx * .004, -.004), nu=16, nv=2, bombe=.001)
        T.ellipse(M, d, .015 * R / .19, .017 * R / .19, .0078, C["reflet"], decal=(-sx * .004 + .009, .01), nu=12, nv=2, bombe=.0005)
        T.ellipse(M, d, .007 * R / .19, .007 * R / .19, .0078, C["reflet"], decal=(-sx * .004 - .008, -.016), nu=10, nv=1, bombe=.0003)
        # paupière supérieure : un trait foncé qui épouse le haut de l'œil et se termine par un petit cil vers l'extérieur
        k = R / .19; W2, H2 = .033 * k * 1.06, .041 * k * 1.06
        pts = sorted([(W2 * math.cos(a), H2 * math.sin(a)) for a in np.linspace(math.pi * .06, math.pi * .94, 9)], key=lambda p: p[0] * sx)
        pts.append((sx * W2 * 1.22, H2 * .72))
        T.trait(M, d, pts, [.005, .008, .01, .011, .011, .011, .011, .01, .009, .004], .0058, C["cil"])
        # sourcil : arc épais, levé vers le milieu (air curieux et gai)
        db = A([sx * .36, -.9, .2])
        T.trait(M, db, [(-sx * .034, -.004), (-sx * .012, .008), (sx * .012, .009), (sx * .036, .0)], [.008, .016, .015, .006], .003, C["sourcil"])
        # taches de rousseur
        rng = np.random.default_rng(5 + sx)
        for _ in range(5):
            dd = A([sx * (.24 + .2 * rng.random()), -.95, -.3 + .1 * rng.random()])
            T.ellipse(M, dd, .008, .007, .0012, C["rousseur"], nu=8, nv=1, bombe=0)
    # nez : petite boule douce
    p = T.surf(A([0, -1, -.24])) + A([0, .006, 0])
    V, F = ellipsoide(p, .022 * R / .19, .02 * R / .19, .018 * R / .19, 12, 8)
    M.ajouter(V, F, MAT.teinte("peau", V) * .98 + MAT.COUL["joues"] * .02, "Head", "nez")
    # bouche : sourire ouvert en demi-lune, lèvre du bas plus claire
    d = A([0, -.9, -.47]); k = R / .19
    T.trait(M, d, [(-.03 * k, .006), (-.015 * k, -.005), (0, -.008), (.015 * k, -.005), (.03 * k, .006)], [.004, .009, .011, .009, .004], .0022, C["levres"] * .7)
    T.trait(M, d, [(-.026 * k, .006), (0, .004), (.026 * k, .006)], [.002, .003, .002], .0024, C["levres"] * .6)
    for sx in (1, -1):   # oreilles
        dd = A([sx, .05, -.06]); p, n = T.surf(dd), T.normale(dd)
        V, F = ellipsoide(p - n * .01, .022, .036, .05, 12, 8)
        M.ajouter(V, F, MAT.teinte("peau", V), "Head", "oreilles")
        V, F = ellipsoide(p + n * .006 + A([0, -.004, 0]), .008, .02, .03, 10, 6)
        M.ajouter(V, F, MAT.COUL["peau_ombre"], "Head", "oreilles")

# ---------------------------------------------------------------- cheveux
def ligne_cheveux(d):
    """Hauteur (z de la direction) du bord de la calotte selon l'angle autour de la tête : haut devant, bas derrière."""
    ph = math.atan2(d[0], -d[1])                    # 0 devant, ±π derrière
    return .42 - .98 * (1 - math.cos(ph)) / 2 - .12 * math.sin(ph) * 0

def cheveux(T, M, graine=3, epais=1.07):
    """Calotte épaisse + grosses mèches stylisées en pétales (racine foncée, pointes cuivrées) + petite tresse."""
    R = T.R; rng = np.random.default_rng(graine)
    def coquille(d, k=epais): d = nrm(d); return T.c + T.r(d) * k
    # calotte : grille (angle autour, hauteur) jusqu'à la ligne des cheveux
    def f(u, v):
        ph = -math.pi + 2 * math.pi * u; dd = A([math.sin(ph), -math.cos(ph), 0])
        zmin = ligne_cheveux(dd); th = math.acos(np.clip(zmin, -1, 1)) * v
        d = A([math.sin(th) * math.sin(ph), -math.sin(th) * math.cos(ph), math.cos(th)])
        return coquille(d), nrm(T.r(d))
    V, F = coque(f, 40, 12, .025 * R / .19, ferme_u=True)
    t = A([.15 + .25 * (np.linalg.norm(p - T.c) < R * 1.03) for p in V])
    M.ajouter(V, F, MAT.teinte("cheveux", V, t * 0 + .38, graine), "Head", "calotte")
    # mèches : (racine, direction de départ, longueur, largeur, retombée, relève de la pointe)
    def meche(racine, dirc, L, w, chute=.6, releve=.0, n=9, ep=.42, g=0):
        d = nrm(racine); p = coquille(d, epais * .99); dirc = nrm(dirc); pts = [p]; normales = []
        for k in range(1, n):
            t = k / (n - 1); nn = nrm(p - T.c)
            tang = dirc - nn * (dirc @ nn); tang = nrm(tang + A([0, 0, -1]) * chute * t)
            p = p + tang * L / (n - 1)
            dd = nrm(p - T.c); rmin = np.linalg.norm(T.r(dd)) * (epais + .02 + .1 * t ** 2 * releve + .015 * t)
            if np.linalg.norm(p - T.c) < rmin: p = T.c + dd * rmin
            p = p + nrm(p - T.c) * releve * .02 * t ** 3
            pts.append(p)
        refs = [nrm(q - T.c) for q in pts]
        larg = [w * (1 - (k / (n - 1)) ** 1.6) ** .7 * (.8 + .2 * math.sin(math.pi * k / (n - 1))) for k in range(n)]
        V, F, tt = tube(pts, larg, 8, refs=[np.cross(nrm(pts[min(k + 1, n - 1)] - pts[max(k - 1, 0)]), r_) for k, r_ in enumerate(refs)], aplat=ep)
        M.ajouter(V, F, MAT.teinte("cheveux", V, tt, g), "Head", "meches")
    k = R / .19
    # dessus et arrière : rayonnent depuis l'épi (en haut, un peu en arrière)
    for i in range(16):
        ph = -math.pi + 2 * math.pi * (i + .5) / 16 + rng.uniform(-.1, .1)   # 0 devant
        if abs(ph) < .9: continue                                             # devant : la frange s'en charge
        el = .78 + rng.uniform(-.05, .05)
        d = A([math.sin(ph) * math.cos(el), -math.cos(ph) * math.cos(el) + .15, math.sin(el)])
        out = A([math.sin(ph), -math.cos(ph), 0])
        L = (.2 + .05 * rng.random()) * k * (1.15 if abs(ph) > 2.2 else 1)
        meche(d, out + A([0, 0, -.2]), L, (.075 + .015 * rng.random()) * k, chute=.25, releve=1.4, g=i)
    # second rang derrière et sur les côtés, plus bas : couvre le bord de la calotte et finit en petites pointes
    for i in range(12):
        ph = -math.pi + 2 * math.pi * (i + .5) / 12 + rng.uniform(-.08, .08)
        if abs(ph) < 1.2: continue
        el = .3 + rng.uniform(-.05, .05)
        d = A([math.sin(ph) * math.cos(el), -math.cos(ph) * math.cos(el), math.sin(el)])
        out = A([math.sin(ph), -math.cos(ph), 0])
        meche(d, out * .5 + A([0, 0, -1]), (.13 + .03 * rng.random()) * k, (.07 + .01 * rng.random()) * k, chute=.4, releve=2.0, g=20 + i)
    # épi sur le dessus : deux grosses mèches courtes couchées vers l'arrière (silhouette vivante, sans antennes)
    for dx, dy, ln in ((.1, .12, .11), (-.12, .2, .1)):
        meche(A([dx, dy, 1]), A([dx * 1.5, 1, .25]), ln * k, .07 * k, chute=.15, releve=1.6, g=40)
    # frange balayée vers la droite du personnage (-x) : elle descend jusqu'au-dessus des sourcils et cache le bord
    for i, (bx, ln) in enumerate(((.5, .2), (.32, .21), (.14, .21), (-.04, .2), (-.22, .18), (-.4, .15))):
        meche(A([bx, -.12, .98]), A([-.45 - .1 * i, -1, -.2]), ln * k, (.078 - .003 * i) * k, chute=.75, releve=.5, g=50 + i)
    for sx in (1, -1):   # pattes sur les tempes
        meche(A([sx * .75, -.35, .6]), A([sx * .1, -.4, -1]), .13 * k, .05 * k, chute=.4, releve=.6, g=60)
    # petite tresse derrière l'oreille gauche, nouée de cuir, avec un petit pinceau au bout
    d0 = nrm(A([.82, .38, -.12])); p0 = coquille(d0, epais); pas = A([.006, .012, -.028]) * k
    for j in range(6):
        V, F = ellipsoide(p0 + pas * j, .017 * k, .017 * k, .019 * k, 10, 7)
        M.ajouter(V, F, MAT.teinte("cheveux", V, A([.4 + .08 * j] * len(V)), 70 + j), "Head", "tresse")
    c = p0 + pas * 5.9
    V, F = ellipsoide(c, .014 * k, .014 * k, .011 * k, 10, 6); M.ajouter(V, F, MAT.teinte("cuir_fonce", V), "Head", "tresse")
    V, F, tt = tube([c, c + A([.004, .006, -.025]) * k, c + A([.008, .01, -.05]) * k], [.012 * k, .011 * k, 0], 8)
    M.ajouter(V, F, MAT.teinte("cheveux", V, .5 + .5 * tt, 81), "Head", "tresse")

def boudin_fourrure(M, pts, r, os_, bosses=.3, graine=0, nr=10, n=None):
    """Bordure de fourrure continue (revers, col) : boudin bosselé le long d'un chemin, plus clair sur les bosses."""
    P = [A(p, float) for p in pts]; n = n or 6 * len(P)
    L = np.concatenate([[0], np.cumsum([np.linalg.norm(P[i + 1] - P[i]) for i in range(len(P) - 1)])])
    s_ = np.linspace(0, L[-1], n); Q = [A([np.interp(x, L, [p[i] for p in P]) for i in range(3)]) for x in s_]
    rng = np.random.default_rng(graine); ph = rng.uniform(0, 6.3, 3); u = s_ / max(L[-1], 1e-6)
    b = 1 + bosses * (.6 * np.sin(u * L[-1] / r * 1.9 + ph[0]) + .4 * np.sin(u * L[-1] / r * 3.1 + ph[1]))
    rr = list(r * b); rr[0] = rr[-1] = 0
    Q[0] = Q[0] - nrm(Q[1] - Q[0]) * r * .3; Q[-1] = Q[-1] + nrm(Q[-1] - Q[-2]) * r * .3
    V, F, tt = tube(Q, rr, nr)
    bb = np.interp(tt, u, b); t = np.clip((bb - (1 - bosses)) / (2 * bosses), 0, 1) * .7 + .25
    W = os_ if isinstance(os_, (str, dict)) else [os_(v) for v in V]
    M.ajouter(V, F, MAT.teinte("fourrure", V, t, graine), W, "fourrure")

# ---------------------------------------------------------------- mains
def main(M, poignet, bout, sx, os_="Hand", repli=.55, taille=1.0):
    """Main stylisée, grosse et douce (proportions de dessin animé) : paume arrondie, quatre doigts un peu repliés,
    pouce en avant. Paume tournée vers le corps."""
    W, f = A(poignet, float), nrm(A(bout, float) - A(poignet, float))
    n = nrm(A([-sx, 0, 0]) - f * (A([-sx, 0, 0]) @ f))           # paume vers le corps
    th = nrm(-sx * np.cross(f, n))                                # côté du pouce (devant)
    C = MAT.COUL; peau = lambda V: MAT.teinte("peau", V); debut = len(M.V)
    V, F = superquadrique(W + f * .045 - n * .004, (th * .043, n * .024, f * .046), 14, 10, .8)
    M.ajouter(V, F, peau(V), os_, "mains")
    for i, o in enumerate((-.027, -.009, .009, .027)):
        b = W + f * .082 + th * o - n * .002; ln = (.03, .036, .034, .028)[i]
        d1 = nrm(f * math.cos(repli * .6) + n * math.sin(repli * .6)); d2 = nrm(f * math.cos(repli * 1.6) + n * math.sin(repli * 1.6))
        j1 = b + d1 * ln * .55; j2 = j1 + d2 * ln * .55
        V, F, _ = tube([b - f * .008, b, j1, j2, j2 + d2 * .012, j2 + d2 * .0125], [.0122, .0125, .0118, .0108, .007, 0], 8)
        M.ajouter(V, F, peau(V), os_, "mains")
    tb = W + f * .03 + th * .036 + n * .008
    dt = nrm(f * .55 + th * .6 + n * .55); j = tb + dt * .03; dt2 = nrm(dt + n * .6)
    V, F, _ = tube([tb - dt * .01, tb, j, j + dt2 * .02, j + dt2 * .028, j + dt2 * .029], [.014, .0145, .013, .011, .006, 0], 8)
    M.ajouter(V, F, peau(V), os_, "mains")

def bague(centre, axe, r, epais, haut, nu=20, nv=6, bosses=0.0, graine=0):
    """Anneau autour d'un axe quelconque (revers de manche, lacets d'un brassard, revers de botte)."""
    V, F, T = anneau(A([0., 0, 0]), r, r, epais, haut, nu, nv, bosses, graine)
    e1, e2 = repere(axe, (1, 0, 0) if abs(nrm(axe)[0]) < .9 else (0, 1, 0)); ax = nrm(axe)
    return [A(centre, float) + e1 * v[0] + e2 * v[1] + ax * v[2] for v in V], F, T
    for k in range(debut, len(M.V)): M.V[k] = W - f * .01 + (M.V[k] - W + f * .01) * taille

# ---------------------------------------------------------------- vêtements simples
def bande_trait(M, pts, larg, ep, coul, os_, ref):
    V, F, _ = tube(pts, [larg] * len(pts), 6, ref=ref, aplat=ep / larg); M.ajouter(V, F, coul, os_, "details")
