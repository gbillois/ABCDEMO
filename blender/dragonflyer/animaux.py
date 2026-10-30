# The Dragon Apprentice Chronicles : animaux de la ferme et de la forêt (mouton, chèvre, poule, cerf, vache).
# Style « jouet » chanfreiné comme le village ; couleurs par sommet × occlusion cuite.
# L'attribut « _TAG » (lu « _tag » par three.js) marque les parties animées par le jeu (vertex shader, un seul dessin par espèce) :
#   1.0 corps, 0.1 tête (broute), 0.2 patte avant gauche, 0.4 avant droite, 0.6 arrière gauche, 0.8 arrière droite.
# Propriétés exportées : « hanche » = hauteur des articulations des pattes, « cou » = [y, z] du pivot de la tête (repère Blender).
# Lancer : blender -b -P animaux.py -- <dossier>      Produit : animaux.glb (+ apercu_animaux.png)
import bpy, bmesh, math, random, os, sys
import numpy as np
from mathutils import Vector, Matrix

OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "/tmp/animaux"
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
R = random.Random(3)
def lin(h):
    h = h.lstrip("#"); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4 for x in c)
CORPS, TETE, PFG, PFD, PAG, PAD = 1.0, .1, .2, .4, .6, .8

class Piece:
    def __init__(s, nom): s.nom = nom; s.bm = bmesh.new(); s.col = s.bm.verts.layers.float_color.new("Col")
    def _fin(s, vs, c, tag, jit=0.0):
        for v in vs:
            v[s.col] = (*c, tag)
            if jit: v.co += Vector((R.uniform(-jit, jit), R.uniform(-jit, jit), R.uniform(-jit, jit)))
    def sphere(s, c, r, col, ech=(1, 1, 1), tag=CORPS, sub=2, jit=0.0):
        M = Matrix.Translation(Vector(c)) @ Matrix.Diagonal((*ech, 1))
        vs = bmesh.ops.create_icosphere(s.bm, subdivisions=sub, radius=r, matrix=M)["verts"]; s._fin(vs, col, tag, jit); return vs
    def boite(s, c, t, col, tag=CORPS, rx=0.0, bev=.02):
        M = Matrix.Translation(Vector(c)) @ Matrix.Rotation(rx, 4, "X") @ Matrix.Diagonal((*t, 1))
        vs = bmesh.ops.create_cube(s.bm, size=1, matrix=M)["verts"]; s._fin(vs, col, tag)
        if bev:
            st = set(vs); r = bmesh.ops.bevel(s.bm, geom=[e for e in s.bm.edges if e.verts[0] in st and e.verts[1] in st], offset=bev, segments=1, affect="EDGES")
            for v in r["verts"]: v[s.col] = (*col, tag)
        return vs
    def cyl(s, a, b, r1, r2, col, tag=CORPS, n=8):
        a, b = Vector(a), Vector(b); d = b - a
        M = Matrix.Translation((a + b) / 2) @ d.to_track_quat("Z", "Y").to_matrix().to_4x4()
        vs = bmesh.ops.create_cone(s.bm, cap_ends=True, segments=n, radius1=r1, radius2=r2, depth=d.length, matrix=M)["verts"]; s._fin(vs, col, tag); return vs
    def objet(s, props):
        me = bpy.data.meshes.new(s.nom); s.bm.normal_update(); s.bm.to_mesh(me); s.bm.free()
        for p in me.polygons: p.use_smooth = True
        ob = bpy.data.objects.new(s.nom, me); scene.collection.objects.link(ob)
        for k, v in props.items(): ob[k] = v
        return ob

def pattes(P, x, yA, yB, haut, r, col, sabot):
    for (px, py, tag) in ((x, yA, PFG), (-x, yA, PFD), (x, yB, PAG), (-x, yB, PAD)):
        P.cyl((px, py, haut), (px, py, .06), r, r * .8, col, tag)
        P.cyl((px, py, .08), (px, py, 0), r * .85, r * .9, sabot, tag)

def mouton():
    P = Piece("A_mouton"); LAINE, NOIR, OS = lin("#f2ece0"), lin("#2a2624"), lin("#1a1816")
    for i in range(26):   # toison en boules
        a = R.uniform(0, math.tau); b = R.uniform(-.9, .9)
        P.sphere((math.cos(a) * .28 * math.sqrt(1 - b * b), b * .5, .78 + math.sin(a) * .2 * math.sqrt(1 - b * b)), .2, LAINE, sub=1, jit=.02)
    P.sphere((0, 0, .78), .36, LAINE, (1, 1.45, .85), sub=2)
    P.sphere((0, -.66, .9), .15, NOIR, (1, 1.3, 1.05), TETE, sub=2)
    for s in (-1, 1): P.sphere((s * .13, -.6, .98), .07, NOIR, (1.6, .5, .6), TETE, sub=1)
    P.sphere((0, -.56, 1.0), .12, LAINE, (1.1, .9, .7), TETE, sub=1, jit=.01)
    for s in (-1, 1): P.sphere((s * .06, -.79, .95), .022, lin("#f4f0e0"), tag=TETE, sub=1)
    pattes(P, .17, -.34, .34, .52, .06, NOIR, OS)
    P.sphere((0, .55, .8), .09, LAINE, sub=1)
    return P.objet({"hanche": .52, "cou": [-.5, .85]})

