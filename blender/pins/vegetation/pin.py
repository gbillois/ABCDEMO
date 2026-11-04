# Le pin du Domaine des Pins (répété ~800 fois dans le jeu, en InstancedMesh) : tronc brun-roux qui s'affine, nu sur le bas, en
# plaques d'écorce ; houppier de pin de forêt (haut, ovale, irrégulier, cime aplatie), en étages-touffes facettés et découpés,
# décalés et penchés, dessus vert pin éclairé, dessous vert sombre (jamais noir). Deux variantes (graines différentes) pour que la
# forêt ne se répète pas. Pas de transparence. Fait des pièces du kit et des matières.
# Repère : Z vers le haut, origine au pied du tronc (il descend de 0,3 m sous le sol). Hauteur ≈ 10,6 m (comme l'ancien pin du jeu).
# Objets : T_pin<v> (tronc et branches) et F_pin<v> (feuillage, que le jeu fait bouger au vent), v = 1 ou 2.
# Lancer seul : blender -b -P pin.py -- <dossier> [foret]   (12 rendus de la variante 1, planche, controle.txt, pin.glb ; « foret »)
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
import math, random
from mathutils import Vector
from kit import Piece, poutre
from materiaux import M

H_TRONC, H_TOTAL = 9.6, 10.6

class Pin:
    def __init__(s, graine, penche):
        s.R = random.Random(graine); s.pa = s.R.uniform(0, 6.28); s.penche = penche
    def axe(s, z):
        """L'axe du tronc : à peine courbé, un peu penché d'un côté (le houppier suit)."""
        k = z / H_TOTAL
        return Vector((math.cos(s.pa) * s.penche * k * k + .08 * math.sin(z * .5) * k, math.sin(s.pa) * s.penche * k * k, z))

def tronc(P, T):
    """Tronc à 7 pans qui s'affine nettement, anneaux réguliers (pas de torsion), écorce en plaques : chaque pan tire
    une nuance, et une bande sombre sur deux par endroits."""
    R, n, zs = P.R, 7, [-.3, .6, 2.4, 4.4, 6.4, 8.2, H_TRONC]
    ray = lambda z: .34 * (1 - z / (H_TRONC + .6)) ** 1.15 + .05
    anneaux = []
    for k, z in enumerate(zs):
        c = P.axe(max(z, 0)); r = ray(max(z, 0)) * (1.18 if z < .7 else 1)
        anneaux.append([c + Vector((math.cos(i / n * 2 * math.pi) * r, math.sin(i / n * 2 * math.pi) * r, 0)) for i in range(n)])
    for k in range(len(zs) - 1):
        for i in range(n):
            mat = "ecorce_d" if k == 0 else ("ecorce_p" if (i + k) % 3 == 0 else "ecorce")
            a, b = anneaux[k][i], anneaux[k][(i + 1) % n]; c, d = anneaux[k + 1][(i + 1) % n], anneaux[k + 1][i]
            T.face([a, b, c, d], M(mat).couleur(R), (a + b - 2 * P.axe(max(zs[k], 0))).normalized())
    # branches mortes sur le tronc nu (un pin s'élague seul)
    for (z, da, L) in ((2.9, .6, .7), (3.8, 2.9, .55), (4.6, 4.7, .8)):
        c = P.axe(z); a = P.pa + da; d = Vector((math.cos(a), math.sin(a), .3)); poutre(T, c, c + d * L, .07, .07, mat="ecorce_d")
        poutre(T, c + d * L * .6, c + d * L * .6 + Vector((math.cos(a + .8), math.sin(a + .8), .45)) * .3, .04, .04, mat="ecorce_d")

