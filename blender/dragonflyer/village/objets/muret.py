# Le muret de soutènement : 2 m de pierres des champs sèches, 0,9 m de haut, 0,5 m d'épaisseur, couronné de pierres plates.
# Le jeu l'étire en hauteur (0,5 à 1,6) et le pose au bord des terrasses des maisons. Fait du kit (moellons).
# Lancer seul : blender -b -P muret.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
from mathutils import Vector
from kit import Piece, mur_moellons, moellon
from materiaux import M

def construire(graine=17, L=2.0, h=.9, ep=.5):
    P = Piece("P_muret", graine)
    P.boite((0, 0, h / 2 - .1), (L, ep * .8, h + .2), M("mortier").sombre, bev=0)                  # cœur
    for s in (-1, 1): mur_moellons(P, (-L / 2 * s, s * ep / 2 * -1, 0), (L / 2 * s, s * ep / 2 * -1, 0), -.1, h - .1, [], taille=.38)   # deux faces
    for i in range(5): P.boite((-L / 2 + (i + .5) * L / 5, 0, h - .02), (L / 5 * .96, ep + .08, .14), M("moellon").couleur(P.R), bev=.04, jit=.015)   # couronnement
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(2.0, .6))
