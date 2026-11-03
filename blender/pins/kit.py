# Le Domaine des Pins : le kit de pièces des bâtiments (étage 2 de la méthode, blender/pins/METHODE.md).
# Une planche, un mur en bardage à clin, un mur en planches à couvre-joints, un soubassement de pierres, une fenêtre à volets,
# un encadrement de porte, un auvent, un toit de bardeaux à deux pans, un pignon, une cheminée, une terrasse et son garde-corps…
# Tous les bâtiments (batiments/*.py) et objets (objets/*.py) sont faits de ces pièces et des matières de materiaux.py.
# Repère Blender : Z vers le haut, la façade (porte) regarde -Y, le sol est à z = 0. (Dans le jeu : x = x, y = z, z = -y.)
# Un mur est décrit par Mur(a, b, ep) : a → b sur la face extérieure du cœur, murs tournant dans le sens trigonométrique
# (vus de dessus), l'extérieur est à droite. Coordonnées d'un mur : u le long du mur (0 en a), z la hauteur, w vers l'extérieur.
import bpy, bmesh, math, random
from mathutils import Vector, Matrix
from materiaux import M, melange

class Piece:
    """Un objet en construction : bmesh + couleur par sommet (attribut « Col »). Toutes les pièces d'un objet sont fusionnées."""
    def __init__(s, nom, graine=1):
        s.nom = nom; s.bm = bmesh.new(); s.col = s.bm.verts.layers.float_color.new("Col"); s.R = random.Random(graine)
    def _fin(s, verts, c, bev=0.0, jit=0.0):
        for v in verts: v[s.col] = (*c, 1)
        if jit:
            for v in verts: v.co += Vector((s.R.uniform(-jit, jit), s.R.uniform(-jit, jit), s.R.uniform(-jit, jit)))
        if bev:
            vs = set(verts); edges = list({e for v in verts for e in v.link_edges if e.verts[0] in vs and e.verts[1] in vs})
            r = bmesh.ops.bevel(s.bm, geom=edges, offset=bev, segments=1, affect="EDGES", profile=.5)
            for v in r["verts"]: v[s.col] = (*c, 1)
    def boite(s, centre, taille, c, rz=0.0, rx=0.0, ry=0.0, bev=0.0, jit=0.0):
        Mx = Matrix.Translation(Vector(centre)) @ Matrix.Rotation(rz, 4, "Z") @ Matrix.Rotation(ry, 4, "Y") @ Matrix.Rotation(rx, 4, "X") @ Matrix.Diagonal((*taille, 1))
        r = bmesh.ops.create_cube(s.bm, size=1, matrix=Mx); s._fin(r["verts"], c, min(bev, min(taille) * .3), jit); return r["verts"]
    def boite_m(s, Mx, c, bev=0.0, sans=None):
        """Une boîte unité transformée par une matrice (pour les pièces posées dans le repère d'un mur).
        sans : direction de la face cachée contre le mur, qu'on ne garde pas (deux triangles de moins)."""
        r = bmesh.ops.create_cube(s.bm, size=1, matrix=Mx); s._fin(r["verts"], c, bev)
        if sans is not None:
            d = Vector(sans).normalized(); fs = {f for v in r["verts"] for f in v.link_faces}
            for f in fs: f.normal_update()
            bmesh.ops.delete(s.bm, geom=[f for f in fs if f.normal.dot(d) > .9], context="FACES_ONLY")
        return r["verts"]
    def cylindre(s, a, b, r1, r2, c, n=10, jit=0.0):
        a, b = Vector(a), Vector(b); d = b - a
        Mx = Matrix.Translation((a + b) / 2) @ d.to_track_quat("Z", "Y").to_matrix().to_4x4()
        r = bmesh.ops.create_cone(s.bm, cap_ends=True, segments=n, radius1=r1, radius2=r2, depth=d.length, matrix=Mx); s._fin(r["verts"], c, 0, jit); return r["verts"]
    def sphere(s, centre, rayon, c, ech=(1, 1, 1), sub=1, jit=0.0):
        Mx = Matrix.Translation(Vector(centre)) @ Matrix.Diagonal((*ech, 1))
        r = bmesh.ops.create_icosphere(s.bm, subdivisions=sub, radius=rayon, matrix=Mx); s._fin(r["verts"], c, 0, jit); return r["verts"]
    def face(s, pts, c, vers=None):
        """Une face (3 ou 4 points). vers : direction où la face doit regarder (on retourne l'ordre si besoin)."""
        pts = [Vector(p) for p in pts]
        if vers is not None:
            n = (pts[1] - pts[0]).cross(pts[2] - pts[0])
            if n.dot(Vector(vers)) < 0: pts = pts[::-1]
        vs = [s.bm.verts.new(p) for p in pts]
        for v in vs: v[s.col] = (*c, 1)
        return s.bm.faces.new(vs)
    def face_grille(s, pts, c, vers=None, pas=.5, nu_min=1):
        """Un quadrilatère découpé en petits carreaux (côté ~ pas) : l'occlusion cuite par sommet reste locale
        (sinon une longue planche prend l'ombre d'un volet sur toute sa longueur)."""
        p00, p10, p11, p01 = [Vector(p) for p in pts]
        nu = max(nu_min, math.ceil(max((p10 - p00).length, (p11 - p01).length) / pas)); nv = max(1, math.ceil(max((p01 - p00).length, (p11 - p10).length) / pas))
        P = lambda i, j: (p00 * (1 - i / nu) + p10 * (i / nu)) * (1 - j / nv) + (p01 * (1 - i / nu) + p11 * (i / nu)) * (j / nv)
        for i in range(nu):
            for j in range(nv): s.face([P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)], c, vers)
    def ajouter(s, autre, Mx=None):
        me = bpy.data.meshes.new("tmp"); autre.bm.to_mesh(me)
        if Mx is not None: me.transform(Mx)
        s.bm.from_mesh(me); bpy.data.meshes.remove(me)
    def objet(s, props=None, scene=None, lieu=(0, 0, 0)):
        scene = scene or bpy.context.scene
        me = bpy.data.meshes.new(s.nom)
        s.bm.normal_update(); s.bm.to_mesh(me); s.bm.free()
        for p in me.polygons: p.use_smooth = False
        ob = bpy.data.objects.new(s.nom, me); scene.collection.objects.link(ob); ob.location = lieu
        for k, v in (props or {}).items(): ob[k] = v
        return ob