def chevre():
    P = Piece("A_chevre"); POIL, POIL2, CORNE, SAB = lin("#d8cbb4"), lin("#8a6a4a"), lin("#4a4038"), lin("#2a2420")
    P.sphere((0, 0, .8), .3, POIL, (1, 1.55, .9), sub=2)
    P.sphere((0, .05, .9), .25, POIL2, (1.05, 1.1, .5), sub=1)
    P.cyl((0, -.38, .9), (0, -.55, 1.1), .12, .1, POIL, TETE)
    P.sphere((0, -.66, 1.12), .13, POIL, (1, 1.5, .95), TETE, sub=2)
    for s in (-1, 1):
        P.cyl((s * .05, -.62, 1.22), (s * .1, -.5, 1.42), .035, .01, CORNE, TETE, n=6)
        P.sphere((s * .13, -.6, 1.16), .06, POIL2, (1.5, .5, .6), TETE, sub=1)
    P.cyl((0, -.76, 1.02), (0, -.74, .88), .04, .01, POIL2, TETE, n=6)   # barbiche
    pattes(P, .15, -.32, .32, .55, .05, POIL2, SAB)
    P.cyl((0, .45, .92), (0, .55, 1.05), .05, .02, POIL2, n=6)
    return P.objet({"hanche": .55, "cou": [-.45, .95]})

def poule():
    P = Piece("A_poule"); PLUME, PLUME2, CRETE, BEC, PATTE = lin("#c8743a"), lin("#7a3a1a"), lin("#d8281a"), lin("#e8b030"), lin("#e8a830")
    P.sphere((0, 0, .26), .14, PLUME, (1, 1.25, 1), sub=2)
    P.sphere((0, .12, .34), .09, PLUME2, (.8, 1, 1.4), sub=1)   # queue
    P.sphere((0, -.13, .42), .075, PLUME, tag=TETE, sub=2)
    P.cyl((0, -.19, .42), (0, -.25, .4), .025, .005, BEC, TETE, n=6)
    for i in range(3): P.sphere((0, -.13 + i * .03, .5 + (i == 1) * .015), .025, CRETE, tag=TETE, sub=1)
    P.sphere((0, -.18, .37), .02, CRETE, tag=TETE, sub=1)
    for s in (-1, 1): P.sphere((s * .11, .0, .27), .07, PLUME2, (.4, 1.2, .8), sub=1)
    for (px, tag) in ((.05, PFG), (-.05, PFD)): P.cyl((px, 0, .15), (px, -.02, 0), .012, .012, PATTE, tag, n=5)
    return P.objet({"hanche": .15, "cou": [-.1, .35]})

def cerf():
    P = Piece("A_cerf"); ROUX, CLAIR, BOIS, SAB = lin("#9a5a2e"), lin("#e8d8bc"), lin("#c8b48a"), lin("#2a2018")
    P.sphere((0, 0, 1.15), .34, ROUX, (1, 1.9, 1), sub=2)
    P.sphere((0, .1, 1.02), .28, CLAIR, (.9, 1.5, .55), sub=1)
    P.cyl((0, -.5, 1.25), (0, -.78, 1.65), .17, .12, ROUX, TETE)
    P.sphere((0, -.86, 1.72), .14, ROUX, (1, 1.6, 1), TETE, sub=2)
    P.sphere((0, -1.05, 1.68), .06, lin("#2a2018"), tag=TETE, sub=1)
    for s in (-1, 1):
        P.sphere((s * .12, -.78, 1.85), .08, ROUX, (1.6, .5, .8), TETE, sub=1)
        a = Vector((s * .06, -.82, 1.84)); b = a + Vector((s * .16, .05, .35))
        P.cyl(a, b, .03, .022, BOIS, TETE, n=6); P.cyl(b, b + Vector((s * .12, .12, .22)), .022, .01, BOIS, TETE, n=6); P.cyl(b, b + Vector((s * .02, -.14, .2)), .02, .008, BOIS, TETE, n=6)
    pattes(P, .2, -.45, .45, .85, .065, ROUX, SAB)
    P.sphere((0, .66, 1.25), .08, CLAIR, sub=1)
    return P.objet({"hanche": .85, "cou": [-.6, 1.3]})

