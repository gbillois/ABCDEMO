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
    P._fin(r["verts"], c or M(mat).couleur(P.R), bev if min(l, h) >= .15 else 0, .008); return r["verts"]   # les bois fins ne sont pas chanfreinés (triangles)

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
        hz = taille * R.uniform(.62, .88)
        if z1 - z - hz < .2: hz = z1 - z   # pas de dernier rang en plaquette : le rang du dessus absorbe le reste
        L.append((z, hz)); z += hz
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
                v = bm.verts.new((x, y, z - .04)); v[col] = (*melange(M("chaume_f").teintes[1], M("chaume").teintes[0], .25), 1); Vd[i][j] = v   # entre les rangs : paille sombre (pas d'orange)
                w = bm.verts.new((cx + (x - cx) * .97, cy + (y - cy) * .97, z - s.ep)); w[col] = (*[min(1, c_ * (1.75 if (i + j) % 2 else 1.25)) for c_ in melange(M("chaume_d").teintes[(i * 2 + j) % 3], M("chaume").teintes[0], .2)], 1); Vs[i][j] = w   # dessous brun chaud, en bandes (l'occlusion cuite l'assombrit)
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
                lg = (.12 + .04 * math.sin(k * 1.9 + c) + .03 * math.sin(k * .7) + R.uniform(-.02, .02)) * min(1.0, min(k, n - k) / 3)   # courtes aux coins
                h = bm.verts.new((x, y, z + .07)); h[col] = (*melange(teinte, M("chaume_f").teintes[0], .35), 1)
                m = bm.verts.new((x + ox * .3, y + oy * .3, z - .1)); m[col] = (*melange(teinte, (1, .92, .66), .08 + .06 * (k % 2)), 1)
                p_ = bm.verts.new((x + ox * (.36 + lg * .2), y + oy * (.36 + lg * .2), z - .1 - lg)); p_[col] = (*melange(teinte, (1, .95, .75), .15), 1)
                rh.append(h); rm.append(m); rp.append(p_)
            for k in range(n):
                quad(rh[k], rm[k], rm[k + 1], rh[k + 1]); quad(rm[k], rp[k], rp[k + 1], rm[k + 1])
        # 4. faîtage : boudin tressé posé dans la crête (enfoncé d'un tiers), qui suit la vraie hauteur du toit
        xs = [cx - s.xr - .2 + k * .45 for k in range(int((2 * s.xr + .4) / .45) + 1)]
        pts = [Vector((x, cy, s.forme(x, cy)[0] + .1)) for x in xs]
        for k in range(len(pts) - 1): P.cylindre(pts[k], pts[k + 1] + (pts[k + 1] - pts[k]) * .06, .23, .23, M("chaume_f").couleur(R), n=6)
        for p in pts[1:-1:2]: P.cylindre(p - Vector((.035, 0, 0)), p + Vector((.035, 0, 0)), .22, .22, M("chene").sombre, n=6)
        return s

def chevrons(P, toit, murs, z_mur, pas_=.55):
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

def porte(P, centre, l=1.15, h=2.0, mat="peint", rz=0.0, cintree=True, seuil=True, mat_cadre="chene"):
    """Porte cintrée en planches (bleues), pentures de fer, anneau, seuil de pierre ; arc de claveaux au-dessus.
    centre = milieu du seuil, sur la face du mur."""
    x, y, z = centre; r = l / 2; hd = h - r if cintree else h; n = 5
    for i in range(n):   # planches : le haut suit l'arc (ou droit)
        u = -r + (i + .5) * l / n; ht = hd + (math.sqrt(max(0, r * r - u * u)) * .98 if cintree else 0)
        P.boite((x + u, y + .02, z + ht / 2), (l / n * .94, .1, ht), M(mat).couleur(P.R, .13), bev=.015)
    for zz in (.35, hd - .15): P.boite((x - .1, y - .05, z + zz), (l * .8, .04, .09), M("fer").couleur(P.R), bev=0)   # pentures
    P.cylindre((x + r * .55, y - .08, z + 1.0), (x + r * .55, y - .03, z + 1.0), .07, .07, M("fer").couleur(P.R), n=8)  # anneau
    for s in (-1, 1): poutre(P, (x + s * (r + .08), y, z), (x + s * (r + .08), y, z + hd), l=.16, h=.24, mat=mat_cadre)
    if cintree: arc_pierres(P, (x, y - .02, z + hd), r)
    else: poutre(P, (x - r - .3, y - .02, z + h + .1), (x + r + .3, y - .02, z + h + .1), l=.22, h=.24, mat=mat_cadre)   # linteau de bois
    if seuil: P.boite((x, y - .34, z + .01), (l + .45, .72, .22), M("moellon").couleur(P.R), bev=.07, jit=.015)   # seuil : une vraie marche (12 cm)

def fenetre(V, P, centre, rz=0.0, l=.75, h=.8, volets=True, jardiniere=True, mat_volet="peint", appui="moellon", mat_cadre="chene"):
    """Fenêtre à petits carreaux : cadre de poutres, croisillons, appui de pierre, volets bleus, jardinière fleurie.
    La vitre est dans V (objet W_ qui s'éclaire la nuit). rz : 0 = mur de façade (-Y), ±π/2 = murs de côté."""
    x, y, z = centre; ca, sa = math.cos(rz), math.sin(rz); ox, oy = sa, -ca   # vers l'extérieur
    def pt(u, w, dz): return (x + ca * u + ox * w, y + sa * u + oy * w, z + dz)
    V.boite(pt(0, -.02, 0), (l, .06, h), M("vitre").teintes[0], rz=rz, bev=0)
    for s in (-1, 1): poutre(P, pt(s * (l / 2 + .07), .02, -h / 2 - .1), pt(s * (l / 2 + .07), .02, h / 2 + .1), l=.14, h=.16, mat=mat_cadre)
    poutre(P, pt(-l / 2 - .2, .03, h / 2 + .12), pt(l / 2 + .2, .03, h / 2 + .12), l=.18, h=.2, mat=mat_cadre)   # linteau
    poutre(P, pt(0, .0, -h / 2), pt(0, .0, h / 2), l=.05, h=.06, mat="chene_c", bev=.01)          # croisillons
    poutre(P, pt(-l / 2, .0, 0), pt(l / 2, .0, 0), l=.05, h=.06, mat="chene_c", bev=.01)
    P.boite(pt(0, .1, -h / 2 - .1), (l + .4, .3, .12), M(appui).couleur(P.R), rz=rz, bev=.04)   # appui
    if volets:
        for s in (-1, 1):
            cs = s * (l / 2 + .12 + l * .25)
            for k in range(3):
                P.boite(pt(cs + (k - 1) * l * .5 / 3, .07, 0), (l * .5 / 3 * .95, .06, h + .12), M(mat_volet).couleur(P.R, .05), rz=rz, bev=.012)
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


