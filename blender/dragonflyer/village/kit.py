# The Dragon Apprentice Chronicles : le kit de pièces du village (étape 2 de la méthode, dragonflyer/CONCEPTION.md § 7 bis).
# Une poutre, un mur de moellons, un toit de chaume, une porte, une fenêtre, une cheminée… Toutes les maisons et tous les
# objets (village/maisons/*.py, village/objets/*.py) sont faits de ces pièces et des matières de materiaux.py.
# Repère Blender : Z vers le haut, la façade (porte) regarde -Y. Le sol est à z = 0 ; les murs descendent dessous (pentes).
import bpy, bmesh, math, random
from mathutils import Vector, Matrix
from materiaux import M, melange

class Piece:
    """Un objet en construction : bmesh + couleur par sommet (attribut « Col ») ; certaines faces peuvent être lisses."""
    def __init__(s, nom, graine=1):
        s.nom = nom; s.bm = bmesh.new(); s.col = s.bm.verts.layers.float_color.new("Col")
        s.lisse = s.bm.faces.layers.int.new("lisse"); s.R = random.Random(graine)
    def _fin(s, verts, c, bev=0.0, jit=0.0):
        for v in verts: v[s.col] = (*c, 1)
        if jit:
            for v in verts: v.co += Vector((s.R.uniform(-jit, jit), s.R.uniform(-jit, jit), s.R.uniform(-jit, jit)))
        if bev:
            vs = set(verts); edges = list({e for v in verts for e in v.link_edges if e.verts[0] in vs and e.verts[1] in vs})
            r = bmesh.ops.bevel(s.bm, geom=edges, offset=bev, segments=1, affect="EDGES", profile=.5)
            for v in r["verts"]: v[s.col] = (*c, 1)
    def boite(s, centre, taille, c, rz=0.0, rx=0.0, ry=0.0, bev=.03, jit=0.0):
        Mx = Matrix.Translation(Vector(centre)) @ Matrix.Rotation(rz, 4, "Z") @ Matrix.Rotation(ry, 4, "Y") @ Matrix.Rotation(rx, 4, "X") @ Matrix.Diagonal((*taille, 1))
        r = bmesh.ops.create_cube(s.bm, size=1, matrix=Mx); s._fin(r["verts"], c, min(bev, min(taille) * .3), jit); return r["verts"]
    def cylindre(s, a, b, r1, r2, c, n=10, jit=0.0):
        a, b = Vector(a), Vector(b); d = b - a
        Mx = Matrix.Translation((a + b) / 2) @ d.to_track_quat("Z", "Y").to_matrix().to_4x4()
        r = bmesh.ops.create_cone(s.bm, cap_ends=True, segments=n, radius1=r1, radius2=r2, depth=d.length, matrix=Mx); s._fin(r["verts"], c, 0, jit); return r["verts"]
    def sphere(s, centre, rayon, c, ech=(1, 1, 1), sub=2, jit=0.0):
        Mx = Matrix.Translation(Vector(centre)) @ Matrix.Diagonal((*ech, 1))
        r = bmesh.ops.create_icosphere(s.bm, subdivisions=sub, radius=rayon, matrix=Mx); s._fin(r["verts"], c, 0, jit); return r["verts"]
    def ajouter(s, autre, Mx=None):
        """Recopie une autre pièce (un objet du kit déjà construit) dans celle-ci, transformée par Mx."""
        me = bpy.data.meshes.new("tmp"); autre.bm.to_mesh(me)
        if Mx is not None: me.transform(Mx)
        s.bm.from_mesh(me); bpy.data.meshes.remove(me)
    def objet(s, props=None, scene=None):
        scene = scene or bpy.context.scene
        me = bpy.data.meshes.new(s.nom); s.bm.normal_update()
        ls = s.lisse
        for f in s.bm.faces: f.smooth = bool(f[ls])
        s.bm.to_mesh(me); s.bm.free()
        ob = bpy.data.objects.new(s.nom, me); scene.collection.objects.link(ob)
        for k, v in (props or {}).items(): ob[k] = v
        return ob

# ------------------------------------------------------------------ 1. la poutre (tout ce qui est en bois en est fait)
def poutre(P, a, b, l=.2, h=.2, mat="chene", c=None, bev=.035, tordu=.0):
    """Poutre équarrie de a à b, section l × h, arêtes chanfreinées, légèrement irrégulière (bois taillé à la main)."""
    a, b = Vector(a), Vector(b); d = b - a; L = d.length
    q = d.to_track_quat("Z", "Y" if abs(d.normalized().z) < .95 else "X")
    Mx = Matrix.Translation((a + b) / 2) @ q.to_matrix().to_4x4() @ Matrix.Rotation(P.R.uniform(-tordu, tordu), 4, "Z") @ Matrix.Diagonal((l, h, L, 1))
    r = bmesh.ops.create_cube(P.bm, size=1, matrix=Mx)
    P._fin(r["verts"], c or M(mat).couleur(P.R), bev, .008); return r["verts"]

