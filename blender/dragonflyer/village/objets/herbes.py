# Les herbes séchées suspendues à une poutre : une ficelle tendue sous la poutre (z = 0), des bouquets tête en bas
# (tiges liées, têtes de sauge, de thym, de lavande) et une tresse d'aulx au bout. Tout pend sous z = 0, sur 45 cm au plus.
# Pied à l'origine (sous la poutre), le long de X. Lancer seules : blender -b -P herbes.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
from kit import Piece, poutre
from materiaux import M

def construire(graine=77, L=1.1, n=5, ail=True):
    P = Piece("P_herbes", graine); R = P.R
    poutre(P, (-L / 2, 0, -.015), (L / 2, 0, -.015), l=.015, h=.015, mat="corde", bev=0)   # ficelle
    for k in range(n):
        x = -L / 2 + (k + .5) * L / (n + (1 if ail else 0)) + R.uniform(-.03, .03)
        mat = "lavande" if k == 1 else "herbe_s"; z0 = -.03 - R.uniform(0, .05)
        P.cylindre((x, 0, -.01), (x, 0, z0 - .1), .018, .025, M("herbe_s").sombre, n=4)        # tiges liées
        P.cylindre((x, 0, z0 - .08), (x, 0, z0 - .08 - R.uniform(.22, .3)), .03, .09, M(mat).couleur(R), n=6, jit=.008)   # têtes
    if ail:
        x = L / 2 - .1
        for j in range(4): P.sphere((x + (j % 2) * .03 - .015, 0, -.07 - j * .07), .04, M("lin").couleur(R), (1, 1, .9), sub=1)
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(1.2, .3))
