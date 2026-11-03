# La rame : manche rond, poignée, pale plate au bout peint. Le long de +Z (poignée à z = 0) ; la pale est
# mince selon X et large selon Y. Fait du kit (cylindre, boîte).
# Lancer seule : blender -b -P rame.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
from kit import Piece
from materiaux import M, melange

def construire(graine=41, L=2.3, mat_pale="peint"):
    P = Piece("P_rame", graine); R = P.R
    P.cylindre((0, 0, 0), (0, 0, .16), .026, .028, M("chene").couleur(R), n=6)                  # poignée
    P.cylindre((0, 0, .16), (0, 0, L - .5), .032, .036, M("chene_c").couleur(R), n=6)           # manche
    P.boite((0, 0, L - .5), (.04, .08, .12), M("chene_c").couleur(R), bev=0)                       # collet
    c = M(mat_pale).couleur(R)
    P.boite((0, 0, L - .26), (.028, .16, .5), melange(M("chene_c").teintes[0], c, .6), bev=0)  # pale
    P.boite((0, 0, L - .07), (.03, .165, .12), c, bev=0)                                          # bout peint
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(.4, .4))
