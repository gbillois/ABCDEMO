# La cheminée de la maison, vue de la pièce : deux jambages de moellons, contrecœur noirci par la suie, sole de
# pierre et pierre de foyer devant (4 cm : on marche dessus), manteau de chêne et sa tablette, hotte enduite qui monte
# jusqu'au plafond, feu de bois sur ses chenets, crémaillère et chaudron, deux pots et une chandelle sur la tablette.
# Le mur est derrière (y = 0), la cheminée s'avance vers -Y. Pied à l'origine. Les flammes, les braises et la flamme
# de la chandelle vont dans V (elles brillent). FEU : position du feu (pour la lumière du jeu).
# Faite du kit (pile_moellons, poutre, planche, boite_effilee, feu_de_bois) et des objets chandelle et vaisselle.
# Lancer seule : blender -b -P cheminee_interieure.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."), os.path.dirname(os.path.abspath(__file__))]
from mathutils import Matrix
from kit import Piece, poutre, planche, pile_moellons, boite_effilee, feu_de_bois, nb_sommets, _neufs
from materiaux import M, melange
import chandelle, vaisselle

LARG, PROF, H_MANTEAU, JAMBAGE = 2.0, .7, 1.3, .5
FEU = (0, -PROF / 2 + .05, .45)

def construire(V, Mx=None, graine=73, z_plafond=3.0):
    """Mx : placement de la cheminée dans la pièce (pour ce qui va dans V, qui est déjà dans le repère de la pièce)."""
    P = Piece("P_cheminee_int", graine); R = P.R; l, p, hm, jw = LARG, PROF, H_MANTEAU, JAMBAGE; Vl = Piece("tmp_v", graine + 1)
    for s in (-1, 1):   # jambages : blocs de pierre chaude (un ou deux par rang, joints décalés) sur un cœur sombre qui fait les joints
        P.boite((s * (l / 2 - jw / 2), -p / 2 + .01, (hm - .12) / 2), (jw - .05, p - .04, hm - .14), M("joint").couleur(R), bev=0)
        pile_moellons(P, (s * (l / 2 - jw / 2), -p / 2), jw, p, 0, hm - .12, mat="pierre_f", hauteur=(.26, .36), bev=.02)
    n0 = nb_sommets(P)
    pile_moellons(P, (0, -.08), l - 2 * jw + .04, .16, 0, hm - .12, mat="pierre_f", hauteur=(.2, .28), bev=0)   # contrecœur
    for v in _neufs(P, n0):                                                                          # noirci par la suie, plus en haut
        t = min(1, max(0, v.co.z / (hm - .12))); c = v[P.col]
        v[P.col] = (*melange(tuple(c[:3]), M("charbon").teintes[0], .45 + .35 * t), 1)
    P.boite((0, -p / 2 + .04, .02), (l - 2 * jw, p - .08, .04), M("charbon").couleur(R), bev=0)       # sole
    x_ = -(l + .1) / 2                                                                               # pierre de foyer : trois dalles inégales
    for w_ in (.62, .74, l + .1 - 1.36):
        P.boite((x_ + w_ / 2, -p - .24, .02), (w_ - .015, .5, .04), tuple(k * .9 for k in M("pierre_f").couleur(R)), bev=.012); x_ += w_
    poutre(P, (-l / 2 - .08, -p + .1, hm - .02), (l / 2 + .08, -p + .1, hm - .02), l=.24, h=.24, mat="chene", bev=.04)   # manteau
    planche(P, (0, -(p + .12) / 2, hm + .13), (l + .26, p + .12, .06), mat="chene_c")                 # tablette (27 cm devant la hotte)
    zb = hm + .16; ph = .5; ph0 = p - .15
    hotte = boite_effilee(P, (0, -ph0 / 2, zb), (l - .06, ph0), (l * .55, ph), z_plafond - zb, M("platre_i").couleur(R), decal=(0, ph0 / 2 - ph / 2))
    for v in hotte:
        if v.co.z < zb + .01: v[P.col] = (*(x * .82 for x in v[P.col][:3]), 1)                       # bas de la hotte enfumé
    poutre(P, (0, -.1, hm - .1), (0, -.1, zb + .02), l=.04, h=.04, mat="fer", bev=0)                  # crémaillère
    poutre(P, (0, -.1, hm - .1), (0, -p / 2 + .05, hm - .1), l=.03, h=.03, mat="fer", bev=0)
    poutre(P, (0, -p / 2 + .05, hm - .1), (0, -p / 2 + .05, .86), l=.025, h=.025, mat="fer", bev=0)
    zc = .62                                                                                          # chaudron (au-dessus des flammes)
    P.cylindre((0, -p / 2 + .05, zc), (0, -p / 2 + .05, zc + .1), .12, .17, M("fer").couleur(R), n=8)
    P.cylindre((0, -p / 2 + .05, zc + .1), (0, -p / 2 + .05, zc + .22), .17, .15, M("fer").couleur(R), n=8)
    P.cylindre((0, -p / 2 + .05, zc + .22), (0, -p / 2 + .05, zc + .25), .165, .165, M("fer").couleur(R), n=8)
    poutre(P, (-.15, -p / 2 + .05, zc + .25), (0, -p / 2 + .05, .86), l=.015, h=.015, mat="fer", bev=0)   # anse
    poutre(P, (.15, -p / 2 + .05, zc + .25), (0, -p / 2 + .05, .86), l=.015, h=.015, mat="fer", bev=0)
    feu_de_bois(Vl, P, FEU[0], FEU[1], .04, l=.72)
    zt = hm + .16                                                                                     # sur la tablette, devant la hotte
    vaisselle.pot(P, (-.78, -p - .03, zt), r=.08, h=.18); vaisselle.pot(P, (-.56, -p - .02, zt), r=.06, h=.13, mat="faience_b")
    vaisselle.assiette(P, (.42, -p + .14, zt), r=.11, debout=True)
    P.ajouter(chandelle.construire(Vl, (.8, -p - .03, zt)), Matrix.Translation((.8, -p - .03, zt)))
    V.ajouter(Vl, Mx); Vl.bm.free()
    return P

if __name__ == "__main__":
    from apercu import apercu_objet_v
    V = Piece("IL_cheminee_int", 5)
    apercu_objet_v(construire(V), V, pied=(2.2, 1.3))
