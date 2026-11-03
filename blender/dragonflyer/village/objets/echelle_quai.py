# L'échelle de bois (ponton, quai ; celle de la forge est echelle.py) : deux montants et des barreaux tous les 30 cm, dans le plan XZ, pied à l'origine.
# Lancer seule : blender -b -P echelle_quai.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
from kit import Piece, poutre

def construire(graine=19, h=2.6, l=.46, pas=.3):
    P = Piece("P_echelle", graine)
    for s in (-1, 1): poutre(P, (s * l / 2, 0, 0), (s * l / 2, 0, h), l=.07, h=.09, mat="chene")
    for i in range(int((h - .3) / pas) + 1):
        z = .2 + i * pas; poutre(P, (-l / 2, 0, z), (l / 2, 0, z), l=.045, h=.045, mat="chene_c")
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(.6, .4))
