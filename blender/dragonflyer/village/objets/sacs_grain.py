# Les sacs de grain du moulin : sacs de toile crème-ocre, plus hauts que larges, renflés en bas, col plissé et noué
# d'une ficelle, petite houppe au-dessus. Un tas : deux sacs couchés côte à côte, un troisième couché dessus, un sac
# debout noué et un sac debout ouvert, plein de grain. Faits des formes du kit (cylindres).
# Le tas s'étend selon X (environ 2 m), le mur est derrière (+Y, à 0,52 m du centre au plus).
# Lancer seuls : blender -b -P sacs_grain.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
from mathutils import Vector
from kit import Piece
from materiaux import M, melange

def sac(P, p0, ax, t=1.0, ouvert=False):
    """Un sac dont le fond est en p0 et qui monte selon ax (vertical : debout ; horizontal : couché, p0 à hauteur du
    rayon). Panse renflée en deux cylindres, col plissé, ficelle, houppe ; ou col roulé et grain s'il est ouvert."""
    p0, ax = Vector(p0), Vector(ax).normalized(); L, r = .58 * t, .25 * t
    c = M("jute").couleur(P.R); cs = melange(c, M("jute").sombre, .3)
    P.cylindre(p0, p0 + ax * L * .4, r * .88, r, c, n=8)                                  # bas de la panse
    P.cylindre(p0 + ax * L * .4, p0 + ax * L, r, r * .7, c, n=8)                          # haut de la panse
    if ouvert:
        P.cylindre(p0 + ax * L, p0 + ax * (L + .07 * t), r * .78, r * .82, cs, n=8)        # col roulé
        P.cylindre(p0 + ax * (L - .02), p0 + ax * (L + .05 * t), r * .66, r * .4, M("paille").couleur(P.R), n=8)   # grain
    else:
        P.cylindre(p0 + ax * L, p0 + ax * (L + .11 * t), r * .7, r * .2, cs, n=6)          # col plissé
        P.cylindre(p0 + ax * (L + .08 * t), p0 + ax * (L + .12 * t), r * .27, r * .27, M("chene").couleur(P.R), n=6)   # ficelle
        P.cylindre(p0 + ax * (L + .11 * t), p0 + ax * (L + .22 * t), r * .2, r * .42, c, n=6)   # houppe

def construire(graine=17):
    P = Piece("P_sacs_grain", graine)
    r = .25
    for y in (-.26, .26): sac(P, (-.38, y, r), (1, 0, 0), t=1.0)                         # deux sacs couchés côte à côte
    sac(P, (.4, 0, r * .9 + .42), (-1, 0, 0), t=.9)                                       # un troisième couché dessus
    sac(P, (-.8, .05, 0), (0, 0, 1), t=1.1)                                               # debout, noué
    sac(P, (.75, -.08, 0), (0, 0, 1), t=.95, ouvert=True)                                 # debout, ouvert
    for i in range(3):   # grain renversé au pied du sac ouvert
        P.sphere((.75 + P.R.uniform(-.2, .2), -.42 + P.R.uniform(-.08, .06), .0), P.R.uniform(.07, .11), M("paille").couleur(P.R), (1, 1, .3), sub=1)
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(2.0, 1.1))
