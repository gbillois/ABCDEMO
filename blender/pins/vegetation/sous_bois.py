# Le sous-bois du Domaine des Pins : une touffe de fougères et un groupe de cailloux moussus, posés par le jeu au pied des pins
# et dans les bosquets (InstancedMesh, des centaines d'exemplaires). Sans transparence. Fait des matières de materiaux.py.
# Repère : Z vers le haut, origine au sol au centre. Objets : P_fougere (≈ 0,9 m de haut, 1,6 m de large), P_cailloux (≈ 1 m de large).
# Lancer seul : blender -b -P sous_bois.py -- <dossier>   (12 rendus des deux objets côte à côte, planche, controle.txt, sous_bois.glb)
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
import math, random
from mathutils import Vector
from kit import Piece
from materiaux import M

from materiaux import melange

def fronde(P, R, ang, L, lev, n=7, roulis=0.0):
    """Une fronde de fougère : une nervure fine en arc (elle monte puis retombe vers le sol, sans le toucher) et, de chaque côté,
    n petites folioles triangulaires séparées, couchées dans le plan de la fronde, balayées vers la pointe, de plus en plus petites.
    Couleur : base vert profond → pointe vert clair (la silhouette se détache de l'herbe)."""
    d = Vector((math.cos(ang), math.sin(ang), 0))
    pos = lambda t: d * (L * t) + Vector((0, 0, .04 + lev * math.sin(math.pi * t ** .7) * (1 - .3 * t)))   # (l'arc monte d'abord)
    base, milieu, pointe = M("fougere_d").couleur(R), M("fougere").couleur(R), M("fougere_c").couleur(R)
    for k in range(n):
        t0, t1 = k / n, (k + 1) / n; a, b = pos(t0), pos(t1); tg = (b - a).normalized()
        cote = tg.cross(Vector((0, 0, 1))).normalized(); cote = (cote * math.cos(roulis) + tg.cross(cote) * math.sin(roulis)).normalized()
        tm = (t0 + t1) / 2; c = melange(base, milieu, min(1, tm * 2)) if tm < .5 else melange(milieu, pointe, (tm - .5) * 2)
        P.face([a + cote * .012, b + cote * .008, b - cote * .008, a - cote * .012], base, Vector((0, 0, 1)))    # nervure
        w = .21 * math.sin(math.pi * (.15 + .85 * tm)) * (1 - .5 * tm) + .03                                      # longueur de la foliole
        for sg in (-1, 1):   # (folioles larges à la base, presque jointives)
            p0, p1 = a + (b - a) * .0, a + (b - a) * .92; tip = a + (b - a) * .55 + cote * sg * w + tg * w * .45 + Vector((0, 0, -.015))
            P.face([p0, p1, tip], c, Vector((0, 0, 1)))

def fougere(graine=3):
    P = Piece("P_fougere", graine); R = P.R
    for i in range(6):   # 6 frondes longues en étoile, régulièrement réparties, qui s'arquent vers l'extérieur
        fronde(P, R, i / 6 * 2 * math.pi + R.uniform(-.15, .15), R.uniform(.8, .95), R.uniform(.42, .5), 7, R.uniform(-.12, .12))
    for i in range(2):   # 2 jeunes frondes courtes, plus dressées, au centre
        fronde(P, R, R.uniform(0, 6.28), R.uniform(.32, .38), .42, 4)
    for i in range(5):   # le cœur : un petit dôme bas, vert profond, caché par la base des frondes
        a0, a1 = i / 5 * 2 * math.pi, (i + 1) / 5 * 2 * math.pi
        P.face([Vector((0, 0, .08)), Vector((math.cos(a0) * .14, math.sin(a0) * .14, -.02)), Vector((math.cos(a1) * .14, math.sin(a1) * .14, -.02))], M("fougere_d").couleur(R), Vector((0, 0, 1)))
    return P