def vache():
    P = Piece("A_vache"); BLANC, TACHE, MUSEAU, SAB = lin("#f0ece4"), lin("#3a2a22"), lin("#e8b0a0"), lin("#2a2420")
    P.sphere((0, 0, 1.0), .5, BLANC, (1, 1.75, .85), sub=2)
    for (x, y, z, r) in ((.3, .2, 1.15, .25), (-.32, -.3, 1.0, .22), (.1, .55, 1.25, .18)): P.sphere((x, y, z), r, TACHE, (.5, 1, .8), sub=1)
    P.sphere((0, -.95, 1.1), .24, BLANC, (1, 1.2, 1), TETE, sub=2)
    P.sphere((0, -1.15, 1.02), .17, MUSEAU, (1.1, .8, .8), TETE, sub=1)
    for s in (-1, 1): P.cyl((s * .14, -.9, 1.3), (s * .32, -.85, 1.42), .04, .015, lin("#e8dcc0"), TETE, n=6); P.sphere((s * .26, -.88, 1.22), .08, TACHE, (1.5, .5, .7), TETE, sub=1)
    pattes(P, .28, -.55, .55, .75, .09, BLANC, SAB)
    P.cyl((0, .85, 1.2), (0, .9, .7), .03, .02, BLANC, n=6)
    return P.objet({"hanche": .75, "cou": [-.75, 1.15]})

objs = [mouton(), chevre(), poule(), cerf(), vache()]

# occlusion cuite dans les couleurs (le canal alpha, qui marque les parties, est gardé)
scene.render.engine = "CYCLES"; scene.cycles.device = "CPU"; scene.cycles.samples = 48
sol = bpy.data.objects.new("Sol", bpy.data.meshes.new("Sol")); scene.collection.objects.link(sol)
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=10); bm.to_mesh(sol.data); bm.free()
mat = bpy.data.materials.new("Bake"); mat.use_nodes = True
for ob in objs:
    ob.data.materials.append(mat)
    ao = ob.data.color_attributes.new("AO", "FLOAT_COLOR", "POINT"); ob.data.color_attributes.active_color = ao
    for o in scene.objects: o.select_set(False)
    ob.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")
    a = np.zeros(len(ob.data.vertices) * 4, np.float32); ao.data.foreach_get("color", a)
    c = np.zeros_like(a); ob.data.color_attributes["Col"].data.foreach_get("color", c)
    a = a.reshape(-1, 4); c = c.reshape(-1, 4); c[:, :3] *= .45 + .55 * a[:, :1]
    tg = ob.data.attributes.new("_TAG", "FLOAT", "POINT"); tg.data.foreach_set("value", c[:, 3].copy()); c[:, 3] = 1
    ob.data.color_attributes["Col"].data.foreach_set("color", c.ravel())
    ob.data.color_attributes.remove(ob.data.color_attributes["AO"]); ob.data.color_attributes.active_color = ob.data.color_attributes["Col"]
    ob.data.materials.clear()
bpy.data.objects.remove(sol)
mv = bpy.data.materials.new("Animal"); mv.use_nodes = True
ca = mv.node_tree.nodes.new("ShaderNodeVertexColor"); ca.layer_name = "Col"; mv.node_tree.links.new(ca.outputs["Color"], mv.node_tree.nodes["Principled BSDF"].inputs["Base Color"])
for ob in objs: ob.data.materials.append(mv)
for o in scene.objects: o.select_set(o in objs)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, "animaux.glb"), export_format="GLB", use_selection=True, export_extras=True, export_yup=True, export_attributes=True)

# aperçu
w = bpy.data.worlds.new("Ciel"); scene.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (.6, .7, .85, 1)
sun = bpy.data.objects.new("S", bpy.data.lights.new("S", "SUN")); scene.collection.objects.link(sun); sun.data.energy = 3.5; sun.rotation_euler = (.8, .2, -.6)
for i, ob in enumerate(objs): ob.location.x = i * 2.2 - 4.4
g = bpy.data.objects.new("G", bpy.data.meshes.new("G")); scene.collection.objects.link(g)
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=30); bm.to_mesh(g.data); bm.free()
mg = bpy.data.materials.new("H"); mg.use_nodes = True; mg.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (.25, .4, .15, 1); g.data.materials.append(mg)
cam = bpy.data.objects.new("C", bpy.data.cameras.new("C")); scene.collection.objects.link(cam); scene.camera = cam; cam.data.lens = 40
cam.location = (2, -9, 3.2); cam.rotation_euler = (Vector((0, 0, .8)) - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.render.resolution_x, scene.render.resolution_y = 1200, 500; scene.cycles.samples = 32
scene.render.filepath = os.path.join(OUT, "apercu_animaux.png"); bpy.ops.render.render(write_still=True)
