# Le sapin de la forêt : un tronc droit qui monte presque au sommet, sept étages d'aiguilles bombés et festonnés,
# du plus large (au ras de l'herbe) au plus petit (la pointe), qui se recouvrent tous : bien fourni jusqu'en bas,
# jamais de trou. Sous chaque étage, quelques branches partent du tronc. Fait seulement des pièces du kit.
# 13 m de haut (le jeu l'agrandit de 0,9 à 1,8 fois), pied à l'origine.
# Lancer seul : blender -b -P sapin.py -- <dossier>   (12 rendus, planche, controle.txt, sapin.glb, imposteur)
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
import math
from mathutils import Vector
from kit import Arbre, tube, racines, courbe, etage_aiguilles
from materiaux import TEINTE_ECORCE

H = 13.0          # hauteur
R0 = 3.8          # rayon de l'étage du bas
R_HAUT = 1.25     # rayon de l'étage du sommet (cime épaisse, arrondie)
ETAGES = 7
BUDGET = 2500

def rayon_tronc(z): return .42 * (1 - .85 * z / H) + .03

def construire(graine=5):
    A = Arbre("T_sapin", graine, feuillage="Aiguilles"); R = A.R; e = TEINTE_ECORCE["sapin"]
    A.couronne = (Vector((0, 0, H * .42)), Vector((R0, R0, H * .58)))
    # tronc et racines
    tube(A, courbe((0, 0, -.3), (R.uniform(-.1, .1), R.uniform(-.1, .1), H * .86), 0, 4, R, .05), [rayon_tronc(0) * 1.15, rayon_tronc(H * .86)], n=8, pas=1.4, teinte=e)
    racines(A, rayon_tronc(0), n=4, long=1.0, teinte=e, z_haut=.55)
    # étages : du bas vers le haut (règle : rayon et hauteur diminuent, chaque étage recouvre le haut du précédent ;
    # hauteur et débord varient de ±10 % d'un étage à l'autre)
    for i in range(ETAGES):
        t = i / (ETAGES - 1)
        h = (3.5 - 1.2 * t) * R.uniform(.9, 1.1)
        zb = .72 + t ** 1.08 * (H - 2.3 - .72) + (R.uniform(-.15, .15) if 0 < i < ETAGES - 1 else 0)
        if i == ETAGES - 1: h = H - zb
        Ri = ((R0 - R_HAUT) * (1 - t) ** .9 + R_HAUT) * R.uniform(.92, 1.08)
        nd = round(5 + 5 * (1 - t))
        etage_aiguilles(A, zb, h, Ri, nd=nd, rt=rayon_tronc(zb + h * .32), tombe=.42 - .18 * t, sommet=i == ETAGES - 1)
        # branches sous l'étage du bas seulement (vues d'en dessous, cachées de partout ailleurs)
        if i == 0:
            for k in range(4):
                a = (k + R.uniform(-.25, .25)) * math.pi / 2; d = Vector((math.cos(a), math.sin(a), 0))
                p0 = d * rayon_tronc(zb) * .3 + Vector((0, 0, zb + h * .2)); p1 = d * Ri * .55 + Vector((0, 0, zb + .0))
                tube(A, courbe(p0, p1, -.12, 3), [.12, .06], n=5, pas=.9, teinte=e)
    return A

if __name__ == "__main__":
    from apercu import apercu_arbre
    apercu_arbre(construire(), "pin", BUDGET, H, R0, H * .42, sous=((1.5, -1.0, .14), (0, 0, 3.0)), pied=((1.2, -R0 - 2.2, .45), (0, 0, .5)))
