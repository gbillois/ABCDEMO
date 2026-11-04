# L'intérieur des maisons (« maison » : chaumière, colombages, pierre, pêcheur) : une pièce de 7 × 6 m, 3 m sous les
# solives, faite seulement des pièces du kit (murs enduits à poteaux, plancher, plafond à solives, porte et fenêtres
# vues de dedans) et des objets du village (cheminée, lit, coffre, table, bancs, vaisselier, bûches, tapis…).
# Repère : pièce centrée en (0, 0), sol à z = 0, porte dans le mur -Y (on entre vers +Y), cheminée au fond (+Y).
# Contrat avec le jeu (creerInterieurs) : objets I_maison (ce qui est éclairé) et IL_maison (ce qui brille : feu,
# chandelles) ; propriétés « taille » [l, p, h], « porte » (point de sortie, 0,9 m devant la porte), « foyer » (le feu),
# « obstacles » (rectangles des meubles : x, y, demi-largeur x, demi-largeur y, à la suite).
# Lancer seule : blender -b -P maison.py -- <dossier>   (12 rendus, planche, carte_acces.png, controle.txt, maison.glb)
import sys, os
_ici = os.path.dirname(os.path.abspath(__file__)); sys.path[:0] = [os.path.join(_ici, ".."), os.path.join(_ici, "..", "objets")]
import math
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree
from kit import Piece, plancher_joints, retirer_faces_cachees, boite_douce, mur_interieur, plafond_solives, porte_interieure, fenetre_interieure, nb_sommets, _neufs
import cheminee_interieure, lit, coffre, table, banc_interieur, tabouret, etagere, panier_buches, tonnelet, tapis, herbes
import vaisselle, chandelle, caisse, sacs_grain, seau, balai, pot_fleurs, patere, etagere_murale, ustensiles
from materiaux import M, melange

TAILLE = (7.0, 6.0, 3.0)
X, Y, H = TAILLE[0] / 2, TAILLE[1] / 2, TAILLE[2]
PORTE = (0, -Y + .9, 0)
FOYER = (0, Y + cheminee_interieure.FEU[1], cheminee_interieure.FEU[2])
Z_POUTRE = H - .44                       # dessous de la poutre maîtresse (on y pend les herbes)
FENETRES = [((-2.2, -Y, 1.25), 0.0), ((X, -.6, 1.25), math.pi / 2)]   # (centre sur la face du mur, rotation : la pièce vers +Y local)
L_FEN, H_FEN = .7, .75
TABLE = (1.6, .15)
ANCIEN = "6 972 + 60 triangles (I_maison + IL_maison de l'ancien maisons.py)"

def Mx(x, y, z=0.0, rz=0.0): return Matrix.Translation((x, y, z)) @ Matrix.Rotation(rz, 4, "Z")

