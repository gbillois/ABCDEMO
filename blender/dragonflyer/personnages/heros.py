# Le jeune Viking à pied (héros de DragonFlyer), refait de zéro à partir du kit (étape 3 de la méthode) :
# cheveux auburn en grosses mèches, grands yeux verts, tunique verte à galon doré, gilet de cuir bordé de fourrure,
# ceinture et bourse, brassards, bottes fourrées. Même squelette que les villageois et que animations.glb (../squelette.py).
# Lancer :  blender -b -P heros.py -- <dossier>        Produit : <dossier>/pieton.glb et <dossier>/heros.txt (faces, pièces)
import bpy, math, os, sys
import numpy as np
from mathutils import Vector
ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ICI); sys.path.insert(0, os.path.dirname(ICI))
import materiaux as MAT, kit as K
from kit import A, nrm, lisse
from squelette import BONES

# ---------------------------------------------------------------- tronc : sections (z, demi-largeur, demi-profondeur, décalage avant/arrière)
TRONC = [(.47, .0, .0, .0), (.475, .1, .08, .0), (.5, .15, .115, .0), (.56, .162, .122, .0), (.64, .152, .116, -.004),
         (.72, .156, .118, -.006), (.8, .172, .126, -.006), (.88, .192, .13, -.002), (.935, .205, .118, .006), (.975, .17, .1, .01),
         (1.005, .1, .075, .01), (1.02, .0, .0, .01)]
def tronc_rayons(z):
    Z = [s[0] for s in TRONC]
    return tuple(float(np.interp(z, Z, [s[i] for s in TRONC])) for i in (1, 2, 3))
EXPO = 2.5
def tronc_point(a, z, off=0.0):
    """Point de la surface du tronc à l'angle a (0 = gauche +x, -π/2 = devant) et à la hauteur z, décalé de off."""
    rx, ry, cy = tronc_rayons(z); c, s = math.cos(a), math.sin(a)
    cc, ss = math.copysign(abs(c) ** (2 / EXPO), c), math.copysign(abs(s) ** (2 / EXPO), s)
    p = A([rx * cc, cy + ry * ss, z]); n = nrm(A([c / max(rx, 1e-3), s / max(ry, 1e-3), 0]))
    return p + n * off, n

def poids_moitie(p, sx):
    """Moitié de jupe : les hanches en haut ; vers l'ourlet, la cuisse du même côté (90 % devant, 60 % sur le côté,
    35 % derrière)."""
    x, y, z = p; h = float(np.clip((.63 - z) / (.63 - .49), 0, 1)) ** 1.2
    a = math.atan2(y, abs(x)); k = (.625 - .275 * math.sin(a)) * h
    return {"Hips": 1 - k, ("Thigh.L" if sx > 0 else "Thigh.R"): k} if k > 1e-3 else {"Hips": 1.0}

