# Le tonnelet : fût bombé (deux troncs de cône lisses, posés droit), deux cerclages de fer sombres, fond plat de chêne
# sombre un peu en retrait. Les douelles sont suggérées par des joints sombres verticaux.
# Lancer seul : blender -b -P tonnelet.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
import math
from kit import Piece, poutre
from materiaux import M, melange

def construire(graine=31, r=.24, h=.6, n=12):
    P = Piece("P_tonnelet", graine); rb = r * .84; c = M("chene_c").couleur(P.R)
    P.cylindre((0, 0, 0), (0, 0, h / 2), rb, r, c, n=n)                                  # bas du fût
    P.cylindre((0, 0, h / 2), (0, 0, h), r, rb, c, n=n)                                  # haut du fût
    for z, rr in ((h * .18, rb + (r - rb) * .36 + .015), (h * .82, rb + (r - rb) * .36 + .015)):
        P.cylindre((0, 0, z - .03), (0, 0, z + .03), rr, rr, M("fer").couleur(P.R), n=n)   # cerclages
    P.cylindre((0, 0, h - .03), (0, 0, h + .005), rb * .9, rb * .9, M("chene").sombre, n=n)   # fond
    for i in range(6):   # joints des douelles (lignes sombres)
        a = 2 * math.pi * (i + .25) / 6; ca, sa = math.cos(a), math.sin(a)
        for (z0, z1, r0_, r1_) in ((.02, h / 2, rb, r), (h / 2, h - .02, r, rb)):
            poutre(P, (ca * (r0_ + .004), sa * (r0_ + .004), z0), (ca * (r1_ + .004), sa * (r1_ + .004), z1), l=.012, h=.012, c=melange(c, M("chene").sombre, .6), bev=0)
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(.6, .6))
