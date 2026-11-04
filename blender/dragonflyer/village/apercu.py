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
    w.node_tree.nodes["Background"].inputs[0].default_value = (.55, .7, .9, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 1.15   # lumière du ciel comme dans le jeu de jour (les pans à l'ombre restent lisibles)
    sun = bpy.data.objects.new("Soleil", bpy.data.lights.new("Soleil", "SUN")); scene.collection.objects.link(sun)
    sun.data.energy = 3.6; sun.data.color = (1, .95, .85); sun.rotation_euler = (.9, .2, -.75); sun.data.angle = .08
    pre = bpy.data.objects.new("Pre", bpy.data.meshes.new("Pre")); scene.collection.objects.link(pre)
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=taille * 12); bm.to_mesh(pre.data); bm.free()
    mg = bpy.data.materials.new("Herbe"); mg.use_nodes = True; mg.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*lin("#6a7350"), 1)   # herbe et terre ternes, comme le sol du jeu (un vert vif renvoie du vert sous les toits)
    mg.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 1; pre.data.materials.append(mg)
    cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam")); scene.collection.objects.link(cam); scene.camera = cam
    scene.cycles.samples = 28; scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = 720, 480
    return cam

def douze_cameras(taille, haut, porte, fenetre):
    """Les 12 caméras, toujours les mêmes (à l'échelle de la maison). Façade vers -Y."""
    d = max(taille * 1.9, haut * 2.1); c = Vector((0, 0, haut * .5)); cams = []   # recule pour les maisons hautes
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
    # mesures depuis le plancher de la maison (point « porte »), pas depuis le sol ; la largeur est prise à 0,6 m et à
    # 1,4 m au-dessus du plancher et on garde la plus grande (une poignée ou un anneau ne réduit pas le passage)
    larg, yp = float("nan"), py + .5
    for zp in (pz + .6, pz + 1.4):
        hd = bvh.ray_cast(Vector((px, py, zp)), Vector((0, 1, 0)), 3)
        y_ = (hd[0].y - .02) if hd[0] else py + .5   # juste devant les planches, entre les montants
        g = bvh.ray_cast(Vector((px, y_, zp)), Vector((-1, 0, 0)), 2); d = bvh.ray_cast(Vector((px, y_, zp)), Vector((1, 0, 0)), 2)
        l_ = (d[0].x - g[0].x) if g[0] and d[0] else float("nan")
        if l_ == l_ and (larg != larg or l_ > larg): larg, yp = l_, y_
    u = bvh.ray_cast(Vector((px, yp - .07, pz + .3)), Vector((0, 0, 1)), 4)   # un peu plus devant : pas les pentures, mais le linteau ou l'arc
    hp = (u[0].z - pz) if u[0] else float("nan")
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

# ---- ajouts pêcheur : maison au bord de l'eau (rivage en pente et plan d'eau, comme le jeu la pose)
def rivage(y_rive=-6.2, y_fond=-1.5, z_fond=-1.8, taille=80):
    """Terrain des aperçus d'une maison sur pilotis : terre plate (z = 0) côté porte (-Y) jusqu'à y_rive, plage en pente,
    fond à z_fond côté mer (+Y). Herbe, sable sec, sable mouillé, fond (couleurs par sommet, ternes comme le jeu)."""
    me = bpy.data.meshes.new("Rivage"); ob = bpy.data.objects.new("Rivage", me); bpy.context.scene.collection.objects.link(ob)
    bm = bmesh.new(); col = bm.verts.layers.float_color.new("Col")
    rangs = [(-taille, 0, "#6a7350"), (y_rive - 2.2, 0, "#6a7350"), (y_rive - .6, 0, "#b3a27c"), (y_rive, 0, "#b3a27c"),
             (y_rive + .8, -.3, "#8f8466"), (y_fond, z_fond, "#7a755e"), (taille, z_fond, "#7a755e")]
    V = []
    for (y, z, h) in rangs:
        r = [bm.verts.new((x, y, z)) for x in (-taille, taille)]
        for v in r: v[col] = (*lin(h), 1)
        V.append(r)
    for a, b in zip(V, V[1:]): bm.faces.new((a[0], a[1], b[1], b[0]))
    bm.normal_update(); bm.to_mesh(me); bm.free()
    m = bpy.data.materials.new("Rivage"); m.use_nodes = True; nt = m.node_tree; ca = nt.nodes.new("ShaderNodeVertexColor"); ca.layer_name = "Col"
    bs = nt.nodes["Principled BSDF"]; nt.links.new(ca.outputs["Color"], bs.inputs["Base Color"]); bs.inputs["Roughness"].default_value = 1
    me.materials.append(m); return ob