# ------------------------------------------------------------------ outils
def poutre(P, a, b, l=.12, h=.12, mat="rambarde", c=None, bev=0.0):
    """Une pièce de bois équarrie de a à b, section l × h (tout le bois fin du domaine en est fait)."""
    a, b = Vector(a), Vector(b); d = b - a; L = d.length
    q = d.to_track_quat("Z", "Y" if abs(d.normalized().z) < .95 else "X")
    Mx = Matrix.Translation((a + b) / 2) @ q.to_matrix().to_4x4() @ Matrix.Diagonal((l, h, L, 1))
    r = bmesh.ops.create_cube(P.bm, size=1, matrix=Mx); P._fin(r["verts"], c or M(mat).couleur(P.R), bev); return r["verts"]

def moins(z0, z1, trous):
    """L'intervalle [z0, z1] moins une liste d'intervalles : liste d'intervalles restants."""
    res = [(z0, z1)]
    for (a, b) in trous:
        nv = []
        for (c, d) in res:
            if b <= c or a >= d: nv.append((c, d)); continue
            if a > c: nv.append((c, a))
            if b < d: nv.append((b, d))
        res = nv
    return [(c, d) for (c, d) in res if d - c > .004]

class Mur:
    """Un mur droit : a → b (2D, face extérieure du cœur), épaisseur ep vers l'intérieur. ouv : ouvertures (u0, u1, z0, z1)."""
    def __init__(s, a, b, ep=.24, ouv=()):
        s.a = Vector((*a, 0)); s.b = Vector((*b, 0)); d = s.b - s.a; s.L = d.length; s.t = d / s.L
        s.n = Vector((s.t.y, -s.t.x, 0)); s.ep = ep; s.ouv = list(ouv)
    def p(s, u, z, w=0.0): q = s.a + s.t * u + s.n * w; return Vector((q.x, q.y, z))
    def Mx(s, u, z, w, lu, lz, lw, inclinaison=0.0, tourne=0.0):
        """Matrice d'une boîte de taille (lu, lz, lw) centrée en (u, z, w) dans le repère du mur
        (inclinaison : autour de l'axe du mur ; tourne : dans le plan du mur)."""
        R = Matrix(((s.t.x, 0, s.n.x), (s.t.y, 0, s.n.y), (0, 1, 0))).to_4x4()
        return Matrix.Translation(s.p(u, z, w)) @ R @ Matrix.Rotation(inclinaison, 4, "X") @ Matrix.Rotation(tourne, 4, "Z") @ Matrix.Diagonal((lu, lz, lw, 1))
    def coupes(s, u0, u1):
        """Découpe [u0, u1] aux bords des ouvertures : [(u0, u1, trous en z)]."""
        br = sorted({u0, u1, *[o[0] for o in s.ouv if u0 < o[0] < u1], *[o[1] for o in s.ouv if u0 < o[1] < u1]})
        res = []
        for x0, x1 in zip(br, br[1:]):
            m = (x0 + x1) / 2; res.append((x0, x1, [(o[2], o[3]) for o in s.ouv if o[0] < m < o[1]]))
        return res

def face_mur(P, mur, w, z0, z1, mat, vers_dehors, u0=0.0, u1=None):
    """Une surface plane du mur (lambris intérieur, cœur), percée des ouvertures."""
    u1 = mur.L if u1 is None else u1
    zs = sorted({z0, z1, *[o[2] for o in mur.ouv if z0 < o[2] < z1], *[o[3] for o in mur.ouv if z0 < o[3] < z1]})
    for (x0, x1, trous) in mur.coupes(u0, u1):
        for (za, zb) in moins(z0, z1, trous):
            P.face([mur.p(x0, za, w), mur.p(x1, za, w), mur.p(x1, zb, w), mur.p(x0, zb, w)], M(mat).couleur(P.R), mur.n * (1 if vers_dehors else -1))

def tableaux(P, mur, w0, w1, mat="creme"):
    """Les tableaux (épaisseur du mur) autour de chaque ouverture : pas de trou entre l'intérieur et l'extérieur."""
    for (u0, u1, z0, z1) in mur.ouv:
        c = M(mat).couleur(P.R)
        P.face([mur.p(u0, z0, w0), mur.p(u0, z1, w0), mur.p(u0, z1, w1), mur.p(u0, z0, w1)], c, mur.t)
        P.face([mur.p(u1, z0, w0), mur.p(u1, z1, w0), mur.p(u1, z1, w1), mur.p(u1, z0, w1)], c, -mur.t)
        P.face([mur.p(u0, z1, w0), mur.p(u1, z1, w0), mur.p(u1, z1, w1), mur.p(u0, z1, w1)], c, (0, 0, -1))
        if z0 > .3: P.face([mur.p(u0, z0, w0), mur.p(u1, z0, w0), mur.p(u1, z0, w1), mur.p(u0, z0, w1)], c, (0, 0, 1))

