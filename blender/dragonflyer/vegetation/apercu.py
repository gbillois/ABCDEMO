# The Dragon Apprentice Chronicles : aperçus communs aux arbres (contrôle qualité, dragonflyer/CONCEPTION.md § 7 bis).
# - occlusion ambiante cuite dans les couleurs de sommets (comme dans le jeu, où la couleur « Col » multiplie la texture) ;
# - imposteur (version de loin) : l'arbre rendu de côté sur fond transparent, porté par trois plans croisés (6 triangles) ;
# - 12 rendus depuis les mêmes 12 caméras pour chaque arbre, une planche 4 × 3, le .glb et le rapport « controle.txt ».
import bpy, bmesh, math, os, sys
import numpy as np
from mathutils import Vector
from materiaux import tranche, lin, materiaux_rendu, peindre_tout, eclairage_jeu, normale_choisie, detourage, SOLEIL_EULER, SOLEIL_FORCE, SOLEIL_COUL, CIEL, CIEL_FORCE

def sortie():
    d = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "/tmp/vegetation_apercu"
    os.makedirs(d, exist_ok=True); return d

def scene_vide():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"
    return sc

def textures(dossier):
    """Les textures peintes (une fois par dossier)."""
    d = os.path.join(dossier, "textures")
    noms = {n: os.path.join(d, f"arbres_{n}.png") for n in ("ecorce", "pin", "feuilles")}
    if all(os.path.exists(c) for c in noms.values()): return noms
    return peindre_tout(d)

# ------------------------------------------------------------------ occlusion cuite
def cuire_occlusion(ob, distance=3.0, feuillage_force=.45):
    """Occlusion ambiante (Cycles) multipliée dans « Col » : forte sur l'écorce (tronc à l'ombre de la couronne),
    douce sur le feuillage (les cartes comptent comme pleines pour le calcul : on n'en garde qu'une part)."""
    sc = bpy.context.scene; sc.cycles.samples = 48
    if not sc.world: sc.world = bpy.data.worlds.new("Monde")
    sc.world.light_settings.distance = distance
    sol = bpy.data.objects.new("SolBake", bpy.data.meshes.new("SolBake")); sc.collection.objects.link(sol)
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=40); bm.to_mesh(sol.data); bm.free()
    mats = list(ob.data.materials); mb = bpy.data.materials.new("Bake"); mb.use_nodes = True
    for i in range(len(mats)): ob.data.materials[i] = mb      # (vider les emplacements ferait perdre les numéros de matière)
    ao = ob.data.color_attributes.new("AO", "FLOAT_COLOR", "POINT"); ob.data.color_attributes.active_color = ao
    for o in sc.objects: o.select_set(False)
    ob.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")
    a = np.zeros(len(ob.data.vertices) * 4, np.float32); ao.data.foreach_get("color", a); a = a.reshape(-1, 4)[:, 0]
    mi = np.zeros(len(ob.data.polygons), np.int32); ob.data.polygons.foreach_get("material_index", mi)
    feuil = np.zeros(len(ob.data.vertices), bool)
    for p in ob.data.polygons:
        if p.material_index == 1: feuil[list(p.vertices)] = True
    f = np.where(feuil, 1 - feuillage_force * (1 - a ** .8), .3 + .7 * a ** .8)
    c = np.zeros(len(ob.data.vertices) * 4, np.float32); ob.data.color_attributes["Col"].data.foreach_get("color", c); c = c.reshape(-1, 4)
    c[:, :3] *= f[:, None]; ob.data.color_attributes["Col"].data.foreach_set("color", c.ravel())
    ob.data.color_attributes.remove(ob.data.color_attributes["AO"]); ob.data.color_attributes.active_color = ob.data.color_attributes["Col"]
    for i, m in enumerate(mats): ob.data.materials[i] = m
    bpy.data.objects.remove(sol); bpy.data.materials.remove(mb)

