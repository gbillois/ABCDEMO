# Le soufflet de forge : sur un tréteau, deux planches et un cuir plissé entre elles, un nez de bois et une tuyère de
# fer qui pointe vers -X (vers le foyer), un bras de manœuvre. Fait du kit (poutre, boîtes, cylindres).
# Lancer seul : blender -b -P soufflet.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
from kit import Piece, poutre
from materiaux import M, melange

def construire(graine=43):
    P = Piece("P_soufflet", graine)
    for x in (-.25, .35):                                                     # tréteau
        for y in (-.2, .2): poutre(P, (x, y, 0), (x, y * .8, .56), l=.08, h=.08)
        poutre(P, (x, -.24, .5), (x, .24, .5), l=.08, h=.08)
    poutre(P, (-.3, 0, .56), (.4, 0, .56), l=.1, h=.06)
    cuir = M("cuir").couleur(P.R); pli = melange(cuir, (0, 0, 0), .3)
    P.boite((.1, 0, .62), (.72, .48, .05), M("chene_c").couleur(P.R), bev=.015)   # planche du bas
    P.boite((.1, 0, .72), (.66, .44, .16), cuir, bev=.05)                         # cuir
    for z in (.68, .76): P.boite((.1, 0, z), (.7, .47, .025), pli, bev=0)           # plis
    P.boite((.12, 0, .83), (.74, .5, .05), M("chene_c").couleur(P.R), ry=.06, bev=.015)   # planche du haut, un peu ouverte
    P.boite((-.34, 0, .72), (.2, .2, .2), M("chene").couleur(P.R), bev=.03)       # nez
    P.cylindre((-.44, 0, .72), (-.7, 0, .7), .055, .035, M("fer").couleur(P.R), n=7)   # tuyère
    poutre(P, (.42, 0, .86), (.52, 0, 1.3), l=.06, h=.06, mat="chene_c")           # bras de manœuvre
    poutre(P, (.52, -.15, 1.3), (.52, .15, 1.3), l=.05, h=.05, mat="cuir", bev=0)  # poignée gainée de cuir
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(1.4, .7))
