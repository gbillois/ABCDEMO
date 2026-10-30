# The Dragon Apprentice Chronicles : kit de village fait en Blender par script.
# Maisons (longère viking, colombages, chaumière, pêcheur sur pilotis, pierre de montagne, forge, moulin), accessoires
# (puits, tonneau, caisse, charrette, étal, clôture, lanterne, meule de foin, ponton) et deux intérieurs meublés.
# Style « jouet » lumineux (façon Oceanhorn / Wind Waker) : formes épaisses chanfreinées, pierres irrégulières,
# chaume épais ; couleurs par sommet multipliées par l'occlusion cuite en Cycles.
# Lancer : blender -b -P maisons.py -- <dossier>      Produit : village.glb (+ apercu_*.png)
#
# Repère : Blender Z vers le haut, la façade (porte) regarde -Y. Après l'export glTF, la façade regarde +Z.
# Propriétés exportées (extras) : « pied » = [largeur, profondeur] de l'emprise au sol (collisions),
# « porte » = [x, y, z] du seuil (repère Blender), « interieur » = nom de l'intérieur à ouvrir.
import bpy, bmesh, math, random, os, sys
import numpy as np
from mathutils import Vector, Matrix

OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "/tmp/village"
os.makedirs(OUT, exist_ok=True)
APERCU = "--sans-apercu" not in sys.argv
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
R = random.Random(7)

def lin(h):
    h = h.lstrip("#"); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4 for x in c)
def varie(c, k=.08): f = 1 + R.uniform(-k, k); return tuple(min(1, x * f) for x in c)

# palette chaude et lumineuse
PIERRE, PIERRE2, PIERRE_S = lin("#9c958a"), lin("#7d776e"), lin("#5e5a55")
BOIS, BOIS_C, BOIS_F = lin("#7a5232"), lin("#a3744a"), lin("#4a3020")
PLATRE, PLATRE2 = lin("#efe6d2"), lin("#e2d5b8")
CHAUME, CHAUME_F = lin("#c9a35a"), lin("#a57f3c")
TUILE, ARDOISE, BARDEAU = lin("#b0553a"), lin("#5a6470"), lin("#6e4a32")
GAZON, ROUGE, OCRE, BLEU = lin("#6e9a44"), lin("#a8382a"), lin("#c99a3a"), lin("#3c6a9a")
VITRE, FER, TISSU, TISSU2, PAILLE = lin("#2a3a4a"), lin("#3a3836"), lin("#c84a3a"), lin("#e8d8a8"), lin("#d8b860")

class Piece:
    """Un objet en construction : bmesh + couleur par sommet."""
    def __init__(s, nom):
        s.nom = nom; s.bm = bmesh.new(); s.col = s.bm.verts.layers.float_color.new("Col")
    def _fin(s, verts, c, bev=0.0, jit=0.0):
        for v in verts: v[s.col] = (*c, 1)
        if jit:
            for v in verts: v.co += Vector((R.uniform(-jit, jit), R.uniform(-jit, jit), R.uniform(-jit, jit)))
        if bev:
            vs = set(verts); edges = [e for e in s.bm.edges if e.verts[0] in vs and e.verts[1] in vs]
            r = bmesh.ops.bevel(s.bm, geom=edges, offset=bev, segments=1, affect="EDGES", profile=.5)
            for v in r["verts"]: v[s.col] = (*c, 1)
    def boite(s, centre, taille, c, rz=0.0, rx=0.0, ry=0.0, bev=.03, jit=0.0):
        M = Matrix.Translation(Vector(centre)) @ Matrix.Rotation(rz, 4, "Z") @ Matrix.Rotation(ry, 4, "Y") @ Matrix.Rotation(rx, 4, "X") @ Matrix.Diagonal((*taille, 1))
        r = bmesh.ops.create_cube(s.bm, size=1, matrix=M); s._fin(r["verts"], c, bev, jit); return r["verts"]
    def cylindre(s, a, b, r1, r2, c, n=10, bev=0.0, jit=0.0):
        a, b = Vector(a), Vector(b); d = b - a; L = d.length
        M = Matrix.Translation((a + b) / 2) @ d.to_track_quat("Z", "Y").to_matrix().to_4x4()
        r = bmesh.ops.create_cone(s.bm, cap_ends=True, segments=n, radius1=r1, radius2=r2, depth=L, matrix=M); s._fin(r["verts"], c, bev, jit); return r["verts"]
    def sphere(s, centre, rayon, c, ech=(1, 1, 1), sub=2, jit=0.0):
        M = Matrix.Translation(Vector(centre)) @ Matrix.Diagonal((*ech, 1))
        r = bmesh.ops.create_icosphere(s.bm, subdivisions=sub, radius=rayon, matrix=M); s._fin(r["verts"], c, 0, jit); return r["verts"]
    def prisme(s, x0, x1, y0, y1, z0, z1, c, bev=.03):
        """Pignon : triangle (base y0..y1 à z0, sommet au milieu à z1), épaisseur x0..x1."""
        vs = []
        for x in (x0, x1): vs += [s.bm.verts.new((x, y0, z0)), s.bm.verts.new((x, y1, z0)), s.bm.verts.new((x, (y0 + y1) / 2, z1))]
        F = [(0, 1, 2), (3, 5, 4), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)]
        for f in F: s.bm.faces.new([vs[i] for i in f])
        bmesh.ops.recalc_face_normals(s.bm, faces=s.bm.faces[-5:]); s._fin(vs, c, bev); return vs
    def objet(s, props=None, parent=None):
        me = bpy.data.meshes.new(s.nom); s.bm.normal_update(); s.bm.to_mesh(me); s.bm.free()
        for p in me.polygons: p.use_smooth = False
        ob = bpy.data.objects.new(s.nom, me); scene.collection.objects.link(ob)
        for k, v in (props or {}).items(): ob[k] = v
        if parent: ob.parent = parent
        return ob

# ------------------------------------------------------------------ éléments réutilisés
def socle_pierres(P, x0, x1, y0, y1, h, z0=-2.8, taille=.55, c=PIERRE):
    """Soubassement en pierres irrégulières tout autour d'un rectangle (descend sous le sol pour les pentes)."""
    P.boite(((x0 + x1) / 2, (y0 + y1) / 2, (z0 + h) / 2 + .05), (x1 - x0 - .3, y1 - y0 - .3, h - z0 + .1), PIERRE_S, bev=0)   # cœur plein jusqu'au-dessus du soubassement : pas de fente sous les murs
    for (ax, ay, bx, by) in ((x0, y0, x1, y0), (x1, y0, x1, y1), (x1, y1, x0, y1), (x0, y1, x0, y0)):
        L = math.hypot(bx - ax, by - ay); n = max(2, int(L / taille)); rz = math.atan2(by - ay, bx - ax)
        for rang, z in enumerate(np.arange(z0 + taille * .5, h, taille * .8)):
            dec = .5 if rang % 2 else 0
            for i in range(n):
                t = (i + dec + .5) / n
                if t > 1: continue
                cx, cy = ax + (bx - ax) * t, ay + (by - ay) * t
                l = L / n * R.uniform(.85, 1.05)
                P.boite((cx, cy, z), (l, taille * R.uniform(.7, 1), taille * .78 * R.uniform(.85, 1.1)), varie(R.choice([c, PIERRE2, c]), .1), rz=rz + R.uniform(-.04, .04), bev=.07, jit=.03)
        # assise de couronnement : des pierres plates qui finissent le soubassement juste sous les murs
        for i in range(n):
            t = (i + .5) / n; cx, cy = ax + (bx - ax) * t, ay + (by - ay) * t
            P.boite((cx, cy, h - .09), (L / n * 1.02, taille * .95, .2), varie(PIERRE2, .08), rz=rz, bev=.04)

