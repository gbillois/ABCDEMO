# The Dragon Apprentice Chronicles : petite nature (buissons, fougères, fleurs, champignons, rochers, galets ; les galets aplatis font les chemins),
# préparée à partir du « Stylized Nature MegaKit » de Quaternius (CC0, domaine public : https://opengameart.org/content/stylized-nature-megakit).
# Chaque objet garde ses matières, renommées d'après leur texture (Feuilles, Fleurs, Herbes, Roche, Chemin, Champignons) ;
# les textures sont réduites en WebP (nature_*.webp). Les couleurs suivent la palette du jeu par la teinte de chaque élément.
# Lancer : blender -b -P nature.py -- <dossier glTF du MegaKit> <dossier de sortie>      Produit : nature.glb + nature_*.webp
import bpy, sys, os

SRC, OUT = sys.argv[sys.argv.index("--") + 1], sys.argv[sys.argv.index("--") + 2]
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
OBJETS = {   # nom dans le jeu : modèle source
    "buisson": "Bush_Common_Flowers", "fougere": "Fern_1", "fleurs1": "Flower_3_Group", "fleurs2": "Flower_4_Group",
    "plante": "Plant_1", "champignon": "Mushroom_Common", "trefle": "Clover_1",
    "rocher1": "Rock_Medium_1", "rocher2": "Rock_Medium_2", "rocher3": "Rock_Medium_3",
    "galet1": "Pebble_Round_1", "galet2": "Pebble_Round_3",
}
TEXTURES = {   # texture source : (nom de matière, fichier produit, taille)
    "Leaves_NormalTree_C.png": ("Feuilles", "nature_feuilles.webp", 512), "Flowers.png": ("Fleurs", "nature_fleurs.webp", 512),
    "Leaves.png": ("Herbes", "nature_herbes.webp", 512), "Rocks_Diffuse.png": ("Roche", "nature_roche.webp", 512),
    "PathRocks_Diffuse.png": ("Chemin", "nature_chemin.webp", 512), "Mushrooms.png": ("Champignons", "nature_champignons.webp", 256),
}
def texture_de(mat):
    for n in (mat.node_tree.nodes if mat and mat.use_nodes else []):
        if n.type == "TEX_IMAGE" and n.image: return os.path.basename(n.image.filepath or n.image.name)
    return None
objs = []
for nom, src in OBJETS.items():
    avant = set(scene.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, src + ".gltf"))
    obs = [o for o in scene.objects if o not in avant and o.type == "MESH"]
    for o in scene.objects: o.select_set(o in obs)
    bpy.context.view_layer.objects.active = obs[0]
    if len(obs) > 1: bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    for o in [o for o in scene.objects if o not in avant and o != ob]: bpy.data.objects.remove(o)
    ob.parent = None; bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for i, m in enumerate(ob.data.materials):
        t = texture_de(m); ob.data.materials[i] = bpy.data.materials.get(TEXTURES[t][0]) or bpy.data.materials.new(TEXTURES[t][0]) if t in TEXTURES else m
    ob.name = "N_" + nom; ob.data.name = "N_" + nom; objs.append(ob)
    ob["matieres"] = [m.name.split(".")[0] for m in ob.data.materials]   # noms des matières, dans l'ordre des morceaux (l'export n'en garde pas)
    print("nature", nom, len(ob.data.polygons), "faces", [m.name for m in ob.data.materials])
for o in scene.objects: o.select_set(o in objs)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, "nature.glb"), export_format="GLB", use_selection=True, export_materials="PLACEHOLDER", export_extras=True,
                          export_yup=True, export_apply=True, export_animations=False)
for src, (_, dst, taille) in TEXTURES.items():
    im = bpy.data.images.load(os.path.join(SRC, src)); im.reload(); _ = im.pixels[0]
    im.scale(taille, taille); im.file_format = "WEBP"; im.filepath_raw = os.path.join(OUT, dst); im.save()
    print("texture", dst, taille)