def plan_eau(z, taille=80):
    """Eau des aperçus : plan bleu-vert un peu transparent (on devine les pieux dessous)."""
    me = bpy.data.meshes.new("Eau"); ob = bpy.data.objects.new("Eau", me); bpy.context.scene.collection.objects.link(ob)
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=taille); bm.to_mesh(me); bm.free(); ob.location.z = z
    m = bpy.data.materials.new("Eau"); m.use_nodes = True; bs = m.node_tree.nodes["Principled BSDF"]
    bs.inputs["Base Color"].default_value = (*lin("#3e8d9c"), 1); bs.inputs["Roughness"].default_value = .12; bs.inputs["Alpha"].default_value = .72
    me.materials.append(m); return ob

def ouverture_porte(ob, porte, rayon=.35, haut=1.7):
    """Ouverture de la porte, mesurée à 0,6 m et à 1,4 m au-dessus du plancher (on garde la plus grande : à 1 m, l'anneau
    de la porte du kit coupait la mesure) ; hauteur sous le linteau."""
    dg = bpy.context.evaluated_depsgraph_get(); bvh = BVHTree.FromObject(ob, dg); px, py, pz = porte; larg = 0.0
    for dz in (.6, 1.4):
        hd = bvh.ray_cast(Vector((px, py, pz + dz)), Vector((0, 1, 0)), 3); yp = (hd[0].y - .02) if hd[0] else py + .5
        g = bvh.ray_cast(Vector((px, yp, pz + dz)), Vector((-1, 0, 0)), 2); d = bvh.ray_cast(Vector((px, yp, pz + dz)), Vector((1, 0, 0)), 2)
        if g[0] and d[0]: larg = max(larg, d[0].x - g[0].x)
    u = bvh.ray_cast(Vector((px, yp - .07, pz + .3)), Vector((0, 0, 1)), 4); hp = (u[0].z - pz) if u[0] else float("nan")
    ok = larg >= 2 * rayon + .1 and hp >= haut + .1
    return ok, f"ouverture de la porte : {larg:.2f} m de large (mesures à 0,6 et 1,4 m), {hp:.2f} m sous le linteau → {'assez grande pour la capsule' if ok else 'TROP PETITE pour la capsule'}"

def apercu_maison_eau(objets, nom, taille, haut, porte_seuil, fenetre, eau=-.2, porte_cam=None, **rive):
    """Comme apercu_maison, pour une maison posée au bord de l'eau : l'occlusion est cuite avec un sol au niveau de
    l'eau (dans le jeu, la maison est posée à y = 0,2 au-dessus de la mer, soit l'eau à z = -0,2 dans son repère) ;
    les rendus montrent le rivage (terre à z = 0 côté porte) et l'eau. La capsule part de la terre (z = 0).
    porte_cam : point où s'ancrent les caméras 09 et 12 (à 0,6 m devant la porte comme pour les autres maisons) quand le
    point « porte » est loin du mur (terrasse)."""
    dossier = sortie(); nettoyer_depart()
    ok, lignes = capsule(objets[0], porte_seuil)
    ok_p, ligne_p = ouverture_porte(objets[0], porte_seuil)
    lignes = [l for l in lignes if not l.startswith("ouverture de la porte")] + [ligne_p]
    cuire_occlusion(objets, sol_z=eau)
    exporter(objets, os.path.join(dossier, nom + ".glb"))
    f, t = faces(objets); lignes.insert(0, f"{nom} : {f} faces, {t} triangles")
    open(os.path.join(dossier, "controle.txt"), "w").write("\n".join(lignes) + "\n"); print("\n".join(lignes))
    materiaux_rendu(objets); decor(taille)
    bpy.data.objects.remove(bpy.data.objects["Pre"]); rivage(**rive); plan_eau(eau)
    rendre(dossier, douze_cameras(taille, haut, porte_cam or porte_seuil, fenetre))

