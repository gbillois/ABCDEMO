# Le râtelier d'outils fixé au mur (le mur est derrière, vers +Y) : une planche à chevilles d'où pendent des marteaux,
# des tenailles, une pince et des fers à cheval. Origine : milieu de la planche.
# Lancer seul : blender -b -P ratelier.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."), os.path.dirname(os.path.abspath(__file__))]
from kit import Piece, poutre, planche
from materiaux import M
from etabli import fer_a_cheval

def construire(graine=47, L=1.6):
    P = Piece("P_ratelier", graine)
    planche(P, (0, .02, 0), (L, .05, .2), mat="chene")
    planche(P, (0, .02, -.75), (L * .9, .05, .14), mat="chene")                      # traverse basse (les outils s'y appuient)
    n = 6
    for i in range(n):
        x = -L / 2 + .18 + i * (L - .36) / (n - 1)
        P.cylindre((x, -.01, .02), (x, -.1, .02), .022, .022, M("chene_c").couleur(P.R), n=5)   # cheville
        if i in (0, 3):                                                               # marteau : manche vers le bas, tête en haut
            poutre(P, (x, -.1, .0), (x, -.09, -.55), l=.035, h=.035, mat="chene_c", bev=0)
            P.boite((x, -.1, .06), (.16 if i == 0 else .12, .06, .07), M("fer").couleur(P.R), bev=.01)
        elif i in (1, 4):                                                             # tenailles en V
            for s in (-1, 1): poutre(P, (x, -.1, .02), (x + s * .07, -.08, -.6), l=.02, h=.02, mat="fer", bev=0)
        else:                                                                         # fers à cheval accrochés
            fer_a_cheval(P, x, -.1, -.03, r=.075, debout=True)
            fer_a_cheval(P, x, -.12, -.2, r=.075, debout=True)
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(1.7, .4))
