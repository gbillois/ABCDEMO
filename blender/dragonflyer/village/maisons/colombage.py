# La maison à colombages : soubassement de pierres, rez-de-chaussée et étage en encorbellement à pans de bois et torchis
# enduit, toit de tuiles à deux pans, pignons en bois et enduit, cheminée de pierre. Faite seulement des pièces du kit.
# Emprise 7,6 × 7,6 m, porte vers -Y, plancher à 0,9 m (quatre marches), point « porte » (-1.2, -4.2, 0.9).
# Lancer seule : blender -b -P colombage.py -- <dossier>   (12 rendus, planche, controle.txt avec la capsule, colombage.glb)
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."), os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "objets")]
import math
from kit import Piece, mur_moellons, pan_de_bois, ToitTuiles, pignon_platre, escalier, poutre, porte, fenetre, cheminee
from materiaux import M
from mathutils import Matrix
from kit import auvent
import lanterne, tonneau, pot_fleurs

PIED, PORTE, INTERIEUR = (7.6, 7.6), (-1.2, -4.2, .9), "maison"
A, B = 3.4, 3.65                       # demi-largeur du rez-de-chaussée, de l'étage (encorbellement)
Z_BAS, Z_SOCLE, Z_RDC, Z_ETAGE, Z_HAUT = -2.8, .9, 3.3, 3.5, 5.9
FENETRE_FACE = (1.5, -A - .07, 2.2)
CHEMINEE = (2.0, 1.7)

def murs(a, z0, z1, ouv):
    """Les quatre murs d'un carré de demi-côté a : (début, fin, ouvertures) dans l'ordre façade, droite, dos, gauche."""
    return [((-a, -a), (a, -a), ouv[0]), ((a, -a), (a, a), ouv[1]), ((a, a), (-a, a), ouv[2]), ((-a, a), (-a, -a), ouv[3])]