def mur_planches(P, a, b, z0, z1, c=BOIS, ep=.18, larg=.32):
    a, b = Vector(a), Vector(b); d = b - a; L = d.length; rz = math.atan2(d.y, d.x); n = max(1, int(L / larg))
    for i in range(n):
        p = a + d * ((i + .5) / n)
        P.boite((p.x, p.y, (z0 + z1) / 2), (L / n * .96, ep, z1 - z0), varie(c, .12), rz=rz, bev=.025)

def fenetre(V, P, centre, rz, l=.9, h=1.0, volets=True, c_volet=BOIS_C):
    """Cadre en bois (P) + vitre sombre qui s'éclaire la nuit (V : objet séparé)."""
    x, y, z = centre; ox, oy = -math.sin(rz), math.cos(rz)   # normale vers l'extérieur = -Y tourné
    nx, ny = math.sin(rz) * 0, 0
    V.boite((x, y, z), (l, .08, h), VITRE, rz=rz, bev=0)
    for dz in (-h / 2 - .06, h / 2 + .06): P.boite((x, y, z + dz), (l + .3, .2, .14), BOIS_F, rz=rz)
    for s in (-1, 1): P.boite((x + math.cos(rz) * s * (l / 2 + .07), y + math.sin(rz) * s * (l / 2 + .07), z), (.14, .2, h + .2), BOIS_F, rz=rz)
    P.boite((x, y, z), (.07, .12, h), BOIS_F, rz=rz, bev=0)
    if volets:
        for s in (-1, 1):
            cx, cy = x + math.cos(rz) * s * (l * .75 + .12), y + math.sin(rz) * s * (l * .75 + .12)
            P.boite((cx, cy, z), (l * .5, .08, h + .1), varie(c_volet, .05), rz=rz)

def porte(P, centre, rz, l=1.2, h=2.1, c=BOIS_C, arrondie=True):
    x, y, z = centre
    for i in range(4): P.boite((x + math.cos(rz) * (i - 1.5) * l / 4, y + math.sin(rz) * (i - 1.5) * l / 4, z + h / 2), (l / 4 * .95, .12, h), varie(c, .1), rz=rz, bev=.02)
    for dz in (.4, h - .4): P.boite((x, y, z + dz), (l * .95, .16, .1), FER, rz=rz, bev=0)
    P.sphere((x + math.cos(rz) * l * .3, y + math.sin(rz) * l * .3 - .1, z + h * .5), .06, FER, sub=1)
    for s in (-1, 1): P.boite((x + math.cos(rz) * s * (l / 2 + .1), y + math.sin(rz) * s * (l / 2 + .1), z + h / 2), (.2, .26, h + .1), BOIS_F, rz=rz)
    P.boite((x, y, z + h + .1), (l + .6, .3, .22), BOIS_F, rz=rz)
    P.boite((x, y - .5, z - .1), (l + .5, .9, .2), PIERRE2, bev=.05, jit=.02)   # marche

MOUSSE_T = lin("#7a8a4a")
def melange_c(a, b, t): return tuple(x + (y - x) * t for x, y in zip(a, b))
def toit_chaume(P, x0, x1, y0, y1, z0, z1, deb=.6, ep=.45, c=CHAUME, couches=6):
    """Toit à deux pans de chaume épais (le faîte suit l'axe X) : couches de bottes en escalier, coupées en tronçons irréguliers,
    frange de paille qui dépasse en bas, quelques plaques de mousse, faîtage arrondi."""
    ym = (y0 + y1) / 2; demi = (y1 - y0) / 2 + deb; haut = z1 - z0; ang = math.atan2(haut, (y1 - y0) / 2)
    Lp = math.hypot(demi, haut + deb * math.tan(ang)); L = x1 - x0 + 2 * deb
    n = max(2, int(L / 1.1))
    for s in (-1, 1):
        for k in range(couches):
            t0 = k / couches; t1 = (k + 1) / couches
            cy = ym + s * demi * (1 - (t0 + t1) / 2); cz = z0 - deb * math.tan(ang) + (haut + deb * math.tan(ang)) * (t0 + t1) / 2
            # tronçons de bottes, décalés d'une couche à l'autre (demi-tronçons aux deux bouts) : chaque rangée couvre tout le toit
            bords = [i / n for i in range(n + 1)] if k % 2 == 0 else [0] + [(i + .5) / n for i in range(n)] + [1]
            for i in range(len(bords) - 1):
                e0, e1 = bords[i], bords[i + 1]; xc = x0 - deb + (e0 + e1) / 2 * L; lt = (e1 - e0) * L
                coul = melange_c(c, CHAUME_F, R.uniform(0, .45) + .25 * (k / couches))
                if R.random() < .05 and k < couches - 1: coul = melange_c(coul, MOUSSE_T, .6)
                P.boite((xc, cy, cz + k * .04 + R.uniform(-.03, .03)), (lt + .08, Lp / couches * 1.18, ep * R.uniform(.88, 1.06)), varie(coul, .04), rx=-s * ang, bev=min(.12, lt * .25), jit=.03)
        # frange : des mèches de paille qui pendent sous le bord du toit
        ybord = ym + s * demi; zbord = z0 - deb * math.tan(ang) - ep * .2
        for i in range(int(L / .22)):
            xc = x0 - deb + (i + .5) * .22
            P.cylindre((xc, ybord - s * .05, zbord + .1), (xc + R.uniform(-.04, .04), ybord + s * .06, zbord - R.uniform(.12, .22)), .07, .015, varie(CHAUME_F, .1), n=5)
    P.cylindre((x0 - deb - .1, ym, z1 + .15), (x1 + deb + .1, ym, z1 + .15), .38, .38, CHAUME_F, n=12, jit=.03)   # faîtage
    for i in range(int(L / .6)):   # liens du faîtage
        xc = x0 - deb + (i + .5) * .6; P.cylindre((xc - .04, ym, z1 + .15), (xc + .04, ym, z1 + .15), .41, .41, BOIS_F, n=12)

