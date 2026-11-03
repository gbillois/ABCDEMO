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

def racines(A, rayon_tronc, n=5, long=1.3, teinte=(1, 1, 1), z_haut=.7, cotes=8, pas=.42):
    """Contreforts au pied du tronc : naissent dans le tronc, s'écartent en s'arrondissant et plongent sous le sol
    (le bout s'effile à 45 cm sous terre : jamais de bout coupé visible ; entre deux racines on voit le tronc entrer dans le sol)."""
    for i in range(n):
        a = 2 * math.pi * (i + A.R.uniform(-.2, .2)) / n; d = Vector((math.cos(a), math.sin(a), 0))
        L = long * A.R.uniform(.8, 1.15)
        pts = [d * rayon_tronc * .25 + Vector((0, 0, z_haut)), d * (rayon_tronc * .85) + Vector((0, 0, z_haut * .42)),
               d * (rayon_tronc + L * .45) + Vector((0, 0, .02)), d * (rayon_tronc + L * .8) + Vector((0, 0, -.2)), d * (rayon_tronc + L) + Vector((0, 0, -.45))]
        tube(A, pts, [rayon_tronc * .5, rayon_tronc * .44, rayon_tronc * .26, rayon_tronc * .13, rayon_tronc * .05], n=cotes, pas=pas, teinte=teinte, bout=True)

# ------------------------------------------------------------------ 1 ter. le pied sculpté (tronc et contreforts d'une seule peau)
def pied_sculpte(A, hauteurs, rayon, contreforts, cols=32, rep=1.4, teinte=(1, 1, 1), axe=None):
    """Le bas du tronc : un cylindre bien subdivisé (cols colonnes, un anneau par hauteur) dont le rayon est sculpté
    par des contreforts. Chaque contrefort (angle, longueur, largeur) gonfle le rayon dans sa direction, de plus en plus
    près du sol, en bosse arrondie (cos²), et continue sous le sol : la racine s'y enfonce, jamais de bout coupé.
    Une seule peau : normales continues du fût aux racines ; écorce continue, dans le sens du fût (v = longueur le
    long de chaque colonne, u = tour). axe(z) : décalage horizontal du centre (tronc un peu penché)."""
    axe = axe or (lambda z: Vector((0, 0, 0)))
    def r_de(th, z):
        r = rayon(z)
        for a, L, W in contreforts:
            g = math.exp(-max(z, 0) / .42) * (.8 + .12 * min(1, max(0, -z) / .3))   # surtout au ras du sol ; dessous à peine plus loin : le bout, arrondi, plonge presque droit
            ext = L * g
            if ext < .01: continue
            w = min(1.2, W / max(.2, r + ext * .5))                                  # demi-largeur angulaire : largeur physique W
            d = math.atan2(math.sin(th - a), math.cos(th - a))
            if abs(d) < w: r += ext * math.cos(d / w * math.pi / 2) ** 1.3   # dos rond (pas de crête ni de lame)
        return r
    m = max(1, round(2 * math.pi * rayon(1.0) / rep))
    anneaux = []
    for z in hauteurs:
        c = axe(z); anneaux.append([A.v(c + Vector((math.cos(2 * math.pi * k / cols) * r_de(2 * math.pi * k / cols, z),
                                                    math.sin(2 * math.pi * k / cols) * r_de(2 * math.pi * k / cols, z), z)), teinte) for k in range(cols)])
    long = [[0.] * cols]
    for i in range(1, len(anneaux)): long.append([long[-1][k] + (anneaux[i][k].co - anneaux[i - 1][k].co).length for k in range(cols)])
    for i in range(len(anneaux) - 1):
        for k in range(cols):
            k2 = (k + 1) % cols; u0 = k / cols * m; u1 = (k + 1) / cols * m
            A.f([anneaux[i][k], anneaux[i][k2], anneaux[i + 1][k2], anneaux[i + 1][k]],
                [(u0, long[i][k] / rep), (u1, long[i][k2] / rep), (u1, long[i + 1][k2] / rep), (u0, long[i + 1][k] / rep)], ECORCE)
    return anneaux

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

