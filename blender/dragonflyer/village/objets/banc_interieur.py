# Le banc d'intérieur (sans dossier, le long d'une table) : assise d'une planche épaisse sur deux tréteaux en A,
# entretoise. Pied à l'origine, assise selon X, dessus à h. Fait du kit (poutre, planche).
# Lancer seul : blender -b -P banc_interieur.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
from kit import Piece, poutre, planche

def construire(graine=63, L=1.5, h=.46, l=.3):
    P = Piece("P_banc_interieur", graine)
    planche(P, (0, 0, h - .03), (L, l, .06), mat="chene_c")                                     # assise
    for s in (-1, 1):
        x = s * (L / 2 - .2)
        for t in (-1, 1): poutre(P, (x, t * .14, 0), (x, t * .06, h - .06), l=.07, h=.07, bev=0)   # tréteau en A
        poutre(P, (x, -.13, h - .1), (x, .13, h - .1), l=.07, h=.07, bev=0)
    poutre(P, (-L / 2 + .2, 0, .17), (L / 2 - .2, 0, .17), l=.06, h=.06, bev=0)                # entretoise
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(1.6, .4))
