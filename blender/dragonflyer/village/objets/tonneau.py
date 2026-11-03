# Le tonneau : douelles bombées (une poutre chacune, d'une nuance), trois cercles de fer, fond de planches.
# Lancer seul : blender -b -P tonneau.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
import math
from kit import Piece, poutre
from materiaux import M

def construire(graine=9, r=.33, h=.85, n=10):
    P = Piece("P_tonneau", graine)
    for i in range(n):
        a = 2 * math.pi * (i + .5) / n; ca, sa = math.cos(a), math.sin(a)
        pts = [(ca * r * f, sa * r * f, z) for (f, z) in ((.84, 0), (1.0, h / 2), (.84, h))]   # deux poutres : douelle bombée
        for p0, p1 in zip(pts, pts[1:]): poutre(P, p0, p1, l=2 * math.pi * r / n * 1.02, h=.06, mat="chene_c", bev=0)
    for (z, f) in ((.12, .89), (h / 2, 1.02), (h - .12, .89)):
        P.cylindre((0, 0, z - .03), (0, 0, z + .03), r * f + .02, r * f + .02, M("fer").couleur(P.R), n=n)
    P.cylindre((0, 0, h - .06), (0, 0, h - .03), r * .82, r * .82, M("chene").couleur(P.R), n=n)   # fond
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(.8, .8))
