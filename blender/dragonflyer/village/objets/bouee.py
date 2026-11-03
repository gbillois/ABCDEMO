# La bouée de sauvetage : anneau en quatre bandes rouges et quatre crème, deux attaches de corde, dans le plan XZ
# (pendue à un mur ou à un garde-corps derrière elle, vers +Y), centre à l'origine. Fait du kit (tore, poutre).
# Lancer seule : blender -b -P bouee.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
import math
from kit import Piece, tore, poutre
from materiaux import M

def construire(graine=37, R_=.27, r=.075):
    P = Piece("P_bouee", graine)
    rouge, creme = M("bouee_r").teintes[0], M("blanc").teintes[0]
    tore(P, (0, 0, 0), R_, r, rouge, n=16, m=5, axe=(0, 1, 0), bandes=[rouge, creme] * 4)
    for k in range(2):   # attaches de corde par-dessus l'anneau (en haut, là où elle pend)
        a = math.pi / 4 + k * math.pi / 2; x, z = math.cos(a) * R_, math.sin(a) * R_
        poutre(P, (x * .93, -r - .005, z * .93), (x * 1.07, -r - .005, z * 1.07), l=.05, h=.02, mat="corde")
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(.7, .3))
