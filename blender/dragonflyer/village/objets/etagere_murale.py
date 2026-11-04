# L'étagère murale : une planche sur deux consoles en équerre, deux pots et un bol. Le mur est derrière (y = 0), elle
# s'avance de 22 cm vers -Y. Pied à l'origine (au sol, sous l'étagère) ; dessus de la planche à Z.
# Faite du kit et de vaisselle.py. Lancer seule : blender -b -P etagere_murale.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."), os.path.dirname(os.path.abspath(__file__))]
from kit import Piece, poutre, planche
import vaisselle

Z = 1.55

def construire(graine=87, L=.85, d=.22):
    P = Piece("P_etagere_murale", graine)
    planche(P, (0, -d / 2, Z - .02), (L, d, .04), mat="chene_c")
    for s in (-1, 1):
        x = s * (L / 2 - .12)
        poutre(P, (x, -.025, Z - .04), (x, -.025, Z - .3), l=.04, h=.05, bev=0)                  # montant contre le mur
        poutre(P, (x, -.03, Z - .28), (x, -d + .04, Z - .05), l=.04, h=.04, bev=0)              # jambe de force
    vaisselle.pot(P, (-.25, -.11, Z), r=.075, h=.18); vaisselle.pot(P, (.02, -.11, Z), r=.06, h=.13, mat="faience_b", couvercle=False)
    vaisselle.bol(P, (.27, -.11, Z), r=.08, mat="terre")
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(.9, .3))
