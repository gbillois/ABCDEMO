# The Dragon Apprentice Chronicles : animaux de la ferme et de la forêt (mouton, chèvre, poule, cerf, vache).
# Style « jouet » chanfreiné comme le village ; couleurs par sommet × occlusion cuite.
# L'attribut « _TAG » (lu « _tag » par three.js) marque les parties animées par le jeu (vertex shader, un seul dessin par espèce) :
#   1.0 corps, 0.1 tête (broute), 0.2 patte avant gauche, 0.4 avant droite, 0.6 arrière gauche, 0.8 arrière droite.
# Propriétés exportées : « hanche » = hauteur des articulations des pattes, « cou » = [y, z] du pivot de la tête (repère Blender).
# Lancer : blender -b -P animaux.py -- <dossier>      Produit : animaux.glb (+ apercu_animaux.png)
import bpy, bmesh, math, random, os, sys
import numpy as np
from mathutils import Vector, Matrix

OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "/tmp/animaux"
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
R = random.Random(3)
def lin(h):
    h = h.lstrip("#"); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4 for x in c)
CORPS, TETE, PFG, PFD, PAG, PAD = 1.0, .1, .2, .4, .6, .8

class Piece:
    def __init__(s, nom): s.nom = nom; s.bm = bmesh.new(); s.col = s.bm.verts.layers.float_color.new("Col")
    def _fin(s, vs, c, tag, jit=0.0):
        for v in vs:
            v[s.col] = (*c, tag)
            if jit: v.co += Vector((R.uniform(-jit, jit), R.uniform(-jit, jit), R.uniform(-jit, jit)))
    def sphere(s, c, r, col, ech=(1, 1, 1), tag=CORPS, sub=2, jit=0.0):
        M = Matrix.Translation(Vector(c)) @ Matrix.Diagonal((*ech, 1))
        vs = bmesh.ops.create_icosphere(s.bm, subdivisions=sub, radius=r, matrix=M)["verts"]; s._fin(vs, col, tag, jit); return vs
    def boite(s, c, t, col, tag=CORPS, rx=0.0, bev=.02):
        M = Matrix.Translation(Vector(c)) @ Matrix.Rotation(rx, 4, "X") @ Matrix.Diagonal((*t, 1))
        vs = bmesh.ops.create_cube(s.bm, size=1, matrix=M)["verts"]; s._fin(vs, col, tag)
        if bev:
            st = set(vs); r = bmesh.ops.bevel(s.bm, geom=[e for e in s.bm.edges if e.verts[0] in st and e.verts[1] in st], offset=bev, segments=1, affect="EDGES")
            for v in r["verts"]: v[s.col] = (*col, tag)
        return vs
    def cyl(s, a, b, r1, r2, col, tag=CORPS, n=8):
        a, b = Vector(a), Vector(b); d = b - a
        M = Matrix.Translation((a + b) / 2) @ d.to_track_quat("Z", "Y").to_matrix().to_4x4()
        vs = bmesh.ops.create_cone(s.bm, cap_ends=True, segments=n, radius1=r1, radius2=r2, depth=d.length, matrix=M)["verts"]; s._fin(vs, col, tag); return vs
    def objet(s, props):
        me = bpy.data.meshes.new(s.nom); s.bm.normal_update(); s.bm.to_mesh(me); s.bm.free()
        for p in me.polygons: p.use_smooth = True
        ob = bpy.data.objects.new(s.nom, me); scene.collection.objects.link(ob)
        for k, v in props.items(): ob[k] = v
        return ob