def touffe(A, centre, rayon, ech=(1, 1, .85), ncartes=16, taille=1.0, inclin=38, sub=1, jit=.06, coeur=.5):
    """Touffe de feuilles : surtout des bouquets en cartes, répartis dans tout le volume (de 45 à 85 % du rayon) et
    penchés vers l'extérieur ; au milieu, un petit cœur opaque et sombre (coeur × rayon) qui sert seulement de fond
    (pas de ciel au travers du centre), toujours recouvert : jamais de coque nue."""
    c = Vector(centre); E = Vector(ech) * rayon * coeur; E_t = Vector(ech) * rayon
    r = bmesh.ops.create_icosphere(A.bm, subdivisions=sub, radius=1, matrix=Matrix.Translation(c) @ Matrix.Diagonal((*E, 1)))
    vs = r["verts"]
    for v in vs:
        d = v.co - c; v.co = c + d * (1 + A.R.uniform(-jit, jit))
        v[A.col] = (*A.lumiere_feuillage(v.co, -.1), 1); A.normales[v] = A.normale_feuillage(v.co, c)   # fond : plus sombre, comme l'ombre au cœur du feuillage
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
        if d.dot(dehors) < -.8 and A.R.random() < .85: continue        # tout droit vers le cœur de l'arbre : presque rien
        if ncartes <= 0: break
        ncartes -= 1
        p = c + Vector((d.x * E_t.x, d.y * E_t.y, d.z * E_t.z)) * A.R.uniform(.45, .85)
        t = _ortho(d); t = Matrix.Rotation(A.R.uniform(0, 6.28), 3, d) @ t
        b = math.radians(inclin + A.R.uniform(-10, 10)); axe = (t * math.cos(b) + d * math.sin(b)).normalized()
        larg = d.cross(axe).normalized(); L = rayon * taille * A.R.uniform(.85, 1.15)
        carte(A, p - axe * L * .3, axe, larg * L, L, A.R.randrange(2), n_fn, c_fn)

