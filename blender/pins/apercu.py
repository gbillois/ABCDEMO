# Le Domaine des Pins : rendus de contrôle communs à tous les bâtiments et objets (méthode, blender/pins/METHODE.md § 4).
# - occlusion ambiante cuite en Cycles dans les couleurs de sommets (comme dans le jeu) ;
# - 12 rendus depuis les 12 mêmes caméras, une planche 4 × 3, le .glb ;
# - le rapport « controle.txt » : triangles (par objet, comparés au budget et à l'ancien modèle), capsule du joueur.
import bpy, bmesh, math, os, sys
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from materiaux import lin

def sortie():
    d = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv and len(sys.argv) > sys.argv.index("--") + 1 else "/tmp/pins_apercu"
    os.makedirs(d, exist_ok=True); return d

def options():
    a = sys.argv[sys.argv.index("--") + 2:] if "--" in sys.argv else []
    return set(a)

def nettoyer_depart():
    for o in list(bpy.context.scene.objects): bpy.data.objects.remove(o)

def cuire_occlusion(objets, sol_z=0.0, distance=.7):
    """Occlusion ambiante (Cycles) multipliée dans « Col » : couleur × (0,35 + 0,65 · ao^0,8). Les vitres (W_) ne sont pas assombries."""
    scene = bpy.context.scene; scene.render.engine = "CYCLES"; scene.cycles.device = "CPU"; scene.cycles.samples = 64
    bpy.context.scene.world = bpy.context.scene.world or bpy.data.worlds.new("w")
    scene.world.light_settings.distance = distance
    sol = bpy.data.objects.new("SolBake", bpy.data.meshes.new("SolBake")); scene.collection.objects.link(sol)
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=60); bm.to_mesh(sol.data); bm.free(); sol.location.z = sol_z
    mat = bpy.data.materials.new("Bake"); mat.use_nodes = True
    joints = [o for o in objets if o.name.startswith("J_")]   # couvre-joints : cachés pendant la cuisson des autres pièces
    for ob in objets:
        if ob.name.startswith("W_"): continue
        for j in joints: j.hide_render = not ob.name.startswith("J_")
        ob.data.materials.append(mat)
        ao = ob.data.color_attributes.new("AO", "FLOAT_COLOR", "POINT"); ob.data.color_attributes.active_color = ao
        for o in scene.objects: o.select_set(False)
        ob.select_set(True); bpy.context.view_layer.objects.active = ob
        bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")
        a = np.zeros(len(ob.data.vertices) * 4, np.float32); ao.data.foreach_get("color", a)
        c = np.zeros_like(a); ob.data.color_attributes["Col"].data.foreach_get("color", c)
        a = a.reshape(-1, 4); c = c.reshape(-1, 4); c[:, :3] *= .35 + .65 * a[:, :1] ** .8
        ob.data.color_attributes["Col"].data.foreach_set("color", c.ravel())
        ob.data.color_attributes.remove(ob.data.color_attributes["AO"]); ob.data.color_attributes.active_color = ob.data.color_attributes["Col"]
        ob.data.materials.clear()
    bpy.data.objects.remove(sol)
    for j in joints: j.hide_render = False
    # chaque « J_<nom> » rejoint l'objet <nom>
    for j in joints:
        cible = bpy.data.objects.get(j.name[2:])
        if not cible: continue
        for o in bpy.context.scene.objects: o.select_set(o in (j, cible))
        bpy.context.view_layer.objects.active = cible; bpy.ops.object.join()
        if j in objets: objets.remove(j)

def materiaux_rendu(objets):
    mv = bpy.data.materials.new("Domaine"); mv.use_nodes = True
    nt = mv.node_tree; ca = nt.nodes.new("ShaderNodeVertexColor"); ca.layer_name = "Col"; bs = nt.nodes["Principled BSDF"]
    nt.links.new(ca.outputs["Color"], bs.inputs["Base Color"]); bs.inputs["Roughness"].default_value = .85
    mw = bpy.data.materials.new("Vitre"); mw.use_nodes = True; b2 = mw.node_tree.nodes["Principled BSDF"]
    b2.inputs["Base Color"].default_value = (*lin("#9fc6dc"), 1); b2.inputs["Roughness"].default_value = .08; b2.inputs["Metallic"].default_value = .4
    for ob in objets: ob.data.materials.clear(); ob.data.materials.append(mw if ob.name.startswith("W_") else mv)

