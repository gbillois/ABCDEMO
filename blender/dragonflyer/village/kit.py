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
def mur_moellons(P, a, b, z0, z1, ouvertures=(), taille=.42, saillie=.07, chainage=True):
    """Pierres des champs posées en assises irrégulières sur la face extérieure d'un mur allant de a vers b (horizontal),
    la face regarde à droite de a→b. ouvertures : [(u0, u1, z0, z1)] en mètres le long du mur (pas de pierre devant).
    Le cœur du mur (mortier) est fait à part par la maison. Aux coins, des pierres plus grandes, alternées (chaînage)."""
    a, b = Vector((*a[:2], 0)), Vector((*b[:2], 0)); d = b - a; L = d.length; t = d / L; n = Vector((t.y, -t.x, 0)); rz = math.atan2(t.y, t.x)
    z = z0; rang = 0
    while z < z1 - .05:
        hz = min(taille * P.R.uniform(.62, .9), z1 - z); u = 0.0
        if chainage: u = (.45 if rang % 2 else .0)   # le coin est fait par chaine(), on commence un peu plus loin une fois sur deux
        while u < L - .02:
            lu = min(taille * P.R.uniform(1.0, 1.7), L - u)
            if lu < .12: break
            uc, zc = u + lu / 2, z + hz / 2
            if not any(o[0] - .06 < uc + lu * .4 and uc - lu * .4 < o[1] + .06 and o[2] - .06 < zc + hz * .4 and zc - hz * .4 < o[3] + .06 for o in ouvertures):
                p = a + t * uc + n * (saillie * .5 + P.R.uniform(-.015, .02))
                P.boite((p.x, p.y, zc), (lu - .05, .2, hz - .05), M("moellon").couleur(P.R), rz=rz + P.R.uniform(-.03, .03),
                        rx=P.R.uniform(-.03, .03), bev=.06, jit=.025)
            u += lu
        z += hz; rang += 1
    if chainage:
        for fin in (0, 1): chaine(P, a if fin == 0 else b, t if fin == 0 else -t, n, z0, z1, taille)

def chaine(P, coin, t, n, z0, z1, taille):
    """Pierres d'angle : grandes, alternées long / court, qui tiennent le coin."""
    z = z0; rang = 0
    while z < z1 - .05:
        hz = min(taille * .78, z1 - z); lu = taille * (1.6 if rang % 2 == 0 else 1.0)
        p = coin + t * (lu / 2 - .08) + n * .05
        P.boite((p.x, p.y, z + hz / 2), (lu, .26, hz - .04), M("moellon").couleur(P.R, .05), rz=math.atan2(t.y, t.x), bev=.07, jit=.015)
        z += hz; rang += 1

# ------------------------------------------------------------------ 3. le toit de chaume (une coque épaisse et douce)
def _smin(a, b, k):
    h = max(k - abs(a - b), 0) / k; return min(a, b) - h * h * k * .25

