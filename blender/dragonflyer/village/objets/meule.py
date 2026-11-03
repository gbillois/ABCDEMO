# La meule de rechange, posée contre le mur du moulin : disque de pierre claire, œil carré au centre cerclé de fer,
# rainures rayonnantes sur la face, calée par deux cales de bois. Le mur est derrière, vers +Y.
# Lancer seule : blender -b -P meule.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
import math
from mathutils import Vector
from kit import Piece, poutre
from materiaux import M

def construire(graine=19, r=.6, ep=.24, penche=.22):
    P = Piece("P_meule", graine)
    d = Vector((0, math.sin(penche), math.cos(penche)))          # le haut de la meule penche vers le mur (+Y)
    n = Vector((0, -math.cos(penche), math.sin(penche)))          # normale de la face visible
    c0 = Vector((0, 0, r * math.cos(penche) + .02)) + Vector((0, ep / 2 * math.sin(penche), 0))
    P.cylindre(c0 - n * ep / 2, c0 + n * ep / 2, r, r, M("moellon").couleur(P.R, .03), n=14)
    P.cylindre(c0 + n * (ep / 2 - .02), c0 + n * (ep / 2 + .02), r * .26, r * .26, M("fer").couleur(P.R), n=8)           # cercle de fer de l'œil
    P.cylindre(c0 + n * (ep / 2 - .01), c0 + n * (ep / 2 + .03), r * .16, r * .16, M("moellon").sombre, n=4)              # l'œil (sombre)
    t = Vector((1, 0, 0))
    for k in range(6):   # rainures rayonnantes
        a = k * math.pi / 3 + .3; u = t * math.cos(a) + d * math.sin(a)
        p0 = c0 + n * (ep / 2 + .005) + u * r * .3; p1 = c0 + n * (ep / 2 + .005) + u * r * .9
        poutre(P, p0, p1, l=.05, h=.02, c=M("moellon").sombre, bev=0)
    for s in (-1, 1): P.boite((s * r * .55, -.1, .06), (.16, .3, .12), M("chene").couleur(P.R), bev=.02)                  # cales
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(1.3, .6))
