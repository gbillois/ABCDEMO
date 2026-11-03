# Le baquet de trempe du forgeron : un tonneau bas (objets/tonneau.py) rempli d'eau, une louche posée sur le bord.
# Lancer seul : blender -b -P baquet.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."), os.path.dirname(os.path.abspath(__file__))]
from kit import Piece, poutre
from materiaux import M
import tonneau

def construire(graine=49, r=.38, h=.55):
    P = Piece("P_baquet", graine)
    P.ajouter(tonneau.construire(graine=graine, r=r, h=h))
    P.cylindre((0, 0, h - .05), (0, 0, h - .025), r * .84, r * .84, M("eau").couleur(P.R), n=10)   # eau
    poutre(P, (-.1, 0, h - .01), (r + .12, .05, h + .12), l=.03, h=.03, mat="chene_c", bev=0)      # louche
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(.9, .9))
