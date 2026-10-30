# The Dragon Apprentice Chronicles : la Caverne des Braises, faite en Blender par script.
# Une galerie de lave en trois salles (16 m de large, 56 m de long), séparées par deux murs de roche percés d'une porte,
# des rigoles de lave le long des murs, des cristaux de braise, des stalactites ; l'entrée dans la montagne ;
# les pièces des énigmes : grille de fer, brasero, dalle, socle et Épée de Braise.
# Lumière : l'occlusion (Cycles) × une lumière de lave calculée à chaque sommet, cuites dans les couleurs.
# Le jeu les affiche sans calcul de lumière (MeshBasicMaterial) : la caverne a toujours la même ambiance.
# Repère Blender : l'entrée est en y = -28, on avance vers +y (dans le jeu : de z = +28 vers z = -28).
# Lancer : blender -b -P caverne.py -- <dossier>      Produit : caverne.glb (+ apercu_caverne.png)
import bpy, bmesh, math, random, os, sys
import numpy as np
from mathutils import Vector, Matrix, noise

OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "/tmp/caverne"
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
R = random.Random(7)
def lin(h):
    h = h.lstrip("#"); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4 for x in c)
def varie(c, k=.08): f = 1 + R.uniform(-k, k); return tuple(min(1, x * f) for x in c)
ROC, ROC2, ROC3, BASALTE, CENDRE = lin("#7a6a62"), lin("#5a4c48"), lin("#8e7a6a"), lin("#3e3434"), lin("#6a625e")
PIERRE, PIERRE2, FER, FER2, CUIR, OR, BRAISE = lin("#a0968a"), lin("#8a8076"), lin("#4a4a52"), lin("#2e2e34"), lin("#5a3a24"), lin("#d8a840"), lin("#ff7a1a")
LAVE, LAVE2, LAVE3, CRISTAL, CRISTAL2 = lin("#ffd060"), lin("#ff8a1a"), lin("#c02a08"), lin("#ff6a2a"), lin("#ffc070")
L, P0, H = 8.0, 28.0, 8.0          # demi-largeur, demi-longueur, hauteur de la voûte
MURS = (-9.0, 9.0)                 # murs entre les salles (y)
PORTE_L, PORTE_H = 1.6, 3.4        # demi-largeur et hauteur des passages

class Piece:
    def __init__(s, nom): s.nom = nom; s.bm = bmesh.new(); s.col = s.bm.verts.layers.float_color.new("Col")
    def _fin(s, vs, c, bev=0.0, jit=0.0):
        for v in vs:
            v[s.col] = (*c, 1)
            if jit: v.co += Vector((R.uniform(-jit, jit), R.uniform(-jit, jit), R.uniform(-jit, jit)))
        if bev:
            st = set(vs); r = bmesh.ops.bevel(s.bm, geom=[e for e in s.bm.edges if e.verts[0] in st and e.verts[1] in st], offset=bev, segments=1, affect="EDGES")
            for v in r["verts"]: v[s.col] = (*c, 1)
    def boite(s, c, t, col, rz=0.0, rx=0.0, ry=0.0, bev=.04, jit=0.0):
        M = Matrix.Translation(Vector(c)) @ Matrix.Rotation(rz, 4, "Z") @ Matrix.Rotation(ry, 4, "Y") @ Matrix.Rotation(rx, 4, "X") @ Matrix.Diagonal((*t, 1))
        vs = bmesh.ops.create_cube(s.bm, size=1, matrix=M)["verts"]; s._fin(vs, col, bev, jit); return vs
    def sphere(s, c, r, col, ech=(1, 1, 1), sub=2, jit=0.0):
        M = Matrix.Translation(Vector(c)) @ Matrix.Diagonal((*ech, 1))
        vs = bmesh.ops.create_icosphere(s.bm, subdivisions=sub, radius=r, matrix=M)["verts"]; s._fin(vs, col, 0, jit); return vs
    def cyl(s, a, b, r1, r2, col, n=8, jit=0.0):
        a, b = Vector(a), Vector(b); d = b - a
        M = Matrix.Translation((a + b) / 2) @ d.to_track_quat("Z", "Y").to_matrix().to_4x4()
        vs = bmesh.ops.create_cone(s.bm, cap_ends=True, segments=n, radius1=r1, radius2=r2, depth=d.length, matrix=M)["verts"]; s._fin(vs, col, 0, jit); return vs
    def cristal(s, base, dirv, long, r, col):   # prisme à 6 faces, pointe claire
        d = Vector(dirv).normalized(); a = Vector(base); b = a + d * long * .75
        s.cyl(a, b, r, r * .9, col, n=6); vs = s.cyl(b, a + d * long, r * .9, .005, col, n=6)
        for v in vs:
            if (v.co - b).length > r * 1.5: v[s.col] = (*LAVE, 1)
    def objet(s, props=None, lisse=False):
        me = bpy.data.meshes.new(s.nom); s.bm.normal_update(); s.bm.to_mesh(me); s.bm.free()
        for p in me.polygons: p.use_smooth = lisse
        ob = bpy.data.objects.new(s.nom, me); scene.collection.objects.link(ob)
        for k, v in (props or {}).items(): ob[k] = v
        return ob