def etage(P, F, T, z, rayon, chute, n=9, phase=0.0, decal=(0.0, 0.0), pente=(0.0, 0.0), teinte=1.0):
    """Un étage-touffe : une jupe à n lobes. Centre haut → anneau intermédiaire → bord découpé (pointes qui retombent, creux)
    → dessous qui revient vers le tronc. Décalé du tronc (decal) et penché (pente : dz par mètre en x et y)."""
    R = P.R; t0 = P.axe(z); c = t0 + Vector((decal[0], decal[1], 0))
    pz = lambda v: v + Vector((0, 0, (v.x - c.x) * pente[0] + (v.y - c.y) * pente[1]))
    col = lambda nom: tuple(min(1, x * teinte) for x in M(nom).couleur(R))
    som = c + Vector((0, 0, chute * .5)); mid, bord = [], []
    for i in range(n):
        a = (i + .5) / n * 2 * math.pi + phase; rm = rayon * .52 * (1 + R.uniform(-.1, .1))
        mid.append(pz(c + Vector((math.cos(a) * rm, math.sin(a) * rm, chute * .12))))
    for i in range(2 * n):
        a = i / (2 * n) * 2 * math.pi + phase; pointe = i % 2 == 0
        r = rayon * (1 + R.uniform(-.16, .16)) if pointe else rayon * (.7 + R.uniform(-.06, .06))
        bord.append(pz(c + Vector((math.cos(a) * r, math.sin(a) * r, -chute * (1 if pointe else .55) + R.uniform(-.08, .08)))))
    for i in range(n): F.face([som, mid[(i + 1) % n], mid[i]], col("aiguilles"), (0, 0, 1))
    for i in range(n):
        m0, m1 = mid[i], mid[(i + 1) % n]; b0, b1, b2 = bord[2 * i], bord[2 * i + 1], bord[(2 * i + 2) % (2 * n)]
        F.face([m0, b1, b0], col("aiguilles_c"), (0, 0, 1)); F.face([m0, m1, b1], col("aiguilles"), (0, 0, 1)); F.face([m1, b2, b1], col("aiguilles_c"), (0, 0, 1))
    dessous = c + Vector((0, 0, -chute * .5))
    for i in range(2 * n): F.face([dessous, bord[i], bord[(i + 1) % (2 * n)]], col("aiguilles_d"), (0, 0, -1))
    for k in range(2):   # deux branches qui sortent du tronc sous la touffe
        a = phase + k * math.pi + .4; d = Vector((math.cos(a), math.sin(a), 0))
        poutre(T, t0 + Vector((0, 0, -chute * .3)), c + d * rayon * .5 + Vector((0, 0, -chute * .1)), .09, .07, mat="ecorce_d")

# deux variantes : (graine, penche du tronc, base du houppier, largeurs relatives des étages de bas en haut)
VARIANTES = {1: (5, .35, 5.6, [.78, 1.0, .82, .95, .7, .5]), 2: (11, .6, 6.3, [.9, .72, 1.0, .85, .62])}

def construire(v=1):
    graine, penche, zb, larg = VARIANTES[v]; P = Pin(graine, penche); R = P.R
    T, F = Piece(f"T_pin{v}", graine), Piece(f"F_pin{v}", graine + 1)
    tronc(P, T)
    # houppier de pin : étages de largeurs irrégulières (pas décroissantes), décalés, penchés, teintes variées ; cime aplatie
    nb = len(larg)
    for k, w in enumerate(larg):
        t = k / (nb - 1); z = zb + (H_TOTAL - .6 - zb) * t
        rayon = 2.35 * w * (1 + R.uniform(-.05, .05)); chute = .65 + .25 * (1 - t)
        a = R.uniform(0, 6.28); dd = R.uniform(.2, .55)
        etage(P, F, T, z, rayon, chute, n=9 if w > .6 else 7, phase=R.uniform(0, 6.28), decal=(math.cos(a) * dd, math.sin(a) * dd),
              pente=(R.uniform(-.1, .1), R.uniform(-.1, .1)), teinte=R.uniform(.9, 1.1))
    # cime : une touffe basse et arrondie (pas de flèche pointue)
    c = P.axe(H_TOTAL - .25) + Vector((.15, -.1, 0))
    for i in range(6):
        a0, a1 = i / 6 * 2 * math.pi, (i + 1) / 6 * 2 * math.pi
        F.face([c + Vector((0, 0, .45)), c + Vector((math.cos(a0) * .75, math.sin(a0) * .75, -.15)), c + Vector((math.cos(a1) * .75, math.sin(a1) * .75, -.15))], M("aiguilles_c").couleur(R), (0, 0, 1))
    return T, F