# ------------------------------------------------------------------ 6. le pan de bois (maisons à colombages)
def pan_de_bois(P, a, b, z0, z1, ouvertures=(), pas_poteau=1.15, saillie=.05, graine_motif=0):
    """Mur à colombages sur la face extérieure d'un mur de a vers b (la face regarde à droite de a→b) : sablières basse et
    haute, poteaux (aux coins, au bord des ouvertures, et tous les 1,15 m au plus), linteaux et appuis autour des
    ouvertures, décharges (diagonales) près des coins, croix de Saint-André sous les fenêtres, et entre les bois des
    panneaux de torchis enduit, chacun d'une nuance. ouvertures : [(u0, u1, oz0, oz1)] le long du mur."""
    a, b = Vector((*a[:2], 0)), Vector((*b[:2], 0)); d = b - a; L = d.length; t = d / L; n = Vector((t.y, -t.x, 0))
    def p3(u, z, w=saillie): q = a + t * u + n * w; return (q.x, q.y, z)
    rz = math.atan2(t.y, t.x)
    # poteaux
    us = {0.06, L - .06}
    for (o0, o1, oz0, oz1) in ouvertures: us |= {o0 - .08, o1 + .08}
    us = sorted(us); pleins = []
    for u0, u1 in zip(us, us[1:]):
        k = max(1, math.ceil((u1 - u0) / pas_poteau)); pleins += [u0 + (u1 - u0) * i / k for i in range(k)]
    pleins.append(us[-1])
    for u in pleins: poutre(P, p3(u, z0), p3(u, z1), l=.17, h=.17, bev=.025)
    for z in (z0 + .1, z1 - .1): poutre(P, p3(-.06, z, saillie + .01), p3(L + .06, z, saillie + .01), l=.2, h=.2, bev=.03)   # sablières
    def dans_ouv(u): return next(((o0, o1, oz0, oz1) for (o0, o1, oz0, oz1) in ouvertures if o0 - .1 < u < o1 + .1), None)
    R = random.Random(graine_motif)
    for i, (u0, u1) in enumerate(zip(pleins, pleins[1:])):
        um = (u0 + u1) / 2; o = dans_ouv(um); zb, zh = z0 + .2, z1 - .2
        panneaux = []
        if o:   # ouverture : linteau, appui (fenêtre), allège en croix, imposte au-dessus
            o0, o1, oz0, oz1 = o
            poutre(P, p3(u0, oz1 + .09), p3(u1, oz1 + .09), l=.18, h=.18)
            if zh - (oz1 + .18) > .25: panneaux.append((u0, u1, oz1 + .18, zh))
            if oz0 - zb > .3:
                poutre(P, p3(u0, oz0 - .09), p3(u1, oz0 - .09), l=.16, h=.16)
                if oz0 - .18 - zb > .35:
                    for s in (0, 1): poutre(P, p3(u0, zb if s == 0 else oz0 - .18), p3(u1, oz0 - .18 if s == 0 else zb), l=.13, h=.13, bev=.02)
                panneaux.append((u0, u1, zb, oz0 - .18))
        else:
            coin = i == 0 or i == len(pleins) - 2
            if coin or R.random() < .35:   # décharge : du pied du poteau d'angle vers le haut du suivant
                vers = 1 if i == 0 else -1 if coin else R.choice((1, -1))
                poutre(P, p3(u0 if vers > 0 else u1, zb), p3(u1 if vers > 0 else u0, zh), l=.14, h=.14, bev=.02)
            elif zh - zb > 1.6:   # entretoise à mi-hauteur
                poutre(P, p3(u0, (zb + zh) / 2), p3(u1, (zb + zh) / 2), l=.14, h=.14, bev=.02)
            panneaux.append((u0, u1, zb, zh))
        for (pu0, pu1, pz0, pz1) in panneaux:   # torchis : légèrement en retrait des bois, une nuance par panneau
            c = M("platre").couleur(R)
            q = p3((pu0 + pu1) / 2, (pz0 + pz1) / 2, saillie - .07)
            for v in P.boite(q, (pu1 - pu0, .06, pz1 - pz0), c, rz=rz, bev=0):
                if v.co.z < q[2]: v[P.col] = (*melange(c, (.62, .5, .36), .22), 1)   # bas des panneaux un peu sali

# ------------------------------------------------------------------ 7. le toit de tuiles (deux pans, faîte selon X)
class ToitTuiles:
    """Toit à deux pans couvrant |x-cx| < X, |y-cy| < Y (débords compris), faîte selon X. Tuiles posées en rangs qui se
    recouvrent, chaque tuile un peu bombée et d'une nuance, bord bas festonné ; dessous et tranches en brun chaud ;
    planches de rive sur les pignons ; faîtières rondes. forme() : hauteur du dessus (pour cheminées, pignons)."""
    def __init__(s, cx, cy, X, Y, z_bord, z_faite, ep=.28):
        s.cx, s.cy, s.X, s.Y, s.zb, s.zf, s.ep = cx, cy, X, Y, z_bord, z_faite, ep; s.k = (z_faite - z_bord) / Y
    def forme(s, x, y): return s.zf - s.k * abs(y - s.cy), 0
    def dessus(s, x, y): return s.forme(x, y)[0] + .08, 0, 0
    def construire(s, P, larg_tuile=.32, rang=.36, cheminees=()):
        R = P.R; cx, cy, X, Y, bm, col = s.cx, s.cy, s.X, s.Y, P.bm, P.col
        pente = math.hypot(Y, s.zf - s.zb); cosa = Y / pente
        # coque : dessous et tranches brun chaud (le dessus est couvert de tuiles)
        for sg in (-1, 1):
            yb = cy + sg * Y; zb = s.zb
            P.boite((cx, cy + sg * Y / 2, (s.zf + s.zb) / 2 - s.ep * .5), (2 * X, pente, s.ep), M("tuile_d").couleur(R), rx=-sg * math.atan2(s.zf - s.zb, Y), bev=0)
        nu = int(2 * X / larg_tuile); nr = int(pente / rang) + 1
        def trou(x, y): return any(abs(x - hx) < hr + .05 and abs(y - hy) < hr + .05 for (hx, hy, hr) in cheminees)
        for sg in (-1, 1):
            for r_ in range(nr):
                d0 = min(pente, r_ * rang); d1 = min(pente + .06, d0 + rang * 1.3)   # le long de la pente, depuis le faîtage
                def pt(u, d, h=0.0):
                    yy = cy + sg * d * cosa; return (cx - X + u, yy, s.zf - s.k * abs(yy - cy) + .05 + h)
                for i in range(nu):
                    u0 = i * larg_tuile + (larg_tuile / 2 if r_ % 2 else 0); u1 = min(2 * X, u0 + larg_tuile)
                    if u0 >= 2 * X - .02: continue
                    um = (u0 + u1) / 2
                    if trou(*pt(um, (d0 + d1) / 2)[:2]): continue
                    c = M("tuile").couleur(R); cs = M("tuile").sombre
                    # une tuile : 2 × 3 sommets, bombée au milieu, bord bas arrondi plus bas au centre
                    v = [bm.verts.new(pt(u0 + .01, d0)), bm.verts.new(pt(um, d0, .035)), bm.verts.new(pt(u1 - .01, d0)),
                         bm.verts.new(pt(u0 + .01, d1, .02)), bm.verts.new(pt(um, d1 + .03, .07)), bm.verts.new(pt(u1 - .01, d1, .02))]
                    for k_, vv in enumerate(v): vv[col] = (*(melange(c, cs, .45) if k_ < 3 else c), 1)
                    for f in ((v[0], v[3], v[4], v[1]), (v[1], v[4], v[5], v[2])):
                        try: ff = bm.faces.new(f); ff[P.lisse] = 1
                        except ValueError: pass
        # faîtières : demi-cylindres d'une nuance plus sombre
        n = int(2 * X / .42)
        for i in range(n):
            x0 = cx - X + i * 2 * X / n; x1 = x0 + 2 * X / n * 1.04
            P.cylindre((x0, cy, s.zf + .1), (x1, cy, s.zf + .1), .17, .15, melange(M("tuile").couleur(R), M("tuile").sombre, .25), n=7)
        # planches de rive le long des pignons
        for sx in (-1, 1):
            for sg in (-1, 1):
                P.boite((cx + sx * (X + .03), cy + sg * Y / 2, (s.zf + s.zb) / 2 - .02), (.07, pente + .05, .3), M("chene").couleur(R), rx=-sg * math.atan2(s.zf - s.zb, Y), bev=.015)
        return s

