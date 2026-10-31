# The Dragon Apprentice Chronicles : arbres de la forêt, préparés à partir du « Stylized Nature MegaKit » de Quaternius
# (CC0, domaine public : https://opengameart.org/content/stylized-nature-megakit). Deux espèces (sapin, feuillu), chacune en
# deux niveaux de détail : près (~2 000 faces) et loin : un « imposteur » (trois plans croisés portant une image de l'arbre,
# rendue ici en Cycles), 6 triangles qui gardent la vraie silhouette. Matières « Ecorce » et « Feuilles » ; les textures sont
# réduites à part (arbres_*.webp) et les couleurs suivent la palette du jeu par la teinte de chaque arbre.
# Lancer : blender -b -P arbres.py -- <dossier glTF du MegaKit> <dossier de sortie>      Produit : arbres.glb + arbres_*.webp
import bpy, sys, os, math
from mathutils import Vector

SRC, OUT = sys.argv[sys.argv.index("--") + 1], sys.argv[sys.argv.index("--") + 2]
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
ESPECES = [("pin", "Pine_1", 13.0), ("feuillu", "CommonTree_1", 10.0)]   # nom, modèle source, hauteur voulue (m)
FACES_PRES = 2000

def importer(nom):
    avant = set(scene.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, nom + ".gltf"))
    obs = [o for o in scene.objects if o not in avant and o.type == "MESH"]
    for o in scene.objects: o.select_set(o in obs)
    bpy.context.view_layer.objects.active = obs[0]
    if len(obs) > 1: bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    for o in [o for o in scene.objects if o not in avant and o != ob]: bpy.data.objects.remove(o)
    ob.parent = None; bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return ob

import bmesh
objs = []
# lumière du rendu des imposteurs : soleil de face un peu de côté, ciel doux (comme dans le jeu à midi)
_w = bpy.data.worlds.new("Ciel"); scene.world = _w; _w.use_nodes = True
_w.node_tree.nodes["Background"].inputs[0].default_value = (.55, .65, .8, 1); _w.node_tree.nodes["Background"].inputs[1].default_value = .9
_s = bpy.data.objects.new("Soleil", bpy.data.lights.new("Soleil", "SUN")); scene.collection.objects.link(_s); _s.data.energy = 3.2; _s.rotation_euler = (1.1, 0, -.5)
def imposteur(ob, nom, haut):
    """Rend l'arbre de côté (fond transparent) et fabrique trois plans croisés qui portent cette image."""
    xs = [v.co.x for v in ob.data.vertices] + [v.co.y for v in ob.data.vertices]; demi = max(abs(min(xs)), abs(max(xs))) * 1.04
    cam = bpy.data.objects.new("CamI", bpy.data.cameras.new("CamI")); scene.collection.objects.link(cam); scene.camera = cam
    cam.data.type = "ORTHO"; cam.data.ortho_scale = max(haut * 1.02, demi * 2)
    cam.location = (0, -40, haut / 2); cam.rotation_euler = (math.pi / 2, 0, 0)
    scene.render.resolution_x, scene.render.resolution_y = (256, 512) if haut > demi * 2 else (512, 512)
    scene.render.film_transparent = True; scene.render.engine = "CYCLES"; scene.cycles.samples = 24
    scene.render.image_settings.file_format = "PNG"; scene.render.image_settings.color_mode = "RGBA"
    for o in scene.objects: o.hide_render = o not in (ob, cam) and o.type == "MESH"
    chemin = os.path.join(OUT, f"_imp_{nom}.png"); scene.render.filepath = chemin; bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam)
    largeur = max(haut * 1.02, demi * 2) * scene.render.resolution_x / max(scene.render.resolution_x, scene.render.resolution_y)
    hauteur = max(haut * 1.02, demi * 2) * scene.render.resolution_y / max(scene.render.resolution_x, scene.render.resolution_y)
    z0 = haut / 2 - hauteur / 2
    me = bpy.data.meshes.new(f"T_{nom}_1"); bm = bmesh.new(); uv = bm.loops.layers.uv.new("UVMap")
    for k in range(3):
        a = k * math.pi / 3; c, s_ = math.cos(a), math.sin(a)
        vs = [bm.verts.new((-largeur / 2 * c, -largeur / 2 * s_, z0)), bm.verts.new((largeur / 2 * c, largeur / 2 * s_, z0)),
              bm.verts.new((largeur / 2 * c, largeur / 2 * s_, z0 + hauteur)), bm.verts.new((-largeur / 2 * c, -largeur / 2 * s_, z0 + hauteur))]
        f = bm.faces.new(vs)
        for l, (u, v) in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))): l[uv].uv = (u, v)
    bm.to_mesh(me); bm.free()
    me.materials.append(bpy.data.materials.new(f"Loin_{nom}"))
    o = bpy.data.objects.new(f"T_{nom}_1", me); scene.collection.objects.link(o)
    return o, chemin
images = []
for nom, src, haut in ESPECES:
    base = importer(src)
    for i, m in enumerate(base.data.materials):   # deux matières, toujours dans le même ordre : écorce puis feuilles
        m.name = ("Ecorce" if "Bark" in m.name else "Feuilles") + "_" + nom
    zs = [v.co.z for v in base.data.vertices]; k = haut / (max(zs) - min(zs))
    for v in base.data.vertices: v.co = Vector((v.co.x * k, v.co.y * k, (v.co.z - min(zs)) * k))   # pied à l'origine
    imp, chemin = imposteur(base, nom, haut); objs.append(imp); images.append((chemin, f"arbres_loin_{nom}.webp", None))
    ob = base.copy(); ob.data = base.data.copy(); ob.name = f"T_{nom}_0"; scene.collection.objects.link(ob)
    n = len(ob.data.polygons); ratio = min(1, FACES_PRES / max(1, n))
    if ratio < 1:
        md = ob.modifiers.new("d", "DECIMATE"); md.ratio = ratio; md.use_collapse_triangulate = True
        bpy.context.view_layer.objects.active = ob; bpy.ops.object.modifier_apply(modifier="d")
    print("arbre", ob.name, n, "->", len(ob.data.polygons), "faces, hauteur", haut)
    objs.append(ob); bpy.data.objects.remove(base)
for o in scene.objects: o.select_set(o in objs)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, "arbres.glb"), export_format="GLB", use_selection=True, export_materials="PLACEHOLDER",
                          export_yup=True, export_apply=True, export_animations=False)
# textures réduites (WebP, enregistrées par Blender) : écorce, aiguilles, feuilles, imposteurs
for src, dst, taille in [(os.path.join(SRC, "Bark_NormalTree.png"), "arbres_ecorce.webp", 512), (os.path.join(SRC, "Leaf_Pine_C.png"), "arbres_pin.webp", 1024),
                         (os.path.join(SRC, "Leaves_NormalTree_C.png"), "arbres_feuilles.webp", 512)] + images:
    im = bpy.data.images.load(src); im.reload(); _ = im.pixels[0]   # forcer la lecture du fichier
    if taille: im.scale(taille, taille)
    im.file_format = "WEBP"; im.filepath_raw = os.path.join(OUT, dst); scene.render.image_settings.quality = 88; im.save()
    print("texture", dst, tuple(im.size))