# ------------------------------------------------------------------ 1. le bardage à clin (rez-de-chaussée)
def bardage_clin(P, mur, z0, z1, rang=.19, mat="clin", recouvre=.03, saillie=.034):
    """Planches horizontales qui se recouvrent : le bas de chaque planche avance (ombre nette sous chaque rang),
    coupées au bord des ouvertures (les morceaux au-dessus et au-dessous des fenêtres sont gardés), joints décalés."""
    n = max(1, round((z1 - z0) / rang)); h = (z1 - z0) / n
    for k in range(n):
        zb, zt = z0 + k * h, z0 + (k + 1) * h   # (la face s'arrête sous la planche du dessus : pas de sommet caché dessous, que l'occlusion noircirait)
        # joints de planches : un aboutement tous les 3 à 5 m, décalé d'un rang à l'autre
        joints = [0.0]; u = P.R.uniform(.8, 3.2)
        while u < mur.L - .8: joints.append(u); u += P.R.uniform(3.0, 4.6)
        joints.append(mur.L)
        for j0, j1 in zip(joints, joints[1:]):
            c = M(mat).couleur(P.R)
            for (x0, x1, trous) in mur.coupes(j0, j1):
                for (za, zb2) in moins(zb, zt, trous):
                    wa = saillie if za == zb else saillie * (zt - za) / (zt - zb) * .9 + .004   # avancée en bas, à fleur en haut
                    wb = .008
                    f = 1 + P.R.uniform(-.025, .025); cc = tuple(min(1, x * f) for x in c)
                    P.face_grille([mur.p(x0, za, wa), mur.p(x1, za, wa), mur.p(x1, zb2, wb), mur.p(x0, zb2, wb)], cc, mur.n, pas=.8)
                    P.face([mur.p(x0, za, 0), mur.p(x1, za, 0), mur.p(x1, za, wa), mur.p(x0, za, wa)], M("chant").couleur(P.R), (0, 0, -1))   # chant du bas (ligne d'ombre nette)
                    for (uu, sg) in ((x0, -1), (x1, 1)):
                        if 1e-3 < uu < mur.L - 1e-3:
                            P.face([mur.p(uu, za, 0), mur.p(uu, za, wa), mur.p(uu, zb2, wb), mur.p(uu, zb2, 0)], M("bois_d").couleur(P.R), mur.t * sg)

# ------------------------------------------------------------------ 2. planches verticales à couvre-joints (étage, pignons)
def planches_verticales(P, mur, z0, z1, larg=.24, mat="latte", haut=None, bas=None, PJ=None):
    """Planches debout et couvre-joints. haut(u) / bas(u) : hauteur du haut / du bas de la planche à l'abscisse u
    (pour un pignon : le haut suit le toit). Coupées au bord des ouvertures.
    PJ : pièce « J_ » qui reçoit les couvre-joints. Elle est cachée pendant la cuisson de l'occlusion des planches
    (sinon chaque sommet de planche, sous un couvre-joint, sort noir), puis fusionnée (apercu.cuire_occlusion)."""
    PJ = PJ or P
    n = max(1, round(mur.L / larg)); lg = mur.L / n
    H = haut or (lambda u: z1); B = bas or (lambda u: z0)
    for k in range(n):
        u0, u1 = k * lg, (k + 1) * lg; c = M(mat).couleur(P.R); w = .012 + P.R.uniform(-.003, .003)
        for (x0, x1, trous) in mur.coupes(u0, u1):
            ztop0, ztop1 = H(x0), H(x1); zbot = min(B(x0), B(x1))
            zmax = max(ztop0, ztop1)
            for (za, zb) in moins(zbot, zmax, trous):
                t0 = min(zb, ztop0); t1 = min(zb, ztop1)
                if t0 - za < .01 and t1 - za < .01: continue
                P.face_grille([mur.p(x0, za, w), mur.p(x1, za, w), mur.p(x1, max(t1, za + .01), w), mur.p(x0, max(t0, za + .01), w)], c, mur.n, pas=.75)
        # couvre-joint sur le joint de droite
        if k < n - 1:
            uj = u1; cb = M("couvre").couleur(P.R)
            # un seul couvre-joint par joint (deux boîtes confondues se cachent l'une l'autre à la cuisson et sortent noires)
            trous = [(o[2], o[3]) for o in mur.ouv if o[0] < uj + .03 and o[1] > uj - .03]
            zt = min(H(uj - .03), H(uj + .03)) - .02
            for (za, zb) in moins(B(uj), zt, trous):
                if zb - za > .05: PJ.boite_m(mur.Mx(uj, (za + zb) / 2, .03, .055, zb - za, .036), cb, sans=-mur.n)