def pignon_platre(P, x, y0, y1, z0, toit, sens=1, ouverture=None):
    """Pignon en torchis et bois sous un toit à deux pans (plan x) : entrait (poutre basse), poinçon (poteau du milieu),
    deux arbalétriers sous le toit, panneaux d'enduit entre. ouverture : (y, z, l, h) d'une petite fenêtre."""
    ym = (y0 + y1) / 2; zt = toit.forme(x, ym)[0] - toit.ep - .05; e = sens * .06
    # enduit : un prisme triangulaire qui suit exactement le dessous du toit
    c = M("platre").couleur(P.R); vs = []
    for dx in (-.05, .05):
        xx = x + e * .2 + dx; zr0 = toit.forme(x, y0)[0] - toit.ep - .03
        vs += [P.bm.verts.new((xx, y0, z0)), P.bm.verts.new((xx, y1, z0)), P.bm.verts.new((xx, y1, zr0)), P.bm.verts.new((xx, ym, zt)), P.bm.verts.new((xx, y0, zr0))]
    for v in vs: v[P.col] = (*c, 1)
    for f in ((0, 1, 2, 3, 4), (9, 8, 7, 6, 5), (0, 5, 6, 1), (1, 6, 7, 2), (2, 7, 8, 3), (3, 8, 9, 4), (4, 9, 5, 0)):
        try: P.bm.faces.new([vs[i] for i in f])
        except ValueError: pass
    poutre(P, (x + e, y0, z0 + .1), (x + e, y1, z0 + .1), l=.2, h=.2)                                     # entrait
    poutre(P, (x + e, ym, z0 + .1), (x + e, ym, zt), l=.18, h=.18)                                         # poinçon
    for yy in (y0, y1): poutre(P, (x + e, yy, toit.forme(x, yy)[0] - toit.ep - .1), (x + e, ym, zt), l=.18, h=.18)   # arbalétriers
    for s in (-1, 1):   # contrefiches
        yb = ym + s * (y1 - y0) * .25; poutre(P, (x + e, yb, z0 + .2), (x + e, ym, z0 + (zt - z0) * .55), l=.13, h=.13, bev=.02)

def escalier(P, centre, l, marches, haut=.3, prof=.36, rz=0.0):
    """Marches de pierre devant une porte : centre = milieu du seuil sur la face du mur (la porte regarde -Y tourné)."""
    x, y, z = centre
    for k in range(marches):
        zt = z - k * haut; yy = y - prof * (k + .5)
        P.boite((x, yy, zt - haut / 2 - .2), (l + .2 + k * .1, prof * 1.02, haut + .4), M("moellon").couleur(P.R), bev=.05, jit=.01)

def auvent(P, centre, l=1.7, prof=.75, z=None, rz=0.0):
    """Petit auvent de planches au-dessus d'une porte : deux consoles de bois et un toit de bardeaux en pente.
    centre = (x, y_face_du_mur, z_bas_du_auvent)."""
    x, y, z0 = centre
    for s in (-1, 1):
        poutre(P, (x + s * l * .42, y, z0 - .55), (x + s * l * .42, y - prof * .9, z0), l=.13, h=.13)        # consoles
        poutre(P, (x + s * l * .42, y, z0), (x + s * l * .42, y - prof, z0), l=.14, h=.16)
    ang = .45
    for k in range(3):   # bardeaux en trois rangs
        d = prof * (k + .5) / 3
        P.boite((x, y - d, z0 + .12 + (prof - d) * math.tan(ang) * .6), (l + .2, prof / 3 * 1.25, .06), M("tuile").couleur(P.R), rx=ang * .6, bev=.015)

# ---- ajouts longère et forge
class ToitTourne:
    """Un toit construit faîte selon X (ToitChaume, ToitTuiles), tourné d'un quart de tour : faîte selon Y (longère,
    porte dans le pignon). forme(x, y) répond dans le repère de la maison (pignons, rives, cheminées)."""
    def __init__(s, toit): s.t = toit; s.ep, s.zf, s.zb = toit.ep, toit.zf, toit.zb
    def forme(s, x, y): return s.t.forme(y, -x)
    def construire(s, P, vieilli=0.0, pas_rang=.34, **k):
        """vieilli : le chaume grisaille et brunit vers le bas, chaque rang d'une nuance un peu différente."""
        T = Piece("tmp_toit", P.R.randrange(1 << 30)); s.t.construire(T, **k)
        if vieilli:
            import random as _r
            gris, brun = (.42, .36, .26), (.36, .24, .13)
            for v in T.bm.verts:
                t = max(0.0, min(1.0, (s.zf - v.co.z) / (s.zf - s.zb)))
                Rr = _r.Random(int((v.co.z + 10) / pas_rang)); u = Rr.uniform(-.12, .12)
                c = v[T.col]; f = max(0.0, min(.8, vieilli * t * t + u * vieilli))
                cible = melange(gris, brun, Rr.random())
                v[T.col] = (*melange(tuple(c[:3]), cible, f), 1)
        P.ajouter(T, Matrix.Rotation(math.pi / 2, 4, "Z")); T.bm.free(); return s

def planches_verticales(P, a, b, z0, haut, trous=(), larg=.3, ep=.1, saillie=.05, mat="chene", sabliere=True, clair=0.0):
    """Mur ou pignon de planches verticales jointives sur la face extérieure de a vers b (la face regarde à droite de
    a→b), du bas z0 jusqu'à haut(x, y) (le haut de chaque planche suit exactement la pente : ni jour ni pointe).
    trous : [(u0, u1, z0, z1)] le long du mur (porte, fenêtre) : les planches s'arrêtent au bord, coupées à la largeur."""
    a, b = Vector((*a[:2], 0)), Vector((*b[:2], 0)); d = b - a; L = d.length; t = d / L; n = Vector((t.y, -t.x, 0)); rz = math.atan2(t.y, t.x)
    k = max(1, round(L / larg)); w = L / k
    for i in range(k):
        morceaux = [(i * w, (i + 1) * w, z0, None)]
        for (u0, u1, hz0, hz1) in trous:
            nm = []
            for (q0, q1, za, zb) in morceaux:
                if q1 <= u0 or q0 >= u1: nm.append((q0, q1, za, zb)); continue
                if u0 > q0: nm.append((q0, u0, za, zb))
                if u1 < q1: nm.append((u1, q1, za, zb))
                m0, m1 = max(q0, u0), min(q1, u1)
                if hz0 > za + .05: nm.append((m0, m1, za, hz0))
                nm.append((m0, m1, hz1, zb))
            morceaux = nm
        c = M(mat).couleur(P.R, .16); off = saillie + (.018 if i % 2 else 0)
        if P.R.random() < clair: c = melange(c, M("chene_c").teintes[0], .55)   # quelques planches plus claires (remplacées plus tard)
        for (q0, q1, za, zb) in morceaux:
            if q1 - q0 < .04: continue
            uc = (q0 + q1) / 2; p = a + t * uc + n * off
            zt = haut(p.x, p.y) if zb is None else zb
            if zt - za < .06: continue
            vs = P.boite((p.x, p.y, (za + zt) / 2), ((q1 - q0) * (1.05 if q1 - q0 > w * .9 else 1), ep, zt - za), c, rz=rz, bev=0)
            if zb is None:
                for v in vs:
                    if v.co.z > (za + zt) / 2: v.co.z = haut(v.co.x, v.co.y)
    if sabliere:
        p = a + t * (L / 2) + n * (saillie + .05)
        P.boite((p.x, p.y, z0 + .07), (L + .04, .12, .16), M("chene").sombre, rz=rz, bev=0)

def dalles(P, x0, x1, y0, y1, z, taille=.62, mat="moellon"):
    """Sol de grandes dalles de pierre (forge, seuil) : rangs de largeur variable, joints décalés, dessus à z."""
    R = P.R; y = y0
    while y < y1 - .05:
        h = min(y1 - y, taille * R.uniform(.7, 1.0))
        if y1 - y - h < .25: h = y1 - y
        x = x0 - R.uniform(0, taille * .5)
        while x < x1 - .05:
            l = taille * R.uniform(.8, 1.4); xa, xb = max(x, x0), min(x + l, x1)
            if xb - xa > .08:
                c = M(mat).couleur(R, .1); c = tuple(min(1, v * 1.08) for v in c)
                P.boite(((xa + xb) / 2, y + h / 2, z - .06), (xb - xa - .035, h - .035, .12), c, bev=.02, jit=.008)
            x += l
        y += h

