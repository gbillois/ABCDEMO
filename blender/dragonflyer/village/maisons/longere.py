# La longère viking : longue et basse, un grand toit de chaume qui descend presque jusqu'au sol sur un soubassement
# de pierres des champs, pignons de planches goudronnées, rives croisées au-dessus du faîte qui finissent en têtes de
# dragon, porte rouge dans le pignon (palier au niveau du plancher et trois marches de 25 cm), boucliers peints, lanterneau à fumée sur le faîte.
# Faite seulement des pièces du kit et des objets du village. L'intérieur est la « halle » du jeu.
# Emprise 9,2 × 14,6 m (longueur selon Y ; avant 7,4 : elle couvre maintenant les objets des longs côtés), porte vers -Y,
# plancher à 1,0 m, point « porte » (0, -7.6, 1.0) : comme avant.
# Lancer seule : blender -b -P longere.py -- <dossier>   (12 rendus, planche, controle.txt avec la capsule, longere.glb)
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."), os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "objets")]
import math
from mathutils import Matrix
from kit import Piece, mur_moellons, ToitChaume, ToitTourne, planches_verticales, rives_croisees, fumoir, cailloux, herbe, poteau, porte, fenetre, escalier
from materiaux import M
import banc, tas_bois, tonneau, bouclier, lanterne, pot_fleurs

PIED, PORTE, INTERIEUR = (9.2, 14.6), (0, -7.6, 1.0), "halle"   # emprise élargie : elle couvre les objets des longs côtés
XS, YG = 3.25, 7.0                       # faces du soubassement (côtés) et des pignons
Z_BAS, Z_PIERRE, Z_SOL = -2.8, -.6, 1.0  # cœur sous le sol (pentes), pierres dès -0,6 m, plancher à 1 m
XT, YT = 3.72, 7.35                      # bord du toit (débords compris)
Y_PORTE = -YG - .03                      # plan de la porte (un peu en retrait des planches du pignon)
Y_PALIER = -7.78                         # bord du palier : le point « porte » (y = -7,6) est sur le palier, à 1 m
FENETRE_FACE = (0, -YG - .12, 3.95)

