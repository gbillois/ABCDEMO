# Le feuillu de la forêt : un tronc trapu à contreforts, une fourche en quatre maîtresses branches et une flèche,
# des rameaux qui portent chacun une touffe de feuilles. Les touffes sont posées d'abord (règle : trois couronnes
# et un sommet sur une boule aplatie), puis les branches poussent vers elles : la couronne est ronde et pleine,
# et chaque touffe tient à une branche (rien ne flotte). Fait seulement des pièces du kit.
# 10 m de haut (le jeu l'agrandit de 0,8 à 1,6 fois), pied à l'origine.
# Lancer seul : blender -b -P feuillu.py -- <dossier>   (12 rendus, planche, controle.txt, feuillu.glb, imposteur)
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
import math
from mathutils import Vector
from kit import Arbre, tube, racines, courbe, touffe
from materiaux import TEINTE_ECORCE

H = 10.0
ZC = 6.5                          # centre de la couronne
AX = Vector((3.7, 3.7, 2.7))      # demi-axes de la couronne (centres des touffes un peu en dedans)
FOURCHE = 3.3
BUDGET = 4000

def construire(graine=8):
    A = Arbre("T_feuillu", graine, feuillage="Feuilles"); R = A.R; e = TEINTE_ECORCE["feuillu"]
    A.couronne = (Vector((0, 0, ZC)), Vector((AX.x + 1.2, AX.y + 1.2, AX.z + 1.1)))
    # 1. les touffes : sommet, couronne haute, couronne du milieu, couronne basse (décalées d'un demi-pas)
    touffes = [(Vector((R.uniform(-.3, .3), R.uniform(-.3, .3), ZC + AX.z * .72)), 1.9)]
    for nb, el, k, ray in ((5, 42, .7, 1.85), (7, 4, .72, 1.95), (5, -36, .62, 1.75)):
        ph = R.uniform(0, 6.28)
        for i in range(nb):
            a = ph + 2 * math.pi * (i + R.uniform(-.15, .15)) / nb; e_ = math.radians(el + R.uniform(-6, 6))
            d = Vector((math.cos(a) * math.cos(e_) * AX.x, math.sin(a) * math.cos(e_) * AX.y, math.sin(e_) * AX.z)) * k
            touffes.append((Vector((0, 0, ZC)) + d, ray * R.uniform(.92, 1.08)))
    # 2. le tronc jusqu'à la fourche, légèrement penché
    F = Vector((R.uniform(-.15, .15), R.uniform(-.15, .15), FOURCHE))
    # le tronc s'évase au pied et s'amincit dans la fourche : au-dessus de F il est caché dans la base des branches
    tube(A, courbe((0, 0, -.35), F + Vector((0, 0, .35)), 0, 4, R, .05), [.82, .62, .54, .5, .46, .3], n=10, pas=.7, teinte=e, bout=True)
    racines(A, .6, n=5, long=1.1, teinte=e, z_haut=.9)
    # 3. maîtresses branches : quatre directions, plus la flèche vers le sommet ; chaque touffe va à la plus proche
    meres = []
    ph = R.uniform(0, 6.28)
    for i in range(4):
        a = ph + i * math.pi / 2 + R.uniform(-.2, .2); d = Vector((math.cos(a), math.sin(a), 0))
        meres.append(F + d * 1.6 + Vector((0, 0, 1.5 + R.uniform(-.2, .3))))
    meres.append(F + Vector((R.uniform(-.2, .2), R.uniform(-.2, .2), 2.9)))
    groupes = [[] for _ in meres]
    for c, r in touffes:
        if c.z > ZC + AX.z * .5: j = 4
        else: j = min(range(4), key=lambda j: (Vector((c.x, c.y, 0)).normalized() - Vector((meres[j].x - F.x, meres[j].y - F.y, 0)).normalized()).length)
        groupes[j].append((c, r))
    for j, M in enumerate(meres):
        # chaque maîtresse branche naît dans le tronc, sous la fourche, et en sort en s'élargissant (Y continu, sans collerette)
        depart = F - Vector((0, 0, .9)) + (Vector((M.x - F.x, M.y - F.y, 0)) * .05)
        tube(A, [depart, F + (M - F) * .12, F + (M - F) * .55 + Vector((0, 0, .1 if j < 4 else 0)), M], [.3, .44, .36, .28] if j < 4 else [.3, .42, .32, .25], n=8, pas=.7, teinte=e, bout=True)
        # 4. rameaux : de la maîtresse branche jusque dans chaque touffe (le bout se cache dans la touffe)
        for c, r in groupes[j]:
            fin = c - (c - M).normalized() * r * .25
            tube(A, courbe(M - (c - M).normalized() * .15, fin, .25 if c.z > M.z else -.15, 3, R, .08), [.22, .16, .1], n=5, pas=.85, teinte=e, bout=True)
    # 5. les touffes (cœur opaque + bouquets en cartes)
    for c, r in touffes:
        touffe(A, c, r, ech=(1, 1, .82), ncartes=24, taille=.9, inclin=34, jit=.03)
    return A

if __name__ == "__main__":
    from apercu import apercu_arbre
    apercu_arbre(construire(), "feuillu", BUDGET, H, AX.x + 1.5, ZC, sous=((1.6, -1.3, 1.3), (0, .3, 7.0)), pied=((2.0, -3.0, .9), (0, 0, .7)))
