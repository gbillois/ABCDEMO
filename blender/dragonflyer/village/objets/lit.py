# Le lit : cadre de chêne (quatre montants, tête de lit de planches plus haute, pied de lit bas), matelas de lin,
# drap retourné, gros oreiller, couverture rouge en patchwork qui retombe sur les côtés, plaid bleu plié au pied.
# Pied à l'origine (milieu du lit au sol), la tête vers +Y (contre le mur). Fait du kit (poutre, planche, boite_douce).
# Lancer seul : blender -b -P lit.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
from kit import Piece, poutre, planche, boite_douce
from materiaux import M, melange

def construire(graine=67, L=2.0, l=1.05):
    P = Piece("P_lit", graine); R = P.R; ex, ey = l / 2 - .05, L / 2 - .05
    for sx in (-1, 1):
        poutre(P, (sx * ex, ey, 0), (sx * ex, ey, 1.08), l=.11, h=.11, bev=0)                   # montants de tête
        P.sphere((sx * ex, ey, 1.11), .065, M("chene").couleur(R), sub=1)
        poutre(P, (sx * ex, -ey, 0), (sx * ex, -ey, .66), l=.11, h=.11, bev=0)                  # montants de pied
        P.sphere((sx * ex, -ey, .69), .06, M("chene").couleur(R), sub=1)
        poutre(P, (sx * ex, -ey, .3), (sx * ex, ey, .3), l=.07, h=.16, bev=0)                   # longs pans
    for z in (.52, .74, .96): planche(P, (0, ey, z), (l - .1, .05, .2), mat="chene_c")           # tête de lit
    planche(P, (0, -ey, .5), (l - .1, .05, .26), mat="chene_c")                                   # pied de lit
    for sy in (-1, 1): poutre(P, (-ex, sy * ey, .3), (ex, sy * ey, .3), l=.07, h=.16, bev=0)
    boite_douce(P, (0, 0, .46), (l - .12, L - .14, .2), M("lin").couleur(R), arrondi=.07)        # matelas
    boite_douce(P, (0, ey - .3, .64), (l * .66, .36, .15), M("lin").couleur(R, 0), arrondi=.06)  # oreiller
    yq0, yq1 = -ey + .02, ey - .62; zq = .585                                                     # couverture (du pied jusque sous l'oreiller)
    boite_douce(P, (0, ey - .62, zq + .01), (l - .02, .14, .06), M("lin").couleur(R, 0), arrondi=.03, seg=1)   # drap retourné
    boite_douce(P, (0, (yq0 + yq1) / 2, zq), (l + .02, yq1 - yq0, .07), M("laine_r").couleur(R), arrondi=.035)
    for sx in (-1, 1): boite_douce(P, (sx * (l / 2 + .0), (yq0 + yq1) / 2, zq - .14), (.05, yq1 - yq0 - .02, .26), M("laine_r").couleur(R), arrondi=.02, seg=1)   # pans qui retombent
    nx, ny = 3, 4; wx, wy = (l - .1) / nx, (yq1 - yq0 - .1) / ny                                 # carreaux du patchwork
    for i in range(nx):
        for j in range(ny):
            if (i + j) % 2: continue
            c = M("laine_o").couleur(R) if (i + 2 * j) % 3 else M("lin").couleur(R)
            P.boite((-l / 2 + .05 + (i + .5) * wx, yq0 + .05 + (j + .5) * wy, zq + .036), (wx - .03, wy - .03, .01), c, bev=0)
    boite_douce(P, (0, -ey + .26, zq + .07), (l - .2, .32, .08), M("laine_b").couleur(R), arrondi=.035, seg=1)   # plaid plié au pied
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(1.2, 2.1))