def construire():
    M = K.Maillage(); C = MAT.COUL
    # ---- tronc (la tunique verte), cou
    chemin = [A([0, s[3], s[0]]) for s in TRONC]
    V, F, _ = K.tube(chemin, [s[1] for s in TRONC], 24, ref=(1, 0, 0), aplat=[s[2] / s[1] if s[1] else 1 for s in TRONC], expo=EXPO)
    M.ajouter(V, F, MAT.teinte("tunique", V), [K.poids_tronc(v[2]) for v in V], "tronc")
    V, F, _ = K.tube([A([0, .01, .95]), A([0, .0, 1.04]), A([0, -.01, 1.12])], [.066, .064, .06], 12)
    M.ajouter(V, F, MAT.teinte("peau", V), [K.poids_tronc(v[2]) for v in V], "cou")
    # ---- gilet de cuir ouvert devant (en V), épais
    beta = lambda z: .34 + .4 * lisse(.62, .99, z)
    def gilet(u, v):
        z = .6 + .39 * v; b = beta(z); a = -math.pi / 2 + b + u * (2 * math.pi - 2 * b)
        return tronc_point(a, z, .016 if z < .97 else .016 - (z - .97) * .3)
    V, F = K.coque(gilet, 28, 8, .009)
    M.ajouter(V, F, MAT.teinte("cuir", V), [K.poids_tronc(v[2]) for v in V], "gilet")
    # ---- bord de fourrure du gilet : large au col (châle), fin vers le bas, bord intérieur irrégulier
    for sx in (1, -1):
        def revers(u, v, sx=sx):
            z = .74 + .25 * v; b = beta(z); a0 = -math.pi / 2 + (b if sx > 0 else -b)
            larg = (.014 + .07 * lisse(.74, .99, z) ** 1.6) * (1 + .2 * math.sin(z * 71 + sx * 1.3) + .1 * math.sin(z * 157 + sx))
            rx, ry, _ = tronc_rayons(z); r = (rx + ry) / 2
            bord = .012 * (1 + .6 * math.sin(z * 93 + 2 * sx))                                 # dépasse dans l'ouverture, en vagues
            a = a0 + sx * (u * (larg + bord) - bord) / r
            bombe = math.sin(math.pi * min(1, max(0, .08 + .84 * u))) ** .6
            return tronc_point(a, z, .018 + .02 * bombe * (1 + .25 * math.sin(z * 120 + u * 7)))
        V, F = K.coque(revers, 4, 12, .012)
        M.ajouter(V, F, MAT.teinte("fourrure", V, .45 + .35 * MAT.bruit(V, 70), 20 + sx), [K.poids_tronc(v[2]) for v in V], "fourrure")
    # ---- col de fourrure : deux rangs bosselés, le second plus large et plus bas, qui retombe sur les épaules
    V, F, T = K.anneau(A([0, .01, 1.005]), .108, .094, .04, .036, 30, 6, bosses=.18, graine=4)
    M.ajouter(V, F, MAT.teinte("fourrure", V, .35 + .6 * T, 4), "Chest", "fourrure")
    V, F, T = K.anneau(A([0, .015, .975]), .15, .125, .036, .03, 34, 6, bosses=.24, graine=5)
    M.ajouter(V, F, MAT.teinte("fourrure", V, .25 + .6 * T, 5), "Chest", "fourrure")
    # ---- bas de la tunique en deux moitiés (gauche, droite), fendues devant et derrière à partir de mi-hauteur :
    # chaque moitié ne suit que SA cuisse (jamais un partage gauche/droite qui ferait un dôme entre les jambes)
    def moitie(sx):
        def f(u, v):
            z = .67 - .18 * v; k = lisse(.67, .49, z); fente = lisse(.61, .53, z)
            a0, a1 = -math.pi / 2 + .02 + .1 * fente, math.pi / 2 - .02 - .1 * fente       # de devant à derrière, côté +x
            a = a0 + (a1 - a0) * u
            if sx < 0: a = math.pi - a
            rx, ry, cy = tronc_rayons(min(z, .66)); off = .003 * (sx > 0) * (1 - fente)     # recouvrement en haut sans scintillement
            rx, ry = rx + .012 + off + .05 * k ** 1.2, ry + .012 + off + .032 * k ** 1.2
            vague = 1 + .03 * k * math.sin(6 * a + .5)
            return A([rx * vague * math.cos(a), cy + ry * vague * math.sin(a), z]), nrm(A([math.cos(a) / rx, math.sin(a) / ry, .25 * k]))
        return f
    for sx in (1, -1):
        V, F = K.coque(moitie(sx), 16, 6, .008)
        M.ajouter(V, F, MAT.teinte("tunique", V), [poids_moitie(v, sx) for v in V], "jupe")
        V, F = K.coque(lambda u, v, sx=sx: (lambda p, n: (p + n * .003, n))(*moitie(sx)(u, .92 + .08 * v)), 16, 1, .012)   # ourlet roulé
        M.ajouter(V, F, MAT.teinte("tunique_fonce", V), [poids_moitie(v, sx) for v in V], "jupe")
    # ---- ceinture, boucle, bourse
    rx, ry, cy = tronc_rayons(.655)
    V, F, _ = K.anneau(A([0, cy, .655]), rx + .02, ry + .02, .012, .024, 30, 4)
    M.ajouter(V, F, MAT.teinte("cuir_fonce", V), "Hips", "ceinture")
    V, F = K.ellipsoide(A([0, cy - ry - .036, .655]), .03, .009, .027, 10, 5, e=.6)
    M.ajouter(V, F, MAT.teinte("laiton", V), "Hips", "ceinture")
    V, F = K.ellipsoide(A([0, cy - ry - .042, .655]), .016, .006, .014, 8, 4, e=.6)
    M.ajouter(V, F, MAT.teinte("cuir_fonce", V), "Hips", "ceinture")
    bx, by = .165, -.07
    V, F = K.ellipsoide(A([bx, by, .6]), .042, .03, .05, 10, 6, e=.8); M.ajouter(V, F, MAT.teinte("cuir", V), "Hips", "bourse")
    V, F = K.ellipsoide(A([bx + .004, by - .012, .635]), .044, .024, .02, 10, 5, e=.8); M.ajouter(V, F, MAT.teinte("cuir_fonce", V), "Hips", "bourse")
    # ---- bassin (pantalon sous la jupe)
    V, F = K.ellipsoide(A([0, 0, .515]), .17, .118, .075, 14, 7); M.ajouter(V, F, MAT.teinte("pantalon", V), "Hips", "jambes")
    # ---- jambes et bottes (la cheville est la demi-sphère du bas de la tige : une seule rotule)
    for s, sx in (("L", 1), ("R", -1)):
        H, Kn, Ak, To = (A(BONES[f"Thigh.{s}"][0]), A(BONES[f"Shin.{s}"][0]), A(BONES[f"Foot.{s}"][0]), A(BONES[f"Foot.{s}"][1]))
        V, F, _ = K.capsule(H, Kn, .084, .072, 12, 3, 3); M.ajouter(V, F, MAT.teinte("pantalon", V), f"Thigh.{s}", "jambes")
        V, F, _ = K.capsule(Kn, Ak + A([0, 0, .1]), .07, .064, 12, 2, 3); M.ajouter(V, F, MAT.teinte("pantalon", V), f"Shin.{s}", "jambes")
        haut = A([Ak[0], -.008, .25])
        V, F, _ = K.capsule(Ak, haut, .072, .078, 12, 2, 3); M.ajouter(V, F, MAT.teinte("botte", V), f"Shin.{s}", "bottes")
        V, F, T = K.anneau(haut + A([0, 0, -.004]), .082, .082, .022, .028, 20, 5, bosses=.28, graine=10 + sx)
        M.ajouter(V, F, MAT.teinte("fourrure", V, T, 11), f"Shin.{s}", "bottes")
        releve = lambda V: [v + A([0, 0, .14 * max(0, -.1 - v[1]) ** 1.3 * 3]) for v in V]   # bout un peu relevé
        V, F = K.superquadrique(A([Ak[0], -.05, .06]), (A([.07, 0, 0]), A([0, .128, 0]), A([0, 0, .058])), 12, 7, .75)
        V = releve(V); M.ajouter(V, F, MAT.teinte("botte", V), f"Foot.{s}", "bottes")
        V, F = K.superquadrique(A([Ak[0], -.05, .017]), (A([.074, 0, 0]), A([0, .132, 0]), A([0, 0, .017])), 12, 4, .45)
        V = releve(V); M.ajouter(V, F, MAT.teinte("semelle", V), f"Foot.{s}", "bottes")
        V, F, _ = K.bague(A([Ak[0], -.065, .085]), A([0, .45, 1]), .062, .007, .009, 12, 3)   # lanière sur le cou-de-pied
        M.ajouter(V, F, MAT.teinte("cuir_fonce", V), f"Foot.{s}", "bottes")
    # ---- bras, aisselles, brassards, mains
    for s, sx in (("L", 1), ("R", -1)):
        S, E, Wr, Ht = (A(BONES[f"UpperArm.{s}"][0]), A(BONES[f"LowerArm.{s}"][0]), A(BONES[f"Hand.{s}"][0]), A(BONES[f"Hand.{s}"][1]))
        V, F, _ = K.capsule(S, E, .07, .06, 12, 3, 3); M.ajouter(V, F, MAT.teinte("tunique", V), f"UpperArm.{s}", "bras")
        # aisselle : un coussin de tissu partagé entre la poitrine et le bras, qui garde le volume bras levé
        V, F = K.ellipsoide(A([sx * .215, .0, .875]), .045, .07, .06, 10, 6)
        M.ajouter(V, F, MAT.teinte("tunique", V), {"Chest": .5, f"UpperArm.{s}": .5}, "bras")
        V, F, T = K.bague(E + (S - E) * .2, S - E, .063, .012, .02, 14, 4); M.ajouter(V, F, MAT.teinte("tunique_fonce", V), f"UpperArm.{s}", "bras")
        V, F, _ = K.capsule(E, Wr, .055, .047, 10, 3, 3); M.ajouter(V, F, MAT.teinte("peau", V), f"LowerArm.{s}", "bras")
        a, b = E + (Wr - E) * .42, Wr + (Wr - E) * .02
        V, F, _ = K.capsule(a, b, .059, .054, 12, 2, 2); M.ajouter(V, F, MAT.teinte("cuir", V), f"LowerArm.{s}", "brassards")
        for u in (.6, .88):
            V, F, _ = K.bague(E + (Wr - E) * u, Wr - E, .058 - .005 * u, .006, .005, 12, 3)
            M.ajouter(V, F, MAT.teinte("cuir_fonce", V), f"LowerArm.{s}", "brassards")
        K.main(M, Wr, Ht, sx, f"Hand.{s}", taille=1.36, repli=.55 if sx > 0 else 1.15)   # main droite en poing (tient l'épée)
    # ---- tête
    T = K.Tete(A([0, -.02, 1.255]), .205)
    T.crane(M); K.visage(T, M); K.cheveux(T, M)
    return M