def planche(P, centre, taille, rz=0.0, mat="chene_c"):
    """Une planche (assise, caisse, volet) : une poutre plate, taille = (longueur, largeur, épaisseur) le long de x tourné de rz."""
    x, y, z = centre; L = taille[0] / 2
    return poutre(P, (x - math.cos(rz) * L, y - math.sin(rz) * L, z), (x + math.cos(rz) * L, y + math.sin(rz) * L, z), l=taille[1], h=taille[2], mat=mat, bev=.015)

# ------------------------------------------------------------------ 2. le mur de moellons
def moellon(P, centre, lu, hz, rz, n, ep=.24):
    """Une pierre des champs : bloc dont seule la face visible est arrondie (chanfrein) ; la face cachée dans le mur
    n'existe pas (économie de triangles). n : direction de la face visible."""
    Mx = Matrix.Translation(Vector(centre)) @ Matrix.Rotation(rz, 4, "Z") @ Matrix.Rotation(P.R.uniform(-.03, .03), 4, "X") @ Matrix.Diagonal((lu, ep, hz, 1))
    r = bmesh.ops.create_cube(P.bm, size=1, matrix=Mx); vs = r["verts"]
    fs = list({f for v in vs for f in v.link_faces}); P.bm.normal_update()
    dedans = min(fs, key=lambda f: f.normal.dot(n)); devant = max(fs, key=lambda f: f.normal.dot(n))
    bord = list(devant.edges)
    bmesh.ops.delete(P.bm, geom=[dedans], context="FACES_ONLY")
    c = M("moellon").couleur(P.R, .1)
    if P.R.random() < .12: c = tuple(x * P.R.choice((.82, .9)) for x in c)   # quelques pierres plus sombres   # quelques pierres nettement plus sombres ou plus claires
    for v in vs: v[P.col] = (*c, 1); v.co += Vector((P.R.uniform(-.02, .02), P.R.uniform(-.02, .02), P.R.uniform(-.02, .02)))
    rb = bmesh.ops.bevel(P.bm, geom=bord, offset=min(.07, hz * .25, lu * .2), segments=1, affect="EDGES", profile=.5)
    for v in rb["verts"]: v[P.col] = (*c, 1)

def assises(z0, z1, taille):
    """Hauteurs des rangs de pierres, les mêmes pour tous les murs d'une maison (les coins se croisent juste)."""
    R = random.Random(int(z0 * 100) + 7); z = z0; L = []
    while z < z1 - .05:
        hz = min(taille * R.uniform(.62, .88), z1 - z); L.append((z, hz)); z += hz
    return L

def mur_moellons(P, a, b, z0, z1, ouvertures=(), taille=.5, saillie=.07):
    """Pierres des champs en assises irrégulières sur la face extérieure d'un mur de a vers b (horizontal) ; la face
    regarde à droite de a→b. ouvertures : [(u0, u1, z0, z1)] le long du mur : les pierres s'arrêtent net au bord
    (coupées à la longueur qu'il faut : jamais de trou de mortier). Aux deux coins, chaînage de grandes pierres
    alternées long / court (le coin de départ est long aux rangs pairs, celui d'arrivée aux rangs impairs : deux murs
    qui se rejoignent se croisent)."""
    a, b = Vector((*a[:2], 0)), Vector((*b[:2], 0)); d = b - a; L = d.length; t = d / L; n = Vector((t.y, -t.x, 0)); rz = math.atan2(t.y, t.x)
    for rang, (z, hz) in enumerate(assises(z0, z1, taille)):
        lc0 = taille * (1.5 if rang % 2 == 0 else .9); lc1 = taille * (.9 if rang % 2 == 0 else 1.5)
        libres = [(lc0 - .1, L - lc1 + .1)]
        for (o0, o1, oz0, oz1) in ouvertures:
            if oz0 < z + hz - .04 and z + .04 < oz1:
                nl = []
                for (u0, u1) in libres:
                    if o1 <= u0 or o0 >= u1: nl.append((u0, u1)); continue
                    if o0 > u0: nl.append((u0, o0))
                    if o1 < u1: nl.append((o1, u1))
                libres = nl
        c0, c1 = (-.1, lc0 - .1), (L - lc1 + .1, L + .1)
        for (o0, o1, oz0, oz1) in ouvertures:   # une pierre d'angle s'arrête aussi au bord d'une ouverture (volets)
            if oz0 < z + hz - .04 and z + .04 < oz1:
                if o0 < c0[1] and o1 > c0[0]: c0 = (c0[0], max(c0[0] + .05, o0))
                if o1 > c1[0] and o0 < c1[1]: c1 = (min(c1[1] - .05, o1), c1[1])
        pieces = [(u0, u1, True) for (u0, u1) in (c0, c1) if u1 - u0 > .12] + [(u0, u1, False) for (u0, u1) in libres if u1 - u0 > .08]
        for (u0, u1, coin) in pieces:
            k = 1 if coin else max(1, round((u1 - u0) / (taille * 1.3)))
            cuts = sorted([u0, u1] + [u0 + (u1 - u0) * (i + P.R.uniform(-.25, .25)) / k for i in range(1, k)])
            for i in range(k):
                v0, v1 = cuts[i], cuts[i + 1]; uc = (v0 + v1) / 2
                p = a + t * uc + n * (saillie * .5 + (.03 if coin else P.R.uniform(-.015, .02)))
                moellon(P, (p.x, p.y, z + hz / 2), v1 - v0 - .045, hz - .045, rz + (0 if coin else P.R.uniform(-.025, .025)), n, ep=.28 if coin else .24)