def bruit(x, y, z, f=.35): return noise.noise(Vector((x * f, y * f, z * f)))

# ------------------------------------------------------------------ la galerie (coque tournée vers l'intérieur)
PROFIL = [(-6.1, 0), (-6.25, -.55), (-7.35, -.55), (-7.6, .4), (-8.0, 2.0), (-7.8, 3.6), (-7.0, 5.2), (-5.6, 6.6), (-3.6, 7.5), (-1.2, 8.0),
          (1.2, 8.0), (3.6, 7.5), (5.6, 6.6), (7.0, 5.2), (7.8, 3.6), (8.0, 2.0), (7.6, .4), (7.35, -.55), (6.25, -.55), (6.1, 0),
          (4.5, 0), (3.0, 0), (1.5, 0), (0, 0), (-1.5, 0), (-3.0, 0), (-4.5, 0)]
def galerie():
    P = Piece("C_grotte"); bm = P.bm
    ys = list(np.arange(-P0, P0 + .01, .8)); anneaux = []
    for y in ys:
        an = []
        for (x, z) in PROFIL:
            sol = z == 0 and abs(x) <= 6.1
            k = 0 if sol else (.25 if z < 0 else 1.0)
            ox = bruit(x, y, z) * .9 * k * (1 if abs(x) > 6 else .5); oz = bruit(x + 9, y, z) * .7 * k
            ex = 1 + .12 * math.sin(y * .23) + (.1 if abs(y) < 7 else 0)   # la salle du milieu un peu plus large
            co = Vector((x * (ex if not sol and abs(x) > 7 else 1) + (ox if not sol else 0), y + (bruit(x, y + 3, z) * .3 * k), z + (oz if not sol else 0)))
            v = bm.verts.new(co)
            if sol: c = varie(R.choice([ROC2, CENDRE, ROC2]), .1)
            elif z < 0: c = BASALTE
            else:
                n = bruit(x * 2, y * 2, z * 2, .5)
                c = varie(ROC3 if n > .25 else (ROC2 if n < -.3 else ROC), .08)
                if z > 6.5: c = tuple(a * .7 for a in c)
            v[P.col] = (*c, 1); an.append(v)
        anneaux.append(an)
    n = len(PROFIL)
    for a, b in zip(anneaux, anneaux[1:]):
        for i in range(n): bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]))
    for an in (anneaux[0], anneaux[-1]):   # les deux bouts fermés
        c = bm.verts.new(sum((v.co for v in an), Vector()) / n); c[P.col] = (*ROC2, 1)
        for i in range(n): bm.faces.new((an[i], an[(i + 1) % n], c))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bmesh.ops.reverse_faces(bm, faces=bm.faces)   # vues de l'intérieur
    # stalactites et éboulis
    for _ in range(70):
        x, y = R.uniform(-6, 6), R.uniform(-P0 + 2, P0 - 2)
        if any(abs(y - m) < 1.2 for m in MURS): continue
        zt = 7.9 - (abs(x) / 8) ** 2 * 4.5; l = R.uniform(.6, 2.2)
        P.cyl((x, y, zt + .3), (x + R.uniform(-.1, .1), y, zt - l), R.uniform(.18, .4), .02, varie(ROC, .1), n=6, jit=.04)
    for _ in range(46):
        s = R.choice((-1, 1)); x, y = s * R.uniform(5.3, 6.0), R.uniform(-P0 + 1, P0 - 1)
        P.sphere((x, y, .1), R.uniform(.25, .6), varie(R.choice([ROC, ROC2, BASALTE]), .1), (1, 1, .6), sub=1, jit=.06)
    # dalles gravées du chemin et cercle du socle (presque au ras du sol)
    for y in np.arange(-P0 + 1.5, P0 - 6, 1.6):
        if any(abs(y - m) < 1 for m in MURS): continue
        P.boite((R.uniform(-.15, .15), y, .02), (1.3, 1.3, .06), varie(PIERRE2, .08), rz=R.uniform(-.1, .1), bev=.03)
    for k in range(16):
        a = k / 16 * math.tau; P.boite((math.cos(a) * 2.6, 22 + math.sin(a) * 2.6, .03), (1.1, .5, .07), varie(PIERRE, .06), rz=a + math.pi / 2, bev=.03)
    return P.objet()