def appliquer_rendu(ob, mats):
    """Remplace les matières de l'arbre par celles des aperçus (même ordre : écorce puis feuillage)."""
    noms = [m.name for m in ob.data.materials]
    for i, n in enumerate(noms): ob.data.materials[i] = mats["Ecorce" if n.startswith("Ecorce") else ("Aiguilles" if n.startswith("Aiguilles") else "Feuilles")]

# ------------------------------------------------------------------ imposteur
def imposteur(ob, nom, dossier, mats, haut_px=1024):
    """Rend l'arbre de trois côtés (orthographique, fond transparent, matières « à plat » : voir materiaux_rendu), face à
    chacun des trois plans croisés à 60° ; les trois vues sont côte à côte dans une seule image et chaque plan porte la
    sienne (pas de lobes en miroir). Normales vers le haut : les trois plans sont éclairés pareil quel que soit l'angle."""
    sc = bpy.context.scene
    xs = [v.co for v in ob.data.vertices]
    demi = max(max(abs(p.x) for p in xs), max(abs(p.y) for p in xs)) * 1.03
    z0 = min(p.z for p in xs) - .05; z1 = max(p.z for p in xs) + .05; Hd = z1 - z0; Wd = 2 * demi
    rx = int(math.ceil(haut_px * Wd / Hd / 32) * 32) if Wd < Hd else haut_px; ry = haut_px if Wd < Hd else int(math.ceil(haut_px * Hd / Wd / 32) * 32)
    larg, haut = (Hd * rx / ry, Hd) if Wd < Hd else (Wd, Wd * ry / rx)
    cam = bpy.data.objects.new("CamI", bpy.data.cameras.new("CamI")); sc.collection.objects.link(cam)
    cam.data.type = "ORTHO"; cam.data.ortho_scale = max(larg, haut); cam.location = (0, -60, z0 + haut / 2); cam.rotation_euler = (math.pi / 2, 0, 0)
    ancien = (sc.camera, sc.world, sc.render.resolution_x, sc.render.resolution_y, sc.render.film_transparent, sc.view_settings.view_transform, sc.cycles.samples)
    w = bpy.data.worlds.new("Blanc"); w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (1, 1, 1, 1)
    w.node_tree.nodes["Background"].inputs[1].default_value = 1.3   # un peu plus fort : le soleil du jeu frappe les plans de biais
    sc.world = w; sc.camera = cam; sc.render.resolution_x, sc.render.resolution_y = rx, ry; sc.render.film_transparent = True
    sc.view_settings.view_transform = "Standard"; sc.cycles.samples = 64; sc.cycles.use_denoising = True
    sc.render.image_settings.file_format = "PNG"; sc.render.image_settings.color_mode = "RGBA"
    caches = [o for o in sc.objects if o.type in ("MESH", "LIGHT") and o != ob]
    for o in caches: o.hide_render = True
    vrais = list(ob.data.materials)
    plats = materiaux_rendu(textures(dossier), plat=True)
    for i, mm in enumerate(vrais): ob.data.materials[i] = plats["Ecorce" if mm.name.startswith("Ecorce") else ("Aiguilles" if mm.name.startswith("Aiguilles") else "Feuilles")]
    chemin = os.path.join(dossier, f"arbres_loin_{nom}.png"); vues = []
    for k in range(3):
        a = k * math.pi / 3; cam.location = (60 * math.sin(a), -60 * math.cos(a), z0 + haut / 2); cam.rotation_euler = (math.pi / 2, 0, a)
        f = os.path.join(dossier, f"_vue_{k}.png"); sc.render.filepath = f; bpy.ops.render.render(write_still=True)
        im = bpy.data.images.load(f); vues.append(np.array(im.pixels[:], np.float32).reshape(ry, rx, 4)); bpy.data.images.remove(im); os.remove(f)
    atlas = elargir(np.concatenate(vues, 1)); img = bpy.data.images.new(f"loin_{nom}", rx * 3, ry, alpha=True)
    img.pixels.foreach_set(atlas.ravel()); img.filepath_raw = chemin; img.file_format = "PNG"; img.save(); bpy.data.images.remove(img)
    for o in caches: o.hide_render = False
    for i, mm in enumerate(vrais): ob.data.materials[i] = mm
    sc.camera, sc.world, sc.render.resolution_x, sc.render.resolution_y, sc.render.film_transparent, sc.view_settings.view_transform, sc.cycles.samples = ancien
    bpy.data.objects.remove(cam)
    # trois plans croisés
    me = bpy.data.meshes.new(f"T_{nom}_1"); bm = bmesh.new(); uv = bm.loops.layers.uv.new("UVMap")
    for k in range(3):
        a = k * math.pi / 3; c, s_ = math.cos(a), math.sin(a)
        vs = [bm.verts.new((-larg / 2 * c, -larg / 2 * s_, z0)), bm.verts.new((larg / 2 * c, larg / 2 * s_, z0)),
              bm.verts.new((larg / 2 * c, larg / 2 * s_, z0 + haut)), bm.verts.new((-larg / 2 * c, -larg / 2 * s_, z0 + haut))]
        f = bm.faces.new(vs)
        for l, (u, v) in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))): l[uv].uv = ((u + k) / 3, v)
    bm.to_mesh(me); bm.free()
    me.normals_split_custom_set_from_vertices([(0, 0, 1)] * len(me.vertices))
    at = me.attributes.new("Nf", "FLOAT_VECTOR", "POINT"); at.data.foreach_set("vector", [0, 0, 1] * len(me.vertices))
    me.materials.append(bpy.data.materials.get(f"Loin_{nom}") or bpy.data.materials.new(f"Loin_{nom}"))
    o = bpy.data.objects.new(f"T_{nom}_1", me); sc.collection.objects.link(o)
    o["matieres"] = [f"Loin_{nom}"]
    return o, chemin

