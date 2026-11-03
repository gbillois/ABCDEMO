# La table de ferme : plateau de trois planches épaisses, ceinture, quatre pieds équarris, entretoise en H.
# Pied à l'origine, plateau selon X ; le dessus du plateau est à h (DESSUS). Faite du kit (poutre, planche).
# Lancer seule : blender -b -P table.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
from kit import Piece, poutre, planche

def construire(graine=61, L=1.7, p=.8, h=.78):
    P = Piece("P_table", graine); n = 3; w = p / n
    for i in range(n): planche(P, (P.R.uniform(-.01, .01), -p / 2 + (i + .5) * w, h - .03), (L, w - .012, .06), mat="chene_c")   # plateau
    ex, ey = L / 2 - .14, p / 2 - .1
    for s in (-1, 1):
        poutre(P, (-ex, s * ey, h - .12), (ex, s * ey, h - .12), l=.05, h=.11, bev=0)          # ceinture
        poutre(P, (s * ex, -ey, h - .12), (s * ex, ey, h - .12), l=.05, h=.11, bev=0)
        poutre(P, (s * ex, -ey, .16), (s * ex, ey, .16), l=.06, h=.07, bev=0)                  # entretoise en H
        for t in (-1, 1): poutre(P, (s * ex, t * ey, 0), (s * ex, t * ey, h - .06), l=.1, h=.1, bev=0)   # pieds
    poutre(P, (-ex, 0, .16), (ex, 0, .16), l=.06, h=.07, bev=0)
    return P

DESSUS = .78

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(1.8, .9))
