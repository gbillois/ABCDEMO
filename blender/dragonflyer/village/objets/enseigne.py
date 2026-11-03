# L'enseigne de la forge : un panneau de planches claires bordé de rouge, une enclume et un marteau de fer dessus,
# pendu par deux tiges de fer (longueur « tiges ») sous la poutre de façade. Regarde -Y ; origine : haut des tiges.
# Lancer seule : blender -b -P enseigne.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
from kit import Piece, poutre
from materiaux import M

def construire(graine=51, l=1.3, h=.56, tiges=.3):
    P = Piece("P_enseigne", graine); zc = -tiges - h / 2
    for s in (-1, 1): poutre(P, (s * l * .38, 0, 0), (s * l * .38, 0, -tiges - .05), l=.025, h=.025, mat="fer", bev=0)
    for k in range(3): P.boite((0, 0, zc + (k - 1) * h / 3), (l, .05, h / 3 * .97), M("chene_c").couleur(P.R, .1), bev=.01)
    for z in (zc - h / 2, zc + h / 2): P.boite((0, -.005, z), (l + .06, .07, .06), M("peint_r").couleur(P.R), bev=.01)   # bordure rouge
    for s in (-1, 1): P.boite((s * (l / 2 + .0), -.005, zc), (.06, .07, h + .06), M("peint_r").couleur(P.R), bev=.01)
    fer = M("fer").couleur(P.R); y = -.035                                                              # enclume
    P.boite((-.12, y, zc + .06), (.42, .02, .1), fer, bev=0)
    P.boite((.17, y, zc + .07), (.16, .02, .06), fer, bev=0)
    P.boite((-.12, y, zc - .05), (.14, .02, .12), fer, bev=0)
    P.boite((-.12, y, zc - .14), (.32, .02, .06), fer, bev=0)
    P.boite((.36, y, zc + .02), (.18, .02, .04), M("chene").couleur(P.R), rz=0, ry=-.7, bev=0)          # marteau
    P.boite((.29, y - .002, zc + .12), (.06, .02, .12), fer, ry=-.7, bev=0)
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(1.4, .3))
