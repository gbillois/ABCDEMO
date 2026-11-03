# La forge ouverte : plateforme de pierre à 0,5 m (sol de dalles, deux marches), côté rue (-Y) ouvert entre quatre
# poteaux sur dés de pierre sous une grosse poutre, toit de tuiles, mur du fond en pierre avec le foyer de forge et sa
# hotte qui monte en cheminée, côtés en pierre basse et planches. Dedans : enclume, soufflet, baquet, établi, râtelier
# d'outils ; enseigne pendue sous la poutre. Pas d'intérieur à ouvrir (le jeu ne fait pas entrer).
# Emprise 7,4 × 6,4 m comme avant. Point « porte » : (0, -2.0, 0.5), sur le sol de la forge juste derrière les poteaux
# (avant : (0, -3.6, 0.5), dans le vide devant la plateforme ; le jeu ne s'en sert pas pour une maison sans intérieur).
# Lancer seule : blender -b -P forge.py -- <dossier>   (12 rendus, planche, controle.txt avec la capsule, forge.glb)
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."), os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "objets")]
import math
from mathutils import Matrix, Vector
from kit import Piece, poutre, mur_moellons, ToitTuiles, planches_verticales, dalles, foyer_forge, poteau, cheminee, escalier, eclaircir, aeration, herbe
from materiaux import M
import enclume, soufflet, baquet, etabli, ratelier, enseigne, tonneau, pot_fleurs, tas_bois, echelle
from etabli import fer_a_cheval

PIED, PORTE, INTERIEUR = (7.4, 7.6), (0, -2.0, .5), ""   # emprise : 6,4 m de profondeur avant, 7,6 avec les objets au pied du mur du fond
XF, YAV, YAR = 3.45, -2.35, 3.0           # faces de la plateforme : côtés, devant (rue), fond
EP = .45                                  # épaisseur des murs de pierre
Z_BAS, Z_PIERRE, Z_SOL, Z_MURET = -2.8, -.6, .5, 1.3
Y_POT, Z_POUTRE = -2.2, 3.45              # ligne des poteaux de façade, axe de la poutre
Z_SABLIERE = 3.3                          # sablière du côté droit (ouvert)
FOYER = (1.35, YAR - EP - .6)             # centre du foyer (contre le mur du fond)
FENETRE_FACE = (0, Y_POT - .2, Z_POUTRE - .9)   # vue 10 : l'enseigne

