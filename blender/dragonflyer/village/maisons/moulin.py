# Le moulin à vent (village de Fernhollow) : tour ronde de pierre qui s'affine, corbeaux de pierre sous une couronne de
# bois, chapeau conique de bardeaux un peu bombé, « casquette » de bardeaux qui prolonge le chapeau vers l'avant et
# abrite l'arbre des ailes, queue de manœuvre à l'arrière (perches posées sur une borne et une pierre). Les ailes sont
# un objet à part, « A_moulin », que le jeu fait tourner autour de l'axe Y de Blender (axe Z du jeu) : maillage centré
# sur l'axe, objet placé à l'axe, propriété « axe » = [x, y, z] (repère Blender), comme l'ancien maisons.py.
# Emprise 6,2 × 6,2 m (comme l'ancien), porte vers -Y, point « porte » (0, -3.6, 0), pas d'intérieur.
# Lancer seul : blender -b -P moulin.py -- <dossier>   (12 rendus, planche, controle.txt avec la capsule et le contrôle
# des ailes sur un tour complet, moulin.glb)
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."), os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "objets")]
import math
from mathutils import Vector, Matrix
from kit import Piece, poutre, porte, fenetre, tour_pierres, cone_bardeaux, nb_sommets, teinter
from materiaux import M, melange
import sacs_grain, meule, tonneau, lanterne

PIED, PORTE, INTERIEUR = (6.2, 6.2), (0, -3.6, 0), ""
Z_BAS, Z_PIERRE, Z_TOUR = -2.8, -.6, 8.0     # cœur sous le sol (pentes), pierres dès -0,6 m, haut de la tour
R0, R1 = 2.8, 2.05                           # rayon du cœur en Z_PIERRE et en haut (les pierres dépassent de 0,16 m)
AXE = (0, -3.4, 9.0)                         # centre des ailes (repère Blender) : les ailes tournent dans le plan y = -3,4
L_AILE = 5.8                                 # bout des ailes à 3,1 m du sol au plus bas, 0,6 m devant la tour
FACE = -math.pi / 2                          # angle de la façade (-Y)
FENETRES = [(FACE, 4.4), (0.0, 2.6), (math.pi * .5, 3.6), (math.pi, 5.6), (FACE + .5, 6.6)]   # (angle, hauteur)
FL, FH = .6, .74                             # fenêtres
FENETRE_FACE = (0, -(R0 + (R1 - R0) * (4.4 - Z_PIERRE) / (Z_TOUR - Z_PIERRE)) - .12, 4.4)
L_PORTE, H_PORTE = 1.15, 2.3                 # porte (la mesure du contrôle va du montant à l'anneau : 0,82 m)
Z_COUR = Z_TOUR + .02                        # dessous de la couronne de bois
Q_ANGLE, Q_R = 3 * math.pi / 4, 3.9          # queue de manœuvre : vers l'arrière gauche (la fenêtre du dos reste libre), pied à 3,9 m de l'axe

def rayon(z): return R0 + (R1 - R0) * (z - Z_PIERRE) / (Z_TOUR - Z_PIERRE)
def pol(a, r, z=0.0): return Vector((math.cos(a) * r, math.sin(a) * r, z))

def ailes(graine=41):
    """Les quatre ailes (objet A_moulin) : centrées sur l'axe, dans le plan XZ ; chaque aile = une vergue (le bras), un
    cadre de lattes (barreaux, longeron extérieur) et une toile un peu gonflée, côté tour."""
    A = Piece("A_moulin", graine); R = A.R
    for k in range(4):
        a = math.pi / 4 + k * math.pi / 2; d = Vector((math.cos(a), 0, math.sin(a))); p = Vector((-math.sin(a), 0, math.cos(a)))
        poutre(A, d * .15, d * L_AILE, l=.17, h=.17, mat="chene")                                        # vergue
        r0, r1, lg = 1.25, L_AILE - .1, 1.2
        for j in range(8):                                                                              # barreaux
            t = r0 + (r1 - r0) * j / 7
            poutre(A, d * t - p * .12 + Vector((0, -.06, 0)), d * t + p * lg + Vector((0, -.06, 0)), l=.055, h=.055, mat="chene_c", bev=0)
        poutre(A, d * r0 + p * lg + Vector((0, -.06, 0)), d * (r1 + .05) + p * lg + Vector((0, -.06, 0)), l=.07, h=.07, mat="chene_c", bev=0)   # longeron
        # toile crème, gonflée au milieu (vers +Y, côté tour), bords un peu plus sombres
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
    A.cylindre((0, -.2, 0), (0, 1.3, 0), .17, .17, M("chene").couleur(R), n=8)          # arbre (rentre dans la casquette)
    A.cylindre((0, -.25, 0), (0, .12, 0), .3, .3, M("chene").sombre, n=8)               # moyeu, là où se croisent les vergues
    A.cylindre((0, -.42, 0), (0, -.25, 0), .2, .08, M("fer").couleur(R), n=8)           # bout de l'arbre, en pointe
    return A

