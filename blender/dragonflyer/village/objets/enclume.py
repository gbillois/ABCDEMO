# L'enclume du forgeron sur son billot : billot de chêne (dessus plus clair, usé), enclume de fer (pied, taille,
# table, bigorne qui pointe vers +X, talon), un marteau posé sur la table. Fait du kit (poutre, boîtes, cylindres).
# Lancer seule : blender -b -P enclume.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
from kit import Piece, poutre
from materiaux import M, melange

def construire(graine=41):
    P = Piece("P_enclume", graine); fer = M("fer").couleur(P.R); fer_c = melange(fer, (.5, .5, .52), .35)   # table polie, plus claire
    P.cylindre((0, 0, 0), (0, 0, .5), .31, .29, M("chene").couleur(P.R), n=9, jit=.008)              # billot
    P.cylindre((0, 0, .495), (0, 0, .515), .285, .285, melange(M("chene_c").teintes[0], M("paille").teintes[0], .3), n=9)   # dessus scié
    P.boite((0, 0, .555), (.38, .27, .08), fer, bev=.02)                                              # pied
    P.boite((0, 0, .66), (.2, .15, .14), fer, bev=.02)                                                # taille
    P.boite((0, 0, .79), (.52, .21, .12), fer, bev=.025)                                              # corps
    P.boite((0, 0, .855), (.5, .19, .02), fer_c, bev=0)                                               # table
    P.cylindre((.24, 0, .8), (.54, 0, .83), .085, .018, fer, n=6)                                     # bigorne
    P.boite((-.32, 0, .815), (.14, .13, .08), fer, bev=.02)                                           # talon
    poutre(P, (-.02, -.05, .885), (.24, .08, .885), l=.035, h=.035, mat="chene_c", bev=0)             # marteau posé
    P.boite((-.05, -.065, .9), (.07, .12, .06), fer, rz=.46, bev=.01)
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(1.0, .8))