# ---- ajouts intérieurs : banc de test des pièces (village/interieurs/*.py)
def materiau_lueur(objets, force=1.3):
    """Ce qui brille (IL_, flammes d'un objet) : émission de la couleur des sommets (le jeu le dessine sans lumière)."""
    m = bpy.data.materials.new("Lueur"); m.use_nodes = True; nt = m.node_tree
    for n in list(nt.nodes):
        if n.type != "OUTPUT_MATERIAL": nt.nodes.remove(n)
    ca = nt.nodes.new("ShaderNodeVertexColor"); ca.layer_name = "Col"; em = nt.nodes.new("ShaderNodeEmission"); em.inputs["Strength"].default_value = force
    nt.links.new(ca.outputs["Color"], em.inputs["Color"]); nt.links.new(em.outputs["Emission"], nt.nodes["Material Output"].inputs["Surface"])
    for ob in objets: ob.data.materials.clear(); ob.data.materials.append(m)

def apercu_objet_v(P, V, pied=(1, 1)):
    """Comme apercu_objet, pour un objet qui a une partie qui brille (V : flammes, braises)."""
    dossier = sortie(); nettoyer_depart()
    ob = P.objet({"pied": list(pied)}); obv = V.objet(); cuire_occlusion([ob]); exporter([ob, obv], os.path.join(dossier, ob.name + ".glb"))
    f, t = faces([ob, obv]); open(os.path.join(dossier, "controle.txt"), "w").write(f"{ob.name} : {f} faces, {t} triangles (dont {faces([obv])[1]} qui brillent)\n"); print(ob.name, t, "triangles")
    materiaux_rendu([ob]); materiau_lueur([obv]); decor(max(pied) * 2); s = max(pied)
    rendre(dossier, douze_cameras(s, 1.0, (0, -pied[1] / 2, 0), (0, -pied[1] / 2, .5)))

def planche_12(dossier, fichiers, nom="planche.png"):
    scene = bpy.context.scene; W, H = scene.render.resolution_x // 2, scene.render.resolution_y // 2
    pl = np.zeros((H * 3, W * 4, 4), np.float32)
    for i, f in enumerate(fichiers):
        im = bpy.data.images.load(f); im.scale(W, H); a = np.array(im.pixels[:], np.float32).reshape(H, W, 4)
        r, c = 2 - i // 4, i % 4; pl[r * H:(r + 1) * H, c * W:(c + 1) * W] = a; bpy.data.images.remove(im)
    img = bpy.data.images.new("planche", W * 4, H * 3); img.pixels = pl.ravel(); img.filepath_raw = os.path.join(dossier, nom); img.file_format = "PNG"; img.save()

def degagement(bvh, x, y, marche=.3, haut=1.7, portee=1.0, n_dir=24):
    """Distance horizontale du point (x, y) au premier obstacle entre marche et haut (0 si quelque chose est au-dessus
    ou en dessous dans cette tranche : table, lit, poutre basse). Les rayons partent de l'axe de la capsule."""
    if bvh.ray_cast(Vector((x, y, marche)), Vector((0, 0, 1)), haut - marche)[0]: return 0.0
    if bvh.ray_cast(Vector((x, y, haut)), Vector((0, 0, -1)), haut - marche)[0]: return 0.0
    d = portee
    for z in np.arange(marche + .02, haut + .01, .14):
        for k in range(n_dir):
            a = 2 * math.pi * k / n_dir; h = bvh.ray_cast(Vector((x, y, z)), Vector((math.cos(a), math.sin(a), 0)), d)
            if h[0]: d = min(d, h[3])
    return d