# ------------------------------------------------------------------ 3. l'étage d'aiguilles (sapin)
def etage_aiguilles(A, zb, h, R, lobes=6, rt=.3, tombe=.35, brins=True, H=13.):
    """Un étage de sapin, modelé comme une surface de révolution (et non comme un polygone) : un cône bombé dont le bord
    est un bourrelet à section ronde (tore aplati), ondulé en `lobes` grappes arrondies (le rayon et la retombée suivent
    une sinusoïde, six points par lobe), puis le dessous qui remonte jusqu'au tronc. Le contour, vu de près comme de
    loin, est fait de courbes ; les normales sont celles de la surface lisse, relevées vers le ciel (dessous jamais noir).
    Par-dessus, un brin d'aiguilles au bout de chaque grappe et un dans chaque creux.
    zb : hauteur du bord, h : hauteur de l'étage, R : rayon au bord, rt : rayon du tronc à cet endroit."""
    n = 6 * lobes; ph = A.R.uniform(0, 6.28); bruit = [A.R.uniform(-.03, .03) for _ in range(n)]
    dec = [A.R.uniform(-.25, .25) for _ in range(lobes)]                    # chaque grappe un peu différente
    rho = max(.12, .05 * R)                                                  # rayon de la section du bourrelet
    def th(j): return ph + 2 * math.pi * j / n
    def onde(j):   # 1 au bout d'une grappe, 0 au creux
        k = (j / 6.0); kk = int(k) % lobes
        return .5 + .5 * math.cos(2 * math.pi * k) , kk
    def profil(j):
        w, kk = onde(j); Rr = R * (.88 + .12 * w) * (1 + bruit[j]) * (1 + .06 * dec[kk] * w)
        zr = zb - tombe * w * (1 + dec[kk]) + .05 * h * (1 - w)
        return [(Rr * .58, zb + h * .5), (Rr - rho * .75, zr + rho * .8),
                (Rr, zr), (Rr - rho * .85, zr - rho * .65), (rt * 1.1, zb + h * .32)]
    PR = [profil(j) for j in range(n)]; haut = Vector((0, 0, zb + h))
    def pt(j, i):
        r, z = PR[j][i]; return Vector((math.cos(th(j)) * r, math.sin(th(j)) * r, z))
    # coordonnées de texture : du sommet (v haut) au bord (v bas), puis le dessous
    vv = [.48, .3, .15, .12, .08, .03]
    m = max(1, round(2 * math.pi * R / 5.5))
    def nrm_profil(j, i):   # normale de la courbe de profil (pour orienter les faces), relevée vers le ciel
        a = pt(j, i - 1) if i > 0 else haut; b = pt(j, i + 1) if i + 1 < 5 else pt(j, 4) + (pt(j, 4) - pt(j, 3))
        t = b - a; rad = Vector((math.cos(th(j)), math.sin(th(j)), 0))
        ng = rad * (-t.z) + Vector((0, 0, t.dot(rad)))
        return (ng.normalized() if ng.length > 1e-5 else rad)
    clair = lambda p, bo=0.: A.lumiere_feuillage(p, bo)
    V = [[A.v(pt(j, i), clair(pt(j, i), (.03 * onde(j)[0] if i in (1, 2) else (-.06 if i >= 3 else 0))), nrm_profil(j, i)) for i in range(5)] for j in range(n)]
    vh = A.v(haut, clair(haut, .05), (0, 0, 1))
    faces = []
    for j in range(n):
        j2 = (j + 1) % n; u0, u1 = j / n * m, (j + 1) / n * m
        faces.append(A.f([vh, V[j][0], V[j2][0]], [((u0 + u1) / 2, vv[0]), (u0, vv[1]), (u1, vv[1])], FEUILLAGE))
        for i in range(4):
            faces.append(A.f([V[j][i], V[j][i + 1], V[j2][i + 1], V[j2][i]], [(u0, vv[i + 1]), (u0, vv[i + 2]), (u1, vv[i + 2]), (u1, vv[i + 1])], FEUILLAGE))
    # normales : celles de la surface lisse (moyenne des faces voisines), relevées vers le ciel
    tous = [v for col in V for v in col] + [vh]
    for f in faces:
        if f: f.normal_update()
    for v in tous:
        ng = sum((f.normal for f in v.link_faces), Vector())
        ng = ng.normalized() if ng.length > 1e-5 else Vector((0, 0, 1))
        rad = Vector((v.co.x, v.co.y, 0)); rad = rad.normalized() if rad.length > 1e-3 else Vector()
        A.normales[v] = (ng * .7 + rad * .25 + Vector((0, 0, .5))).normalized()
    if not brins: return
    for j in range(0, n, 3):   # un brin au bout de chaque grappe (j multiple de 6) et un dans chaque creux (j = 6k + 3)
        p = pt(j, 2); q = pt(j, 0); a = th(j); bout = j % 6 == 0
        pente = (p - q).normalized(); tg = Vector((-math.sin(a), math.cos(a), 0)); nn = pente.cross(tg).normalized()
        rot = Matrix.Rotation(math.radians(A.R.uniform(-20, 20)), 3, nn)
        if bout:
            axe = (pente + Vector((0, 0, -.2 + A.R.uniform(-.08, .08)))).normalized(); L = max(.9, min(1.8, R * .44)); k_ = .5
            if A.R.random() < .3: L *= 1.3; k_ = .4
        else:
            axe = (pente + Vector((0, 0, -.1))).normalized(); L = max(.7, min(1.4, R * .34)); k_ = .55
        L *= A.R.uniform(.75, 1.15); axe = rot @ axe; tg = rot @ tg
        for _ in range(6):   # le bout du brin reste au-dessus du sol
            if (p - axe * L * k_ + axe * L).z > .12: break
            axe = (axe + Vector((0, 0, .18))).normalized()
        while (p - axe * L * k_ + axe * L).z < .12 and L > .4: L *= .85
        teinte = A.R.uniform(.82, .95)
        carte(A, p - axe * L * k_, axe, tg * L * A.R.uniform(.8, 1.0), L, A.R.randrange(2),
              lambda q_, pp=p: A.normales.get(V[j][2], Vector((0, 0, 1))), lambda q_, t=teinte: tuple(x * t for x in clair(q_, 0)))
