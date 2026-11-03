# Le tas de bûches contre le mur : rondins empilés en pyramide sur deux poutres, sous un petit auvent de planches.
# Lancer seul : blender -b -P tas_bois.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
import math
from kit import Piece, poutre, planche
from materiaux import M

def construire(graine=5, L=1.4, rangs=4):
    P = Piece("P_tas_bois", graine); r = .1
    for dy in (-.15, .15): poutre(P, (-L / 2, dy, .05), (L / 2, dy, .05), l=.1, h=.1)        # deux poutres au sol
    for k in range(rangs):
        n = int(L / (2 * r)) - k; z = .1 + r + k * r * 1.75
        for i in range(n):
            x = -L / 2 + r + (i + k * .5) * 2 * r + P.R.uniform(-.01, .01)
            y0, y1 = -.22 + P.R.uniform(-.04, .04), .22 + P.R.uniform(-.04, .04)
            P.cylindre((x, y0, z), (x, y1, z), r * P.R.uniform(.88, 1.0), r * P.R.uniform(.88, 1.0), M("chene_c").couleur(P.R), n=8)
            for yy in (y0 - .005, y1 + .005): P.cylindre((x, yy - .004, z), (x, yy + .004, z), r * .75, r * .75, M("paille").couleur(P.R), n=8)  # bois clair des coupes
    h = .1 + rangs * r * 1.75 + .25
    for s in (-1, 1): poutre(P, (s * (L / 2 + .05), .2, 0), (s * (L / 2 + .05), .2, h), l=.09, h=.09)
    for i in range(3): planche(P, (0, -.05 + i * .17, h + .05 - i * .04), (L + .3, .18, .04), rz=0)   # auvent
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(1.6, .6))