def touffe(P, x, y, fleurs=True):
    """Touffe d'herbe (brins en pointes) et quelques fleurs, au pied du mur."""
    R = P.R
    for i in range(2):
        bx, by = x + R.uniform(-.12, .12), y + R.uniform(-.12, .12); h = R.uniform(.22, .38)
        P.cylindre((bx, by, -.02), (bx + R.uniform(-.06, .06), by + R.uniform(-.06, .06), h), .08, .006, M("feuillage").couleur(R, .15), n=3)
    if fleurs:
        P.sphere((x + R.uniform(-.1, .1), y + R.uniform(-.1, .1), R.uniform(.25, .35)), .06, M("fleur").couleur(R), sub=1)

def construire(graine=41):
    P = Piece("M_moulin", graine); V = Piece("W_moulin", graine + 1); R = P.R
    # tour : cœur (cône de mortier) et pierres en assises, ouvertes pour la porte et les fenêtres, plus petites autour de la porte
    P.cylindre((0, 0, Z_BAS), (0, 0, Z_TOUR), R0 + (R0 - R1) * (Z_PIERRE - Z_BAS) / (Z_TOUR - Z_PIERRE), R1, melange(M("mortier").teintes[0], M("moellon").sombre, .45), n=20)   # joints gris-brun
    ouv = [(FACE - .36, FACE + .36, -1, 1.8), (FACE - .26, FACE + .26, 1.8, 2.6)]
    for (a, z) in FENETRES:
        da = (FL / 2 + .22) / rayon(z); ouv.append((a - da, a + da, z - FH / 2 - .14, z + FH / 2 + .2))
    n0 = nb_sommets(P)
    tour_pierres(P, R0, R1, Z_PIERRE, Z_TOUR, ouv, taille=1.0, fines=[(FACE, .62, 3.2)])
    teinter(P, n0, "moellon", graine)                                   # pierres plus ou moins claires, pied plus chaud
    # porte (en retrait dans l'épaisseur du mur, arc de claveaux), fenêtres, lanterne
    yp = -math.sqrt(R0 ** 2 - (L_PORTE / 2 + .07) ** 2) - .08
    porte(P, (0, yp, 0), l=L_PORTE, h=H_PORTE, mat="peint")
    for (a, z) in FENETRES:
        r = rayon(z) + .1; fenetre(V, P, (math.cos(a) * r, math.sin(a) * r, z), rz=a + math.pi / 2, l=FL, h=FH, volets=False, jardiniere=False)
    zl = 2.2; L_ = Vector((-1.05, -math.sqrt((rayon(zl) + .16) ** 2 - 1.05 ** 2) + .02, zl)); rl = -math.asin(1.05 / (rayon(zl) + .16))
    bras = Matrix.Rotation(rl, 3, "Z") @ Vector((0, -.5, 0))                  # la vitre suit le bras tourné face au mur rond
    P.ajouter(lanterne.construire(V, L_ + bras - Vector((0, -.5, 0))), Matrix.Translation(L_) @ Matrix.Rotation(rl, 4, "Z"))
    # corbeaux de pierre (deux assises en encorbellement) qui portent la couronne de bois
    for k in range(16):
        a = 2 * math.pi * (k + .5) / 16
        for (z0, z1, sail, larg) in ((Z_COUR - .5, Z_COUR - .26, .26, .26), (Z_COUR - .26, Z_COUR, .46, .32)):
            r_in = R1 + .02; r_out = R1 + .16 + sail
            P.boite(pol(a, (r_in + r_out) / 2, (z0 + z1) / 2), (r_out - r_in, larg, z1 - z0 - .02), M("moellon").couleur(R, .08), rz=a, bev=0)
    P.cylindre((0, 0, Z_COUR), (0, 0, Z_COUR + .3), R1 + .62, R1 + .62, M("chene").couleur(R), n=24)     # couronne
    # chapeau de bardeaux et épi de faîtage
    zc0, zc1 = Z_COUR + .3, Z_COUR + 3.1
    cone_bardeaux(P, 0, 0, zc0, R1 + .78, zc1, bombe=.3, rang=.38, larg=.44)
    P.cylindre((0, 0, zc1 - .15), (0, 0, zc1 + .35), .1, .06, M("chene").sombre, n=6)
    P.sphere((0, 0, zc1 + .42), .13, M("chene").sombre, sub=1)
    # casquette : petit toit de bardeaux à deux pans qui sort du chapeau vers l'avant et abrite l'arbre des ailes
    ya, yb, zn = -1.0, AXE[1] + .33, AXE[2]                 # de l'intérieur du chapeau jusqu'à 0,33 m des ailes
    hl, zf_, ze = .72, zn + 1.0, zn + .42                   # demi-largeur, faîte, égout
    P.boite((0, (ya + yb) / 2, zn - .05), (1.2, ya - yb, .95), M("bardeau_d").couleur(R), bev=.03)     # caisson
    ang = math.atan2(zf_ - ze, hl); lp = math.hypot(hl, zf_ - ze) + .12
    for s in (-1, 1):
        for rgi in range(3):   # trois rangs de bardeaux par pan
            t = (rgi + .5) / 3; zz = zf_ - (zf_ - ze) * t + .04; xx = s * hl * t
            n_ = 6
            for i in range(n_):
                y0 = ya + (yb - .06 - ya) * i / n_; y1 = ya + (yb - .06 - ya) * (i + 1) / n_
                P.boite((xx, (y0 + y1) / 2 + R.uniform(-.01, .01), zz), (lp / 3 * 1.3, abs(y1 - y0) - .015, .06), M("bardeau").couleur(R), ry=s * ang, bev=0)
    P.cylindre((0, ya, zf_ + .06), (0, yb - .1, zf_ + .06), .09, .09, M("bardeau").sombre, n=6)            # faîtage
    for i in range(5):   # pignon de planches, percé pour l'arbre
        x = -hl + .1 + i * (2 * hl - .2) / 4; zt = zf_ - (zf_ - ze) * abs(x) / hl - .05
        P.boite((x, yb - .03, (zn - .5 + zt) / 2), ((2 * hl - .2) / 4 * .96, .06, zt - (zn - .5)), M("chene").couleur(R, .12), bev=0)
    # queue de manœuvre : deux perches de 15 cm qui descendent de la couronne vers l'arrière gauche, une traverse au
    # milieu, la barre du treuil et une borne plantée sur une grosse pierre
    u, w = pol(Q_ANGLE, 1), pol(Q_ANGLE + math.pi / 2, 1); pied = pol(Q_ANGLE, Q_R, .9)
    for s in (-1, 1):
        poutre(P, pol(Q_ANGLE, R1 + .55, Z_COUR + .12) + w * s * .4, pied + w * s * .2, l=.15, h=.15)
    milieu = (pol(Q_ANGLE, R1 + .55, Z_COUR + .12) + pied) / 2
    poutre(P, milieu - w * .36, milieu + w * .36, l=.12, h=.12)                                              # traverse
    poutre(P, pied - w * .45 + Vector((0, 0, -.05)), pied + w * .45 + Vector((0, 0, -.05)), l=.14, h=.14)  # barre du treuil
    poutre(P, pol(Q_ANGLE, Q_R, .05), pol(Q_ANGLE, Q_R, 1.1), l=.22, h=.22)                                  # borne
    P.boite(pol(Q_ANGLE, Q_R, .05), (.66, .62, .3), M("moellon").couleur(R), rz=Q_ANGLE, bev=.08, jit=.02)   # pierre d'appui
    # la vie autour : tas de sacs, tonnelet près du seuil, meule de rechange, touffes et fleurs au pied du mur
    a_s = -.85; P.ajouter(sacs_grain.construire(), Matrix.Translation(pol(a_s, 3.58)) @ Matrix.Rotation(a_s + math.pi / 2, 4, "Z"))
    P.ajouter(tonneau.construire(r=.24, h=.58, n=8), Matrix.Translation((.95, -3.52, 0)))
    P.ajouter(meule.construire(), Matrix.Translation((-1.75, -2.75, 0)) @ Matrix.Rotation(-.57, 4, "Z"))   # adossée à la tour
    occupe = [(FACE, .3), (a_s, .42), (-2.13, .25), (Q_ANGLE, .2)]                                         # porte, sacs, meule, queue
    for k in range(18):
        a = 2 * math.pi * k / 18 + R.uniform(-.05, .05)
        if any(abs((a - b + math.pi) % (2 * math.pi) - math.pi) < d for (b, d) in occupe): continue
        p = pol(a, 3.05 + R.uniform(0, .12)); touffe(P, p.x, p.y, fleurs=k % 3 == 0)
    for x in (-.78, .6): touffe(P, x, -3.25)                                                               # de part et d'autre du seuil
    for (bx, by) in ((2.6, 2.3),):
        for i in range(3):
            P.sphere((bx + R.uniform(-.25, .25), by + R.uniform(-.25, .25), .16), R.uniform(.2, .28), M("feuillage").couleur(R), (1, 1, .85), sub=1, jit=.04)
    return P, V, ailes()