def decor(taille):
    """Ciel uni, soleil chaud de fin de matinée (comme dans le jeu), sol terne d'herbe et d'aiguilles de pin."""
    scene = bpy.context.scene
    w = bpy.data.worlds.new("Ciel"); scene.world = w; w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (.55, .7, .9, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 1.15
    sun = bpy.data.objects.new("Soleil", bpy.data.lights.new("Soleil", "SUN")); scene.collection.objects.link(sun)
    sun.data.energy = 3.6; sun.data.color = (1, .95, .85); sun.rotation_euler = (.9, .2, -.75); sun.data.angle = .08
    pre = bpy.data.objects.new("Pre", bpy.data.meshes.new("Pre")); scene.collection.objects.link(pre)
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=taille * 12); bm.to_mesh(pre.data); bm.free()
    mg = bpy.data.materials.new("Herbe"); mg.use_nodes = True; mg.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*lin("#6a7350"), 1)
    mg.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 1; pre.data.materials.append(mg)
    cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam")); scene.collection.objects.link(cam); scene.camera = cam
    scene.cycles.samples = 28; scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = 720, 480
    scene.view_settings.view_transform = "Standard"   # comme le jeu (pas de « Filmic » qui délave les couleurs)
    return cam

def douze_cameras(taille, haut, porte, fenetre, avant_toit):
    """Les 12 caméras, toujours les mêmes (à l'échelle du bâtiment). Façade (porte) vers -Y."""
    d = max(taille * 1.9, haut * 2.1); c = Vector((0, 0, haut * .45)); cams = []
    for k, (nom, az) in enumerate((("face", 0), ("droite", 90), ("dos", 180), ("gauche", 270))):   # à hauteur d'homme
        a = math.radians(az); cams.append((f"{k + 1:02d}_{nom}_homme", Vector((math.sin(a) * d, -math.cos(a) * d, 1.6)), c, 35))
    for k, (nom, az) in enumerate((("face_droite", 45), ("dos_droite", 135), ("dos_gauche", 225), ("face_gauche", 315))):   # en plongée
        a = math.radians(az); cams.append((f"{k + 5:02d}_{nom}_plongee", Vector((math.sin(a) * d * 1.1, -math.cos(a) * d * 1.1, haut * 1.3)), c, 35))
    p = Vector(porte); f = Vector(fenetre); t = Vector(avant_toit)
    cams.append(("09_porte_pres", p + Vector((1.0, -3.0, 1.45)), p + Vector((0, 0, 1.2)), 35))
    cams.append(("10_fenetre_pres", f + Vector((-.9, -2.2, .3)), f, 35))
    cams.append(("11_dessus", Vector((.01, -.01, haut + taille * 2.4)), Vector((0, 0, 0)), 35))
    cams.append(("12_sous_avant_toit", t + Vector((1.6, -1.2, -2.2)), t, 24))
    return cams

def rendre(dossier, cams, prefixe=""):
    scene = bpy.context.scene; cam = scene.camera; fichiers = []
    for nom, pos, cible, lens in cams:
        cam.location = pos; cam.rotation_euler = (cible - pos).to_track_quat("-Z", "Y").to_euler(); cam.data.lens = lens
        f = os.path.join(dossier, prefixe + nom + ".png"); scene.render.filepath = f; bpy.ops.render.render(write_still=True); fichiers.append(f)
    W, H = scene.render.resolution_x // 2, scene.render.resolution_y // 2
    pl = np.zeros((H * 3, W * 4, 4), np.float32)
    for i, f in enumerate(fichiers):
        im = bpy.data.images.load(f); im.scale(W, H); a = np.array(im.pixels[:], np.float32).reshape(H, W, 4)
        r, c = 2 - i // 4, i % 4; pl[r * H:(r + 1) * H, c * W:(c + 1) * W] = a; bpy.data.images.remove(im)
    img = bpy.data.images.new("planche", W * 4, H * 3); img.pixels = pl.ravel(); img.filepath_raw = os.path.join(dossier, prefixe + "planche.png"); img.file_format = "PNG"; img.save()
    return fichiers