# ------------------------------------------------------------------ 3. le toit de chaume
def _smin(a, b, k):
    h = max(k - abs(a - b), 0) / k; return min(a, b) - h * h * k * .25

class ToitChaume:
    """Toit de chaume à croupes, faîte selon X, qui couvre le rectangle |x-cx| < X, |y-cy| < Y (débord compris).
    Coque épaisse : dessus en rangs de bottes (une marche tous les 45 cm de pente, ombre sous chaque rang), mèches de
    paille dans le sens de la pente, un peu de mousse ; rebord en deux rangs avec une frange ; dessous en paille claire
    porté par des chevrons ; faîtage tressé posé dans la crête. sourcils : [(x, largeur, hauteur)] : le bord avant se
    soulève au-dessus d'une porte. cheminees : [(x, y, r)] : le chaume remonte autour (solin)."""
    def __init__(s, cx, cy, X, Y, z_bord, z_faite, croupe=1.0, ep=.42, sourcils=(), cheminees=(), z_demi=None):
        """z_demi : hauteur où commence la demi-croupe (en dessous, les bouts sont des pignons droits)."""
        s.cx, s.cy, s.X, s.Y, s.zb, s.zf, s.croupe, s.ep, s.sourcils, s.cheminees = cx, cy, X, Y, z_bord, z_faite, croupe, ep, sourcils, cheminees
        s.zd = z_demi if z_demi is not None else z_bord
        s.k = (z_faite - z_bord) / Y; s.xr = X - croupe; s.kc = (z_faite + .1 - s.zd) / croupe
    def forme(s, x, y):
        """Hauteur lisse du dessus, et 1 si on est sur une croupe (mèches selon Y) ou 0 sur un pan (mèches selon X)."""
        dx, dy = x - s.cx, y - s.cy
        g = s.zf - s.k * math.sqrt(dy * dy + .02)
        h = s.zf + .1 - s.kc * max(0.0, math.sqrt(dx * dx + .01) - s.xr)
        h = max(h, s.zd)                               # demi-croupe : la croupe s'arrête à z_demi, dessous c'est un pignon
        z = _smin(g, h, .35)
        for (sx, sl, sh) in s.sourcils:
            if dy < 0: z += sh * math.exp(-((dx - sx) / sl) ** 2) * max(0.0, min(1.0, (-dy - s.Y * .35) / (s.Y * .5)))
        return z, (1.0 if h < g and h > s.zd + .02 else 0.0)
    def dessus(s, x, y):
        z, cr = s.forme(x, y); pente = s.kc if cr else s.k
        d = (s.zf - z) / max(pente, .3)
        return z + .06, d, cr   # dessus des rangs de chaume
    def _contours(s, zc, pas=.1):
        """Courbes de niveau du dessus lisse à la hauteur zc (carrés de marche), en polylignes."""
        cx, cy, X, Y = s.cx, s.cy, s.X, s.Y
        nx, ny = int(2 * X / pas) + 1, int(2 * Y / pas) + 1
        xs = [cx - X + 2 * X * i / (nx - 1) for i in range(nx)]; ys = [cy - Y + 2 * Y * j / (ny - 1) for j in range(ny)]
        F = [[s.forme(x, y)[0] - zc for y in ys] for x in xs]
        segs = []
        def pt(i0, j0, i1, j1):
            a, b = F[i0][j0], F[i1][j1]; t = a / (a - b)
            return (round(xs[i0] + (xs[i1] - xs[i0]) * t, 5), round(ys[j0] + (ys[j1] - ys[j0]) * t, 5))
        for i in range(nx - 1):
            for j in range(ny - 1):
                c = [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]
                e = []
                for k in range(4):
                    (a0, b0), (a1, b1) = c[k], c[(k + 1) % 4]
                    if (F[a0][b0] > 0) != (F[a1][b1] > 0): e.append(pt(a0, b0, a1, b1))
                if len(e) == 2: segs.append((e[0], e[1]))
                elif len(e) == 4: segs += [(e[0], e[1]), (e[2], e[3])]
        voisins = {}
        for a, b in segs: voisins.setdefault(a, []).append(b); voisins.setdefault(b, []).append(a)
        vus, lignes = set(), []
        for depart in sorted(voisins, key=lambda p: len(voisins[p])):
            if depart in vus: continue
            ligne = [depart]; vus.add(depart); cur = depart
            while True:
                nxt = [q for q in voisins[cur] if q not in vus]
                if not nxt: break
                cur = nxt[0]; ligne.append(cur); vus.add(cur)
            if len(ligne) > 3: lignes.append(ligne)
        return lignes
    def _pente(s, x, y):
        e = .05; gx = (s.forme(x + e, y)[0] - s.forme(x - e, y)[0]) / (2 * e); gy = (s.forme(x, y + e)[0] - s.forme(x, y - e)[0]) / (2 * e)
        l = math.hypot(gx, gy) or 1; return -gx / l, -gy / l
    def dedans(s, x, y): return abs(x - s.cx) <= s.X + 1e-6 and abs(y - s.cy) <= s.Y + 1e-6
    def construire(s, P, pas=.3, dz=.3, pas_meche=.13):
        """Coque grossière (forme, dessous, rebord), puis le chaume posé en RANGS : chaque rang suit une courbe de niveau
        du toit, descend la pente en recouvrant le rang du dessous, et finit en mèches de longueurs inégales.
        Le rang du bas fait la frange de l'avant-toit."""
        R = P.R; cx, cy, X, Y = s.cx, s.cy, s.X, s.Y; bm, col, ls = P.bm, P.col, P.lisse
        def quad(a, b, c, d_):
            try: f = bm.faces.new((a, b, c, d_)); f[ls] = 1
            except ValueError: pass
        # 1. coque : dessus sombre (on ne le voit qu'entre les rangs), dessous en paille, rebord
        nx, ny = int(2 * X / pas) + 1, int(2 * Y / pas) + 1
        Vd = [[None] * ny for _ in range(nx)]; Vs = [[None] * ny for _ in range(nx)]
        for i in range(nx):
            for j in range(ny):
                x = cx - X + 2 * X * i / (nx - 1); y = cy - Y + 2 * Y * j / (ny - 1); z = s.forme(x, y)[0]
                v = bm.verts.new((x, y, z - .04)); v[col] = (*M("chaume_f").teintes[1], 1); Vd[i][j] = v
                w = bm.verts.new((cx + (x - cx) * .97, cy + (y - cy) * .97, z - s.ep)); w[col] = (*[min(1, c_ * 2.0) for c_ in melange(M("chaume").teintes[(i * 2 + j) % 3], M("chaume_f").teintes[0], .1 + .15 * ((i + j) % 2))], 1); Vs[i][j] = w   # très clair : l'occlusion cuite le ramènera à un doré d'ombre
        for i in range(nx - 1):
            for j in range(ny - 1):
                quad(Vd[i][j], Vd[i + 1][j], Vd[i + 1][j + 1], Vd[i][j + 1]); quad(Vs[i][j], Vs[i][j + 1], Vs[i + 1][j + 1], Vs[i + 1][j])
        # le bord de la coque se referme simplement (il est caché par le rang de rive, plus bas)
        tour = [(i, 0) for i in range(nx - 1)] + [(nx - 1, j) for j in range(ny - 1)] + [(i, ny - 1) for i in range(nx - 1, 0, -1)] + [(0, j) for j in range(ny - 1, 0, -1)]
        nT = len(tour)
        for t in range(nT):
            (i0, j0), (i1, j1) = tour[t], tour[(t + 1) % nT]
            quad(Vd[i0][j0], Vs[i0][j0], Vs[i1][j1], Vd[i1][j1])
        # 2. rangs de chaume
        zc = max(s.forme(s.cx, s.cy)[0], s.forme(s.cx + s.xr * .5, s.cy)[0]) + .01; rang = 0
        while zc > s.zb - .3:
            for ligne in s._contours(zc):
                # rééchantillonnage régulier le long de la courbe
                pts = [ligne[0]]; reste = 0.0
                for a, b in zip(ligne, ligne[1:]):
                    L = math.hypot(b[0] - a[0], b[1] - a[1]); t = pas_meche - reste
                    while t < L: pts.append((a[0] + (b[0] - a[0]) * t / L, a[1] + (b[1] - a[1]) * t / L)); t += pas_meche
                    reste = L - (t - pas_meche)
                pts.append(ligne[-1])
                if len(pts) < 3: continue
                rh, rm, rp = [], [], []
                for k, (x, y) in enumerate(pts):
                    gx, gy = s._pente(x, y)
                    # descendre la pente jusqu'à recouvrir le rang du dessous (ou jusqu'au bord du toit)
                    bx, by = x, y; n_ = 0
                    while n_ < 60 and s.dedans(bx + gx * .05, by + gy * .05) and s.forme(bx, by)[0] > zc - dz * 1.25: bx += gx * .05; by += gy * .05; n_ += 1
                    zb_ = s.forme(bx, by)[0]
                    bord = not s.dedans(bx + gx * .06, by + gy * .06)
                    lg = R.choice((.05, .09, .13, .17)) if not bord else .1 + .035 * math.sin(k * 1.9) + .025 * math.sin(k * .7) + R.uniform(-.015, .015)
                    teinte = M("chaume").teintes[R.randrange(3)]
                    h = bm.verts.new((x, y, zc + .02)); h[col] = (*melange(teinte, M("chaume_f").teintes[0], .55), 1)
                    m = bm.verts.new((bx, by, zb_ + .09)); m[col] = (*melange(teinte, (1, .92, .66), .08 + .1 * (k % 2)), 1)
                    p = bm.verts.new((bx + gx * lg, by + gy * lg, zb_ + .09 - lg * (.9 if not bord else 1.2))); p[col] = (*melange(teinte, (1, .95, .75), .22), 1)
                    rh.append(h); rm.append(m); rp.append(p)
                trou = lambda q: any(abs(q[0] - hx) < hr + .08 and abs(q[1] - hy) < hr + .08 for (hx, hy, hr) in s.cheminees)
                for k in range(len(pts) - 1):
                    if trou(pts[k]) or trou(pts[k + 1]) or trou((rm[k].co.x, rm[k].co.y)) or trou((rm[k + 1].co.x, rm[k + 1].co.y)): continue
                    quad(rh[k], rm[k], rm[k + 1], rh[k + 1]); quad(rm[k], rp[k], rp[k + 1], rm[k + 1])
            zc -= dz; rang += 1
        # 3. rang de rive : tout le tour du toit (égouts et rives des pignons), un rang de mèches qui passe par-dessus le
        #    bord et retombe dehors, de la même paille que les autres rangs (pas de boudin lisse)
        coins = [(cx - X, cy - Y), (cx + X, cy - Y), (cx + X, cy + Y), (cx - X, cy + Y)]
        for c in range(4):
            (ax, ay), (bx2, by2) = coins[c], coins[(c + 1) % 4]
            L = math.hypot(bx2 - ax, by2 - ay); n = int(L / pas_meche); tx, ty = (bx2 - ax) / L, (by2 - ay) / L; ox, oy = ty, -tx   # dehors
            rh, rm, rp = [], [], []
            for k in range(n + 1):
                x, y = ax + tx * L * k / n, ay + ty * L * k / n
                x -= ox * .22; y -= oy * .22; z = s.forme(x, y)[0]
                teinte = M("chaume").teintes[R.randrange(3)]
                lg = .12 + .04 * math.sin(k * 1.9 + c) + .03 * math.sin(k * .7) + R.uniform(-.02, .02)
                h = bm.verts.new((x, y, z + .07)); h[col] = (*melange(teinte, M("chaume_f").teintes[0], .35), 1)
                m = bm.verts.new((x + ox * .3, y + oy * .3, z - .1)); m[col] = (*[min(1, c_ * 1.35) for c_ in melange(teinte, (1, .92, .66), .15 + .08 * (k % 2))], 1)
                p_ = bm.verts.new((x + ox * (.36 + lg * .2), y + oy * (.36 + lg * .2), z - .1 - lg)); p_[col] = (*[min(1, c_ * 1.35) for c_ in melange(teinte, (1, .95, .75), .25)], 1)
                rh.append(h); rm.append(m); rp.append(p_)
            for k in range(n):
                quad(rh[k], rm[k], rm[k + 1], rh[k + 1]); quad(rm[k], rp[k], rp[k + 1], rm[k + 1])
        # 4. faîtage : boudin tressé posé dans la crête (enfoncé d'un tiers), qui suit la vraie hauteur du toit
        xs = [cx - s.xr - .2 + k * .45 for k in range(int((2 * s.xr + .4) / .45) + 1)]
        pts = [Vector((x, cy, s.forme(x, cy)[0] + .1)) for x in xs]
        for k in range(len(pts) - 1): P.cylindre(pts[k], pts[k + 1] + (pts[k + 1] - pts[k]) * .06, .23, .23, M("chaume_f").couleur(R), n=6)
        for p in pts[1:-1:2]: P.cylindre(p - Vector((.035, 0, 0)), p + Vector((.035, 0, 0)), .22, .22, M("chene").sombre, n=6)
        return s

