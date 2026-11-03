# L'établi du forgeron : plateau de trois grosses planches, quatre pieds, entretoises et tablette basse avec une caisse,
# un étau de fer sur le coin, des tenailles, un marteau et des fers à cheval posés dessus. Le devant regarde -Y.
# Lancer seul : blender -b -P etabli.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
import math
from kit import Piece, poutre, planche
from materiaux import M

def fer_a_cheval(P, x, y, z, r=.08, rz=0.0, debout=False):
    """Fer à cheval : un U de cinq petits segments de fer (à plat, ou debout s'il est accroché)."""
    pts = []
    for k in range(6):
        a = math.pi * (-.1 + 1.2 * k / 5); u, v = math.cos(a) * r, math.sin(a) * r
        cu, su = math.cos(rz), math.sin(rz)
        pts.append((x + u * cu, y + u * su, z - v) if debout else (x + u * cu - v * su, y + u * su + v * cu, z))
    for p0, p1 in zip(pts, pts[1:]): poutre(P, p0, p1, l=.025, h=.025, mat="fer", bev=0)

def construire(graine=45, L=2.0, p=.62):
    P = Piece("P_etabli", graine)
    for y in (-.2, 0, .2): planche(P, (0, y, .83), (L, .21, .07), mat="chene_c")          # plateau
    for sx in (-1, 1):
        for sy in (-1, 1): poutre(P, (sx * (L / 2 - .12), sy * (p / 2 - .08), 0), (sx * (L / 2 - .12), sy * (p / 2 - .08), .8), l=.1, h=.1)
        poutre(P, (sx * (L / 2 - .12), -(p / 2 - .08), .2), (sx * (L / 2 - .12), p / 2 - .08, .2), l=.07, h=.07)
    for y in (-.11, .11): planche(P, (0, y, .25), (L - .2, .2, .04), mat="chene")             # tablette basse
    P.boite((.45, 0, .42), (.5, .36, .3), M("chene_c").couleur(P.R), bev=.02)               # caisse
    for i in range(4): P.boite((.3 + i * .1, -.02, .6), (.04, .04, .06), M("fer").couleur(P.R), rz=.3 * i, bev=0)   # barres de fer
    x0 = -L / 2 + .25                                                                       # étau
    P.boite((x0, -p / 2 + .02, .93), (.12, .14, .14), M("fer").couleur(P.R), bev=.015)
    P.boite((x0, -p / 2 - .1, .93), (.12, .05, .14), M("fer").couleur(P.R), bev=.01)
    poutre(P, (x0 - .1, -p / 2 - .14, .95), (x0 + .1, -p / 2 - .14, .95), l=.02, h=.02, mat="fer", bev=0)
    for s in (-1, 1): poutre(P, (.1, -.05 + s * .03, .875), (.55, .02 - s * .05, .875), l=.025, h=.02, mat="fer", bev=0)   # tenailles
    poutre(P, (-.2, .12, .885), (.08, .2, .885), l=.035, h=.035, mat="chene_c", bev=0)      # marteau
    P.boite((-.22, .115, .9), (.06, .11, .06), M("fer").couleur(P.R), rz=.28, bev=.01)
    for k, x in enumerate((.72, .82)): fer_a_cheval(P, x, -.1 + k * .14, .875, rz=k * .8)
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(2.1, .8))
