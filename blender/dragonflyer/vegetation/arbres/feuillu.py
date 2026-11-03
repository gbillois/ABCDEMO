# Le feuillu de la forêt : un tronc trapu à contreforts, une fourche en quatre maîtresses branches et une flèche
# (pied sculpté d'une seule peau avec ses contreforts, qui monte jusque dans la fourche : kit.pied_sculpte ;
# les maîtresses branches naissent dedans et en sortent),
# des rameaux qui portent chacun une touffe de feuilles. Les touffes sont posées d'abord (règle : trois couronnes
# et un sommet sur une boule aplatie), puis les branches poussent vers elles : la couronne est ronde et pleine,
# et chaque touffe tient à une branche (rien ne flotte). Fait seulement des pièces du kit.
# 10 m de haut (le jeu l'agrandit de 0,8 à 1,6 fois), pied à l'origine.
# Lancer seul : blender -b -P feuillu.py -- <dossier>   (12 rendus, planche, controle.txt, feuillu.glb, imposteur)
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
import math
from mathutils import Vector
from kit import Arbre, pied_sculpte, tube, courbe, touffe
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
    # 2. le pied : un seul cylindre sculpté, du sous-sol à la fourche, avec cinq contreforts qui plongent sous le sol
    F = Vector((R.uniform(-.15, .15), R.uniform(-.15, .15), FOURCHE))
    def rayon(z):   # fût évasé au pied, qui s'élargit encore un peu vers la fourche, puis se referme au-dessus (sous les branches)
        r = .56 - .1 * max(0, z) / F.z + .07 * math.exp(-max(z, 0) / .3)
        t = min(1, max(0, (z - (F.z - 1.0)) / 1.0)); r += .07 * t * t * (3 - 2 * t)
        return max(.16, r - max(0, z - (F.z + .15)) * .7)
    ph = R.uniform(0, 6.28)
    contreforts = [(ph + 2 * math.pi * (k + R.uniform(-.15, .15)) / 5, R.uniform(1.0, 1.5), R.uniform(.38, .5)) for k in range(5)]
    hauteurs = [-.75, -.35, -.12, .02, .12, .25, .42, .68, 1.1, 1.8, 2.5, F.z - .3, F.z + .15, F.z + .6]
    n0 = len(A.bm.faces)
    pied_sculpte(A, hauteurs, rayon, contreforts, cols=28, teinte=e, axe=lambda z: Vector((F.x, F.y, 0)) * max(0, z) / F.z)
    # 3. maîtresses branches : nées dans le haut du pied (qui se referme en douceur au-dessus de la fourche), elles en
    #    sortent comme d'un fût ; deux partent un peu plus bas que les autres ; chacune finit, arrondie, au centre
    #    de la touffe la plus proche (son bout ne se voit jamais)
    print("pied", len(A.bm.faces) - n0, "faces"); n0 = len(A.bm.faces)
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
        c, r = min(groupes[j], key=lambda cr: (cr[0] - M).length) if groupes[j] else (M, 0)
        z0 = F.z - (.85 if j in (0, 2) else .6)
        dh = Vector((M.x - F.x, M.y - F.y, 0)); dh = dh.normalized() * .2 if dh.length > .1 else dh   # part déjà du côté où elle va
        tube(A, [Vector((F.x, F.y, z0)) + dh, F + dh * 1.2 + Vector((0, 0, .1)), F + (M - F) * .5 + Vector((0, 0, .12 if j < 4 else 0)), M, c],
             [.33, .31, .29, .22, .07] if j < 4 else [.33, .3, .28, .21, .07], n=7, pas=.8, teinte=e, bout=True)
    print("branches", len(A.bm.faces) - n0, "faces"); n0 = len(A.bm.faces)
    for j, M in enumerate(meres):
        # 4. rameaux : du bout de la maîtresse branche jusque dans chaque touffe (le bout se cache dans la touffe)
        proche = min(groupes[j], key=lambda cr: (cr[0] - M).length)[0] if groupes[j] else None
        for c, r in groupes[j]:
            if c is proche: continue          # la maîtresse branche y va déjà
            fin = c - (c - M).normalized() * r * .25
            tube(A, courbe(M - (c - M).normalized() * .15, fin, .25 if c.z > M.z else -.15, 3, R, .08), [.2, .15, .1], n=4, pas=1.6, teinte=e, bout=True)
    print("rameaux", len(A.bm.faces) - n0, "faces"); n0 = len(A.bm.faces)
    # 5. les touffes (cœur opaque + bouquets en cartes)
    for c, r in touffes:
        touffe(A, c, r, ech=(1, 1, .82), ncartes=60, taille=.95, inclin=34, jit=.05, coeur=.55)
    return A

if __name__ == "__main__":
    from apercu import apercu_arbre
    apercu_arbre(construire(), "feuillu", BUDGET, H, AX.x + 1.5, ZC, sous=((1.6, -1.3, 1.3), (0, .3, 7.0)), pied=((2.0, -3.0, .9), (0, 0, .7)))