def construire(graine=61):
    P = Piece("M_forge", graine); V = Piece("W_forge", graine + 1)
    xi, yi = XF - EP, YAR - EP                                                     # faces intérieures
    # plateforme et murs : cœurs de mortier, pierres dehors et dedans
    P.boite((0, (YAV + YAR) / 2, (Z_BAS + Z_SOL - .05) / 2), (2 * XF - .1, YAR - YAV - .1, Z_SOL - .05 - Z_BAS), M("mortier").couleur(P.R), bev=0)
    for sx in (-1, 1): P.boite((sx * (XF - EP / 2), (YAV + yi) / 2, (Z_SOL + Z_MURET) / 2), (EP - .1, yi - YAV - .05, Z_MURET - Z_SOL), M("mortier").couleur(P.R), bev=0)
    toit = ToitTuiles(0, 0, 3.75, 3.35, 3.3, 5.5)
    z_fond = toit.forme(0, YAR)[0] - toit.ep - .05
    P.boite((0, (yi + YAR) / 2, (Z_SOL + z_fond) / 2), (2 * XF - .1, EP - .1, z_fond - Z_SOL), M("mortier").couleur(P.R), bev=0)
    mur_moellons(P, (-XF, YAV), (XF, YAV), Z_PIERRE, Z_SOL, [], taille=.6)                       # devant de la plateforme
    mur_moellons(P, (XF, YAV), (XF, YAR), Z_PIERRE, Z_MURET, [], taille=.6)                       # côtés (muret)
    mur_moellons(P, (-XF, YAR), (-XF, YAV), Z_PIERRE, Z_MURET, [], taille=.6)
    mur_moellons(P, (XF, YAR), (-XF, YAR), Z_PIERRE, z_fond, [], taille=.6)                       # fond
    mur_moellons(P, (-xi, yi), (xi, yi), Z_SOL, z_fond, [], taille=.6)                            # fond, dedans
    mur_moellons(P, (xi, yi), (xi, YAV), Z_SOL, Z_MURET, [], taille=.6)                           # murets, dedans
    mur_moellons(P, (-xi, YAV), (-xi, yi), Z_SOL, Z_MURET, [], taille=.6)
    for sx in (-1, 1):                                                                            # chaperon de pierres plates
        n = 5
        for k in range(n):
            y0 = YAV + (yi - YAV) * k / n; y1 = YAV + (yi - YAV) * (k + 1) / n
            P.boite((sx * (XF - EP / 2), (y0 + y1) / 2, Z_MURET + .06), (EP + .1, y1 - y0 - .03, .12), M("moellon").couleur(P.R, .06), bev=.03, jit=.005)
    dalles(P, -xi, xi, YAV, yi, Z_SOL, taille=.7)
    escalier(P, (0, YAV - .07, Z_SOL), 2.0, 2, haut=.25, prof=.4)                                # 2 marches de 25 cm
    # côté gauche en planches au-dessus du muret (jusqu'au toit) ; côté droit ouvert au-dessus du muret (la lumière entre
    # sur l'enclume et le foyer) : un poteau sur le muret, une sablière, le pignon de planches seulement au-dessus
    sous_toit = lambda x, y: toit.forme(x, y)[0] - toit.ep * .5
    planches_verticales(P, (-XF, YAR), (-XF, YAV), Z_MURET, sous_toit, clair=.1)
    poteau(P, XF - EP / 2, .3, Z_MURET + .12, Z_SABLIERE - .14, cote=.24, de=False)
    poutre(P, (XF - .1, Y_POT - .2, Z_SABLIERE), (XF - .1, YAR, Z_SABLIERE), l=.26, h=.28)
    for s_ in (-1, 1): poutre(P, (XF - EP / 2, .3, Z_SABLIERE - .6), (XF - EP / 2, .3 + s_ * .55, Z_SABLIERE - .14), l=.14, h=.14)   # aisseliers
    planches_verticales(P, (XF, YAV), (XF, YAR), Z_SABLIERE + .14, sous_toit, clair=.1, sabliere=False)
    for sx in (-1, 1): aeration(P, (sx * (XF + .11), 0, 4.45), rz=sx * math.pi / 2)                # aérations des pignons
    for k, y in enumerate((-1.3, -.85, -.4)): fer_a_cheval(P, -XF - .12, y, 2.55 + .06 * (k % 2), r=.1, rz=math.pi / 2, debout=True)   # fers à cheval cloués au pignon
    P.ajouter(echelle.construire(), Matrix.Translation((-3.72, 1.5, 0)) @ Matrix.Rotation(.05, 4, "Y") @ Matrix.Rotation(math.pi / 2, 4, "Z"))   # échelle appuyée
    # façade ouverte : quatre poteaux sur dés, grosse poutre, aisseliers ; entraits et poinçons sous le toit
    for x in (-3.2, -1.25, 1.25, 3.2):
        poteau(P, x, Y_POT, Z_SOL, Z_POUTRE - .16, cote=.28)
        for s in (-1, 1):
            if abs(x + s * .6) < 3.3: poutre(P, (x, Y_POT, Z_POUTRE - .75), (x + s * .6, Y_POT, Z_POUTRE - .12), l=.16, h=.16)
    poutre(P, (-3.72, Y_POT, Z_POUTRE), (3.72, Y_POT, Z_POUTRE), l=.3, h=.32)                     # la poutre traverse les pignons
    fer_a_cheval(P, 0, Y_POT - .17, Z_POUTRE + .07, r=.11, debout=True)                          # fer à cheval porte-bonheur au-dessus de l'enseigne
    poutre(P, (-3.8, 0, toit.zf - .17), (3.8, 0, toit.zf - .17), l=.26, h=.3)                     # panne faîtière (ferme le faîte vu des pignons)
    for x in (-1.25, 1.25):
        poutre(P, (x, Y_POT, Z_POUTRE - .15), (x, yi + .3, Z_POUTRE - .15), l=.22, h=.26)
        poutre(P, (x, 0, Z_POUTRE - .02), (x, 0, toit.zf - toit.ep - .08), l=.2, h=.2)
    toit.construire(P, cheminees=[(FOYER[0], FOYER[1] + .25, .55)])
    # foyer de forge et hotte : la hotte de pierre pose sur un manteau de bois porté par deux montants
    foyer_forge(V, P, *FOYER, Z_SOL, l=1.8, p=1.2, h=.8)
    ym = FOYER[1] - .55
    for s in (-1, 1): poutre(P, (FOYER[0] + s * .8, ym, Z_SOL + .88), (FOYER[0] + s * .8, ym, 2.0), l=.14, h=.14)
    poutre(P, (FOYER[0] - .97, ym, 2.0), (FOYER[0] + .97, ym, 2.0), l=.22, h=.2)
    cheminee(P, FOYER[0], FOYER[1] + .25, 2.1, toit.zf + .7, larg=.8, toit=toit, base=1.75, z_epaule=2.5)
    # outils et meubles
    P.ajouter(soufflet.construire(), Matrix.Translation((-.05, FOYER[1] + .05, Z_SOL)) @ Matrix.Rotation(math.pi, 4, "Z"))   # soufflet à gauche du feu (vu de la rue)
    P.ajouter(enclume.construire(), Matrix.Translation((-.6, -.7, Z_SOL)) @ Matrix.Rotation(.25, 4, "Z"))
    P.ajouter(baquet.construire(), Matrix.Translation((-1.7, .9, Z_SOL)))
    P.ajouter(ratelier.construire(L=1.5), Matrix.Translation((-1.75, yi - .22, 2.35)))                 # marteaux et pinces au mur du fond
    P.ajouter(etabli.construire(), Matrix.Translation((-xi + .36, .1, Z_SOL)) @ Matrix.Rotation(math.pi / 2, 4, "Z"))
    P.ajouter(ratelier.construire(), Matrix.Translation((-XF + .02, .1, 2.3)) @ Matrix.Rotation(math.pi / 2, 4, "Z"))
    P.ajouter(tonneau.construire(r=.3, h=.75), Matrix.Translation((2.55, -1.5, Z_SOL)))
    P.ajouter(enseigne.construire(tiges=.25), Matrix.Translation((0, Y_POT - .12, Z_POUTRE - .16)))
    for (x, r) in ((-2.6, .22), (2.7, .18)): P.ajouter(pot_fleurs.construire(r=r), Matrix.Translation((x, YAV - .4, 0)))
    # au pied du mur du fond : tas de bois, tas de charbon et sa pelle, tonneau d'eau, herbe
    P.ajouter(tas_bois.construire(), Matrix.Translation((-1.6, YAR + .42, 0)) @ Matrix.Rotation(math.pi, 4, "Z"))
    for i in range(14):
        u, w = P.R.uniform(-1, 1), P.R.uniform(-1, 1)
        P.sphere((.45 + u * .5, YAR + .42 + w * .22, .08 + .3 * (1 - max(abs(u), abs(w)))), P.R.uniform(.12, .17), M("charbon").couleur(P.R), (1, 1, .7), sub=1, jit=.02)
    poutre(P, (1.15, YAR + .5, .06), (1.05, YAR + .16, 1.35), l=.04, h=.04, mat="chene_c", bev=0)     # pelle appuyée
    P.boite((1.16, YAR + .55, .16), (.24, .03, .28), M("fer").couleur(P.R), rx=-.25, bev=0)
    P.ajouter(tonneau.construire(r=.3), Matrix.Translation((2.6, YAR + .45, 0)))
    for x in (-2.8, -.5, 1.8, 3.2): herbe(P, x, YAR + .2)
    # l'intérieur ouvert : l'occlusion cuite l'assombrit beaucoup, on remonte ses couleurs (brun chaud, pas jaune) ;
    # un peu de suie en haut de la cheminée
    eclaircir(P, (-XF + EP - .05, YAV + .02, Z_SOL - .05), (XF - EP + .05, YAR - EP + .14, 3.75), f=1.5)
    for k in range(12):                                                                            # chevrons clairs sous les tuiles
        x = -3.3 + k * 6.6 / 11
        for sg in (-1, 1): poutre(P, (x, sg * 3.05, toit.forme(x, sg * 3.05)[0] - toit.ep - .1), (x, 0, toit.forme(x, 0)[0] - toit.ep - .1), l=.1, h=.12, mat="chene_c", bev=0)
    eclaircir(P, (-3.4, -3.1, 3.75), (3.4, 3.1, 5.6), f=1.5, garde=lambda co: co.z < toit.forme(co.x, co.y)[0] - toit.ep - .02)   # sous le toit seulement
    eclaircir(P, (FOYER[0] - .7, FOYER[1] - .5, toit.zf + .2), (FOYER[0] + .7, FOYER[1] + 1.0, toit.zf + 1.4), f=.72, teinte=(1, 1, 1.02))
    return P, V

