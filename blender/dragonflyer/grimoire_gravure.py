# Gravure du dragon pour le grimoire : rendu Cycles en blanc + traits Freestyle, transformé en encre ensuite.
import bpy, sys, math
from mathutils import Vector
out = sys.argv[sys.argv.index("--") + 1]
sc = bpy.context.scene
blanc = bpy.data.materials.new("Blanc"); blanc.use_nodes = True
bs = blanc.node_tree.nodes["Principled BSDF"]; bs.inputs["Base Color"].default_value = (.85, .85, .85, 1); bs.inputs["Roughness"].default_value = 1
for o in bpy.data.objects:
    if o.type == "MESH":
        o.data.materials.clear(); o.data.materials.append(blanc)

from mathutils import Matrix
rig = bpy.data.objects["DragonRig"]
def tourne(nom, axe, deg):
    bpy.context.view_layer.update()
    pb = rig.pose.bones[nom]; h = pb.matrix.to_translation()
    pb.matrix = Matrix.Translation(h) @ Matrix.Rotation(math.radians(deg), 4, axe) @ Matrix.Translation(-h) @ pb.matrix
for s_, sg in (("L", 1), ("R", -1)):
    tourne("Arm." + s_, "Y", -42 * sg); tourne("Forearm." + s_, "Y", -18 * sg); tourne("F2b." + s_, "Y", -10 * sg)
for n_, d in (("Neck1", 14), ("Neck2", 10), ("Neck3", 6), ("Head", -14)): tourne(n_, "X", d)
tourne("Jaw", "X", -16)
for i, d in enumerate((6, 10, 12, 12, 10, 8, 6, 4)): tourne(f"Tail{i+1}", "Z", d)
bpy.context.view_layer.update()
lo = min((o.matrix_world @ Vector(c)).z for o in bpy.data.objects if o.type == "MESH" for c in o.bound_box)
ctr = Vector((0, 0, 0)); n = 0
for o in bpy.data.objects:
    if o.name == "Dragon":
        for c in o.bound_box: ctr += o.matrix_world @ Vector(c); n += 1
ctr /= n
sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"; sc.cycles.samples = 24; sc.render.film_transparent = True
w = bpy.data.worlds.new("W"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (.35, .35, .35, 1)
sun = bpy.data.objects.new("S", bpy.data.lights.new("S", "SUN")); sc.collection.objects.link(sun); sun.data.energy = 4; sun.rotation_euler = (math.radians(35), 0, math.radians(-40))
cam = bpy.data.objects.new("C", bpy.data.cameras.new("C")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.lens = 50
pos = ctr + Vector((-21, -27, -2.5)); cam.location = pos
cam.rotation_euler = (ctr + Vector((0, 0, 1.6)) - pos).to_track_quat("-Z", "Y").to_euler()
sc.render.resolution_x, sc.render.resolution_y = 1400, 1050
sc.render.use_freestyle = True; sc.render.line_thickness_mode = "ABSOLUTE"; sc.render.line_thickness = 1.6
ls = sc.view_layers[0].freestyle_settings.linesets[0]
ls.select_by_visibility = True; ls.select_silhouette = ls.select_border = ls.select_crease = True
ls.linestyle = ls.linestyle or bpy.data.linestyles.new("L"); ls.linestyle.color = (0, 0, 0); ls.linestyle.thickness = 2.2
sc.render.filepath = out; bpy.ops.render.render(write_still=True)