def tete_dragon(P, base, rz=0.0, ech=1.0, mat="chene"):
    """Tête de dragon sculptée au bout d'une poutre (rives croisées de la longère) : cou recourbé, crâne, museau,
    mâchoire entrouverte, langue rouge, yeux jaunes, cornes, crête. Regarde +X tourné de rz ; base = bout de la poutre."""
    H = Piece("tmp_tete", P.R.randrange(1 << 30)); c = M(mat).couleur(H.R, .04); cc = M("chene_c").couleur(H.R, .04)
    rouge, jaune = M("fleur").teintes[0], M("fleur").teintes[1]
    poutre(H, (-.02, 0, -.05), (.14, 0, .36), l=.16, h=.24, c=c, bev=.03)            # cou recourbé
    poutre(H, (.1, 0, .3), (.42, 0, .56), l=.15, h=.22, c=c, bev=.03)
    H.boite((.56, 0, .6), (.42, .27, .3), c, ry=-.08, bev=.06)                        # crâne
    H.boite((.88, 0, .57), (.38, .2, .19), c, ry=-.04, bev=.05)                       # museau
    H.boite((.84, 0, .42), (.36, .16, .07), c, ry=.28, bev=.02)                       # mâchoire entrouverte
    H.boite((1.02, 0, .5), (.08, .17, .1), rouge, bev=.02)                            # lèvre peinte
    poutre(H, (.8, 0, .47), (1.06, 0, .44), l=.06, h=.03, c=rouge, bev=0)             # langue
    poutre(H, (1.06, 0, .44), (1.14, 0, .53), l=.06, h=.03, c=rouge, bev=0)
    for sy in (-1, 1):
        H.sphere((.68, sy * .13, .68), .058, jaune, sub=1)                            # yeux
        H.sphere((.71, sy * .17, .685), .03, M("fer").teintes[0], sub=1)
        H.sphere((1.05, sy * .065, .63), .026, M("fer").teintes[0], sub=1)            # naseaux
        H.cylindre((.46, sy * .08, .74), (.18, sy * .15, .98), .055, .012, cc, n=5)   # cornes
        H.cylindre((.4, sy * .14, .62), (.22, sy * .25, .66), .05, .01, c, n=4)       # oreilles
    for (x, z) in ((.0, .22), (.12, .42), (.3, .58)):                                  # crête le long du cou
        H.cylindre((x - .02, 0, z + .08), (x - .14, 0, z + .2), .05, .008, cc, n=4)
    P.ajouter(H, Matrix.Translation(Vector(base)) @ Matrix.Rotation(rz, 4, "Z") @ Matrix.Scale(ech, 4)); H.bm.free()

def rives_croisees(P, toit, y, sens, x_bord, depasse=1.05, ech=1.0):
    """Planches de rive d'un pignon (plan y, sens = -1 si le pignon regarde -Y) : elles suivent le bord du toit depuis
    l'égout, se croisent au faîte, le dépassent et finissent chacune en tête de dragon tournée vers le dehors."""
    zc = toit.forme(0, y)[0]
    for k, s in enumerate((-1, 1)):
        yy = y + sens * (.1 + .13 * k)
        A = Vector((s * x_bord, yy, toit.forme(s * x_bord, y)[0] + .04)); C = Vector((0, yy, zc + .16))
        d = (C - A).normalized(); E = C + d * depasse
        poutre(P, A - d * .1, E, l=.15, h=.3, mat="chene_c")                       # bois clair, chanfreiné (dessous moins lourd)
        for j, f in enumerate((.12, .3, .48, .66, .84)):                           # bandes peintes rouge et ocre, posées sur la face
            off = Vector((0, sens * .083, 0)); c = M("fleur").teintes[0] if j % 2 == 0 else M("fleur").teintes[1]
            poutre(P, A + (C - A) * f + off, A + (C - A) * (f + .07) + off, l=.016, h=.2, c=c, bev=0)
        tete_dragon(P, E - d * .05, rz=0 if s < 0 else math.pi, ech=ech)
        # sous le débord du pignon : une volige de planches (pas de dessous de chaume en plein jour)
        A2 = Vector((s * (x_bord - .12), y - sens * .17, toit.forme(s * x_bord / .97, y)[0] - toit.ep - .03)); C2 = Vector((0, y - sens * .17, toit.forme(0, y)[0] - toit.ep - .03))
        poutre(P, A2, C2, l=.36, h=.05, mat="bois_s", bev=0)

def mousse(P, toit, x, y, r=.35):
    """Plaque de mousse posée à plat sur un toit (suit la pente) : quelques coussins verts écrasés."""
    e = .05; gx = (toit.forme(x + e, y)[0] - toit.forme(x - e, y)[0]) / (2 * e); gy = (toit.forme(x, y + e)[0] - toit.forme(x, y - e)[0]) / (2 * e)
    q = Vector((0, 0, 1)).rotation_difference(Vector((-gx, -gy, 1)).normalized())
    H = Piece("tmp_mousse", P.R.randrange(1 << 30))
    for i in range(3):
        H.sphere((H.R.uniform(-r, r) * .6, H.R.uniform(-r, r) * .6, 0), r * H.R.uniform(.6, 1.0), M("mousse").couleur(H.R), (1.3, 1.0, .28), sub=1, jit=.02)
    P.ajouter(H, Matrix.Translation((x, y, toit.forme(x, y)[0] + .1)) @ q.to_matrix().to_4x4()); H.bm.free()

def fumoir(P, x, y, z0, z1, l=.9, p=1.1):
    """Lanterneau à fumée sur le faîte (halle viking, pas de cheminée) : caisson de planches à claire-voie et petit toit
    de planches à deux pans, faîte selon Y."""
    for sx in (-1, 1):
        for sy in (-1, 1): poutre(P, (x + sx * l / 2, y + sy * p / 2, z0), (x + sx * l / 2, y + sy * p / 2, z1), l=.1, h=.1, mat="bois_s")
    for k in range(3):   # lattes à claire-voie (la fumée passe entre)
        z = z0 + (z1 - z0) * (k + .5) / 3
        for sx in (-1, 1): P.boite((x + sx * l / 2, y, z), (.05, p, .1), M("bois_s").couleur(P.R, .1), bev=0)
        for sy in (-1, 1): P.boite((x, y + sy * p / 2, z), (l, .05, .1), M("bois_s").couleur(P.R, .1), bev=0)
    ang = .6
    for sx in (-1, 1):
        P.boite((x + sx * (l / 4 + .06), y, z1 + .12), (l / 2 / math.cos(ang) + .18, p + .3, .06), M("bois_s").couleur(P.R, .08), ry=sx * ang, bev=.015)
    P.boite((x, y, z1 + .32), (.12, p + .34, .1), M("bois_s").sombre, bev=0)