def armature(scene):
    arm_d = bpy.data.armatures.new("PietonRig"); rig = bpy.data.objects.new("PietonRig", arm_d)
    scene.collection.objects.link(rig); bpy.context.view_layer.objects.active = rig; rig.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT"); eb = {}
    for n, (h, t, par) in BONES.items():
        b = arm_d.edit_bones.new(n); b.head = Vector(h); b.tail = Vector(t); eb[n] = b
    for n, (h, t, par) in BONES.items():
        if par: eb[n].parent = eb[par]
    bpy.ops.object.mode_set(mode="OBJECT"); return rig

def objet(scene, M, rig, nom="Pieton"):
    me = bpy.data.meshes.new(nom); me.from_pydata([tuple(v) for v in M.V], [], M.F); me.validate(); me.update()
    for p in me.polygons: p.use_smooth = True
    at = me.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
    at.data.foreach_set("color", np.array([(*np.clip(c, 0, 1), 1) for c in M.C], np.float32).ravel())
    me.materials.append(MAT.materiau_blender())
    ob = bpy.data.objects.new(nom, me); scene.collection.objects.link(ob)
    gr = {n: ob.vertex_groups.new(name=n) for n in BONES}
    for i, w in enumerate(M.W):
        w = {k: v for k, v in w.items() if v > .01}; t = sum(w.values())
        for n, x in w.items(): gr[n].add([i], x / t, "REPLACE")
    ob.parent = rig; m = ob.modifiers.new("rig", "ARMATURE"); m.object = rig
    return ob

