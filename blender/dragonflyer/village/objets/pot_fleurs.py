# Le pot de fleurs : pot de terre cuite à bord roulé, touffe de feuillage et fleurs.
# Lancer seul : blender -b -P pot_fleurs.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
from kit import Piece
from materiaux import M

def construire(graine=13, r=.22):
    P = Piece("P_pot_fleurs", graine)
    P.cylindre((0, 0, 0), (0, 0, r * 1.5), r * .75, r, M("terre").couleur(P.R), n=10)
    P.cylindre((0, 0, r * 1.45), (0, 0, r * 1.65), r * 1.12, r * 1.12, M("terre").couleur(P.R), n=10)   # bord roulé
    for i in range(4): P.sphere((P.R.uniform(-.1, .1), P.R.uniform(-.1, .1), r * 1.8 + P.R.uniform(0, .08)), r * .7, M("feuillage").couleur(P.R), (1, 1, .85), sub=1, jit=.02)
    for i in range(6): P.sphere((P.R.uniform(-.17, .17), P.R.uniform(-.17, .17), r * 2.25 + P.R.uniform(0, .1)), .055, M("fleur").couleur(P.R), sub=1)
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(.5, .5))
