# Planches de contrôle d'un personnage de DragonFlyer (toujours les mêmes caméras, pour comparer d'un tour à l'autre) :
#  a) 12 vues au repos (tour complet, gros plans du visage, vue du jeu de dos en hauteur, vue de loin) ;
#  b) postures : chaque articulation pliée à ses limites (cou, épaules, coudes, poignets, colonne, hanches, genoux,
#     chevilles) et poses extrêmes (accroupi, bras levés, torsion) ;
#  c) animations du jeu (animations.glb) en images fixes régulières, de côté et de face, le personnage avançant à la
#     vitesse du clip sur un sol quadrillé (un pied posé doit rester immobile sur le quadrillage).
# Le personnage est relu depuis son .glb (ce que le jeu reçoit), pas depuis la scène qui l'a fabriqué.
# Lancer : blender -b -P apercu.py -- <personnage.glb> <dossier> <a|b|c|abc> [animations.glb (non compressé)]
# Rendus Cycles CPU, petite taille, débruités ; planches assemblées par planche.py (python3 + PIL).
import bpy, math, os, sys, json, subprocess
from mathutils import Vector, Matrix
ICI = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, ICI)
import materiaux as MAT

arg = sys.argv[sys.argv.index("--") + 1:]
GLB, OUT, QUOI = arg[0], arg[1], arg[2] if len(arg) > 2 else "abc"
ANIM = arg[3] if len(arg) > 3 else None
os.makedirs(OUT, exist_ok=True)
TAILLE, ECH = 480, 20

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=GLB)
rig = next(o for o in scene.objects if o.type == "ARMATURE")
corps = [o for o in scene.objects if o.type == "MESH" and o.parent == rig]
for o in [o for o in scene.objects if o.type == "MESH" and o not in corps]: bpy.data.objects.remove(o)
mat = bpy.data.materials.new("Rendu"); mat.use_nodes = True; nt = mat.node_tree
bs = nt.nodes["Principled BSDF"]; vc = nt.nodes.new("ShaderNodeVertexColor")
vc.layer_name = corps[0].data.color_attributes[0].name
nt.links.new(vc.outputs["Color"], bs.inputs["Base Color"]); bs.inputs["Roughness"].default_value = MAT.RUGOSITE
bs.inputs["Subsurface Weight"].default_value = .0
for o in corps:
    o.data.materials.clear(); o.data.materials.append(mat)

# ---------------------------------------------------------------- lumière, ciel, sol
scene.render.engine = "CYCLES"; scene.cycles.device = "CPU"; scene.cycles.samples = ECH
scene.cycles.use_denoising = True
try: scene.cycles.denoiser = "OPENIMAGEDENOISE"
except Exception: pass
scene.render.resolution_x = scene.render.resolution_y = TAILLE; scene.render.film_transparent = False
scene.view_settings.view_transform = "AgX"; scene.view_settings.look = "AgX - Base Contrast"
w = bpy.data.worlds.new("Ciel"); scene.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (.62, .74, .92, 1); w.node_tree.nodes["Background"].inputs[1].default_value = .9
sun = bpy.data.objects.new("Soleil", bpy.data.lights.new("Soleil", "SUN")); scene.collection.objects.link(sun)
sun.data.energy = 3.2; sun.data.angle = .12; sun.data.color = (1, .93, .82); sun.rotation_euler = (math.radians(50), 0, math.radians(-35))
sol_me = bpy.data.meshes.new("Sol"); sol = bpy.data.objects.new("Sol", sol_me); scene.collection.objects.link(sol)
import bmesh
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=12); bm.to_mesh(sol_me); bm.free()
ms = bpy.data.materials.new("Sol"); ms.use_nodes = True; n2 = ms.node_tree
ck = n2.nodes.new("ShaderNodeTexChecker"); ck.inputs["Scale"].default_value = 24 * 2.5   # carreaux de 20 cm (sol de 24 m)
ck.inputs["Color1"].default_value = (.52, .58, .42, 1); ck.inputs["Color2"].default_value = (.46, .52, .37, 1)
tc = n2.nodes.new("ShaderNodeTexCoord"); n2.links.new(tc.outputs["UV"], ck.inputs["Vector"])
n2.links.new(ck.outputs["Color"], n2.nodes["Principled BSDF"].inputs["Base Color"]); n2.nodes["Principled BSDF"].inputs["Roughness"].default_value = .95
sol_me.uv_layers.new(); sol_me.materials.append(ms)
cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam")); scene.collection.objects.link(cam); scene.camera = cam

