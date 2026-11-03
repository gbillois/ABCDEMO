# Le casier à homards : fond de deux planches, trois arceaux de bois (trois pans), deux lattes en long, filet tendu dessous et aux bouts.
# Longueur selon X, pied à l'origine. Fait du kit (poutre, face_vers).
# Lancer seul : blender -b -P casier.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
import math
from mathutils import Vector
from kit import Piece, poutre, face_vers
from materiaux import M, melange

def construire(graine=23, L=.7, l=.46, h=.38):
    P = Piece("P_casier", graine); R = P.R
    for dy in (-l / 4, l / 4): P.boite((0, dy, .02), (L, l / 2 - .015, .04), M("chene_c").couleur(R, .12), bev=0)   # fond
    arc = [(math.cos(a) * l / 2, .04 + math.sin(a) * (h - .04)) for a in (math.pi, math.pi * 2 / 3, math.pi / 3, 0)]
    # filet sous les lattes (dessus et bouts), un peu en retrait
    cf = M("filet").couleur(R)
    for k in range(len(arc) - 1):
        (y0, z0), (y1, z1) = arc[k], arc[k + 1]
        vs = [P.bm.verts.new((x, y * .96, .04 + (z - .04) * .96)) for (x, y, z) in ((-L / 2 + .03, y0, z0), (L / 2 - .03, y0, z0), (L / 2 - .03, y1, z1), (-L / 2 + .03, y1, z1))]
        for i, v in enumerate(vs): v[P.col] = (*melange(cf, M("corde").teintes[0], .3 * (i % 2)), 1)
        face_vers(P, vs, Vector((0, (y0 + y1) / 2, (z0 + z1) / 2)))
    for sx in (-1, 1):
        vs = [P.bm.verts.new((sx * (L / 2 - .03), y * .96, .04 + (z - .04) * .96)) for (y, z) in arc]
        for i, v in enumerate(vs): v[P.col] = (*melange(cf, M("corde").teintes[0], .3 * (i % 2)), 1)
        face_vers(P, vs, Vector((sx, 0, 0)))
    for x in (-L / 2 + .03, 0, L / 2 - .03):   # arceaux
        for (y0, z0), (y1, z1) in zip(arc, arc[1:]): poutre(P, (x, y0, z0), (x, y1, z1), l=.035, h=.035, mat="chene_c")
    for (y, z) in arc[1:-1]: poutre(P, (-L / 2, y, z), (L / 2, y, z), l=.03, h=.03, mat="chene")   # lattes
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(.8, .6))
