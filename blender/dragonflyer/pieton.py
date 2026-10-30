# DragonFlyer : le jeune Viking à pied (même personnage que le cavalier, debout), avec un squelette pour marcher,
# courir et sauter (animé en code dans le jeu). Modèle, squelette et poids faits ici par le code.
# Lancer :  blender -b -P pieton.py -- <dossier_de_sortie>     Produit : pieton.glb (+ apercu_pieton.png)
import bpy, math, os, sys
import numpy as np
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import heros
from heros import SKIN, TUNIC, TUNIC2, VEST, FUR, PANTS, BOOT, BELT, BRACER, SOLE, IRON

OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "/tmp/pieton"
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
A = np.array

# ---------------------------------------------------------------- os (tête, queue, parent) ; personnage tourné vers -Y, les pieds en z = 0
BONES = {
    "Hips": (A([0, 0, .5]), A([0, 0, .7]), None),
    "Spine": (A([0, 0, .7]), A([0, 0, .88]), "Hips"),
    "Chest": (A([0, 0, .88]), A([0, 0, 1.03]), "Spine"),
    "Head": (A([0, 0, 1.03]), A([0, 0, 1.4]), "Chest"),
}
for s, sx in (("L", 1), ("R", -1)):
    BONES[f"Thigh.{s}"] = (A([sx * .1, 0, .56]), A([sx * .115, -.02, .31]), "Hips")
    BONES[f"Shin.{s}"] = (A([sx * .115, -.02, .31]), A([sx * .12, 0, .09]), f"Thigh.{s}")
    BONES[f"Foot.{s}"] = (A([sx * .12, 0, .09]), A([sx * .12, -.16, .03]), f"Shin.{s}")
    BONES[f"UpperArm.{s}"] = (A([sx * .2, 0, .95]), A([sx * .29, 0, .75]), "Chest")
    BONES[f"LowerArm.{s}"] = (A([sx * .29, 0, .75]), A([sx * .31, -.03, .55]), f"UpperArm.{s}")
    BONES[f"Hand.{s}"] = (A([sx * .31, -.03, .55]), A([sx * .31, -.05, .44]), f"LowerArm.{s}")

def poids(p, noms, sharp=4):
    ws = []
    for n in noms:
        h, t, _ = BONES[n]; d = t - h; u = min(1, max(0, (p - h) @ d / (d @ d)))
        ws.append((np.linalg.norm(p - (h + d * u)) + .01, n))
    ws.sort(); ws = ws[:3]
    raw = [(1 / dd ** sharp, n) for dd, n in ws]; tot = sum(r for r, _ in raw)
    return {n: r / tot for r, n in raw if r / tot > .03}
GROUPES = {"corps": ["Hips", "Spine", "Chest"]}
for s in "LR":
    GROUPES["jambe" + s] = ["Hips", f"Thigh.{s}", f"Shin.{s}", f"Foot.{s}"]
    GROUPES["bras" + s] = ["Chest", f"UpperArm.{s}", f"LowerArm.{s}", f"Hand.{s}"]

# ---------------------------------------------------------------- corps
M = heros.Maillage()
# buste fin d'ado : tunique aux hanches, ceinture, gilet de cuir sur la poitrine, cou
nodes = [A([0, 0, .6]), A([0, 0, .69]), A([0, 0, .8]), A([0, 0, .92]), A([0, 0, 1.02])]
radii = [.135, .13, .13, .142, .058]; cols = [TUNIC, BELT, VEST, VEST, SKIN]; tags = ["corps"] * 5
edges = [(0, 1), (1, 2), (2, 3), (3, 4)]
def chain(pts, rr, cc, start, tag):
    prev = start
    for p, r, c in zip(pts, rr, cc):
        nodes.append(A(p, float)); radii.append(r); cols.append(c); tags.append(tag); edges.append((prev, len(nodes) - 1)); prev = len(nodes) - 1
    return prev
POIGNETS = {}
for s_, sx in (("L", 1), ("R", -1)):
    chain([(sx * .09, 0, .56), (sx * .1, -.01, .43), (sx * .108, -.02, .31), (sx * .112, -.01, .2), (sx * .115, 0, .1), (sx * .115, 0, .07)],
          [.082, .075, .068, .074, .078, .07], [PANTS, PANTS, PANTS, BOOT, BOOT, BOOT], 0, "jambe" + s_)
    POIGNETS[s_] = chain([(sx * .19, 0, .95), (sx * .25, 0, .85), (sx * .28, 0, .75), (sx * .295, -.015, .65), (sx * .305, -.03, .56)],
                         [.068, .056, .046, .046, .044], [VEST, TUNIC, TUNIC, BRACER, BRACER], 3, "bras" + s_)
