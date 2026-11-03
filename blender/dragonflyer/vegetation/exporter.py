# Les arbres pour le jeu : sapin et feuillu de près (T_pin_0, T_feuillu_0 : écorce puis feuillage, couleurs des sommets
# « Col » = lumière peinte et occlusion, normales choisies) et leurs imposteurs (T_pin_1, T_feuillu_1 : trois plans,
# image en trois vues, étalonnée sur l'arbre de près), plus les textures aux noms que le jeu attend.
# Lancer : blender -b -P exporter.py -- <dossier>      → <dossier>/arbres.glb (à passer en meshopt) et arbres_*.webp
# puis :   gltf-transform meshopt <dossier>/arbres.glb dragonflyer/assets/arbres.glb ; copier les .webp dans dragonflyer/assets/
import sys, os; ICI = os.path.dirname(os.path.abspath(__file__)); sys.path[:0] = [ICI, os.path.join(ICI, "arbres")]
import bpy
import apercu as ap
import sapin, feuillu

def main():
    dossier = ap.sortie(); ap.scene_vide()
    tex = ap.textures(dossier); mats = None; objets = []; images = []
    for mod, nom in ((sapin, "pin"), (feuillu, "feuillu")):
        ob = mod.construire().objet(); ob.name = f"T_{nom}_0"; ap.cuire_occlusion(ob)
        if mats is None: mats = ap.materiaux_rendu(tex)
        vrais = list(ob.data.materials); ap.appliquer_rendu(ob, mats)
        imp, chemin = ap.imposteur(ob, nom, dossier, mats); vrai_loin = imp.data.materials[0]
        imp.data.materials[0] = ap.materiau_imposteur(chemin, nom); print(ap.calibrer(ob, imp, chemin, dossier))
        for i, m in enumerate(vrais): ob.data.materials[i] = m          # matières « vides » (le jeu fait les siennes)
        imp.data.materials[0] = vrai_loin
        # noms des maillages distincts des noms d'objets : le GLTFLoader nomme les morceaux d'un maillage à deux matières
        # « <maillage>_0 », « <maillage>_1 » ; un maillage « T_feuillu » donnerait un morceau « T_feuillu_1 », pris pour l'imposteur
        ob.data.name = f"maillage_{nom}_pres"; imp.data.name = f"maillage_{nom}_loin"
        print(nom, ap.triangles(ob), "triangles de près,", ap.triangles(imp), "de loin")
        objets += [ob, imp]; images.append((chemin, f"arbres_loin_{nom}.webp", 512))
    ap.exporter(objets, os.path.join(dossier, "arbres.glb"))
    # textures du jeu (WebP) : écorce 512², aiguilles et feuilles 1024², imposteurs 512 de haut
    sc = bpy.context.scene; sc.render.image_settings.quality = 88
    for src, dst, haut in [(tex["ecorce"], "arbres_ecorce.webp", 512), (tex["pin"], "arbres_pin.webp", 1024), (tex["feuilles"], "arbres_feuilles.webp", 1024)] + images:
        im = bpy.data.images.load(src); im.reload(); _ = im.pixels[0]
        w, h = im.size
        if h != haut: im.scale(max(1, round(w * haut / h)), haut)
        im.file_format = "WEBP"; im.filepath_raw = os.path.join(dossier, dst); im.save(); print("texture", dst, tuple(im.size))

main()
