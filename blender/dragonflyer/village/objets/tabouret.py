# Le tabouret à trois pieds (près du feu) : assise ronde épaisse, trois pieds écartés, un barreau. Pied à l'origine.
# Lancer seul : blender -b -P tabouret.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
import math
from kit import Piece, poutre
from materiaux import M

def construire(graine=65, r=.19, h=.44):
    P = Piece("P_tabouret", graine)
    P.cylindre((0, 0, h - .055), (0, 0, h), r, r * .96, M("chene_c").couleur(P.R), n=10)       # assise
    for k in range(3):
        a = 2 * math.pi * k / 3 + .3; ca, sa = math.cos(a), math.sin(a)
        poutre(P, (ca * r * 1.0, sa * r * 1.0, 0), (ca * r * .55, sa * r * .55, h - .05), l=.05, h=.05, bev=0)
    a0, a1 = .3, .3 + 2 * math.pi / 3
    poutre(P, (math.cos(a0) * r * .85, math.sin(a0) * r * .85, .16), (math.cos(a1) * r * .85, math.sin(a1) * r * .85, .16), l=.035, h=.035, bev=0)
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(.5, .5))