def viser(pos, cible, lens=50):
    cam.location = Vector(pos); d = Vector(cible) - Vector(pos)
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler(); cam.data.lens = lens

def rendre(chemin):
    scene.render.filepath = chemin; bpy.ops.render.render(write_still=True); return chemin

def planche(titre, cases, nom, colonnes=4):
    man = os.path.join(OUT, nom + ".json")
    json.dump({"titre": titre, "colonnes": colonnes, "cases": cases}, open(man, "w"))
    subprocess.run(["python3", os.path.join(ICI, "planche.py"), man, os.path.join(OUT, nom + ".png")], check=False)

# ---------------------------------------------------------------- poses (rotation autour d'un axe du monde, au pivot de l'os)
bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode="POSE")
for pb in rig.pose.bones: pb.rotation_mode = "QUATERNION"
AX = {"X": Vector((1, 0, 0)), "Y": Vector((0, 1, 0)), "Z": Vector((0, 0, 1))}
def remise():
    rig.animation_data_clear() if rig.animation_data else None
    for pb in rig.pose.bones: pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0); pb.scale = (1, 1, 1)
    bpy.context.view_layer.update()
def tourner(nom, axe, deg):
    pb = rig.pose.bones[nom]; Mc = pb.matrix.copy(); h = Mc.to_translation()
    R = Matrix.Rotation(math.radians(deg), 4, AX[axe] if isinstance(axe, str) else Vector(axe))
    pb.matrix = Matrix.Translation(h) @ R @ Matrix.Translation(-h) @ Mc; bpy.context.view_layer.update()
def deplacer(nom, v):
    pb = rig.pose.bones[nom]; Mc = pb.matrix.copy(); pb.matrix = Matrix.Translation(Vector(v)) @ Mc; bpy.context.view_layer.update()
def poser(ops):
    remise()
    for op in ops:
        if op[0] == "dep": deplacer(op[1], op[2])
        else: tourner(*op)

# ---------------------------------------------------------------- a) 12 vues au repos
VUES = []
for k, nom in enumerate(["face", "3/4 avant gauche", "profil gauche", "3/4 arrière gauche", "dos", "3/4 arrière droit", "profil droit", "3/4 avant droit"]):
    a = math.radians(45 * k); VUES.append((nom, (2.7 * math.sin(a), -2.7 * math.cos(a), 1.0), (0, 0, .74), 50))
VUES += [("visage de face", (0, -1.05, 1.27), (0, -.02, 1.24), 55), ("visage 3/4", (.72, -.82, 1.33), (0, -.02, 1.24), 55),
         ("vue du jeu (dos, en hauteur)", (1.4, 3.4, 2.4), (0, 0, .8), 40), ("de loin (8 m)", (-3.2, -7.4, 2.6), (0, 0, .7), 50)]
if "a" in QUOI:
    remise(); cases = []
    for k, (nom, pos, cib, lens) in enumerate(VUES):
        viser(pos, cib, lens); cases.append({"image": rendre(os.path.join(OUT, f"a_{k + 1:02d}.png")), "legende": nom})
    planche("Planche A : 12 vues au repos (A-pose du squelette, sol en carreaux de 20 cm)", cases, "planche_a")

