# Le ponton de bois sur pieux : pieux goudronnés (kit : pilotis), deux longerons, planches en travers, un poteau
# d'amarrage entouré de corde et une échelle qui descend dans l'eau au bout. Il part de y = 0 et avance vers +Y.
# z : dessus des planches ; eau : niveau de l'eau (repère de la pièce). Fait du kit (pilotis, poutre, tore) et de l'échelle.
# Lancer seul : blender -b -P ponton.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."), os.path.dirname(os.path.abspath(__file__))]
from mathutils import Matrix
from kit import Piece, poutre, pilotis, tore
from materiaux import M
import echelle

def construire(graine=17, L=2.6, l=1.4, z=1.45, z_fond=-3.0, eau=-.2, avec_echelle=True, rive=None):
    """rive : matière des planches de rive (mêmes que celles du plancher de la maison, pour que les deux se suivent)."""
    P = Piece("P_ponton", graine); R = P.R; xp = l / 2 - .1
    n = max(1, round(L / 1.25))
    for i in range(n + 1):
        y = .15 + (L - .3) * i / n
        for sx in (-1, 1): pilotis(P, sx * xp, y, z_fond, z - .2, r=.13, eau=eau)
    for sx in (-1, 1): poutre(P, (sx * xp, -.05, z - .17), (sx * xp, L + .02, z - .17), l=.14, h=.18, mat="chene")   # longerons
    for i in range(1, n): poutre(P, (-xp, .15 + (L - .3) * i / n, z - .17), (xp, .15 + (L - .3) * i / n, z - .17), l=.12, h=.14, mat="chene")
    k = int(L / .24)
    for i in range(k):   # planches en travers, un peu inégales
        P.boite((R.uniform(-.03, .03), (i + .5) * L / k, z - .035), (l + R.uniform(-.04, .06), L / k - .018, .07), M("chene_c").couleur(R, .12), bev=0)
    if rive:
        for sx in (-1, 1): P.boite((sx * (l / 2 + .03), L / 2, z - .13), (.05, L + .02, .22), M(rive).couleur(R), bev=0)
        P.boite((0, L + .03, z - .13), (l + .1, .05, .22), M(rive).couleur(R), bev=0)
    # poteau d'amarrage au bout (le pieu qui dépasse), corde enroulée
    bx, by = xp, L - .15
    P.cylindre((bx, by, z - .2), (bx, by, z + .5), .13, .12, M("chene").couleur(R), n=6)
    P.cylindre((bx, by, z + .5), (bx, by, z + .56), .12, .07, M("chene").couleur(R), n=6)
    for j in range(2): tore(P, (bx, by, z + .24 + j * .08), .15, .038, M("corde").couleur(R), n=8, m=4)
    if avec_echelle:
        h = z + .55 - (eau - .7)
        P.ajouter(echelle.construire(h=h), Matrix.Translation((-l / 4, L + .11, eau - .7)))
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(z=1.0, eau=-.2), pied=(1.6, 3.0))