# ------------------------------------------------------------------ 3. le soubassement de pierres
def soubassement(P, mur, z0, z1, ouv_u=(), rang=.2, saillie=.05):
    """Pierres en deux ou trois assises irrégulières au pied des murs, joints en retrait (plus sombres), arrêtées aux portes."""
    face = [(0.0, mur.L)]
    for (a, b) in ouv_u: face = moins_liste(face, (a, b))
    n = max(1, round((z1 - z0) / rang)); h = (z1 - z0) / n
    for (ua, ub) in face:
        P.face([mur.p(ua, z0 - .1, saillie - .02), mur.p(ub, z0 - .1, saillie - .02), mur.p(ub, z1, saillie - .02), mur.p(ua, z1, saillie - .02)], M("mortier").couleur(P.R), mur.n)
        for k in range(n):
            u = ua - P.R.uniform(0, .25) if k % 2 else ua; zc = z0 + (k + .5) * h
            while u < ub - .02:
                lu = min(P.R.uniform(.32, .62), ub - u)
                if ub - u - lu < .18: lu = ub - u   # pas de petite pierre en bout
                a0 = max(u, ua); a1 = min(u + lu, ub)
                if a1 - a0 > .06:
                    P.boite_m(mur.Mx((a0 + a1) / 2, zc + P.R.uniform(-.012, .012), saillie - .045, a1 - a0 - .025, h - .028, .09 + P.R.uniform(0, .02)), M("pierre").couleur(P.R), sans=-mur.n)
                u += lu
    # dessus du soubassement (petit rebord)
    for (ua, ub) in face:
        P.face([mur.p(ua, z1, 0), mur.p(ub, z1, 0), mur.p(ub, z1, saillie + .01), mur.p(ua, z1, saillie + .01)], M("pierre").couleur(P.R), (0, 0, 1))

def moins_liste(liste, trou):
    return [iv for (c, d) in liste for iv in moins(c, d, [trou])]

# ------------------------------------------------------------------ 4. boiseries : cornière, ceinture, encadrements
def corniere(P, x, y, sx, sy, z0, z1, larg=.15, ep=.04, mat="creme"):
    """Planches d'angle (deux planches qui se rejoignent) au coin (x, y) ; sx, sy : directions vers l'extérieur."""
    c = M(mat).couleur(P.R)
    P.boite(((x + sx * (ep / 2 + .035)), y + sy * (larg / 2 - .02 - ep), (z0 + z1) / 2), (ep, larg, z1 - z0), c)
    P.boite((x + sx * (larg / 2 - .02 - ep), (y + sy * (ep / 2 + .035)), (z0 + z1) / 2), (larg, ep, z1 - z0), c)

def ceinture(P, murs, z0, z1, saillie=.07, mat="creme"):
    """Bandeau horizontal tout autour (entre les étages), avec un larmier qui avance au-dessus."""
    for m in murs:
        c = M(mat).couleur(P.R)
        P.boite_m(m.Mx(m.L / 2, (z0 + z1) / 2, saillie / 2, m.L + 2 * saillie, z1 - z0, saillie), c)
        P.boite_m(m.Mx(m.L / 2, z1 + .025, saillie * .75, m.L + 2 * saillie + .04, .05, saillie * 1.5), M("creme").couleur(P.R))

def encadrement(P, mur, u0, u1, z0, z1, larg=.11, ep=.045, w=.035, appui=True, mat="creme"):
    """Chambranle autour d'une ouverture (planches posées sur le bardage) et appui incliné en bas."""
    c = M(mat).couleur(P.R)
    for uu in (u0 - larg / 2, u1 + larg / 2): P.boite_m(mur.Mx(uu, (z0 + z1) / 2 + .02, w + ep / 2, larg, z1 - z0 + .04, ep), c, sans=-mur.n)
    P.boite_m(mur.Mx((u0 + u1) / 2, z1 + larg / 2, w + ep / 2, u1 - u0 + 2 * larg + .06, larg, ep * 1.3), c, sans=-mur.n)        # linteau
    P.boite_m(mur.Mx((u0 + u1) / 2, z1 + larg + .02, w + ep, u1 - u0 + 2 * larg + .1, .04, ep * 2.2), c, sans=-mur.n)            # petit larmier
    if appui:
        P.boite_m(mur.Mx((u0 + u1) / 2, z0 - .035, w + .05, u1 - u0 + 2 * larg + .12, .06, .16, inclinaison=-.12), c, sans=-mur.n)

# ------------------------------------------------------------------ 5. la fenêtre à volets
def fenetre(P, V, mur, u, zc, l=1.3, h=1.05, volets=True, jardiniere=False, croisillon=True):
    """Fenêtre : vitre (dans V, que le jeu éclaire la nuit) au milieu du mur, croisillon et dormant crème,
    chambranle, appui, volets verts à planches et écharpe en Z, pentures noires ; jardinière fleurie si demandé."""
    u0, u1, z0, z1 = u - l / 2, u + l / 2, zc - h / 2, zc + h / 2
    wv = -mur.ep * .45
    V.face([mur.p(u0, z0, wv), mur.p(u1, z0, wv), mur.p(u1, z1, wv), mur.p(u0, z1, wv)], M("vitre").teintes[0], mur.n)
    V.face([mur.p(u0, z0, wv - .002), mur.p(u1, z0, wv - .002), mur.p(u1, z1, wv - .002), mur.p(u0, z1, wv - .002)], M("vitre").teintes[0], -mur.n)
    cr = M("creme").couleur(P.R)
    for (a, b) in ((u0, u0 + .06), (u1 - .06, u1)): P.boite_m(mur.Mx((a + b) / 2, zc, wv, b - a, h, .07), cr)                   # dormant
    for (a, b) in ((z0, z0 + .06), (z1 - .06, z1)): P.boite_m(mur.Mx(u, (a + b) / 2, wv, l, b - a, .07), cr)
    if croisillon:
        P.boite_m(mur.Mx(u, zc + h * .08, wv + .01, l - .1, .05, .05), cr); P.boite_m(mur.Mx(u, zc, wv + .01, .05, h - .1, .05), cr)
    encadrement(P, mur, u0, u1, z0, z1)
    if volets:
        lv = l / 2 + .02
        for sg in (-1, 1):
            uc = u + sg * (l / 2 + .12 + lv / 2); c = M("volet").couleur(P.R)
            for k in range(3):   # trois planches, de très légères nuances
                cc = tuple(min(1, x * (1 + P.R.uniform(-.04, .04))) for x in c)
                P.boite_m(mur.Mx(uc - lv / 2 + (k + .5) * lv / 3, zc, .07, lv / 3 - .012, h + .12, .035), cc, sans=-mur.n)
            for zz in (zc - h * .32, zc + h * .32): P.boite_m(mur.Mx(uc, zz, .095, lv - .02, .09, .02), tuple(x * .85 for x in c), sans=-mur.n)   # traverses
            P.boite_m(mur.Mx(uc, zc, .095, .07, math.hypot(lv - .1, h * .62), .018, tourne=sg * math.atan2(lv - .1, h * .62)), tuple(x * .85 for x in c), sans=-mur.n)   # écharpe
            for zz in (zc - h * .32, zc + h * .32): P.boite_m(mur.Mx(uc - sg * lv * .2, zz, .11, lv * .6, .03, .012), M("fer").couleur(P.R), sans=-mur.n)   # pentures
    if jardiniere:
        P.boite_m(mur.Mx(u, z0 - .2, .2, l + .1, .22, .24), M("rambarde").couleur(P.R))
        for k in range(9):
            uu = u0 + (k + .5) * (l / 9) + P.R.uniform(-.04, .04)
            q = mur.p(uu, z0 - .05 + P.R.uniform(0, .06), .2 + P.R.uniform(-.05, .05))
            P.sphere(q, P.R.uniform(.09, .12), M("feuillage").couleur(P.R), (1, 1, .8), sub=1, jit=.015)
            if k % 2 == 0: P.sphere(q + Vector((0, 0, .08)) + mur.n * .05, .055, M("fleur").couleur(P.R), sub=0)

