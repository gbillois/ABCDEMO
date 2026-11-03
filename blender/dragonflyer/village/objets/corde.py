# Le rouleau de corde posé à plat : deux tours de corde empilés, le bout qui pend. Pied à l'origine. Fait du kit (tore).
# Lancer seul : blender -b -P corde.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
from kit import Piece, tore, poutre
from materiaux import M

def construire(graine=43, r=.2):
    P = Piece("P_corde", graine); R = P.R; e = .035
    for k, (rr, z) in enumerate(((r, e), (r * .88, e * 2.7))):
        tore(P, (R.uniform(-.01, .01), R.uniform(-.01, .01), z), rr, e, M("corde").couleur(R), n=8, m=4)
    poutre(P, (r * .88, 0, e * 2.7), (r + .18, -.12, e), l=.06, h=.05, mat="corde")   # le bout
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(.5, .5))