def ombre_cuite(scene, ob, force=.38):
    """Occlusion ambiante cuite dans les couleurs des sommets (plis, dessous des bras, col, entre les jambes)."""
    eng = scene.render.engine; scene.render.engine = "CYCLES"; scene.cycles.device = "CPU"; scene.cycles.samples = 48
    w = bpy.data.worlds.new("AO"); scene.world = w; w.light_settings.distance = .18
    import bmesh
    sol = bpy.data.objects.new("SolAO", bpy.data.meshes.new("SolAO")); scene.collection.objects.link(sol)
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=3); bm.to_mesh(sol.data); bm.free()
    ao = ob.data.color_attributes.new("AO", "FLOAT_COLOR", "POINT"); ob.data.color_attributes.active_color = ao
    for o in scene.objects: o.select_set(False)
    ob.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")
    a = np.zeros(len(ob.data.vertices) * 4, np.float32); ao.data.foreach_get("color", a)
    c = np.zeros_like(a); ob.data.color_attributes["Col"].data.foreach_get("color", c)
    a, c = a.reshape(-1, 4), c.reshape(-1, 4); c[:, :3] *= (1 - force) + force * a[:, :1] ** .8
    ob.data.color_attributes["Col"].data.foreach_set("color", c.ravel())
    ob.data.color_attributes.remove(ob.data.color_attributes["AO"]); ob.data.color_attributes.active_color = ob.data.color_attributes["Col"]
    bpy.data.objects.remove(sol); scene.render.engine = eng

if __name__ == "__main__":
    OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "/tmp/heros"
    os.makedirs(OUT, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True); scene = bpy.context.scene
    M = construire()
    rig = armature(scene); ob = objet(scene, M, rig)
    ombre_cuite(scene, ob)
    with open(os.path.join(OUT, "heros.txt"), "w") as f:
        f.write(f"triangles {M.triangles()}  sommets {len(M.V)}\n")
        for k, v in sorted(M.N.items(), key=lambda x: -x[1]): f.write(f"  {k:12s} {v} faces\n")
    print(open(os.path.join(OUT, "heros.txt")).read())
    for o in scene.objects: o.select_set(o in (rig, ob))
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, "pieton.glb"), export_format="GLB", use_selection=True, export_skins=True,
                              export_animations=False, export_morph=False, export_yup=True, export_apply=False)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "heros.blend"))