def chevrons(P, toit, murs, z_mur, pas_=.95):
    """Chevrons de bois sous l'avant-toit : du haut du mur jusque sous le rebord, tous les 95 cm.
    murs : [(a, b)] segments des faces de murs (l'extérieur à droite de a→b)."""
    for (a, b) in murs:
        a, b = Vector((*a, 0)), Vector((*b, 0)); d = b - a; L = d.length; t = d / L; n = Vector((t.y, -t.x, 0))
        for k in range(1, int(L / pas_)):
            p = a + t * (k * L / int(L / pas_))
            q = p + n * .55
            zq = toit.forme(q.x, q.y)[0] - toit.ep - .06
            poutre(P, (p.x - n.x * .1, p.y - n.y * .1, z_mur - .1), (q.x, q.y, zq), l=.12, h=.12, bev=0)

def pignon_planches(P, x, y0, y1, z0, toit, sens=1, larg=.3, sauf=()):
    """Pignon en planches verticales (bois patiné) entre le haut du mur (z0) et le dessous du toit, sur le plan x ;
    sens : +1 si l'extérieur est vers +X. sauf : [(y0, y1)] : pas de planche (cheminée). Une planche de rive le borde."""
    n = int((y1 - y0) / larg)
    for i in range(n):
        y = y0 + (i + .5) * (y1 - y0) / n
        if any(a_ < y < b_ for (a_, b_) in sauf): continue
        zt = toit.forme(x, y)[0] - toit.ep * .6
        if zt - z0 < .08: continue
        P.boite((x + sens * (.02 + .02 * (i % 2)), y, (z0 + zt) / 2), (.1, (y1 - y0) / n * 1.06, zt - z0), M("chene").couleur(P.R, .16), bev=0)   # planches jointives, un peu chevauchées
    P.boite((x + sens * .07, (y0 + y1) / 2, z0 + .05), (.12, y1 - y0, .14), M("chene").sombre, bev=0)   # sablière sous les planches