def controle_ailes(obM, A):
    """Ailes sur un tour complet (tous les 3°) : hauteur la plus basse de leur bord, et rayons tirés le long de chaque
    arête des ailes (hors moyeu et arbre) contre le moulin : aucune ne doit couper le chapeau, la casquette ni la queue."""
    import bpy
    from mathutils.bvhtree import BVHTree
    bvh = BVHTree.FromObject(obM, bpy.context.evaluated_depsgraph_get())
    axe = Vector(AXE); verts = [v.co.copy() for v in A.bm.verts]
    A.bm.verts.index_update()
    aretes = [(e.verts[0].index, e.verts[1].index) for e in A.bm.edges]
    ray = lambda v: math.hypot(v.x, v.z)
    garde = [(i, j) for (i, j) in aretes if ray(verts[i]) > .6 and ray(verts[j]) > .6]
    zmin, touches = 99.0, 0
    for k in range(120):
        a = 2 * math.pi * k / 120; ca, sa = math.cos(a), math.sin(a)
        tv = [axe + Vector((v.x * ca - v.z * sa, v.y, v.x * sa + v.z * ca)) for v in verts]
        zmin = min(zmin, min(tv[i].z for (i, j) in garde))
        for (i, j) in garde:
            d = tv[j] - tv[i]; L = d.length
            if L > 1e-6 and bvh.ray_cast(tv[i], d / L, L)[0] is not None: touches += 1
    porte_haut = H_PORTE + .3
    return [f"ailes sur un tour complet : bord le plus bas à {zmin:.2f} m du sol ; haut de l'arc de la porte {porte_haut:.2f} m "
            f"(marge {zmin - porte_haut:.2f} m), sacs 0,85 m (marge {zmin - .85:.2f} m), joueur 1,70 m (marge {zmin - 1.7:.2f} m)",
            f"ailes contre le moulin (chapeau, casquette, queue, tour) sur 120 positions : {touches} contact(s) → {'AUCUN CONTACT' if touches == 0 else 'CONTACT'}"]

if __name__ == "__main__":
    import os as _os
    from apercu import apercu_maison, sortie
    P, V, A = construire()
    props = {"pied": list(PIED), "porte": list(PORTE), "interieur": INTERIEUR}
    obM = P.objet(props); lignes = controle_ailes(obM, A)
    obA = A.objet({"axe": list(AXE)}); obA.location = AXE
    objets = [obM, V.objet(), obA]
    apercu_maison(objets, "moulin", taille=max(PIED), haut=12.0, porte_seuil=PORTE, fenetre=FENETRE_FACE)
    lignes += [f"{o.name} : {sum(len(p.vertices) - 2 for p in o.data.polygons)} triangles" for o in objets]
    open(_os.path.join(sortie(), "controle.txt"), "a").write("\n".join(lignes) + "\n"); print("\n".join(lignes))