def foyer_forge(V, P, x, y, z, l=1.5, p=1.1, h=.8):
    """Foyer de forge : bloc de pierres taillées contre le mur du fond (y + p/2), margelle de pierres plates, lit de
    charbon et braises (les braises vont dans V : elles brillent la nuit)."""
    R = P.R
    P.boite((x, y, z + h / 2), (l - .08, p - .08, h - .02), M("mortier").couleur(R), bev=0)   # cœur
    rangs = 3; hz = h / rangs
    for r_ in range(rangs):
        zc = z + hz * (r_ + .5)
        for (ax, ay, bx, by) in ((x - l / 2, y - p / 2, x + l / 2, y - p / 2), (x - l / 2, y + p / 2, x - l / 2, y - p / 2), (x + l / 2, y - p / 2, x + l / 2, y + p / 2)):
            L = math.hypot(bx - ax, by - ay); n = max(2, round(L / .42)); tx, ty = (bx - ax) / L, (by - ay) / L; nx, ny = ty, -tx
            cuts = [i * L / n for i in range(n + 1)] if r_ % 2 == 0 else [0] + [(i - .5) * L / n for i in range(1, n + 1)] + [L]
            for u0, u1 in zip(cuts, cuts[1:]):
                if u1 - u0 < .1: continue
                um = (u0 + u1) / 2
                P.boite((ax + tx * um + nx * .03, ay + ty * um + ny * .03, zc), (u1 - u0 - .04, .16, hz - .04), M("moellon").couleur(R, .1), rz=math.atan2(ty, tx), bev=.04, jit=.01)
    zt = z + h
    for (cx, cy, sx, sy, hz) in ((x, y - p / 2 + .1, l + .06, .26, .08), (x - l / 2 + .12, y + .08, .26, p - .2, .12), (x + l / 2 - .12, y + .08, .26, p - .2, .12)):   # margelle (basse devant : on voit le feu)
        P.boite((cx, cy, zt + hz / 2 - .01), (sx, sy, hz), M("moellon").couleur(R, .05), bev=.03, jit=.006)
    P.boite((x, y + .08, zt + .02), (l - .4, p - .3, .06), M("charbon").couleur(R), bev=0)
    mx, my = l / 2 - .3, p / 2 - .25
    for i in range(26):   # tas de charbons et de braises, bombé au milieu (on le voit de face et de côté)
        u, w = R.uniform(-1, 1), R.uniform(-1, 1); px, py = x + u * mx, y + .08 + w * my
        zz = zt + .06 + .16 * (1 - max(abs(u), abs(w)) ** 2)
        if i % 4: V.sphere((px, py, zz), R.uniform(.08, .13), M("braise").couleur(R), (1, 1, .75), sub=1, jit=.01)
        else: P.sphere((px, py, zz), R.uniform(.07, .1), M("charbon").couleur(R), (1, 1, .7), sub=1, jit=.012)
    for i in range(6):    # petites flammes (cônes doux, jaune au cœur)
        u = (i - 2.5) / 2.5 * mx * .7; ph = R.uniform(.3, .5) * (1 - abs(u) / mx * .5); px, py = x + u, y + .08 + R.uniform(-.1, .1)
        V.cylindre((px, py, zt + .15), (px + R.uniform(-.05, .05), py, zt + .15 + ph), R.uniform(.09, .13), .01, M("flamme").teintes[i % 2], n=6)
    V.boite((x, y + p / 2 - .2, zt + .5), (l - .35, .03, .8), M("lueur").teintes[0], bev=0)   # lueur du feu sur la pierre du fond, devant les moellons (brille la nuit)
    V.boite((x, y - p / 2 + .21, zt + .1), (l - .4, .02, .1), M("lueur").teintes[1], bev=0)    # et sur le bord de la margelle

def poteau(P, x, y, z0, z1, cote=.3, mat="chene", de=True):
    """Poteau de bois sur un dé de pierre (il ne touche pas le sol : il ne pourrit pas)."""
    if de: P.boite((x, y, z0 + .12), (cote + .16, cote + .16, .24), M("moellon").couleur(P.R, .05), bev=.04, jit=.006)
    poutre(P, (x, y, z0 + (.24 if de else 0)), (x, y, z1), l=cote, h=cote, mat=mat)

def fumee(P, x, y, z, n=5, vent=(.45, .12)):
    """Filet de fumée stylisé : boules douces qui montent, grossissent et dérivent avec le vent (au-dessus d'un lanterneau)."""
    for i in range(n):
        t = i / max(1, n - 1); r = .26 + .3 * t
        c = melange(M("fumee").teintes[0], M("fumee").teintes[1], t)
        P.sphere((x + vent[0] * i + .06 * math.sin(i * 2.1), y + vent[1] * i, z + .5 * i + .05 * i * i), r, c, (1, 1, .85), sub=1, jit=.015)

def cailloux(P, x, y, n=4, r=.14):
    """Petit tas de cailloux posés dans l'herbe."""
    for i in range(n):
        P.sphere((x + P.R.uniform(-.3, .3), y + P.R.uniform(-.2, .2), r * .25), r * P.R.uniform(.6, 1.1), M("moellon").couleur(P.R, .1), (1.2, 1, .6), sub=1, jit=.02)

def herbe(P, x, y, n=5):
    """Touffe d'herbe haute (cônes fins), au pied d'un mur ou d'un toit."""
    for i in range(n):
        a = P.R.uniform(0, math.tau); bx, by = x + P.R.uniform(-.15, .15), y + P.R.uniform(-.15, .15)
        P.cylindre((bx, by, 0), (bx + math.cos(a) * .12, by + math.sin(a) * .12, P.R.uniform(.3, .5)), .05, .005, M("feuillage").couleur(P.R), n=3)

def eclaircir(P, mini, maxi, f=1.4, teinte=(1.0, .95, .88), garde=None):
    """Remonte les couleurs d'une zone (un intérieur ouvert que l'occlusion cuite va beaucoup assombrir), en brun chaud :
    multiplie par f et par une teinte légèrement chaude. f < 1 : salir (suie en haut d'une cheminée).
    garde(co) : condition de plus sur la position (par exemple : seulement sous le toit)."""
    for v in P.bm.verts:
        if all(mini[i] <= v.co[i] <= maxi[i] for i in range(3)) and (garde is None or garde(v.co)):
            c = v[P.col]; v[P.col] = (*(min(1.0, c[i] * f * teinte[i]) for i in range(3)), 1)

def aeration(P, centre, rz=0.0, l=.55, h=.42):
    """Aération de pignon : cadre de bois, fond sombre, trois lames inclinées. Regarde -Y tourné de rz ; centre sur la face du mur."""
    H = Piece("tmp_aeration", P.R.randrange(1 << 30))
    H.boite((0, .0, 0), (l, .03, h), M("bois_s").sombre, bev=0)
    for z in (-h / 2, h / 2): poutre(H, (-l / 2 - .06, -.04, z), (l / 2 + .06, -.04, z), l=.08, h=.08, mat="chene_c", bev=0)
    for x in (-l / 2, l / 2): poutre(H, (x, -.04, -h / 2), (x, -.04, h / 2), l=.08, h=.08, mat="chene_c", bev=0)
    for k in range(3): H.boite((0, -.05, -h / 2 + (k + .6) * h / 3.2), (l - .04, .02, .12), M("chene").couleur(H.R), rx=.6, bev=0)
    P.ajouter(H, Matrix.Translation(Vector(centre)) @ Matrix.Rotation(rz, 4, "Z")); H.bm.free()
# ---- ajouts pierre et moulin
def nb_sommets(P):
    """Repère pour teinter() et rogner() : le nombre de sommets avant d'ajouter des pierres."""
    return len(P.bm.verts)

def _neufs(P, n0):
    P.bm.verts.ensure_lookup_table(); return [P.bm.verts[i] for i in range(n0, len(P.bm.verts))]

def teinter(P, n0, mat="pierre_s", graine=0):
    """Repeint dans la matière mat les pierres ajoutées depuis le sommet n0 (murs, cheminée faits en moellons) : chaque
    pierre (une couleur) reçoit une teinte de mat, en gardant son écart de clarté (pierres plus sombres ou plus claires) ;
    une pierre sur huit nettement plus claire ou plus foncée ; près du sol (z < z_chaud), un ton plus chaud (terre, mousse
    sèche), comme le pied des chaumières."""
    R = random.Random(graine); ref = sum(sum(t) for t in M("moellon").teintes) / (3 * len(M("moellon").teintes)); vus = {}
    chaud = (.55, .42, .28)
    for v in _neufs(P, n0):
        c = tuple(v[P.col])[:3]; k = tuple(round(x, 4) for x in c)
        if k not in vus:
            l = max(.8, min(1.2, sum(c) / 3 / ref))
            if R.random() < .12: l *= R.choice((.72, .8, 1.22, 1.32))
            nc = tuple(min(1., x * l) for x in M(mat).couleur(R))
            if v.co.z < .7: nc = melange(nc, tuple(x * sum(nc) / 3 / (sum(chaud) / 3) for x in chaud), .28 * min(1, (.7 - v.co.z) / .7) + .08)
            vus[k] = nc
        v[P.col] = (*vus[k], 1)

