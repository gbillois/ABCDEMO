# La maison de montagne (village de Stonebrook) : murs épais de pierre sombre en grosses assises, pignons de pierre,
# toit d'ardoises raide, grosse cheminée collée au pignon et qui monte au-dessus du faîte. Faite seulement des pièces
# du kit et des objets du village. Emprise 6,8 × 7,6 m (comme l'ancienne), porte vers -Y, point « porte » (0, -4.3, 0).
# Trois variantes (même emprise, même porte) : 0 cheminée à droite, volets rouges, tas de bois ; 1 en miroir (cheminée
# à gauche), volets verts, tonneau ; 2 cheminée à droite, volets bleus, bancs et pots.
# Lancer seule : blender -b -P pierre.py -- <dossier> [variante]   (12 rendus, planche, controle.txt, pierre.glb)
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."), os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "objets")]
import math, bmesh
from mathutils import Matrix
from kit import Piece, mur_moellons, porte, fenetre, cheminee_pignon, chevrons, nb_sommets, teinter, rogner, prisme_pignon, ToitArdoises
from materiaux import M, melange
import banc, tas_bois, tonneau, pot_fleurs, lanterne

PIED, PORTE, INTERIEUR = (6.8, 7.6), (0, -4.3, 0), "maison"
X, Y = 3.2, 3.6                          # faces des murs
Z_BAS, Z_PIERRE, Z_HAUT = -2.8, -.6, 3.2   # cœur sous le sol (pentes), pierres dès -0,6 m, haut des murs sous l'avant-toit
DEB_Y, DEB_X = .5, .35                   # débords du toit (égouts, pignons)
Z_BORD, Z_FAITE = 3.0, 6.7               # dessus du toit au bord de l'égout, au faîte
XF = 2.05                                # fenêtres de façade à ±2,05 m (volets libres de l'arc de la porte)
FENETRE_FACE = (XF, -Y - .07, 1.25)
CHEMINEE = (X + .25, 0.0)                # collée au pignon droit, au faîte
VOLETS = {0: "volet_r", 1: "volet_v", 2: "peint"}
C_COEUR = melange(M("mortier").teintes[0], M("pierre_s").sombre, .45)   # joints : mortier gris-brun (jamais noir)

