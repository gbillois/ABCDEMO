# La barque à rames : coque peinte (une bande crème sous le plat-bord), pointe à l'avant (+X), tableau à l'arrière,
# intérieur en bois, deux bancs, deux rames posées dedans. z = 0 : ligne de flottaison. Faite du kit (face_vers, poutre)
# et de l'objet rame.
# Lancer seule : blender -b -P barque.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."), os.path.dirname(os.path.abspath(__file__))]
import math
from mathutils import Vector, Matrix
from kit import Piece, poutre, face_vers
from materiaux import M, melange
import rame

def construire(graine=31, L=3.0, l=1.15, mat="clin_bleu"):
    P = Piece("P_barque", graine); R = P.R; bm = P.bm
    ns = 7; ss = [-1 + 2 * i / (ns - 1) for i in range(ns)]; ss[-1] = .985
    def section(s, dedans=False):
        """Profil d'une tranche (de bâbord à tribord) : plat-bord, bande, bouchain, quille."""
        w = l / 2 * max(.02, 1 - (s if s > 0 else s * .72) ** 2) ** .5
        zt = .3 + .14 * s ** 4; zq = -.28 * max(.05, 1 - s ** 6) ** .5
        pr = [(-w, zt), (-w * .98, zt - .08), (-w * .7, zt * .2 + zq * .8), (0, zq)]
        pr = pr + [(-y, z) for (y, z) in reversed(pr[:-1])]
        if dedans: pr = [(y * .86, z + .06) for (y, z) in pr]
        return [Vector((s * L / 2, y, z)) for (y, z) in pr]
    ext = [section(s) for s in ss]; inn = [section(s, True) for s in ss]
    peint, creme, bois = M(mat), M("blanc").teintes[0], M("chene_c")
    m = len(ext[0])
    def bande(G, j, c, sens):
        """Une bande de la coque entre les points j et j+1 de chaque tranche, avec ses propres sommets (couleurs nettes)."""
        for i in range(ns - 1):
            q = [G[i][j], G[i + 1][j], G[i + 1][j + 1], G[i][j + 1]]
            vv = [bm.verts.new(p) for p in q]
            for v in vv: v[P.col] = (*c, 1)
            mid = sum(q, Vector()) / 4; face_vers(P, vv, Vector((0, mid.y, mid.z + .05)) * sens)
    for j in range(m - 1):
        c = creme if j in (0, m - 2) else peint.couleur(R, .04)
        bande(ext, j, c, 1)
        bande(inn, j, melange(bois.couleur(R, .08), bois.sombre, .35 if 1 <= j <= m - 3 else 0), -1)
    for i in range(ns - 1):   # plat-bord : entre l'extérieur et l'intérieur
        for (je, ji) in ((0, 0), (m - 1, m - 1)):
            vv = [bm.verts.new(p) for p in (ext[i][je], ext[i + 1][je], inn[i + 1][ji], inn[i][ji])]
            for v in vv: v[P.col] = (*M("chene").couleur(R), 1)
            face_vers(P, vv, (0, 0, 1))
    for (G, sens) in ((ext, -1), (inn, 1)):   # tableau arrière
        vv = [bm.verts.new(p) for p in G[0]]
        for v in vv: v[P.col] = (*(peint.couleur(R) if sens < 0 else bois.couleur(R)), 1)
        face_vers(P, vv, (sens, 0, 0))
    for x in (-.55, .45):   # bancs
        w = l / 2 * (1 - (x / (L / 2) * (1 if x > 0 else .72)) ** 2) ** .5 * .86
        P.boite((x, 0, .14), (.24, 2 * w, .05), bois.couleur(R), bev=0)
    for sy in (-1, 1):   # deux rames posées sur les bancs
        d = Vector((1, -sy * .05, .02)).normalized(); ex = Vector((0, 0, 1)); ey = d.cross(ex)
        Mx = Matrix.Translation((-1.05, sy * .22, .2)) @ Matrix((list(ex) + [0], list(ey) + [0], list(d) + [0], [0, 0, 0, 1])).transposed()
        P.ajouter(rame.construire(graine + sy, L=2.1, mat_pale=mat), Mx)
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(3.2, 1.3))
