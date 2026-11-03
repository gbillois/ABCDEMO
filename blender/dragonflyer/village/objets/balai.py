# Le balai de paille appuyé contre un mur : manche de bois, botte de paille liée de deux tours de ficelle.
# Posé au sol en (0, 0, 0), il penche vers le mur (+Y) ; haut du manche à 1,25 m.
# Lancer seul : blender -b -P balai.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
from mathutils import Vector
from kit import Piece, poutre
from materiaux import M

def construire(graine=23, haut=1.25, penche=.22):
    P = Piece("P_balai", graine)
    bas, sommet = Vector((0, 0, .0)), Vector((0, penche, haut))
    d = (sommet - bas).normalized()
    P.cylindre(bas, bas + d * .42, .13, .05, M("paille").couleur(P.R), n=8)                         # botte de paille
    for t in (.24, .33): P.cylindre(bas + d * t, bas + d * (t + .03), .085 - t * .06, .085 - t * .06, M("chene").sombre, n=8)   # ficelle
    poutre(P, bas + d * .3, sommet, l=.045, h=.045, mat="chene_c", bev=0)                           # manche
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(.4, .5))