def construire(graine=21):
    P = Piece("M_colombage", graine); V = Piece("W_colombage", graine + 1)
    # soubassement de pierre et cœurs pleins (les murs posent dessus)
    P.boite((0, 0, (Z_BAS + Z_SOCLE) / 2), (2 * A - .1, 2 * A - .1, Z_SOCLE - Z_BAS), M("mortier").couleur(P.R), bev=0)
    for (a_, b_, _) in murs(A, 0, 0, [[]] * 4): mur_moellons(P, a_, b_, -.6, Z_SOCLE, [], taille=.55)
    P.boite((0, 0, (Z_SOCLE + Z_RDC) / 2), (2 * A - .12, 2 * A - .12, Z_RDC - Z_SOCLE), M("platre").couleur(P.R), bev=0)
    P.boite((0, 0, (Z_ETAGE + Z_HAUT) / 2), (2 * B - .12, 2 * B - .12, Z_HAUT - Z_ETAGE), M("platre").couleur(P.R), bev=0)
    # rez-de-chaussée : porte, fenêtres (u = distance le long du mur)
    f = lambda u, z=2.2, l=.75, h=.85: (u - l / 2 - .12, u + l / 2 + .12, z - h / 2 - .12, z + h / 2 + .12)
    rdc = [[(A - 1.2 - .62, A - 1.2 + .62, Z_SOCLE, Z_SOCLE + 2.15), f(A + 1.5)], [f(A)], [f(A - 1.5), f(A + 1.5)], [f(A)]]
    for k, (a_, b_, o) in enumerate(murs(A, Z_SOCLE, Z_RDC, rdc)): pan_de_bois(P, a_, b_, Z_SOCLE, Z_RDC, o, graine_motif=graine + k)
    porte(P, (-1.2, -A - .07, Z_SOCLE), l=1.1, h=2.05, mat="chene_c", cintree=False, seuil=False)
    escalier(P, (-1.2, -A - .07, Z_SOCLE), 1.1, 4, haut=.225, prof=.4)
    auvent(P, (-1.2, -A - .05, Z_SOCLE + 2.35), l=1.8, prof=.7)                                   # auvent sur consoles au-dessus de la porte
    L_ = (-.25, -A - .06, Z_SOCLE + 1.85); P.ajouter(lanterne.construire(V, L_), Matrix.Translation(L_))         # lanterne à droite de la porte
    P.ajouter(pot_fleurs.construire(), Matrix.Translation((-2.15, -A - .45, 0)))                     # pot au pied des marches
    P.ajouter(tonneau.construire(), Matrix.Translation((2.9, -A - .45, 0)))                          # tonneau au coin   # 4 marches de 22,5 cm (le joueur monte 30 cm au plus)
    for (x, y, rz) in ((1.5, -A - .07, 0), (A + .07, 0, math.pi / 2), (-1.5, A + .07, math.pi), (1.5, A + .07, math.pi), (-A - .07, 0, -math.pi / 2)):
        fenetre(V, P, (x, y, 2.2), rz=rz, h=.85, mat_volet="volet_v", appui="chene")
    # plancher de l'étage : solives qui dépassent (encorbellement), sablière, dessous en planches sombres
    for i in range(10):
        u = -A + .25 + i * (2 * A - .5) / 9
        for s in (-1, 1): poutre(P, (u, s * (A - .2), Z_RDC + .1), (u, s * (B + .14), Z_RDC + .1), l=.16, h=.2)
    for s in (-1, 1): poutre(P, (s * (A - .2), -A + .1, Z_RDC + .1), (s * (B + .14), -A + .1, Z_RDC + .1), l=.16, h=.2); poutre(P, (s * (A - .2), A - .1, Z_RDC + .1), (s * (B + .14), A - .1, Z_RDC + .1), l=.16, h=.2)
    P.boite((0, 0, Z_RDC + .02), (2 * B + .1, 2 * B + .1, .06), M("chene").sombre, bev=0)   # dessous de l'encorbellement (à l'ombre : brun)
    # étage
    e = lambda u, z=4.7, l=.7, h=.8: (u - l / 2 - .12, u + l / 2 + .12, z - h / 2 - .12, z + h / 2 + .12)
    etg = [[e(B - 2.1), e(B), e(B + 2.1)], [e(B)], [e(B - 1.6), e(B + 1.6)], [e(B)]]
    for k, (a_, b_, o) in enumerate(murs(B, Z_ETAGE, Z_HAUT, etg)): pan_de_bois(P, a_, b_, Z_ETAGE, Z_HAUT, o, graine_motif=graine + 10 + k)
    for x in (-2.1, 0, 2.1): fenetre(V, P, (x, -B - .07, 4.7), l=.7, h=.8, mat_volet="volet_v", appui="chene")
    for (x, y, rz) in ((1.6, B + .07, math.pi), (-1.6, B + .07, math.pi), (B + .07, 0, math.pi / 2), (-B - .07, 0, -math.pi / 2)):
        fenetre(V, P, (x, y, 4.7), rz=rz, l=.7, h=.8, mat_volet="volet_v", appui="chene", jardiniere=False)
    # toit de tuiles et pignons
    toit = ToitTuiles(0, 0, B + .4, B + .55, 5.5, 8.9).construire(P, cheminees=[(*CHEMINEE, .42)])
    for sx in (-1, 1): pignon_platre(P, sx * B, -B, B, Z_HAUT, toit, sens=sx)
    cheminee(P, *CHEMINEE, Z_HAUT - .5, toit.zf + .6, larg=.8, toit=toit)
    # buissons fleuris au pied de la façade
    for (bx, by) in ((-2.7, -3.9), (2.6, -3.9)):
        for i in range(4): P.sphere((bx + P.R.uniform(-.35, .35), by + P.R.uniform(-.2, .2), .18), P.R.uniform(.22, .32), M("feuillage").couleur(P.R), (1, 1, .85), sub=1, jit=.04)
        for i in range(5): P.sphere((bx + P.R.uniform(-.4, .4), by + P.R.uniform(-.25, .25), .36 + P.R.uniform(0, .12)), .07, M("fleur").couleur(P.R), sub=1)
    return P, V

if __name__ == "__main__":
    from apercu import apercu_maison
    P, V = construire()
    props = {"pied": list(PIED), "porte": list(PORTE), "interieur": INTERIEUR}
    apercu_maison([P.objet(props), V.objet()], "colombage", taille=max(PIED), haut=9.2, porte_seuil=PORTE, fenetre=FENETRE_FACE)
