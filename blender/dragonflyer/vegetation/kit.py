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
        soleil = max(0., h) * min(1., bord) * .5    # le haut du bord, au soleil, tire un peu vers l'or
        return (min(1., f * (1 + chaud + .04 * soleil)), f, max(0., f * (1 - 2 * chaud - .12 * soleil)))
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
    """Contreforts au pied du tronc : naissent dans le tronc, s'écartent en s'arrondissant et plongent sous le sol
    (le bout s'effile à 45 cm sous terre : jamais de bout coupé visible ; entre deux racines on voit le tronc entrer dans le sol)."""
    for i in range(n):
        a = 2 * math.pi * (i + A.R.uniform(-.2, .2)) / n; d = Vector((math.cos(a), math.sin(a), 0))
        L = long * A.R.uniform(.8, 1.15)
        pts = [d * rayon_tronc * .25 + Vector((0, 0, z_haut)), d * (rayon_tronc * .85) + Vector((0, 0, z_haut * .42)),
               d * (rayon_tronc + L * .45) + Vector((0, 0, .02)), d * (rayon_tronc + L * .8) + Vector((0, 0, -.2)), d * (rayon_tronc + L) + Vector((0, 0, -.45))]
        tube(A, pts, [rayon_tronc * .5, rayon_tronc * .44, rayon_tronc * .26, rayon_tronc * .13, rayon_tronc * .05], n=8, pas=.42, teinte=teinte, bout=True)

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
    # texture du cœur projetée à plat selon l'axe principal de chaque face (pas de pôle pincé ni de rayures) :
    # le fond de feuilles serrées garde partout la même taille ; décalage au hasard par touffe
    du, dv = A.R.uniform(0, 1), A.R.uniform(-.05, .05); ech_t = 4.0
    for fa in fs:
        fa.material_index = FEUILLAGE; fa.smooth = True; fa.normal_update()
        nx, ny, nz = (abs(x) for x in fa.normal)
        for l in fa.loops:
            d = l.vert.co - c
            a, b = (d.y, d.z) if nx >= max(ny, nz) else ((d.x, d.z) if ny >= nz else (d.x, d.y))
            l[A.uv].uv = (du + a / ech_t, max(FOND_V[0], min(FOND_V[1], .25 + dv + b / ech_t * (FOND_V[1] - FOND_V[0]))))
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
def etage_aiguilles(A, zb, h, R, nd=10, rt=.3, tombe=.35, brins=True, sommet=False, levre=.24):
    """Un étage de sapin : cône bombé (aiguilles serrées, opaque) dont le bord retombe en nd lobes arrondis (deux sommets
    par lobe, un creux entre deux lobes) ; une lèvre sous le bord donne de l'épaisseur (pas de jupon en papier) ; dessous
    fermé jusqu'au tronc ; des brins en cartes de tailles et d'angles variés tout le long du bord, certains qui dépassent.
    zb : hauteur du bord, h : hauteur de l'étage, R : rayon au bord, rt : rayon du tronc à cet endroit.
    sommet : dernier étage, pointe arrondie."""
    n = 3 * nd; ph = A.R.uniform(0, 6.28); pas = 2 * math.pi / nd
    lobes = [(A.R.uniform(-.1, .1), A.R.uniform(-.25, .3), A.R.uniform(-.08, .08)) for _ in range(nd)]   # débord, retombée, décalage
    def az(j):
        k, r = divmod(j, 3); return ph + pas * (k + lobes[k][2] + (-.2, .2, .5)[r])
    def P(j, r, z): return Vector((math.cos(az(j)) * r, math.sin(az(j)) * r, z))
    creux = lambda j: j % 3 == 2
    def bord(j):
        k = j // 3
        if creux(j): return P(j, R * .8, zb + .08 * h)
        return P(j, R * (1 + lobes[k][0]), zb - tombe * (1 + lobes[k][1]))
    anneaux = [[bord(j) for j in range(n)],
               [P(j, R * (.6 if creux(j) else .66), zb + h * (.33 if creux(j) else .29)) for j in range(n)],
               [P(j, max(R * .32, rt + .12), zb + h * .68) for j in range(n)]]
    if sommet: anneaux.append([P(j, max(R * .14, rt + .06), zb + h * .9) for j in range(n)])
    haut = Vector((0, 0, zb + h * (1.0 if not sommet else .99)))
    m = max(1, round(2 * math.pi * R / 5.5)); S = [0, .42, .78, .93, 1.][:len(anneaux)] + [1.]
    vv = lambda t: FOND_V[0] + (FOND_V[1] - FOND_V[0]) * t
    clair = lambda p, b=0.: A.lumiere_feuillage(p, b)
    def nrm(p, dessous=False):
        rad = Vector((p.x, p.y, 0)); rad = rad.normalized() if rad.length > 1e-3 else Vector((1, 0, 0))
        return (rad * .8 + Vector((0, 0, .45))) if dessous else (rad * .62 + Vector((0, 0, .78)))
    V = [[A.v(p, clair(p, .03 if (i == 0 and not creux(j)) else 0), nrm(p)) for j, p in enumerate(an)] for i, an in enumerate(anneaux)]
    vh = A.v(haut, clair(haut, .05), (0, 0, 1))
    def bande(B0, B1, t0, t1, inv=False):
        for j in range(n):
            u0, u1 = j / n * m, (j + 1) / n * m
            vs = [B0[j], B0[(j + 1) % n], B1[(j + 1) % n], B1[j]]; uv = [(u0, vv(t0)), (u1, vv(t0)), (u1, vv(t1)), (u0, vv(t1))]
            A.f(vs[::-1] if inv else vs, uv[::-1] if inv else uv, FEUILLAGE)
    for i in range(len(V) - 1): bande(V[i], V[i + 1], S[i], S[i + 1])
    for j in range(n):
        u0, u1 = j / n * m, (j + 1) / n * m
        A.f([V[-1][j], V[-1][(j + 1) % n], vh], [(u0, vv(S[len(V) - 1])), (u1, vv(S[len(V) - 1])), ((u0 + u1) / 2, vv(1))], FEUILLAGE)
    # lèvre : sous le bord, un peu en dedans et plus bas (épaisseur), puis le dessous jusqu'au tronc
    Vl = [A.v(Vector((p.x * .9, p.y * .9, p.z - levre * (.8 if creux(j) else 1))), clair(p, -.03), nrm(p, True)) for j, p in enumerate(anneaux[0])]
    Vb = [A.v(p, clair(p, .0), nrm(p, True)) for p in anneaux[0]]
    bande(Vb, Vl, 0, .12, inv=True)
    dz = zb + h * .32
    sous = [A.v(P(j, rt * 1.1, dz), tuple(x * .95 for x in clair(P(j, rt, dz), -.08)), nrm(P(j, 1, dz), True)) for j in range(n)]
    bande(Vl, sous, .12, .45, inv=True)
    if not brins: return
    n_fn = lambda p: nrm(p)
    for j in range(n):   # brins : au milieu de chaque lobe un long brin (parfois très long), dans chaque creux un plus court
        if j % 3 == 1: continue
        k = j // 3
        if j % 3 == 0: p = (anneaux[0][j] + anneaux[0][j + 1]) / 2; q = (anneaux[1][j] + anneaux[1][j + 1]) / 2; a = (az(j) + az(j + 1)) / 2
        else: p = anneaux[0][j]; q = anneaux[1][j]; a = az(j)
        pente = (p - q).normalized(); tg = Vector((-math.sin(a), math.cos(a), 0))
        nn = pente.cross(tg).normalized()
        rot = Matrix.Rotation(math.radians(A.R.uniform(-22, 22)), 3, nn)          # angle varié dans le plan de la pente
        if creux(j):
            axe = (pente + Vector((0, 0, -.1))).normalized(); L = max(.7, min(1.4, R * .34)); k_ = .55
        else:
            axe = (pente + Vector((0, 0, -.22 + A.R.uniform(-.1, .1)))).normalized(); L = max(.9, min(1.8, R * .44)); k_ = .5
            if A.R.random() < .3: L *= 1.35; k_ = .38                             # quelques brins dépassent nettement du bord
        L *= A.R.uniform(.75, 1.2); axe = rot @ axe; tg = rot @ tg
        teinte = A.R.uniform(.82, .95)
        carte(A, p - axe * L * k_, axe, tg * L * A.R.uniform(.8, 1.0), L, A.R.randrange(2), n_fn, lambda p, t=teinte: tuple(x * t for x in clair(p, 0)))
