# Le vaisselier : buffet bas à deux portes (planches, boutons de fer) et, au-dessus, deux étagères ouvertes sur
# montants, avec la vaisselle (assiettes debout contre le mur, bols empilés, pots, cruche) et, sur le buffet, des pots
# et une coupe de pommes. Le mur est derrière (y = 0), le meuble s'avance vers -Y. Pied à l'origine.
# Fait du kit (poutre, planche) et de vaisselle.py. Lancer seul : blender -b -P etagere.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."), os.path.dirname(os.path.abspath(__file__))]
from kit import Piece, poutre, planche
from materiaux import M
import vaisselle as V_

PROF, HAUT_BUFFET = .48, .86

def construire(graine=69, L=1.3):
    P = Piece("P_etagere", graine); R = P.R; d = PROF; hb = HAUT_BUFFET
    P.boite((0, -d / 2, hb / 2 + .04), (L, d - .02, hb - .08), M("chene").couleur(R), bev=0)            # caisse du buffet
    P.boite((0, -d / 2 + .01, .04), (L - .06, d - .06, .08), M("chene").sombre, bev=0)                  # socle en retrait
    planche(P, (0, -d / 2 - .01, hb + .02), (L + .06, d + .04, .05), mat="chene_c")                      # dessus
    for s in (-1, 1):                                                                                    # deux portes
        P.boite((s * L / 4, -d + .005, hb / 2 + .04), (L / 2 - .07, .03, hb - .2), M("chene_c").couleur(R, .1), bev=0)
        P.sphere((s * .07, -d - .02, hb * .58), .025, M("fer").couleur(R), sub=1)
    hs = (1.3, 1.72); ds = .26
    for s in (-1, 1): P.boite((s * (L / 2 - .03), -ds / 2, (hb + .05 + hs[-1] + .1) / 2), (.05, ds, hs[-1] + .05 - hb), M("chene").couleur(R), bev=0)   # montants
    for z in hs:
        planche(P, (0, -ds / 2, z), (L - .02, ds, .04), mat="chene_c")
        poutre(P, (-L / 2 + .06, -ds + .02, z + .05), (L / 2 - .06, -ds + .02, z + .05), l=.02, h=.04, bev=0)   # tringle (les assiettes ne glissent pas)
    planche(P, (0, -ds / 2 - .02, hs[-1] + .1), (L + .1, ds + .06, .05), mat="chene")                   # chapeau
    # vaisselle : en bas les assiettes debout et les bols, en haut les pots et la cruche
    z = hs[0] + .02
    for k, x in enumerate((-.45, -.2, .05)): V_.assiette(P, (x, -.05, z), r=.11, debout=True)
    for k in range(3): V_.bol(P, (.36, -.12, z + k * .045), r=.07)
    z = hs[1] + .02
    V_.pot(P, (-.42, -.12, z), r=.08, h=.18); V_.pot(P, (-.2, -.12, z), r=.06, h=.14, mat="faience_b")
    V_.cruche(P, (.25, -.12, z), r=.065)
    z = hb + .045
    V_.pot(P, (-.42, -.2, z), r=.1, h=.24); V_.pommes(P, (-.08, -.24, z))
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(1.4, .6))