def toit_plats(P, x0, x1, y0, y1, z0, z1, c, deb=.5, ep=.2, rangs=7, tuiles=True):
    """Toit à deux pans de bardeaux / tuiles / ardoises en rangées qui se chevauchent."""
    ym = (y0 + y1) / 2; demi = (y1 - y0) / 2 + deb; haut = z1 - z0; ang = math.atan2(haut, (y1 - y0) / 2)
    pente = demi / math.cos(ang); L = x1 - x0 + 2 * deb
    for s in (-1, 1):
        for k in range(rangs):
            t = (k + .5) / rangs
            cy = ym + s * demi * (1 - t); cz = z0 - deb * math.tan(ang) + (haut + deb * math.tan(ang)) * t
            if tuiles:
                n = int(L / .5)
                for i in range(n):
                    P.boite((x0 - deb + (i + .5) * L / n, cy, cz + .03), (L / n * .97, pente / rangs * 1.25, ep), varie(c, .1), rx=-s * ang, bev=.03)
            else:
                P.boite(((x0 + x1) / 2, cy, cz), (L, pente / rangs * 1.25, ep), varie(c, .08), rx=-s * ang, bev=.04)
    P.boite(((x0 + x1) / 2, ym, z1 + .1), (L + .1, .45, .3), BOIS_F, bev=.05)

def cheminee(P, x, y, z0, z1, c=PIERRE):
    for i, z in enumerate(np.arange(z0, z1, .4)):
        P.boite((x, y, z + .2), (.95, .95, .42), varie(R.choice([c, PIERRE2]), .1), rz=R.uniform(-.05, .05), bev=.06, jit=.02)
    P.boite((x, y, z1 + .1), (1.15, 1.15, .2), PIERRE_S, bev=.05)

def colombages(P, x0, x1, y, z0, z1, rz=0.0, n=3, croix=True):
    """Pans de bois apparents sur un mur blanc (le mur est dessiné à part)."""
    ca, sa = math.cos(rz), math.sin(rz); L = x1 - x0
    def pt(u, z): return (x0 + u) * ca - y * sa, (x0 + u) * sa + y * ca, z
    for i in range(n + 1):
        u = L * i / n; px, py, _ = pt(u, 0); P.boite((px, py, (z0 + z1) / 2), (.22, .2, z1 - z0), BOIS_F, rz=rz)
    for z in (z0 + .1, z1 - .1, (z0 + z1) / 2):
        px, py, _ = pt(L / 2, 0); P.boite((px, py, z), (L, .2, .2), BOIS_F, rz=rz)
    if croix:
        for i in range(n):
            u0, u1 = L * i / n, L * (i + 1) / n; um = (u0 + u1) / 2; px, py, _ = pt(um, 0)
            ang = math.atan2((z1 - z0) / 2, (u1 - u0)); lg = math.hypot((z1 - z0) / 2, u1 - u0) * .96
            for s in (-1, 1):
                if (i + (s > 0)) % 2: continue
                P.boite((px, py, (z0 + (z0 + z1) / 2) / 2 + (z1 - z0) / 4 * 0 + (z1 - z0) * .25), (lg, .18, .18), BOIS_F, rz=rz, ry=-s * ang)

# ------------------------------------------------------------------ les maisons
MAISONS = {}
def maison(nom, pied, porte_xyz, interieur, construire):
    P = Piece("M_" + nom); V = Piece("W_" + nom)
    extra = construire(P, V) or []
    ob = P.objet({"pied": list(pied), "porte": list(porte_xyz), "interieur": interieur})
    if V.bm.verts: V.objet(parent=None).name = "W_" + nom
    else: V.bm.free()
    for e in extra: pass
    MAISONS[nom] = ob
    return ob

def longere(P, V):   # longère viking : bas, long, toit de chaume jusqu'au sol, poutres croisées en têtes de dragon
    x0, x1, y0, y1 = -3.4, 3.4, -7, 7          # pignon (porte) vers -Y : ici la longueur suit Y
    socle_pierres(P, -3.4, 3.4, -7, 7, 1.0)
    for x in (-3.3, 3.3): mur_planches(P, (x, -6.9, 0), (x, 6.9, 0), 1.0, 2.6, BOIS)
    for y in (-7.0, 7.0): mur_planches(P, (-3.3, y, 0), (3.3, y, 0), 1.0, 2.6, BOIS)
    for y in (-7.0, 7.0): P.prisme(-3.6, 3.6, -.12 + y, .12 + y, 2.6, 6.2, BOIS_C) if False else None
    # pignons en planches verticales
    for y in (-7.05, 7.05):
        for i in range(10):
            x = -3.2 + i * .71; zt = 2.6 + (3.5 - abs(x) * 1.0)
            P.boite((x, y, (2.6 + zt) / 2), (.68, .16, zt - 2.6), varie(BOIS_C, .1), bev=.02)
    # toit (faîte selon Y) : on dessine dans le repère tourné
    T = Piece("tmp"); toit_chaume(T, -7.6, 7.6, -3.4, 3.4, 2.4, 6.1, deb=.9, ep=.55, couches=4)
    T.bm.transform(Matrix.Rotation(math.pi / 2, 4, "Z")); bm2 = T.bm
    me = bpy.data.meshes.new("tmp"); bm2.to_mesh(me); bm2.free(); P.bm.from_mesh(me); bpy.data.meshes.remove(me)
    for y in (-7.9, 7.9):   # poutres croisées sculptées en têtes de dragon
        for s in (-1, 1):
            P.boite((s * .75, y, 6.3), (.25, .25, 2.4), BOIS_F, ry=s * .65)
            P.cylindre((s * 1.3, y, 7.05), (s * 1.55, y - .15 * (1 if y < 0 else -1), 7.45), .16, .05, BOIS_F, n=6)
            P.sphere((s * 1.25, y, 6.98), .2, BOIS_F, (1, 1.3, .9), sub=1)
    porte(P, (0, -7.15, 1.0), 0, l=1.4, h=1.9)
    for x in (-2.2, 2.2): fenetre(V, P, (x, -7.2, 2.0), 0, l=.6, h=.6, volets=False)
    for y in (-3, 3): fenetre(V, P, (3.45, y, 1.9), math.pi / 2, l=.8, h=.6, volets=True)
    for y in (-3, 3): fenetre(V, P, (-3.45, y, 1.9), -math.pi / 2, l=.8, h=.6, volets=True)
    for i in range(3): P.boite((2.6, -7.6, .4 + i * .02), (.6, .6, .7), BOIS_C)   # bûches
    cheminee(P, 1.4, 3.0, 4.0, 7.0)