def toit_chaume(P, cx, cy, X, Y, z_bord, z_faite, croupe=1.6, ep=.42, pas=.16, sourcils=(), cheminees=()):
    """Toit de chaume à croupes arrondies, faîte selon X, qui couvre le rectangle |x-cx| < X, |y-cy| < Y (débord compris).
    C'est une coque lisse : dessus bombé, rebord épais et arrondi, dessous plus sombre. Le chaume est peint en mèches qui
    descendent la pente, en rangs de bottes, avec un peu de mousse. sourcils : [(x, largeur, hauteur)] : le bord avant se
    soulève au-dessus d'une porte ou d'une fenêtre. cheminees : [(x, y, r)] : le chaume s'écarte autour."""
    k = (z_faite - z_bord) / Y                      # pente des pans
    xr = X - croupe; kc = (z_faite - z_bord) / croupe   # croupes (bouts) plus raides
    def haut(x, y):
        dx, dy = x - cx, y - cy
        g = z_faite - k * math.sqrt(dy * dy + .09)    # faîte arrondi
        h = z_faite + .2 - kc * max(0.0, math.sqrt(dx * dx + .04) - xr)
        z = _smin(g, h, 1.2)
        for (sx, sl, sh) in sourcils:                 # sourcils au-dessus des ouvertures (côté -Y)
            if dy < 0: z += sh * math.exp(-((dx - sx) / sl) ** 2) * max(0.0, min(1.0, (-dy - Y * .35) / (Y * .5)))
        return z
    nx, ny = int(2 * X / pas) + 1, int(2 * Y / pas) + 1
    pts = [[None] * ny for _ in range(nx)]
    R = P.R; mech = [R.uniform(-1, 1) for _ in range(nx * 3)]   # mèches : une nuance par bande de 5 cm le long du faîte
    for i in range(nx):
        for j in range(ny):
            x = cx - X + 2 * X * i / (nx - 1); y = cy - Y + 2 * Y * j / (ny - 1)
            # coins arrondis : on rapproche les sommets des coins vers l'intérieur (plan presque ovale)
            ex, ey = (x - cx) / X, (y - cy) / Y; r = max(abs(ex), abs(ey))
            if r > 0:
                m = math.sqrt(ex * ex + ey * ey) / r; f = 1 / (1 + (m - 1) * .55)
                x = cx + (x - cx) * f; y = cy + (y - cy) * f
            z = haut(x, y)
            bord = min(i, j, nx - 1 - i, ny - 1 - j)
            # dessus en rangs de bottes : une petite marche tous les 45 cm de pente
            s_ = (z_faite - z) / max(k, .3); z -= .05 * ((s_ / .45) % 1.0)
            for (hx, hy, hr) in cheminees:
                dd = math.hypot(x - hx, y - hy); z += .25 * max(0.0, 1 - dd / (hr + .6))
            pts[i][j] = (x, y, z, bord, s_)
    bm, col, ls = P.bm, P.col, P.lisse
    def teinte_dessus(i, j, s_, bord, z):
        c = M("chaume").teintes[0]
        m = mech[(i * 3 + j // 7) % len(mech)] * .5 + mech[(i * 2 + 5) % len(mech)] * .5
        c = melange(c, M("chaume").teintes[1 + (i % 2)], .5 + .5 * m)
        c = melange(c, M("chaume_f").teintes[0], .45 * (((s_ / .45) % 1.0) ** 3))   # bas de chaque rang dans l'ombre du rang du dessus
        c = melange(c, M("chaume_f").teintes[0], .2 * min(1, s_ / 3))                  # le chaume vieillit vers le bas
        n_ = math.sin(i * .9 + j * .35) * math.sin(i * .23 - j * .61) + R.uniform(-.15, .15)
        if n_ > .55 and s_ > 1: c = melange(c, M("mousse").teintes[0], .55)           # plaques de mousse
        return c
    # dessus
    V = [[None] * ny for _ in range(nx)]
    for i in range(nx):
        for j in range(ny):
            x, y, z, bord, s_ = pts[i][j]
            v = bm.verts.new((x, y, z)); v[col] = (*teinte_dessus(i, j, s_, bord, z), 1); V[i][j] = v
    # dessous : la coque, abaissée de l'épaisseur, rentrée vers l'intérieur (le rebord paraît rond et épais)
    W = [[None] * ny for _ in range(nx)]
    for i in range(nx):
        for j in range(ny):
            x, y, z, bord, s_ = pts[i][j]
            v = bm.verts.new((cx + (x - cx) * .985, cy + (y - cy) * .985, z - ep)); v[col] = (*M("chaume").sombre, 1); W[i][j] = v
    def quad(a, b, c, d, lisse=1):
        try: f = bm.faces.new((a, b, c, d)); f[ls] = lisse; return f
        except ValueError: return None
    for i in range(nx - 1):
        for j in range(ny - 1):
            quad(V[i][j], V[i + 1][j], V[i + 1][j + 1], V[i][j + 1])
            quad(W[i][j], W[i][j + 1], W[i + 1][j + 1], W[i + 1][j])
    # rebord : tour du rectangle, deux rangées (bord arrondi : un sommet intermédiaire plus bas et plus dehors)
    tour = [(i, 0) for i in range(nx - 1)] + [(nx - 1, j) for j in range(ny - 1)] + [(i, ny - 1) for i in range(nx - 1, 0, -1)] + [(0, j) for j in range(ny - 1, 0, -1)]
    mil = []
    for (i, j) in tour:
        x, y, z, _, _ = pts[i][j]
        dx, dy = x - cx, y - cy; dl = math.hypot(dx, dy) or 1
        v = bm.verts.new((x + dx / dl * .1, y + dy / dl * .1, z - ep * .55)); v[col] = (*melange(M("chaume_f").teintes[0], M("chaume").teintes[0], .3), 1); mil.append(v)
    for t in range(len(tour)):
        (i0, j0), (i1, j1) = tour[t], tour[(t + 1) % len(tour)]
        quad(V[i0][j0], mil[t], mil[(t + 1) % len(tour)], V[i1][j1])
        quad(mil[t], W[i0][j0], W[i1][j1], mil[(t + 1) % len(tour)])
    # faîtage : boudin de paille tressée, tenu par des liens de bois
    xr2 = X - croupe * .75
    P.cylindre((cx - xr2, cy, z_faite + .05), (cx + xr2, cy, z_faite + .05), .26, .26, M("chaume_f").couleur(R), n=10)
    for xx in [cx - xr2 + .3 + i * .55 for i in range(int((2 * xr2 - .4) / .55) + 1)]:
        P.cylindre((xx - .035, cy, z_faite + .05), (xx + .035, cy, z_faite + .05), .29, .29, M("chene").sombre, n=10)

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
    P.boite((x, y - .32, z - .08), (l + .45, .7, .22), M("moellon").couleur(P.R), bev=.07, jit=.02)   # seuil, un peu au-dessus du sol

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
def cheminee(P, x, y, z0, z1, larg=.9, rz=0.0):
    """Cheminée de moellons qui s'affine un peu en montant, chapeau de pierre plate et pot de terre cuite."""
    z = z0
    while z < z1:
        hz = P.R.uniform(.28, .38); t = (z - z0) / max(1, z1 - z0); w = larg * (1 - .15 * t)
        for k in range(2):   # deux pierres par assise, joints alternés
            off = (.25 if (int((z - z0) / .33) % 2) else -.25) * w * (1 if k == 0 else -1)
            P.boite((x + off * math.cos(rz), y + off * math.sin(rz), z + hz / 2), (w * .5 + .02, w, hz - .03), M("moellon").couleur(P.R), rz=rz + P.R.uniform(-.04, .04), bev=.06, jit=.015)
        z += hz
    P.boite((x, y, z + .06), (larg * 1.05, larg * 1.05, .14), M("moellon").couleur(P.R, .03), rz=rz, bev=.04)
    P.cylindre((x, y, z + .1), (x, y, z + .5), .17, .14, M("terre").couleur(P.R), n=10)