# ---------------------------------------------------------------- b) postures et articulations
F34, PROFIL, DOS34 = ((1.5, -2.2, 1.15), (0, 0, .72), 45), ((2.65, -.15, 1.0), (0, 0, .72), 45), ((1.4, 2.3, 1.2), (0, 0, .72), 45)
HAUT = ((1.5, -2.3, 1.6), (0, 0, .82), 42)
POSES = [
    ("cou : penché en avant 30°", PROFIL, [("Head", "X", 30)]),
    ("cou : tête en arrière 25°", PROFIL, [("Head", "X", -25)]),
    ("cou : tournée 70°", F34, [("Head", "Z", 70)]),
    ("cou : inclinée 30°", F34, [("Head", "Y", 30)]),
    ("épaules : bras levés 150° (côté)", F34, [("UpperArm.L", "Y", -126), ("UpperArm.R", "Y", 126)]),
    ("épaules : bras en avant 90° / en arrière 45°", PROFIL, [("UpperArm.L", "X", -90), ("UpperArm.R", "X", 45)]),
    ("épaules : bras à l'horizontale (T)", F34, [("UpperArm.L", "Y", -66), ("UpperArm.R", "Y", 66)]),
    ("épaules : bras ramenés devant (mains qui se rejoignent)", F34, [("UpperArm.L", "X", -60), ("UpperArm.L", "Z", -22), ("LowerArm.L", "X", -35), ("UpperArm.R", "X", -55), ("UpperArm.R", "Z", 22), ("LowerArm.R", "X", -35)]),
    ("coudes : pliés 140° / 90°", F34, [("LowerArm.L", "X", -140), ("UpperArm.R", "X", -30), ("LowerArm.R", "X", -90)]),
    ("poignets : pliés 70° / relevés 60°, avant-bras tourné 80°", F34, [("LowerArm.L", "X", -60), ("Hand.L", "Y", 70), ("LowerArm.R", "X", -60), ("LowerArm.R", (.1, -.3, -.95), 80), ("Hand.R", "Y", 60)]),
    ("colonne : penché en avant 45°", PROFIL, [("Spine", "X", 22), ("Chest", "X", 23)]),
    ("colonne : cambré 25°", PROFIL, [("Spine", "X", -12), ("Chest", "X", -13)]),
    ("colonne : torsion 50°", HAUT, [("Spine", "Z", 25), ("Chest", "Z", 25)]),
    ("colonne : penché sur le côté 30°", F34, [("Spine", "Y", 15), ("Chest", "Y", 15)]),
    ("hanches : jambe en avant 90° / en arrière 35°", PROFIL, [("Thigh.L", "X", -90), ("Thigh.R", "X", 35)]),
    ("hanches : écart 45° de chaque côté", F34, [("Thigh.L", "Y", -45), ("Thigh.R", "Y", 45)]),
    ("genoux : pliés 130° / talon aux fesses", PROFIL, [("Thigh.L", "X", -60), ("Shin.L", "X", 130), ("Shin.R", "X", 120)]),
    ("chevilles : pointe relevée 30° / tendue 40°", PROFIL, [("Foot.L", "X", -30), ("Foot.R", "X", 40), ("Thigh.R", "X", 20)]),
    ("accroupi", F34, [("dep", "Hips", (0, .08, -.33)), ("Spine", "X", 22), ("Chest", "X", 12), ("Head", "X", -20),
                        ("Thigh.L", "X", -110), ("Thigh.L", "Z", -14), ("Shin.L", "X", 128), ("Foot.L", "X", -18),
                        ("Thigh.R", "X", -110), ("Thigh.R", "Z", 14), ("Shin.R", "X", 128), ("Foot.R", "X", -18),
                        ("UpperArm.L", "X", -55), ("LowerArm.L", "X", -40), ("UpperArm.R", "X", -55), ("LowerArm.R", "X", -40)]),
    ("accroupi (de côté)", PROFIL, "accroupi"),
    ("bras levés, victoire", F34, [("UpperArm.L", "Y", -140), ("LowerArm.L", "Y", -20), ("UpperArm.R", "Y", 140), ("LowerArm.R", "Y", 20), ("Head", "X", -15), ("Chest", "X", -8)]),
    ("torsion et grand pas", HAUT, [("Spine", "Z", 25), ("Chest", "Z", 25), ("Thigh.L", "X", -45), ("Shin.L", "X", 40), ("Thigh.R", "X", 30), ("Shin.R", "X", 30),
                                    ("UpperArm.L", "X", 50), ("UpperArm.R", "X", -60), ("LowerArm.R", "X", -70)]),
    ("course extrême", PROFIL, [("dep", "Hips", (0, 0, -.04)), ("Spine", "X", 15), ("Thigh.L", "X", -75), ("Shin.L", "X", 100), ("Thigh.R", "X", 40), ("Shin.R", "X", 85), ("Foot.R", "X", 30),
                                ("UpperArm.L", "X", 60), ("LowerArm.L", "X", -80), ("UpperArm.R", "X", -60), ("LowerArm.R", "X", -100)]),
    ("dos : bras levés 150°", DOS34, [("UpperArm.L", "Y", -126), ("UpperArm.R", "Y", 126)]),
]
if "b" in QUOI:
    cases = []; deja = {}
    for k, (nom, (pos, cib, lens), ops) in enumerate(POSES):
        if isinstance(ops, str): ops = deja[ops]
        deja[nom] = ops; poser(ops); viser(pos, cib, lens)
        cases.append({"image": rendre(os.path.join(OUT, f"b_{k + 1:02d}.png")), "legende": nom})
    remise(); planche("Planche B : articulations à leurs limites et poses extrêmes", cases, "planche_b")

