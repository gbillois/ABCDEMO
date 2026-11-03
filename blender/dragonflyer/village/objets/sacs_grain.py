# Les sacs de grain du moulin : un tas de sacs de jute ocre de tailles variées (trois couchés, dont un sur les autres,
# un debout noué, un debout ouvert plein de grain), un peu de grain renversé. Faits des formes du kit.
# Le tas s'étend selon X (environ 1,5 m), le mur est derrière (+Y, à 0,4 m du centre au plus).
# Lancer seuls : blender -b -P sacs_grain.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
import math
from kit import Piece
from materiaux import M, melange

def sac(P, x, y, z=0.0, rz=0.0, couche=False, t=1.0, ouvert=False):
    """Un sac : panse (sphère déformée), col serré et nœud, ou col roulé et grain (ouvert). t : taille."""
    c = M("jute").couleur(P.R); ficelle = M("chene").couleur(P.R)
    if couche:
        ca, sa = math.cos(rz), math.sin(rz)
        P.sphere((x, y, z + .2 * t), .3 * t, c, (1.35 * abs(ca) + .95 * abs(sa), 1.35 * abs(sa) + .95 * abs(ca), .68), sub=1, jit=.02)
        bx, by = x + ca * .42 * t, y + sa * .42 * t
        P.cylindre((bx - ca * .04, by - sa * .04, z + .2 * t), (bx + ca * .1 * t, by + sa * .1 * t, z + .21 * t), .1 * t, .07 * t, c, n=6)
        P.cylindre((bx + ca * .02, by + sa * .02, z + .2 * t), (bx + ca * .05, by + sa * .05, z + .2 * t), .085 * t, .085 * t, ficelle, n=6)
        P.sphere((bx + ca * .16 * t, by + sa * .16 * t, z + .22 * t), .08 * t, c, (1, 1, .7), sub=1, jit=.02)
    elif ouvert:
        P.sphere((x, y, z + .3 * t), .3 * t, c, (1, 1, 1.05), sub=1, jit=.02)
        P.cylindre((x, y, z + .5 * t), (x, y, z + .62 * t), .25 * t, .29 * t, melange(c, M("jute").sombre, .2), n=8)   # col roulé
        P.cylindre((x, y, z + .55 * t), (x, y, z + .63 * t), .24 * t, .2 * t, M("paille").couleur(P.R), n=8)          # grain
    else:
        P.sphere((x, y, z + .32 * t), .3 * t, c, (1, .9, 1.15), sub=1, jit=.02)
        P.cylindre((x, y, z + .62 * t), (x, y, z + .74 * t), .1 * t, .07 * t, c, n=6)
        P.cylindre((x, y, z + .64 * t), (x, y, z + .67 * t), .085 * t, .085 * t, ficelle, n=6)
        P.sphere((x, y, z + .78 * t), .08 * t, c, (1.1, 1, .7), sub=1, jit=.02)

def construire(graine=17):
    P = Piece("P_sacs_grain", graine)
    sac(P, -.2, .12, rz=.1, couche=True, t=1.05)
    sac(P, .45, .08, rz=-.15, couche=True, t=.9)
    sac(P, .1, .1, z=.25, rz=.05, couche=True, t=.8)            # posé sur les deux autres
    sac(P, -.85, -.05, t=1.0)                                    # debout, noué
    sac(P, .95, -.1, t=.85, ouvert=True)                         # debout, ouvert
    for i in range(4):   # grain renversé
        P.sphere((.95 + P.R.uniform(-.25, .25), -.45 + P.R.uniform(-.1, .08), .0), P.R.uniform(.07, .12), M("paille").couleur(P.R), (1, 1, .3), sub=1)
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(1.6, 1.0))