def caillou(P, R, centre, r, h, sub):
    """Un caillou à facettes franches : polyèdre irrégulier enfoncé d'un tiers, base aplatie sous le sol ; les faces qui regardent
    le ciel sont moussues (vert de la fougère), les autres en pierre (une nuance par caillou)."""
    import bmesh
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1)
    for v in bm.verts:
        v.co = Vector((v.co.x * r * R.uniform(.85, 1.15), v.co.y * r * R.uniform(.8, 1.1), max(v.co.z, -.3) * h)) + Vector(centre)
    pierre = M("caillou").couleur(R)
    for f in bm.faces:
        pts = [v.co.copy() for v in f.verts]; f.normal_update(); n = f.normal
        cz = sum(q.z for q in pts) / len(pts)
        P.face(pts, M("mousse_c").couleur(R) if n.z > .6 and cz > centre[2] + h * (.55 if sub < 2 else .74) and R.random() < .85 else tuple(min(1, x * R.uniform(.94, 1.06)) for x in pierre), n)
    bm.free()

def cailloux(graine=4):
    P = Piece("P_cailloux", graine); R = P.R
    caillou(P, R, (0, 0, -.07), .36, .3, 2)       # le gros, arrondi
    caillou(P, R, (.42, .14, -.04), .26, .14, 2)  # un plat
    caillou(P, R, (-.3, .28, -.03), .2, .17, 0)   # un anguleux
    return P

def tapis(graine=6):
    """Le tapis d'aiguilles sous un pin : un disque plat irrégulier (rayon ≈ 1,7 m) brun doré, au bord dentelé vert-brun qui se fond
    dans l'herbe, posé à 2 cm au-dessus du sol (il lie le tronc à l'herbe). Origine au centre (le jeu le pose au pied du pin)."""
    P = Piece("P_tapis", graine); R = P.R; n = 14
    rin = [1.05 * R.uniform(.85, 1.15) for _ in range(n)]; rout = [1.7 * R.uniform(.8, 1.2) for _ in range(n)]
    pt = lambda i, r, z=.02: Vector((math.cos(i / n * 2 * math.pi) * r, math.sin(i / n * 2 * math.pi) * r, z))
    for i in range(n):
        j = (i + 1) % n
        P.face([Vector((0, 0, .025)), pt(i, rin[i]), pt(j, rin[j])], M("litiere").couleur(R), Vector((0, 0, 1)))
        P.face([pt(i, rin[i]), pt(i, rout[i], .015), pt(j, rin[j])], M("litiere_b").couleur(R), Vector((0, 0, 1)))
        P.face([pt(j, rin[j]), pt(i, rout[i], .015), pt(j, rout[j], .015)], M("litiere_b").couleur(R), Vector((0, 0, 1)))
    return P

if __name__ == "__main__":
    import bpy
    from apercu import nettoyer_depart, cuire_occlusion, exporter, rapport, materiaux_rendu, decor, rendre, sortie
    dossier = sortie(); nettoyer_depart()
    oF, oC = fougere().objet(), cailloux().objet(); oT = tapis().objet()
    cuire_occlusion([oF, oC], distance=.4)
    exporter([oF, oC, oT], os.path.join(dossier, "sous_bois.glb"))
    rapport(dossier, [oF, oC], [], budget=250, ancien="aucun (le pied des pins était nu) ; budget par objet")
    materiaux_rendu([oF, oC]); decor(2)
    oF.location.x = -.9; oC.location.x = .9   # (pour les rendus : côte à côte ; dans le GLB, chacun à l'origine)
    C = Vector((0, 0, .3)); d = 4.2; cams = []
    for k, (nom, az) in enumerate((("face", 0), ("droite", 90), ("dos", 180), ("gauche", 270))):
        a = math.radians(az); cams.append((f"{k + 1:02d}_{nom}_homme", Vector((math.sin(a) * d, -math.cos(a) * d, 1.6)), C, 35))
    for k, az in enumerate((45, 135, 225, 315)):
        a = math.radians(az); cams.append((f"{k + 5:02d}_plongee", Vector((math.sin(a) * d, -math.cos(a) * d, 3.2)), C, 35))
    cams.append(("09_fougere_pres", Vector((-.9 + .6, -1.5, .9)), Vector((-.9, 0, .3)), 35))
    cams.append(("10_cailloux_pres", Vector((.9 + .5, -1.3, .8)), Vector((.9, 0, .1)), 35))
    cams.append(("11_dessus", Vector((.01, -.01, 6)), Vector((0, 0, 0)), 35))
    cams.append(("12_ras_du_sol", Vector((0, -2.4, .15)), Vector((0, 0, .35)), 35))
    rendre(dossier, cams)
