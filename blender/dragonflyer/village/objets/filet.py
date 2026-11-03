# Le filet de pêche mis à sécher, pendu à deux chevilles d'un mur (le mur est derrière, vers +Y ; les chevilles à z = 0) :
# corde du haut avec flotteurs de liège ; la nappe pend plus bas au milieu et fait des plis ; ses mailles en losanges sont
# de vrais fils (rubans fins), on voit le mur à travers ; le bas est irrégulier. Fait du kit (poutre, cylindre, face_vers).
# Lancer seul : blender -b -P filet.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
import math
from mathutils import Vector
from kit import Piece, poutre, face_vers
from materiaux import M, melange

def construire(graine=29, L=2.4, h=1.0, nu=10, nv=5, fil=.034):
    P = Piece("P_filet", graine); R = P.R
    for s in (-1, 1): poutre(P, (s * L / 2, .03, 0), (s * L / 2, -.14, 0), l=.05, h=.05, mat="chene")   # chevilles
    bas = [R.uniform(.85, 1.1) for i in range(nu + 1)]
    def pos(i, j):
        u = i / nu; v = j / nv; m = 1 - (2 * u - 1) ** 2
        z = -.05 - .16 * m - v * h * bas[i] * (1 + .25 * m)
        y = -.1 - (.05 * math.sin(u * math.pi * 6 + 1.3) + .04) * v - .03 * m * v
        return Vector((-L / 2 + L * u, y, z))
    G = [[pos(i, j) for j in range(nv + 1)] for i in range(nu + 1)]
    cf = melange(M("filet").teintes[0], M("corde").teintes[0], .35)
    def fil_(a, b):
        w = (b - a).cross(Vector((0, -1, 0))).normalized() * fil / 2
        vs = [P.bm.verts.new(p) for p in (a - w, b - w, b + w, a + w)]
        c = tuple(x * R.uniform(.9, 1.06) for x in cf)
        for v in vs: v[P.col] = (*c, 1)
        face_vers(P, vs, (0, -1, 0))
    for i in range(nu):   # mailles en losanges : les deux diagonales de chaque case
        for j in range(nv): fil_(G[i][j], G[i + 1][j + 1]); fil_(G[i + 1][j], G[i][j + 1])
    for j in range(nv): fil_(G[0][j], G[0][j + 1]); fil_(G[nu][j], G[nu][j + 1])   # lisières
    pts = [G[i][0] + Vector((0, .01, .02)) for i in range(0, nu + 1, 2)]
    pts[0] = Vector((-L / 2, -.1, 0)); pts[-1] = Vector((L / 2, -.1, 0))
    for p0, p1 in zip(pts, pts[1:]): P.cylindre(p0, p1, .018, .018, M("corde").couleur(R), n=5)   # corde du haut
    for p in pts[1:-1]: P.cylindre(p - Vector((.06, 0, 0)), p + Vector((.06, 0, 0)), .045, .045, M("liege").couleur(R), n=6)   # flotteurs
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(2.6, .5))
