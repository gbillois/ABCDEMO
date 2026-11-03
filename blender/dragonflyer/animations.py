# The Dragon Apprentice Chronicles : animations du héros et des villageois, transférées (retargeting) depuis
# « KayKit : Character Animations 1.1 » de Kay Lousberg (CC0, domaine public : https://kaylousberg.itch.io/kaykit-character-animations),
# squelette « Rig_Medium » : des personnages trapus de dessin animé, proches des proportions du héros (bras courts, grosse tête).
# On ne prend que des mouvements calmes (repos, marche, trot, course, saut, coup d'épée, parler) ; aucun personnage de la bibliothèque.
# Méthode : pour chaque os et chaque image, l'os du héros prend la même direction que l'os source ET la même torsion
# (un axe « avant » transporté par la rotation de l'os source) : les poses de repos peuvent être différentes (T-pose / bras baissés).
# Le squelette cible est refait ici exactement comme dans pieton.py (mêmes os, mêmes repos) : les pistes collent au modèle du jeu.
# Lancer : blender -b -P animations.py -- <dossier Animations/gltf/Rig_Medium de KayKit> <dossier>      Produit : animations.glb
import bpy, sys, os, math
import numpy as np
from mathutils import Vector, Matrix, Quaternion

SRC = sys.argv[sys.argv.index("--") + 1]; OUT = sys.argv[sys.argv.index("--") + 2]
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
A = np.array
# ---------------------------------------------------------------- squelette du héros (copie de pieton.py)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from squelette import BONES   # même squelette que pieton.py
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
for f in ("Rig_Medium_MovementBasic.glb", "Rig_Medium_General.glb", "Rig_Medium_CombatMelee.glb"):
    bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, f))
src = next(o for o in bpy.data.objects if o.type == "ARMATURE" and o.name not in avant)
for o in list(bpy.data.objects):
    if o.name not in avant and o != src: bpy.data.objects.remove(o)   # un seul squelette source, aucun maillage
CORR = {"Hips": "hips", "Spine": "spine", "Chest": "chest", "Head": "head"}
for s, k in (("L", "l"), ("R", "r")):
    CORR.update({f"Thigh.{s}": f"upperleg.{k}", f"Shin.{s}": f"lowerleg.{k}", f"Foot.{s}": f"foot.{k}",
                 f"UpperArm.{s}": f"upperarm.{k}", f"LowerArm.{s}": f"lowerarm.{k}", f"Hand.{s}": f"hand.{k}"})
CLIPS = [("repos", "Idle_A"), ("marche", "Walking_A"), ("trot", "Running_B"), ("course", "Running_A"),
         ("saut_debut", "Jump_Start"), ("saut_air", "Jump_Idle"), ("saut_fin", "Jump_Land"),
         ("epee", "Melee_1H_Attack_Slice_Horizontal"), ("parle", "Idle_B"), ("prendre", "PickUp")]
AVANT = Vector((0, -1, 0))
HAUT = Vector((0, 0, 1))
# référence de torsion : l'axe « avant », sauf pour les os qui pointent déjà vers l'avant (les pieds) : là, l'axe vertical.
# (un axe presque parallèle à l'os donne un repère instable qui bascule d'une image à l'autre : le pied vibrait au repos)
REF = {n: (HAUT if n.startswith("Foot") else AVANT) for n in BONES}
HANCHES = "hips"
SERRE = {"repos": .2, "parle": .15, "marche": .5, "trot": .55, "course": .5, "saut_debut": .3, "saut_air": .25, "saut_fin": .3, "epee": 0, "prendre": .2}   # radians
ECH = .5 / .406   # hauteur des hanches : héros / source
# Retouches calmes, clip par clip (degrés) : buste penché en avant (de plus en plus de la marche à la course),
# respiration au repos, bras en l'air qui se balancent doucement, jambes repliées en l'air.
RETOUCHE = {
    "repos": dict(souffle=2.2),
    "parle": dict(souffle=1.5),
    "marche": dict(penche=2),
    "trot": dict(penche=7),
    "course": dict(penche=13),
    "saut_debut": dict(penche=9),
    "saut_air": dict(penche=8, serre=.55, oscille=.12, cuisse=-28, genou=48),
    "saut_fin": dict(penche=10, genou=10, serre=.4),
}
HAUT_DU_CORPS = ["Spine", "Chest", "Head"] + [f"{p}.{s}" for s in "LR" for p in ("UpperArm", "LowerArm", "Hand")]

def rot3(M): return M.to_3x3().normalized()
def cadre(a, p):   # repère orthonormé : a (direction de l'os), p (axe « avant » rendu perpendiculaire)
    a = a.normalized(); p = (p - a * p.dot(a)); p = p.normalized() if p.length > 1e-5 else a.orthogonal().normalized()
    return Matrix((a, p, a.cross(p))).transposed()
