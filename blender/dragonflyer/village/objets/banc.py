# Le banc de bois devant les maisons : deux pieds en poutres, une assise de deux planches, un dossier. Fait du kit (poutre).
# Lancer seul : blender -b -P banc.py -- <dossier>  (12 aperçus et banc.glb)
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
import math
from kit import Piece, poutre, planche

def construire(graine=3):
    P = Piece("P_banc", graine); L = 1.6
    for s in (-1, 1):
        x = s * (L / 2 - .2)
        for dy in (-.15, .15): poutre(P, (x, dy, 0), (x, dy - .04, .44), l=.09, h=.09)        # pieds un peu écartés
        poutre(P, (x, -.22, .4), (x, .26, .4), l=.1, h=.08)                                    # traverse sous l'assise
        poutre(P, (x, .24, .4), (x, .32, .95), l=.08, h=.08)                                   # montant du dossier
    for dy in (-.1, .1): planche(P, (0, dy, .47), (L, .19, .06))                               # assise
    planche(P, (0, .3, .82), (L - .1, .16, .05))                                                # dossier
    poutre(P, (-L / 2 + .2, 0, .14), (L / 2 - .2, 0, .14), l=.07, h=.07)                        # entretoise
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(1.7, .7))