# ---------------------------------------------------------------- c) animations
if "c" in QUOI and ANIM:
    avant = set(scene.objects)
    bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.import_scene.gltf(filepath=ANIM)
    src = next(o for o in scene.objects if o not in avant and o.type == "ARMATURE")
    vit = dict(src.get("vitesses", {})) if src.get("vitesses") else {}
    for o in [o for o in scene.objects if o not in avant]: bpy.data.objects.remove(o)
    acts = {a.name.rsplit("_PietonRig", 1)[0]: a for a in bpy.data.actions}
    ORDRE = [n for n in ("repos", "marche", "trot", "course", "saut_debut", "saut_air", "saut_fin", "epee", "parle", "prendre") if n in acts]
    ORDRE_TOUS = list(ORDRE)
    if os.environ.get("APERCU_CLIPS"): ORDRE = [n for n in ORDRE if n in os.environ["APERCU_CLIPS"].split(",")]   # essai rapide
    scene.render.resolution_x = scene.render.resolution_y = 320; scene.cycles.samples = 16
    rig.animation_data_create(); fps = scene.render.fps
    # épée dans la main droite pour le clip « epee » : poignée en travers du poing (axe du pouce), garde juste au-dessus
    # du pouce, lame de 65 cm × 3,2 cm dans le prolongement ; la géométrie est recalculée à chaque image dans le monde
    sys.path.insert(0, os.path.dirname(ICI)); from squelette import BONES
    Wr0, Ht0 = Vector(BONES["Hand.R"][0]), Vector(BONES["Hand.R"][1])
    f0_ = (Ht0 - Wr0).normalized(); n0_ = (Vector((1, 0, 0)) - f0_ * f0_.x).normalized(); th0_ = f0_.cross(n0_).normalized()
    def boite(y0, y1, lx, lz, pointe=False):
        V = [(sx * lx, y, sz * lz) for y in (y0, y1) for sx in (-1, 1) for sz in (-1, 1)]
        if pointe: V[4:] = [(0, y1, 0)] * 4
        return V, [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    PIECES = [(boite(.0, .58, .016, .005), 0), (boite(.58, .65, .016, .005, True), 0), (boite(.0, .6, .019, .0035), 3), (boite(-.018, .018, .075, .02), 1),
              (boite(-.15, -.018, .014, .014), 2), (boite(-.18, -.15, .024, .024), 1)]
    COULS = [(.52, .56, .62, 1), (.85, .6, .2, 1), (.3, .16, .08, 1), (.08, .07, .07, 1)]   # acier bleuté, laiton, cuir, liseré sombre
    me_e = bpy.data.meshes.new("Epee"); epee = bpy.data.objects.new("Epee", me_e); scene.collection.objects.link(epee)
    for c in COULS:
        m = bpy.data.materials.new("epee"); m.use_nodes = True; b_ = m.node_tree.nodes["Principled BSDF"]
        b_.inputs["Base Color"].default_value = c; b_.inputs["Metallic"].default_value = .5 if c == COULS[0] else 0; me_e.materials.append(m)
    epee.hide_render = True
    def placer_epee():
        bpy.context.view_layer.update()
        pb = rig.pose.bones["Hand.R"]; R = rig.matrix_world.to_3x3() @ pb.matrix.to_3x3() @ pb.bone.matrix_local.to_3x3().inverted()
        W_ = rig.matrix_world @ pb.head; f, n, th = R @ f0_, R @ n0_, R @ th0_
        poing = W_ + f * .095 + n * .022                       # centre du poing fermé (main ×1,36)
        X, Z = n, f                                            # largeur de la lame dans le plan de la main
        V, F, Mi = [], [], []
        for (pv, pf), mi in PIECES:
            o = len(V); V += [poing + th * (y + .06) + X * x + Z * z for x, y, z in pv]; F += [[o + k for k in fc] for fc in pf]; Mi += [mi] * len(pf)
        me_e.clear_geometry(); me_e.from_pydata([tuple(v) for v in V], [], F); me_e.update()
        for poly, mi in zip(me_e.polygons, Mi): poly.material_index = mi
    # repères au sol : un grand disque opaque sous le milieu de la semelle de chaque pied posé (rouge = gauche,
    # bleu = droit), fixe dans le monde et gardé pour les images suivantes ; un pied qui ne glisse pas reste dessus
    def mat_vif(nom, coul):
        m = bpy.data.materials.new(nom); m.use_nodes = True; b_ = m.node_tree.nodes["Principled BSDF"]
        b_.inputs["Base Color"].default_value = coul; b_.inputs["Emission Color"].default_value = coul; b_.inputs["Emission Strength"].default_value = .6
        return m
    MAT_REP = {"L": mat_vif("repL", (1, .05, .02, 1)), "R": mat_vif("repR", (.02, .25, 1, 1))}
    def disque(pos, s_):
        bpy.ops.mesh.primitive_cylinder_add(radius=.055, depth=.006, location=(pos.x, pos.y, .003)); o = bpy.context.active_object
        o.data.materials.append(MAT_REP[s_]); return o
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -6, .001)); ligne = bpy.context.active_object
    ligne.scale = (.018, 24, .002); ligne.data.materials.append(mat_vif("ligne", (1, .85, .1, 1)))
    for k in range(-24, 25):   # traits tous les 50 cm
        bpy.ops.mesh.primitive_cube_add(size=1, location=(0, k * .5, .0012)); t_ = bpy.context.active_object
        t_.scale = (.5, .012, .002); t_.data.materials.append(MAT_REP["L"].copy()); t_.data.materials[0].node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (1, 1, 1, 1)
        t_.data.materials[0].node_tree.nodes["Principled BSDF"].inputs["Emission Color"].default_value = (1, 1, 1, 1)
    from squelette import semelle_monde, CONTACT
    def contact(s_):
        """Points de la semelle (talon, plante, bout) qui touchent vraiment le sol (< 2 cm), et leur milieu (ou None)."""
        P = semelle_monde(rig, s_); T = [p for p in P.values() if p.z < CONTACT]
        return (sum(T, Vector()) / len(T)) if T else None, {k: p for k, p in P.items() if p.z < CONTACT}
    # mesure du glissement (4 positions par image), même mesure que animations.py : un point de semelle qui touche le
    # sol ne doit pas bouger tant qu'il le touche (le roulé talon → plante → bout n'est pas compté, un glissement l'est).
    # On écrit aussi, pour chaque clip, les images où chaque pied touche le sol.
    rapport = []
    for nom in ORDRE_TOUS:
        act = acts[nom]; rig.animation_data.action = act; f0, f1 = act.frame_range
        v = vit.get(nom, 0) if nom in ("marche", "trot", "course") else 0; pose, pire, imgs = {}, 0, {"L": [], "R": []}
        for k in range(int((f1 - f0) * 4) + 1):
            f = f0 + k / 4; scene.frame_set(int(f), subframe=f - int(f)); rig.location = (0, -v * (f - f0) / fps, 0); bpy.context.view_layer.update()
            for s_ in "LR":
                c, T = contact(s_)
                if T and k % 4 == 0: imgs[s_].append(int(f))
                for nom_p in ("talon", "plante", "bout"):
                    cle = (s_, nom_p)
                    if nom_p in T:
                        pose.setdefault(cle, T[nom_p].copy()); pire = max(pire, (T[nom_p].xy - pose[cle].xy).length)
                    else: pose.pop(cle, None)
        def plages(l):
            out = []
            for x in sorted(set(l)):
                if out and x == out[-1][1] + 1: out[-1][1] = x
                else: out.append([x, x])
            return ", ".join(f"{a}-{b}" if b > a else f"{a}" for a, b in out) or "aucune"
        ligne = f"{nom}: vitesse d'avance {v} m/s ; glissement maximal d'un point posé {pire * 100:.1f} cm ; images au sol (sur {int(f1 - f0) + 1}) : gauche {plages(imgs['L'])} | droit {plages(imgs['R'])}"
        rapport.append(ligne)
    rig.location = (0, 0, 0); open(os.path.join(OUT, "glissement.txt"), "w").write("\n".join(rapport) + "\n"); print("GLISSEMENT", rapport)
    N_IMG = 8
    for part, noms in ((1, ORDRE[:5]), (2, ORDRE[5:])):
      cases = []
      for nom in noms:
        act = acts[nom]; rig.animation_data.action = act; f0, f1 = act.frame_range; v = vit.get(nom, 0) if nom in ("marche", "trot", "course") else 0
        epee.hide_render = nom != "epee"
        reperes = []
        for vue in ("côté", "face"):
            for i in range(N_IMG):
                f = f0 + (f1 - f0) * i / N_IMG; scene.frame_set(int(f), subframe=f - int(f))
                t = (f - f0) / fps; y = -v * t; rig.location = (0, y, 0); bpy.context.view_layer.update()
                if nom == "epee": placer_epee()
                if vue == "côté":
                    for s_ in "LR":
                        c, T = contact(s_)   # disque seulement si le pied touche vraiment le sol, sous le point qui touche
                        if c is not None and not any((r_.location.xy - c.xy).length < .1 for r_ in reperes): reperes.append(disque(c, s_))
                    viser((2.9, y, .9), (0, y, .68), 45)            # la caméra suit le héros ; le sol et les repères défilent
                else: viser((.35, y - 2.9, 1.0), (0, y, .7), 45)    # de face : toujours à la même distance
                cases.append({"image": rendre(os.path.join(OUT, f"c_{nom}_{'cote' if vue == 'côté' else 'face'}_{i}.png")), "legende": f"{nom} {vue} {i + 1}/{N_IMG}"})
        for r_ in reperes: bpy.data.objects.remove(r_)
        rig.location = (0, 0, 0)
      planche(f"Planche C{part} : animations, une ligne de côté et une de face par clip ; caméra qui suit le héros, sol en carreaux de 20 cm, disques = pieds posés (rouge gauche, bleu droit)", cases, f"planche_c{part}", N_IMG)
