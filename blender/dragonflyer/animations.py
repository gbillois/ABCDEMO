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
from squelette import BONES, semelle_monde, CONTACT   # même squelette que pieton.py
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
POINTS = {}
# Retouches calmes, clip par clip (degrés) : buste penché en avant (de plus en plus de la marche à la course),
# respiration au repos, bras en l'air qui se balancent doucement, jambes repliées en l'air.
RETOUCHE = {
    "repos": dict(souffle=3.2),
    "parle": dict(souffle=1.5),
    "marche": dict(penche=1.5, ampl=dict(jambes=.72, bras=.45, tronc=.4, tete=.3, hanches=.5)),   # marche calme : foulée courte, bras qui balancent peu
    "trot": dict(penche=8, ampl=dict(jambes=.74, bras=.7, tronc=.6, tete=.5, hanches=.6)),        # trot léger : foulée moyenne, pieds près du sol
    "course": dict(penche=17, ampl=dict(jambes=1.15, bras=1.35, tronc=1.1, tete=1.0, hanches=1.35)),  # course : foulée longue, bras amples
    "epee": dict(coup=True),
    "saut_debut": dict(penche=9),
    "saut_air": dict(penche=8, serre=.55, oscille=.12, cuisse=-28, genou=48),
    "saut_fin": dict(penche=10, genou=10, serre=.4),
}
HAUT_DU_CORPS = ["Spine", "Chest", "Head"] + [f"{p}.{s}" for s in "LR" for p in ("UpperArm", "LowerArm", "Hand")]

