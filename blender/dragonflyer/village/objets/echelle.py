# L'échelle de bois appuyée contre un mur : deux montants et des barreaux ronds tous les 30 cm. Debout selon Z, dans le
# plan XZ (la maison la tourne et l'incline contre son mur).
# Lancer seule : blender -b -P echelle.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
from kit import Piece, poutre
from materiaux import M

def construire(graine=53, L=2.8, larg=.42):
    P = Piece("P_echelle", graine)
    for s in (-1, 1): poutre(P, (s * larg / 2, 0, 0), (s * larg / 2 * .9, 0, L), l=.07, h=.09, mat="chene_c", bev=0)
    for k in range(1, int(L / .3)):
        z = k * .3; w = larg / 2 * (1 - .1 * z / L)
        P.cylindre((-w, 0, z), (w, 0, z), .025, .025, M("chene").couleur(P.R), n=5)
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(.6, .6))