def elargir(px, n=2):
    """La silhouette grandit de n pixels (le seuil de transparence du jeu l'amincit à distance) ; les pixels gagnés
    prennent la couleur de leur voisin opaque (pas de liseré sombre)."""
    px = px.copy()
    for _ in range(n):
        a = px[..., 3]; nouv = px.copy()
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dy == dx == 0: continue
                v = np.roll(np.roll(px, dy, 0), dx, 1); m = (v[..., 3] > nouv[..., 3]) & (a < .5)
                nouv[m] = v[m]
        px = nouv
    return px

def materiau_imposteur(chemin, nom):
    m = bpy.data.materials.new(f"Rendu_loin_{nom}"); m.use_nodes = True; nt = m.node_tree; N = nt.nodes; L = nt.links
    N.remove(N["Principled BSDF"])
    ti = N.new("ShaderNodeTexImage"); ti.image = bpy.data.images.load(chemin, check_existing=True); ti.image.alpha_mode = "STRAIGHT"
    oi = N.new("ShaderNodeObjectInfo"); mx = N.new("ShaderNodeMix"); mx.data_type = "RGBA"; mx.blend_type = "MULTIPLY"; mx.inputs["Factor"].default_value = 1
    L.new(ti.outputs["Color"], mx.inputs[6]); L.new(oi.outputs["Color"], mx.inputs[7])
    # seul le plan qui fait à peu près face au regard se montre (des trois, il y en a toujours un à moins de 30°) :
    # pas d'image écrasée de biais ni d'arête au milieu de l'arbre ; même règle à mettre dans le jeu
    al = tranche(nt, ti.outputs["Alpha"], bas=.66, haut=.78, horizontal=True)
    L.new(detourage(nt, al, eclairage_jeu(nt, mx.outputs[2], normale_choisie(nt))), N["Material Output"].inputs["Surface"])
    return m

