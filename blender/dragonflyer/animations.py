# The Dragon Apprentice Chronicles : animations du héros et des villageois, transférées (retargeting) depuis la
# « Universal Animation Library » de Quaternius (CC0, domaine public : https://opengameart.org/content/universal-animation-library).
# On ne prend que des mouvements calmes (repos, marche, trot, course, saut, coup d'épée, parler) ; aucun personnage de la bibliothèque.
# Méthode : pour chaque os et chaque image, l'os du héros prend la même direction que l'os source ET la même torsion
# (un axe « avant » transporté par la rotation de l'os source) : les poses de repos peuvent être différentes (T-pose / bras baissés).
# Le squelette cible est refait ici exactement comme dans pieton.py (mêmes os, mêmes repos) : les pistes collent au modèle du jeu.
# Lancer : blender -b -P animations.py -- <AnimationLibrary_Godot_Standard.glb> <dossier>      Produit : animations.glb
import bpy, sys, os, math
import numpy as np
from mathutils import Vector, Matrix, Quaternion

SRC = sys.argv[sys.argv.index("--") + 1]; OUT = sys.argv[sys.argv.index("--") + 2]
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
A = np.array
# ---------------------------------------------------------------- squelette du héros (copie de pieton.py)
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
arm_d = bpy.data.armatures.new("PietonRig"); rig = bpy.data.objects.new("PietonRig", arm_d)
scene.collection.objects.link(rig); bpy.context.view_layer.objects.active = rig; rig.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")
eb = {}
for n, (h, t, par) in BONES.items():
    b = arm_d.edit_bones.new(n); b.head = Vector(h); b.tail = Vector(t); eb[n] = b
for n, (h, t, par) in BONES.items():
    if par: eb[n].parent = eb[par]
bpy.ops.object.mode_set(mode="OBJECT")

# ---------------------------------------------------------------- source
avant = set(bpy.data.objects.keys())
bpy.ops.import_scene.gltf(filepath=SRC)
src = bpy.data.objects["Rig"]
for o in list(bpy.data.objects):
    if o.name not in avant and o.type == "MESH": bpy.data.objects.remove(o)   # pas le mannequin
CORR = {"Hips": "DEF-hips", "Spine": "DEF-spine.001", "Chest": "DEF-spine.003", "Head": "DEF-head"}
for s in "LR":
    CORR.update({f"Thigh.{s}": f"DEF-thigh.{s}", f"Shin.{s}": f"DEF-shin.{s}", f"Foot.{s}": f"DEF-foot.{s}",
                 f"UpperArm.{s}": f"DEF-upper_arm.{s}", f"LowerArm.{s}": f"DEF-forearm.{s}", f"Hand.{s}": f"DEF-hand.{s}"})
CLIPS = [("repos", "Idle_Loop_Rig"), ("marche", "Walk_Loop_Rig"), ("trot", "Jog_Fwd_Loop_Rig"), ("course", "Sprint_Loop_Rig"),
         ("saut_debut", "Jump_Start_Rig"), ("saut_air", "Jump_Loop_Rig"), ("saut_fin", "Jump_Land_Rig"),
         ("epee", "Sword_Attack_Rig"), ("parle", "Idle_Talking_Loop_Rig"), ("prendre", "Interact_Rig")]
AVANT = Vector((0, -1, 0))
ECH = .5 / .917   # hauteur des hanches : héros / source

def rot3(M): return M.to_3x3().normalized()
def cadre(a, p):   # repère orthonormé : a (direction de l'os), p (axe « avant » rendu perpendiculaire)
    a = a.normalized(); p = (p - a * p.dot(a)); p = p.normalized() if p.length > 1e-5 else a.orthogonal().normalized()
    return Matrix((a, p, a.cross(p))).transposed()
