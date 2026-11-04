# Les herbes séchées suspendues à une poutre : une ficelle tendue sous la poutre (z = 0) et des bottes liées, tête en bas,
# chacune pendue par une courte cordelette : un lien sombre en haut, les tiges serrées puis évasées vers le bas, finies
# en pointes de feuilles irrégulières de longueurs variées (sauge, olive, ocre sec) ; la lavande en fins épis violets ;
# une tresse d'aulx au bout. Tout pend sous z = 0, sur 50 cm au plus. Pied à l'origine (sous la poutre), le long de X.
# Lancer seules : blender -b -P herbes.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
import math
from kit import Piece, poutre
from materiaux import M, melange

def botte(P, x, z_haut, longueur, lavande=False):
    """Une botte liée qui pend de z_haut : cordelette, lien, cœur de tiges évasé, pointes de feuilles (ou épis)."""
    R = P.R; c = M("herbe_s").couleur(R); cs = melange(c, M("herbe_s").sombre, .5)
    zl = z_haut - R.uniform(.04, .09)
    poutre(P, (x, 0, z_haut), (x, 0, zl), l=.012, h=.012, mat="corde", bev=0)                  # cordelette
    P.cylindre((x, 0, zl + .01), (x, 0, zl - .035), .022, .022, M("chene").sombre, n=4)         # lien
    zc = zl - longueur * .45
    P.cylindre((x, 0, zl), (x, 0, zc), .018, .045, cs, n=5)                                     # tiges serrées puis évasées
    n = 5 if not lavande else 6
    for k in range(n):                                                                          # pointes de feuilles (ou épis)
        a = 2 * math.pi * (k + R.uniform(-.2, .2)) / n; ec = R.uniform(.03, .07) * (1.4 if not lavande else .9)
        bas = (x + math.cos(a) * ec, math.sin(a) * ec, zl - longueur * R.uniform(.75, 1.05))
        haut = (x + math.cos(a) * .02, math.sin(a) * .02, zc + .04)
        if lavande:
            poutre(P, haut, bas, l=.008, h=.008, c=cs, bev=0)                                      # tige fine
            P.cylindre(bas, (bas[0], bas[1], bas[2] + .07), .014, .006, M("lavande").couleur(R), n=4)   # épi violet
        else:
            P.cylindre(haut, bas, .028, .003, melange(c, M("herbe_s").couleur(R), .5), n=3)       # feuille en pointe

def construire(graine=77, L=1.1, n=5, ail=True):
    P = Piece("P_herbes", graine); R = P.R
    poutre(P, (-L / 2, 0, -.015), (L / 2, 0, -.015), l=.015, h=.015, mat="corde", bev=0)        # ficelle sous la poutre
    for k in range(n):
        x = -L / 2 + (k + .5) * L / (n + (1 if ail else 0)) + R.uniform(-.03, .03)
        botte(P, x, -.02, R.uniform(.24, .36), lavande=(k == 1))
    if ail:
        x = L / 2 - .1; poutre(P, (x, 0, -.02), (x, 0, -.08), l=.012, h=.012, mat="corde", bev=0)
        for j in range(3): P.sphere((x + (j % 2) * .03 - .015, 0, -.1 - j * .07), .045, M("lin").couleur(R), (1, 1, .9), sub=1)
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(1.2, .3))