def porte_cadre(P, mur, u, l=1.1, h=2.42, z_sol=.2):
    """Encadrement de la porte d'entrée (la porte elle-même tourne dans le jeu), seuil en bois."""
    u0, u1 = u - l / 2, u + l / 2
    encadrement(P, mur, u0, u1, z_sol, h, larg=.13, appui=False)
    P.boite_m(mur.Mx(u, z_sol - .02, -mur.ep / 2 + .03, l, .04, mur.ep + .1), M("lame").couleur(P.R))   # seuil

def auvent(P, mur, u, z, l=2.0, prof=.95, pente=.42):
    """Petit auvent à deux pans au-dessus de la porte : deux consoles, chevrons, bardeaux, rives crème."""
    k = pente; demi = l / 2
    for sg in (-1, 1):   # consoles (jambes de force)
        uu = u + sg * (demi - .12)
        poutre(P, mur.p(uu, z, .02), mur.p(uu, z, prof - .05), .09, .11, mat="rambarde")
        poutre(P, mur.p(uu, z - .55, .02), mur.p(uu, z - .02, prof * .7), .07, .08, mat="rambarde")
    zf = z + .12 + demi * k
    for sg in (-1, 1):
        # pan de toit : plaque + 3 rangs de bardeaux
        def pt(s_, w): return mur.p(u + sg * s_, zf - s_ * k + .02, w)
        P.face([pt(0, 0), pt(demi + .1, 0), pt(demi + .1, prof + .05), pt(0, prof + .05)], M("bardeau_d").couleur(P.R), (0, 0, -1))
        for r in range(4):
            s0 = demi + .1 - r * (demi + .1) / 4; s1 = s0 - (demi + .1) / 4 - .05
            w = 0.0
            while w < prof + .05:
                lw = min(P.R.uniform(.22, .32), prof + .05 - w); c = M("bardeau").couleur(P.R)
                a = pt(s0, w); b = pt(s0, w + lw - .01); cc = pt(max(s1, 0), w + lw - .01); d = pt(max(s1, 0), w)
                lift = Vector((0, 0, .03))
                P.face([a + lift, b + lift, cc + lift * .3, d + lift * .3], c, (0, 0, 1))
                P.face([a, b, b + lift, a + lift], M("bardeau_c").couleur(P.R), mur.t * sg)
                w += lw
        # rive crème sur le bord avant
        poutre(P, mur.p(u, zf + .04, prof + .07), mur.p(u + sg * (demi + .12), zf - (demi + .12) * k + .04, prof + .07), .05, .13, mat="creme")
    poutre(P, mur.p(u, zf + .06, .0), mur.p(u, zf + .06, prof + .09), .1, .07, mat="faitage")

def lanterne_murale(P, V, mur, u, z):
    """Applique d'éclairage à côté de la porte : potence en fer, cage noire, verre (dans V : il s'allume la nuit)."""
    f = M("fer").couleur(P.R)
    P.boite_m(mur.Mx(u, z + .18, .03, .12, .2, .03), f)
    poutre(P, mur.p(u, z + .25, .04), mur.p(u, z + .25, .24), .03, .03, c=f)
    P.boite_m(mur.Mx(u, z + .2, .22, .2, .04, .2), f); P.boite_m(mur.Mx(u, z - .08, .22, .17, .04, .17), f)
    P.boite_m(mur.Mx(u, z + .26, .22, .1, .08, .1), f)
    for (du, dw) in ((-.08, -.08), (.08, -.08), (-.08, .08), (.08, .08)): P.boite_m(mur.Mx(u + du, z + .06, .22 + dw, .018, .28, .018), f)
    V.boite_m(mur.Mx(u, z + .06, .22, .14, .26, .14), M("vitre").teintes[0])