def murs():   # murs de roche entre les salles, passage voûté avec un encadrement de pierre
    P = Piece("C_murs")
    for ym in MURS:
        for i in range(-8, 9):
            for j in range(0, 9):
                x, z = i * 1.0, j * 1.0 + .5
                if abs(x) < PORTE_L + .55 and z < PORTE_H + .4: continue
                if (i + j) % 2 and abs(x) > PORTE_L + 1.2: continue
                P.sphere((x + R.uniform(-.3, .3), ym + R.uniform(-.25, .25), z), R.uniform(.85, 1.15), varie(R.choice([ROC, ROC2, ROC3]), .08), (1, .8, .9), sub=1, jit=.18)
        for s in (-1, 1):   # montants
            for z in np.arange(.4, PORTE_H, .7): P.boite((s * (PORTE_L + .35), ym, z), (.7, 1.3, .66), varie(PIERRE, .06), bev=.06)
        for k in range(7):   # arc
            a = math.pi * k / 6; P.boite((-math.cos(a) * (PORTE_L + .3), ym, PORTE_H + math.sin(a) * .9), (.62, 1.35, .55), varie(PIERRE, .06), ry=-a + math.pi / 2, bev=.05)
    return P.objet()

def lave():   # rigoles le long des murs, chutes au fond de la dernière salle
    P = Piece("C_lave")
    for s in (-1, 1):
        for y in np.arange(-P0 + .5, P0 - .4, 1.0):
            vs = P.boite((s * 6.8, y, -.3), (1.2, 1.02, .1), LAVE2, bev=0)
            for v in vs: v[P.col] = (*(LAVE if abs(v.co.x) < 7 and abs(v.co.x) > 6.5 else LAVE2), 1)
    for x in (-4.2, 4.2):   # chutes de lave
        for z in np.arange(0, 6.5, .5):
            vs = P.boite((x + math.sin(z) * .2, P0 - .9 + z * .05, z + .25), (.9 - z * .06, .2, .52), LAVE, bev=0)
            for v in vs: v[P.col] = (*(LAVE if v.co.y < P0 - .9 else LAVE2), 1)
        P.boite((x, P0 - 1.6, -.25), (2.4, 1.6, .1), LAVE2, bev=0)
    return P.objet()

CRISTAUX = []
def cristaux():
    P = Piece("C_cristaux")
    sites = [(-6.6, -24, 1.0), (6.5, -16, 2.6), (-6.8, -4, 2.0), (6.8, 4, 1.2), (-6.4, 13, 3.4), (6.6, 16, 1.0), (-4.5, 26.2, 1.2), (4.6, 26.2, 1.4), (0, 27.0, 5.6)]
    for (x, y, z) in sites:
        CRISTAUX.append(Vector((x * .85, y, z + .6)))
        for k in range(R.randint(4, 7)):
            d = Vector((-x * .12 + R.uniform(-.5, .5), R.uniform(-.5, .5), R.uniform(.4, 1.0))) if abs(x) > 1 else Vector((R.uniform(-.6, .6), -.6, R.uniform(-.3, .8)))
            P.cristal((x + R.uniform(-.3, .3), y + R.uniform(-.4, .4), z), d, R.uniform(.6, 1.4), R.uniform(.08, .16), varie(R.choice([CRISTAL, CRISTAL2]), .05))
    return P.objet()