# ------------------------------------------------------------------ corps organiques : metaballs fondues en un seul maillage
# Chaque animal = des boules, ellipsoïdes et capsules qui se fondent (encolure, croupe, toison bouclée), converties en maillage,
# allégé, puis colorié par régions (fonction de la position) et étiqueté pour l'animation (pattes sous la hanche, tête devant le cou).
from mathutils import noise
def metaboules(nom, elements, resolution=.028):
    mb = bpy.data.metaballs.new("MB_" + nom); mb.resolution = resolution; mb.render_resolution = resolution; mb.threshold = .6
    for e in elements:
        t, co, r = e[0], e[1], e[2]; el = mb.elements.new(); el.type = t; el.co = co; el.radius = r / .575; el.stiffness = 2.0   # rayon visible = 0,575 × rayon (raideur 2)
        if t == "ELLIPSOID": el.size_x, el.size_y, el.size_z = e[3]
        if t == "CAPSULE":   # capsule d'un point a à un point b
            a, b = Vector(co), Vector(e[3]); d = b - a; el.co = (a + b) / 2; el.size_x = d.length / 2
            el.rotation = Vector((1, 0, 0)).rotation_difference(d.normalized())
    ob = bpy.data.objects.new("MB_" + nom, mb); scene.collection.objects.link(ob)
    dg = bpy.context.evaluated_depsgraph_get(); me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    bpy.data.objects.remove(ob); bpy.data.metaballs.remove(mb)
    bm = bmesh.new(); bm.from_mesh(me); bpy.data.meshes.remove(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=.002)
    return bm
def alleger(bm, cible):   # décimation douce jusqu'à « cible » triangles, sans abîmer la silhouette
    me = bpy.data.meshes.new("tmp"); bm.to_mesh(me); ob = bpy.data.objects.new("tmp", me); scene.collection.objects.link(ob)
    n = len(me.polygons) * 2; md = ob.modifiers.new("d", "DECIMATE"); md.ratio = min(1, cible / max(1, n))
    sm = ob.modifiers.new("s", "SMOOTH"); sm.factor = .35; sm.iterations = 2
    dg = bpy.context.evaluated_depsgraph_get(); m2 = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    bpy.data.objects.remove(ob); bpy.data.meshes.remove(me); bm2 = bmesh.new(); bm2.from_mesh(m2); bpy.data.meshes.remove(m2); return bm2
class Animal(Piece):
    """Un corps en metaballs (couleur et étiquette par sommet données par des fonctions), puis des détails ajoutés en bmesh."""
    def __init__(s, nom, elements, couleur, etiquette, cible=2600, resolution=.028):
        s.nom = nom; s.bm = alleger(metaboules(nom, elements, resolution), cible); s.col = s.bm.verts.layers.float_color.new("Col")
        for v in s.bm.verts: v[s.col] = (*couleur(v.co), etiquette(v.co))
def grain(co, f=9.0, k=.06): return 1 + k * noise.noise(Vector(co) * f)
def melange(a, b, t): t = max(0, min(1, t)); return tuple(x + (y - x) * t for x, y in zip(a, b))
def fois(c, k): return tuple(min(1, x * k) for x in c)
def lisse(a, b, x): t = max(0, min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t)
def etiquettes(hanche, cou_y, pattes, rayon):
    """Pattes : sous la hanche, près de l'axe d'une patte ; tête : devant le pivot du cou."""
    def f(co):
        if co.y < cou_y and co.z > hanche * .9: return TETE
        if co.z < hanche - .01:
            for (px, py, tag) in pattes:
                if (co.x - px) ** 2 + (co.y - py) ** 2 < (rayon * 2.6) ** 2: return tag
        return CORPS
    return f
def yeux(P, x, y, z, r, iris=lin("#2a1a10"), tag=TETE):   # œil : blanc, iris, petit reflet
    for s in (-1, 1):
        P.sphere((s * x, y, z), r, lin("#f4efe4"), tag=tag, sub=2)
        P.sphere((s * (x + r * .45), y - r * .55, z + r * .05), r * .62, iris, tag=tag, sub=2)
        P.sphere((s * (x + r * .62), y - r * .82, z + r * .3), r * .17, (1, 1, 1), tag=tag, sub=1)
def oreille(P, s, base, d, l, w, col, interieur, tag=TETE):
    a = Vector(base); dv = Vector(d).normalized()
    vs = P.sphere(a + dv * l * .5, l * .5, col, (1, 1, 1), tag, sub=2)
    M = (Matrix.Translation(a + dv * l * .5) @ dv.to_track_quat("Z", "Y").to_matrix().to_4x4() @ Matrix.Diagonal((w / l * 2, .35, 1, 1)) @ Matrix.Translation(-(a + dv * l * .5)))
    for v in vs: v.co = M @ v.co
    v2 = P.sphere(a + dv * l * .5 + Vector((0, -.004, 0)), l * .4, interieur, (1, 1, 1), tag, sub=1)
    M2 = (Matrix.Translation(a + dv * l * .5) @ dv.to_track_quat("Z", "Y").to_matrix().to_4x4() @ Matrix.Diagonal((w / l * 1.5, .2, .9, 1)) @ Matrix.Translation(-(a + dv * l * .5)))
    for v in v2: v.co = M2 @ v.co + Vector((0, -.012, 0))