# ------------------------------------------------------------------ 6. le toit de bardeaux à deux pans (faîtage le long de Y)
class ToitBardeaux:
    """Toit à deux pans, faîtage parallèle à Y (pignons sur la façade avant et arrière). z(x) = z_bord + (X - |x|)·k.
    Rangs de bardeaux posés depuis l'égout, chaque bardeau soulevé à son bord bas (ombre de chaque rang), joints
    décalés d'un rang à l'autre, nuances tirées une à une. Dessous et tranches en brun chaud (à l'ombre)."""
    def __init__(s, X, Y, z_bord, k, ep=.2, y0=0.0):
        s.X, s.Y, s.zb, s.k, s.ep, s.y0 = X, Y, z_bord, k, ep, y0; s.zf = z_bord + X * k
    def z(s, x): return s.zb + (s.X - abs(x)) * s.k
    def dessous(s, x): return s.z(x) - s.ep * math.sqrt(1 + s.k * s.k)
    def construire(s, P, rang=.31, cheminees=()):
        X, Y, k, y0 = s.X, s.Y, s.k, s.y0; L = X * math.sqrt(1 + k * k); ca = 1 / math.sqrt(1 + k * k)
        e = s.ep * math.sqrt(1 + k * k)
        def trou(x, y): return any(abs(x - hx) < hr + .08 and abs(y - hy) < hr + .08 for (hx, hy, hr) in cheminees)
        for sg in (-1, 1):
            def pt(d, y, h=0.0):   # d : distance depuis l'égout le long de la pente ; h : au-dessus de la surface
                x = sg * (X - d * ca); return Vector((x, y0 + y, s.z(x) + h / ca))
            # plaque : dessus sombre (sous les bardeaux), dessous brun, tranche d'égout
            P.face([pt(0, -Y), pt(L, -Y), pt(L, Y), pt(0, Y)], M("faitage").couleur(P.R), (sg * k, 0, 1))
            P.face([pt(0, -Y) - Vector((0, 0, e)), pt(L, -Y) - Vector((0, 0, e)), pt(L, Y) - Vector((0, 0, e)), pt(0, Y) - Vector((0, 0, e))], M("bardeau_d").couleur(P.R), (0, 0, -1))
            # rangs de bardeaux
            n = int(L / rang) + 1
            for r in range(n):
                d0 = r * rang - .04; d1 = min(L - .02, d0 + rang + .07)
                if d0 >= L - .05: break
                yy = -Y - (P.R.uniform(.1, .24) if r % 2 else 0)
                while yy < Y:
                    lw = P.R.uniform(.3, .48); a, b = max(yy, -Y), min(yy + lw, Y)
                    if b - a > .05:
                        xc = sg * (X - (d0 + d1) / 2 * ca)
                        if not trou(xc, (a + b) / 2 + y0):
                            c = M("bardeau").couleur(P.R)
                            if r == 0: c = tuple(x * .9 for x in c)
                            lift = .035
                            q = [pt(d0, a + .008, lift), pt(d0, b - .008, lift), pt(d1, b - .008, .008), pt(d1, a + .008, .008)]
                            P.face(q, c, (sg * k, 0, 1))
                    yy += lw
                P.face([pt(d0, -Y, 0), pt(d0, Y, 0), pt(d0, Y, .035), pt(d0, -Y, .035)], M("bardeau_c").couleur(P.R), (sg, 0, -.3))   # chant du rang
            # chevrons visibles sous l'égout, planche de rive (bandeau) et gouttière
            for i in range(int(2 * Y / .6) + 1):
                yy = -Y + .25 + i * (2 * Y - .5) / int(2 * Y / .6)
                xa = sg * (X - .02); xb = sg * (X - 1.0)
                poutre(P, Vector((xa, y0 + yy, s.z(xa) - e - .06)), Vector((xb, y0 + yy, s.z(xb) - e - .06)), .07, .11, mat="bardeau_d")
            xa = sg * (X + .02)
            poutre(P, Vector((xa, y0 - Y - .05, s.zb - e * .4)), Vector((xa, y0 + Y + .05, s.zb - e * .4)), .05, e + .1, mat="creme")
            P.cylindre((xa + sg * .1, y0 - Y - .05, s.zb - e * .55), (xa + sg * .1, y0 + Y + .05, s.zb - e * .55), .07, .07, M("zinc").couleur(P.R), n=7)
            # planches de rive sur les pignons (crème, épaisses : elles dessinent la silhouette du chalet)
            for sy in (-1, 1):
                a = Vector((sg * (X + .05), y0 + sy * (Y + .03), s.z(X + .05) - e * .5))
                b = Vector((0, y0 + sy * (Y + .03), s.zf + .02 - e * .5))
                poutre(P, a, b, .06, e + .14, mat="creme")
        # faîtage : deux planches en V renversé et un épi à chaque bout
        for sg in (-1, 1):
            a = Vector((sg * .13, y0 - Y - .08, s.zf - .13 * k + .06)); b = Vector((sg * .13, y0 + Y + .08, s.zf - .13 * k + .06))
            Mx = Matrix.Translation((a + b) / 2) @ Matrix.Rotation(sg * -math.atan(k), 4, "Y") @ Matrix.Diagonal((.3, b.y - a.y, .05, 1))
            P.boite_m(Mx, M("faitage").couleur(P.R))
        for sy in (-1, 1):
            p = Vector((0, y0 + sy * (Y + .06), s.zf + .1))
            P.boite(p + Vector((0, 0, .18)), (.09, .09, .5), M("creme").couleur(P.R))
            P.sphere(p + Vector((0, 0, .5)), .08, M("creme").couleur(P.R), sub=1)
        return s