def construire(graine=101):
    P = Piece("I_maison", graine); V = Piece("IL_maison", graine + 1); C = Piece("plafond", graine + 2); poses = []
    def pose(nom, piece, M_, appui="sol", **k):
        n0 = nb_sommets(P); P.ajouter(piece, M_); piece.bm.free(); vs = _neufs(P, n0)
        mn = [min(v.co[i] for v in vs) for i in range(3)]; mx = [max(v.co[i] for v in vs) for i in range(3)]
        idx = {v: i for i, v in enumerate(vs)}; fs = {f for v in vs for f in v.link_faces}
        bvh = BVHTree.FromPolygons([v.co.copy() for v in vs], [[idx[v] for v in f.verts] for f in fs])
        poses.append(dict(nom=nom, min=mn, max=mx, appui=appui, bvh=bvh, **k))
    # --- la pièce : plancher, quatre murs, porte, fenêtres ; plafond à part (retiré pour la vue en coupe)
    plancher_joints(P, -X, X, -Y, Y, 0, larg=.3)
    ouv_f = lambda u, z: (u - L_FEN / 2 - .03, u + L_FEN / 2 + .03, z - H_FEN / 2 - .05, z + H_FEN / 2 + .05)
    mur_interieur(P, (-X, -Y), (X, -Y), 0, H, [(X - .68, X + .68, 0, 2.22), ouv_f(X - 2.2, 1.25)], coins=(True, False))   # mur de la porte
    mur_interieur(P, (X, -Y), (X, Y), 0, H, [ouv_f(Y - .6, 1.25)], coins=(True, False))                                  # mur droit
    mur_interieur(P, (X, Y), (-X, Y), 0, H, [(X - 1.0, X + 1.0, 0, cheminee_interieure.H_MANTEAU - .12)], coins=(True, False))   # fond (cheminée)
    mur_interieur(P, (-X, Y), (-X, -Y), 0, H, [], coins=(True, False))                                                     # mur gauche
    n0 = nb_sommets(P); porte_interieure(P, (0, -Y, 0), l=1.15, h=2.05); vs = _neufs(P, n0)
    poses.append(dict(nom="porte", min=[min(v.co[i] for v in vs) for i in range(3)], max=[max(v.co[i] for v in vs) for i in range(3)], appui="mur", encastre=True, obstacle=False))
    appuis = []
    for (c, rz) in FENETRES:
        n0 = nb_sommets(P); appuis.append(fenetre_interieure(P, c, rz=rz, l=L_FEN, h=H_FEN)); vs = _neufs(P, n0)
        poses.append(dict(nom=f"fenêtre {len(appuis)}", min=[min(v.co[i] for v in vs) for i in range(3)], max=[max(v.co[i] for v in vs) for i in range(3)], appui="mur", encastre=True, obstacle=False))
    plafond_solives(C, -X, X, -Y, Y, H)
    # --- le fond : cheminée, bûches, vaisselier, tonnelet
    pose("cheminée", cheminee_interieure.construire(V, Mx(0, Y)), Mx(0, Y))
    pose("bûches", panier_buches.construire(), Mx(1.27, Y - .28))
    pose("vaisselier", etagere.construire(), Mx(2.2, Y), appui="mur")
    pose("tonnelet", tonnelet.construire(n=8), Mx(3.18, Y - .32))
    # --- le coin du lit (gauche, au fond) : lit, coffre au pied, herbes qui sèchent sous la poutre
    pose("lit", lit.construire(), Mx(-X + .58, Y - 1.03))
    pose("coffre", coffre.construire(), Mx(-X + .58, Y - 2.34))
    pose("linge plié (coffre)", _piece(lambda Q: boite_douce(Q, (0, 0, .03), (.42, .3, .06), M("lin").couleur(Q.R), arrondi=.025, seg=1)), Mx(-X + .58, Y - 2.34, .54), appui="sur", sur="coffre", obstacle=False)
    pose("herbes (gauche)", herbes.construire(), Mx(-1.65, 0, Z_POUTRE), appui="plafond", z_haut=Z_POUTRE, obstacle=False)
    # --- le coin du repas : table, deux bancs, couvert, chandelle ; herbes au-dessus
    tx, ty = TABLE
    pose("table", table.construire(), Mx(tx, ty))
    pose("banc avant", banc_interieur.construire(), Mx(tx, ty - .65))
    pose("banc arrière", banc_interieur.construire(graine=64), Mx(tx, ty + .65))
    pose("chemin de table", _piece(lambda Q: Q.boite((0, 0, .002), (1.45, .3, .004), M("lin").couleur(Q.R), bev=0)), Mx(tx, ty, table.DESSUS), appui="sur", sur="table", obstacle=False)
    pose("couvert", vaisselle.construire("table"), Mx(tx, ty, table.DESSUS), appui="sur", sur="table", obstacle=False)
    pose("chandelle (table)", chandelle.construire(V, (tx - .12, ty - .05, table.DESSUS)), Mx(tx - .12, ty - .05, table.DESSUS), appui="sur", sur="table", obstacle=False)
    pose("herbes (table)", herbes.construire(graine=78, L=.8, n=3, ail=False), Mx(tx + .2, 0, Z_POUTRE), appui="plafond", z_haut=Z_POUTRE, obstacle=False)
    # --- devant le feu : tapis, tabouret
    pose("tapis", tapis.construire(), Mx(-.5, .75), obstacle=False)
    pose("tabouret", tabouret.construire(), Mx(-1.3, 1.6))
    # --- près de la porte : caisse et pot, sac, seau, balai (à gauche) ; banc et pommes (à droite)
    pose("caisse", caisse.construire(), Mx(-X + .45, -Y + .4))
    pose("pot (caisse)", _piece(lambda Q: vaisselle.pot(Q, (0, 0, 0), r=.09, h=.22)), Mx(-X + .4, -Y + .4, .485), appui="sur", sur="caisse", obstacle=False)
    pose("sac de grain", _piece(lambda Q: sacs_grain.sac(Q, (0, 0, 0), (0, 0, 1), t=.95)), Mx(-1.95, -Y + .3))
    pose("seau", seau.construire(), Mx(-1.42, -Y + .24))
    pose("balai", balai.construire(), Mx(-1.02, -Y + .25, 0, math.pi))
    pose("banc (mur)", banc_interieur.construire(graine=66, L=1.3), Mx(2.4, -Y + .18))
    pose("pommes (banc)", _piece(lambda Q: vaisselle.pommes(Q, (0, 0, 0))), Mx(2.0, -Y + .18, .46), appui="sur", sur="banc (mur)", obstacle=False)
    pose("pot de fleurs (fenêtre)", pot_fleurs.construire(r=.11), Mx(-2.2, -Y - .02, appuis[0]), appui="mur", obstacle=False, encastre=True)
    # --- aux murs : portemanteau (mur gauche), étagère et ustensiles (mur droit) ; paillasson devant la porte
    pose("portemanteau", patere.construire(), Mx(-X, -1.1, 0, math.pi / 2), appui="mur", obstacle=False)
    pose("étagère murale", etagere_murale.construire(), Mx(X, .5, 0, -math.pi / 2), appui="mur", obstacle=False)
    pose("ustensiles", ustensiles.construire(), Mx(X, 1.75, 0, -math.pi / 2), appui="mur", obstacle=False)
    pose("paillasson", _piece(paillasson), Mx(0, -Y + .62), obstacle=False)
    retirer_faces_cachees(P, X, Y); retirer_faces_cachees(C, X, Y, H)
    return P, V, C, poses