def rogner(P, n0, zmax, marge=.04):
    """Pignon de pierre : les pierres ajoutées depuis n0 qui sont tout entières au-dessus de zmax(x, y) (le dessous du
    toit) disparaissent ; les autres sont rabotées (leurs sommets redescendent sous zmax) : elles suivent la pente."""
    neufs = _neufs(P, n0); ens = set(neufs); vus = set(); suppr = []
    for v in neufs:
        if v in vus: continue
        ile, pile = [], [v]; vus.add(v)
        while pile:
            w = pile.pop(); ile.append(w)
            for e in w.link_edges:
                o = e.other_vert(w)
                if o in ens and o not in vus: vus.add(o); pile.append(o)
        lim = [zmax(w.co.x, w.co.y) for w in ile]
        if min(w.co.z - l for w, l in zip(ile, lim)) > -marge: suppr += ile
        else:
            for w, l in zip(ile, lim):
                if w.co.z > l: w.co.z = l
    bmesh.ops.delete(P.bm, geom=suppr, context="VERTS")

def _face(P, vs, vers, lisse=False):
    """Une face (sommets déjà colorés) tournée du côté vers."""
    try: f = P.bm.faces.new(vs)
    except ValueError: return None
    f.normal_update()
    if f.normal.dot(Vector(vers)) < 0: f.normal_flip()
    if lisse: f[P.lisse] = 1
    return f

def prisme_pignon(P, x0, x1, y0, y1, z0, z1, c):
    """Cœur plein d'un pignon (derrière les pierres) : prisme triangulaire, base y0..y1 à z0, pointe au milieu à z1."""
    vs = []
    for x in (x0, x1): vs += [P.bm.verts.new((x, y0, z0)), P.bm.verts.new((x, y1, z0)), P.bm.verts.new((x, (y0 + y1) / 2, z1))]
    for v in vs: v[P.col] = (*c, 1)
    ym, zm = (y0 + y1) / 2, (z0 + z1) / 2
    for f in ((0, 1, 2), (3, 5, 4), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)):
        q = sum((vs[i].co for i in f), Vector()) / len(f); _face(P, [vs[i] for i in f], q - Vector(((x0 + x1) / 2, ym, zm)))

class ToitArdoises:
    """Toit à deux pans couvrant |x-cx| < X, |y-cy| < Y (débords compris), faîte selon X, couvert d'ardoises posées en
    rangs qui se recouvrent (chaque ardoise un peu soulevée en bas : une ombre fine sous chaque rang ; joints décalés,
    largeurs inégales, quelques taches de lichen ; deux rangs d'écailles pointues pour le décor). Dessous en planches
    brunes, tranche brune, planches de rive sur les pignons, faîtage en ardoises croisées.
    forme() : hauteur du dessus ; dessous() : hauteur du dessous (pour les murs et pignons)."""
    def __init__(s, cx, cy, X, Y, z_bord, z_faite, ep=.25):
        s.cx, s.cy, s.X, s.Y, s.zb, s.zf, s.ep = cx, cy, X, Y, z_bord, z_faite, ep
        s.k = (z_faite - z_bord) / Y; s.ev = ep * math.sqrt(1 + s.k * s.k)   # épaisseur mesurée à la verticale
    def forme(s, x, y): return s.zf - s.k * abs(y - s.cy), 0
    def dessous(s, x, y): return s.forme(x, y)[0] - s.ev
    def dessus(s, x, y): return s.forme(x, y)[0] + .05, 0, 0
    def construire(s, P, cheminees=(), larg=.32, rang=.25, ecailles=(6, 7)):
        R = P.R; cx, cy, X, Y, k = s.cx, s.cy, s.X, s.Y, s.k
        pente = math.hypot(Y, s.zf - s.zb); cosa = Y / pente
        def trou(x, y, m=.04): return any(abs(x - hx) < hr + m and abs(y - hy) < hr + m for (hx, hy, hr) in cheminees)
        def pt(sg, u, d, h=0.0):
            yy = cy + sg * d * cosa; return (cx - X + u, yy, s.zf - k * abs(yy - cy) + h)
        def V(p, c): v = P.bm.verts.new(p); v[P.col] = (*c, 1); return v
        # 1. coque : dessus sombre (vu seulement entre les ardoises), tranche brune
        for sg in (-1, 1):
            haut = [(cx - X, cy, s.zf - .01), (cx + X, cy, s.zf - .01), (cx + X, cy + sg * Y, s.zb - .01), (cx - X, cy + sg * Y, s.zb - .01)]
            T = [V(p, M("ardoise").sombre) for p in haut]
            B = [V((p[0], p[1], p[2] - s.ev + .01), M("ardoise_d").couleur(R)) for p in haut]
            nrm = (0, sg * k, 1)
            _face(P, T, nrm)
            for i in range(4):
                j = (i + 1) % 4; q = Vector(haut[i]) + Vector(haut[j]); q = q / 2 - Vector((cx, cy + sg * Y / 2, (s.zf + s.zb) / 2))
                _face(P, [T[i], T[j], B[j], B[i]], (q.x, q.y, 0))
            # dessous en planches (selon la pente), une nuance par planche
            n = int(2 * X / .26)
            for i in range(n):
                x0 = cx - X + 2 * X * i / n + .006; x1 = cx - X + 2 * X * (i + 1) / n - .006
                c = M("ardoise_d").couleur(R, .1); c = tuple(x * (1.12 if i % 2 else .94) for x in c)
                q = [V((x0, cy, s.zf - s.ev - .005), c), V((x1, cy, s.zf - s.ev - .005), c), V((x1, cy + sg * Y, s.zb - s.ev - .005), c), V((x0, cy + sg * Y, s.zb - s.ev - .005), c)]
                _face(P, q, (0, -sg * k, -1))
        # 2. ardoises, rang par rang depuis le faîtage
        nr = int((pente - .04) / rang) + 1
        for sg in (-1, 1):
            nrm = Vector((0, sg * k, 1)); bas = Vector((0, sg, -k * .3))
            for r_ in range(nr):
                d0 = .04 + r_ * rang
                if d0 >= pente: break
                d1 = min(pente, d0 + rang * 1.5); ec = r_ in ecailles   # le dernier rang s'arrête au bord de la coque (pas de jour entre les ardoises)
                u = -R.uniform(0, larg)
                while u < 2 * X:
                    w = larg * R.uniform(.78, 1.18); u0, u1 = max(0.0, u) + .009, min(2 * X, u + w) - .009; u += w
                    if u1 - u0 < .1: continue
                    um = (u0 + u1) / 2
                    if trou(*pt(sg, um, (d0 + d1) / 2)[:2]): continue
                    c = M("ardoise").couleur(R)
                    if R.random() < .03: c = melange(c, M("lichen").couleur(R), R.uniform(.2, .4))
                    elif R.random() < .05: c = melange(c, M(R.choice(("mousse", "chene"))).couleur(R), R.uniform(.15, .3))   # quelques ardoises teintées vert ou brun
                    ch = melange(c, M("ardoise").sombre, .4); cl = melange(c, M("ardoise").sombre, .65)
                    hb0, hb1 = R.uniform(.035, .055), R.uniform(.035, .055)
                    A, B_ = V(pt(sg, u0, d0, .012), ch), V(pt(sg, u1, d0, .012), ch)
                    D, C = V(pt(sg, u0, d1, hb0), c), V(pt(sg, u1, d1, hb1), c)
                    D2, C2 = V(pt(sg, u0, d1 + .004, .004), cl), V(pt(sg, u1, d1 + .004, .004), cl)
                    if ec:   # écaille : pointe au milieu du bord bas
                        E = V(pt(sg, um, d1 + .09, (hb0 + hb1) / 2), c); E2 = V(pt(sg, um, d1 + .094, .004), cl)
                        _face(P, [A, D, E, C, B_], nrm); _face(P, [D, D2, E2, E], bas); _face(P, [E, E2, C2, C], bas)
                    else:
                        _face(P, [A, D, C, B_], nrm); _face(P, [D, D2, C2, C], bas)
        # planche d'égout : ferme le bord bas du toit (la tranche et le bout des ardoises, qui brillaient vus d'en dessous)
        for sg in (-1, 1):
            yb = cy + sg * (Y + .03); zh = s.zb + .07; zl = s.zb - s.ev - .03
            P.boite((cx, yb, (zh + zl) / 2), (2 * X + .1, .06, zh - zl), M("chene").couleur(R), bev=.015)
        # 3. faîtage : ardoises croisées en V renversé, posées tous les 45 cm
        n = int((2 * X + .04) / .45) + 1; ang = math.atan(k)
        for i in range(n):
            x = cx - X - .02 + (2 * X + .04) * (i + .5) / n
            if trou(x, cy, .06): continue
            c = melange(M("ardoise").couleur(R), M("ardoise").sombre, .3)
            for sg in (-1, 1):
                p = Vector(pt(sg, 0, .13)) + Vector((0, 0, .07)); p.x = x
                P.boite(p, ((2 * X + .04) / n * 1.06, .32, .05), c, rx=-sg * ang, bev=0)
            # rangée de faîtières de pierre (dépasse de 12 cm : ferme l'arête et marque la silhouette)
            P.cylindre((x - (2 * X + .04) / n * .53, cy, s.zf + .11), (x + (2 * X + .04) / n * .53, cy, s.zf + .11), .13, .13, melange(M("pierre_s").couleur(R), M("ardoise").sombre, .25), n=6)
        # épis de bois aux pointes des pignons (sauf contre une cheminée)
        for sx in (-1, 1):
            xe = cx + sx * (X + .03)
            if trou(xe, cy, .35): continue
            poutre(P, (xe, cy, s.zf - .15), (xe, cy, s.zf + .5), l=.11, h=.11, mat="chene")
            P.sphere((xe, cy, s.zf + .56), .09, M("chene").sombre, sub=1)
        # 4. planches de rive sur les pignons (arrêtées avant une cheminée posée au faîte)
        for sx in (-1, 1):
            xr = cx + sx * (X + .03)
            dmin = 0.0
            for (hx, hy, hr) in cheminees:
                if abs(hx - xr) < hr + .3 and abs(hy - cy) < hr: dmin = max(dmin, (hr + .06) / cosa)
            for sg in (-1, 1):
                d0, d1 = dmin, pente + .06; dm = (d0 + d1) / 2
                p = Vector(pt(sg, 0, dm, -.03)); p.x = xr
                P.boite(p, (.08, d1 - d0, .3), M("chene").couleur(R), rx=-sg * ang, bev=.015)
        return s