def _moyenne(f):
    im = bpy.data.images.load(f); a = np.array(im.pixels[:], np.float32).reshape(-1, 4); bpy.data.images.remove(im)
    m = a[:, 3] > .5; return a[m, :3].mean(0), m.mean()

def calibrer(ob, imp, chemin, dossier, tours=2):
    """L'arbre de près et l'imposteur rendus seuls, de face à hauteur d'homme et en plongée (fond transparent, petite
    image) : la couleur moyenne de l'imposteur est ramenée sur celle de l'arbre (image corrigée), et on note les écarts
    de couleur et de surface couverte."""
    sc = bpy.context.scene; ancien = (sc.render.resolution_x, sc.render.resolution_y, sc.render.film_transparent, sc.cycles.samples, imp.location.copy(), sc.camera)
    cam = bpy.data.objects.new("CamC", bpy.data.cameras.new("CamC")); sc.collection.objects.link(cam); sc.camera = cam; cam.data.lens = 35
    sc.render.resolution_x, sc.render.resolution_y = 240, 240; sc.render.film_transparent = True; sc.cycles.samples = 16
    imp.location = (0, 0, 0); H = ob.dimensions.z; autres = [o for o in sc.objects if o.type == "MESH" and o not in (ob, imp)]
    for o in autres: o.hide_render = True
    vues = [(Vector((0, -H * 2.6, 1.6)), Vector((0, 0, H * .47))), (Vector((H * 1.6, -H * 1.6, H * 1.6)), Vector((0, 0, H * .42)))]
    def mesurer():
        res = []
        for qui in (ob, imp):
            ob.hide_render, imp.hide_render = qui is not ob, qui is not imp; tot = []
            for k, (pos, cible) in enumerate(vues):
                cam.location = pos; cam.rotation_euler = (cible - pos).to_track_quat("-Z", "Y").to_euler()
                f = os.path.join(dossier, f"_calib_{k}.png"); sc.render.filepath = f; bpy.ops.render.render(write_still=True); tot.append(_moyenne(f))
            res.append((sum(t[0] for t in tot) / len(tot), sum(t[1] for t in tot) / len(tot)))
        return res
    for t in range(tours):
        (cp, ap_), (ci, ai) = mesurer(); g = np.clip(cp / np.maximum(ci, 1e-4), .5, 2.)
        im = bpy.data.images.load(chemin, check_existing=True); im.reload(); px = np.array(im.pixels[:], np.float32).reshape(-1, 4)
        px[:, :3] = np.clip(px[:, :3] * g, 0, 1); im.pixels.foreach_set(px.ravel()); im.filepath_raw = chemin; im.file_format = "PNG"; im.save(); im.reload()
    (cp, ap_), (ci, ai) = mesurer()
    for f in os.listdir(dossier):
        if f.startswith("_calib_"): os.remove(os.path.join(dossier, f))
    for o in autres: o.hide_render = False
    ob.hide_render = imp.hide_render = False
    sc.render.resolution_x, sc.render.resolution_y, sc.render.film_transparent, sc.cycles.samples, imp.location, sc.camera = ancien
    bpy.data.objects.remove(cam)
    ecart = float(np.abs(ci - cp).max() / max(cp.max(), 1e-4) * 100)
    return f"imposteur étalonné : écart de couleur moyenne {ecart:.1f} % (près {tuple(round(float(x), 3) for x in cp)}, loin {tuple(round(float(x), 3) for x in ci)}), surface couverte loin/près {ai / ap_ * 100:.0f} %"

