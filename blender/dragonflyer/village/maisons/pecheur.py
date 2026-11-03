# La maison de pêcheur de Saltcliff : maison de planches peintes posées à clin, sur un plancher porté par des pilotis
# au bord de l'eau ; terrasse côté terre avec garde-corps et escalier de bois, coursive sur les côtés, ponton et échelle
# côté mer, barque amarrée ; filet qui sèche, casiers, bouée, rames, rouleau de corde, tonneau, lanterne.
# Faite seulement des pièces du kit et des objets du village. Trois variantes (graine % 3) : rouge, bleue, verte
# (objets M_pecheur, M_pecheur_b, M_pecheur_c et leurs W_).
# Emprise « pied » 6 × 7 m (le corps de la maison et le plancher sur pilotis), porte vers -Y (la terre), plancher à
# 1,45 m (cinq marches de 24 cm, celle du bas en pierre), point « porte » (0, -4.0, 1.45) sur la terrasse. Dans le jeu : posée à y = 0,2,
# l'eau est donc à z = -0,2 dans ce repère.
# Lancer seule : blender -b -P pecheur.py -- <dossier> [--variante 0|1|2]
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."), os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "objets")]
import math
from mathutils import Matrix, Vector
from kit import (Piece, poutre, porte, fenetre, chevrons, ToitTuiles, ToitBardeaux, mur_clins, coin_planches, encadrement,
                 pilotis, plancher, garde_corps, escalier_bois, tuyau_poele)
from materiaux import M
import ponton, filet, casier, bouee, rame, barque, corde, tonneau, lanterne, caisse

PIED, PORTE, INTERIEUR = (6.0, 7.0), (0, -4.0, 1.45), "maison"
Z_PL, EAU = 1.45, -.2                    # dessus du plancher, niveau de l'eau
XM, Y0, Y1 = 2.55, -2.6, 2.9             # murs : demi-largeur, façade, dos
XP, YP0, YP1 = 3.0, -4.7, 3.5            # plancher sur pilotis (terrasse devant, coursives, plancher derrière)
FENETRE_FACE = (1.65, Y0, 2.55)
TUYAU = (-1.3, 1.7)

VARIANTES = (   # nom de l'objet (M_pecheur…), planches, porte, volets, toit, boiseries peintes, garde-corps, coque de la barque
    dict(nom="rouge", suffixe="", clin="clin_rouge", porte="peint", volet="peint", toit="bardeau", rive="blanc", rambarde="blanc", barque="clin_bleu"),
    dict(nom="bleue", suffixe="_b", clin="clin_bleu", porte="clin_rouge", volet="blanc", toit="tuiles", rive="blanc", rambarde="blanc", barque="clin_rouge"),
    dict(nom="verte", suffixe="_c", clin="clin_vert", porte="clin_rouge", volet="clin_rouge", toit="bardeau_b", rive="chene_c", rambarde="chene_c", barque="clin_rouge"),
)

def appuye(pied, d, ex):
    """Matrice qui pose un objet allongé selon +Z (rame) de « pied » vers la direction d, son axe X le plus près de ex."""
    d = Vector(d).normalized(); ex = (Vector(ex) - d * Vector(ex).dot(d)).normalized(); ey = d.cross(ex)
    return Matrix.Translation(pied) @ Matrix((list(ex) + [0], list(ey) + [0], list(d) + [0], [0, 0, 0, 1])).transposed()