def tour_pierres(P, r0, r1, z0, z1, ouvertures=(), taille=.6, saillie=.08, fines=()):
    """Tour ronde qui s'affine (rayon r0 en z0, r1 en z1) : pierres en assises, joints décalés d'un rang à l'autre.
    ouvertures : [(a0, a1, oz0, oz1)] en angle (radians, 0 = +X, -π/2 = la façade -Y) : les pierres s'arrêtent au bord.
    Le cœur (un cône de mortier) est à part. Pierres en moellons (teinter() pour une autre matière).
    fines : [(angle, demi_angle, z_max)] : là, les pierres sont coupées en deux (blocs plus petits autour d'une porte)."""
    rr = lambda z: r0 + (r1 - r0) * (z - z0) / (z1 - z0)
    for rang, (z, hz) in enumerate(assises(z0, z1, taille * .8)):
        r = rr(z + hz / 2); n = max(8, round(2 * math.pi * r / (taille * 1.45))); dec = (rang % 2) * .5 + random.Random(rang).uniform(-.15, .15)
        libres = [(0.0, 2 * math.pi)]; bords = [(2 * math.pi * (i + dec) / n) for i in range(n + 1)]
        for (a0, a1, oz0, oz1) in ouvertures:
            if oz0 < z + hz - .04 and z + .04 < oz1:
                larg_a = (a1 - a0) % (2 * math.pi); a0 %= 2 * math.pi; a1 = a0 + larg_a   # on retire [a0, a1] (et son image décalée de 2π)
                libres2 = []
                for (u0, u1) in libres:
                    seg = [(u0, u1)]
                    for (b0, b1) in ((a0, a1), (a0 - 2 * math.pi, a1 - 2 * math.pi)):
                        ns = []
                        for (v0, v1) in seg:
                            if b1 <= v0 or b0 >= v1: ns.append((v0, v1)); continue
                            if b0 > v0: ns.append((v0, b0))
                            if b1 < v1: ns.append((b1, v1))
                        seg = ns
                    libres2 += seg
                libres = libres2
        for i in range(n):
            g0, g1 = bords[i] % (2 * math.pi), None
            g1 = g0 + 2 * math.pi / n
            for (u0, u1) in libres:
                for dec2 in (0, -2 * math.pi):
                    v0, v1 = max(u0, g0 + dec2), min(u1, g1 + dec2)
                    if (v1 - v0) * r < .12: continue
                    am = (v0 + v1) / 2
                    fin = any(abs((am - fa + math.pi) % (2 * math.pi) - math.pi) < fd and z < fz for (fa, fd, fz) in fines)
                    morceaux = [(v0, v1)]
                    if fin and (v1 - v0) * r > .5: c_ = v0 + (v1 - v0) * P.R.uniform(.4, .6); morceaux = [(v0, c_), (c_, v1)]
                    for (w0, w1) in morceaux:
                        am = (w0 + w1) / 2; nrm = Vector((math.cos(am), math.sin(am), 0))
                        p = nrm * (r + saillie * .5 + P.R.uniform(-.012, .015))
                        moellon(P, (p.x, p.y, z + hz / 2), (w1 - w0) * r - .045, hz - .045, am + math.pi / 2 + P.R.uniform(-.02, .02), nrm, ep=.24)

def cone_bardeaux(P, cx, cy, z0, r0, z1, bombe=.25, rang=.3, larg=.3, mat="bardeau"):
    """Chapeau conique un peu bombé couvert de bardeaux de bois en rangs (du bas, rayon r0 en z0, jusqu'à la pointe z1) ;
    dessous brun ; retourne la fonction rayon(z) du dessus."""
    H = z1 - z0
    def rz(z):
        t = max(0.0, min(1.0, (z - z0) / H)); return r0 * (1 - t) * (1 + bombe * math.sin(math.pi * t) * .9)
    def V(p, c): v = P.bm.verts.new(p); v[P.col] = (*c, 1); return v
    R = P.R
    # cœur : cône plein (dessus sombre, dessous brun)
    nc = 16; zs = [z0 + H * i / 6 for i in range(7)]; anneaux = []
    for j, z in enumerate(zs):
        r = max(.02, rz(z) - .03); c = M(mat).sombre if j else M(mat + "_d").couleur(R)
        anneaux.append([V((cx + math.cos(2 * math.pi * i / nc) * r, cy + math.sin(2 * math.pi * i / nc) * r, z), c) for i in range(nc)])
    for j in range(6):
        for i in range(nc):
            a, b = anneaux[j][i], anneaux[j][(i + 1) % nc]; c_, d = anneaux[j + 1][(i + 1) % nc], anneaux[j + 1][i]
            m = (a.co + c_.co) / 2; _face(P, [a, b, c_, d], (m.x - cx, m.y - cy, .5))
    fond = [V((cx + math.cos(2 * math.pi * i / nc) * (r0 - .03), cy + math.sin(2 * math.pi * i / nc) * (r0 - .03), z0 - .02), M(mat + "_d").couleur(R)) for i in range(nc)]
    _face(P, fond, (0, 0, -1))
    # bardeaux : rangs du haut vers le bas, chacun recouvre le suivant
    nr = int(H / (rang * .85)); hs = []
    for j in range(nr):
        za = z1 - .1 - j * rang * .85; zb_ = za - rang * 1.35
        if za <= z0: break
        zb_ = max(zb_, z0 - .12)
        ra, rb = rz(za), rz(zb_) + .05 if zb_ > z0 else r0 + .06
        n = max(5, round(2 * math.pi * rb / larg)); dec = R.uniform(0, 1)
        for i in range(n):
            a0 = 2 * math.pi * (i + dec) / n + .006 * 2 / max(rb, .3); a1 = 2 * math.pi * (i + 1 + dec) / n - .012 / max(rb, .3)
            c = M(mat).couleur(R); ch = melange(c, M(mat).sombre, .45)
            pa0 = (cx + math.cos(a0) * (ra + .01), cy + math.sin(a0) * (ra + .01), za); pa1 = (cx + math.cos(a1) * (ra + .01), cy + math.sin(a1) * (ra + .01), za)
            eb = R.uniform(.035, .055)
            pb0 = (cx + math.cos(a0) * (rb + eb), cy + math.sin(a0) * (rb + eb), zb_); pb1 = (cx + math.cos(a1) * (rb + eb), cy + math.sin(a1) * (rb + eb), zb_)
            pl0 = (cx + math.cos(a0) * (rb + .005), cy + math.sin(a0) * (rb + .005), zb_ - .01); pl1 = (cx + math.cos(a1) * (rb + .005), cy + math.sin(a1) * (rb + .005), zb_ - .01)
            A, B_, C, D = V(pa0, ch), V(pa1, ch), V(pb1, c), V(pb0, c); C2, D2 = V(pl1, melange(c, M(mat).sombre, .6)), V(pl0, melange(c, M(mat).sombre, .6))
            am = (a0 + a1) / 2; out = (math.cos(am), math.sin(am), .6)
            _face(P, [A, D, C, B_], out); _face(P, [D, D2, C2, C], (math.cos(am), math.sin(am), -.4))
    return rz