# ------------------------------------------------------------------ décor, caméras, rendus
def decor(taille=60):
    """Ciel, soleil chaud du milieu de matinée (comme le village), pré terne comme le sol du jeu. Les arbres sont éclairés
    par leur matière (eclairage_jeu, mêmes valeurs) ; le soleil de la scène sert surtout aux ombres portées au sol."""
    sc = bpy.context.scene
    w = bpy.data.worlds.new("Ciel"); sc.world = w; w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (*CIEL, 1); w.node_tree.nodes["Background"].inputs[1].default_value = CIEL_FORCE
    sun = bpy.data.objects.new("Soleil", bpy.data.lights.new("Soleil", "SUN")); sc.collection.objects.link(sun)
    sun.data.energy = SOLEIL_FORCE; sun.data.color = SOLEIL_COUL; sun.rotation_euler = SOLEIL_EULER; sun.data.angle = .08
    pre = bpy.data.objects.new("Pre", bpy.data.meshes.new("Pre")); sc.collection.objects.link(pre)
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=taille); bm.to_mesh(pre.data); bm.free()
    mg = bpy.data.materials.new("Herbe"); mg.use_nodes = True; mg.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*lin("#6a7350"), 1)
    mg.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 1; pre.data.materials.append(mg)
    cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam")); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.clip_end = 2000
    sc.cycles.samples = 32; sc.cycles.use_denoising = True; sc.cycles.transparent_max_bounces = 32; sc.cycles.max_bounces = 6
    sc.render.resolution_x, sc.render.resolution_y = 720, 480; sc.render.film_transparent = False
    sc.render.image_settings.file_format = "PNG"; sc.render.image_settings.color_mode = "RGB"
    return cam

def douze_cameras(H, Rc, zc, imp_x, sous, pied):
    """Les 12 caméras d'un arbre (hauteur H, rayon de couronne Rc, centre de couronne à zc ; imposteur posé en x = imp_x).
    01-03 à hauteur d'homme tout autour, 04-06 en plongée, 07 au pied, 08 de près à hauteur d'homme, 09 de dessus,
    10 en contre-plongée sous le feuillage, 11 imposteur à côté de l'arbre (hauteur d'homme), 12 les deux de loin."""
    cams = []; d = max(H * 1.75, Rc * 4.2); cible = Vector((0, 0, H * .47))
    for k, az in enumerate((0, 120, 240)):
        a = math.radians(az); cams.append((f"{k + 1:02d}_homme_{az}", Vector((math.sin(a) * d, -math.cos(a) * d, 1.6)), cible, 35))
    for k, az in enumerate((60, 180, 300)):
        a = math.radians(az); cams.append((f"{k + 4:02d}_plongee_{az}", Vector((math.sin(a) * d * .95, -math.cos(a) * d * .95, H * 1.25)), Vector((0, 0, H * .42)), 35))
    cams.append(("07_pied", Vector(pied[0]), Vector(pied[1]), 30))
    cams.append(("08_pres_homme", Vector((-1.5, -Rc - 3.2, 1.6)), Vector((0, 0, min(H * .3, 3.2))), 24))
    cams.append(("09_dessus", Vector((.01, -.01, H + Rc * 5.5)), Vector((0, 0, 0)), 35))
    cams.append(("10_sous_feuillage", Vector(sous[0]), Vector(sous[1]), 16))
    cams.append(("11_imposteur_cote", Vector((imp_x / 2, -max(H * 1.9, imp_x * 1.9), 1.6)), Vector((imp_x / 2, 0, H * .47)), 35))
    a = math.radians(30); dl = 75
    cams.append(("12_imposteur_loin", Vector((imp_x / 2 + math.sin(a) * dl, -math.cos(a) * dl, 14)), Vector((imp_x / 2, 0, H * .45)), 50))
    return cams