# repos du héros (monde) et de la source
Rt_rest = {n: rot3(rig.matrix_world @ rig.data.bones[n].matrix_local) for n in BONES}
Dt_rest = {n: (Vector(BONES[n][1]) - Vector(BONES[n][0])).normalized() for n in BONES}
def src_rest(nom): b = src.data.bones[nom]; return rot3(src.matrix_world @ b.matrix_local), (src.matrix_world @ b.tail_local - src.matrix_world @ b.head_local).normalized()
Rs_rest = {n: src_rest(CORR[n]) for n in BONES}
hips0 = src.matrix_world @ src.data.bones["DEF-hips"].head_local
ORDRE = ["Hips", "Spine", "Chest", "Head"] + [f"{p}.{s}" for s in "LR" for p in ("Thigh", "Shin", "Foot", "UpperArm", "LowerArm", "Hand")]
fps = scene.render.fps
vitesses = {}
for nom, act_nom in CLIPS:
    act = bpy.data.actions.get(act_nom)
    if not act: print("manque", act_nom); continue
    src.animation_data_create(); src.animation_data.action = act
    f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])
    out = bpy.data.actions.new(nom); rig.animation_data_create(); rig.animation_data.action = out
    pieds = []
    for f in range(f0, f1 + 1):
        scene.frame_set(f)
        Rw = {}
        for n in ORDRE:
            pb = src.pose.bones[CORR[n]]; Mw = src.matrix_world @ pb.matrix
            Rs, ds = rot3(Mw), (src.matrix_world @ pb.tail - src.matrix_world @ pb.head).normalized()
            Rs0, ds0 = Rs_rest[n]
            delta = Rs @ Rs0.inverted()
            p_src = delta @ (AVANT - ds0 * AVANT.dot(ds0))         # l'axe « avant » de la source, emporté par l'os
            C0 = cadre(Dt_rest[n], AVANT); C1 = cadre(ds, p_src)
            Rw[n] = (C1 @ C0.transposed()) @ Rt_rest[n]
        for n in ORDRE:
            par = BONES[n][2]
            Rr = Rt_rest[n]; Rpr = Rt_rest[par] if par else Matrix.Identity(3); Rp = Rw[par] if par else Matrix.Identity(3)
            q = (Rr.inverted() @ Rpr @ Rp.inverted() @ Rw[n]).to_quaternion()
            pb = rig.pose.bones[n]; pb.rotation_mode = "QUATERNION"; pb.rotation_quaternion = q
            pb.keyframe_insert("rotation_quaternion", frame=f - f0 + 1)
        # les hanches montent, descendent et se balancent (pas d'avancée : le jeu déplace le héros)
        h = (src.matrix_world @ src.pose.bones["DEF-hips"].head - hips0) * ECH; h.y = 0
        pb = rig.pose.bones["Hips"]; pb.location = Rt_rest["Hips"].inverted() @ h; pb.keyframe_insert("location", frame=f - f0 + 1)
        pieds.append((src.matrix_world @ src.pose.bones["DEF-foot.L"].head).y - (src.matrix_world @ src.pose.bones["DEF-hips"].head).y)
    duree = (f1 - f0) / fps
    vitesses[nom] = round(2 * (max(pieds) - min(pieds)) * ECH / max(duree, 1e-3), 2)   # vitesse naturelle du cycle, à l'échelle du héros
    print("clip", nom, f1 - f0 + 1, "images", round(duree, 2), "s, vitesse", vitesses[nom])
    rig.animation_data.action = None
src.animation_data.action = None
for a in list(bpy.data.actions):   # n'exporter que nos clips
    if a.name not in dict(CLIPS): bpy.data.actions.remove(a)
bpy.data.objects.remove(src)
for a in bpy.data.actions: a.use_fake_user = True
rig["vitesses"] = vitesses
for o in scene.objects: o.select_set(o == rig)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, "animations.glb"), export_format="GLB", use_selection=True, export_animations=True,
                          export_animation_mode="ACTIONS", export_force_sampling=True, export_frame_step=1, export_yup=True, export_extras=True,
                          export_def_bones=False, export_anim_single_armature=True)
print("VITESSES", vitesses)