def _remplir(libre, depart):
    """Inondation à 8 voisins depuis depart (pas de coin coupé entre deux cases bloquées)."""
    ny, nx = libre.shape; vu = np.zeros_like(libre); pile = [depart] if libre[depart] else []
    if pile: vu[depart] = True
    while pile:
        j, i = pile.pop()
        for dj in (-1, 0, 1):
            for di in (-1, 0, 1):
                jj, ii = j + dj, i + di
                if (dj or di) and 0 <= jj < ny and 0 <= ii < nx and libre[jj, ii] and not vu[jj, ii]:
                    if dj and di and not (libre[j, ii] and libre[jj, i]): continue
                    vu[jj, ii] = True; pile.append((jj, ii))
    return vu

def carte_acces(ob, taille, depart, cibles, poses, dossier, pas=.25, rayon=.35, large=.45, marge_mur=.45, marche=.3, haut=1.7):
    """Test de la capsule du joueur dans une pièce : sur une grille de 25 cm, les cases que la capsule (rayon, haut)
    atteint depuis la porte (inondation), en restant à marge_mur des murs comme le jeu (garderDansPiece).
    Passages : une capsule « large » (diamètre 0,9 m) doit aller partout où va la vraie (sinon un meuble laisse un
    passage de moins de 0,9 m). cibles : {nom: (x0, x1, y0, y1) ou (x, y)} à atteindre à moins de 1 m.
    Écrit carte_acces.png (vert atteint, jaune-vert atteint mais étroit, rouge bloqué, gris enfermé, brun : trop près
    d'un mur) et renvoie les lignes du rapport."""
    dg = bpy.context.evaluated_depsgraph_get(); bvh = BVHTree.FromObject(ob, dg)
    l, p = taille[0], taille[1]; nx, ny = int(round(l / pas)), int(round(p / pas))
    xs = -l / 2 + (np.arange(nx) + .5) * pas; ys = -p / 2 + (np.arange(ny) + .5) * pas
    D = np.zeros((ny, nx)); dedans = np.zeros((ny, nx), bool)
    for j, y in enumerate(ys):
        for i, x in enumerate(xs):
            dedans[j, i] = abs(x) <= l / 2 - marge_mur + 1e-6 and abs(y) <= p / 2 - marge_mur + 1e-6
            D[j, i] = degagement(bvh, x, y, marche, haut) if dedans[j, i] else 0.0
    j0 = int(np.argmin(abs(ys - depart[1]))); i0 = int(np.argmin(abs(xs - depart[0])))
    libre = dedans & (D >= rayon); A = _remplir(libre, (j0, i0))
    largeL = A & (D >= large); B = _remplir(largeL, (j0, i0))
    coupe = largeL & ~B                                       # cases où la capsule large tient, mais qu'elle n'atteint pas
    L = []; ok = True
    L.append(f"capsule du joueur : rayon {rayon} m, {haut} m, enjambe {marche} m ; grille de {pas} m ; reste à {marge_mur} m des murs (comme le jeu)")
    L.append(f"départ (porte) : case ({xs[i0]:.2f}, {ys[j0]:.2f}) {'libre' if libre[j0, i0] else 'BLOQUÉE'}")
    nd = int(dedans.sum()); na = int(A.sum()); nb = int((dedans & ~libre).sum()); ne = int((libre & ~A).sum())
    L.append(f"sol dans la zone du jeu : {nd} cases ({nd * pas * pas:.1f} m²) ; atteintes {na} ({100 * na / max(1, nd):.0f} %), bloquées par un meuble {nb}, libres mais enfermées {ne}")
    if ne: ok = False; L.append("  ENFERMÉ : " + ", ".join(f"({xs[i]:.2f}, {ys[j]:.2f})" for j, i in zip(*np.nonzero(libre & ~A))))
    L.append(f"passages de moins de 0,9 m (capsule de {2 * large:.1f} m de large coupée d'une zone où elle tient) : {int(coupe.sum())} cases" + ("" if not coupe.sum() else " → " + ", ".join(f"({xs[i]:.2f}, {ys[j]:.2f})" for j, i in zip(*np.nonzero(coupe)))))
    if coupe.sum(): ok = False
    pts = [(xs[i], ys[j]) for j, i in zip(*np.nonzero(A))]
    def dist_rect(px, py, c):
        if len(c) == 2: return math.hypot(px - c[0], py - c[1])
        x0, x1, y0, y1 = c; return math.hypot(max(x0 - px, 0, px - x1), max(y0 - py, 0, py - y1))
    for nom, c in cibles.items():
        dm = min((dist_rect(px, py, c) for px, py in pts), default=99)
        cotes = ""
        if len(c) == 4:
            x0, x1, y0, y1 = c; n_c = 0
            for test in (lambda px, py: py < y0 and x0 - .3 <= px <= x1 + .3, lambda px, py: py > y1 and x0 - .3 <= px <= x1 + .3,
                         lambda px, py: px < x0 and y0 - .3 <= py <= y1 + .3, lambda px, py: px > x1 and y0 - .3 <= py <= y1 + .3):
                if any(test(px, py) and dist_rect(px, py, c) <= 1.0 for px, py in pts): n_c += 1
            cotes = f", côtés accessibles à moins de 1 m : {n_c}/4"
        if dm > 1.0: ok = False
        L.append(f"{nom} : au plus près à {dm:.2f} m {'(OK)' if dm <= 1.0 else '(TROP LOIN)'}{cotes}")
    # le tour : de chaque mur, une case atteinte à moins de 1,2 m (zone du jeu), et le tour complet de la pièce
    for nom_m, test in (("mur de la porte (-Y)", lambda x, y: y < -p / 2 + marge_mur + 1.2), ("mur du fond (+Y)", lambda x, y: y > p / 2 - marge_mur - 1.2),
                        ("mur gauche (-X)", lambda x, y: x < -l / 2 + marge_mur + 1.2), ("mur droit (+X)", lambda x, y: x > l / 2 - marge_mur - 1.2)):
        n = sum(1 for px, py in pts if test(px, py)); L.append(f"le long du {nom_m} : {n} cases atteintes à moins de 1,2 m de la zone du jeu")
    # carte
    k = 12; img = np.zeros((ny * k, nx * k, 4), np.float32); img[..., 3] = 1
    for j in range(ny):
        for i in range(nx):
            if not dedans[j, i]: c = (.35, .27, .2)
            elif A[j, i] and D[j, i] >= large: c = (.2, .62, .25)
            elif A[j, i]: c = (.62, .72, .2)
            elif libre[j, i]: c = (.5, .5, .5)
            else: c = (.72, .18, .15)
            img[j * k + 1:(j + 1) * k - 1, i * k + 1:(i + 1) * k - 1, :3] = c
    def px_(x, y): return int((x + l / 2) / pas * k), int((y + p / 2) / pas * k)
    for q in poses:
        if not q.get("obstacle", True): continue
        a_, b_ = px_(q["min"][0], q["min"][1]), px_(q["max"][0], q["max"][1])
        a_ = (max(0, a_[0]), max(0, a_[1])); b_ = (min(nx * k - 1, b_[0]), min(ny * k - 1, b_[1]))
        img[a_[1]:b_[1] + 1, a_[0], :3] = 1; img[a_[1]:b_[1] + 1, b_[0], :3] = 1; img[a_[1], a_[0]:b_[0] + 1, :3] = 1; img[b_[1], a_[0]:b_[0] + 1, :3] = 1
    for (x, y), c in ((depart, (.2, .4, 1)),) + tuple((v, (1, .85, .1)) for v in cibles.values() if len(v) == 2):
        u, w = px_(x, y); img[max(0, w - 5):w + 5, max(0, u - 5):u + 5, :3] = c
    im = bpy.data.images.new("acces", nx * k, ny * k); im.pixels = img.ravel(); im.filepath_raw = os.path.join(dossier, "carte_acces.png"); im.file_format = "PNG"; im.save()
    L.insert(0, f"ACCÈS : {'PASSE' if ok else 'À REVOIR'} (carte : carte_acces.png ; vert : atteint, jaune-vert : atteint mais à moins de {large} m d'un meuble, rouge : meuble, gris : libre mais enfermé, brun : bande des murs où le jeu ne laisse pas aller)")
    return ok, L