def colombage(P, V):   # maison à colombages à étage en encorbellement
    socle_pierres(P, -3.5, 3.5, -3.5, 3.5, .9)
    P.boite((0, 0, 2.15), (6.8, 6.8, 2.5), PLATRE, bev=.05)
    P.boite((0, 0, 4.75), (7.4, 7.4, 2.6), PLATRE2, bev=.05)            # étage plus large
    for y, rz in ((-3.42, 0), (3.42, math.pi)): colombages(P, -3.4, 3.4, y if rz == 0 else -y, .9, 3.4, rz=rz, n=4)
    for x, rz in ((3.42, math.pi / 2), (-3.42, -math.pi / 2)): colombages(P, -3.4, 3.4, 3.42, .9, 3.4, rz=rz, n=4)
    for y, rz in ((-3.72, 0), (3.72, math.pi)): colombages(P, -3.7, 3.7, y if rz == 0 else -y, 3.45, 6.05, rz=rz, n=5)
    for x, rz in ((3.72, math.pi / 2), (-3.72, -math.pi / 2)): colombages(P, -3.7, 3.7, 3.72, 3.45, 6.05, rz=rz, n=5)
    for x in np.linspace(-3.5, 3.5, 8): P.boite((x, -3.6, 3.45), (.22, .5, .25), BOIS_F)   # bouts de solives
    for y in (-3.75, 3.75):    # pignons
        P.prisme(-3.75, 3.75, y - .1, y + .1, 6.05, 8.7, PLATRE) if False else None
    P.prisme(-3.7, 3.7, -3.7, 3.7, 6.05, 8.85, PLATRE)
    toit_plats(P, -3.9, 3.9, -3.9, 3.9, 6.0, 8.9, TUILE, deb=.55, rangs=8)
    porte(P, (-1.2, -3.55, .9), 0, l=1.2, h=2.1)
    fenetre(V, P, (1.5, -3.6, 2.4), 0)
    for x in (-1.9, 0, 1.9): fenetre(V, P, (x, -3.9, 4.8), 0, l=.8, h=.95)
    for y in (-1.2, 1.2): fenetre(V, P, (3.6, y, 2.3), math.pi / 2); fenetre(V, P, (-3.6, y, 2.3), -math.pi / 2)
    for y in (-1.5, 1.5): fenetre(V, P, (3.9, y, 4.8), math.pi / 2, l=.8); fenetre(V, P, (-3.9, y, 4.8), -math.pi / 2, l=.8)
    fenetre(V, P, (0, -3.95, 7.0), 0, l=.7, h=.7, volets=False)
    cheminee(P, 2.2, 1.6, 6.5, 10.0)
    # bac à fleurs
    P.boite((1.5, -3.95, 1.75), (1.4, .35, .3), BOIS_C)
    for i in range(5): P.sphere((1.0 + i * .25, -3.95, 2.0), .17, varie(R.choice([ROUGE, lin("#e8b84a"), lin("#d86aa0")]), .05), sub=1)

def chaumiere(P, V):   # petite chaumière en pierre au toit de chaume arrondi
    socle_pierres(P, -2.6, 2.6, -3.2, 3.2, 2.5, taille=.5)
    P.prisme(-2.6, 2.6, -3.2, 3.2, 2.5, 4.9, PIERRE2)
    T = Piece("tmp"); toit_chaume(T, -2.6, 2.6, -3.2, 3.2, 2.4, 5.0, deb=.75, ep=.6, couches=3)
    me = bpy.data.meshes.new("tmp"); T.bm.to_mesh(me); T.bm.free(); P.bm.from_mesh(me); bpy.data.meshes.remove(me)
    porte(P, (0, -3.3, 0), 0, l=1.1, h=1.95, c=BLEU)
    for x in (-1.6, 1.6): fenetre(V, P, (x, -3.35, 1.4), 0, l=.7, h=.7, c_volet=BLEU)
    for y in (-1.2, 1.2): fenetre(V, P, (2.7, y, 1.4), math.pi / 2, l=.7, h=.7, c_volet=BLEU)
    cheminee(P, -1.6, 2.2, 3.4, 5.6)
    for i in range(4): P.sphere((-1.6 + i * .3 + R.uniform(-.1, .1), -3.7, .25), .3, varie(lin("#5a8a3a"), .15), sub=2, jit=.05)   # buissons
    for i in range(6): P.sphere((-2.0 + i * .18, -3.8, .5 + R.uniform(0, .2)), .09, varie(R.choice([ROUGE, lin("#f0d050"), lin("#f4f0e8")]), .05), sub=1)

def pecheur(P, V):   # maison de pêcheur sur pilotis, planches peintes, ponton et échelle
    for x in (-2.6, 0, 2.6):
        for y in (-3.4, 0, 3.4): P.cylindre((x, y, -4.5), (x, y, 1.3), .22, .2, BOIS_F, n=8, jit=.02)
    for i in range(12): P.boite((-2.9 + i * .53, -1.0, 1.4), (.5, 9.0, .14), varie(BOIS_C, .12), bev=.02)   # plancher + terrasse
    for x in (-2.7, 2.7): mur_planches(P, (x, -3.0, 0), (x, 3.0, 0), 1.45, 4.0, ROUGE, larg=.4)
    for y in (-3.0, 3.0): mur_planches(P, (-2.7, y, 0), (2.7, y, 0), 1.45, 4.0, ROUGE, larg=.4)
    for x in (-2.75, 2.75):
        for y in (-3.05, 3.05): P.boite((x, y, 2.7), (.25, .25, 2.6), lin("#f0ece0"))   # coins blancs
    P.prisme(-2.7, 2.7, -3.0, 3.0, 4.0, 6.0, ROUGE)
    toit_plats(P, -2.75, 2.75, -3.05, 3.05, 4.0, 6.05, lin("#3a3a38"), deb=.45, rangs=6, tuiles=False)
    porte(P, (0, -3.12, 1.45), 0, l=1.1, h=2.0, c=lin("#f0ece0"))
    for x in (-1.7, 1.7): fenetre(V, P, (x, -3.15, 2.8), 0, l=.7, h=.8, volets=False)
    fenetre(V, P, (2.8, 0, 2.8), math.pi / 2, l=.9, h=.8, volets=False)
    for x in (-2.8, 2.8): P.boite((x, -4.8, 2.0), (.12, .12, 1.0), BOIS_F)   # garde-corps
    P.boite((0, -5.3, 2.4), (5.8, .1, .1), BOIS_F)
    for i in range(6): P.boite((3.4, -4.6, 1.1 - i * .5), (.5, .08, .07), BOIS_F)   # échelle
    for x in (3.25, 3.55): P.boite((x, -4.6, -.1), (.07, .07, 3.0), BOIS_F)
    for i in range(3): P.cylindre((-1.5 + i * .6, -4.9, 1.47), (-1.5 + i * .6, -4.9, 2.1), .25, .22, BOIS_C, n=10)   # tonneaux
    P.boite((1.3, -4.7, 1.8), (1.4, .1, .7), lin("#8a7a5a"))   # filet

