# Les bûches rangées près du feu : rondins empilés en pyramide (bouts plus clairs, coupés), sur deux cales.
# Pied à l'origine, bûches selon Y (on les range le long d'un mur, bout vers la pièce).
# Lancer seules : blender -b -P panier_buches.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
from kit import Piece, poutre
from materiaux import M

def construire(graine=79, L=.5, larg=.42, rangs=3):
    P = Piece("P_buches", graine); R = P.R; r = .065
    for dx in (-.12, .12): poutre(P, (dx, -L / 2 + .05, .025), (dx, L / 2 - .05, .025), l=.05, h=.05, bev=0)   # cales
    for k in range(rangs):
        m = int(larg / (2 * r)) - k; z = .05 + r + k * r * 1.72
        for i in range(m):
            x = (i - (m - 1) / 2) * 2 * r * 1.02; dy = R.uniform(-.03, .03); rr = r * R.uniform(.85, 1.0)
            P.cylindre((x, -L / 2 + dy, z), (x, L / 2 + dy, z), rr, rr, M("chene").couleur(R, .12), n=6)
            P.cylindre((x, -L / 2 + dy - .004, z), (x, -L / 2 + dy + .002, z), rr * .85, rr * .85, M("chene_c").couleur(R), n=6)   # bout coupé, plus clair
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(.5, .6))