def sortie():   # la lumière du jour à l'entrée (un arc clair)
    P = Piece("C_jour")
    bm = P.bm; pts = [(-1.8, 0), (-1.8, 2.6), (-1.3, 3.6), (0, 4.1), (1.3, 3.6), (1.8, 2.6), (1.8, 0)]
    vs = [bm.verts.new((x, -P0 + .25, z)) for x, z in pts]; c = bm.verts.new((0, -P0 + .25, 1.8))
    for v in vs: v[P.col] = (*lin("#f4ecd8"), 1)
    c[P.col] = (*lin("#fffaf0"), 1)
    for a, b in zip(vs, vs[1:]): bm.faces.new((a, c, b))
    for v in vs + [c]: v.co.y += 0
    return P.objet()

# ------------------------------------------------------------------ pièces des énigmes
def grille():
    P = Piece("C_grille")
    for i in range(7):
        x = -1.5 + i * .5; P.cyl((x, 0, -.2), (x, 0, 3.4), .05, .05, FER, n=6); P.cyl((x, 0, -.4), (x, 0, -.2), .01, .06, FER2, n=6)
    for z in (.5, 1.6, 2.7): P.boite((0, 0, z), (3.4, .12, .14), FER2, bev=.02)
    for x in (-1.5, 0, 1.5):
        for z in (.5, 1.6, 2.7): P.sphere((x, -.08, z), .07, FER, sub=1)
    P.boite((0, 0, 3.55), (3.6, .3, .3), FER2, bev=.03)
    return P.objet({"pied": [3.4, .4]})

def brasero():
    P = Piece("C_brasero")
    P.cyl((0, 0, 0), (0, 0, .22), .42, .4, PIERRE2, n=8)
    P.cyl((0, 0, .22), (0, 0, .9), .22, .2, PIERRE, n=8)
    P.cyl((0, 0, .9), (0, 0, 1.18), .2, .5, FER, n=12)
    P.cyl((0, 0, 1.18), (0, 0, 1.22), .52, .52, FER2, n=12)
    for k in range(6): a = k / 6 * math.tau; P.boite((math.cos(a) * .48, math.sin(a) * .48, 1.12), (.08, .08, .26), FER2, rz=a, bev=.01)
    for _ in range(7): P.sphere((R.uniform(-.25, .25), R.uniform(-.25, .25), 1.2), R.uniform(.08, .13), varie(lin("#2a2420"), .1), sub=1, jit=.02)   # charbons
    P.boite((0, -.23, .58), (.36, .04, .36), PIERRE2, bev=.02)   # emplacement de la plaque
    return P.objet({"pied": [.9, .9]})

def flamme():   # trois lames croisées, couleur du cœur vers les pointes (animées dans le jeu)
    P = Piece("C_flamme"); bm = P.bm
    for k in range(3):
        a = k / 3 * math.pi; ca, sa = math.cos(a), math.sin(a)
        pts = [(-.3, 0, LAVE2), (.3, 0, LAVE2), (.22, .45, LAVE), (0, 1.0, CRISTAL), (-.22, .45, LAVE)]
        vs = []
        for (u, z, c) in pts:
            v = bm.verts.new((u * ca, u * sa, z)); v[P.col] = (*c, 1); vs.append(v)
        bm.faces.new(vs)
    return P.objet()

def dalle():
    P = Piece("C_dalle")
    P.boite((0, 0, .06), (1.8, 1.8, .14), varie(PIERRE, .04), bev=.05)
    for k in range(4): a = k / 4 * math.tau + math.pi / 4; P.boite((math.cos(a) * .72, math.sin(a) * .72, .14), (.18, .18, .03), PIERRE2, rz=a, bev=.01)
    return P.objet()