def pierre(P, V):   # maison de montagne en pierre sombre, toit d'ardoises, grosse cheminée
    socle_pierres(P, -3.2, 3.2, -3.6, 3.6, 3.2, taille=.6, c=PIERRE2)
    P.prisme(-3.2, 3.2, -3.6, 3.6, 3.2, 5.8, PIERRE2)
    toit_plats(P, -3.25, 3.25, -3.65, 3.65, 3.15, 5.85, ARDOISE, deb=.4, rangs=7)
    porte(P, (0, -3.7, 0), 0, l=1.3, h=2.2, c=BOIS)
    for x in (-2.0, 2.0): fenetre(V, P, (x, -3.75, 1.7), 0, l=.75, h=.85, c_volet=lin("#6a3a2a"))
    cheminee(P, 2.6, 0, 1.0, 7.0, c=PIERRE2)
    P.boite((-2.4, -4.2, .35), (1.4, .8, .7), BOIS_C)   # banc
    for i in range(5): P.boite((2.6, -4.1 + i * .02, .3 + i * .28), (1.0, .5, .25), varie(BOIS_C, .2), rz=R.uniform(-.2, .2))   # bois de chauffage

def forge(P, V):   # forge ouverte : piliers, toit, foyer, enclume, soufflet
    socle_pierres(P, -3.5, 3.5, -3, 3, .5)
    for x in (-3.2, 3.2):
        for y in (-2.7, 2.7): P.boite((x, y, 2.3), (.4, .4, 3.6), BOIS_F)
    mur_planches(P, (-3.2, 2.8, 0), (3.2, 2.8, 0), .5, 4.0, BOIS)
    toit_plats(P, -3.6, 3.6, -3.1, 3.1, 4.0, 5.8, BARDEAU, deb=.5, rangs=6)
    for x in np.linspace(-1, 1, 3):
        for z in np.arange(.6, 1.5, .4): P.boite((x + 1.0, 2.0, z), (.7, .9, .42), varie(PIERRE2, .1), bev=.05, jit=.02)
    cheminee(P, 1.0, 2.2, 1.5, 6.6, c=PIERRE2)
    P.boite((1.0, 1.7, 1.45), (1.6, .9, .1), lin("#e85a1a"))   # braises
    P.boite((-1.0, -.5, .9), (.5, .4, .8), BOIS_F); P.boite((-1.0, -.5, 1.4), (1.0, .4, .25), FER, bev=.05); P.cylindre((-1.5, -.5, 1.42), (-1.85, -.5, 1.45), .12, .02, FER, n=8)
    P.cylindre((2.2, -1.5, .5), (2.2, -1.5, 1.2), .45, .45, BOIS_C, n=12)   # baquet
    for i, (x, rz) in enumerate(((-2.6, .1), (-2.2, -.1))): P.boite((x, 2.55, 2.4), (.12, .1, 1.1), FER, rz=rz)  # outils au mur
    MAISONS_PROPS.setdefault("forge", True)

def moulin(P, V):   # moulin à vent : tour de pierre, chapeau de bardeaux ; les ailes sont un objet à part (« A_moulin »)
    for i, z in enumerate(np.arange(0, 7.5, .55)):
        r = 3.0 - z * .12
        for k in range(14):
            a = k / 14 * math.tau + (i % 2) * .22
            P.boite((math.cos(a) * r, math.sin(a) * r, z + .27), (1.4, .55, .5), varie(R.choice([PIERRE, PLATRE2, PIERRE]), .08), rz=a + math.pi / 2, bev=.06, jit=.02)
    P.cylindre((0, 0, -1), (0, 0, 7.6), 2.9, 2.0, PIERRE_S)
    P.cylindre((0, 0, 7.5), (0, 0, 10.0), 2.6, .2, BARDEAU, n=12, jit=.03)
    P.cylindre((0, -2.0, 8.4), (0, -3.0, 8.4), .35, .35, BOIS_F, n=10)
    porte(P, (0, -2.95, 0), 0, l=1.1, h=2.0)
    fenetre(V, P, (0, -2.5, 4.4), 0, l=.6, h=.7, volets=False)
    A = Piece("A_moulin")
    for k in range(4):
        a = k * math.pi / 2; d = Vector((math.cos(a), 0, math.sin(a)))
        A.boite(tuple(d * 3.3), (.18, .18, 6.6) if False else (6.6 * abs(math.cos(a)) + .18, .18, 6.6 * abs(math.sin(a)) + .18), BOIS_F, bev=.02)
        for j in range(5):
            c = d * (1.6 + j * .85); perp = Vector((-d.z, 0, d.x))
            A.boite(tuple(c + perp * .6), (abs(perp.x) * 1.2 + abs(d.x) * .75 + .05, .06, abs(perp.z) * 1.2 + abs(d.z) * .75 + .05), varie(TISSU2, .05), bev=0)
    A.sphere((0, 0, 0), .45, BOIS_F, sub=1)
    ob = A.objet({"axe": [0, -3.15, 8.4]}); ob.location = (0, -3.15, 8.4)

MAISONS_PROPS = {}
for nom, pied, port, inter, f in (
    ("longere", (7.4, 14.6), (0, -7.6, 1.0), "halle", longere),
    ("colombage", (7.6, 7.6), (-1.2, -4.2, .9), "maison", colombage),
    ("chaumiere", (5.6, 6.8), (0, -3.9, 0), "maison", chaumiere),
    ("pecheur", (6.0, 7.0), (0, -4.0, 1.45), "maison", pecheur),
    ("pierre", (6.8, 7.6), (0, -4.3, 0), "maison", pierre),
    ("forge", (7.4, 6.4), (0, -3.6, .5), "", forge),
    ("moulin", (6.2, 6.2), (0, -3.6, 0), "", moulin),
): maison(nom, pied, port, inter, f)

# ------------------------------------------------------------------ accessoires (un objet chacun, instanciés dans le jeu)
def accessoire(nom, f, pied=None):
    P = Piece("P_" + nom); f(P); return P.objet({"pied": list(pied)} if pied else None)
def puits(P):
    for k in range(12):
        a = k / 12 * math.tau
        for z in (.25, .7): P.boite((math.cos(a) * 1.0, math.sin(a) * 1.0, z), (.6, .35, .42), varie(PIERRE, .1), rz=a + math.pi / 2 + (z > .5) * .26, bev=.05, jit=.02)
    P.cylindre((0, 0, .05), (0, 0, .5), .8, .8, lin("#2a4a5a"), n=16)
    for x in (-1.05, 1.05): P.boite((x, 0, 1.6), (.18, .18, 2.2), BOIS_F)
    P.cylindre((-1.1, 0, 2.2), (1.1, 0, 2.2), .12, .12, BOIS_C, n=8)
    toit_plats(P, -1.3, 1.3, -.9, .9, 2.55, 3.3, BARDEAU, deb=.25, rangs=3)
    P.cylindre((.2, 0, 1.0), (.2, 0, 1.45), .2, .24, BOIS_C, n=10)