def ouverture(ob):
    """Le côté ouvert compte comme porte : largeur libre entre les deux poteaux du milieu et hauteur libre sous
    l'enseigne et la poutre, mesurées sur la ligne des poteaux."""
    from mathutils.bvhtree import BVHTree
    import bpy
    bvh = BVHTree.FromObject(ob, bpy.context.evaluated_depsgraph_get()); l = []
    for z in (Z_SOL + .6, Z_SOL + 1.4):
        g = bvh.ray_cast(Vector((0, Y_POT, z)), Vector((-1, 0, 0)), 5); d = bvh.ray_cast(Vector((0, Y_POT, z)), Vector((1, 0, 0)), 5)
        l.append((d[0].x - g[0].x) if g[0] and d[0] else float("nan"))
    u = bvh.ray_cast(Vector((0, Y_POT - .12, Z_SOL + .3)), Vector((0, 0, 1)), 6); hp = (u[0].z - Z_SOL) if u[0] else float("nan")
    return f"côté ouvert (façade) : {min(l):.2f} m de large entre les poteaux du milieu, {hp:.2f} m de haut libre sous l'enseigne → {'assez grand' if min(l) >= .8 and hp >= 1.8 else 'TROP PETIT'} pour la capsule"

if __name__ == "__main__":
    from apercu import apercu_maison, sortie
    P, V = construire()
    props = {"pied": list(PIED), "porte": list(PORTE), "interieur": INTERIEUR}
    obs = [P.objet(props), V.objet()]
    ligne = ouverture(obs[0])
    apercu_maison(obs, "forge", taille=max(PIED), haut=6.4, porte_seuil=PORTE, fenetre=FENETRE_FACE)
    f = os.path.join(sortie(), "controle.txt")   # la mesure de porte commune (montants, arc) n'a pas de sens ici : on la remplace
    L = [l if not l.startswith("ouverture de la porte") else "ouverture de la porte : sans objet (façade ouverte, sans montants ni arc : voir « côté ouvert »)" for l in open(f).read().splitlines()]
    open(f, "w").write("\n".join(L + [ligne]) + "\n"); print(ligne)
