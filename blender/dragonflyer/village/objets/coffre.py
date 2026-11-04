# Le coffre de chêne (au pied du lit) : caisse de planches, couvercle débordant, deux bandes de fer, moraillon et
# poignées de côté. Pied à l'origine, long selon X ; dessus du couvercle à h + 0,05.
# Lancer seul : blender -b -P coffre.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
from kit import Piece, poutre, planche
from materiaux import M

def construire(graine=71, L=.9, p=.48, h=.48):
    P = Piece("P_coffre", graine); R = P.R
    for k in range(3): P.boite((0, 0, (k + .5) * (h - .04) / 3), (L, p, (h - .04) / 3 - .012), M("chene").couleur(R, .1), bev=0)   # planches
    P.boite((0, 0, h - .02), (L - .02, p - .02, .04), M("chene").sombre, bev=0)
    P.boite((0, 0, h + .025), (L + .05, p + .05, .07), M("chene_c").couleur(R), bev=.02)                 # couvercle
    for s in (-1, 1):
        P.boite((s * L * .3, 0, (h + .06) / 2), (.06, p + .02, h + .06), M("fer").couleur(R), bev=0)    # bandes de fer
        P.boite((s * (L / 2 + .012), 0, h * .6), (.02, .16, .04), M("fer").couleur(R), bev=0)           # poignées
    P.boite((0, -p / 2 - .02, h * .82), (.1, .02, .14), M("fer").couleur(R), bev=0)                      # moraillon
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(1.0, .6))
