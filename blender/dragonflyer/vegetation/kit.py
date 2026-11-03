# The Dragon Apprentice Chronicles : le kit des arbres (étape 2 de la méthode, dragonflyer/CONCEPTION.md § 7 bis).
# Pièces : tube (tronc, branche, rameau, racine), touffe de feuilles (cœur opaque + bouquets en cartes), étage d'aiguilles
# (cône à bord festonné + brins en cartes), et les règles de croissance (fourche, racines). Chaque arbre
# (arbres/<nom>.py) est fait seulement de ces pièces et des textures de materiaux.py.
# Repère Blender : Z vers le haut, pied de l'arbre à l'origine. Deux matières : 0 = écorce, 1 = feuillage (aiguilles ou feuilles).
# Chaque sommet porte une couleur (« Col » : lumière peinte et occlusion, multipliée par la texture) et une normale choisie
# (feuillage : normale « de boule », vers l'extérieur et un peu vers le haut, pour que le dessous ne soit jamais noir).
import bpy, bmesh, math, random
from mathutils import Vector, Matrix
from materiaux import CARTES, FOND_V

ECORCE, FEUILLAGE = 0, 1
HAUT = Vector((0, 0, 1))

def _ortho(t):
    ref = HAUT if abs(t.z) < .9 else Vector((1, 0, 0))
    return t.cross(ref).normalized()

class Arbre:
    """Un arbre en construction : bmesh, coordonnées de texture, couleur par sommet, normales choisies."""
    def __init__(s, nom, graine=1, feuillage="Feuilles"):
        s.nom = nom; s.bm = bmesh.new(); s.uv = s.bm.loops.layers.uv.new("UVMap")
        s.col = s.bm.verts.layers.float_color.new("Col"); s.R = random.Random(graine)
        s.normales = {}; s.feuillage = feuillage
        s.couronne = (Vector((0, 0, 5)), Vector((4, 4, 3)))   # centre et demi-axes du feuillage (lumière, normales)
    # --- briques
    def v(s, co, col=(1, 1, 1), n=None):
        v = s.bm.verts.new(co); v[s.col] = (*col, 1)
        if n is not None: s.normales[v] = Vector(n).normalized()
        return v
    def f(s, vs, uvs, mat, lisse=True):
        if len(set(vs)) < 3: return None
        try: fa = s.bm.faces.new(vs)
        except ValueError: return None
        for l, uv in zip(fa.loops, uvs): l[s.uv].uv = uv
        fa.material_index = mat; fa.smooth = lisse
        s.orienter(fa)
        return fa
    def orienter(s, fa):
        """Face tournée du côté de sa normale choisie (même éclairage dans Blender que dans le jeu, qui ne retourne pas la normale)."""
        ns = [s.normales.get(v) for v in fa.verts]
        if None in ns: return
        fa.normal_update()
        if fa.normal.dot(sum(ns, Vector())) < 0: fa.normal_flip()
    # --- lumière peinte du feuillage
    def dans_couronne(s, p):
        c, a = s.couronne; q = p - c; return Vector((q.x / a.x, q.y / a.y, q.z / a.z))
    def normale_feuillage(s, p, centre_touffe=None, k_touffe=.45):
        """Vers l'extérieur de la couronne (et de la touffe), relevée vers le haut : le dessous reste éclairé par le ciel."""
        q = s.dans_couronne(p); n = Vector((q.x, q.y, q.z * .6))
        if n.length < 1e-4: n = Vector((0, 0, 1))
        n.normalize()
        if centre_touffe is not None:
            t = p - centre_touffe
            if t.length > 1e-4: n = (n * (1 - k_touffe) + t.normalized() * k_touffe).normalized()
        n.z = n.z * .7 + .45
        return n.normalized()
    def lumiere_feuillage(s, p, bonus=0.0):
        """Plus clair en haut et au bord de la couronne ; dessous et cœur plus sombres mais chauds (jamais noirs)."""
        q = s.dans_couronne(p); h = max(-1., min(1., q.z)); bord = max(0., min(1.2, q.length))
        f = .64 + .17 * (h + 1) / 2 + .22 * min(1, bord) + bonus
        f = max(.55, min(1., f))
        chaud = .07 * (1 - (h + 1) / 2)          # le dessous tire vers le jaune (lumière qui traverse, herbe qui renvoie)
        return (min(1., f * (1 + chaud)), f, max(0., f * (1 - 2 * chaud)))
    # --- fin
    def objet(s, scene=None):
        scene = scene or bpy.context.scene
        s.bm.verts.index_update(); s.bm.normal_update()
        ns = [s.normales.get(v) or v.normal.copy() for v in s.bm.verts]
        me = bpy.data.meshes.new(s.nom); s.bm.to_mesh(me); s.bm.free()
        me.normals_split_custom_set_from_vertices(ns)
        at = me.attributes.new("Nf", "FLOAT_VECTOR", "POINT"); at.data.foreach_set("vector", [x for n in ns for x in n])   # pour les aperçus (Cycles)
        ob = bpy.data.objects.new(s.nom, me); scene.collection.objects.link(ob)
        for nom in ("Ecorce", s.feuillage):
            m = bpy.data.materials.get(nom) or bpy.data.materials.new(nom); me.materials.append(m)
        ob["matieres"] = ["Ecorce", s.feuillage]
        return ob