# ------------------------------------------------------------------ 4. ouvertures : porte et fenêtre
def arc_pierres(P, centre, rayon, profondeur=.3, n=9, rz=0.0):
    """Arc en claveaux de pierre au-dessus d'une porte (demi-cercle de centre « centre », dans le plan du mur)."""
    x, y, z = centre; ca, sa = math.cos(rz), math.sin(rz)
    for i in range(n):
        a = math.pi * (i + .5) / n; r = rayon + .14
        px, pz = math.cos(a) * r, math.sin(a) * r
        P.boite((x + ca * px, y + sa * px, z + pz), (.3, profondeur, rayon * math.pi / n * .92), M("moellon").couleur(P.R, .04), rz=rz, ry=-a, bev=.05, jit=.01)

def porte(P, centre, l=1.15, h=2.0, mat="peint", rz=0.0):
    """Porte cintrée en planches (bleues), pentures de fer, anneau, seuil de pierre ; arc de claveaux au-dessus.
    centre = milieu du seuil, sur la face du mur."""
    x, y, z = centre; r = l / 2; hd = h - r; n = 5
    for i in range(n):   # planches : le haut suit l'arc
        u = -r + (i + .5) * l / n; ht = hd + math.sqrt(max(0, r * r - u * u)) * .98
        P.boite((x + u, y + .02, z + ht / 2), (l / n * .94, .1, ht), M(mat).couleur(P.R, .05), bev=.015)
    for zz in (.35, hd - .15): P.boite((x - .1, y - .05, z + zz), (l * .8, .04, .09), M("fer").couleur(P.R), bev=0)   # pentures
    P.cylindre((x + r * .55, y - .08, z + 1.0), (x + r * .55, y - .03, z + 1.0), .07, .07, M("fer").couleur(P.R), n=8)  # anneau
    for s in (-1, 1): poutre(P, (x + s * (r + .08), y, z), (x + s * (r + .08), y, z + hd), l=.16, h=.24, mat="chene")
    arc_pierres(P, (x, y - .02, z + hd), r)
    P.boite((x, y - .34, z + .01), (l + .45, .72, .22), M("moellon").couleur(P.R), bev=.07, jit=.015)   # seuil : une vraie marche (12 cm)

