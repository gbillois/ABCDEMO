# Planche « forêt » : les deux arbres (arbres/sapin.py, arbres/feuillu.py) plantés comme dans le jeu, une soixantaine
# d'instances aux tailles et rotations du jeu, chacune avec sa teinte (materiaux.teinte_arbre) et un penchant de ±3° ; comme dans le jeu, l'arbre de près est dessiné jusqu'à 90 m de la caméra,
# l'imposteur au-delà. Quatre vues : dans la forêt, depuis la lisière, en vol de dragon, de très haut.
# Lancer : blender -b -P foret.py -- <dossier>   (foret_*.png et planche_foret.png)
import sys, os; ICI = os.path.dirname(os.path.abspath(__file__)); sys.path[:0] = [ICI, os.path.join(ICI, "arbres")]
import math, random
import bpy
from mathutils import Vector
import apercu as ap
from materiaux import teinte_arbre
import sapin, feuillu

DIST_PRES = 90.0   # comme rayonPres du jeu (95 m sur ordinateur, 70 m sur tablette)

def main():
    dossier = ap.sortie(); ap.scene_vide()
    tex = ap.textures(dossier); mats = None; especes = []
    for mod, nom in ((sapin, "pin"), (feuillu, "feuillu")):
        ob = mod.construire().objet(); ob.name = f"T_{nom}_0"; ap.cuire_occlusion(ob)
        if mats is None: mats = ap.materiaux_rendu(tex)
        ap.appliquer_rendu(ob, mats)
        imp, chemin = ap.imposteur(ob, nom, dossier, mats); imp.data.materials[0] = ap.materiau_imposteur(chemin, nom); print(ap.calibrer(ob, imp, chemin, dossier))
        ob.hide_render = imp.hide_render = True; especes.append((ob, imp, mod.H))
    # plantation : tirage avec distance minimale (comme une forêt du jeu), sapins un peu plus nombreux
    R = random.Random(4); arbres = []
    while len(arbres) < 64:
        x, y = R.uniform(-70, 70), R.uniform(6, 230)
        if abs(x) < 7 and y < 30: continue                       # une petite clairière devant la caméra « dans la forêt »
        if any((x - a[0]) ** 2 + (y - a[1]) ** 2 < 7.5 ** 2 for a in arbres): continue
        t = 0 if R.random() < .55 else 1; sc = (.75 + R.random() * .7) * (1.1 if t else 1.25); sy = sc * (.9 + R.random() * .3)
        arbres.append((x, y, t, sc, sy, R.uniform(0, 6.28), teinte_arbre(R), (R.uniform(-.052, .052), R.uniform(-.052, .052))))   # teinte, penchant ±3°
    paires = []
    for i, (x, y, t, sc, sy, rot, coul, pen) in enumerate(arbres):
        ob, imp, _ = especes[t]; p = []
        for src in (ob, imp):
            o = bpy.data.objects.new(f"{src.name}_{i}", src.data); bpy.context.scene.collection.objects.link(o)
            o.location = (x, y, -.3); o.rotation_euler = (*pen, rot); o.scale = (sc, sc, sy); o.color = (*coul, 1); p.append(o)
        paires.append(p)
    ap.decor(1500)
    vues = [("foret_1_dans_la_foret", Vector((-1.5, 16, 1.6)), Vector((-9, 60, 6)), 22),
            ("foret_2_lisiere", Vector((-6, -28, 1.7)), Vector((0, 40, 7)), 28),
            ("foret_3_vol", Vector((-55, -45, 48)), Vector((0, 70, 4)), 30),
            ("foret_4_haut", Vector((10, -150, 160)), Vector((0, 110, 0)), 32)]
    def avant(nom):
        cam = next(v[1] for v in vues if v[0] == nom)
        for (pres, loin) in paires:
            d = (Vector(pres.location) + Vector((0, 0, 6)) - cam).length
            pres.hide_render = d > DIST_PRES; loin.hide_render = d <= DIST_PRES - 6
    ap.rendre(dossier, vues, planche="planche_foret.png", cols=2, avant=avant)

main()
