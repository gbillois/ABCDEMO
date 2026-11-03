# La lanterne de façade : une potence de poutres fixée au mur, une lanterne de fer à quatre vitres et petit toit.
# Les vitres vont dans V (elles s'allument la nuit, comme les fenêtres). Le mur est derrière, vers +Y.
# Lancer seule : blender -b -P lanterne.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
from kit import Piece, poutre
from materiaux import M

def construire(V=None, o=(0, 0, 0), graine=7):
    """o : position de la lanterne dans la maison (pour la vitre, qui va dans V)."""
    P = Piece("P_lanterne", graine)
    poutre(P, (0, 0, -.35), (0, 0, .25), l=.12, h=.1)                  # platine contre le mur
    poutre(P, (0, 0, .15), (0, -.55, .15), l=.09, h=.11)               # bras
    poutre(P, (0, 0, -.25), (0, -.42, .12), l=.07, h=.07)              # jambe de force
    poutre(P, (0, -.5, .15), (0, -.5, .02), l=.03, h=.03, mat="fer")   # crochet
    for (dx, dy) in ((-.12, -.12), (.12, -.12), (-.12, .12), (.12, .12)):   # montants de fer
        poutre(P, (dx, -.5 + dy, -.38), (dx, -.5 + dy, .0), l=.03, h=.03, mat="fer")
    P.boite((0, -.5, -.4), (.3, .3, .05), M("fer").couleur(P.R), bev=0)
    P.cylindre((0, -.5, 0), (0, -.5, .12), .22, .03, M("fer").couleur(P.R), n=4)   # petit toit
    if V is not None: V.boite((o[0], o[1] - .5, o[2] - .19), (.22, .22, .34), M("vitre").teintes[0], bev=0)
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(.6, .8))