def construire(graine=31, variante=0):
    P = Piece("M_pierre", graine); V = Piece("W_pierre", graine + 1); R = P.R
    toit = ToitArdoises(0, 0, X + DEB_X, Y + DEB_Y, Z_BORD, Z_FAITE, ep=.25)
    ouv_fen = lambda u, z=1.25: (u - .9, u + .9, z - .6, z + .62)   # les pierres s'arrêtent au bord des volets et de l'appui
    yc = CHEMINEE[1] + Y
    # murs de pierre sombre (grosses assises), pignons qui montent jusque sous le toit puis rabotés selon la pente
    n0 = nb_sommets(P)
    mur_moellons(P, (-X, -Y), (X, -Y), Z_PIERRE, Z_HAUT, [(X - .82, X + .82, -1, 2.75), ouv_fen(X - XF), ouv_fen(X + XF)], taille=.62)   # façade
    mur_moellons(P, (X, Y), (-X, Y), Z_PIERRE, Z_HAUT, [ouv_fen(X - 1.5), ouv_fen(X + 1.5)], taille=.62)                              # dos
    teinter(P, n0, "pierre_s", graine)
    for (a, b, ouv) in (((X, -Y), (X, Y), [ouv_fen(1.6), (yc - .8, yc + .8, -1, 2.85), (yc - .57, yc + .57, 2.85, 99)]),            # pignon droit (cheminée)
                        ((-X, Y), (-X, -Y), [ouv_fen(Y - 1.6), (Y - .48, Y + .48, 3.95, 4.8)])):                                   # pignon gauche (lucarne)
        n0 = nb_sommets(P)
        mur_moellons(P, a, b, Z_PIERRE, Z_FAITE, ouv, taille=.62)
        teinter(P, n0, "pierre_s", graine + 3)
        rogner(P, n0, lambda x, y: toit.dessous(x, y) + .03)
    # cœur plein (mortier sombre) : murs et pignons
    P.boite((0, 0, (Z_BAS + Z_HAUT) / 2), (2 * X - .1, 2 * Y - .1, Z_HAUT - Z_BAS), C_COEUR, bev=0)
    prisme_pignon(P, -X + .05, X - .05, -Y + .05, Y - .05, Z_HAUT - .05, toit.dessous(0, 0) + .02, C_COEUR)
    # toit d'ardoises, chevrons sous les égouts
    toit.construire(P, cheminees=[(*CHEMINEE, .55)])
    chevrons(P, toit, [((-X, -Y), (X, -Y)), ((X, Y), (-X, Y))], Z_HAUT, pas_=.6)
    # grosse cheminée : massif large jusqu'à 2,4 m, glacis, puis le conduit, 0,9 m au-dessus du faîte
    n0 = nb_sommets(P)
    cheminee_pignon(P, X, CHEMINEE[1], Z_PIERRE, Z_FAITE + .9, z_epaule=2.4, base=(1.0, 1.56), conduit=(.8, 1.1), c_coeur=C_COEUR, mat="pierre_s")
    # porte cintrée de chêne sombre (arc et seuil de pierre claire), fenêtres
    porte(P, (0, -Y - .07, 0), l=1.2, h=2.15, mat="chene")
    volet = VOLETS[variante]
    fenetre(V, P, (-XF, -Y - .07, 1.25), mat_volet=volet, jardiniere=variante != 0)
    fenetre(V, P, (XF, -Y - .07, 1.25), mat_volet=volet)
    fenetre(V, P, (X + .07, -Y + 1.6, 1.25), rz=math.pi / 2, mat_volet=volet)
    fenetre(V, P, (-X - .07, 1.6 - 0, 1.25), rz=-math.pi / 2, mat_volet=volet, jardiniere=False)
    fenetre(V, P, (-X - .07, 0, 4.35), rz=-math.pi / 2, l=.55, h=.6, volets=False, jardiniere=False)   # lucarne du grenier
    for x in (1.5, -1.5): fenetre(V, P, (x, Y + .07, 1.25), rz=math.pi, mat_volet=volet, jardiniere=False)
    # la vie autour
    if variante == 0:
        P.ajouter(banc.construire(), Matrix.Translation((-XF, -Y - .62, 0)))   # dossier devant l'appui de la fenêtre
        P.ajouter(tas_bois.construire(L=1.6, rangs=5), Matrix.Translation((-X - .4, -1.4, 0)) @ Matrix.Rotation(-math.pi / 2, 4, "Z"))
        L_ = (1.02, -Y - .17, 1.85); P.ajouter(lanterne.construire(V, L_), Matrix.Translation(L_))
    elif variante == 1:
        P.ajouter(tonneau.construire(), Matrix.Translation((2.85, -Y - .5, 0)))
        P.ajouter(tas_bois.construire(L=1.6, rangs=5), Matrix.Translation((-X - .4, -1.4, 0)) @ Matrix.Rotation(-math.pi / 2, 4, "Z"))
        P.ajouter(pot_fleurs.construire(), Matrix.Translation((-1.0, -Y - .45, 0)))
    else:
        P.ajouter(banc.construire(), Matrix.Translation((X + .4, -1.6 + 0, 0)) @ Matrix.Rotation(math.pi / 2, 4, "Z"))
        for x in (-1.0, 1.0): P.ajouter(pot_fleurs.construire(), Matrix.Translation((x, -Y - .45, 0)))
    # rochers et touffes au pied des murs
    for (bx, by) in ((-2.9, -4.0), (2.95, 3.9), (-3.5, 3.2)):
        for i in range(3):
            P.sphere((bx + R.uniform(-.3, .3), by + R.uniform(-.2, .2), .16), R.uniform(.2, .3), M("feuillage").couleur(R), (1, 1, .85), sub=1, jit=.04)
        P.sphere((bx + R.uniform(-.3, .3), by + R.uniform(-.2, .2), .08), R.uniform(.25, .35), M("pierre_s").couleur(R), (1.2, 1, .6), sub=1, jit=.05)
        for i in range(4):
            P.sphere((bx + R.uniform(-.35, .35), by + R.uniform(-.2, .2), .34 + R.uniform(0, .1)), .065, M("fleur").couleur(R), sub=1)
    if variante == 1:   # miroir : la cheminée passe à gauche (porte et emprise inchangées)
        for Q in (P, V):
            bmesh.ops.scale(Q.bm, vec=(-1, 1, 1), verts=list(Q.bm.verts)); bmesh.ops.reverse_faces(Q.bm, faces=list(Q.bm.faces))
    return P, V

if __name__ == "__main__":
    from apercu import apercu_maison
    var = int(sys.argv[sys.argv.index("--") + 2]) if "--" in sys.argv and len(sys.argv) > sys.argv.index("--") + 2 else 0
    P, V = construire(variante=var)
    props = {"pied": list(PIED), "porte": list(PORTE), "interieur": INTERIEUR}
    apercu_maison([P.objet(props), V.objet()], "pierre", taille=max(PIED), haut=8.0, porte_seuil=PORTE, fenetre=FENETRE_FACE)
