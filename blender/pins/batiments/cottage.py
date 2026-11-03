# Le cottage du Domaine des Pins : soubassement de pierres, rez-de-chaussée en bardage à clin (pin miel), étage en planches
# à couvre-joints, ceinture et boiseries crème, fenêtres à volets verts, toit de bardeaux vert sapin à deux pans avec pignon
# sur la façade (œil-de-bœuf, rives épaisses, épi), cheminée de pierre, auvent et lanterne à la porte, grande terrasse.
# Fait seulement des pièces du kit (kit.py) et des matières (materiaux.py).
# Repère Blender : façade (porte) vers -Y, sol à 0. Dans le jeu (repère local du cottage) : x = x, y = z, z = -y.
# Mêmes cotes que le jeu (pins/index.html : L_WALLS, fenêtres, porte, UP = 3,5) pour garder les collisions et l'intérieur.
# Objets exportés (le jeu les range dans ses groupes) :
#   C_rdc (murs du rez-de-chaussée : s'effacent quand on entre), C_etage (étage), C_toit (toit, pignons, cheminée :
#   origine au haut des murs, le jeu le pose sur l'étage ou sur le rez-de-chaussée), C_terrasse, W_rdc / W_etage (vitres).
# Lancer seul : blender -b -P cottage.py -- <dossier>   (12 rendus, planche, planche du plain-pied, controle.txt, cottage.glb)
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
import math
from kit import (Piece, Mur, bardage_clin, planches_verticales, soubassement, corniere, ceinture, fenetre, porte_cadre, auvent,
                 lanterne_murale, ToitBardeaux, pignon, cheminee, terrasse, garde_corps, marche, face_mur, tableaux, massif, liseré_gravier, buisson_bas)
from materiaux import M

A, B = 5.10, 4.10            # face extérieure du cœur des murs (x, y) ; le bardage avance de 3 cm (collisions du jeu : 4,85 à 5,15)
EP = .24                     # épaisseur des murs (face intérieure à 4,86)
Z_SOL, Z_SOCLE, Z_RDC = .2, .42, 3.3          # seuil, haut du soubassement, haut des murs du rez-de-chaussée
Z_CEINT, Z_ETAGE = 3.5, 6.45                  # haut de la ceinture, haut des murs de l'étage (UP + 2,95)
PORTE = (0, -B, Z_SOL)                         # le seuil (point « porte » : là où le jeu fait entrer)
X_TOIT, K_TOIT, Y_TOIT = A + .65, .62, B + .62 # égout, pente, débord des pignons
CHEMINEE = (-2.5, 3.2)                         # au-dessus de la cheminée de l'intérieur (jeu : -2,5 ; -3,2)

def murs(z0, z1, ouv):
    """Les quatre murs, sens trigonométrique : façade (-Y), droite (+X), dos (+Y), gauche (-X). ouv : 4 listes (u0, u1, z0, z1)."""
    return [Mur((-A, -B), (A, -B), EP, ouv[0]), Mur((A, -B), (A, B), EP, ouv[1]), Mur((A, B), (-A, B), EP, ouv[2]), Mur((-A, B), (-A, -B), EP, ouv[3])]

def f(u, zc, l=1.3, h=1.05): return (u - l / 2, u + l / 2, zc - h / 2, zc + h / 2)

# fenêtres (u le long de chaque mur) aux places du jeu
F_RDC = [[2.1, 8.1], [2.1, 6.3], [1.9, 5.5], [4.1]]
F_ETG = [[2.3, 7.3], [6.1], [3.1, 7.7], [2.6]]
U_PORTE = A                                   # porte au milieu de la façade (x = 0)

