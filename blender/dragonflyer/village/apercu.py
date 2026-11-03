# The Dragon Apprentice Chronicles : aperçus communs à toutes les maisons et à tous les objets du village.
# - occlusion cuite en Cycles dans les couleurs de sommets (comme dans le jeu) ;
# - 12 rendus depuis les mêmes 12 caméras pour chaque maison (contrôle qualité, dragonflyer/CONCEPTION.md § 7 bis) ;
# - une planche des 12 vues, le .glb, et le rapport « controle.txt » (faces, test de la capsule du joueur).
import bpy, bmesh, math, os, sys
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from materiaux import lin

def sortie():
    d = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "/tmp/village_apercu"
    os.makedirs(d, exist_ok=True); return d

def nettoyer_depart():
    for o in list(bpy.context.scene.objects):
        if o.name in ("Cube", "Light", "Camera"): bpy.data.objects.remove(o)

def cuire_occlusion(objets, sol_z=0.0):
    """Occlusion ambiante (Cycles) multipliée dans l'attribut « Col » ; les vitres (W_) restent telles quelles."""
    scene = bpy.context.scene; scene.render.engine = "CYCLES"; scene.cycles.device = "CPU"; scene.cycles.samples = 64
    sol = bpy.data.objects.new("SolBake", bpy.data.meshes.new("SolBake")); scene.collection.objects.link(sol)
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=40); bm.to_mesh(sol.data); bm.free(); sol.location.z = sol_z
    mat = bpy.data.materials.new("Bake"); mat.use_nodes = True
    for ob in objets:
        if ob.name.startswith("W_"): continue
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

def materiaux_rendu(objets):
    mv = bpy.data.materials.new("Village"); mv.use_nodes = True
    nt = mv.node_tree; ca = nt.nodes.new("ShaderNodeVertexColor"); ca.layer_name = "Col"; bs = nt.nodes["Principled BSDF"]
    nt.links.new(ca.outputs["Color"], bs.inputs["Base Color"]); bs.inputs["Roughness"].default_value = .85
    for ob in objets: ob.data.materials.clear(); ob.data.materials.append(mv)

def decor(taille):
    """Ciel, soleil chaud du milieu de matinée (comme dans le jeu), pré."""
    scene = bpy.context.scene
    w = bpy.data.worlds.new("Ciel"); scene.world = w; w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (.55, .7, .9, 1); w.node_tree.nodes["Background"].inputs[1].default_value = .9
    sun = bpy.data.objects.new("Soleil", bpy.data.lights.new("Soleil", "SUN")); scene.collection.objects.link(sun)
    sun.data.energy = 3.6; sun.data.color = (1, .95, .85); sun.rotation_euler = (.9, .2, -.75); sun.data.angle = .08
    pre = bpy.data.objects.new("Pre", bpy.data.meshes.new("Pre")); scene.collection.objects.link(pre)
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=taille * 12); bm.to_mesh(pre.data); bm.free()
    mg = bpy.data.materials.new("Herbe"); mg.use_nodes = True; mg.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*lin("#6e9a44"), 1)
    mg.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 1; pre.data.materials.append(mg)
    cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam")); scene.collection.objects.link(cam); scene.camera = cam
    scene.cycles.samples = 28; scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = 720, 480
    return cam

def douze_cameras(taille, haut, porte, fenetre):
    """Les 12 caméras, toujours les mêmes (à l'échelle de la maison). Façade vers -Y."""
    d = taille * 1.9; c = Vector((0, 0, haut * .45)); cams = []
    for k, (nom, az) in enumerate((("face", 0), ("droite", 90), ("dos", 180), ("gauche", 270))):   # à hauteur d'homme
        a = math.radians(az); cams.append((f"{k + 1:02d}_{nom}_homme", Vector((math.sin(a) * d, -math.cos(a) * d, 1.6)), c, 35))
    for k, (nom, az) in enumerate((("face_droite", 45), ("dos_droite", 135), ("dos_gauche", 225), ("face_gauche", 315))):   # en plongée
        a = math.radians(az); cams.append((f"{k + 5:02d}_{nom}_plongee", Vector((math.sin(a) * d * 1.1, -math.cos(a) * d * 1.1, haut * 1.3)), c, 35))
    p = Vector(porte); f = Vector(fenetre)
    cams.append(("09_porte_pres", p + Vector((.9, -2.6, 1.4)), p + Vector((0, 0, 1.1)), 35))
    cams.append(("10_fenetre_pres", f + Vector((-.8, -1.9, .3)), f, 35))
    cams.append(("11_dessus", Vector((.01, -.01, haut + taille * 2.6)), Vector((0, 0, 0)), 35))
    cams.append(("12_sous_avant_toit", p + Vector((-1.6, -1.3, .5)), p + Vector((-.6, .8, haut * .55)), 22))
    return cams