def pignon(P, toit, y, sens, x_mur, z0, ouv=(), rond=None, PJ=None):
    """Pignon (triangle sous le toit, au-dessus des murs) en planches verticales à couvre-joints. sens : -1 avant, +1 arrière.
    rond : (z, r) d'un œil-de-bœuf décoratif au centre."""
    a, b = ((-x_mur, y), (x_mur, y)) if sens < 0 else ((x_mur, y), (-x_mur, y))
    m = Mur(a, b, .2, ouv)
    def haut(u):
        x = (m.a + m.t * u).x
        return toit.dessous(x) + .03
    planches_verticales(P, m, z0, toit.zf, mat="latte", haut=haut, PJ=PJ)
    # face intérieure et dessus des planches (on ne voit jamais le ciel à travers)
    if True:
        P.face([m.p(0, z0, -.2), m.p(m.L, z0, -.2), m.p(m.L / 2, toit.dessous(0) + .02, -.2)], M("bois_d").couleur(P.R), -m.n)
    if rond:
        zc, r = rond; n = 16
        for i in range(n):
            a0, a1 = i / n * 2 * math.pi, (i + 1) / n * 2 * math.pi
            for (r0, r1, w, col) in ((r, r + .09, .06, "creme"),):
                pts = [m.p(m.L / 2 + math.cos(a0) * r0, zc + math.sin(a0) * r0, w), m.p(m.L / 2 + math.cos(a1) * r0, zc + math.sin(a1) * r0, w),
                       m.p(m.L / 2 + math.cos(a1) * r1, zc + math.sin(a1) * r1, w), m.p(m.L / 2 + math.cos(a0) * r1, zc + math.sin(a0) * r1, w)]
                P.face(pts, M(col).couleur(P.R), m.n)
            P.face([m.p(m.L / 2, zc, .03), m.p(m.L / 2 + math.cos(a0) * r, zc + math.sin(a0) * r, .03), m.p(m.L / 2 + math.cos(a1) * r, zc + math.sin(a1) * r, .03)], M("bois_d").couleur(P.R), m.n)
        for j in range(4):   # lames de l'aération
            zz = zc - r * .6 + j * r * .4; lw = 2 * math.sqrt(max(0, r * r - (zz - zc) ** 2)) - .04
            if lw > .05: P.boite_m(m.Mx(m.L / 2, zz, .05, lw, .05, .03, inclinaison=-.5), M("creme").couleur(P.R))
    return m

def cheminee(P, x, y, z0, z1, larg=.85, prof=.85, toit=None):
    """Souche de cheminée en pierres (assises irrégulières sur les 4 faces), solin de zinc au pied, couronnement et chapeau."""
    rang = .26; n = int((z1 - z0) / rang)
    P.boite((x, y, (z0 + z1) / 2), (larg - .03, prof - .03, z1 - z0), M("mortier").couleur(P.R))
    for kz in range(n):
        zc = z0 + (kz + .5) * rang
        for (cx, cy, ux, uy, L, w) in ((x, y - prof / 2, 1, 0, larg, prof), (x, y + prof / 2, 1, 0, larg, prof), (x - larg / 2, y, 0, 1, prof, larg), (x + larg / 2, y, 0, 1, prof, larg)):
            u = -L / 2 - (P.R.uniform(.05, .2) if kz % 2 else 0)
            while u < L / 2 - .02:
                lu = min(P.R.uniform(.3, .5), L / 2 - u)
                a0, a1 = max(u, -L / 2), min(u + lu, L / 2)
                if a1 - a0 > .05:
                    cc = ((cx + ux * (a0 + a1) / 2), (cy + uy * (a0 + a1) / 2), zc)
                    P.boite(cc, ((a1 - a0 - .02) if ux else .06, (a1 - a0 - .02) if uy else .06, rang - .025), M("pierre").couleur(P.R), jit=.004)
                u += lu
    P.boite((x, y, z1 + .06), (larg + .14, prof + .14, .12), M("pierre").couleur(P.R))           # couronnement
    for dx in (-.18, .18): P.cylindre((x + dx, y, z1 + .1), (x + dx, y, z1 + .38), .1, .09, M("terre").couleur(P.R), n=8)   # deux mitrons
    if toit:   # solin : une collerette de zinc qui suit la pente
        zl = min(toit.z(x - larg / 2 - .08), toit.z(x + larg / 2 + .08)); zh = max(toit.z(x - larg / 2 - .08), toit.z(x + larg / 2 + .08))
        P.boite((x, y, (zl + zh) / 2 - .02), (larg + .08, prof + .08, zh - zl + .06), M("solin").couleur(P.R))

# ------------------------------------------------------------------ 7. terrasse et garde-corps
def terrasse(P, x0, x1, y0, y1, z, lame=.14):
    """Plancher de lames (le long de x, joints visibles), planche de bordure et dessous sombre."""
    n = int((y1 - y0) / lame)
    for i in range(n):
        ya, yb = y0 + i * (y1 - y0) / n, y0 + (i + 1) * (y1 - y0) / n - .012
        xs = [x0]; u = x0 + P.R.uniform(1.2, 3.5)
        while u < x1 - 1: xs.append(u); u += P.R.uniform(2.6, 4)
        xs.append(x1)
        for xa, xb in zip(xs, xs[1:]):
            c = M("lame").couleur(P.R)
            P.face([(xa + .004, ya, z), (xb - .004, ya, z), (xb - .004, yb, z), (xa + .004, yb, z)], c, (0, 0, 1))
    P.face([(x0, y0, z - .015), (x1, y0, z - .015), (x1, y1, z - .015), (x0, y1, z - .015)], M("lame_d").couleur(P.R), (0, 0, 1))   # sous les joints
    for (a, b, nv) in (((x0, y0), (x1, y0), (0, -1, 0)), ((x1, y0), (x1, y1), (1, 0, 0)), ((x1, y1), (x0, y1), (0, 1, 0)), ((x0, y1), (x0, y0), (-1, 0, 0))):
        P.face([(*a, -.05), (*b, -.05), (*b, z + .005), (*a, z + .005)], M("lame_d").couleur(P.R), nv)

