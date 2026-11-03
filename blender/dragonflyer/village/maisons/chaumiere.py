# La chaumière : petite maison de pierres des champs sous un gros toit de chaume (la maison la plus courante des
# villages). Faite seulement des pièces du kit (murs de moellons, toit de chaume, chevrons, porte, fenêtres, cheminée)
# et des objets du village (banc, tas de bois). Emprise 5,6 × 6,8 m, porte vers -Y, seuil au point « porte » (0, -3.9, 0).
# Lancer seule : blender -b -P chaumiere.py -- <dossier>   (12 rendus, planche, controle.txt avec la capsule, chaumiere.glb)
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."), os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "objets")]
import math
from mathutils import Matrix
from kit import Piece, mur_moellons, ToitChaume, chevrons, pignon_planches, porte, fenetre, cheminee
from materiaux import M
import banc, tas_bois

PIED, PORTE, INTERIEUR = (5.6, 6.8), (0, -3.9, 0), "maison"
X, Y = 2.6, 3.2                     # faces des murs
Z_BAS, Z_PIERRE, Z_HAUT = -2.8, -.6, 2.5   # le cœur descend sous le sol (pentes), les pierres dès -0,6 m, le mur monte sous le chaume
FENETRE_FACE = (1.72, -Y - .07, 1.2)   # assez loin de l'arc de la porte pour que les volets restent libres
CHEMINEE = (-X - .45, .8)

def construire(graine=11):
    P = Piece("M_chaumiere", graine); V = Piece("W_chaumiere", graine + 1)
    P.boite((0, 0, (Z_BAS + Z_HAUT) / 2), (2 * X - .1, 2 * Y - .1, Z_HAUT - Z_BAS), M("mortier").couleur(P.R), bev=.04)   # cœur (mortier)
    ouv_fen = lambda u: (u - .93, u + .93, .55, 1.85)   # fenêtre et volets ouverts : les pierres s'arrêtent au bord des volets
    mur_moellons(P, (-X, -Y), (X, -Y), Z_PIERRE, Z_HAUT, [(X - .76, X + .76, -1, 2.5), ouv_fen(X - 1.72), ouv_fen(X + 1.72)])   # façade
    mur_moellons(P, (X, -Y), (X, Y), Z_PIERRE, Z_HAUT, [ouv_fen(Y - 1.3)])                                               # droite
    mur_moellons(P, (X, Y), (-X, Y), Z_PIERRE, Z_HAUT, [ouv_fen(X + 1.0)])                                                # dos
    yc = Y - CHEMINEE[1]; mur_moellons(P, (-X, Y), (-X, -Y), Z_PIERRE, Z_HAUT, [(yc - .62, yc + .62, -1, 9)])            # gauche (cheminée)
    porte(P, (0, -Y - .07, 0), l=1.15, h=2.05)
    fenetre(V, P, (-1.72, -Y - .07, 1.2)); fenetre(V, P, FENETRE_FACE)
    fenetre(V, P, (X + .07, -1.3, 1.2), rz=math.pi / 2)
    fenetre(V, P, (-1.0, Y + .07, 1.2), rz=math.pi, jardiniere=False)
    toit = ToitChaume(0, 0, X + .4, Y + .65, 2.3, 5.3, croupe=.9, z_demi=10, ep=.45, sourcils=[(0, 1.0, .55)], cheminees=[(*CHEMINEE, .43)]).construire(P)
    for sx in (-1, 1): pignon_planches(P, sx * X, -Y, Y, Z_HAUT, toit, sens=sx, sauf=[(CHEMINEE[1] - .38, CHEMINEE[1] + .38)] if sx < 0 else ())
    chevrons(P, toit, [((-X, -Y), (X, -Y)), ((X, Y), (-X, Y))], Z_HAUT)                     # sous les pans (les pignons ont leurs planches)
    faite = toit.forme(0, 0)[0]
    cheminee(P, *CHEMINEE, Z_PIERRE, faite + .45, larg=.85, toit=toit)
    P.ajouter(banc.construire(), Matrix.Translation((X + .38, 1.3, 0)) @ Matrix.Rotation(math.pi / 2, 4, "Z"))
    P.ajouter(tas_bois.construire(), Matrix.Translation((1.15, Y + .38, 0)) @ Matrix.Rotation(math.pi, 4, "Z"))
    for (bx, by) in ((-2.3, -3.75), (2.25, -3.7), (-2.95, 2.4)):      # touffes de buissons et de fleurs au pied des murs
        for i in range(4):
            P.sphere((bx + P.R.uniform(-.35, .35), by + P.R.uniform(-.2, .2), .18), P.R.uniform(.22, .32), M("feuillage").couleur(P.R), (1, 1, .85), sub=1, jit=.04)
        for i in range(5):
            P.sphere((bx + P.R.uniform(-.4, .4), by + P.R.uniform(-.25, .25), .36 + P.R.uniform(0, .12)), .07, M("fleur").couleur(P.R), sub=1)
    return P, V

if __name__ == "__main__":
    from apercu import apercu_maison
    P, V = construire()
    props = {"pied": list(PIED), "porte": list(PORTE), "interieur": INTERIEUR}
    apercu_maison([P.objet(props), V.objet()], "chaumiere", taille=max(PIED), haut=6.2, porte_seuil=PORTE, fenetre=FENETRE_FACE)
