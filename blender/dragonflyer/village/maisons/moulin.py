# Le moulin à vent (village de Fernhollow) : tour ronde de pierre qui s'affine, couronne de bois, chapeau conique de
# bardeaux un peu bombé, « nez » qui abrite l'arbre des ailes, queue de manœuvre à l'arrière. Les ailes sont un objet à
# part, « A_moulin », que le jeu fait tourner autour de l'axe Y de Blender (axe Z du jeu) : maillage centré sur l'axe,
# objet placé à l'axe, propriété « axe » = [x, y, z] (repère Blender), comme l'ancien maisons.py.
# Emprise 6,2 × 6,2 m (comme l'ancien), porte vers -Y, point « porte » (0, -3.6, 0), pas d'intérieur.
# Lancer seul : blender -b -P moulin.py -- <dossier>   (12 rendus, planche, controle.txt avec la capsule, moulin.glb)
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."), os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "objets")]
import math
from mathutils import Vector, Matrix
from kit import Piece, poutre, porte, fenetre, tour_pierres, cone_bardeaux, nb_sommets, teinter
from materiaux import M, melange
import sacs_grain, meule

PIED, PORTE, INTERIEUR = (6.2, 6.2), (0, -3.6, 0), ""
Z_BAS, Z_PIERRE, Z_TOUR = -2.8, -.6, 8.0     # cœur sous le sol (pentes), pierres dès -0,6 m, haut de la tour
R0, R1 = 2.8, 2.05                           # rayon du cœur en Z_PIERRE et en haut (les pierres dépassent de 0,16 m)
AXE = (0, -3.4, 9.0)                         # centre des ailes (repère Blender) : les ailes tournent dans le plan y = -3,4
L_AILE = 5.8                                 # bout des ailes à 3,2 m du sol, 0,6 m devant la tour
FACE = -math.pi / 2                          # angle de la façade (-Y)
FENETRES = [(FACE, 4.3), (0.0, 2.6), (math.pi * .5, 3.6), (math.pi, 5.6), (FACE + .5, 6.6)]   # (angle, hauteur)
FENETRE_FACE = (0, -(R0 + (R1 - R0) * (4.3 - Z_PIERRE) / (Z_TOUR - Z_PIERRE)) - .12, 4.3)

def rayon(z): return R0 + (R1 - R0) * (z - Z_PIERRE) / (Z_TOUR - Z_PIERRE)

def ailes(graine=41):
    """Les quatre ailes (objet A_moulin) : centrées sur l'axe, dans le plan XZ ; chaque aile = une vergue (le bras), un
    cadre de lattes (barreaux tous les 50 cm, longeron extérieur) et une toile un peu gonflée, côté du vent."""
    A = Piece("A_moulin", graine); R = A.R
    for k in range(4):
        a = math.pi / 4 + k * math.pi / 2; d = Vector((math.cos(a), 0, math.sin(a))); p = Vector((-math.sin(a), 0, math.cos(a)))
        poutre(A, d * -.2, d * L_AILE, l=.17, h=.17, mat="chene")                                        # vergue
        r0, r1, lg = 1.25, L_AILE - .1, 1.2
        for j in range(10):                                                                             # barreaux
            t = r0 + (r1 - r0) * j / 9
            poutre(A, d * t - p * .12 + Vector((0, -.06, 0)), d * t + p * lg + Vector((0, -.06, 0)), l=.055, h=.055, mat="chene_c", bev=0)
        poutre(A, d * r0 + p * lg + Vector((0, -.06, 0)), d * (r1 + .05) + p * lg + Vector((0, -.06, 0)), l=.07, h=.07, mat="chene_c", bev=0)   # longeron
        # toile : 3 × 2 carreaux, gonflée au milieu (vers +Y, côté tour), coins tendus sur le cadre
        c = M("toile").couleur(R); cs = melange(c, M("chene_c").teintes[0], .25)
        vs = {}
        for i in range(4):
            for j in range(3):
                t = r0 + .05 + (r1 - r0 - .1) * i / 3; w = .08 + (lg - .14) * j / 2
                gonfle = .12 * math.sin(math.pi * i / 3) * math.sin(math.pi * j / 2)
                q = d * t + p * w + Vector((0, .02 + gonfle, 0)); v = A.bm.verts.new(q); v[A.col] = (*(c if 0 < j < 2 and 0 < i < 3 else cs), 1); vs[i, j] = v
        for i in range(3):
            for j in range(2):
                f = A.bm.faces.new((vs[i, j], vs[i + 1, j], vs[i + 1, j + 1], vs[i, j + 1])); f[A.lisse] = 1
    A.cylindre((0, -.25, 0), (0, 1.0, 0), .2, .2, M("chene").couleur(R), n=10)        # arbre (rentre dans le nez)
    A.cylindre((0, -.3, 0), (0, .15, 0), .42, .42, M("chene").sombre, n=10)            # moyeu
    A.cylindre((0, -.36, 0), (0, -.3, 0), .3, .3, M("fer").couleur(R), n=10)           # plaque de fer
    return A