def construire(graine=31):
    P = Piece("M_longere", graine); V = Piece("W_longere", graine + 1)
    P.boite((0, 0, (Z_BAS + Z_SOL) / 2), (2 * XS - .1, 2 * YG - .1, Z_SOL - Z_BAS), M("mortier").couleur(P.R), bev=0)   # cœur (mortier)
    # soubassement de pierres des champs : le toit pose dessus sur les longs côtés
    for (a, b) in (((-XS, -YG), (XS, -YG)), ((XS, -YG), (XS, YG)), ((XS, YG), (-XS, YG)), ((-XS, YG), (-XS, -YG))):
        mur_moellons(P, a, b, Z_PIERRE, Z_SOL, [], taille=.55)
    # toit de chaume, faîte selon Y, égout à 0,85 m : il descend presque jusqu'au sol ; vieilli (gris et brun vers le bas)
    toit = ToitTourne(ToitChaume(0, 0, YT, XT, .85, 5.8, croupe=1.0, z_demi=30, ep=.45)).construire(P, vieilli=.7, pas=.4, dz=.34, pas_meche=.17)
    sous_toit = lambda x, y: toit.forme(x, y)[0] - toit.ep * .6
    # pignons de planches goudronnées (brun chaud, quelques planches plus claires) : porte et lucarne devant, fenêtre derrière
    planches_verticales(P, (-XS, -YG), (XS, -YG), Z_SOL, sous_toit, mat="bois_s", clair=.14,
                        trous=[(XS - .76, XS + .76, Z_SOL - .1, Z_SOL + 2.1), (XS - .33, XS + .33, 3.7, 4.2)])
    planches_verticales(P, (XS, YG), (-XS, YG), Z_SOL, sous_toit, mat="bois_s", clair=.14, trous=[(XS - .33, XS + .33, 2.85, 3.35)])
    porte(P, (0, Y_PORTE, Z_SOL), l=1.2, h=2.05, mat="peint_r", cintree=False, seuil=False, mat_cadre="chene_c")   # porte rouge, cadre clair
    # palier de pierre au niveau du plancher (le point « porte » est dessus), puis 3 marches de 25 cm (le joueur monte 30 cm au plus)
    P.boite((0, (Y_PORTE + Y_PALIER) / 2 - .02, Z_SOL - .6), (1.7, Y_PORTE - Y_PALIER + .04, 1.2), M("moellon").couleur(P.R), bev=.05, jit=.01)
    escalier(P, (0, Y_PALIER, Z_SOL - .25), 1.3, 3, haut=.25, prof=.4)
    fenetre(V, P, FENETRE_FACE, l=.5, h=.5, volets=False, jardiniere=False, appui="chene_c", mat_cadre="chene_c")
    fenetre(V, P, (0, YG + .12, 3.1), rz=math.pi, l=.5, h=.5, volets=False, jardiniere=False, appui="chene_c", mat_cadre="chene_c")
    L_ = (1.0, -YG - .16, Z_SOL + 1.95); P.ajouter(lanterne.construire(V, L_), Matrix.Translation(L_))   # lanterne près de la porte
    # rives croisées peintes en têtes de dragon aux deux pignons, lanterneau à fumée sur le faîte
    rives_croisees(P, toit, -YT, -1, XT, depasse=1.15, ech=1.5); rives_croisees(P, toit, YT, 1, XT, depasse=1.15, ech=1.5)
    fumoir(P, 0, 2.6, 5.0, 6.3)                                                  # la fumée est faite par le jeu, pas en géométrie
    # pignons : boucliers peints, banc, tonneau, tas de bois derrière
    for k, x in enumerate((-1.75, 1.75)): P.ajouter(bouclier.construire(motif=k), Matrix.Translation((x, -YG - .1, Z_SOL + .95)))
    P.ajouter(bouclier.construire(motif=2), Matrix.Translation((-1.5, YG + .1, 2.0)) @ Matrix.Rotation(math.pi, 4, "Z"))
    P.ajouter(banc.construire(), Matrix.Translation((-2.2, -YG - .5, 0)))
    P.ajouter(tonneau.construire(), Matrix.Translation((2.35, -YG - .5, 0)))
    P.ajouter(tas_bois.construire(), Matrix.Translation((1.45, YG + .45, 0)) @ Matrix.Rotation(math.pi, 4, "Z"))
    # longs côtés, au pied du chaume (juste au-delà de la frange) : la vie de la maison
    for sx in (-1, 1):
        rz = sx * math.pi / 2                                               # le dos des objets vers la maison
        x = sx * 4.32                                                       # dans l'emprise (±4,6 m)
        if sx > 0:
            P.ajouter(tas_bois.construire(L=1.8), Matrix.Translation((x, -2.6, 0)) @ Matrix.Rotation(rz, 4, "Z"))
            P.ajouter(tonneau.construire(), Matrix.Translation((sx * 4.25, .6, 0)))
            P.ajouter(banc.construire(), Matrix.Translation((x, 4.6, 0)) @ Matrix.Rotation(rz, 4, "Z"))
            for (yy, r) in ((2.6, .2), (3.1, .16)): P.ajouter(pot_fleurs.construire(r=r), Matrix.Translation((sx * 4.2, yy, 0)))
            cailloux(P, sx * 4.3, -5.2)
        else:
            P.ajouter(banc.construire(), Matrix.Translation((x, -3.2, 0)) @ Matrix.Rotation(rz, 4, "Z"))
            for yy in (-1.0, -.3): P.ajouter(tonneau.construire(), Matrix.Translation((sx * 4.25, yy, 0)))
            poteau(P, sx * 4.3, 1.9, 0, 2.2, cote=.16, de=False)
            L2 = (sx * 4.3, 1.82, 2.0); P.ajouter(lanterne.construire(V, L2), Matrix.Translation(L2))
            P.ajouter(tas_bois.construire(), Matrix.Translation((x, 4.4, 0)) @ Matrix.Rotation(rz, 4, "Z"))
            P.ajouter(pot_fleurs.construire(), Matrix.Translation((sx * 4.2, 5.9, 0)))
            cailloux(P, sx * 4.3, -5.6)
        for yy in (-6.2, -4.3, -1.7, 1.2, 3.4, 6.2): herbe(P, sx * 4.0, yy + P.R.uniform(-.3, .3))
    for (bx, by) in ((-3.45, -7.5), (3.05, 7.5), (3.3, -7.45)):      # touffes de buissons et de fleurs aux coins
        for i in range(3):
            P.sphere((bx + P.R.uniform(-.3, .3), by + P.R.uniform(-.2, .2), .18), P.R.uniform(.2, .3), M("feuillage").couleur(P.R), (1, 1, .85), sub=1, jit=.04)
        for i in range(4):
            P.sphere((bx + P.R.uniform(-.35, .35), by + P.R.uniform(-.25, .25), .34 + P.R.uniform(0, .12)), .07, M("fleur").couleur(P.R), sub=1)
    return P, V

if __name__ == "__main__":
    from apercu import apercu_maison
    P, V = construire()
    props = {"pied": list(PIED), "porte": list(PORTE), "interieur": INTERIEUR}
    apercu_maison([P.objet(props), V.objet()], "longere", taille=max(PIED), haut=7.6, porte_seuil=PORTE, fenetre=FENETRE_FACE)