if __name__ == "__main__":
    import bpy
    from apercu import nettoyer_depart, cuire_occlusion, exporter, rapport, materiaux_rendu, decor, rendre, sortie, options
    dossier = sortie(); opts = options(); nettoyer_depart()
    objs = []
    for v in VARIANTES:
        T, F = construire(v); oT, oF = T.objet(), F.objet(); objs += [oT, oF]
    cuire_occlusion(objs, distance=1.2)
    exporter(objs, os.path.join(dossier, "pin.glb"))
    rapport(dossier, objs, [], budget=900, ancien="≈ 950 triangles par pin en cartes transparentes (ancien pin du jeu) ; budget par variante")
    materiaux_rendu(objs); decor(8)
    o2 = [o for o in objs if o.name.endswith("2")]
    for o in o2: o.location.x = 1000   # les 12 vues : variante 1 seule
    C = Vector((0, 0, 5.2)); d = 17; cams = []
    for k, (nom, az) in enumerate((("face", 0), ("droite", 90), ("dos", 180), ("gauche", 270))):
        a = math.radians(az); cams.append((f"{k + 1:02d}_{nom}_homme", Vector((math.sin(a) * d, -math.cos(a) * d, 1.6)), C, 35))
    for k, az in enumerate((45, 135, 225, 315)):
        a = math.radians(az); cams.append((f"{k + 5:02d}_plongee", Vector((math.sin(a) * d * 1.05, -math.cos(a) * d * 1.05, 14)), C, 35))
    cams.append(("09_tronc_pres", Vector((1.2, -3.4, 1.5)), Vector((0, 0, 2.2)), 35))
    cams.append(("10_feuillage_pres", Vector((-1.2, -5.2, 7.6)), Vector((0, -1.2, 6.8)), 35))
    cams.append(("11_dessus", Vector((.01, -.01, 30)), Vector((0, 0, 0)), 35))
    cams.append(("12_sous_branches", Vector((1.2, -1.6, .4)), Vector((0, 0, 6)), 28))
    rendre(dossier, cams)
    for o in o2: o.location.x = 0
    if "foret" in opts:   # planche « forêt » : 32 exemplaires des deux variantes (échelles 0,8 à 1,4, rotations au hasard), comme dans le jeu
        R = random.Random(3); paires = [objs[0:2], objs[2:4]]
        for o in objs: o.location.x = 1000
        for i in range(32):
            x, y = R.uniform(-26, 26), R.uniform(-26, 26)
            s = R.uniform(.8, 1.4); r = R.uniform(0, 6.28)
            for o in paires[i % 2]:
                c = o.copy(); bpy.context.scene.collection.objects.link(c); c.location = (x, y, 0); c.scale = (s, s, s); c.rotation_euler = (0, 0, r)
        bpy.data.objects["Pre"].scale = (3, 3, 1)
        rendre(dossier, [("f1_plongee", Vector((-38, -38, 30)), Vector((0, 0, 3)), 35), ("f2_homme", Vector((-30, -30, 1.7)), Vector((0, 0, 4.5)), 35),
                         ("f3_sous_bois", Vector((2, -2, 1.7)), Vector((-12, 10, 4)), 30), ("f4_lisiere", Vector((-55, -10, 6)), Vector((0, 0, 5)), 32)], prefixe="foret_")