def paillasson(Q, L=.7, l=.45):
    """Paillasson de paille tressée : bord sombre, bandes ocre et paille foncée (couleurs seulement), 2 cm."""
    bord = melange(M("chene_c").teintes[0], M("paille").teintes[0], .3)
    Q.boite((0, 0, .008), (L, l, .016), tuple(k * .62 for k in bord), bev=0)
    for k in range(5):
        c = melange(M("paille").teintes[0], M("chene_c").teintes[0], .55 if k % 2 else .25)
        Q.boite((0, -l / 2 + .06 + (k + .5) * (l - .12) / 5, .019), (L - .1, (l - .12) / 5 - .006, .006), tuple(x * .78 for x in c), bev=0)

def _piece(f):
    Q = Piece("tmp", 7); f(Q); return Q

_SOLE = cheminee_interieure.LARG / 2 - cheminee_interieure.JAMBAGE
CIBLES = {"foyer (sole du feu)": (-_SOLE, _SOLE, Y - cheminee_interieure.PROF + .04, Y - .04)}

def cibles(poses):
    c = dict(CIBLES)
    for q in poses:
        if q["nom"] in ("lit", "table", "vaisselier", "coffre", "tonnelet", "bûches"): c[q["nom"]] = (q["min"][0], q["max"][0], q["min"][1], q["max"][1])
    return c

if __name__ == "__main__":
    from apercu import apercu_interieur
    P, V, C, poses = construire()
    coins = [((-.9, .2, 1.45), (-2.7, 2.3, .65)), ((.6, .9, 1.5), (2.4, 2.6, 1.0))]
    fen = [(Vector(c) + Vector((-math.sin(rz), math.cos(rz), 0)) * .0, (-math.sin(rz), math.cos(rz), 0), L_FEN, H_FEN) for (c, rz) in FENETRES]
    apercu_interieur(P, V, C, "maison", TAILLE, PORTE, FOYER, coins, poses, cibles(poses), fenetres=fen, ancien=ANCIEN)