def sabots(P, pattes, r, col, h=.07):
    for (px, py, tag) in pattes:
        P.cyl((px, py, h), (px, py - .01, 0), r * .95, r * 1.1, col, tag, n=10)
        P.boite((px, py - r * .9, .012), (r * .25, r * .5, .025), lin("#14100c"), tag, bev=0)   # fente du sabot

def mouton():
    LAINE, LAINE2, NOIR, OS = lin("#f2ece0"), lin("#d8ccb8"), lin("#2e2a28"), lin("#1a1816")
    el = [("ELLIPSOID", (0, 0, .78), .34, (1, 1.55, .9))]
    rr = random.Random(5)
    for i in range(150):   # toison bouclée : petites boucles en relief sur le dos et les flancs
        a = rr.uniform(0, math.tau); b = rr.uniform(-.97, .97); k = math.sqrt(1 - b * b)
        p = (math.cos(a) * .37 * k, b * .58, .8 + math.sin(a) * .33 * k)
        if p[2] < .6: continue
        el.append(("BALL", p, rr.uniform(.065, .085)))
    el += [("CAPSULE", (0, -.42, .88), .14, (0, -.58, .95)), ("ELLIPSOID", (0, -.68, .93), .13, (1, 1.35, 1.0)), ("BALL", (0, -.6, 1.07), .11, None, 1.4),
           ("BALL", (0, .56, .84), .1)]
    pts = [(.16, -.32, PFG), (-.16, -.32, PFD), (.16, .32, PAG), (-.16, .32, PAD)]
    for (px, py, _) in pts: el.append(("CAPSULE", (px, py, .6), .055, (px, py, .07)))
    def couleur(co):
        if co.z < .5 or (co.y < -.6 and co.z < 1.02 and not (co.y > -.66 and co.z > .98)): return fois(NOIR, grain(co, 14, .08))
        return fois(melange(LAINE, LAINE2, .5 + .5 * noise.noise(co * 6.0)), grain(co, 22, .07))
    P = Animal("A_mouton", el, couleur, etiquettes(.52, -.5, pts, .055), 4200, .02)
    yeux(P, .075, -.79, .98, .026)
    for s in (-1, 1): oreille(P, s, (s * .1, -.66, 1.0), (s, .1, -.15), .15, .07, NOIR, lin("#a87a70"))
    for s in (-1, 1): P.sphere((s * .028, -.83, .89), .012, OS, tag=TETE, sub=1)   # naseaux
    sabots(P, pts, .052, OS)
    return P.objet({"hanche": .52, "cou": [-.5, .85]})

def chevre():
    POIL, POIL2, CORNE, SAB, BLANC = lin("#d8cbb4"), lin("#7a5a3e"), lin("#5a5048"), lin("#2a2420"), lin("#f0e8d8")
    el = [("ELLIPSOID", (0, 0, .82), .27, (1, 1.8, 1.0)), ("BALL", (0, -.3, .86), .24), ("BALL", (0, .3, .84), .23),
          ("CAPSULE", (0, -.4, .92), .1, (0, -.58, 1.12)), ("ELLIPSOID", (0, -.67, 1.13), .11, (1, 1.5, 1.05)), ("BALL", (0, -.8, 1.06), .07)]
    pts = [(.14, -.32, PFG), (-.14, -.32, PFD), (.14, .32, PAG), (-.14, .32, PAD)]
    for (px, py, _) in pts: el += [("CAPSULE", (px, py, .66), .05, (px, py - .02, .32)), ("CAPSULE", (px, py - .02, .32), .038, (px, py, .07))]
    def couleur(co):
        selle = lisse(.95, 1.08, co.z) * lisse(.5, .2, abs(co.y)) + lisse(.45, .2, co.z) * .9
        c = melange(POIL, POIL2, selle)
        if co.y < -.75: c = melange(c, BLANC, .5)
        return fois(c, grain(co, 18, .08))
    P = Animal("A_chevre", el, couleur, etiquettes(.6, -.45, pts, .05))
    yeux(P, .07, -.72, 1.18, .024, lin("#b88a20"))
    for s in (-1, 1):
        a = Vector((s * .05, -.64, 1.22)); P.cyl(a, a + Vector((s * .05, .1, .14)), .035, .025, CORNE, TETE, n=8); P.cyl(a + Vector((s * .05, .1, .14)), a + Vector((s * .09, .26, .2)), .025, .006, CORNE, TETE, n=8)
        oreille(P, s, (s * .1, -.62, 1.15), (s, .2, -.25), .14, .06, POIL, lin("#c8a090"))
    P.cyl((0, -.78, 1.0), (0, -.76, .84), .035, .008, POIL2, TETE, n=7)   # barbiche
    sabots(P, pts, .04, SAB)
    P.cyl((0, .48, .95), (0, .56, 1.08), .045, .015, POIL2, n=7)
    return P.objet({"hanche": .6, "cou": [-.45, .95]})