# repos du héros (monde) et de la source
Rt_rest = {n: rot3(rig.matrix_world @ rig.data.bones[n].matrix_local) for n in BONES}
Dt_rest = {n: (Vector(BONES[n][1]) - Vector(BONES[n][0])).normalized() for n in BONES}
def src_rest(nom): b = src.data.bones[nom]; return rot3(src.matrix_world @ b.matrix_local), (src.matrix_world @ b.tail_local - src.matrix_world @ b.head_local).normalized()
Rs_rest = {n: src_rest(CORR[n]) for n in BONES}
hips0 = src.matrix_world @ src.data.bones[HANCHES].head_local
ORDRE = ["Hips", "Spine", "Chest", "Head"] + [f"{p}.{s}" for s in "LR" for p in ("Thigh", "Shin", "Foot", "UpperArm", "LowerArm", "Hand")]
fps = scene.render.fps
vitesses = {}
for nom, act_nom in CLIPS:
    act = next((a for a in sorted(bpy.data.actions, key=lambda a: a.name) if a.name.startswith(act_nom + "_Rig_Medium")), None)
    if not act: print("manque", act_nom); continue
    src.animation_data_create(); src.animation_data.action = act
    f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])
    out = bpy.data.actions.new(nom); rig.animation_data_create(); rig.animation_data.action = out
    pieds = []
    for f in range(f0, f1 + 1):
        scene.frame_set(f)
        Rw = {}; RT = RETOUCHE.get(nom, {}); tc = 2 * math.pi * (f - f0) / max(1, f1 - f0)   # tc : un tour par clip (boucle)
        for n in ORDRE:
            pb = src.pose.bones[CORR[n]]; Mw = src.matrix_world @ pb.matrix
            Rs, ds = rot3(Mw), (src.matrix_world @ pb.tail - src.matrix_world @ pb.head).normalized()
            Rs0, ds0 = Rs_rest[n]
            delta = Rs @ Rs0.inverted()
            ref = REF[n]                                             # axe de référence stable pour la torsion de cet os
            p_src = delta @ (ref - ds0 * ref.dot(ds0))               # l'axe de référence de la source, emporté par l'os
            C0 = cadre(Dt_rest[n], ref); C1 = cadre(ds, p_src)
            Rw[n] = (C1 @ C0.transposed()) @ Rt_rest[n]
            if "Arm" in n or n.startswith("Hand"):   # bras ramenés le long du corps (toute la chaîne tourne ensemble autour de l'axe avant)
                sx = 1 if n.endswith("L") else -1
                serre = SERRE.get(nom, .3) + RT.get("serre", 0) + sx * RT.get("oscille", 0) * math.sin(tc)
                Rw[n] = Matrix.Rotation(sx * serre, 3, "Y") @ Rw[n]
        R_ = lambda deg: Matrix.Rotation(math.radians(deg), 3, "X")
        if RT.get("penche"):          # tout le haut du corps penche en avant ; la tête se redresse à moitié (regard devant)
            for n in HAUT_DU_CORPS: Rw[n] = R_(RT["penche"]) @ Rw[n]
            Rw["Head"] = R_(-RT["penche"] * .5) @ Rw["Head"]
        if RT.get("souffle"):         # respiration : la poitrine se soulève et revient (la tête reste stable)
            k = RT["souffle"] * math.sin(tc)
            for n in HAUT_DU_CORPS[1:]: Rw[n] = R_(-k) @ Rw[n]
            Rw["Head"] = R_(k * .8) @ Rw["Head"]
        for s_ in "LR":               # jambes repliées en l'air, genoux fléchis à la réception
            if RT.get("cuisse"):
                for n in (f"Thigh.{s_}", f"Shin.{s_}", f"Foot.{s_}"): Rw[n] = R_(RT["cuisse"]) @ Rw[n]
            if RT.get("genou"):
                for n in (f"Shin.{s_}", f"Foot.{s_}"): Rw[n] = R_(RT["genou"]) @ Rw[n]
                Rw[f"Foot.{s_}"] = R_(-RT["genou"] * .6) @ Rw[f"Foot.{s_}"]
        for n in ORDRE:
            par = BONES[n][2]
            Rr = Rt_rest[n]; Rpr = Rt_rest[par] if par else Matrix.Identity(3); Rp = Rw[par] if par else Matrix.Identity(3)
            q = (Rr.inverted() @ Rpr @ Rp.inverted() @ Rw[n]).to_quaternion()
            pb = rig.pose.bones[n]; pb.rotation_mode = "QUATERNION"; pb.rotation_quaternion = q
            pb.keyframe_insert("rotation_quaternion", frame=f - f0 + 1)
        # les hanches montent, descendent et se balancent (pas d'avancée : le jeu déplace le héros)
        h = (src.matrix_world @ src.pose.bones[HANCHES].head - hips0) * ECH; h.y = 0
        pb = rig.pose.bones["Hips"]; pb.location = Rt_rest["Hips"].inverted() @ h; pb.keyframe_insert("location", frame=f - f0 + 1)
        pieds.append((src.matrix_world @ src.pose.bones["foot.l"].head).y - (src.matrix_world @ src.pose.bones[HANCHES].head).y)
    if nom == "repos":   # contrôle : plus grand saut d'orientation d'une image à l'autre, os par os (en degrés)
        sauts = {}
        for fc in out.fcurves:
            if "rotation_quaternion" not in fc.data_path: continue
            b = fc.data_path.split('"')[1]; k = [p.co[1] for p in fc.keyframe_points]
            sauts[b] = max(sauts.get(b, 0), max(abs(k[i + 1] - k[i]) for i in range(len(k) - 1)))
        print("sauts repos", {b: round(v, 3) for b, v in sorted(sauts.items(), key=lambda x: -x[1])[:6]})
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
