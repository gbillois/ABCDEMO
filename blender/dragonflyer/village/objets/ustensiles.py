# Les ustensiles accrochés près du feu : une barre de bois au mur avec trois crochets de fer, une poêle de cuivre, une
# louche et un panier d'osier suspendus. Le mur est derrière (y = 0), tout s'avance de 15 cm au plus vers -Y.
# Pied à l'origine (au sol, sous la barre) ; barre à Z. Lancer seuls : blender -b -P ustensiles.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
from kit import Piece, poutre
from materiaux import M

Z = 1.7

def construire(graine=89, L=.8):
    P = Piece("P_ustensiles", graine); R = P.R
    poutre(P, (-L / 2, -.03, Z), (L / 2, -.03, Z), l=.06, h=.07, mat="chene", bev=0)                    # barre
    xs = (-.26, .02, .27)
    for x in xs: poutre(P, (x, -.065, Z - .02), (x, -.065, Z - .1), l=.015, h=.015, mat="fer", bev=0)    # crochets
    x = xs[0]                                                                                            # poêle (accrochée par le manche)
    poutre(P, (x, -.06, Z - .1), (x, -.06, Z - .36), l=.03, h=.02, mat="fer", bev=0)
    P.cylindre((x, -.03, Z - .52), (x, -.08, Z - .52), .16, .14, M("cuivre").couleur(R), n=10)
    x = xs[1]                                                                                            # louche
    poutre(P, (x, -.06, Z - .1), (x, -.06, Z - .45), l=.025, h=.02, mat="chene_c", bev=0)
    P.cylindre((x, -.03, Z - .5), (x, -.11, Z - .5), .045, .06, M("cuivre").couleur(R), n=7)
    x = xs[2]                                                                                            # panier suspendu
    for s in (-1, 1): poutre(P, (x, -.065, Z - .1), (x + s * .1, -.13, Z - .24), l=.015, h=.015, mat="corde", bev=0)
    P.cylindre((x, -.13, Z - .42), (x, -.13, Z - .24), .08, .12, M("paille").couleur(R), n=8)
    P.cylindre((x, -.13, Z - .245), (x, -.13, Z - .225), .125, .125, M("chene_c").couleur(R), n=8)       # bord tressé
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(.9, .3))
