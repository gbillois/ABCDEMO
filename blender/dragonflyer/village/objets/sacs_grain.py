# Les sacs de grain du moulin : sacs de jute ventrus (deux couchés, un debout), col noué d'une ficelle, un peu de grain
# renversé. Faits des formes du kit (sphères déformées, cylindres).
# Lancer seuls : blender -b -P sacs_grain.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
import math
from kit import Piece
from materiaux import M

def sac(P, x, y, rz=0.0, couche=False):
    """Un sac : panse (sphère aplatie), col serré, oreilles du nœud. Couché, il s'allonge selon rz."""
    c = M("jute").couleur(P.R)
    if couche:
        ca, sa = math.cos(rz), math.sin(rz)
        P.sphere((x, y, .2), .3, c, (1.35 * abs(ca) + .95 * abs(sa), 1.35 * abs(sa) + .95 * abs(ca), .68), sub=1, jit=.02)
        bx, by = x + ca * .42, y + sa * .42
        P.cylindre((bx - ca * .04, by - sa * .04, .2), (bx + ca * .1, by + sa * .1, .21), .1, .07, c, n=6)
        P.cylindre((bx + ca * .02, by + sa * .02, .2), (bx + ca * .05, by + sa * .05, .2), .085, .085, M("chene").couleur(P.R), n=6)   # ficelle
        P.sphere((bx + ca * .16, by + sa * .16, .22), .08, c, (1, 1, .7), sub=1, jit=.02)
    else:
        P.sphere((x, y, .32), .3, c, (1, .9, 1.15), sub=1, jit=.02)
        P.cylindre((x, y, .62), (x, y, .74), .1, .07, c, n=6)
        P.cylindre((x, y, .64), (x, y, .67), .085, .085, M("chene").couleur(P.R), n=6)                                              # ficelle
        P.sphere((x, y, .78), .08, c, (1.1, 1, .7), sub=1, jit=.02)

def construire(graine=17):
    P = Piece("P_sacs_grain", graine)
    sac(P, 0, .05, rz=.15, couche=True)
    sac(P, .1, -.5, rz=-.1, couche=True)
    sac(P, -.68, -.15)
    for i in range(5):   # grain renversé
        P.sphere((.45 + P.R.uniform(-.15, .2), -.85 + P.R.uniform(-.12, .1), .0), P.R.uniform(.07, .12), M("paille").couleur(P.R), (1, 1, .3), sub=1)
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(1.3, 1.2))