def cheminee_pignon(P, x_mur, y, z0, z1, z_epaule=2.4, base=(1.0, 1.56), conduit=(.8, 1.1), taille=.62, c_coeur=None, mat="moellon"):
    """Grosse cheminée maçonnée contre un pignon (à l'extérieur, vers +X depuis le plan du mur x_mur) : un massif large
    (saillie, largeur = base) jusqu'à z_epaule, un glacis de pierres plates en pente, puis le conduit (saillie, largeur =
    conduit) jusqu'à z1. Chaque face est un vrai mur de moellons (assises communes, chaînage aux angles : plusieurs
    pierres par rang sur chaque face) en matière mat ; glacis et chapeau de pierre claire, deux pots de terre cuite.
    """
    c_coeur = c_coeur or M("mortier").couleur(P.R)
    xb = x_mur - .3
    def massif(xf, l, za, zb_, dos):
        """Un bloc maçonné : à chaque rang, une vraie pierre d'angle à chaque coin (longue sur une face, courte sur
        l'autre, alternées d'un rang à l'autre, arêtes biseautées comme les moellons), puis les faces remplies de
        moellons entre les pierres d'angle. Rangs du sol (z < 0,1 m) plus saillants : un pied qui pose la cheminée."""
        P.boite(((xb + xf) / 2 - .02, y, (za + zb_) / 2), (xf - xb - .1, l - .1, zb_ - za), c_coeur, bev=0)
        n0 = nb_sommets(P); R = P.R
        for rang, (z, hz) in enumerate(assises(za, zb_, taille)):
            s_ = .13 + (.08 if z < .1 else 0)
            X0, X1, Y0, Y1 = xb - s_, xf + s_, y - l / 2 - s_, y + l / 2 + s_
            coins = [(X1, Y0, -1, 1), (X1, Y1, -1, -1)] + ([(X0, Y0, 1, 1), (X0, Y1, 1, -1)] if dos else [])
            ext = {}
            for i, (cx_, cy_, dx, dy) in enumerate(coins):
                long_x = (rang + i) % 2 == 0
                lx = min((X1 - X0) * (.5 if dos else .8) - .03, taille * (1.15 if long_x else .7))
                ly = min((Y1 - Y0) * .5 - .03, taille * (.7 if long_x else 1.15))
                ext[i] = (lx, ly)
                c = M("moellon").couleur(R, .1)
                P.boite((cx_ + dx * lx / 2, cy_ + dy * ly / 2, z + hz / 2), (lx - .04, ly - .04, hz - .04), c, rz=R.uniform(-.02, .02), bev=min(.06, hz * .22), jit=.012)
            def remplir(u0, u1, fixe, selon_x, nrm):
                L = u1 - u0
                if L < .12: return
                k = max(1, round(L / (taille * 1.1))); cuts = sorted([u0, u1] + [u0 + L * (j + R.uniform(-.2, .2)) / k for j in range(1, k)])
                for j in range(k):
                    v0, v1 = cuts[j], cuts[j + 1]; um = (v0 + v1) / 2
                    ctr = (um, fixe, z + hz / 2) if selon_x else (fixe, um, z + hz / 2)
                    moellon(P, ctr, v1 - v0 - .045, hz - .045, (0 if selon_x else math.pi / 2) + R.uniform(-.02, .02), nrm, ep=.24)
            remplir(Y0 + ext[0][1], Y1 - ext[1][1], X1 - .12, False, Vector((1, 0, 0)))                                    # devant
            remplir((X0 + ext[2][0]) if dos else xb, X1 - ext[0][0], Y0 + .12, True, Vector((0, -1, 0)))                 # côtés
            remplir((X0 + ext[3][0]) if dos else xb, X1 - ext[1][0], Y1 - .12, True, Vector((0, 1, 0)))
            if dos: remplir(Y0 + ext[2][1], Y1 - ext[3][1], X0 + .12, False, Vector((-1, 0, 0)))                          # dos
        if mat != "moellon": teinter(P, n0, mat, int(za * 10) + 3)
    massif(x_mur + base[0], base[1], z0, z_epaule, False)
    massif(x_mur + conduit[0], conduit[1], z_epaule - .05, z1, True)
    # glacis : pierres plates en pente qui couvrent le haut du massif autour du conduit
    xf0, xf1, l0, l1 = x_mur + base[0] + .13, x_mur + conduit[0] + .13, base[1] / 2 + .13, conduit[1] / 2 + .13; h = .42   # faces des pierres (13 cm devant le cœur)
    n = 3
    for i in range(n):   # devant
        yy = y - l0 + (i + .5) * 2 * l0 / n
        a = math.atan2(h, xf0 - xf1 + .1)
        P.boite(((xf0 + xf1) / 2 + .05, yy, z_epaule + h / 2 + .02), (math.hypot(h, xf0 - xf1 + .1), 2 * l0 / n - .03, .1), M("moellon").couleur(P.R, .05), ry=a, bev=.03)
    for s in (-1, 1):    # côtés
        for i in range(n):
            xx = xb + .15 + (i + .5) * (xf0 - xb - .1) / n
            a = math.atan2(h, l0 - l1 + .1)
            P.boite((xx, y + s * ((l0 + l1) / 2 + .05), z_epaule + h / 2 + .02), ((xf0 - xb - .1) / n - .03, math.hypot(h, l0 - l1 + .1), .1), M("moellon").couleur(P.R, .05), rx=-s * a, bev=.03)
    # chapeau et pots
    xm = (xb - .13 + xf1) / 2
    P.boite((xm, y, z1 + .08), (xf1 - xb + .37, conduit[1] + .5, .16), M("moellon").couleur(P.R, .03), bev=.04)
    for s in (-1, 1):
        P.cylindre((xm, y + s * conduit[1] * .22, z1 + .16), (xm, y + s * conduit[1] * .22, z1 + .52), .14, .11, M("terre").couleur(P.R), n=8)
        P.cylindre((xm, y + s * conduit[1] * .22, z1 + .48), (xm, y + s * conduit[1] * .22, z1 + .56), .15, .15, M("terre").couleur(P.R), n=8)