def socle():
    P = Piece("C_socle")
    P.cyl((0, 0, 0), (0, 0, .25), 1.25, 1.2, PIERRE2, n=10, jit=.02)
    P.cyl((0, 0, .25), (0, 0, .5), .95, .9, PIERRE, n=10, jit=.02)
    P.boite((0, 0, .95), (.9, .9, .9), varie(PIERRE, .04), rz=.0, bev=.08, jit=.02)
    P.boite((0, 0, 1.45), (.7, .7, .12), PIERRE2, bev=.03)
    for k in range(4): a = k / 4 * math.tau; P.boite((math.cos(a) * .46, math.sin(a) * .46, .95), (.04, .5, .5), BRAISE, rz=a + math.pi / 2, bev=0)   # runes qui brillent
    return P.objet({"pied": [1.8, 1.8]})

def epee():   # l'Épée de Braise : origine à la garde, lame vers le bas (-z), poignée vers le haut
    P = Piece("C_epee")
    for i in range(10):   # lame en losange, qui s'affine
        z0, z1 = -i * .1, -(i + 1) * .1; w0, w1 = .07 - i * .002, .07 - (i + 1) * .002
        vs = P.cyl((0, 0, z0), (0, 0, z1), w0, w1 if i < 9 else .005, lin("#d8d4d0"), n=4)
        for v in vs: v.co.y *= .25
    P.cyl((0, 0, -1.0), (0, 0, -1.12), .05, .002, lin("#d8d4d0"), n=4)
    P.boite((0, 0, .03), (.36, .07, .06), OR, bev=.015)                   # garde
    for s in (-1, 1): P.sphere((s * .19, 0, .05), .04, OR, sub=1)
    P.cyl((0, 0, .06), (0, 0, .3), .03, .028, CUIR, n=8)                 # poignée
    P.sphere((0, 0, .34), .05, OR, sub=1)                                 # pommeau
    ob = P.objet()
    Q = Piece("C_epee_l")   # le fil rougeoyant de la lame
    for i in range(10):
        z = -i * .1 - .05; Q.boite((0, 0, z), (.012, .03, .1), BRAISE if i % 3 else LAVE, bev=0)
    Q.sphere((0, -.035, .05), .03, LAVE, sub=1)
    return ob, Q.objet()

def entree():   # l'entrée dans la montagne : un éperon de roche, une arche de pierre, des runes de braise
    P = Piece("C_entree")
    for _ in range(26):   # éperon de roche autour de l'ouverture (s'enfonce dans la pente)
        a = R.uniform(-1.3, 1.3); r = R.uniform(3.2, 6.2)
        P.sphere((math.sin(a) * r, R.uniform(.5, 5) , math.cos(a) * r * .9 + 1.5), R.uniform(1.4, 2.6), varie(R.choice([ROC, ROC2, ROC3]), .1), (1, 1.1, 1), sub=1, jit=.25)
    for k in range(6): P.sphere((R.uniform(-5, 5), R.uniform(5, 9), R.uniform(3, 6.5)), R.uniform(2, 3), varie(ROC2, .08), sub=1, jit=.3)
    for s in (-1, 1):   # piliers et arc
        for z in np.arange(.4, 4.0, .7): P.boite((s * 2.3, -.3, z), (.9, 1.2, .66), varie(PIERRE, .06), bev=.07, jit=.02)
    for k in range(9):
        a = math.pi * k / 8; P.boite((-math.cos(a) * 2.25, -.3, 4.0 + math.sin(a) * 1.3), (.8, 1.3, .6), varie(PIERRE, .06), ry=-a + math.pi / 2, bev=.06)
    P.boite((0, -.3, .06), (5.6, 3.0, .12), varie(PIERRE2, .05), bev=.04)   # seuil
    for s in (-1, 1): P.boite((s * 1.0, -1.6, .1), (1.1, 1.1, .2), PIERRE2, bev=.04)
    ob = P.objet({"pied": [12.0, 8.0]})
    Q = Piece("C_entree_l")   # le noir de la galerie, une lueur au fond, les runes de l'arc
    bm = Q.bm; pts = [(-1.85, 0), (-1.85, 3.9), (-1.3, 4.9), (0, 5.3), (1.3, 4.9), (1.85, 3.9), (1.85, 0)]
    vs = [bm.verts.new((x, .2, z)) for x, z in pts]; c = bm.verts.new((0, .2, 2.4))
    for v in vs: v[Q.col] = (*(lin("#5a1a06") if v.co.z < .3 else lin("#0a0605")), 1)
    c[Q.col] = (*lin("#1a0a06"), 1)
    for a, b in zip(vs, vs[1:]): bm.faces.new((b, c, a))
    for k in range(7):
        a = math.pi * (k + 1) / 8; Q.boite((-math.cos(a) * 2.25, -.98, 4.0 + math.sin(a) * 1.3), (.22, .04, .3), BRAISE, ry=-a + math.pi / 2, bev=0)
    return ob, Q.objet()

