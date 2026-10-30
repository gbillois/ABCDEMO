# The Dragon Apprentice Chronicles : kit de paysage fait en Blender par script.
# Rochers (3), arche et tour en ruine, menhir, épave, barque retournée, bois flotté ; pour les champs : touffe de blé,
# chou, touffe de fleurs. Même style que le village (formes chanfreinées, couleurs × occlusion cuite).
# Propriété exportée : « pied » = [largeur, profondeur] pour les collisions à pied.
# Lancer : blender -b -P paysages.py -- <dossier>      Produit : paysages.glb (+ apercu_paysages.png)
import bpy, bmesh, math, random, os, sys
import numpy as np
from mathutils import Vector, Matrix

OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "/tmp/paysages"
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
R = random.Random(11)
def lin(h):
    h = h.lstrip("#"); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4 for x in c)
def varie(c, k=.08): f = 1 + R.uniform(-k, k); return tuple(min(1, x * f) for x in c)
ROC, ROC2, MOUSSE, PIERRE, BOIS, BOIS_F, BOIS_G = lin("#8a8680"), lin("#6e6a64"), lin("#5e7a3a"), lin("#a8a094"), lin("#6a4a30"), lin("#3e2a1c"), lin("#9a9286")
BLE, BLE2, CHOU, CHOU2, TIGE = lin("#e0b850"), lin("#c89a38"), lin("#7aa84a"), lin("#a8c870"), lin("#6a8a3a")

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
    def objet(s, props=None, lisse=False):
        me = bpy.data.meshes.new(s.nom); s.bm.normal_update(); s.bm.to_mesh(me); s.bm.free()
        for p in me.polygons: p.use_smooth = lisse
        ob = bpy.data.objects.new(s.nom, me); scene.collection.objects.link(ob)
        for k, v in (props or {}).items(): ob[k] = v
        return ob

def rocher(nom, taille, ech, mousse=True):
    P = Piece(nom)
    vs = P.sphere((0, 0, taille * ech[2] * .55), taille, ROC, ech, sub=2, jit=taille * .12)
    for v in vs:   # facettes de roche, mousse sur le dessus
        n = v.co.z / (taille * ech[2] * 1.4)
        v[P.col] = (*varie(MOUSSE if (mousse and n > .75 + R.uniform(-.1, .1)) else R.choice([ROC, ROC2, ROC]), .08), 1)
    for _ in range(3): P.sphere((R.uniform(-1, 1) * taille * .8, R.uniform(-1, 1) * taille * .8, taille * .2), taille * .35, ROC2, (1, 1, .7), sub=1, jit=taille * .06)
    return P.objet({"pied": [taille * ech[0] * 1.8, taille * ech[1] * 1.8]})

def arche():
    P = Piece("D_arche")
    for sx in (-1, 1):
        for i, z in enumerate(np.arange(.3, 4.6, .55)):
            if sx > 0 and z > 3.5: continue   # un pilier cassé
            P.boite((sx * 2.0, R.uniform(-.05, .05), z), (1.0, 1.0, .55), varie(R.choice([PIERRE, ROC, PIERRE]), .1), rz=R.uniform(-.06, .06), bev=.07, jit=.03)
    for k in range(7):   # voûte (en partie effondrée)
        a = math.pi * (k + .5) / 9
        if k > 5: continue
        P.boite((-math.cos(a) * 2.0, 0, 4.7 + math.sin(a) * 1.6), (.9, 1.0, .55), varie(PIERRE, .1), ry=-a + math.pi / 2, bev=.07, jit=.03)
    for _ in range(6): P.boite((R.uniform(-3, 4), R.uniform(-2, 2), .25), (R.uniform(.5, .9), R.uniform(.5, .9), .5), varie(PIERRE, .1), rz=R.uniform(0, 3), bev=.07, jit=.04)
    for _ in range(10): P.sphere((R.uniform(-2.5, 2.5), R.uniform(-.6, .6), R.uniform(.5, 4)), .25, varie(MOUSSE, .15), (1, 1, .5), sub=1, jit=.05)
    return P.objet({"pied": [5.2, 1.4]})

