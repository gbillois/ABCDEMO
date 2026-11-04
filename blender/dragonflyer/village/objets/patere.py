# Le portemanteau : planche clouée au mur, trois chevilles de bois ; une cape de laine bleue à capuchon, une besace
# de toile et un chapeau de feutre accrochés. Le mur est derrière (y = 0), tout s'avance vers -Y (12 cm au plus).
# Pied à l'origine (au sol, sous la planche) ; la planche est à 1,65 m. Lancer seul : blender -b -P patere.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
from kit import Piece, poutre, planche, boite_douce
from materiaux import M

Z = 1.65

def construire(graine=85, L=.9):
    P = Piece("P_patere", graine); R = P.R
    P.boite((0, -.015, Z), (L, .03, .12), M("chene").couleur(R), bev=0)                                   # planche
    xs = (-L / 3, 0, L / 3)
    for x in xs: poutre(P, (x, -.03, Z), (x, -.13, Z + .03), l=.035, h=.035, mat="chene_c", bev=0)        # chevilles
    x = xs[0]                                                                                             # cape à capuchon
    boite_douce(P, (x, -.075, Z - .08), (.24, .1, .16), M("laine_b").couleur(R), arrondi=.04, seg=1)       # capuchon replié
    boite_douce(P, (x, -.06, Z - .55), (.44, .08, .82), M("laine_b").couleur(R), arrondi=.035, seg=1)      # cape qui pend
    x = xs[1]                                                                                             # besace
    poutre(P, (x - .1, -.07, Z - .38), (x, -.1, Z + .02), l=.025, h=.01, mat="cuir", bev=0)
    poutre(P, (x + .1, -.07, Z - .38), (x, -.1, Z + .02), l=.025, h=.01, mat="cuir", bev=0)
    boite_douce(P, (x, -.06, Z - .52), (.3, .08, .3), M("jute").couleur(R), arrondi=.035, seg=1)
    P.boite((x, -.105, Z - .45), (.28, .015, .14), M("jute").sombre, bev=0)                               # rabat
    x = xs[2]                                                                                             # chapeau de feutre
    P.cylindre((x, -.02, Z - .02), (x, -.05, Z - .02), .17, .17, M("cuir").couleur(R), n=10)              # bord (posé contre le mur)
    P.cylindre((x, -.05, Z - .02), (x, -.15, Z - .02), .1, .085, M("cuir").couleur(R), n=8)               # calotte
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(1.0, .3))
