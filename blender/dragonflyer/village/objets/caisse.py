# La caisse de bois : un coffre de planches, quatre montants d'angle, un couvercle de deux planches. Pied à l'origine.
# Lancer seule : blender -b -P caisse.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
from kit import Piece, poutre, planche
from materiaux import M

def construire(graine=47, L=.7, l=.5, h=.45):
    P = Piece("P_caisse", graine); R = P.R
    P.boite((0, 0, h / 2), (L - .04, l - .04, h - .02), M("chene_c").couleur(R, .1), bev=0)
    for sx in (-1, 1):
        for sy in (-1, 1): poutre(P, (sx * (L / 2 - .03), sy * (l / 2 - .03), 0), (sx * (L / 2 - .03), sy * (l / 2 - .03), h), l=.07, h=.07, mat="chene")
    for dy in (-l / 4, l / 4): planche(P, (0, dy, h + .015), (L + .02, l / 2 - .01, .04))
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(.8, .6))
