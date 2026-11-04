# Le tapis tressé ovale (devant le feu) : anneaux de laine de même largeur, rouge, ocre et bleu, posés à plat
# (2,5 cm au plus : on marche dessus). Pied à l'origine, long selon X.
# Lancer seul : blender -b -P tapis.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
from kit import Piece
from materiaux import M

def construire(graine=83, L=2.0, l=1.3, couleurs=("laine_r", "laine_o", "laine_b", "laine_r")):
    P = Piece("P_tapis", graine); n = len(couleurs); b = l / 2 / n
    for k, m in enumerate(couleurs):
        ax, ay = L / 2 - k * b, l / 2 - k * b; z = .004 * k
        for v in P.cylindre((0, 0, z), (0, 0, z + .014), ay, ay, M(m).couleur(P.R), n=14 if k < 2 else 10):
            v.co.x *= ax / ay
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(2.0, 1.3))