def rampant():   # ennemi des cavernes : un scarabée de braise (corps, lueurs, une patte réutilisée six fois)
    P = Piece("C_rampant")
    vs = P.sphere((0, 0, .32), .42, BASALTE, (1, 1.35, .62), sub=2, jit=.02)                  # carapace
    for v in vs:
        if v.co.z < .2: v.co.z = .2 + (v.co.z - .2) * .3
    P.sphere((0, .58, .28), .2, FER2, (1.1, .9, .8), sub=1)                                    # tête
    for sx in (-1, 1):
        P.cyl((sx * .08, .72, .24), (sx * .2, .98, .2), .05, .015, BASALTE, n=5)                # mandibules
        for k in range(4): P.boite((sx * (.2 + k * .04), -.3 + k * .22, .55 - abs(k - 1.5) * .03), (.12, .14, .05), ROC2, rz=sx * .3, bev=.01)   # plaques
    ob = P.objet()
    Q = Piece("C_rampant_l")
    for k in range(5): Q.boite((0, -.4 + k * .18, .58 - abs(k - 2) * .04), (.05, .16, .04), LAVE if k % 2 else LAVE2, bev=0)   # fente de lave sur le dos
    for sx in (-1, 1):
        Q.boite((sx * .26, .05, .5), (.04, .5, .04), LAVE2, rz=sx * .12, bev=0)
        Q.sphere((sx * .09, .74, .33), .045, LAVE, sub=1)                                     # yeux
    lu = Q.objet()
    J = Piece("C_patte")   # hanche à l'origine, vers +x puis vers le bas
    J.cyl((0, 0, 0), (.28, 0, .14), .045, .035, BASALTE, n=5); J.cyl((.28, 0, .14), (.5, 0, -.24), .035, .012, FER2, n=5)
    return ob, lu, J.objet()

