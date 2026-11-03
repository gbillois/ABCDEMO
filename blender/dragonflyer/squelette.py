# Squelette commun du héros et des villageois (pieton.py) et des animations (animations.py) : les deux doivent être identiques.
# Proportions inspirées des personnages KayKit : hanches et épaules larges, bras et jambes écartés du corps.
import numpy as np
A = np.array
EPAULE, HANCHE = .055, .035   # décalage vers l'extérieur des bras et des jambes par rapport au premier modèle (plus fin)
BONES = {
    "Hips": (A([0, 0, .5]), A([0, 0, .7]), None),
    "Spine": (A([0, 0, .7]), A([0, 0, .88]), "Hips"),
    "Chest": (A([0, 0, .88]), A([0, 0, 1.03]), "Spine"),
    "Head": (A([0, 0, 1.03]), A([0, 0, 1.4]), "Chest"),
}
for s, sx in (("L", 1), ("R", -1)):
    j, b = sx * HANCHE, sx * EPAULE
    BONES[f"Thigh.{s}"] = (A([sx * .1 + j, 0, .56]), A([sx * .115 + j, -.02, .31]), "Hips")
    BONES[f"Shin.{s}"] = (A([sx * .115 + j, -.02, .31]), A([sx * .12 + j, 0, .09]), f"Thigh.{s}")
    BONES[f"Foot.{s}"] = (A([sx * .12 + j, 0, .09]), A([sx * .12 + j, -.16, .03]), f"Shin.{s}")
    BONES[f"UpperArm.{s}"] = (A([sx * .2 + b, 0, .95]), A([sx * .29 + b, 0, .75]), "Chest")
    BONES[f"LowerArm.{s}"] = (A([sx * .29 + b, 0, .75]), A([sx * .31 + b, -.03, .55]), f"UpperArm.{s}")
    BONES[f"Hand.{s}"] = (A([sx * .31 + b, -.03, .55]), A([sx * .31 + b, -.05, .44]), f"LowerArm.{s}")

# Points du dessous de la botte (repos, mêmes formes que personnages/heros.py) : talon, plante, bout.
# Un point « touche » le sol sous 2 cm. Sert à animations.py (vitesse des clips) et au banc d'apercu.py (repères, glissement).
SEMELLE = {"talon": A([0, .07, 0.0]), "plante": A([0, -.1, 0.0]), "bout": A([0, -.16, .015])}
CONTACT = .02
def semelle_monde(rig, cote):
    """Points de la semelle du pied « L » ou « R » dans le monde, pour la pose courante du squelette Blender rig."""
    from mathutils import Vector
    pb = rig.pose.bones[f"Foot.{cote}"]; R = rig.matrix_world.to_3x3() @ pb.matrix.to_3x3() @ pb.bone.matrix_local.to_3x3().inverted()
    h0 = BONES[f"Foot.{cote}"][0]; hw = rig.matrix_world @ pb.head
    return {k: hw + R @ Vector(tuple(p + A([h0[0], 0, 0]) - h0)) for k, p in SEMELLE.items()}