def tonneau(P):   # douelles bombées (chacune sa nuance), trois cercles de fer, fond cerclé
    n = 16
    for k in range(n):
        a0 = (k + .04) / n * math.tau; a1 = (k + .96) / n * math.tau; c = varie(BOIS_C, .1)
        for (z0, z1, r0, r1) in ((0, .5, .38, .46), (.5, 1.0, .46, .38)):
            vs = P.boite((0, 0, (z0 + z1) / 2), (1, 1, z1 - z0), c, bev=0)
            for v in vs:   # chaque douelle : un secteur de couronne d'épaisseur .035
                u = (v.co.x + .5); r = (r0 if v.co.z < (z0 + z1) / 2 else r1) - (.035 if v.co.y < 0 else 0); ang = a0 + (a1 - a0) * u
                v.co.x, v.co.y = math.cos(ang) * r, math.sin(ang) * r
    for z in (.1, .5, .9):
        rr = .46 if z == .5 else .41
        P.cylindre((0, 0, z - .035), (0, 0, z + .035), rr + .012, rr + .012, FER, n=24)
        for k in range(8): a = k / 8 * math.tau; P.sphere((math.cos(a) * (rr + .02), math.sin(a) * (rr + .02), z), .012, lin("#2a2826"), sub=1)   # rivets
    P.cylindre((0, 0, .9), (0, 0, .97), .35, .35, BOIS, n=20)
    for k in range(4): P.boite((0, -.24 + k * .16, .975), (.66 - abs(k - 1.5) * .12, .012, .01), BOIS_F, bev=0)   # joints du fond
def caisse(P):   # planches clouées avec des jours, montants aux coins
    for face in range(4):
        rz = face * math.pi / 2; ca, sa = math.cos(rz), math.sin(rz)
        for i in range(4):
            z = .12 + i * .19; c = varie(BOIS_C, .12)
            P.boite((ca * .0 - sa * .39, sa * 0 + ca * .39, z), (.74, .04, .17), c, rz=rz, bev=.012)
        for sx in (-1, 1): P.boite((ca * sx * .35 - sa * .41, sa * sx * .35 + ca * .41, .4), (.08, .03, .8), BOIS_F, rz=rz, bev=.01)
        for sx in (-1, 1):
            for i in range(4): P.sphere((ca * sx * .35 - sa * .43, sa * sx * .35 + ca * .43, .12 + i * .19), .011, FER, sub=1)   # clous
    for i in range(4): P.boite((0, -.3 + i * .2, .8), (.78, .18, .04), varie(BOIS_C, .12), bev=.01)   # couvercle
    P.boite((0, 0, .825), (.8, .08, .03), BOIS_F, rz=.78, bev=.008)
def roue(P, x, y, z, r=.55, ep=.1):   # roue à rayons : jante, moyeu, huit rayons
    for k in range(16):
        a = k / 16 * math.tau; P.boite((x, y + math.cos(a) * r, z + math.sin(a) * r), (ep, r * .42, .08), varie(BOIS_F, .08), rx=a + math.pi / 2, bev=.01)
    P.cylindre((x - ep * .8, y, z), (x + ep * .8, y, z), .1, .1, BOIS, n=10); P.cylindre((x - ep, y, z), (x + ep, y, z), .05, .05, FER, n=8)
    for k in range(8): a = k / 8 * math.tau; P.cylindre((x, y, z), (x, y + math.cos(a) * r * .95, z + math.sin(a) * r * .95), .028, .022, BOIS_C, n=6)
def charrette(P):
    for i in range(6): P.boite((0, -1.1 + i * .44, .9), (1.6, .42, .1), varie(BOIS_C, .1), bev=.015)   # plancher en planches
    for s in (-1, 1):
        for z in (1.05, 1.32): P.boite((s * .8, 0, z), (.08, 2.6, .2), varie(BOIS, .06), bev=.015)
        for y in (-1.2, -.4, .4, 1.2): P.boite((s * .8, y, 1.15), (.1, .08, .5), BOIS_F, bev=.01)
        roue(P, s * .95, .3, .55)
        P.boite((s * .4, -2.1, .8), (.1, 2.0, .1), BOIS_F, rx=.1)
    P.cylindre((-.9, .3, .55), (.9, .3, .55), .05, .05, FER, n=8)   # essieu
    for i in range(5): P.sphere((R.uniform(-.5, .5), R.uniform(-.8, .8), 1.22), .3, varie(lin("#8aa83a"), .15), sub=2, jit=.03)   # choux
    for i in range(2): P.cylindre((R.uniform(-.4, .4), .9, 1.0), (R.uniform(-.4, .4), .9, 1.55), .22, .2, varie(PAILLE, .1), n=10)   # sacs de grain
def etal(P):
    for x in (-1.3, 1.3):
        for y in (-.6, .6): P.boite((x, y, 1.1), (.12, .12, 2.2 + (y > 0) * .4), BOIS_F)
    P.boite((0, -.2, .9), (2.8, 1.2, .1), BOIS_C)
    for i in range(7): P.boite((-1.35 + i * .45, .05, 2.45 + .2), (.45, 1.6, .06), TISSU if i % 2 else TISSU2, rx=-.25, bev=0)
    for i in range(6): P.sphere((-1.0 + i * .4, -.3, 1.05), .16, varie(R.choice([ROUGE, OCRE, lin("#8aa83a")]), .1), sub=1)
def cloture(P):
    for x in (-1.5, 0, 1.5): P.boite((x, 0, .55), (.16, .16, 1.1), BOIS_F, jit=.02)
    for z in (.4, .85): P.boite((0, 0, z), (3.2, .09, .14), BOIS, rz=R.uniform(-.03, .03))
def lanterne(P):   # poteau, potence, lanterne de fer à vitres, petit toit
    P.boite((0, 0, 1.5), (.16, .16, 3.0), BOIS_F, bev=.02); P.boite((.35, 0, 2.95), (.8, .1, .1), BOIS_F, bev=.015)
    P.boite((.12, 0, 2.75), (.06, .06, .4), BOIS_F, rx=0, ry=-.7, bev=0)   # jambe de force
    P.boite((.65, 0, 2.8), (.03, .03, .2), FER, bev=0)
    for sx in (-1, 1):
        for sy in (-1, 1): P.boite((.65 + sx * .14, sy * .14, 2.52), (.035, .035, .42), FER, bev=.005)
    P.boite((.65, 0, 2.3), (.34, .34, .05), FER, bev=.01); P.boite((.65, 0, 2.74), (.36, .36, .05), FER, bev=.01)
    P.cylindre((.65, 0, 2.76), (.65, 0, 2.92), .24, .02, FER, n=4)
    P.boite((.65, 0, 2.52), (.26, .26, .38), lin("#ffcf6a"), bev=0)
def foin(P):
    P.sphere((0, 0, .9), 1.2, varie(PAILLE, .05), (1, 1, .85), sub=3, jit=.03); P.cylindre((0, 0, 1.6), (0, 0, 2.5), .05, .05, BOIS_F, n=6)
