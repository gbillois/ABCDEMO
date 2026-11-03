# La maison de montagne (village de Stonebrook) : murs épais de pierre sombre en grosses assises, pignons de pierre,
# toit d'ardoises raide, grosse cheminée collée au pignon et qui monte au-dessus du faîte. Faite seulement des pièces
# du kit et des objets du village. Emprise 6,8 × 7,6 m (comme l'ancienne), porte vers -Y, point « porte » (0, -4.3, 0).
# Trois variantes (même emprise, même porte) : 0 cheminée à droite, volets rouges, tas de bois ; 1 en miroir (cheminée
# à gauche), volets verts, tonneau ; 2 cheminée à droite, volets bleus, banc sur le côté, tonneau. Objets exportés : M_pierre,
# M_pierre_1, M_pierre_2 (et W_ pour les vitres).
# Lancer seule : blender -b -P pierre.py -- <dossier> [variante]   (12 rendus, planche, controle.txt, pierre.glb)
#               blender -b -P pierre.py -- <dossier> --variantes   (les 3 variantes en vue 05 : variantes.png)
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."), os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "objets")]
import math, bmesh
from mathutils import Matrix, Vector
from kit import Piece, mur_moellons, porte, fenetre, cheminee_pignon, chevrons, nb_sommets, teinter, rogner, prisme_pignon, ToitArdoises
from materiaux import M, melange
import banc, tas_bois, tonneau, pot_fleurs, lanterne, seau, balai

PIED, PORTE, INTERIEUR = (6.8, 7.6), (0, -4.3, 0), "maison"
X, Y = 3.2, 3.6                          # faces des murs
Z_BAS, Z_PIERRE, Z_SOCLE, Z_HAUT = -2.8, -.6, .38, 3.2   # cœur sous le sol (pentes), soubassement de -0,6 à 0,38 m, haut des murs sous l'avant-toit
DEB_Y, DEB_X = .5, .35                   # débords du toit (égouts, pignons)
Z_BORD, Z_FAITE = 3.0, 6.7               # dessus du toit au bord de l'égout, au faîte
XF = 2.05                                # fenêtres de façade à ±2,05 m (volets libres de l'arc de la porte)
FENETRE_FACE = (XF, -Y - .07, 1.25)
CHEMINEE = (X + .25, 0.0)                # collée au pignon droit, au faîte
VOLETS = {0: "volet_r", 1: "volet_v", 2: "peint"}
C_COEUR = melange(M("mortier").teintes[0], M("pierre_s").sombre, .45)   # joints : mortier gris-brun (jamais noir)