def poule():
    PLUME, PLUME2, PLUME3, CRETE, BEC, PATTE = lin("#c8743a"), lin("#7a3a1a"), lin("#e8a860"), lin("#d8281a"), lin("#e8b030"), lin("#e8a830")
    el = [("ELLIPSOID", (0, 0, .27), .15, (1, 1.3, 1.0)), ("BALL", (0, -.09, .3), .12), ("ELLIPSOID", (0, .14, .38), .07, (.7, 1.2, 1.6)),
          ("CAPSULE", (0, -.1, .36), .07, (0, -.13, .44)), ("BALL", (0, -.14, .45), .075)]
    pts = [(.05, 0, PFG), (-.05, 0, PFD)]
    def couleur(co):
        aile = lisse(.11, .14, abs(co.x)) * lisse(.2, .3, co.z)
        c = melange(PLUME, PLUME2, max(aile, lisse(.32, .5, co.z) * lisse(.05, .15, co.y)))
        c = melange(c, PLUME3, lisse(-.05, -.2, co.y) * lisse(.36, .3, co.z))
        return fois(c, grain(co, 40, .1))
    P = Animal("A_poule", el, couleur, etiquettes(.15, -.1, pts, .02), 1600, .016)
    yeux(P, .045, -.18, .47, .014, lin("#c88a10"))
    P.cyl((0, -.2, .44), (0, -.26, .42), .022, .004, BEC, TETE, n=8)
    for i in range(4): P.sphere((0, -.15 + i * .028, .53 + .012 * (i in (1, 2))), .024, CRETE, (.5, 1, 1), TETE, sub=1)
    P.sphere((0, -.2, .39), .02, CRETE, (.6, 1, 1.4), TETE, sub=1)
    for (px, py, tag) in pts:
        P.cyl((px, py, .17), (px, py - .02, .01), .012, .01, PATTE, tag, n=6)
        for a in (-.5, 0, .5): P.cyl((px, py - .02, .01), (px + math.sin(a) * .05, py - .02 - math.cos(a) * .05, 0), .007, .004, PATTE, tag, n=5)
    for k in range(5): P.sphere((0, .17 + k * .012, .44 + k * .022), .03, PLUME2, (.3, 1, 1.6), sub=1)   # plumes de la queue
    return P.objet({"hanche": .15, "cou": [-.1, .35]})