def rot3(M): return M.to_3x3().normalized()
def lisse_(a, b, x): t = min(1, max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t)
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
        if RT.get("coup"):           # coup d'épée : on arme (buste tourné vers la droite, bras en arrière), on frappe, on revient
            u = (f - f0) / max(1, f1 - f0)
            tw = 28 * lisse_(0, .22, u) - 62 * lisse_(.22, .4, u) + 34 * lisse_(.42, .8, u)    # degrés autour de la verticale
            Rz = Matrix.Rotation(math.radians(tw * .4), 3, "Z"); Rz2 = Matrix.Rotation(math.radians(tw * .6), 3, "Z")
            for n in HAUT_DU_CORPS: Rw[n] = Rz @ Rw[n]
            for n in HAUT_DU_CORPS[1:]: Rw[n] = Rz2 @ Rw[n]
            Rw["Head"] = Matrix.Rotation(math.radians(-tw * .7), 3, "Z") @ Rw["Head"]                 # le regard reste sur la cible
            lev = 35 * lisse_(0, .22, u) * (1 - lisse_(.3, .45, u))                                  # le bras droit s'arme vers le haut
            for n in ("UpperArm.R", "LowerArm.R", "Hand.R"): Rw[n] = Matrix.Rotation(math.radians(lev), 3, "Y") @ Rw[n]
            bas = 55 * lisse_(.36, .72, u)                                                           # puis redescend tout de suite le long du corps
            for n in ("UpperArm.R", "LowerArm.R", "Hand.R"): Rw[n] = Matrix.Rotation(math.radians(-bas), 3, "Y") @ Rw[n]
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
        # les hanches montent, descendent et se balancent (pas d'avancée moyenne : le jeu déplace le héros)
        h = (src.matrix_world @ src.pose.bones[HANCHES].head - hips0) * ECH   # le balancement avant/arrière des hanches est gardé : sans lui, le pied posé glisse (le corps avance par à-coups)
        pb = rig.pose.bones["Hips"]; pb.location = Rt_rest["Hips"].inverted() @ h; pb.keyframe_insert("location", frame=f - f0 + 1)
        pieds.append((src.matrix_world @ src.pose.bones["foot.l"].head).y - (src.matrix_world @ src.pose.bones[HANCHES].head).y)
    if nom == "repos":   # contrôle : plus grand saut d'orientation d'une image à l'autre, os par os (en degrés)
        sauts = {}
        for fc in out.fcurves:
            if "rotation_quaternion" not in fc.data_path: continue
            b = fc.data_path.split('"')[1]; k = [p.co[1] for p in fc.keyframe_points]
            sauts[b] = max(sauts.get(b, 0), max(abs(k[i + 1] - k[i]) for i in range(len(k) - 1)))
        print("sauts repos", {b: round(v, 3) for b, v in sorted(sauts.items(), key=lambda x: -x[1])[:6]})
    if RT.get("ampl"):   # amplitude réduite : chaque os se rapproche de sa pose moyenne sur le clip
        A_ = RT["ampl"]
        def groupe(b): return "jambes" if b.startswith(("Thigh", "Shin", "Foot")) else "bras" if b.startswith(("UpperArm", "LowerArm", "Hand")) else "tete" if b == "Head" else "tronc"
        for b in BONES:
            fcs = [out.fcurves.find(f'pose.bones["{b}"].rotation_quaternion', index=i) for i in range(4)]
            if not all(fcs): continue
            Q = [Quaternion([fc.keyframe_points[k].co[1] for fc in fcs]) for k in range(len(fcs[0].keyframe_points))]
            for q in Q[1:]:
                if q.dot(Q[0]) < 0: q.negate()
            m = Quaternion((sum(q.w for q in Q), sum(q.x for q in Q), sum(q.y for q in Q), sum(q.z for q in Q))).normalized()
            for k, q in enumerate(Q):
                d = m.inverted() @ q; r = m @ Quaternion(d.axis, d.angle * A_[groupe(b)]) if d.angle > 1e-6 else q
                for i, fc in enumerate(fcs): fc.keyframe_points[k].co[1] = r[i]
        for i in range(3):
            fc = out.fcurves.find('pose.bones["Hips"].location', index=i)
            if fc:
                mo = sum(p.co[1] for p in fc.keyframe_points) / len(fc.keyframe_points)
                for p in fc.keyframe_points: p.co[1] = mo + (p.co[1] - mo) * A_["hanches"]
        for fc in out.fcurves: fc.update()
    for fc in out.fcurves:   # entre deux images, interpolation linéaire, comme dans le jeu (three.js) : pas de dépassement
        for kp in fc.keyframe_points: kp.interpolation = "LINEAR"
    # Trois passes « pieds au sol », sur la pose déjà retouchée :
    #  1) pied d'appui à plat : le transfert penchait le pied (pointe enfoncée de 6 cm, talon qui se relevait au milieu
    #     de l'appui). Un pied est d'appui s'il est le plus bas des deux (à 2,5 cm près) et sa cheville basse ;
    #  2) pieds verrouillés (marche, trot, course) : nos jambes n'ont pas les proportions de la source, le pied posé
    #     avançait par à-coups par rapport au corps. Pendant chaque appui, la cheville suit une droite à vitesse
    #     constante (vitesse médiane des appuis) ; une IK à deux os (cuisse, tibia) l'y amène, la pose est cuite ;
    #  3) bassin à la bonne hauteur : le point le plus bas de la semelle au niveau du sol (toujours pour les clips
    #     posés, seulement s'il s'enfonce pour les clips avec une phase en l'air).
    SOL = {"repos": "colle", "parle": "colle", "prendre": "colle", "epee": "colle", "marche": "colle", "trot": "pas_dessous", "course": "pas_dessous",
           "saut_fin": "colle", "saut_debut": "pas_dessous"}
    N = f1 - f0 + 1
    def eval_pieds():
        global POINTS
        bas, cheville, POINTS = {s_: [] for s_ in "LR"}, {s_: [] for s_ in "LR"}, {s_: [] for s_ in "LR"}
        for fr in range(1, N + 1):
            scene.frame_set(fr)
            for s_ in "LR":
                P = {k: v.copy() for k, v in semelle_monde(rig, s_).items()}; POINTS[s_].append(P)
                bas[s_].append(min(p.z for p in P.values()))
                cheville[s_].append((rig.matrix_world @ rig.pose.bones[f"Shin.{s_}"].tail).copy())
        return bas, cheville
    def appui(bas, cheville):
        zc = {s_: min(c.z for c in cheville[s_]) for s_ in "LR"}
        return {s_: [bas[s_][k] < min(bas["L"][k], bas["R"][k]) + .025 and cheville[s_][k].z < zc[s_] + .06 for k in range(N)] for s_ in "LR"}
    if nom in SOL:
        bas, cheville = eval_pieds(); ap = appui(bas, cheville)
        for fr in range(1, N + 1):
            scene.frame_set(fr)
            for s_ in "LR":
                k = fr - 1; w = 1.0 if ap[s_][k] else .5 if (ap[s_][(k + 1) % N] or (nom != "marche" and ap[s_][k - 1])) else 0.0
                pb = rig.pose.bones[f"Foot.{s_}"]
                if w > 0:
                    q = pb.matrix.to_quaternion().slerp(pb.bone.matrix_local.to_quaternion(), w)
                    pb.matrix = Matrix.Translation(pb.matrix.to_translation()) @ q.to_matrix().to_4x4(); bpy.context.view_layer.update()
                elif nom == "marche":   # pied qui passe : la pointe se relève (elle dégage le sol au lieu de le racler)
                    t_ = pb.matrix.to_translation()
                    pb.matrix = Matrix.Translation(t_) @ Matrix.Rotation(math.radians(-22), 4, "X") @ Matrix.Translation(-t_) @ pb.matrix; bpy.context.view_layer.update()
                pb.keyframe_insert("rotation_quaternion", frame=fr)
        for fc in out.fcurves: fc.update()
    if nom in SOL:   # (les clips sur place sont verrouillés aussi, à vitesse nulle : le pied d'appui ne glisse pas pendant un geste)
        bas, cheville = eval_pieds(); appuis = {}; pentes = []
        L_ = N - 1                                   # la dernière image du clip répète la première (boucle)
        ap = {s_: v[:L_] for s_, v in appui(bas, cheville).items()}
        for s_ in "LR":
            iv, cur = [], []
            for k, o in enumerate(ap[s_]):
                if o: cur.append(k)
                elif cur: iv.append(cur); cur = []
            if cur: iv.append(cur)
            if nom in ("marche", "trot", "course", "repos", "parle") and len(iv) > 1 and iv[0][0] == 0 and iv[-1][-1] == L_ - 1:   # appui à cheval sur la boucle : on le recoud
                iv[0] = [k - L_ for k in iv.pop()] + iv[0]
            appuis[s_] = [x for x in iv if len(x) >= 3]
            for x in appuis[s_]: pentes.append((cheville[s_][x[-1] % L_].y - cheville[s_][x[0] % L_].y) / ((x[-1] - x[0]) / fps))
        if pentes:
            vp = sorted(pentes)[len(pentes) // 2] if nom in ("marche", "trot", "course") else 0.0
            bpy.context.view_layer.objects.active = rig; cibles = {}
            for s_ in "LR":
                e = bpy.data.objects.new(f"cible{s_}", None); scene.collection.objects.link(e); cibles[s_] = e
                c = rig.pose.bones[f"Shin.{s_}"].constraints.new("IK"); c.target = e; c.chain_count = 2; c.use_tail = True; c.influence = 0
                infl = [0.0] * L_; pos = [cheville[s_][k].copy() for k in range(L_)]
                for x in appuis[s_]:
                    km = (x[0] + x[-1]) / 2; ym = sum(cheville[s_][k % L_].y for k in x) / len(x)
                    if nom == "marche":   # marche : verrou plein sur tout l'appui, relâché doucement après
                        for k in x: pos[k % L_].y = ym + vp * (k - km) / fps; infl[k % L_] = 1.0
                        for dk, w_ in ((1, .4), (2, .1), (-1, .7)):   # et une image avant (le talon se pose entre deux images)
                            k = x[-1] + dk if dk > 0 else x[0] + dk
                            if infl[k % L_] == 0: pos[k % L_].y = ym + vp * (k - km) / fps; infl[k % L_] = w_
                    else:                 # trot, course : appuis courts, verrou en fondu aux deux bouts de l'appui
                        for jj, k in enumerate(x): pos[k % L_].y = ym + vp * (k - km) / fps; infl[k % L_] = min(1.0, (jj + 1) / 2, (len(x) - jj) / 2)
                for k in range(N):
                    e.location = pos[k % L_]; e.keyframe_insert("location", frame=k + 1)
                    c.influence = infl[k % L_]; c.keyframe_insert("influence", frame=k + 1)
            rig.select_set(True); bpy.ops.object.mode_set(mode="POSE"); bpy.ops.pose.select_all(action="SELECT")
            bpy.ops.nla.bake(frame_start=1, frame_end=N, only_selected=True, visual_keying=True, clear_constraints=True,
                             use_current_action=True, bake_types={"POSE"})
            bpy.ops.object.mode_set(mode="OBJECT")
            for e in cibles.values(): bpy.data.objects.remove(e)
            for pb in rig.pose.bones: pb.rotation_mode = "QUATERNION"
            print("  appuis verrouillés", {s_: [len(x) for x in appuis[s_]] for s_ in "LR"}, "vitesse des appuis", round(vp, 2))
    if nom in SOL:
        hb = rig.pose.bones["Hips"]; Rh = Rt_rest["Hips"].inverted()
        for fr in range(1, N + 1):
            scene.frame_set(fr)
            b_ = min(p.z for s_ in "LR" for p in semelle_monde(rig, s_).values())
            dz = -b_ if SOL[nom] == "colle" else max(0, -b_)
            hb.location = hb.location + Rh @ Vector((0, 0, dz)); hb.keyframe_insert("location", frame=fr)
        for fc in out.fcurves: fc.update()
    for fc in out.fcurves:
        for kp in fc.keyframe_points: kp.interpolation = "LINEAR"
    # vitesse naturelle mesurée sur NOTRE squelette : un point de la semelle (talon, plante, bout) qui touche le sol
    # (< 2 cm) ne doit pas bouger tant qu'il le touche ; on retient la vitesse qui rend la plus petite la pire dérive
    # d'un point posé (le roulé talon → plante → bout n'est donc pas compté, un vrai glissement l'est).
    duree = (f1 - f0) / fps; segs, cours = [], {}
    for k in range(int((f1 - f0) * 4) + 1):
        fr = 1 + k / 4; scene.frame_set(int(fr), subframe=fr - int(fr)); t = k / 4 / fps
        for s_ in "LR":
            for nom_p, p in semelle_monde(rig, s_).items():
                cle = (s_, nom_p)
                if p.z < CONTACT: cours.setdefault(cle, []).append((t, p.y, cle))
                elif cle in cours: segs.append(cours.pop(cle))
    segs += list(cours.values())
    segs = [[(t, y) for t, y, _ in sg] + [] for sg in segs] if segs and len(segs[0][0]) == 3 else segs
    def derive(v): return max((max(abs((y - v * t) - (sg[0][1] - v * sg[0][0])) for t, y in sg) for sg in segs if len(sg) > 1), default=0)
    if nom in ("marche", "trot", "course") and segs:
        v0 = min((x / 100 for x in range(10, 700)), key=derive); vitesses[nom] = round(v0, 2)
        print("  appuis", len(segs), "vitesse retenue", vitesses[nom], "dérive", round(derive(v0) * 100, 1), "cm")
        pire = max((sg for sg in segs if len(sg) > 1), key=lambda sg: max(abs((y - v0 * t) - (sg[0][1] - v0 * sg[0][0])) for t, y in sg))
        print("  pire appui : de", round(pire[0][0] * fps, 2), "à", round(pire[-1][0] * fps, 2), "images,", len(pire), "mesures")
    else: vitesses[nom] = round(2 * (max(pieds) - min(pieds)) * ECH / max(duree, 1e-3), 2)
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