def rendre(dossier, cams, planche="planche.png", cols=4, avant=None):
    sc = bpy.context.scene; cam = sc.camera; fichiers = []
    seules = os.environ.get("SEULES")   # essai : seulement certaines vues (ex. SEULES=07,08,10)
    if seules: cams = [c for c in cams if c[0][:2] in seules.split(",")]
    for nom, pos, cible, lens in cams:
        if avant: avant(nom)
        cam.location = pos; cam.rotation_euler = (cible - pos).to_track_quat("-Z", "Y").to_euler(); cam.data.lens = lens
        f = os.path.join(dossier, nom + ".png"); sc.render.filepath = f; bpy.ops.render.render(write_still=True); fichiers.append(f)
    W, H = sc.render.resolution_x // 2, sc.render.resolution_y // 2; rows = (len(fichiers) + cols - 1) // cols
    pl = np.ones((H * rows, W * cols, 4), np.float32)
    for i, f in enumerate(fichiers):
        im = bpy.data.images.load(f); im.scale(W, H); a = np.array(im.pixels[:], np.float32).reshape(H, W, 4)
        r, c = rows - 1 - i // cols, i % cols; pl[r * H:(r + 1) * H, c * W:(c + 1) * W] = a; bpy.data.images.remove(im)
    img = bpy.data.images.new("planche", W * cols, H * rows); img.pixels = pl.ravel(); img.filepath_raw = os.path.join(dossier, planche); img.file_format = "PNG"; img.save()
    return fichiers

def triangles(ob, mat=None):
    return sum(len(p.vertices) - 2 for p in ob.data.polygons if mat is None or p.material_index == mat)

def exporter(objets, chemin):
    for o in bpy.context.scene.objects: o.select_set(o in objets)
    bpy.ops.export_scene.gltf(filepath=chemin, export_format="GLB", use_selection=True, export_extras=True, export_yup=True, export_apply=True,
                              export_materials="PLACEHOLDER", export_vertex_color="ACTIVE", export_animations=False)

# ------------------------------------------------------------------ tout pour un arbre
def preparer(A, nom, dossier):
    """Arbre construit (kit.Arbre) → objet de près (occlusion cuite), imposteur ; renvoie (près, loin, matières de rendu)."""
    tex = textures(dossier); ob = A.objet(); ob.name = f"T_{nom}_0"
    cuire_occlusion(ob)
    mats = materiaux_rendu(tex)
    return ob, mats, tex

def apercu_arbre(A, nom, budget, H, Rc, zc, sous, pied):
    dossier = sortie(); scene_vide()
    ob, mats, tex = preparer(A, nom, dossier)
    exporter([ob], os.path.join(dossier, nom + ".glb"))
    appliquer_rendu(ob, mats)
    imp, chemin = imposteur(ob, nom, dossier, mats)
    imp.data.materials[0] = materiau_imposteur(chemin, nom)
    cal = calibrer(ob, imp, chemin, dossier)
    imp_x = Rc * 2.6; imp.location.x = imp_x
    dims = ob.dimensions
    lignes = [f"{nom} de près : {triangles(ob)} triangles (écorce {triangles(ob, 0)}, feuillage {triangles(ob, 1)}) ; budget {budget} → {'DANS LE BUDGET' if triangles(ob) <= budget else 'HORS BUDGET'}",
              f"matières : 2 (écorce, {ob.data.materials[1].name.lower()}) ; textures peintes par le code : arbres_ecorce, arbres_pin, arbres_feuilles",
              f"taille : {dims.x:.1f} × {dims.y:.1f} m, hauteur {dims.z:.1f} m",
              f"imposteur (de loin) : {triangles(imp)} triangles, image {os.path.basename(chemin)}", cal,
              "rendus : 01-03 hauteur d'homme, 04-06 plongée, 07 pied, 08 de près hauteur d'homme, 09 dessus, 10 sous le feuillage,",
              "         11 imposteur (à droite) à côté de l'arbre de près, 12 les deux de loin (75 m)"]
    open(os.path.join(dossier, "controle.txt"), "w").write("\n".join(lignes) + "\n"); print("\n".join(lignes))
    decor(200)
    def avant(n): imp.hide_render = not n.startswith(("11", "12"))   # l'imposteur n'apparaît que sur les vues de comparaison
    rendre(dossier, douze_cameras(H, Rc, zc, imp_x, sous, pied), avant=avant)