def fenetre(V, P, centre, rz=0.0, l=.75, h=.8, volets=True, jardiniere=True):
    """Fenêtre à petits carreaux : cadre de poutres, croisillons, appui de pierre, volets bleus, jardinière fleurie.
    La vitre est dans V (objet W_ qui s'éclaire la nuit). rz : 0 = mur de façade (-Y), ±π/2 = murs de côté."""
    x, y, z = centre; ca, sa = math.cos(rz), math.sin(rz); ox, oy = sa, -ca   # vers l'extérieur
    def pt(u, w, dz): return (x + ca * u + ox * w, y + sa * u + oy * w, z + dz)
    V.boite(pt(0, -.02, 0), (l, .06, h), M("vitre").teintes[0], rz=rz, bev=0)
    for s in (-1, 1): poutre(P, pt(s * (l / 2 + .07), .02, -h / 2 - .1), pt(s * (l / 2 + .07), .02, h / 2 + .1), l=.14, h=.16)
    poutre(P, pt(-l / 2 - .2, .03, h / 2 + .12), pt(l / 2 + .2, .03, h / 2 + .12), l=.18, h=.2)   # linteau
    poutre(P, pt(0, .0, -h / 2), pt(0, .0, h / 2), l=.05, h=.06, mat="chene_c", bev=.01)          # croisillons
    poutre(P, pt(-l / 2, .0, 0), pt(l / 2, .0, 0), l=.05, h=.06, mat="chene_c", bev=.01)
    P.boite(pt(0, .1, -h / 2 - .1), (l + .4, .3, .12), M("moellon").couleur(P.R), rz=rz, bev=.04)   # appui
    if volets:
        for s in (-1, 1):
            cs = s * (l / 2 + .12 + l * .25)
            for k in range(3):
                P.boite(pt(cs + (k - 1) * l * .5 / 3, .07, 0), (l * .5 / 3 * .95, .06, h + .12), M("peint").couleur(P.R, .05), rz=rz, bev=.012)
            P.boite(pt(cs, .11, h * .25), (l * .5, .03, .06), M("fer").couleur(P.R), rz=rz, bev=0)
    if jardiniere:
        P.boite(pt(0, .3, -h / 2 - .27), (l + .25, .28, .24), M("chene_c").couleur(P.R), rz=rz, bev=.03)
        for i in range(7):
            u = -l / 2 + (i + .5) * l / 7 + P.R.uniform(-.04, .04)
            P.sphere(pt(u, .3 + P.R.uniform(-.06, .06), -h / 2 - .12), .1, M("feuillage").couleur(P.R), (1, 1, .8), sub=1, jit=.02)
            if i % 2 == 0: P.sphere(pt(u + .03, .26, -h / 2 - .02 + P.R.uniform(0, .05)), .055, M("fleur").couleur(P.R), sub=1)