# ------------------------------------------------------------------ 1. le tube : tronc, branches, rameaux, racines
def _reechantillonner(pts, rayons, pas):
    """Points à pas régulier le long de la ligne (le tube garde des anneaux réguliers, la texture ne s'étire pas)."""
    L = [0.]
    for a, b in zip(pts, pts[1:]): L.append(L[-1] + (b - a).length)
    n = max(1, round(L[-1] / pas)); P, Rr = [], []
    def ray(f):   # rayons donnés le long de la ligne, à intervalles réguliers (autant de valeurs qu'on veut)
        x = f * (len(rayons) - 1); j = min(int(x), len(rayons) - 2); t = x - j
        return rayons[j] + (rayons[j + 1] - rayons[j]) * t
    for i in range(n + 1):
        d = L[-1] * i / n; j = 0
        while j < len(L) - 2 and L[j + 1] < d: j += 1
        t = (d - L[j]) / max(1e-6, L[j + 1] - L[j])
        P.append(pts[j].lerp(pts[j + 1], t)); Rr.append(ray(i / n))
    return P, Rr

def tube(A, pts, rayons, n=8, pas=.9, rep=1.4, teinte=(1, 1, 1), bout=True, torsion=0.0):
    """Tube le long de `pts` (rayon `rayons`), n côtés. Écorce répétée tous les `rep` mètres en long, et autant en tour
    (nombre entier de répétitions, divisant n : pas de couture). bout : ferme l'extrémité par une petite pointe."""
    pts = [Vector(p) for p in pts]; P, Rr = _reechantillonner(pts, rayons, pas); k = len(P)
    T = [(P[min(i + 1, k - 1)] - P[max(i - 1, 0)]).normalized() for i in range(k)]
    N = _ortho(T[0]); cadres = []
    for i in range(k):
        if i: N = T[i - 1].rotation_difference(T[i]) @ N; N = (N - T[i] * N.dot(T[i])).normalized()
        cadres.append((N, T[i].cross(N)))
    circ = 2 * math.pi * sum(Rr) / k
    m = min((d for d in range(1, n + 1) if n % d == 0), key=lambda d: abs(d - circ / rep)); per = n // m
    L = [0.]
    for a, b in zip(P, P[1:]): L.append(L[-1] + (b - a).length)
    anneaux = []
    for i in range(k):
        Nn, B = cadres[i]; a0 = torsion * i
        anneaux.append([A.v(P[i] + Rr[i] * (math.cos(2 * math.pi * j / n + a0) * Nn + math.sin(2 * math.pi * j / n + a0) * B), teinte) for j in range(n)])
    for i in range(k - 1):
        v0, v1 = L[i] / rep, L[i + 1] / rep
        for j in range(n):
            u0 = (j % per) / per; u1 = u0 + 1 / per
            A.f([anneaux[i][j], anneaux[i][(j + 1) % n], anneaux[i + 1][(j + 1) % n], anneaux[i + 1][j]], [(u0, v0), (u1, v0), (u1, v1), (u0, v1)], ECORCE)
    if bout:
        pointe = A.v(P[-1] + T[-1] * Rr[-1] * 1.2, teinte); vb = L[-1] / rep + Rr[-1] / rep
        for j in range(n):
            u0 = (j % per) / per; u1 = u0 + 1 / per
            A.f([anneaux[-1][j], anneaux[-1][(j + 1) % n], pointe], [(u0, L[-1] / rep), (u1, L[-1] / rep), ((u0 + u1) / 2, vb)], ECORCE)
    return P, Rr

