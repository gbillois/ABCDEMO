# Le bouclier rond peint, accroché aux pignons de la longère : disque de planches peint de deux couleurs (une croix),
# cerclage sombre, umbo de fer au centre. La face regarde -Y (le mur est derrière, vers +Y).
# Lancer seul : blender -b -P bouclier.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
from kit import Piece
from materiaux import M

COULEURS = [(M("fleur").teintes[0], M("fleur").teintes[1]), (M("peint").teintes[0], M("fleur").teintes[3]), (M("volet_v").teintes[0], M("fleur").teintes[1])]

def construire(graine=17, r=.42, motif=0):
    P = Piece("P_bouclier", graine); c1, c2 = COULEURS[motif % len(COULEURS)]
    P.cylindre((0, .02, 0), (0, -.02, 0), r + .03, r + .03, M("chene").sombre, n=14)    # cerclage
    P.cylindre((0, 0, 0), (0, -.05, 0), r, r, c1, n=14)                               # disque peint
    for taille in ((.15, .012, r * 1.9), (r * 1.9, .012, .15)):                        # croix de l'autre couleur
        P.boite((0, -.056, 0), taille, c2, bev=0)
    P.sphere((0, -.07, 0), .11, M("fer").couleur(P.R), (1, .6, 1), sub=1)             # umbo
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(1.0, .3))