def ponton(P):
    for i in range(14): P.boite((0, i * .5, 1.2), (2.4, .45, .12), varie(BOIS_C, .12), bev=.02)
    for y in (.2, 3.4, 6.6):
        for x in (-1.1, 1.1): P.cylindre((x, y, -3.5), (x, y, 1.5), .16, .14, BOIS_F, n=8)
for nom, f, pied in (("puits", puits, (2.6, 2.6)), ("tonneau", tonneau, (.9, .9)), ("caisse", caisse, (.9, .9)), ("charrette", charrette, (2.0, 3.8)),
                     ("etal", etal, (3.0, 1.6)), ("cloture", cloture, None), ("lanterne", lanterne, None), ("foin", foin, (2.4, 2.4)), ("ponton", ponton, None)):
    accessoire(nom, f, pied)

# ------------------------------------------------------------------ intérieurs (pièces fermées, la porte regarde -Y)
def interieur(nom, l, p, h, meubler):
    P = Piece("I_" + nom); V = Piece("IL_" + nom)   # IL : ce qui brille (foyer, bougies)
    for i in range(int(l / .45)):   # plancher
        P.boite((-l / 2 + (i + .5) * l / int(l / .45), 0, -.1), (l / int(l / .45) * .97, p, .2), varie(BOIS_C, .1), bev=.02)
    for y in (-p / 2, p / 2): mur_planches(P, (-l / 2, y, 0), (l / 2, y, 0), 0, h, BOIS, ep=.2, larg=.35)
    for x in (-l / 2, l / 2): mur_planches(P, (x, -p / 2, 0), (x, p / 2, 0), 0, h, BOIS, ep=.2, larg=.35)
    P.boite((0, 0, h + .1), (l + .4, p + .4, .2), BOIS_F, bev=0)
    for x in np.arange(-l / 2 + 1, l / 2, 1.6): P.boite((x, 0, h - .1), (.28, p, .3), BOIS_F)   # poutres
    porte(P, (0, -p / 2 + .14, 0), 0, l=1.2, h=2.0)
    meubler(P, V, l, p, h)
    ob = P.objet({"taille": [l, p, h], "porte": [0, -p / 2 + .9, 0]}); V.objet(); return ob
def table(P, x, y, l=2.2, p=1.0, rz=0):
    P.boite((x, y, .78), (l, p, .1), BOIS_C, rz=rz, bev=.03)
    for sx in (-1, 1):
        for sy in (-1, 1): P.boite((x + math.cos(rz) * sx * (l / 2 - .15) - math.sin(rz) * sy * (p / 2 - .15), y + math.sin(rz) * sx * (l / 2 - .15) + math.cos(rz) * sy * (p / 2 - .15), .38), (.12, .12, .76), BOIS_F)
def banc(P, x, y, l=2.0, rz=0):
    P.boite((x, y, .45), (l, .35, .08), BOIS_C, rz=rz)
    for s in (-1, 1): P.boite((x + math.cos(rz) * s * (l / 2 - .2), y + math.sin(rz) * s * (l / 2 - .2), .22), (.1, .3, .44), BOIS_F, rz=rz)
def lit(P, x, y, rz=0):
    P.boite((x, y, .3), (1.1, 2.1, .4), BOIS, rz=rz, bev=.04); P.boite((x, y, .58), (1.0, 2.0, .2), TISSU2, rz=rz, bev=.08)
    P.boite((x, y + .55, .66), (.98, .9, .1), TISSU, rz=rz, bev=.05); P.boite((x, y - .78, .72), (.7, .35, .16), lin("#f4f0e4"), rz=rz, bev=.06)
    P.boite((x, y - 1.05, .65), (1.1, .12, 1.0), BOIS_F, rz=rz)
def etagere(P, x, y, rz=0):
    for z in (.5, 1.1, 1.7): P.boite((x, y, z), (1.6, .35, .06), BOIS_C, rz=rz)
    for s in (-1, 1): P.boite((x + math.cos(rz) * s * .8, y + math.sin(rz) * s * .8, 1.0), (.08, .35, 2.0), BOIS_F, rz=rz)
    for z in (.5, 1.1, 1.7):
        for i in range(4): P.cylindre((x - .55 + i * .37, y, z + .03), (x - .55 + i * .37, y, z + .28), .1, .08, varie(R.choice([lin("#c86a3a"), lin("#e8dcc0"), lin("#6a8a9a"), lin("#7a5a3a")]), .1), n=8)
def tapis(P, x, y, l, p): P.boite((x, y, .02), (l, p, .03), lin("#9a3a2a"), bev=0); P.boite((x, y, .03), (l * .8, p * .75, .03), lin("#d8a84a"), bev=0)
def foyer(P, V, x, y, rond=False):
    if rond:
        for k in range(10): a = k / 10 * math.tau; P.boite((x + math.cos(a) * .9, y + math.sin(a) * .9, .15), (.5, .35, .3), varie(PIERRE, .1), rz=a + math.pi / 2, bev=.05, jit=.02)
    else:
        for i in range(5):
            for z in np.arange(0, 2.4, .4): P.boite((x - 1.0 + i * .5, y, z + .2), (.5, .6, .42), varie(PIERRE2, .1), bev=.05, jit=.02) if not (1 <= i <= 3 and z < 1.2) else None
        P.boite((x, y - .1, 1.25), (2.6, .8, .2), BOIS_F)
        P.cylindre((x, y, 2.4), (x, y, 3.4), .45, .4, PIERRE2, n=8)
    for i in range(3): P.cylindre((x - .3 + i * .3, y - .2 * (not rond), .12), (x - .2 + i * .3, y + .3 - .2 * (not rond), .2), .08, .08, BOIS_F, n=6)
    V.sphere((x, y - .1 * (not rond), .35), .32, lin("#ff9a2a"), (1, 1, 1.6), sub=1); V.sphere((x, y - .1 * (not rond), .5), .18, lin("#ffe07a"), (1, 1, 1.8), sub=1)
def meubler_maison(P, V, l, p, h):
    foyer(P, V, 0, p / 2 - .45); table(P, -1.4, -.4); banc(P, -1.4, -1.2); banc(P, -1.4, .4)
    lit(P, l / 2 - .8, .6); etagere(P, -l / 2 + .3, .8, math.pi / 2); tapis(P, 1.2, -1.2, 2.0, 1.4)
    for i in range(2): P.cylindre((-l / 2 + .5, -p / 2 + .6 + i * .9, 0), (-l / 2 + .5, -p / 2 + .6 + i * .9, .9), .4, .4, BOIS_C, n=12)
    P.boite((l / 2 - .5, -p / 2 + .6, .45), (.8, .8, .8), BOIS_C)   # coffre
    V.cylindre((-1.4, -.4, .84), (-1.4, -.4, 1.05), .05, .05, lin("#fff4d0"), n=6)   # bougie