def courbe(a, b, flechir=0.0, n=4, R=None, jit=0.0, montee=0.0):
    """Ligne de a à b, un peu arquée (flechir : vers le bas si < 0, montee : le bout se relève), un peu irrégulière."""
    a, b = Vector(a), Vector(b); pts = []
    for i in range(n + 1):
        t = i / n; p = a.lerp(b, t) + Vector((0, 0, flechir * 4 * t * (1 - t) + montee * t * t))
        if R and 0 < i < n: p += Vector((R.uniform(-jit, jit), R.uniform(-jit, jit), R.uniform(-jit, jit)))
        pts.append(p)
    return pts

def racines(A, rayon_tronc, n=5, long=1.3, teinte=(1, 1, 1), z_haut=.7):
    """Contreforts au pied du tronc : partent de la base du tronc, s'écartent et plongent sous le sol (pied bien posé)."""
    for i in range(n):
        a = 2 * math.pi * (i + A.R.uniform(-.2, .2)) / n; d = Vector((math.cos(a), math.sin(a), 0))
        L = long * A.R.uniform(.8, 1.15)
        pts = [d * rayon_tronc * .2 + Vector((0, 0, z_haut)), d * (rayon_tronc * .9) + Vector((0, 0, z_haut * .45)),
               d * (rayon_tronc + L * .55) + Vector((0, 0, .06)), d * (rayon_tronc + L) + Vector((0, 0, -.25))]
        tube(A, pts, [rayon_tronc * .55, rayon_tronc * .5, rayon_tronc * .3, rayon_tronc * .12], n=6, pas=.45, teinte=teinte, bout=True)

# ------------------------------------------------------------------ 2. la touffe de feuilles (feuillu)
def _fibo(n, R):
    """n directions bien réparties sur la sphère (spirale de Fibonacci), tournées au hasard."""
    rot = Matrix.Rotation(R.uniform(0, 6.28), 3, "Z") @ Matrix.Rotation(R.uniform(0, 6.28), 3, "X")
    g = math.pi * (3 - math.sqrt(5)); D = []
    for i in range(n):
        z = 1 - 2 * (i + .5) / n; r = math.sqrt(1 - z * z); D.append(rot @ Vector((math.cos(g * i) * r, math.sin(g * i) * r, z)))
    return D

def carte(A, base, axe, larg, long, variante, n_fn, c_fn):
    """Une carte (deux triangles) : pied au milieu du bord bas `base`, monte selon `axe` sur `long`, largeur `larg`
    (perpendiculaire à axe, donnée par larg = vecteur). Coordonnées : une des CARTES de la texture du feuillage."""
    u0, u1, v0, v1 = CARTES[variante]
    coins = [base - larg / 2, base + larg / 2, base + larg / 2 + axe * long, base - larg / 2 + axe * long]
    vs = [A.v(p, c_fn(p), n_fn(p)) for p in coins]
    if A.R.random() < .5: uvs = [(u0, v0), (u1, v0), (u1, v1), (u0, v1)]
    else: uvs = [(u1, v0), (u0, v0), (u0, v1), (u1, v1)]   # miroir : moins de répétition
    return A.f(vs, uvs, FEUILLAGE)