def tour():
    P = Piece("D_tour")
    for i, z in enumerate(np.arange(.3, 9.0, .6)):
        n = 16
        for k in range(n):
            a = k / n * math.tau + (i % 2) * math.pi / n
            haut_max = 9.0 - 4.5 * (.5 + .5 * math.cos(a - 1.0))   # le haut est éboulé d'un côté
            if z > haut_max: continue
            if (k in (4, 5) and z < 2.4) or (k == 12 and 4 < z < 5.5): continue   # porte et fenêtre
            P.boite((math.cos(a) * 3.0, math.sin(a) * 3.0, z), (1.25, .8, .6), varie(R.choice([PIERRE, ROC, PIERRE]), .1), rz=a + math.pi / 2, bev=.07, jit=.03)
    for _ in range(14): P.boite((R.uniform(-5, 5), R.uniform(-5, 5), .3), (R.uniform(.5, 1), R.uniform(.5, 1), .55), varie(PIERRE, .1), rz=R.uniform(0, 3), bev=.07, jit=.04)
    for _ in range(14): P.sphere((math.cos(t := R.uniform(0, 6.28)) * 3.1, math.sin(t) * 3.1, R.uniform(.3, 6)), .35, varie(MOUSSE, .15), (1, 1, .6), sub=1, jit=.06)
    return P.objet({"pied": [6.6, 6.6]})

def menhir():
    P = Piece("D_menhir")
    P.boite((0, 0, 1.6), (1.1, .7, 3.6), varie(ROC2, .05), bev=.18, jit=.08)
    for z in (.6, 1.4, 2.2): P.boite((0, -.36, z), (.5, .05, .12), lin("#4a6a8a"), bev=0)   # runes gravées (bleutées)
    P.sphere((.3, .1, 3.2), .35, MOUSSE, (1, 1, .5), sub=1, jit=.05)
    return P.objet({"pied": [1.3, .9]})

def epave():   # navire viking échoué, couché sur le flanc : membrures en arc autour de la quille, quelques bordages
    P = Piece("D_epave"); ax = Vector((0, 0, 1.6))
    for i in range(10):
        y = -6.3 + i * 1.4; L = 2.6 - abs(i - 4.5) * .22
        if i in (2, 7): continue   # membrures cassées
        for k in range(7):
            a = -.25 + k / 6 * 2.3
            if i % 3 == 0 and k > 4: continue
            P.boite((math.cos(a) * L, y, 1.6 - math.sin(a) * L * .9 + .3), (.22, .28, L * .5), varie(BOIS_G, .1), ry=math.pi / 2 - a, bev=.03)
    P.cyl((L0 := 2.6, -7.2, .35), (2.6, 7.2, .35), .3, .26, BOIS_G, n=8)   # quille
    for k in (0, 1, 4):   # bordages restants
        a = -.25 + k / 6 * 2.3
        for i in range(3): P.boite((math.cos(a) * 2.75, -3 + i * 2.3 + R.uniform(-.3, .3), 1.9 - math.sin(a) * 2.4 + .3), (.12, 2.2, .45), varie(BOIS_G, .1), ry=math.pi / 2 - a, bev=.02)
    P.cyl((0, 6.6, .4), (.3, 8.0, 3.2), .25, .12, BOIS_G, n=8)   # étrave relevée
    P.sphere((.3, 8.1, 3.3), .3, BOIS_F, (1, 1, 1.4), sub=1)
    P.cyl((-1.0, 1, .4), (-3.5, 2.5, 3.5), .18, .14, BOIS_G, n=8)   # mât cassé
    return P.objet({"pied": [6, 15]})

def barque():
    P = Piece("D_barque")
    for i in range(7):
        y = -2.1 + i * .7; w = 1.0 - abs(i - 3) * .15
        P.boite((0, y, .55), (w * 1.6, .72, .12), varie(lin("#4a6a8a"), .06), bev=.03)
        for s in (-1, 1): P.boite((s * w * .78, y, .3), (.1, .72, .5), varie(lin("#4a6a8a"), .06), bev=.02)
    P.boite((0, 0, .66), (.12, 4.6, .08), BOIS_F)
    return P.objet({"pied": [1.8, 4.4]})

def bois_flotte():
    P = Piece("D_bois")
    P.cyl((-1.8, 0, .25), (1.8, .4, .3), .22, .16, lin("#b8ab98"), n=8, jit=.03)
    P.cyl((.6, .2, .3), (1.4, 1.1, .5), .1, .05, lin("#b8ab98"), n=6)
    P.cyl((-1.0, -.1, .25), (-1.6, -.9, .45), .09, .04, lin("#b8ab98"), n=6)
    return P.objet({"pied": [3.6, .8]})

def ble():   # touffe de blé (instanciée par milliers dans les champs)
    P = Piece("C_ble")
    for k in range(9):
        a = R.uniform(0, 6.28); d = R.uniform(0, .18); x, y = math.cos(a) * d, math.sin(a) * d; h = R.uniform(.85, 1.05)
        P.cyl((x, y, 0), (x + R.uniform(-.06, .06), y + R.uniform(-.06, .06), h), .012, .008, varie(BLE2, .1), n=4)
        P.sphere((x, y, h + .06), .035, varie(BLE, .1), (1, 1, 2.8), sub=1)
    return P.objet(lisse=True)