# ------------------------------------------------------------------ 5. cheminée
def cheminee(P, x, y, z0, z1, larg=.9, rz=0.0, toit=None, base=1.35, z_epaule=1.7):
    """Cheminée de moellons collée à un pignon : fondation large posée au sol jusqu'à l'épaulement (z_epaule), deux rangs
    qui se resserrent, puis le conduit jusqu'à z1 ; chapeau de pierre plate et pot de terre cuite. Si toit est donné,
    un solin de pierres plates entoure le conduit là où il traverse le chaume."""
    z = z0; rang = 0
    while z < z1:
        hz = P.R.uniform(.3, .38)
        if z < z_epaule: w = larg * base
        elif z < z_epaule + .7: w = larg * (base - (base - 1) * (z - z_epaule) / .7)
        else: w = larg
        sep = (.18 if rang % 2 else -.18) * w                 # deux pierres par rang, joint décalé d'un rang à l'autre
        for (u0, u1) in ((-w / 2, sep), (sep, w / 2)):
            uc = (u0 + u1) / 2
            P.boite((x + uc * math.cos(rz), y + uc * math.sin(rz), z + hz / 2), (u1 - u0 - .035, w, hz - .035),
                    M("moellon").couleur(P.R, .1), rz=rz + P.R.uniform(-.03, .03), bev=.06, jit=.012)
        z += hz; rang += 1
    P.boite((x, y, z + .06), (larg * 1.12, larg * 1.12, .14), M("moellon").couleur(P.R, .03), rz=rz, bev=.04)
    P.cylindre((x, y, z + .1), (x, y, z + .5), .17, .14, M("terre").couleur(P.R), n=8)
    if toit is not None:
        zr = max(toit.forme(x + dx_, y + dy_)[0] for dx_ in (-larg / 2, larg / 2) for dy_ in (-larg / 2, larg / 2))
        P.boite((x, y, zr - .02), (larg + .16, larg + .16, .2), M("moellon").couleur(P.R, .03), rz=rz, bev=.05)   # collerette basse serrée sur le conduit

def pignon_planches(P, x, y0, y1, z0, toit, sens=1, larg=.3, sauf=()):
    """Pignon en planches verticales (bois patiné) entre le haut du mur (z0) et le dessous du toit, sur le plan x ;
    sens : +1 si l'extérieur est vers +X. sauf : [(y0, y1)] : pas de planche (cheminée). Une planche de rive le borde."""
    n = int((y1 - y0) / larg)
    for i in range(n):
        y = y0 + (i + .5) * (y1 - y0) / n
        if any(a_ < y < b_ for (a_, b_) in sauf): continue
        zt = toit.forme(x, y)[0] - toit.ep * .6
        if zt - z0 < .08: continue
        P.boite((x + sens * (.02 + .02 * (i % 2)), y, (z0 + zt) / 2), (.1, (y1 - y0) / n * 1.06, zt - z0), M("chene").couleur(P.R, .16), bev=0)   # planches jointives, un peu chevauchées
    P.boite((x + sens * .07, (y0 + y1) / 2, z0 + .05), (.12, y1 - y0, .14), M("chene").sombre, bev=0)   # sablière sous les planches

# ------------------------------------------------------------------ 4. ouvertures : porte et fenêtre
def arc_pierres(P, centre, rayon, profondeur=.3, n=9, rz=0.0):
    """Arc en claveaux de pierre au-dessus d'une porte (demi-cercle de centre « centre », dans le plan du mur)."""
    x, y, z = centre; ca, sa = math.cos(rz), math.sin(rz)
    for i in range(n):
        a = math.pi * (i + .5) / n; r = rayon + .14
        px, pz = math.cos(a) * r, math.sin(a) * r
        P.boite((x + ca * px, y + sa * px, z + pz), (.3, profondeur, rayon * math.pi / n * .92), M("moellon").couleur(P.R, .04), rz=rz, ry=-a, bev=.05, jit=.01)

def porte(P, centre, l=1.15, h=2.0, mat="peint", rz=0.0):
    """Porte cintrée en planches (bleues), pentures de fer, anneau, seuil de pierre ; arc de claveaux au-dessus.
    centre = milieu du seuil, sur la face du mur."""
    x, y, z = centre; r = l / 2; hd = h - r; n = 5
    for i in range(n):   # planches : le haut suit l'arc
        u = -r + (i + .5) * l / n; ht = hd + math.sqrt(max(0, r * r - u * u)) * .98
        P.boite((x + u, y + .02, z + ht / 2), (l / n * .94, .1, ht), M(mat).couleur(P.R, .05), bev=.015)
    for zz in (.35, hd - .15): P.boite((x - .1, y - .05, z + zz), (l * .8, .04, .09), M("fer").couleur(P.R), bev=0)   # pentures
    P.cylindre((x + r * .55, y - .08, z + 1.0), (x + r * .55, y - .03, z + 1.0), .07, .07, M("fer").couleur(P.R), n=8)  # anneau
    for s in (-1, 1): poutre(P, (x + s * (r + .08), y, z), (x + s * (r + .08), y, z + hd), l=.16, h=.24, mat="chene")
    arc_pierres(P, (x, y - .02, z + hd), r)
    P.boite((x, y - .34, z + .01), (l + .45, .72, .22), M("moellon").couleur(P.R), bev=.07, jit=.015)   # seuil : une vraie marche (12 cm)