def touffe(A, centre, rayon, ech=(1, 1, .85), ncartes=16, taille=1.0, inclin=38, sub=2, jit=.06):
    """Touffe de feuilles : un cœur rond opaque (le feuillage serré de la texture : on ne voit jamais le ciel à travers)
    et des bouquets en cartes posés tout autour, penchés vers l'extérieur (silhouette découpée, en feuilles)."""
    c = Vector(centre); E = Vector(ech) * rayon
    r = bmesh.ops.create_icosphere(A.bm, subdivisions=sub, radius=1, matrix=Matrix.Translation(c) @ Matrix.Diagonal((*E, 1)))
    vs = r["verts"]
    for v in vs:
        d = v.co - c; v.co = c + d * (1 + A.R.uniform(-jit, jit))
        v[A.col] = (*A.lumiere_feuillage(v.co, -.04), 1); A.normales[v] = A.normale_feuillage(v.co, c)
    fs = list({f for v in vs for f in v.link_faces})
    for fa in fs:
        fa.material_index = FEUILLAGE; fa.smooth = True; us = []
        for l in fa.loops:
            d = l.vert.co - c; d = Vector((d.x / E.x, d.y / E.y, d.z / E.z)).normalized()
            us.append([math.atan2(d.y, d.x) / (2 * math.pi) + .5, FOND_V[0] + (FOND_V[1] - FOND_V[0]) * math.acos(max(-1, min(1, -d.z))) / math.pi, abs(d.z) > .999])
        uu = [u[0] for u in us if not u[2]]
        if uu and max(uu) - min(uu) > .5:
            for u in us:
                if u[0] < .5: u[0] += 1
        for u in us:
            if u[2]: u[0] = sum(uu) / max(1, len(uu))
        for l, u in zip(fa.loops, us): l[A.uv].uv = (u[0] * 2, u[1])   # deux tours de texture : feuilles à la bonne taille
        A.orienter(fa)
    # bouquets : surtout au-dessus et sur le pourtour de la couronne (presque rien vers le cœur de l'arbre)
    cc = A.couronne[0]; n_fn = lambda p: A.normale_feuillage(p, c); c_fn = lambda p: A.lumiere_feuillage(p, .02)
    for d in _fibo(int(ncartes * 1.4), A.R):
        dehors = (c - cc); dehors = dehors.normalized() if dehors.length > .3 else Vector((0, 0, 1))
        if d.dot(dehors) < -.35 and A.R.random() < .8: continue
        if ncartes <= 0: break
        ncartes -= 1
        p = c + Vector((d.x * E.x, d.y * E.y, d.z * E.z)) * .78
        t = _ortho(d); t = Matrix.Rotation(A.R.uniform(0, 6.28), 3, d) @ t
        b = math.radians(inclin + A.R.uniform(-10, 10)); axe = (t * math.cos(b) + d * math.sin(b)).normalized()
        larg = d.cross(axe).normalized(); L = rayon * taille * A.R.uniform(.85, 1.15)
        carte(A, p - axe * L * .3, axe, larg * L, L, A.R.randrange(2), n_fn, c_fn)