def construire(graine=41):
    P = Piece("M_moulin", graine); V = Piece("W_moulin", graine + 1); R = P.R
    # tour : cœur (cône de mortier) et pierres en assises, ouvertes pour la porte et les fenêtres
    P.cylindre((0, 0, Z_BAS), (0, 0, Z_TOUR), R0 + (R0 - R1) * (Z_PIERRE - Z_BAS) / (Z_TOUR - Z_PIERRE), R1, M("mortier").couleur(R), n=20)
    ouv = [(FACE - .35, FACE + .35, -1, 1.7), (FACE - .25, FACE + .25, 1.7, 2.5)]
    for (a, z) in FENETRES:
        da = .52 / rayon(z); ouv.append((a - da, a + da, z - .52, z + .5))
    n0 = nb_sommets(P)
    tour_pierres(P, R0, R1, Z_PIERRE, Z_TOUR, ouv, taille=.85)
    teinter(P, n0, "moellon", graine)                                   # pierres plus ou moins claires, pied plus chaud
    # porte (en retrait dans l'épaisseur du mur, arc de claveaux), seuil, fenêtres
    yp = -math.sqrt(R0 ** 2 - .66 ** 2) - .08
    porte(P, (0, yp, 0), l=1.2, h=2.1, mat="peint")
    for (a, z) in FENETRES:
        r = rayon(z) + .1; fenetre(V, P, (math.cos(a) * r, math.sin(a) * r, z), rz=a + math.pi / 2, l=.5, h=.62, volets=False, jardiniere=False)
    # couronne de bois en haut de la tour, sous le chapeau
    P.cylindre((0, 0, Z_TOUR - .05), (0, 0, Z_TOUR + .32), R1 + .22, R1 + .22, M("chene").couleur(R), n=20)
    for k in range(16):   # corbeaux sous la couronne
        a = 2 * math.pi * (k + .5) / 16; d = Vector((math.cos(a), math.sin(a), 0))
        poutre(P, d * (R1 + .02) + Vector((0, 0, Z_TOUR - .3)), d * (R1 + .3) + Vector((0, 0, Z_TOUR - .02)), l=.12, h=.12, bev=0)
    # chapeau de bardeaux et épi de faîtage
    zc0, zc1 = Z_TOUR + .32, Z_TOUR + 3.1
    cone_bardeaux(P, 0, 0, zc0, R1 + .62, zc1, bombe=.3, rang=.34, larg=.38)
    P.cylindre((0, 0, zc1 - .15), (0, 0, zc1 + .35), .1, .06, M("chene").sombre, n=6)
    P.sphere((0, 0, zc1 + .42), .13, M("chene").sombre, sub=1)
    # nez : petit toit à deux pans qui abrite l'arbre des ailes
    ya, yb, zn = -1.4, AXE[1] + .55, AXE[2]
    P.boite((0, (ya + yb) / 2, zn - .1), (.9, ya - yb, .9), M("chene").couleur(R), bev=.03)
    for s in (-1, 1):
        P.boite((s * .27, (ya + yb) / 2 - .1, zn + .5), (.68, ya - yb + .2, .07), M("bardeau").couleur(R), ry=s * .55, bev=.015)
    # queue de manœuvre : deux perches qui descendent de la couronne vers l'arrière, jusqu'à une borne au sol
    for s in (-1, 1):
        poutre(P, (s * .35, R1 + .2, Z_TOUR + .1), (s * .12, 3.75, .55), l=.14, h=.14)
    poutre(P, (0, 3.75, 0), (0, 3.75, .8), l=.24, h=.24)                       # borne
    poutre(P, (-.3, 3.55, .55), (.3, 3.55, .55), l=.1, h=.1)                    # barre du treuil
    # la vie autour : sacs de grain, meule de rechange, touffes
    P.ajouter(sacs_grain.construire(), Matrix.Translation((1.75, -2.85, 0)) @ Matrix.Rotation(-.5, 4, "Z"))
    P.ajouter(meule.construire(), Matrix.Translation((-1.75, -2.75, 0)) @ Matrix.Rotation(-.57, 4, "Z"))   # adossée à la tour
    for (bx, by) in ((2.6, 2.3), (-2.9, 1.9), (-3.1, -1.2)):
        for i in range(3):
            P.sphere((bx + R.uniform(-.25, .25), by + R.uniform(-.25, .25), .16), R.uniform(.2, .28), M("feuillage").couleur(R), (1, 1, .85), sub=1, jit=.04)
        for i in range(3):
            P.sphere((bx + R.uniform(-.3, .3), by + R.uniform(-.25, .25), .34 + R.uniform(0, .1)), .065, M("fleur").couleur(R), sub=1)
    return P, V, ailes()

if __name__ == "__main__":
    import os as _os
    from apercu import apercu_maison, sortie
    P, V, A = construire()
    props = {"pied": list(PIED), "porte": list(PORTE), "interieur": INTERIEUR}
    obA = A.objet({"axe": list(AXE)}); obA.location = AXE
    objets = [P.objet(props), V.objet(), obA]
    apercu_maison(objets, "moulin", taille=max(PIED), haut=12.0, porte_seuil=PORTE, fenetre=FENETRE_FACE)
    lignes = [f"{o.name} : {sum(len(p.vertices) - 2 for p in o.data.polygons)} triangles" for o in objets]
    open(_os.path.join(sortie(), "controle.txt"), "a").write("\n".join(lignes) + "\n"); print("\n".join(lignes))
