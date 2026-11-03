# La vaisselle et les petites choses de la maison : assiettes crème à bord bleu (posées ou debout), bols, cruche,
# pots de terre à couvercle, gobelets, miche de pain sur sa planche, coupe de pommes. Chaque fonction pose une chose
# avec son dessous en « centre » (z = dessous). construire(sorte) assemble un service :
#   « table » : le couvert d'une table de 1,7 × 0,8 m (dessus à z = 0) ;
#   « buffet » : ce qui se range sur le dessus d'un buffet.
# Lancer seule : blender -b -P vaisselle.py -- <dossier>
import sys, os; sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")]
import math
from kit import Piece, planche, boite_douce
from materiaux import M

def assiette(P, c, r=.12, debout=False, rz=0.0):
    x, y, z = c
    if debout:   # appuyée contre le mur (+Y), un peu penchée
        dx, dy = math.sin(rz), -math.cos(rz)
        P.cylindre((x - dx * .0, y - dy * .0, z + r), (x + dx * .022, y + dy * .022, z + r), r, r, M("faience_b").couleur(P.R), n=8)
        P.cylindre((x + dx * .022, y + dy * .022, z + r), (x + dx * .026, y + dy * .026, z + r), r * .72, r * .72, M("faience").couleur(P.R), n=8)
    else:
        P.cylindre((x, y, z), (x, y, z + .018), r * .7, r, M("faience_b").couleur(P.R), n=8)
        P.cylindre((x, y, z + .018), (x, y, z + .021), r * .72, r * .72, M("faience").couleur(P.R), n=8)

def bol(P, c, r=.075, mat="faience", plein=None):
    x, y, z = c
    P.cylindre((x, y, z), (x, y, z + r * .8), r * .55, r, M(mat).couleur(P.R), n=8)
    if plein: P.cylindre((x, y, z + r * .6), (x, y, z + r * .72), r * .9, r * .92, M(plein).couleur(P.R), n=8)

def gobelet(P, c, r=.04):
    x, y, z = c; P.cylindre((x, y, z), (x, y, z + .1), r * .85, r, M("chene_c").couleur(P.R), n=7)

def cruche(P, c, r=.085, mat="faience_b"):
    x, y, z = c; col = M(mat).couleur(P.R)
    P.cylindre((x, y, z), (x, y, z + r * 1.2), r * .8, r * 1.05, col, n=8)
    P.cylindre((x, y, z + r * 1.2), (x, y, z + r * 2.1), r * 1.05, r * .55, col, n=8)
    P.cylindre((x, y, z + r * 2.1), (x, y, z + r * 2.45), r * .55, r * .7, col, n=8)
    P.boite((x + r * 1.05, y, z + r * 1.5), (.03, .025, r * 1.3), col, bev=0)                 # anse

def pot(P, c, r=.09, h=.2, mat="terre", couvercle=True):
    x, y, z = c; col = M(mat).couleur(P.R)
    P.cylindre((x, y, z), (x, y, z + h * .7), r * .8, r, col, n=8)
    P.cylindre((x, y, z + h * .7), (x, y, z + h), r, r * .75, col, n=8)
    if couvercle:
        P.cylindre((x, y, z + h), (x, y, z + h + .025), r * .8, r * .7, M("chene_c").couleur(P.R), n=8)
        P.sphere((x, y, z + h + .04), .022, M("chene").couleur(P.R), sub=1)

def miche(P, c, r=.13):
    x, y, z = c
    planche(P, (x, y, z + .015), (.42, .28, .03), mat="chene_c")
    boite_douce(P, (x - .03, y, z + .03 + r * .35), (r * 2, r * 1.6, r * .7), M("pain").couleur(P.R), arrondi=.05, seg=1)
    for k in range(3): P.boite((x - .03 + (k - 1) * r * .5, y, z + .03 + r * .7), (.02, r * 1.1, .01), M("pain").sombre, rz=.5, bev=0)   # entailles

def pommes(P, c, n=5):
    x, y, z = c; bol(P, c, r=.12, mat="chene_c")
    for k in range(n):
        a = 2 * math.pi * k / n; rr = .05 if k < n - 1 else 0
        P.sphere((x + math.cos(a) * rr, y + math.sin(a) * rr, z + .1 + (0 if k < n - 1 else .05)), .045, M("pomme").couleur(P.R), sub=1)

def construire(sorte="table", graine=81):
    P = Piece("P_vaisselle", graine)
    if sorte == "table":   # deux couverts face à face, la cruche, le pain, les pommes, deux gobelets
        for (x, y) in ((-.45, -.22), (.4, .22)):
            assiette(P, (x, y, 0)); bol(P, (x, y, .02), plein="pain")
        gobelet(P, (-.2, -.25, 0)); gobelet(P, (.62, .26, 0))
        cruche(P, (.05, .05, 0)); miche(P, (-.45, .2, 0)); pommes(P, (.55, -.2, 0))
    elif sorte == "buffet":
        pot(P, (-.4, 0, 0), r=.1, h=.24); pot(P, (-.18, .02, 0), r=.07, h=.16, mat="faience_b")
        pommes(P, (.15, 0, 0)); cruche(P, (.42, 0, 0), mat="faience")
    return P

if __name__ == "__main__":
    from apercu import apercu_objet
    apercu_objet(construire(), pied=(1.7, .8))