# ------------------------------------------------------------------ 3. l'étage d'aiguilles (sapin)
def etage_aiguilles(A, zb, h, R, nd=10, rt=.3, tombe=.35, brins=True, sommet=False, H=13.):
    """Un étage de sapin : cône bombé (aiguilles serrées, opaque) dont le bord festonné retombe en nd pointes ;
    dessous fermé jusqu'au tronc ; un brin d'aiguilles en carte au bout de chaque pointe et entre les pointes.
    zb : hauteur du bord, h : hauteur de l'étage, R : rayon au bord, rt : rayon du tronc à cet endroit."""
    n = 2 * nd; ph = A.R.uniform(0, 6.28); jit = [A.R.uniform(-.08, .08) for _ in range(n)]
    def az(j): return ph + 2 * math.pi * j / n
    def P(j, r, z): return Vector((math.cos(az(j)) * r, math.sin(az(j)) * r, z))
    pointe = lambda j: j % 2 == 0
    def bord(j):
        if pointe(j): return P(j, R * (1 + jit[j]), zb - tombe * (1 + 2 * jit[j]))
        return P(j, R * .8, zb + .1 * h)
    anneaux = [[bord(j) for j in range(n)],
               [P(j, R * (.66 if pointe(j) else .6), zb + h * (.3 if pointe(j) else .34)) for j in range(n)],
               [P(j, R * .3, zb + h * .7) for j in range(n)]]
    haut = Vector((0, 0, zb + h))
    m = max(1, round(2 * math.pi * R / 5.5)); S = [0, .42, .78, 1.]     # répétitions de la texture autour ; avancée le long de la pente
    vv = lambda t: FOND_V[0] + (FOND_V[1] - FOND_V[0]) * t
    clair = lambda p, b=0.: A.lumiere_feuillage(p, b)
    def nrm(p, dessous=False):
        rad = Vector((p.x, p.y, 0)); rad = rad.normalized() if rad.length > 1e-3 else Vector((1, 0, 0))
        return (rad * .8 + Vector((0, 0, .45))) if dessous else (rad * .62 + Vector((0, 0, .78)))
    V = [[A.v(p, clair(p, .05 if (i == 0 and pointe(j)) else 0), nrm(p)) for j, p in enumerate(an)] for i, an in enumerate(anneaux)]
    vh = A.v(haut, clair(haut, .05), (0, 0, 1))
    for i in range(2):
        for j in range(n):
            u0, u1 = j / n * m, (j + 1) / n * m
            A.f([V[i][j], V[i][(j + 1) % n], V[i + 1][(j + 1) % n], V[i + 1][j]], [(u0, vv(S[i])), (u1, vv(S[i])), (u1, vv(S[i + 1])), (u0, vv(S[i + 1]))], FEUILLAGE)
    for j in range(n):
        u0, u1 = j / n * m, (j + 1) / n * m
        A.f([V[2][j], V[2][(j + 1) % n], vh], [(u0, vv(S[2])), (u1, vv(S[2])), ((u0 + u1) / 2, vv(1))], FEUILLAGE)
    # dessous : du bord au tronc, en remontant (sombre mais chaud, normales vers l'extérieur)
    dz = zb + h * .32
    sous = [A.v(P(j, rt * 1.1, dz), tuple(x * .95 for x in clair(P(j, rt, dz), -.08)), nrm(P(j, 1, dz), True)) for j in range(n)]
    Vb = [A.v(p, clair(p, 0), nrm(p, True)) for p in anneaux[0]]
    for j in range(n):
        u0, u1 = j / n * m, (j + 1) / n * m
        A.f([Vb[(j + 1) % n], Vb[j], sous[j], sous[(j + 1) % n]], [(u1, vv(0)), (u0, vv(0)), (u0, vv(.4)), (u1, vv(.4))], FEUILLAGE)
    if not brins: return
    n_fn = lambda p: nrm(p); c_fn = lambda p: tuple(x * .9 for x in clair(p, 0))   # brins un ton sous la pente : relief, pas de taches
    for j in range(n):   # frange continue : un long brin à chaque pointe, un plus court dans chaque creux
        p = anneaux[0][j]; q = anneaux[1][j]; pente = (p - q).normalized(); tg = Vector((-math.sin(az(j)), math.cos(az(j)), 0))
        if pointe(j):
            axe = (pente + Vector((0, 0, -.22))).normalized(); L = max(.9, min(1.8, R * .44)) * A.R.uniform(.9, 1.1); k = .5
        else:
            axe = (pente + Vector((0, 0, -.1))).normalized(); L = max(.7, min(1.4, R * .34)) * A.R.uniform(.9, 1.1); k = .55
        carte(A, p - axe * L * k, axe, tg * L * .95, L, A.R.randrange(2), n_fn, c_fn)