def cerf():
    ROUX, ROUX2, CLAIR, BOIS, SAB, NEZ = lin("#9a5a2e"), lin("#6a3a1e"), lin("#ecdcc0"), lin("#d0bc92"), lin("#2a2018"), lin("#1e1612")
    el = [("ELLIPSOID", (0, 0, 1.16), .3, (1, 1.95, 1.0)), ("BALL", (0, -.38, 1.17), .3), ("BALL", (0, .42, 1.18), .29),
          ("CAPSULE", (0, -.5, 1.3), .15, (0, -.76, 1.66)), ("ELLIPSOID", (0, -.88, 1.73), .12, (1, 1.55, 1.0)), ("BALL", (0, -1.02, 1.68), .075),
          ("BALL", (0, .66, 1.28), .08)]
    pts = [(.17, -.42, PFG), (-.17, -.42, PFD), (.17, .45, PAG), (-.17, .45, PAD)]
    for (px, py, tag) in pts:
        el += [("CAPSULE", (px * .8, py, 1.0), .1, (px, py + (.06 if py > 0 else 0), .62)), ("CAPSULE", (px, py + (.06 if py > 0 else 0), .62), .045, (px, py, .08))]
    def couleur(co):
        ventre = lisse(1.08, .94, co.z) * lisse(.5, .9, co.z)
        c = melange(ROUX, CLAIR, max(ventre, lisse(.6, .7, co.y) * lisse(1.15, 1.3, co.z) * 0))
        c = melange(c, ROUX2, lisse(1.38, 1.46, co.z) * lisse(-.5, -.3, co.y))   # dos plus sombre
        if co.y > .62: c = CLAIR
        if co.y < -1.05: c = melange(c, NEZ, lisse(-1.05, -1.1, co.y))
        if co.z < .6: c = melange(c, ROUX2, .5)
        return fois(c, grain(co, 16, .06))
    P = Animal("A_cerf", el, couleur, etiquettes(.92, -.6, pts, .05), 3000)
    yeux(P, .085, -.94, 1.78, .028)
    for s in (-1, 1):
        oreille(P, s, (s * .1, -.8, 1.84), (s, .25, .5), .2, .09, ROUX, lin("#d8b8a0"))
        # bois courbes : une perche qui part en arrière puis remonte, trois andouillers vers l'avant
        pts_b = [Vector((s * .06, -.83, 1.86)), Vector((s * .13, -.8, 1.98)), Vector((s * .2, -.74, 2.08)), Vector((s * .24, -.66, 2.18)), Vector((s * .25, -.6, 2.3))]
        rs = [.032, .027, .023, .019, .014]
        for k in range(4): P.cyl(pts_b[k], pts_b[k + 1], rs[k], rs[k + 1], BOIS, TETE, n=8)
        P.sphere(pts_b[0], .04, fois(BOIS, .8), (1, 1, .6), TETE, sub=1)   # couronne
        for k, ln in ((1, .14), (2, .13), (3, .1)):
            p0 = pts_b[k]; P.cyl(p0, p0 + Vector((s * .02, -.1, .07)) * (ln / .12), rs[k] * .8, .004, BOIS, TETE, n=7)
    sabots(P, pts, .045, SAB)
    return P.objet({"hanche": .92, "cou": [-.6, 1.3]})

def vache():
    BLANC, TACHE, MUSEAU, SAB, CORNE = lin("#f2eee6"), lin("#3a2a22"), lin("#e8b0a0"), lin("#2a2420"), lin("#e8dcc0")
    el = [("ELLIPSOID", (0, 0, 1.02), .46, (1, 1.85, .9)), ("BALL", (0, -.5, 1.03), .42), ("BALL", (0, .55, 1.08), .42),
          ("CAPSULE", (0, -.75, 1.05), .24, (0, -.92, 1.12)), ("ELLIPSOID", (0, -1.0, 1.1), .2, (1, 1.35, 1.1)), ("BALL", (0, -1.2, 1.0), .16),
          ("BALL", (0, .4, .62), .12), ("CAPSULE", (0, .9, 1.2), .035, (0, .95, .7))]
    pts = [(.26, -.55, PFG), (-.26, -.55, PFD), (.26, .55, PAG), (-.26, .55, PAD)]
    for (px, py, _) in pts: el += [("CAPSULE", (px, py, .85), .1, (px, py, .4)), ("CAPSULE", (px, py, .4), .075, (px, py, .07))]
    def couleur(co):
        if co.y < -1.12: return MUSEAU
        if co.z < .72 and abs(co.y - .4) < .18 and abs(co.x) < .16: return MUSEAU   # pis
        n = noise.noise(Vector((co.x * 2.2, co.y * 1.6, co.z * 2.2)) + Vector((3.1, 1.7, .2)))
        c = melange(BLANC, TACHE, lisse(.05, .14, n))
        if co.z < .2: c = melange(c, SAB, .5)
        return fois(c, grain(co, 14, .05))
    P = Animal("A_vache", el, couleur, etiquettes(.8, -.75, pts, .08), 3000, .034)
    yeux(P, .13, -1.08, 1.18, .035)
    for s in (-1, 1):
        P.cyl((s * .13, -.95, 1.3), (s * .3, -.9, 1.38), .045, .03, CORNE, TETE, n=8); P.cyl((s * .3, -.9, 1.38), (s * .36, -.95, 1.5), .03, .008, CORNE, TETE, n=8)
        oreille(P, s, (s * .2, -.92, 1.22), (s, .15, -.1), .18, .1, TACHE, lin("#d8a090"))
        P.sphere((s * .06, -1.33, 1.0), .03, lin("#3a2420"), tag=TETE, sub=1)
    sabots(P, pts, .075, SAB)
    P.sphere((0, .97, .7), .06, TACHE, (1, 1, 1.4), sub=1)   # touffe de la queue
    return P.objet({"hanche": .8, "cou": [-.75, 1.15]})