def fourreau():   # le fourreau de l'Épée de Braise (même repère que l'épée : garde en 0, lame vers -z) et le baudrier du héros
    P = Piece("C_fourreau"); CUIR2, CUIR3, BRONZE, BRONZE2 = lin("#4a2c1a"), lin("#6a4428"), lin("#b8863a"), lin("#7a5424")
    def ovale(z0, z1, r0, r1, col, k=.42, n=14):
        vs = P.cyl((0, 0, z0), (0, 0, z1), r0, r1, col, n=n)
        for v in vs: v.co.y *= k
        return vs
    zs = list(np.linspace(-.04, -1.0, 13))
    for a, b in zip(zs, zs[1:]):   # corps de cuir, qui s'affine ; bandes claires et foncées alternées (cuir repoussé)
        t0, t1 = (-a - .04) / .96, (-b - .04) / .96
        ovale(a, b, .088 - .03 * t0, .088 - .03 * t1, varie(CUIR2 if int(-a * 13) % 2 else CUIR3, .05))
    for v in P.bm.verts: v.co.x *= 1 + .05 * math.sin(v.co.z * 60) * (abs(v.co.y) < .01)
    ovale(-.02, -.15, .098, .094, BRONZE, .48)                 # embouchure de bronze
    ovale(-.05, -.12, .101, .099, BRONZE2, .5)                 # liseré gravé
    for z in (-.36, -.62):                                      # bagues et anneaux du baudrier
        ovale(z + .025, z - .025, .084 - .03 * (-z / 1), .084 - .03 * (-z / 1), BRONZE, .5)
        for sx in (-1, 1): P.cyl((sx * (.09 - .03 * -z), 0, z + .03), (sx * (.12 - .03 * -z), 0, z - .03), .012, .012, BRONZE2, n=6)
    ovale(-.96, -1.06, .062, .045, BRONZE, .5)                  # bouterolle
    ovale(-1.06, -1.14, .045, .006, BRONZE, .5)
    for k in range(5): P.sphere((0, -.04, -.22 - k * .14), .012, BRONZE, (1, .5, 1), sub=1)   # rivets décoratifs
    ob = P.objet(lisse=True)
    # baudrier : une sangle de cuir qui passe sur l'épaule droite et sous le bras gauche (repère du héros, tourné vers -Y)
    B = Piece("C_baudrier"); bm = B.bm
    u, w, c, Ru, Rw, demi = Vector((.48, 0, -.88)).normalized(), Vector((0, 1, 0)), Vector((.02, 0, .79)), .27, .168, .022
    v_ = Vector((.88, 0, .48)).normalized(); N = 48; prev = None
    for i in range(N + 1):
        t = i / N * math.tau; p = c + u * Ru * math.cos(t) + w * Rw * math.sin(t)
        if math.cos(t) < -.8: p.z += .03 * (math.cos(t) + .8) / -.2   # passe bien sur l'épaule
        out = (p - Vector((0, 0, p.z))).normalized()
        ring = [bm.verts.new(p + v_ * demi * sx + out * e) for (sx, e) in ((-1, 0), (1, 0), (1, .007), (-1, .007))]
        for v in ring: v[B.col] = (*varie(CUIR3, .03), 1)
        if prev:
            for k in range(4): bm.faces.new((prev[k], prev[(k + 1) % 4], ring[(k + 1) % 4], ring[k]))
        prev = ring
    for (cx, cy, cz) in ((-.06, -.172, .94), (.11, -.172, .63)):   # boucles de bronze devant
        B.boite((cx, cy, cz), (.05, .012, .055), BRONZE, rz=0, bev=.006); B.boite((cx, cy - .006, cz), (.03, .012, .035), CUIR2, bev=0)
    return ob, B.objet()

objs = [galerie(), murs(), lave(), cristaux(), sortie(), grille(), brasero(), flamme(), dalle(), socle(), *epee(), *fourreau(), *entree(), *rampant()]
LUEURS = ("C_rampant_l", "C_lave", "C_cristaux", "C_jour", "C_flamme", "C_epee_l", "C_entree_l")

# ------------------------------------------------------------------ occlusion (Cycles) × lumière de lave
scene.render.engine = "CYCLES"; scene.cycles.device = "CPU"; scene.cycles.samples = 48
w = bpy.data.worlds.new("Noir"); scene.world = w; w.light_settings.distance = 1.6
mat = bpy.data.materials.new("Bake"); mat.use_nodes = True
SOURCES = [(Vector((s * 6.8, y, -.2)), LAVE2, 2.2, 3.0) for s in (-1, 1) for y in np.arange(-26, 27, 4)]
SOURCES += [(c, CRISTAL, 1.4, 2.5) for c in CRISTAUX] + [(Vector((x, P0 - 1, 3)), LAVE, 3.5, 4.5) for x in (-4.2, 4.2)]
SOURCES += [(Vector((0, 22, 2.2)), lin("#ffb060"), 1.6, 4.0), (Vector((0, -P0 + 1.5, 2.5)), lin("#bcd0f0"), 2.2, 5.0)]
def lumiere(ob):
    me = ob.data; n = len(me.vertices)
    co = np.zeros(n * 3, np.float32); me.vertices.foreach_get("co", co); co = co.reshape(-1, 3)
    no = np.zeros(n * 3, np.float32); me.vertices.foreach_get("normal", no); no = no.reshape(-1, 3)
    li = np.full((n, 3), .11, np.float32) * np.array(lin("#8a7a90"), np.float32) * 2.2   # ambiance froide et sombre
    for (p, c, I, r) in SOURCES:
        d = np.array(p, np.float32) - co; dist = np.linalg.norm(d, axis=1) + 1e-4
        lam = np.clip((d * no).sum(1) / dist, 0, 1) * .7 + .3
        li += np.outer(.75 * I * lam / (1 + (dist / r) ** 2.6), np.array(c, np.float32))
    return np.clip(li, 0, 2.2)
