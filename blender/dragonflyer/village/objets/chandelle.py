# La chandelle sur son bougeoir de cuivre (coupelle, anneau) : cire crème un peu coulée ; la flamme va dans V
# (elle brille). Pied à l'origine. o : position du bougeoir dans la pièce (pour la flamme, qui va dans V).
# Lancer seule : blender -b -P chandelle.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
from kit import Piece
from materiaux import M

def construire(V=None, o=(0, 0, 0), graine=75, h=.15):
    P = Piece("P_chandelle", graine)
    P.cylindre((0, 0, 0), (0, 0, .02), .075, .065, M("cuivre").couleur(P.R), n=10)          # coupelle
    P.cylindre((0, 0, .02), (0, 0, .045), .03, .035, M("cuivre").couleur(P.R), n=8)
    P.boite((.085, 0, .03), (.04, .015, .04), M("cuivre").couleur(P.R), bev=0)              # anneau (prise)
    P.cylindre((0, 0, .04), (0, 0, .04 + h), .024, .022, M("cire").couleur(P.R), n=8)        # cire
    P.sphere((.02, 0, .05 + h * .55), .012, M("cire").couleur(P.R), (1, 1, 2.2), sub=1)      # une coulure
    if V is not None:
        x, y, z = o
        V.cylindre((x, y, z + .045 + h), (x, y, z + .1 + h), .016, .002, M("flamme").teintes[0], n=5)
        V.sphere((x, y, z + .058 + h), .013, M("flamme").teintes[1], sub=1)
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(.3, .3))