def triangles(ob): return sum(len(p.vertices) - 2 for p in ob.data.polygons)

def bvh_de(objets):
    dg = bpy.context.evaluated_depsgraph_get(); V, F = [], []
    for ob in objets:
        mw = ob.matrix_world; o = len(V); V += [mw @ v.co for v in ob.data.vertices]; F += [[o + i for i in p.vertices] for p in ob.data.polygons]
    return BVHTree.FromPolygons(V, F)

def capsule(objets, porte, rayon=.35, haut=1.7, marche_max=.3, depart=4.5):
    """Une capsule de la taille du joueur part de 4,5 m devant la porte et marche jusqu'au seuil (point « porte »).
    Elle bute sur tout ce qui dépasse et monte des marches de 30 cm au plus. Mesure aussi l'ouverture de la porte."""
    bvh = bvh_de(objets); px, py, pz = porte; lignes = []; ok = True; sol = 0.0
    for k in range(int(depart / .05) + 1):
        y = py - depart + k * .05; x = px
        hit = bvh.ray_cast(Vector((x, y, sol + marche_max + .02)), Vector((0, 0, -1)), marche_max + .5)
        nsol = max(0.0, hit[0].z) if hit[0] else 0.0
        if nsol - sol > marche_max: ok = False; lignes.append(f"marche trop haute à y={y:.2f} : {nsol - sol:.2f} m"); break
        sol = nsol
        for z in np.arange(sol + marche_max, sol + haut, .2):
            for a in range(0, 360, 30):
                d = Vector((math.cos(math.radians(a)), math.sin(math.radians(a)), 0))
                h = bvh.ray_cast(Vector((x, y, z)), d, rayon)
                if h[0]: ok = False; lignes.append(f"bloquée à y={y:.2f} (z={z:.2f}, direction {a}°) par {h[0].x:.2f}, {h[0].y:.2f}, {h[0].z:.2f}"); break
            if not ok: break
        if not ok: break
        h = bvh.ray_cast(Vector((x, y, sol + .5)), Vector((0, 0, 1)), haut - .5)
        if h[0]: ok = False; lignes.append(f"tête bloquée à y={y:.2f} (z={h[0].z:.2f})"); break
    lignes.insert(0, f"capsule (rayon {rayon} m, {haut} m) de {depart} m devant jusqu'au seuil : {'PASSE' if ok else 'BLOQUÉE'} (sol au seuil {sol:.2f} m)")
    zp = pz + 1.0
    g = bvh.ray_cast(Vector((px, py, zp)), Vector((-1, 0, 0)), 2); d = bvh.ray_cast(Vector((px, py, zp)), Vector((1, 0, 0)), 2)
    u = bvh.ray_cast(Vector((px, py, pz + .3)), Vector((0, 0, 1)), 4)
    larg = (d[0].x - g[0].x) if g[0] and d[0] else float("nan"); hp = (u[0].z - pz) if u[0] else float("nan")
    porte_ok = larg >= 2 * rayon + .1 and hp >= haut + .1
    lignes.append(f"ouverture de la porte : {larg:.2f} m de large, {hp:.2f} m de haut depuis le seuil → {'assez grande pour la capsule' if porte_ok else 'TROP PETITE pour la capsule'}")
    return ok and porte_ok, lignes

def exporter(objets, chemin):
    for o in bpy.context.scene.objects: o.select_set(o in objets)
    kw = dict(filepath=chemin, export_format="GLB", use_selection=True, export_extras=True, export_yup=True, export_apply=True, export_materials="NONE")
    try: bpy.ops.export_scene.gltf(**kw, export_vertex_color="ACTIVE")
    except TypeError: bpy.ops.export_scene.gltf(**kw)

def rapport(dossier, objets, lignes, budget=None, ancien=None):
    tot = sum(triangles(o) for o in objets)
    l = [f"triangles : {tot}" + (f" (budget {budget}" + (f", ancien modèle {ancien}" if ancien else "") + ")" if budget else "")]
    l += [f"  {o.name} : {triangles(o)}" for o in objets]
    l += lignes
    open(os.path.join(dossier, "controle.txt"), "w").write("\n".join(l) + "\n"); print("\n".join(l))