def garde_corps(P, a, b, haut=1.1, pas=1.15, barreau=.11, poteaux=(True, True)):
    """Garde-corps en bois : poteaux carrés à chapeau, main courante, lisse basse, barreaux carrés serrés."""
    a, b = Vector((*a, 0)), Vector((*b, 0)); d = b - a; L = d.length; t = d / L
    n = max(1, round(L / pas))
    for kk in range(n + 1):
        if (kk == 0 and not poteaux[0]) or (kk == n and not poteaux[1]): continue
        p = a + t * (L * kk / n); c = M("rambarde").couleur(P.R)
        P.boite((p.x, p.y, .2 + (haut - .2) / 2), (.12, .12, haut - .2 + .02), c)
        P.boite((p.x, p.y, haut + .04), (.16, .16, .05), M("rambarde").couleur(P.R))
    rz = math.atan2(t.y, t.x)
    P.boite(((a + b) / 2).to_tuple()[:2] + (haut - .02,), (L, .13, .06), M("rambarde").couleur(P.R), rz=rz)       # main courante
    P.boite(((a + b) / 2).to_tuple()[:2] + (.36,), (L, .08, .06), M("rambarde").couleur(P.R), rz=rz)              # lisse basse
    m = max(1, round(L / barreau))
    for kk in range(m):
        p = a + t * (L * (kk + .5) / m)
        if any((p - (a + t * (L * j / n))).length < .09 for j in range(n + 1)): continue
        v = P.boite((p.x, p.y, (.39 + haut - .05) / 2), (.04, .04, haut - .05 - .39), M("rambarde").couleur(P.R), rz=rz)
        fs = {f for x in v for f in x.link_faces}
        for f in fs: f.normal_update()
        bmesh.ops.delete(P.bm, geom=[f for f in fs if abs(f.normal.z) > .9], context="FACES_ONLY")

def marche(P, x0, x1, y0, y1, z0, z1):
    """Une marche de bois (dessus en lames, contremarche sombre)."""
    P.boite(((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2 - .01), (x1 - x0, y1 - y0, z1 - z0 + .02), M("lame_d").couleur(P.R))
    for i in range(3):
        ya, yb = y0 + i * (y1 - y0) / 3, y0 + (i + 1) * (y1 - y0) / 3 - .01
        P.face([(x0, ya, z1 + .002), (x1, ya, z1 + .002), (x1, yb, z1 + .002), (x0, yb, z1 + .002)], M("lame").couleur(P.R), (0, 0, 1))

def massif(P, x, y, r, n=5, fleurs=6):
    """Petit massif fleuri (boules de feuillage et fleurs) au pied d'un mur."""
    for i in range(n): P.sphere((x + P.R.uniform(-r, r), y + P.R.uniform(-r * .5, r * .5), .16), P.R.uniform(.2, .3), M("feuillage").couleur(P.R), (1, 1, .8), sub=1, jit=.03)
    for i in range(fleurs): P.sphere((x + P.R.uniform(-r, r), y + P.R.uniform(-r * .5, r * .5), .34 + P.R.uniform(0, .1)), .06, M("fleur").couleur(P.R), sub=1)

# ------------------------------------------------------------------ 8. abords (ajouts implantation, tour 1)
def liseré_gravier(P, pts, larg=.4, pas=.09):
    """Bande de gravier au pied d'un ouvrage (le long de la polyligne pts, du côté droit : tourner dans le sens trigonométrique) : petits cailloux
    aplatis posés au sol, de nuances variées, pour que l'ouvrage ne sorte pas de l'herbe sans transition."""
    for a, b in zip(pts, pts[1:]):
        a, b = Vector((*a, .02)), Vector((*b, .02)); d = b - a; L = d.length; t = d / L; n = Vector((t.y, -t.x, 0))   # (2 cm au-dessus du sol du jeu)
        P.face([a, b, b + n * larg, a + n * larg], M("gravier").couleur(P.R), (0, 0, 1))
        for i in range(int(L / pas)):   # cailloux : petites facettes de nuances variées, juste au-dessus de la bande
            q = a + t * (i + P.R.uniform(0, 1)) * pas + n * P.R.uniform(.06, larg - .06) + Vector((0, 0, .008))
            r = P.R.uniform(.04, .07); g = P.R.uniform(0, 3)
            P.face([q + Vector((math.cos(g + j * 2.1) * r, math.sin(g + j * 2.1) * r, 0)) for j in range(3)], M("gravier").couleur(P.R), (0, 0, 1))

def buisson_bas(P, x, y, r=.45, fleurs=True):
    """Buisson bas arrondi (au pied des murs, aux coins de la terrasse) : 3 à 4 boules de feuillage, quelques fleurs."""
    for i in range(3): P.sphere((x + (i - 1) * r * .55 + P.R.uniform(-.06, .06), y + P.R.uniform(-r, r) * .3, .19), P.R.uniform(.24, .32), M("feuillage").couleur(P.R), (1.15, 1, .75), sub=1, jit=.03)
    if fleurs:
        for i in range(4): P.sphere((x + P.R.uniform(-r, r) * .7, y + P.R.uniform(-r, r) * .4, .36 + P.R.uniform(0, .05)), .055, M("fleur").couleur(P.R), sub=0)