def chou():
    P = Piece("C_chou")
    P.sphere((0, 0, .18), .17, CHOU2, (1, 1, .9), sub=2)
    for k in range(7):
        a = k / 7 * 6.28; P.sphere((math.cos(a) * .17, math.sin(a) * .17, .13), .13, varie(CHOU, .1), (1.2, .6, .5), sub=1)
    return P.objet(lisse=True)

def fleurs():
    P = Piece("C_fleurs")
    col = R.choice([lin("#e8d040"), lin("#d84a6a"), lin("#f0f0f0"), lin("#8a6ad8")])
    for k in range(7):
        a = R.uniform(0, 6.28); d = R.uniform(0, .25); x, y = math.cos(a) * d, math.sin(a) * d; h = R.uniform(.2, .4)
        P.cyl((x, y, 0), (x, y, h), .01, .008, TIGE, n=4)
        for j in range(5): b = j / 5 * 6.28; P.sphere((x + math.cos(b) * .035, y + math.sin(b) * .035, h), .03, col, (1, 1, .4), sub=1)
        P.sphere((x, y, h + .01), .022, lin("#e8a020"), sub=1)
    return P.objet(lisse=True)

objs = [rocher("D_rocher1", 1.0, (1.2, 1, .8)), rocher("D_rocher2", 1.6, (1, 1.3, .9)), rocher("D_rocher3", .6, (1, 1, 1), mousse=False),
        arche(), tour(), menhir(), epave(), barque(), bois_flotte(), ble(), chou(), fleurs()]

# occlusion cuite
scene.render.engine = "CYCLES"; scene.cycles.device = "CPU"; scene.cycles.samples = 48
sol = bpy.data.objects.new("Sol", bpy.data.meshes.new("Sol")); scene.collection.objects.link(sol)
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=30); bm.to_mesh(sol.data); bm.free()
mat = bpy.data.materials.new("Bake"); mat.use_nodes = True
for ob in objs:
    ob.data.materials.append(mat)
    ao = ob.data.color_attributes.new("AO", "FLOAT_COLOR", "POINT"); ob.data.color_attributes.active_color = ao
    for o in scene.objects: o.select_set(False)
    ob.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")
    a = np.zeros(len(ob.data.vertices) * 4, np.float32); ao.data.foreach_get("color", a)
    c = np.zeros_like(a); ob.data.color_attributes["Col"].data.foreach_get("color", c)
    a = a.reshape(-1, 4); c = c.reshape(-1, 4); c[:, :3] *= .4 + .6 * a[:, :1] ** .8
    ob.data.color_attributes["Col"].data.foreach_set("color", c.ravel())
    ob.data.color_attributes.remove(ob.data.color_attributes["AO"]); ob.data.color_attributes.active_color = ob.data.color_attributes["Col"]
    ob.data.materials.clear()
bpy.data.objects.remove(sol)
mv = bpy.data.materials.new("Paysage"); mv.use_nodes = True
ca = mv.node_tree.nodes.new("ShaderNodeVertexColor"); ca.layer_name = "Col"; mv.node_tree.links.new(ca.outputs["Color"], mv.node_tree.nodes["Principled BSDF"].inputs["Base Color"])
for ob in objs: ob.data.materials.append(mv)
for o in scene.objects: o.select_set(o in objs)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, "paysages.glb"), export_format="GLB", use_selection=True, export_extras=True, export_yup=True)

# aperçu
w = bpy.data.worlds.new("Ciel"); scene.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (.6, .7, .85, 1)
sun = bpy.data.objects.new("S", bpy.data.lights.new("S", "SUN")); scene.collection.objects.link(sun); sun.data.energy = 3.5; sun.rotation_euler = (.8, .2, -.6)
xs = 0
for ob in objs: ob.location.x = xs; xs += max(ob.dimensions.x, 1.0) + 1.5
g = bpy.data.objects.new("G", bpy.data.meshes.new("G")); scene.collection.objects.link(g)
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=120); bm.to_mesh(g.data); bm.free()
mg = bpy.data.materials.new("H"); mg.use_nodes = True; mg.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (.25, .4, .15, 1); g.data.materials.append(mg)
cam = bpy.data.objects.new("C", bpy.data.cameras.new("C")); scene.collection.objects.link(cam); scene.camera = cam; cam.data.lens = 30
cam.location = (xs / 2, -32, 12); cam.rotation_euler = (Vector((xs / 2, 0, 2)) - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.render.resolution_x, scene.render.resolution_y = 1500, 600; scene.cycles.samples = 32
scene.render.filepath = os.path.join(OUT, "apercu_paysages.png"); bpy.ops.render.render(write_still=True)