for ob in objs:
    if ob.name in LUEURS: continue
    ob.data.materials.append(mat)
    ao = ob.data.color_attributes.new("AO", "FLOAT_COLOR", "POINT"); ob.data.color_attributes.active_color = ao
    for o in scene.objects: o.select_set(False)
    ob.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")
    a = np.zeros(len(ob.data.vertices) * 4, np.float32); ao.data.foreach_get("color", a)
    c = np.zeros_like(a); ob.data.color_attributes["Col"].data.foreach_get("color", c)
    a = a.reshape(-1, 4); c = c.reshape(-1, 4); k = .3 + .7 * a[:, :1] ** .8
    if ob.name in ("C_grotte", "C_murs"): c[:, :3] *= k * lumiere(ob)      # la lumière de la caverne est cuite
    else: c[:, :3] *= k                                                    # les objets mobiles : occlusion seule (le jeu les éclaire)
    ob.data.color_attributes["Col"].data.foreach_set("color", c.ravel())
    ob.data.color_attributes.remove(ob.data.color_attributes["AO"]); ob.data.color_attributes.active_color = ob.data.color_attributes["Col"]
    ob.data.materials.clear()
    print("cuit", ob.name, len(ob.data.vertices))
mv = bpy.data.materials.new("Caverne"); mv.use_nodes = True
ca = mv.node_tree.nodes.new("ShaderNodeVertexColor"); ca.layer_name = "Col"; mv.node_tree.links.new(ca.outputs["Color"], mv.node_tree.nodes["Principled BSDF"].inputs["Base Color"])
for ob in objs: ob.data.materials.append(mv)
for o in scene.objects: o.select_set(o in objs)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, "caverne.glb"), export_format="GLB", use_selection=True, export_extras=True, export_yup=True)
print("exporté", len(objs), "objets")

# ------------------------------------------------------------------ aperçu (vue depuis l'entrée, lumière cuite seule)
if "--apercu" in sys.argv:
    me = bpy.data.materials.new("Em"); me.use_nodes = True; nt = me.node_tree; nt.nodes.remove(nt.nodes["Principled BSDF"])
    em = nt.nodes.new("ShaderNodeEmission"); cv = nt.nodes.new("ShaderNodeVertexColor"); cv.layer_name = "Col"
    nt.links.new(cv.outputs["Color"], em.inputs["Color"]); nt.links.new(em.outputs["Emission"], nt.nodes["Material Output"].inputs["Surface"])
    for ob in objs: ob.data.materials.clear(); ob.data.materials.append(me)
    for ob in objs:
        if ob.name.startswith("C_entree"): ob.location = (0, -60, 0)
    for nom, pos in (("C_grille", (0, -9, 0)), ("C_brasero", (3, -20, 0)), ("C_dalle", (0, 0, 0)), ("C_socle", (0, 22, 0))):
        bpy.data.objects[nom].location = pos
    bpy.data.objects["C_flamme"].location = (3, -20, 1.2); bpy.data.objects["C_epee"].location = (0, 22, 1.95); bpy.data.objects["C_epee_l"].location = (0, 22, 1.95)
    cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam")); scene.collection.objects.link(cam); scene.camera = cam; cam.data.lens = 18
    cam.location = (1.5, -26, 2.2); cam.rotation_euler = (math.radians(86), 0, math.radians(-2))
    scene.cycles.samples = 12
    scene.render.resolution_x, scene.render.resolution_y = 1100, 620
    scene.view_settings.view_transform = "Standard"
    scene.render.filepath = os.path.join(OUT, "apercu_caverne.png"); bpy.ops.render.render(write_still=True)