def construire(graine=31, variante=None):
    v = VARIANTES[(graine if variante is None else variante) % 3]
    P = Piece("M_pecheur" + v["suffixe"], graine); V = Piece("W_pecheur" + v["suffixe"], graine + 1); R = P.R
    # 1. pilotis, longerons, solives, plancher
    xs, ys = (-2.85, 0, 2.85), (-4.55, -1.6, 1.3, 3.35)
    for x in xs:
        for y in ys: pilotis(P, x + R.uniform(-.04, .04), y + R.uniform(-.04, .04), -3.0, Z_PL - .25, r=.16, eau=EAU)
    for x in xs: poutre(P, (x, YP0 - .02, Z_PL - .33), (x, YP1 + .02, Z_PL - .33), l=.2, h=.22, mat="chene")          # longerons
    for k in range(6):
        y = YP0 + .12 + k * (YP1 - YP0 - .24) / 5; poutre(P, (-XP, y, Z_PL - .15), (XP, y, Z_PL - .15), l=.12, h=.14, mat="chene")   # solives
    for x in xs: P.boite((x, ys[0], .02), (.44, .44, .3), M("moellon").couleur(R), bev=.05, jit=.015)   # plots de pierre sous les pieux côté terre
    for i in range(2):   # contreventement : devant et sur les côtés, au-dessus du sable et de l'eau
        poutre(P, (xs[i], ys[0] - .17, .3), (xs[i + 1], ys[0] - .17, Z_PL - .45), l=.1, h=.1, mat="chene")
    for sx in (-1, 1):
        for j in range(3): poutre(P, (sx * (XP - .02) - sx * .13, ys[j], .3 if j % 2 == 0 else Z_PL - .45), (sx * (XP - .02) - sx * .13, ys[j + 1], Z_PL - .45 if j % 2 == 0 else .3), l=.1, h=.1, mat="chene")
    plancher(P, -XP, XP, YP0, YP1, Z_PL, larg=.24)   # 25 planches : une planche (pas un joint) dans l'axe de la porte
    cr = M(v["rambarde"]).couleur(R)
    P.boite((0, YP0 - .03, Z_PL - .13), (2 * XP + .08, .05, .22), cr, bev=0)                    # planches de rive du plancher
    for sx in (-1, 1): P.boite((sx * (XP + .03), (YP0 + YP1) / 2, Z_PL - .13), (.05, YP1 - YP0 + .06, .22), cr, bev=0)
    P.boite((0, YP1 + .03, Z_PL - .13), (2 * XP + .08, .05, .22), cr, bev=0)
    # 2. le toit (forme commune aux deux matières), puis les murs qui montent dessous
    cy = (Y0 + Y1) / 2
    if v["toit"] == "tuiles": toit = ToitTuiles(0, cy, XM + .38, (Y1 - Y0) / 2 + .5, 3.68, 6.15).construire(P, larg_tuile=.4, rang=.46, cheminees=[(*TUYAU, .06)])
    else: toit = ToitBardeaux(0, cy, XM + .38, (Y1 - Y0) / 2 + .5, 3.68, 6.15, mat=v["toit"], mat_rive=v["rive"]).construire(P, cheminees=[(*TUYAU, .06)])
    sous = lambda x, y: toit.forme(x, y)[0] - toit.ep
    for sx in (-1, 1): P.boite((sx * (XM + .42), cy, toit.zf + .12), (.1, .2, .34), M(v["rive"]).couleur(R), bev=.02)   # épis au sommet des pignons
    P.boite((0, cy, (Z_PL + 4.0) / 2), (2 * XM - .1, Y1 - Y0 - .1, 4.0 - Z_PL), M("chene").sombre, bev=0)   # cœur (derrière les planches)
    for sx in (-1, 1):   # cœur des pignons : prisme sous le toit
        vs = []
        for dx in (-.05, .05):
            xx = sx * (XM - .06) + dx
            vs += [P.bm.verts.new(p) for p in ((xx, Y0 + .05, 3.7), (xx, Y1 - .05, 3.7), (xx, Y1 - .05, sous(0, Y1) - .05), (xx, cy, sous(0, cy) - .05), (xx, Y0 + .05, sous(0, Y0) - .05))]
        for w in vs: w[P.col] = (*M("chene").sombre, 1)
        for f in ((0, 1, 2, 3, 4), (9, 8, 7, 6, 5), (0, 5, 6, 1), (1, 6, 7, 2), (2, 7, 8, 3), (3, 8, 9, 4), (4, 9, 5, 0)):
            try: P.bm.faces.new([vs[i] for i in f])
            except ValueError: pass
    fen = lambda u, z=2.55, l=.7, h=.8: (u - l / 2 - .15, u + l / 2 + .15, z - h / 2 - .17, z + h / 2 + .23)
    ouv = {
        "face": [(XM - .8, XM + .8, Z_PL - .1, Z_PL + 2.05 + .24), fen(XM - 1.65), fen(XM + 1.65)],
        "droite": [fen(-Y0 + cy), fen(-Y0 + cy, 4.6, .5, .55)],
        "dos": [fen(XM + 1.3)],
        "gauche": [fen(Y1 - cy, 4.6, .5, .55)],
    }
    murs = (("face", (-XM, Y0), (XM, Y0)), ("droite", (XM, Y0), (XM, Y1)), ("dos", (XM, Y1), (-XM, Y1)), ("gauche", (-XM, Y1), (-XM, Y0)))
    for nom, a_, b_ in murs: mur_clins(P, a_, b_, Z_PL, 9.0, ouv[nom], mat=v["clin"], toit=toit)
    for (x, y, sx, sy) in ((-XM, Y0, -1, -1), (XM, Y0, 1, -1), (XM, Y1, 1, 1), (-XM, Y1, -1, 1)):
        coin_planches(P, x, y, Z_PL, sous(x, y) - .02, v["rive"], sx, sy)
    chevrons(P, toit, [((-XM, Y0), (XM, Y0)), ((XM, Y1), (-XM, Y1))], sous(0, Y0), pas_=.7)
    tuyau_poele(P, *TUYAU, 3.6, toit.forme(*TUYAU)[0] + .8, toit)
    # 3. porte, fenêtres
    porte(P, (0, Y0 - .03, Z_PL), l=1.2, h=2.05, mat=v["porte"], cintree=False, seuil=False)
    for s in (-1, 1): P.boite((s * .86, Y0 - .05, Z_PL + 1.15), (.13, .04, 2.3), M(v["rive"]).couleur(R), bev=0)   # chambranle peint
    for x in (-1.65, 1.65):
        fenetre(V, P, (x, Y0, 2.55), 0, l=.7, h=.8, volets=False, jardiniere=False, appui=v["rive"]); encadrement(P, (x, Y0, 2.55), 0, .7, .8, v["rive"])
    fenetre(V, P, (XM, cy, 2.55), math.pi / 2, l=.7, h=.8, mat_volet=v["volet"], jardiniere=False, appui=v["rive"]); encadrement(P, (XM, cy, 2.55), math.pi / 2, .7, .8, v["rive"], cotes=False)
    fenetre(V, P, (-1.3, Y1, 2.55), math.pi, l=.7, h=.8, mat_volet=v["volet"], jardiniere=False, appui=v["rive"]); encadrement(P, (-1.3, Y1, 2.55), math.pi, .7, .8, v["rive"], cotes=False)
    for sx in (-1, 1):   # lucarnes des pignons (grenier)
        fenetre(V, P, (sx * XM, cy, 4.6), sx * math.pi / 2, l=.5, h=.55, volets=False, jardiniere=False, appui=v["rive"]); encadrement(P, (sx * XM, cy, 4.6), sx * math.pi / 2, .5, .55, v["rive"])
    P.boite((1.65, Y0 - .3, 1.86), (.95, .26, .22), M(v["volet"] if v["volet"] != "blanc" else v["porte"]).couleur(R), bev=0)   # jardinière peinte (légère)
    for i in range(4):
        P.sphere((1.32 + i * .22, Y0 - .3 + R.uniform(-.04, .04), 2.0), .13, M("feuillage").couleur(R), (1, .8, .75), sub=1, jit=.015)
        P.boite((1.36 + i * .22, Y0 - .36, 2.12), (.09, .09, .09), M("fleur").couleur(R), rz=.6, rx=.5, bev=0)
    # 4. terrasse : garde-corps bas (80 cm : on voit le seuil par-dessus), ouvert devant l'escalier ; escalier de bois
    #    (4 marches de bois et une de pierre, 24 cm chacune) jusqu'à la terre
    yg = YP0 + .06; hg = .8
    garde_corps(P, (-XP + .08, yg), (-.83, yg), Z_PL, haut=hg, mat=v["rambarde"]); garde_corps(P, (.83, yg), (XP - .08, yg), Z_PL, haut=hg, mat=v["rambarde"])
    for sx in (-1, 1): garde_corps(P, (sx * (XP - .08), yg), (sx * (XP - .08), Y0 - .05), Z_PL, haut=hg, mat=v["rambarde"], bouts=(False, True))
    escalier_bois(P, 0, YP0 - .06, Z_PL, 1.42, 4, prof=.38, rampe=v["rambarde"], haut_rampe=hg)
    # 5. la vie du pêcheur
    L_ = (.95, Y0 - .04, Z_PL + 1.7); P.ajouter(lanterne.construire(V, L_), Matrix.Translation(L_))                      # lanterne près de la porte
    P.ajouter(tonneau.construire(n=8), Matrix.Translation((-2.35, -4.12, Z_PL)))
    P.ajouter(corde.construire(), Matrix.Translation((-1.3, -4.2, Z_PL)) @ Matrix.Rotation(.7, 4, "Z"))
    for (x, y, z, rz) in ((2.35, -4.3, 0, .03), (2.32, -3.8, 0, -.04), (2.3, -4.06, .38, .12)):                          # casiers empilés
        P.ajouter(casier.construire(graine + int(10 * y)), Matrix.Translation((x, y, Z_PL + z)) @ Matrix.Rotation(rz, 4, "Z"))
    xb = -1.35; P.ajouter(bouee.construire(), Matrix.Translation((xb, yg - .16, Z_PL + .42)))                             # bouée sur le garde-corps
    poutre(P, (xb, yg - .14, Z_PL + .76), (xb, yg - .04, Z_PL + hg + .03), l=.05, h=.03, mat="corde")
    P.ajouter(bouee.construire(graine + 5), Matrix.Translation((XM + .12, 1.9, 2.75)) @ Matrix.Rotation(math.pi / 2, 4, "Z"))   # bouée au pignon côté mer
    poutre(P, (XM + .04, 1.9, 3.13), (XM + .2, 1.9, 3.13), l=.04, h=.04, mat="chene")                                    # sa cheville
    for k, (y, dy) in enumerate(((-1.6, .12), (-1.25, .2))):                                                               # rames contre le pignon droit
        P.ajouter(rame.construire(graine + k, mat_pale=v["volet"] if v["volet"] != "blanc" else "clin_rouge"), appuye((XP - .07, y, Z_PL), (XM + .1 - (XP - .07), dy, 2.0), (1, 0, 0)))
    P.ajouter(filet.construire(), Matrix.Translation((-XM - .04, -.1, 3.55)) @ Matrix.Rotation(-math.pi / 2, 4, "Z"))       # filet qui sèche
    for y in (-.5,): P.ajouter(casier.construire(graine + 7, l=.4), Matrix.Translation((-2.8, y, Z_PL)) @ Matrix.Rotation(math.pi / 2, 4, "Z"))
    P.ajouter(caisse.construire(graine + 3), Matrix.Translation((-.25, 3.2, Z_PL)) @ Matrix.Rotation(.05, 4, "Z"))            # côté mer : caisse et lanterne
    L2 = (.55, Y1 + .04, Z_PL + 1.7)   # tournée vers +Y : la vitre (placée par la lanterne à 50 cm vers -Y de o) est donnée en o + 1 m
    P.ajouter(lanterne.construire(V, (L2[0], L2[1] + 1.0, L2[2])), Matrix.Translation(L2) @ Matrix.Rotation(math.pi, 4, "Z"))
    # 6. côté mer : ponton, échelle, barque amarrée
    P.ajouter(ponton.construire(L=2.6, l=1.4, z=Z_PL, eau=EAU, rive=v["rambarde"]), Matrix.Translation((1.5, YP1, 0)))
    P.ajouter(barque.construire(graine, mat=v["barque"]), Matrix.Translation((3.45, 5.0, EAU)) @ Matrix.Rotation(math.pi / 2 + .06, 4, "Z"))
    poutre(P, (2.1, YP1 + 2.45, Z_PL + .3), (3.38, 6.4, EAU + .4), l=.04, h=.04, mat="corde")                                # amarre
    return P, V

if __name__ == "__main__":
    from apercu import apercu_maison_eau
    var = int(sys.argv[sys.argv.index("--variante") + 1]) if "--variante" in sys.argv else 0
    P, V = construire(variante=var)
    props = {"pied": list(PIED), "porte": list(PORTE), "interieur": INTERIEUR}
    apercu_maison_eau([P.objet(props), V.objet()], "pecheur" + VARIANTES[var]["suffixe"], taille=8.0, haut=6.2, porte_seuil=PORTE, fenetre=FENETRE_FACE, eau=EAU,
                      y_rive=-4.2, y_fond=-1.0, porte_cam=(0, Y0 - .6, Z_PL))   # terre sous la terrasse et l'escalier, pieux de devant dans le sable