def meubler_halle(P, V, l, p, h):
    foyer(P, V, 0, 0, rond=True)
    for s in (-1, 1): table(P, s * 2.6, 0, l=1.0, p=6.0); banc(P, s * 2.0, 0, l=6.0, rz=math.pi / 2); banc(P, s * 3.2, 0, l=6.0, rz=math.pi / 2)
    for y in np.arange(-p / 2 + 1.5, p / 2 - 1, 2.5):
        for s in (-1, 1): P.cylindre((s * 1.2, y, 0), (s * 1.2, y, h), .2, .2, BOIS_F, n=8)
    for i, x in enumerate(np.arange(-l / 2 + 1, l / 2 - .5, 1.6)):   # boucliers aux murs
        P.cylindre((x, p / 2 - .15, 1.9), (x, p / 2 - .25, 1.9), .45, .45, R.choice([ROUGE, BLEU, OCRE]), n=14); P.sphere((x, p / 2 - .27, 1.9), .1, FER, sub=1)
    P.boite((0, p / 2 - .5, 1.0), (2.4, .7, 2.0), BOIS_F)   # trône du chef
    for y in (-p / 4, p / 4): V.sphere((0, y, h - .5), .15, lin("#ffcf6a"), sub=1)
interieur("maison", 7.0, 6.0, 3.0, meubler_maison)
interieur("halle", 9.0, 13.0, 4.2, meubler_halle)

# ------------------------------------------------------------------ occlusion cuite dans les couleurs (Cycles)
scene.render.engine = "CYCLES"; scene.cycles.device = "CPU"; scene.cycles.samples = 64
sol = bpy.data.objects.new("SolBake", bpy.data.meshes.new("SolBake")); scene.collection.objects.link(sol)
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=40); bm.to_mesh(sol.data); bm.free()
mat = bpy.data.materials.new("Bake"); mat.use_nodes = True
for ob in [o for o in scene.objects if o.type == "MESH" and o.name != "SolBake"]:
    ob.data.materials.append(mat)
    ao = ob.data.color_attributes.new("AO", "FLOAT_COLOR", "POINT"); ob.data.color_attributes.active_color = ao
    for o in scene.objects: o.select_set(False)
    ob.select_set(True); bpy.context.view_layer.objects.active = ob
    sol.location.z = (min((ob.matrix_world @ Vector(c)).z for c in ob.bound_box) if not ob.name.startswith(("I_", "IL_")) else -50)
    bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")
    a = np.zeros(len(ob.data.vertices) * 4, np.float32); ao.data.foreach_get("color", a)
    c = np.zeros_like(a); ob.data.color_attributes["Col"].data.foreach_get("color", c)
    a = a.reshape(-1, 4); c = c.reshape(-1, 4); k = .35 + .65 * a[:, :1] ** .8
    if ob.name.startswith(("W_", "IL_")): k = np.ones_like(k)
    c[:, :3] *= k; ob.data.color_attributes["Col"].data.foreach_set("color", c.ravel())
    ob.data.color_attributes.remove(ob.data.color_attributes["AO"]); ob.data.color_attributes.active_color = ob.data.color_attributes["Col"]
    ob.data.materials.clear()
    print("AO", ob.name, len(ob.data.vertices))
bpy.data.objects.remove(sol)
mv = bpy.data.materials.new("Village"); mv.use_nodes = True
nt = mv.node_tree; ca = nt.nodes.new("ShaderNodeVertexColor"); ca.layer_name = "Col"; bs = nt.nodes["Principled BSDF"]
nt.links.new(ca.outputs["Color"], bs.inputs["Base Color"]); bs.inputs["Roughness"].default_value = .85
ml = bpy.data.materials.new("Lueur"); ml.use_nodes = True
nl = ml.node_tree; ca2 = nl.nodes.new("ShaderNodeVertexColor"); ca2.layer_name = "Col"; nl.links.new(ca2.outputs["Color"], nl.nodes["Principled BSDF"].inputs["Base Color"])
for ob in [o for o in scene.objects if o.type == "MESH"]:
    ob.data.materials.append(ml if ob.name.startswith(("W_", "IL_")) else mv)

for o in scene.objects: o.select_set(o.type == "MESH")
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, "village.glb"), export_format="GLB", use_selection=True, export_extras=True,
                          export_yup=True, export_apply=True, export_animations=False)
print("exporté", len([o for o in scene.objects if o.type == "MESH"]), "objets")

# ------------------------------------------------------------------ aperçus
if APERCU:
    w = bpy.data.worlds.new("Ciel"); scene.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (.55, .7, .9, 1); w.node_tree.nodes["Background"].inputs[1].default_value = .8
    sun = bpy.data.objects.new("Soleil", bpy.data.lights.new("Soleil", "SUN")); scene.collection.objects.link(sun); sun.data.energy = 3.5; sun.rotation_euler = (.85, .15, -.7); sun.data.angle = .1
    cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam")); scene.collection.objects.link(cam); scene.camera = cam; cam.data.lens = 35
    scene.cycles.samples = 48; scene.render.resolution_x, scene.render.resolution_y = 1400, 800
    sol = bpy.data.objects.new("Pre", bpy.data.meshes.new("Pre")); scene.collection.objects.link(sol)
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=200); bm.to_mesh(sol.data); bm.free()
    mg = bpy.data.materials.new("Herbe"); mg.use_nodes = True; mg.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*GAZON, 1); sol.data.materials.append(mg)
    # on aligne les maisons pour la photo
    xs = 0
    for nom in ("longere", "colombage", "chaumiere", "pecheur", "pierre", "forge", "moulin"):
        for o in scene.objects:
            if o.name in ("M_" + nom, "W_" + nom) or (nom == "moulin" and o.name == "A_moulin"): o.location.x += xs; o.location.y += 0
        xs += 11
    for i, o in enumerate([o for o in scene.objects if o.name.startswith("P_")]): o.location = (i * 3.5 - 2, -14, 0)
    for o in scene.objects:
        if o.name.startswith(("I_", "IL_")): o.hide_render = True
    cam.location = (33, -46, 17); cam.rotation_euler = (Vector((33, 0, 3)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = os.path.join(OUT, "apercu_village.png"); bpy.ops.render.render(write_still=True)
    for o in scene.objects:
        if o.name.startswith(("M_", "W_", "A_", "P_")): o.hide_render = True
        if o.name.startswith(("I_", "IL_")): o.hide_render = not o.name.endswith("maison")
    sol.hide_render = True
    lum = bpy.data.objects.new("Feu", bpy.data.lights.new("Feu", "POINT")); scene.collection.objects.link(lum); lum.data.energy = 300; lum.data.color = (1, .6, .3); lum.location = (0, .8, 1.6)
    sun.data.energy = 0; w.node_tree.nodes["Background"].inputs[1].default_value = .15
    cam.location = (2.6, -2.6, 2.4); cam.rotation_euler = (Vector((-1, 1, .9)) - cam.location).to_track_quat("-Z", "Y").to_euler(); cam.data.lens = 18
    hide = [];
    scene.render.filepath = os.path.join(OUT, "apercu_interieur.png"); bpy.ops.render.render(write_still=True)
