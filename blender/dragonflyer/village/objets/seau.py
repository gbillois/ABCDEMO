# Le seau de bois : douelles (un tronc de cône d'une nuance), deux cercles de fer, anse de fer, un peu d'eau.
# Lancer seul : blender -b -P seau.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
import math
from kit import Piece, poutre
from materiaux import M

def construire(graine=29, r=.17, h=.34):
    P = Piece("P_seau", graine)
    P.cylindre((0, 0, 0), (0, 0, h), r * .85, r, M("chene_c").couleur(P.R), n=10)
    for z in (.06, h - .06): P.cylindre((0, 0, z - .02), (0, 0, z + .02), r * (.87 + .13 * z / h) + .012, r * (.87 + .13 * z / h) + .012, M("fer").couleur(P.R), n=10)
    P.cylindre((0, 0, h - .05), (0, 0, h - .01), r * .9, r * .9, M("vitre").teintes[0], n=10)       # eau
    pts = [(math.cos(a) * r, 0, h + math.sin(a) * r * .9) for a in [math.pi * i / 4 for i in range(5)]]
    for p0, p1 in zip(pts, pts[1:]): poutre(P, p0, p1, l=.02, h=.02, mat="fer", bev=0)          # anse
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(.4, .4))