def construire(graine=31, variante=0):
    suffixe = "" if variante == 0 else f"_{variante}"                     # M_pierre, M_pierre_1, M_pierre_2 (le jeu les répartit)
    P = Piece("M_pierre" + suffixe, graine); V = Piece("W_pierre" + suffixe, graine + 1); R = P.R
    toit = ToitArdoises(0, 0, X + DEB_X, Y + DEB_Y, Z_BORD, Z_FAITE, ep=.25)
    ouv_fen = lambda u, z=1.25: (u - .9, u + .9, z - .6, z + .62)   # les pierres s'arrêtent au bord des volets et de l'appui
    yc = CHEMINEE[1] + Y
    # murs de pierre (grosses assises) sur un soubassement plus saillant (12 cm) ; pignons qui montent jusque sous le
    # toit puis rabotés selon la pente
    murs = [((-X, -Y), (X, -Y), [(X - .82, X + .82, -1, 2.75), ouv_fen(X - XF), ouv_fen(X + XF)], Z_HAUT),                # façade
            ((X, Y), (-X, Y), [ouv_fen(X - 1.5), ouv_fen(X + 1.5)], Z_HAUT),                                              # dos
            ((X, -Y), (X, Y), [ouv_fen(1.6), (yc - .93, yc + .93, -1, 2.85), (yc - .7, yc + .7, 2.85, 99)], Z_FAITE),     # pignon droit (cheminée)
            ((-X, Y), (-X, -Y), [ouv_fen(Y - 1.6), (Y - .48, Y + .48, 3.95, 4.8)], Z_FAITE)]                              # pignon gauche (lucarne)
    for k, (a, b, ouv, zh) in enumerate(murs):
        n0 = nb_sommets(P)
        mur_moellons(P, a, b, Z_PIERRE, Z_SOCLE, ouv, taille=.66, saillie=.19)                                          # soubassement
        mur_moellons(P, a, b, Z_SOCLE, zh, ouv, taille=.62)
        teinter(P, n0, "pierre_s", graine + k)
        if zh > Z_HAUT: rogner(P, n0, lambda x, y: toit.dessous(x, y) + .03)
    # cœur plein (mortier sombre) : murs et pignons
    P.boite((0, 0, (Z_BAS + Z_HAUT) / 2), (2 * X - .1, 2 * Y - .1, Z_HAUT - Z_BAS), C_COEUR, bev=0)
    prisme_pignon(P, -X + .05, X - .05, -Y + .05, Y - .05, Z_HAUT - .05, toit.dessous(0, 0) + .02, C_COEUR)
    # toit d'ardoises, chevrons sous les égouts
    toit.construire(P, cheminees=[(*CHEMINEE, .68)])
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
    # la vie autour de la porte : paillasson sur le seuil, pot et plante grimpante à gauche (elle passe au-dessus de
    # l'arc), seau et balai à droite
    P.boite((0, -Y - .4, .135), (.95, .5, .03), M("jute").couleur(R), bev=.01)
    P.boite((0, -Y - .4, .14), (.75, .32, .03), M("volet_r").couleur(R), bev=0)
    P.ajouter(pot_fleurs.construire(r=.2), Matrix.Translation((-1.02, -Y - .42, 0)))
    for i in range(24):
        t = i / 23
        if t < .4: x, z = -.98 + R.uniform(-.06, .06), .55 + t / .4 * 1.2                       # le long du montant
        else: a = 2.94 - (t - .4) / .6 * 1.75; x, z = math.cos(a) * 1.0, 1.55 + math.sin(a) * 1.0    # puis autour de l'arc
        P.sphere((x, -Y - .2 + R.uniform(-.03, .03), z), R.uniform(.09, .14), M("feuillage").couleur(R, .14), (1, .6, 1), sub=1, jit=.03)
        if i % 4 == 2: P.sphere((x + R.uniform(-.08, .08), -Y - .3, z + .05), .055, M("fleur").teintes[2 if variante != 2 else 1], sub=1)
    P.ajouter(seau.construire(), Matrix.Translation((1.02, -Y - .45, 0)))
    P.ajouter(balai.construire(), Matrix.Translation((1.36, -Y - .45, 0)))
    if variante == 0:
        P.ajouter(banc.construire(), Matrix.Translation((-XF, -Y - .62, 0)))   # dossier devant l'appui de la fenêtre
        for x in (-2.55, -1.6): P.ajouter(pot_fleurs.construire(r=.12, graine=int(x * -10)), Matrix.Translation((x, -Y - .72, .5)))   # pots sur le banc
        P.ajouter(tas_bois.construire(L=1.6, rangs=5), Matrix.Translation((-X - .5, -1.4, 0)) @ Matrix.Rotation(-math.pi / 2, 4, "Z"))
        L_ = (1.02, -Y - .17, 1.95); P.ajouter(lanterne.construire(V, L_), Matrix.Translation(L_))
    elif variante == 1:
        P.ajouter(tonneau.construire(), Matrix.Translation((2.85, -Y - .62, 0)))
        P.ajouter(tas_bois.construire(L=1.6, rangs=5), Matrix.Translation((-X - .5, -1.4, 0)) @ Matrix.Rotation(-math.pi / 2, 4, "Z"))
    else:
        P.ajouter(banc.construire(), Matrix.Translation((X + .55, -1.6, 0)) @ Matrix.Rotation(math.pi / 2, 4, "Z"))
        P.ajouter(tonneau.construire(), Matrix.Translation((-2.85, -Y - .62, 0)))
    # rochers et touffes au pied des murs
    for (bx, by) in ((-3.4, -4.05), (2.95, 3.95), (-3.55, 3.2)):
        for i in range(3):
            P.sphere((bx + R.uniform(-.3, .3), by + R.uniform(-.2, .2), .16), R.uniform(.2, .3), M("feuillage").couleur(R), (1, 1, .85), sub=1, jit=.04)
        P.sphere((bx + R.uniform(-.3, .3), by + R.uniform(-.2, .2), .08), R.uniform(.25, .35), M("pierre_s").couleur(R), (1.2, 1, .6), sub=1, jit=.05)
        for i in range(4):
            P.sphere((bx + R.uniform(-.35, .35), by + R.uniform(-.2, .2), .34 + R.uniform(0, .1)), .065, M("fleur").couleur(R), sub=1)
    if variante == 1:   # miroir : la cheminée passe à gauche (porte et emprise inchangées)
        for Q in (P, V):
            bmesh.ops.scale(Q.bm, vec=(-1, 1, 1), verts=list(Q.bm.verts)); bmesh.ops.reverse_faces(Q.bm, faces=list(Q.bm.faces))
    return P, V

def planche_variantes():
    """Les trois variantes côte à côte, chacune vue depuis la caméra 05 (face droite, en plongée) : variantes.png."""
    import numpy as np, bpy
    from apercu import sortie, nettoyer_depart, cuire_occlusion, materiaux_rendu, decor, douze_cameras
    dossier = sortie(); nettoyer_depart(); images = []; scene = bpy.context.scene; cam = None
    nom, pos, cible, lens = douze_cameras(max(PIED), 8.0, PORTE, FENETRE_FACE)[4]
    for v in range(3):   # une variante à la fois, au même endroit (même sol pour l'occlusion)
        objets = [Q.objet() for Q in construire(variante=v)]
        cuire_occlusion(objets); materiaux_rendu(objets)
        if cam is None: decor(max(PIED)); cam = scene.camera
        scene.cycles.samples = 28
        cam.location = pos; cam.rotation_euler = (cible - pos).to_track_quat("-Z", "Y").to_euler(); cam.data.lens = lens
        f = os.path.join(dossier, f"variante{v}.png"); scene.render.filepath = f; bpy.ops.render.render(write_still=True)
        im = bpy.data.images.load(f); images.append(np.array(im.pixels[:], np.float32).reshape(im.size[1], im.size[0], 4)); bpy.data.images.remove(im)
        for o in objets: bpy.data.objects.remove(o)
    pl = np.concatenate(images, axis=1); img = bpy.data.images.new("variantes", pl.shape[1], pl.shape[0]); img.pixels = pl.ravel()
    img.filepath_raw = os.path.join(dossier, "variantes.png"); img.file_format = "PNG"; img.save()

if __name__ == "__main__":
    if "--variantes" in sys.argv: planche_variantes(); sys.exit(0)
    from apercu import apercu_maison
    var = int(sys.argv[sys.argv.index("--") + 2]) if "--" in sys.argv and len(sys.argv) > sys.argv.index("--") + 2 else 0
    P, V = construire(variante=var)
    props = {"pied": list(PIED), "porte": list(PORTE), "interieur": INTERIEUR}
    apercu_maison([P.objet(props), V.objet()], "pierre", taille=max(PIED), haut=8.0, porte_seuil=PORTE, fenetre=FENETRE_FACE)