M.skin(scene, nodes, radii, cols, edges, tags)
for s_, sx in (("L", 1), ("R", -1)):
    a = A([sx * .115, 0, .05])
    M.ellipsoid(a + A([0, -.055, -.005]), A([.066, 0, 0]), A([0, .12, 0]), A([0, 0, .058]), BOOT, 16, 10, "jambe" + s_)   # botte
    M.ellipsoid(a + A([0, -.06, -.042]), A([.068, 0, 0]), A([0, .124, 0]), A([0, 0, .016]), SOLE, 16, 8, "jambe" + s_)
    heros.fourrure(M, [A([sx * .112 + .08 * math.cos(a), .08 * math.sin(a), .19]) for a in np.linspace(0, 2 * math.pi, 7)[:-1]], .032, "jambe" + s_, 2)   # revers de fourrure
    for z in (.27, .37): M.tube([A([sx * .108, -.015, z]), A([sx * .108, -.015, z + .018])], [.074, .074], BELT, 12, "jambe" + s_)  # lanières
    heros.main(M, nodes[POIGNETS[s_]], [0, -.15, -1], [sx, 0, 0], -sx, "poing", "bras" + s_)
# bas de tunique évasé sous la ceinture
M.tube([A([0, -.005, .67]), A([0, -.01, .58]), A([0, -.015, .48])], [.138, .155, .17], TUNIC, 20, "corps")
# ouverture du gilet : la tunique se voit devant ; col de fourrure ; boucle de ceinture
M.ellipsoid(A([0, -.105, .86]), A([.045, 0, 0]), A([0, .03, 0]), A([0, 0, .13]), TUNIC2, 12, 8, "corps")
heros.fourrure(M, [A([.11, -.04, 1.0]), A([.08, .06, 1.0]), A([0, .085, 1.0]), A([-.08, .06, 1.0]), A([-.11, -.04, 1.0]), A([-.05, -.11, .985]), A([.05, -.11, .985])], .04, "corps")
M.ellipsoid(A([0, -.128, .69]), A([.032, 0, 0]), A([0, .012, 0]), A([0, 0, .026]), IRON, 10, 6, "corps")
for sx in (1, -1):   # épaulettes de cuir
    M.ellipsoid(A([sx * .17, 0, .96]), A([.07, 0, 0]), A([0, .075, 0]), A([0, 0, .035]), VEST, 12, 8, "bras" + ("L" if sx > 0 else "R"))
piv = A([0, 0, 1.03])
H, uv, nface = heros.tete(piv)

# ---------------------------------------------------------------- armature, poids, objets
arm_d = bpy.data.armatures.new("PietonRig"); rig = bpy.data.objects.new("PietonRig", arm_d)
scene.collection.objects.link(rig); bpy.context.view_layer.objects.active = rig; rig.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")
eb = {}
for n, (h, t, par) in BONES.items():
    b = arm_d.edit_bones.new(n); b.head = Vector(h); b.tail = Vector(t); eb[n] = b
for n, (h, t, par) in BONES.items():
    if par: eb[n].parent = eb[par]
bpy.ops.object.mode_set(mode="OBJECT")
def habiller(ob, Mx, tete=False):
    gr = {n: ob.vertex_groups.new(name=n) for n in BONES}
    for i, p in enumerate(Mx.V):
        w = {"Head": 1.0} if tete else poids(np.array(p), GROUPES[Mx.T[i]])
        for n, x in w.items(): gr[n].add([i], x, "REPLACE")
    ob.parent = rig; m = ob.modifiers.new("rig", "ARMATURE"); m.object = rig
corps = heros.objet(scene, "Pieton", M, np.zeros(3)); habiller(corps, M)
tete_ob = heros.objet(scene, "PietonTete", H, np.zeros(3), uv, nface); habiller(tete_ob, H, True)
print("pieton:", len(M.V) + len(H.V), "sommets")

bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, "pieton.glb"), export_format="GLB", use_selection=True, export_skins=True,
                          export_animations=False, export_morph=False, export_yup=True, export_apply=False)

# aperçu : jambe gauche en avant, bras droit levé
scene.render.engine = "CYCLES"; scene.cycles.device = "CPU"; scene.cycles.samples = 16
world = bpy.data.worlds.new("Ciel"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (.6, .7, .9, 1)
sun = bpy.data.objects.new("Soleil", bpy.data.lights.new("Soleil", "SUN")); scene.collection.objects.link(sun); sun.data.energy = 4; sun.rotation_euler = (.7, .2, -.5)
cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam")); scene.collection.objects.link(cam); scene.camera = cam
scene.render.resolution_x, scene.render.resolution_y = 600, 700
bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode="POSE")
for pb in rig.pose.bones: pb.rotation_mode = "XYZ"
rig.pose.bones["Thigh.L"].rotation_euler = (math.radians(-30), 0, 0)
rig.pose.bones["Shin.L"].rotation_euler = (math.radians(30), 0, 0)
rig.pose.bones["Thigh.R"].rotation_euler = (math.radians(20), 0, 0)
rig.pose.bones["UpperArm.R"].rotation_euler = (math.radians(-60), 0, 0)
bpy.ops.object.mode_set(mode="OBJECT")
for nom, loc in (("apercu_pieton.png", (-1.4, -2.6, 1.2)), ("apercu_pieton_dos.png", (.9, 2.6, 1.3))):
    cam.location = loc; d = Vector((0, 0, .75)) - Vector(loc); cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler(); cam.data.lens = 40
    scene.render.filepath = os.path.join(OUT, nom); bpy.ops.render.render(write_still=True)