objs = [mouton(), chevre(), poule(), cerf(), vache()]

# occlusion cuite dans les couleurs (le canal alpha, qui marque les parties, est gardé)
scene.render.engine = "CYCLES"; scene.cycles.device = "CPU"; scene.cycles.samples = 48
sol = bpy.data.objects.new("Sol", bpy.data.meshes.new("Sol")); scene.collection.objects.link(sol)
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=10); bm.to_mesh(sol.data); bm.free()
mat = bpy.data.materials.new("Bake"); mat.use_nodes = True
for ob in objs:
    ob.data.materials.append(mat)
    ao = ob.data.color_attributes.new("AO", "FLOAT_COLOR", "POINT"); ob.data.color_attributes.active_color = ao
    for o in scene.objects: o.select_set(False)
    ob.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")
    a = np.zeros(len(ob.data.vertices) * 4, np.float32); ao.data.foreach_get("color", a)
    c = np.zeros_like(a); ob.data.color_attributes["Col"].data.foreach_get("color", c)
    a = a.reshape(-1, 4); c = c.reshape(-1, 4); c[:, :3] *= .45 + .55 * a[:, :1]
    tg = ob.data.attributes.new("_TAG", "FLOAT", "POINT"); tg.data.foreach_set("value", c[:, 3].copy()); c[:, 3] = 1
    ob.data.color_attributes["Col"].data.foreach_set("color", c.ravel())
    ob.data.color_attributes.remove(ob.data.color_attributes["AO"]); ob.data.color_attributes.active_color = ob.data.color_attributes["Col"]
    ob.data.materials.clear()
bpy.data.objects.remove(sol)
mv = bpy.data.materials.new("Animal"); mv.use_nodes = True
ca = mv.node_tree.nodes.new("ShaderNodeVertexColor"); ca.layer_name = "Col"; mv.node_tree.links.new(ca.outputs["Color"], mv.node_tree.nodes["Principled BSDF"].inputs["Base Color"])
for ob in objs: ob.data.materials.append(mv)
for o in scene.objects: o.select_set(o in objs)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, "animaux.glb"), export_format="GLB", use_selection=True, export_extras=True, export_yup=True, export_attributes=True)

# aperçu
w = bpy.data.worlds.new("Ciel"); scene.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (.6, .7, .85, 1)
sun = bpy.data.objects.new("S", bpy.data.lights.new("S", "SUN")); scene.collection.objects.link(sun); sun.data.energy = 3.5; sun.rotation_euler = (.8, .2, -.6)
for i, ob in enumerate(objs): ob.location.x = (-4.6, -2.4, -.9, .7, 3.0)[i]; ob.rotation_euler.z = -.6
g = bpy.data.objects.new("G", bpy.data.meshes.new("G")); scene.collection.objects.link(g)
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=30); bm.to_mesh(g.data); bm.free()
mg = bpy.data.materials.new("H"); mg.use_nodes = True; mg.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (.25, .4, .15, 1); g.data.materials.append(mg)
cam = bpy.data.objects.new("C", bpy.data.cameras.new("C")); scene.collection.objects.link(cam); scene.camera = cam; cam.data.lens = 40
cam.location = (-.6, -7.2, 2.2); cam.rotation_euler = (Vector((-.6, 0, .8)) - cam.location).to_track_quat("-Z", "Y").to_euler(); cam.data.lens = 30
scene.render.resolution_x, scene.render.resolution_y = 1400, 520; scene.cycles.samples = 32
scene.render.filepath = os.path.join(OUT, "apercu_animaux.png"); bpy.ops.render.render(write_still=True)