def controle_poses(poses, taille, tol=.025):
    """Rien qui flotte, rien qui s'enfonce, rien dans les murs, pas de meubles qui se traversent. poses : [{nom, min, max,
    appui ('sol', 'mur', 'plafond', 'sur'), sur (nom du support), z_haut (plafond), encastre (dans le mur : fenêtre,
    porte, cheminée), obstacle}]."""
    l, p = taille[0], taille[1]; L = []; ok = True; par_nom = {q["nom"]: q for q in poses}
    for q in poses:
        mn, mx = q["min"], q["max"]; a = q.get("appui", "sol"); msg = "ok"
        if a == "sol" and abs(mn[2]) > tol: msg = f"{'FLOTTE' if mn[2] > 0 else 'S’ENFONCE'} de {abs(mn[2]) * 100:.0f} cm"
        elif a == "sur":
            s = par_nom[q["sur"]]; dz = mn[2] - s["max"][2]; cx, cy = (mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2
            if abs(dz) > tol: msg = f"{'FLOTTE' if dz > 0 else 'S’ENFONCE'} de {abs(dz) * 100:.0f} cm au-dessus de {q['sur']}"
            elif not (s["min"][0] <= cx <= s["max"][0] and s["min"][1] <= cy <= s["max"][1]): msg = f"DÉBORDE de {q['sur']}"
            else: msg = f"posé sur {q['sur']}"
        elif a == "mur":
            e = min(l / 2 - mx[0], mn[0] + l / 2, p / 2 - mx[1], mn[1] + p / 2)
            msg = "contre le mur" if e <= tol + .02 else f"DÉCOLLÉ du mur de {e * 100:.0f} cm"
        elif a == "plafond":
            e = q["z_haut"] - mx[2]; msg = "accroché" if abs(e) <= tol + .01 else f"{'PEND DANS LE VIDE' if e > 0 else 'DANS LA POUTRE'} ({e * 100:.0f} cm)"
        if not q.get("encastre"):
            dans = max(mx[0] - l / 2, -l / 2 - mn[0], mx[1] - p / 2, -p / 2 - mn[1])
            if dans > tol: msg += f" ; DANS LE MUR de {dans * 100:.0f} cm"
        if msg.isupper() or "FLOTTE" in msg or "ENFONCE" in msg or "DÉ" in msg or "DANS" in msg or "PEND" in msg: ok = False
        L.append(f"  {q['nom']} : {msg} (de {mn[2]:.2f} à {mx[2]:.2f} m)")
    obs = [q for q in poses if q.get("obstacle", True) and q.get("appui", "sol") == "sol"]
    for i, a in enumerate(obs):
        for b in obs[i + 1:]:
            r = [min(a["max"][k], b["max"][k]) - max(a["min"][k], b["min"][k]) for k in range(3)]
            if min(r) <= .03: continue
            if a.get("bvh") and b.get("bvh") and not a["bvh"].overlap(b["bvh"]): continue   # boîtes qui se recouvrent, mais pièces qui ne se touchent pas
            ok = False; L.append(f"  SE TRAVERSENT : {a['nom']} et {b['nom']} (boîtes : {r[0] * 100:.0f} × {r[1] * 100:.0f} × {r[2] * 100:.0f} cm)")
    L.insert(0, f"POSÉ : {'PASSE' if ok else 'À REVOIR'} ({len(poses)} objets)"); return ok, L

def cameras_interieur(taille, porte, foyer, coins):
    """Les 12 caméras des intérieurs, toujours les mêmes (porte vers -Y, foyer, deux coins les plus meublés)."""
    l, p, h = taille; px, py = porte[0], -p / 2; fx, fy, fz = foyer; V_ = Vector
    return [("01_porte_homme", V_((px + .05, py + .35, 1.6)), V_((px, p / 2, 1.15)), 16),
            ("02_coin_avant_gauche", V_((-l / 2 + .65, -p / 2 + .65, 1.75)), V_((0, 0, .8)), 16),
            ("03_coin_avant_droit", V_((l / 2 - .65, -p / 2 + .65, 1.75)), V_((0, 0, .8)), 16),
            ("04_coin_fond_droit", V_((l / 2 - .35, p / 2 - .35, 1.75)), V_((0, 0, .8)), 16),
            ("05_coin_fond_gauche", V_((-l / 2 + .35, p / 2 - .35, 1.75)), V_((0, 0, .8)), 16),
            ("06_enfant_foyer", V_((fx + .6, fy - 2.6, 1.0)), V_((fx, fy, fz + .25)), 20),
            ("07_fond_vers_porte", V_((px + 1.1, p / 2 - 1.0, 1.6)), V_((px, -p / 2, 1.1)), 16),
            ("08_coin_meuble_1", V_(coins[0][0]), V_(coins[0][1]), 20),
            ("09_coin_meuble_2", V_(coins[1][0]), V_(coins[1][1]), 20),
            ("10_plafond", V_((0, -p / 2 + 1.0, 1.3)), V_((0, .8, h)), 14),
            ("11_dessus_coupe", None, None, 0),
            ("12_soir_feu_seul", V_((l / 2 - .6, -p / 2 + .7, 1.5)), V_((fx, fy, fz + .3)), 17)]

def lumieres_interieur(taille, foyer, fenetres, soir=False):
    """Lumière des rendus d'intérieur : le feu (lumière orangée au foyer), un peu de jour par chaque fenêtre et une
    douce lumière d'ambiance (comme la lumière d'ambiance du jeu) ; le soir, le feu seul."""
    for o in [o for o in bpy.context.scene.objects if o.type == "LIGHT"]: bpy.data.objects.remove(o)
    l, p, h = taille; sc = bpy.context.scene.collection
    def lum(nom, sorte, pos, e, c, **k):
        o = bpy.data.objects.new(nom, bpy.data.lights.new(nom, sorte)); sc.objects.link(o); o.location = pos
        o.data.energy = e; o.data.color = c
        for a, v in k.items(): setattr(o.data, a, v)
        return o
    lum("Feu", "POINT", (foyer[0], foyer[1] - .9, foyer[2] + .45), 380 if soir else 150, (1, .55, .22), shadow_soft_size=.35)   # devant le feu (pas dans les braises : les pierres et le chaudron brûleraient)
    if soir: return
    a = lum("Ambiance", "AREA", (0, 0, h - .1), 260, (1, .9, .78), shape="RECTANGLE", size=l * .8, size_y=p * .8)
    for (c, n, wl, wh) in fenetres:
        o = lum("Jour", "AREA", Vector(c) + Vector(n) * .06, 110, (.82, .9, 1), shape="RECTANGLE", size=wl, size_y=wh)
        o.rotation_euler = Vector(n).to_track_quat("-Z", "Y").to_euler()

def apercu_interieur(P, V, C, nom, taille, porte, foyer, coins, poses, cibles, fenetres=(), props=None, ancien=None):
    """Banc de test d'une pièce : P (I_ : murs, sol, meubles), V (IL_ : ce qui brille), C (plafond et charpente, retiré
    pour la vue en coupe ; il rejoint I_ à l'export). Rapport controle.txt (triangles, posé, accès), carte_acces.png,
    12 rendus, planche.png, <nom>.glb (I_<nom> + IL_<nom>, propriétés « taille », « porte », « foyer », « obstacles »)."""
    dossier = sortie(); nettoyer_depart(); scene = bpy.context.scene
    obs = [[round((q["min"][0] + q["max"][0]) / 2, 3), round((q["min"][1] + q["max"][1]) / 2, 3), round((q["max"][0] - q["min"][0]) / 2, 3), round((q["max"][1] - q["min"][1]) / 2, 3)]
           for q in poses if q.get("obstacle", True) and q.get("appui", "sol") in ("sol", "mur") and q["min"][2] < 1.0 and q["max"][2] > .3]
    pr = {"taille": list(taille), "porte": list(porte), "foyer": list(foyer), "obstacles": [x for o in obs for x in o]}; pr.update(props or {})
    obI = P.objet(pr); obL = V.objet(); obC = C.objet()
    depart = (porte[0], porte[1] + .2)                         # là où le jeu pose le joueur en entrant
    ok_a, L_a = carte_acces(obI, taille, depart, cibles, poses, dossier)
    ok_p, L_p = controle_poses(poses, taille)
    w = bpy.data.worlds.new("Dedans"); scene.world = w; w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (.5, .45, .4, 1); w.node_tree.nodes["Background"].inputs[1].default_value = .05
    w.light_settings.distance = .8                             # occlusion courte : dans une pièce fermée, tout est « à l'ombre » à 10 m
    hauts = [v.index for v in obI.data.vertices if v.co.z >= taille[2] - .01 and abs(v.co.x) < taille[0] / 2 - .3 and abs(v.co.y) < taille[1] / 2 - .3]
    c0 = np.zeros(len(obI.data.vertices) * 4, np.float32); obI.data.color_attributes["Col"].data.foreach_get("color", c0)
    cuire_occlusion([obI, obC], sol_z=-50)
    c1 = np.zeros_like(c0); obI.data.color_attributes["Col"].data.foreach_get("color", c1); c0 = c0.reshape(-1, 4); c1 = c1.reshape(-1, 4)
    c1[hauts] = c0[hauts] * .8; obI.data.color_attributes["Col"].data.foreach_set("color", c1.ravel())   # dessus collés au plafond (hotte) : pas noirs dans la vue en coupe
    materiaux_rendu([obI, obC]); materiau_lueur([obL])
    cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam")); scene.collection.objects.link(cam); scene.camera = cam; cam.data.clip_start = .05
    scene.cycles.samples = 32; scene.cycles.use_denoising = True; scene.render.resolution_x, scene.render.resolution_y = 720, 480
    scene.view_settings.view_transform = "Standard"           # comme le jeu (sRGB) : AgX délave les flammes et les couleurs franches
    fichiers = []
    for (n, pos, cible, lens) in cameras_interieur(taille, porte, foyer, coins):
        lumieres_interieur(taille, foyer, fenetres, soir=n.startswith("12"))
        obC.hide_render = n.startswith("11")
        if pos is None:                                        # vue de dessus en coupe (plan de la pièce)
            cam.data.type = "ORTHO"; cam.data.ortho_scale = max(taille[0] + .6, (taille[1] + .6) * 1.5); cam.location = (0, 0, taille[2] + 8); cam.rotation_euler = (0, 0, 0)
        else:
            cam.data.type = "PERSP"; cam.data.lens = lens; cam.location = pos; cam.rotation_euler = (cible - pos).to_track_quat("-Z", "Y").to_euler()
        f = os.path.join(dossier, n + ".png"); scene.render.filepath = f; bpy.ops.render.render(write_still=True); fichiers.append(f)
    obC.hide_render = False
    planche_12(dossier, fichiers)
    t_ancien = ancien
    for o in scene.objects: o.select_set(o in (obI, obC))
    bpy.context.view_layer.objects.active = obI; bpy.ops.object.join()
    exporter([obI, obL], os.path.join(dossier, nom + ".glb"))
    f1, t1 = faces([obI]); f2, t2 = faces([obL])
    L = [f"I_{nom} : {t1} triangles ; IL_{nom} : {t2} triangles ; total {t1 + t2}" + (f" (ancien intérieur : {t_ancien})" if t_ancien else ""),
         f"taille {taille}, porte {list(porte)}, foyer {list(foyer)}, {len(obs)} obstacles exportés (rectangles x, y, demi-largeurs)", ""] + L_a + [""] + L_p
    open(os.path.join(dossier, "controle.txt"), "w").write("\n".join(L) + "\n"); print("\n".join(L))