def construire(graine=7):
    R, E, T, D = Piece("C_rdc", graine), Piece("C_etage", graine + 1), Piece("C_toit", graine + 2), Piece("C_terrasse", graine + 3)
    VR, VE = Piece("W_rdc", graine + 4), Piece("W_etage", graine + 5)
    JE, JT = Piece("J_C_etage", graine + 6), Piece("J_C_toit", graine + 7)        # couvre-joints (voir kit.planches_verticales)
    # ---------- rez-de-chaussée
    ouv = [[f(u, 1.95) for u in F_RDC[i]] for i in range(4)]
    ouv[0].append((U_PORTE - .55, U_PORTE + .55, Z_SOL - .25, 2.46))
    mr = murs(.16, Z_RDC, ouv)
    for m in mr:
        bardage_clin(R, m, Z_SOCLE, Z_RDC - .05)
        face_mur(R, m, -EP, .16, Z_RDC, "interieur", False)                     # lambris intérieur
        tableaux(R, m, -EP, .02)
        R.face([m.p(0, Z_RDC, -EP), m.p(m.L, Z_RDC, -EP), m.p(m.L, Z_RDC, .02), m.p(0, Z_RDC, .02)], M("interieur").couleur(R.R), (0, 0, 1))   # dessus des murs
        trous = [(U_PORTE - .55, U_PORTE + .55)] if m is mr[0] else []
        soubassement(R, m, 0, Z_SOCLE, trous)
        face_mur(R, m, 0, Z_SOCLE, Z_RDC - .05, "bois_d", True)                    # fond derrière le clin (percé comme le mur)
    for i, m in enumerate(mr):
        for u in F_RDC[i]: fenetre(R, VR, m, u, 1.95)
    for (x, y, sx, sy) in ((-A, -B, -1, -1), (A, -B, 1, -1), (A, B, 1, 1), (-A, B, -1, 1)): corniere(R, x, y, sx, sy, Z_SOCLE, Z_RDC)
    porte_cadre(R, mr[0], U_PORTE, 1.1, 2.46, Z_SOL)
    auvent(R, mr[0], U_PORTE, 2.78, l=1.9, prof=.95)
    lanterne_murale(R, VR, mr[0], U_PORTE - 1.0, 1.95)
    for (bx, by) in ((-4.4, B + .42), (-.4, B + .42), (2.6, B + .4), (4.3, B + .42), (-A - .42, 2.6), (-A - .42, -1.9), (A + .42, .1), (A + .42, 3.3)): buisson_bas(R, bx, by)   # buissons bas au pied des murs
    liseré_gravier(R, [(A + .08, -B - .1), (A + .08, B + .08), (-A - .08, B + .08), (-A - .08, -B - .1)], larg=.3)                     # gravier au pied du soubassement
    # ---------- étage (absent des cottages de plain-pied)
    ouv = [[f(u, 5.05) for u in F_ETG[i]] for i in range(4)]
    me = murs(Z_RDC, Z_ETAGE, ouv)
    for m in me:
        planches_verticales(E, m, Z_CEINT, Z_ETAGE - .02, PJ=JE)
        face_mur(E, m, .004, Z_CEINT, Z_ETAGE, "bois_d", True)
        face_mur(E, m, -EP, Z_RDC, Z_ETAGE, "interieur", False)
        tableaux(E, m, -EP, .02)
        E.face([m.p(0, Z_ETAGE, -EP), m.p(m.L, Z_ETAGE, -EP), m.p(m.L, Z_ETAGE, .02), m.p(0, Z_ETAGE, .02)], M("interieur").couleur(E.R), (0, 0, 1))
    ceinture(E, me, Z_RDC - .06, Z_CEINT)
    for i, m in enumerate(me):
        for u in F_ETG[i]: fenetre(E, VE, m, u, 5.05, jardiniere=(i == 0))
    for (x, y, sx, sy) in ((-A, -B, -1, -1), (A, -B, 1, -1), (A, B, 1, 1), (-A, B, -1, 1)): corniere(E, x, y, sx, sy, Z_CEINT, Z_ETAGE)
    # ---------- toit (origine : haut des murs ; z = 0 ici)
    toit = ToitBardeaux(X_TOIT, Y_TOIT, -.137, K_TOIT).construire(T, cheminees=[(*CHEMINEE, .45)])
    for (y, sens) in ((-B, -1), (B, 1)):
        pignon(T, toit, y, sens, A, -.04, rond=(1.75, .36), PJ=JT)
        mp = Mur((-A, y), (A, y)) if sens < 0 else Mur((A, y), (-A, y))
        T.boite_m(mp.Mx(mp.L / 2, .04, .05, 2 * A + .1, .14, .07), M("creme").couleur(T.R))   # pied de pignon
    cheminee(T, *CHEMINEE, .9, toit.zf + .5, toit=toit)
    # ---------- terrasse
    terrasse(D, -5.2, 5.2, -9.05, -B - .06, Z_SOL)
    garde_corps(D, (-5.1, -B - .2), (-5.1, -9.0)); garde_corps(D, (5.1, -B - .2), (5.1, -9.0))
    garde_corps(D, (-5.1, -9.0), (-.8, -9.0), poteaux=(False, True)); garde_corps(D, (.8, -9.0), (5.1, -9.0), poteaux=(True, False))
    marche(D, -.8, .8, -9.45, -9.05, 0, .1)
    liseré_gravier(D, [(-5.2, -B - .1), (-5.2, -9.05), (-.8, -9.05)], larg=.45); liseré_gravier(D, [(.8, -9.05), (5.2, -9.05), (5.2, -B - .1)], larg=.45)   # pied de la terrasse
    for (bx, by) in ((-5.55, -8.6), (5.55, -8.6), (-2.6, -9.45), (2.9, -9.45)): buisson_bas(D, bx, by, .4)
    return R, E, T, D, VR, VE, toit, JE, JT

if __name__ == "__main__":
    from apercu import nettoyer_depart, capsule, cuire_occlusion, exporter, rapport, materiaux_rendu, decor, douze_cameras, rendre, sortie, options
    dossier = sortie(); opts = options(); nettoyer_depart()
    R, E, T, D, VR, VE, toit, JE, JT = construire()
    props = {"porte": list(PORTE), "haut_rdc": Z_RDC, "haut_etage": Z_ETAGE}
    oR, oE, oT, oD, oVR, oVE = R.objet(props), E.objet(), T.objet(lieu=(0, 0, Z_ETAGE)), D.objet(), VR.objet(), VE.objet()
    oJE, oJT = JE.objet(), JT.objet(lieu=(0, 0, Z_ETAGE))
    objs = [oR, oE, oT, oD, oVR, oVE]
    ok, lignes = capsule([oR, oD], PORTE)
    cuire_occlusion([oR, oE, oT, oD, oJE, oJT])
    exporter(objs, os.path.join(dossier, "cottage.glb"))
    rapport(dossier, objs, lignes, budget=24000, ancien="31 970 pour l'ancien cottage de plain-pied mesuré dans le jeu")
    materiaux_rendu(objs); decor(11)
    haut = Z_ETAGE + toit.zf + .6
    rendre(dossier, douze_cameras(11, haut, PORTE, (-3, -B, 1.95), (3.6, -B - .3, Z_ETAGE + .1)))
    if "plain-pied" in opts or "tout" in opts:
        for o in (oE, oVE): o.hide_render = True
        oT.location.z = Z_RDC
        rendre(dossier, douze_cameras(11, Z_RDC + toit.zf + .6, PORTE, (-3, -B, 1.95), (3.6, -B - .3, Z_RDC + .1)), prefixe="pp_")