def rendre(dossier, cams):
    scene = bpy.context.scene; cam = scene.camera; fichiers = []
    for nom, pos, cible, lens in cams:
        cam.location = pos; cam.rotation_euler = (cible - pos).to_track_quat("-Z", "Y").to_euler(); cam.data.lens = lens
        f = os.path.join(dossier, nom + ".png"); scene.render.filepath = f; bpy.ops.render.render(write_still=True); fichiers.append(f)
    # planche 4 × 3
    W, H = scene.render.resolution_x // 2, scene.render.resolution_y // 2
    pl = np.zeros((H * 3, W * 4, 4), np.float32)
    for i, f in enumerate(fichiers):
        im = bpy.data.images.load(f); im.scale(W, H); a = np.array(im.pixels[:], np.float32).reshape(H, W, 4)
        r, c = 2 - i // 4, i % 4; pl[r * H:(r + 1) * H, c * W:(c + 1) * W] = a; bpy.data.images.remove(im)
    img = bpy.data.images.new("planche", W * 4, H * 3); img.pixels = pl.ravel(); img.filepath_raw = os.path.join(dossier, "planche.png"); img.file_format = "PNG"; img.save()
    return fichiers

def faces(objets):
    return sum(len(o.data.polygons) for o in objets), sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in objets)

def capsule(ob, porte, rayon=.35, haut=1.7, marche_max=.3, depart=4.5):
    """Une capsule de la taille du joueur part de 4,5 m devant la porte et marche jusqu'au seuil (point « porte »,
    là où le jeu fait entrer). Elle bute sur tout ce qui dépasse ; elle monte des marches de 30 cm au plus.
    Mesure aussi l'ouverture de la porte (largeur entre les montants, hauteur sous l'arc)."""
    dg = bpy.context.evaluated_depsgraph_get(); bvh = BVHTree.FromObject(ob, dg)
    px, py, pz = porte; lignes = []; ok = True; sol = 0.0
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
    lignes.insert(0, f"capsule (rayon {rayon} m, {haut} m) de 4,5 m devant jusqu'au seuil : {'PASSE' if ok else 'BLOQUÉE'} (sol au seuil {sol:.2f} m)")
    # ouverture de la porte : rayons juste devant les planches
    hd = bvh.ray_cast(Vector((px, py, 1.0)), Vector((0, 1, 0)), 3)
    yp = (hd[0].y - .03) if hd[0] else py + .5
    g = bvh.ray_cast(Vector((px, yp, 1.0)), Vector((-1, 0, 0)), 2); d = bvh.ray_cast(Vector((px, yp, 1.0)), Vector((1, 0, 0)), 2)
    u = bvh.ray_cast(Vector((px, yp, .3)), Vector((0, 0, 1)), 4)
    larg = (d[0].x - g[0].x) if g[0] and d[0] else float("nan"); hp = (u[0].z) if u[0] else float("nan")
    porte_ok = larg >= 2 * rayon + .1 and hp >= haut + .1
    lignes.append(f"ouverture de la porte : {larg:.2f} m de large, {hp:.2f} m sous l'arc → {'assez grande pour la capsule' if porte_ok else 'TROP PETITE pour la capsule'}")
    return ok and porte_ok, lignes

def exporter(objets, chemin):
    for o in bpy.context.scene.objects: o.select_set(o in objets)
    bpy.ops.export_scene.gltf(filepath=chemin, export_format="GLB", use_selection=True, export_extras=True, export_yup=True, export_apply=True)

def apercu_maison(objets, nom, taille, haut, porte_seuil, fenetre):
    """objets : [M_, W_] ; porte_seuil : le point « porte » (repère Blender) ; fenetre : centre d'une fenêtre de façade."""
    dossier = sortie(); nettoyer_depart()
    ok, lignes = capsule(objets[0], porte_seuil)
    cuire_occlusion(objets)
    exporter(objets, os.path.join(dossier, nom + ".glb"))
    f, t = faces(objets); lignes.insert(0, f"{nom} : {f} faces, {t} triangles")
    open(os.path.join(dossier, "controle.txt"), "w").write("\n".join(lignes) + "\n"); print("\n".join(lignes))
    materiaux_rendu(objets); decor(taille); rendre(dossier, douze_cameras(taille, haut, porte_seuil, fenetre))

def apercu_objet(P, pied=(1, 1)):
    dossier = sortie(); nettoyer_depart()
    ob = P.objet({"pied": list(pied)}); cuire_occlusion([ob]); exporter([ob], os.path.join(dossier, ob.name + ".glb"))
    f, t = faces([ob]); open(os.path.join(dossier, "controle.txt"), "w").write(f"{ob.name} : {f} faces, {t} triangles\n"); print(ob.name, f, "faces")
    materiaux_rendu([ob]); decor(max(pied) * 2); s = max(pied)
    rendre(dossier, douze_cameras(s, 1.0, (0, -pied[1] / 2, 0), (0, -pied[1] / 2, .5)))