def fenetre(V, P, centre, rz=0.0, l=.75, h=.8, volets=True, jardiniere=True):
    """Fenêtre à petits carreaux : cadre de poutres, croisillons, appui de pierre, volets bleus, jardinière fleurie.
    La vitre est dans V (objet W_ qui s'éclaire la nuit). rz : 0 = mur de façade (-Y), ±π/2 = murs de côté."""
    x, y, z = centre; ca, sa = math.cos(rz), math.sin(rz); ox, oy = sa, -ca   # vers l'extérieur
    def pt(u, w, dz): return (x + ca * u + ox * w, y + sa * u + oy * w, z + dz)
    V.boite(pt(0, -.02, 0), (l, .06, h), M("vitre").teintes[0], rz=rz, bev=0)
    for s in (-1, 1): poutre(P, pt(s * (l / 2 + .07), .02, -h / 2 - .1), pt(s * (l / 2 + .07), .02, h / 2 + .1), l=.14, h=.16)
    poutre(P, pt(-l / 2 - .2, .03, h / 2 + .12), pt(l / 2 + .2, .03, h / 2 + .12), l=.18, h=.2)   # linteau
    poutre(P, pt(0, .0, -h / 2), pt(0, .0, h / 2), l=.05, h=.06, mat="chene_c", bev=.01)          # croisillons
    poutre(P, pt(-l / 2, .0, 0), pt(l / 2, .0, 0), l=.05, h=.06, mat="chene_c", bev=.01)
    P.boite(pt(0, .1, -h / 2 - .1), (l + .4, .3, .12), M("moellon").couleur(P.R), rz=rz, bev=.04)   # appui
    if volets:
        for s in (-1, 1):
            cs = s * (l / 2 + .12 + l * .25)
            for k in range(3):
                P.boite(pt(cs + (k - 1) * l * .5 / 3, .07, 0), (l * .5 / 3 * .95, .06, h + .12), M("peint").couleur(P.R, .05), rz=rz, bev=.012)
            P.boite(pt(cs, .11, h * .25), (l * .5, .03, .06), M("fer").couleur(P.R), rz=rz, bev=0)
    if jardiniere:
        P.boite(pt(0, .3, -h / 2 - .27), (l + .25, .28, .24), M("chene_c").couleur(P.R), rz=rz, bev=.03)
        for i in range(7):
            u = -l / 2 + (i + .5) * l / 7 + P.R.uniform(-.04, .04)
            P.sphere(pt(u, .3 + P.R.uniform(-.06, .06), -h / 2 - .12), .1, M("feuillage").couleur(P.R), (1, 1, .8), sub=1, jit=.02)
            if i % 2 == 0: P.sphere(pt(u + .03, .26, -h / 2 - .02 + P.R.uniform(0, .05)), .055, M("fleur").couleur(P.R), sub=1)

# ------------------------------------------------------------------ 5. cheminée
def cheminee(P, x, y, z0, z1, larg=.9, rz=0.0, toit=None, base=1.35, z_epaule=1.7):
    """Cheminée de moellons collée à un pignon : fondation large posée au sol jusqu'à l'épaulement (z_epaule), deux rangs
    qui se resserrent, puis le conduit jusqu'à z1 ; chapeau de pierre plate et pot de terre cuite. Si toit est donné,
    un solin de pierres plates entoure le conduit là où il traverse le chaume."""
    z = z0; rang = 0
    while z < z1:
        hz = P.R.uniform(.3, .38)
        if z < z_epaule: w = larg * base
        elif z < z_epaule + .7: w = larg * (base - (base - 1) * (z - z_epaule) / .7)
        else: w = larg
        sep = (.18 if rang % 2 else -.18) * w                 # deux pierres par rang, joint décalé d'un rang à l'autre
        for (u0, u1) in ((-w / 2, sep), (sep, w / 2)):
            uc = (u0 + u1) / 2
            P.boite((x + uc * math.cos(rz), y + uc * math.sin(rz), z + hz / 2), (u1 - u0 - .035, w, hz - .035),
                    M("moellon").couleur(P.R, .1), rz=rz + P.R.uniform(-.03, .03), bev=.06, jit=.012)
        z += hz; rang += 1
    P.boite((x, y, z + .06), (larg * 1.12, larg * 1.12, .14), M("moellon").couleur(P.R, .03), rz=rz, bev=.04)
    P.cylindre((x, y, z + .1), (x, y, z + .5), .17, .14, M("terre").couleur(P.R), n=8)
    if toit is not None:
        c = M("moellon").couleur(P.R, .03)
        for k in range(4):   # quatre dalles qui ne se croisent pas, posées sur le chaume
            a = rz + k * math.pi / 2; ox, oy = math.cos(a), math.sin(a)
            px, py = x + ox * (larg * .5 + .12), y + oy * (larg * .5 + .12)
            P.boite((px, py, toit.dessus(px, py)[0] + .05), (.24, larg + .2 if k % 2 else larg - .02, .1), c, rz=a, bev=.03)
