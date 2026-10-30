# Le jeune Viking, commun au cavalier (dragon.py) et au marcheur (pieton.py) : silhouette d'ado fine, cheveux auburn
# en mèches désordonnées avec une petite tresse, tunique verte, gilet de cuir à col de fourrure, ceinture, brassards
# et bottes fourrées. Le visage (yeux verts, sourcils, taches de rousseur, bouche) est dessiné dans le jeu sur une
# texture (matériau « RiderFace », UV de face).
import bpy, bmesh, math
import numpy as np
from mathutils import Vector

def srgb(h):
    h = h.lstrip("#"); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4 for x in c)

SKIN, TUNIC, TUNIC2, VEST = srgb("#efc09a"), srgb("#5f7a48"), srgb("#4a6038"), srgb("#5a3820")   # tunique verte, gilet de cuir
FUR, PANTS, BOOT, BELT = srgb("#6f6252"), srgb("#4a3a2c"), srgb("#4e3220"), srgb("#2e1e12")      # fourrure, pantalon, bottes
BRACER, SOLE, IRON, HAIR = srgb("#6a4428"), srgb("#2a1c12"), srgb("#8a8478"), srgb("#64301a")   # cheveux auburn

def nrm(v): v = np.array(v, float); return v / np.linalg.norm(v)

def tube(path, radii, nr=10):
    path = [np.array(p, float) for p in path]; v, f = [], []; n = len(path)
    for j, p in enumerate(path):
        t = path[min(j + 1, n - 1)] - path[max(j - 1, 0)]; t /= np.linalg.norm(t)
        ref = np.array([0, 0, 1.0]) if abs(t[2]) < .9 else np.array([1.0, 0, 0])
        x = np.cross(t, ref); x /= np.linalg.norm(x); y = np.cross(t, x)
        for k in range(nr):
            a = 2 * math.pi * k / nr; v.append(p + (x * math.cos(a) + y * math.sin(a)) * radii[j])
    for j in range(n - 1):
        for k in range(nr):
            a, b = j * nr + k, j * nr + (k + 1) % nr; f.append([a, b, b + nr, a + nr])
    for j in (0, n - 1):
        ci = len(v); v.append(path[j])
        for k in range(nr): f.append([j * nr + k, j * nr + (k + 1) % nr, ci])
    return v, f

class Maillage:
    """Sommets, faces, couleurs (et une étiquette libre par sommet, ex. l'os)."""
    def __init__(s): s.V, s.F, s.C, s.T = [], [], [], []
    def ellipsoid(s, cen, ax, ay, az, col, nu=16, nv=10, tag=None):
        o = len(s.V)
        for j in range(nv + 1):
            th = math.pi * j / nv
            for i in range(nu):
                ph = 2 * math.pi * i / nu
                s.V.append(cen + ax * math.sin(th) * math.cos(ph) + ay * math.sin(th) * math.sin(ph) + az * math.cos(th)); s.C.append(col); s.T.append(tag)
        for j in range(nv):
            for i in range(nu):
                a, b = o + j * nu + i, o + j * nu + (i + 1) % nu; s.F.append([a, a + nu, b + nu, b])   # normales vers l'extérieur
    def tube(s, pts, rr, col, nr=8, tag=None):
        v, f = tube(pts, rr, nr); o = len(s.V)
        s.V += [np.array(p) for p in v]; s.F += [[i + o for i in fc] for fc in f]; s.C += [col] * len(v); s.T += [tag] * len(v)
    def skin(s, scene, nodes, radii, cols, edges, tags=None, sub=2):
        """Squelette de sommets habillé par le modificateur Skin, lissé ; couleur et étiquette du nœud le plus proche."""
        me_ = bpy.data.meshes.new("tmp"); me_.from_pydata([tuple(p) for p in nodes], edges, []); me_.update()
        ob = bpy.data.objects.new("tmp", me_); scene.collection.objects.link(ob)
        bm = bmesh.new(); bm.from_mesh(me_); lay = bm.verts.layers.skin.verify()
        for v in bm.verts: v[lay].radius = (radii[v.index], radii[v.index])
        bm.verts.ensure_lookup_table(); bm.verts[0][lay].use_root = True; bm.to_mesh(me_); bm.free()
        mk = ob.modifiers.new("skin", "SKIN"); mk.use_smooth_shade = True; mk.branch_smoothing = .3
        sd = ob.modifiers.new("sub", "SUBSURF"); sd.levels = sub
        dg = bpy.context.evaluated_depsgraph_get(); m2 = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
        nn = np.array(nodes); o = len(s.V)
        for v in m2.vertices:
            p = np.array(v.co); j = int(np.argmin(np.linalg.norm(nn - p, axis=1)))
            s.V.append(p); s.C.append(cols[j]); s.T.append(tags[j] if tags else None)
        s.F.extend([[i + o for i in p.vertices] for p in m2.polygons])
        bpy.data.objects.remove(ob); bpy.data.meshes.remove(m2)

def fourrure(M, boucle, r, tag=None, graine=1):
    """Col (ou revers) de fourrure : un boudin gris-brun le long d'une boucle fermée, hérissé de petites mèches de poil."""
    rng = np.random.default_rng(graine); P = [np.array(p, float) for p in boucle]; n = len(P)
    ctr = sum(P) / n
    M.tube(P + [P[0]], [r] * (n + 1), FUR, 12, tag)
    for i in range(n):
        a, b = P[i], P[(i + 1) % n]
        for k in range(6):
            c = a + (b - a) * (k + rng.random()) / 6
            out = nrm(c - ctr); d = nrm(out * .8 + np.array([0, 0, .7]) + rng.normal(0, .35, 3))
            base = c + d * r * .55; ln = r * (.9 + .7 * rng.random())
            col = tuple(x * (.8 + .35 * rng.random()) for x in FUR)
            M.tube([base, base + d * ln * .5, base + d * ln], [r * .32, r * .2, r * .02], col, 6, tag)

def main(M, wrist, fwd, up, side_sign, pose, tag=None):
    """Main à quatre doigts et un pouce : « poing » (fermé) ou « plat » (doigts tendus), brassard de cuir."""
    f = nrm(fwd); u = nrm(np.array(up, float) - f * (np.array(up, float) @ f)); s = np.cross(f, u) * side_sign
    c = wrist + f * .05
    M.ellipsoid(c, s * .042, f * .048, u * .024, SKIN, 14, 10, tag)
    for k, off in enumerate((-.027, -.009, .009, .027)):
        b = c + f * .038 + s * off + u * .004
        ln = (.034, .04, .038, .03)[k]
        if pose == "poing": pts = [b, b + f * ln * .7 + u * .002, b + f * ln * .85 - u * .03, b + f * ln * .35 - u * .045]
        else: pts = [b, b + f * ln * .55, b + f * ln * 1.05, b + f * ln * 1.5 - u * .006]
        M.tube(pts, [.0125, .012, .0115, .0105], SKIN, 8, tag); M.ellipsoid(pts[-1], s * .0105, f * .0105, u * .0105, SKIN, 8, 6, tag)
    tb = c - f * .012 + s * .036
    tp = [tb, tb + s * .02 + f * .02 - u * .012, tb + f * .045 - u * .03] if pose == "poing" else [tb, tb + s * .02 + f * .015, tb + s * .025 + f * .04]
    M.tube(tp, [.014, .013, .012], SKIN, 8, tag); M.ellipsoid(tp[-1], s * .012, f * .012, u * .012, SKIN, 8, 6, tag)
    M.tube([wrist - f * .07, wrist - f * .03, wrist + f * .005], [.05, .052, .05], BRACER, 14, tag)   # brassard de cuir
    return c, f, u

def forme(d, R):
    """Point du crâne dans la direction d : tête un peu haute, mâchoire fine, menton en avant, arrière du crâne rond."""
    p = d * R * np.array([.93, .98, 1.1])
    if d[1] > 0: p[1] *= 1.06
    if d[2] < 0:
        p[0] *= 1 - .3 * (-d[2]) ** 2
        p[1] -= .1 * R * (-d[2]) * max(0, -d[1])
    if d[1] < -.5:   # nez sculpté dans le crâne : arête fine, bout un peu retroussé, petites ailes
        u, w = d[0], d[2]
        if -.32 < w < .14:
            t = min(1, max(0, (.12 - w) / .32))                      # 0 en haut de l'arête, 1 au bout
            haut = min(1, max(0, (.14 - w) / .1))
            prof = (.22 + .78 * t ** 1.6) * haut if w > -.2 else math.exp(-((w + .2) / .045) ** 2)
            sx = .055 + .05 * t
            h = prof * math.exp(-(u / sx) ** 2) + .32 * math.exp(-((abs(u) - .1) / .04) ** 2 - ((w + .235) / .035) ** 2)
            f = min(1, (-d[1] - .5) / .3)
            p[1] -= .2 * R * h * f
            p[2] += .025 * R * h * f * t                                  # bout légèrement relevé
    return p

def tete(piv):
    """Tête du jeune Viking : crâne avec le nez sculpté (UV de face pour le visage dessiné), oreilles, cheveux auburn en mèches
    désordonnées, frange de côté, petite tresse. Renvoie (Maillage, uv, nb faces du visage)."""
    H = Maillage(); rng = np.random.default_rng(3)
    R = .148; hc = piv + np.array([0, -.03, .165])
    ez = np.array([0, 0, 1.0]); ey = np.array([0, 1.0, 0])
    nu, nv = 110, 76; uv = []          # assez fin pour sculpter le nez
    for j in range(nv + 1):
        th = math.pi * j / nv
        for i in range(nu + 1):
            ph = 2 * math.pi * i / nu - math.pi / 2           # couture à l'arrière
            d = np.array([math.sin(th) * math.cos(ph), math.sin(th) * math.sin(ph), math.cos(th)])
            p = forme(d, R)
            H.V.append(hc + p); H.C.append(SKIN); H.T.append("Head")
            uv.append((.5 + p[0] / (2.2 * R), .5 + p[2] / (2.2 * R * 1.1)))
    for j in range(nv):
        for i in range(nu):
            a, b = j * (nu + 1) + i, j * (nu + 1) + i + 1; H.F.append([a, a + nu + 1, b + nu + 1, b])
    nface = len(H.F)
    # cou attaché à la tête : il descend jusque dans le col, la tête ne flotte plus
    H.tube([piv + np.array([0, .012, -.085]), piv + np.array([0, .0, .02]), hc + np.array([0, .02, -.06])], [.054, .052, .05], SKIN, 16, "Head")
    def sur(d, lift=0.0):
        d = nrm(d); p = forme(d, R); return hc + p + d * lift, d
    for sx in (1, -1):   # oreilles
        po, no = sur((sx, .1, -.02), -.006); H.ellipsoid(po, no * .02, ey * .03, ez * .042, SKIN, 12, 8, "Head")
    # calotte de cheveux : haut et arrière, front dégagé, tempes plus basses
    o = len(H.V); keep = []; nu2, nv2 = 36, 22
    for j in range(nv2 + 1):
        th = math.pi * j / nv2
        for i in range(nu2):
            ph = 2 * math.pi * i / nu2
            d = np.array([math.sin(th) * math.cos(ph), math.sin(th) * math.sin(ph), math.cos(th)])
            H.V.append(hc + forme(d, R) * 1.05); H.C.append(HAIR); H.T.append("Head")
            keep.append(d[2] > .5 - .32 * abs(d[0]) - 1.05 * max(0, d[1]) ** .8)
    for j in range(nv2):
        for i in range(nu2):
            a, b = j * nu2 + i, j * nu2 + (i + 1) % nu2
            if all(keep[k] for k in (a, b, b + nu2, a + nu2)): H.F.append([o + a, o + a + nu2, o + b + nu2, o + b])
    def meche(base, tip, ln, r, lift=-.012, cols=None):
        t = nrm(tip); p0, n0 = sur(base, lift)
        mid = p0 + (n0 * .35 + t * .65) * ln * .4
        pts = [p0, mid, mid + t * ln * .38, p0 + (n0 * .18 + t * .82) * ln]
        H.tube(pts, [r, r * .8, r * .48, .004], HAIR, 7, "Head")
    # mèches tout autour (arrière et côtés), qui tombent en désordre jusqu'à la nuque
    for el in (.62, .32, .02):
        for k in range(14):
            ph = -2.4 + 4.8 * k / 13 + rng.uniform(-.12, .12)       # 0 = arrière (+y) ; ±π = devant
            d = np.array([math.sin(ph) * math.cos(el), math.cos(ph) * math.cos(el), math.sin(el)])
            if el < .1 and abs(ph) > 1.7: continue                 # rien devant les oreilles en bas
            out = np.array([d[0], d[1], 0]); out = out / (np.linalg.norm(out) + 1e-6)
            tip = out * (.28 + .12 * rng.random()) + np.array([0, 0, -1]) * (.9 + .2 * rng.random()) + rng.normal(0, .08, 3)
            meche(d, tip, (.11 if el > .5 else .13 if el > .2 else .1) + .03 * rng.random(), .032 + .008 * rng.random())
    # dessus en désordre : mèches couchées vers l'arrière et les côtés
    for base, tip in (((0, .1, 1), (.15, .9, -.3)), ((.25, -.2, .95), (.8, .3, -.4)), ((-.3, 0, .95), (-.8, .4, -.4)), ((.05, .45, .9), (0, 1, -.5))):
        meche(base, tip, .1, .04, -.006)
    # frange balayée sur le côté (vers la droite du personnage)
    for bx, ln in ((-.4, .1), (-.2, .1), (0, .095), (.2, .085), (.4, .075)):
        meche((bx, -.6, .76), (.85, -.4, -.38), ln, .03, -.004)
    # petite tresse derrière l'oreille gauche
    tb, nb = sur((.86, .32, -.12), .0)
    for k in range(6):
        c = tb + np.array([.008 * k, .012 * k, -.026 * k]) + nb * .012
        H.ellipsoid(c, np.array([.016, 0, 0]), np.array([0, .016, 0]), ez * .017, HAIR, 8, 6, "Head")
    H.ellipsoid(tb + np.array([.05, .075, -.165]) + nb * .012, np.array([.012, 0, 0]), np.array([0, .012, 0]), ez * .012, BELT, 8, 6, "Head")
    return H, uv + [(0, 0)] * (len(H.V) - len(uv)), nface

def materiaux():
    mat = bpy.data.materials.get("Rider")
    if not mat:
        mat = bpy.data.materials.new("Rider"); mat.use_nodes = True; nt = mat.node_tree
        bsdf = nt.nodes["Principled BSDF"]; ca = nt.nodes.new("ShaderNodeVertexColor"); ca.layer_name = "Col"
        nt.links.new(ca.outputs["Color"], bsdf.inputs["Base Color"]); bsdf.inputs["Roughness"].default_value = .7
    matf = bpy.data.materials.get("RiderFace")
    if not matf:
        matf = bpy.data.materials.new("RiderFace"); matf.use_nodes = True
        matf.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*SKIN, 1)
    return mat, matf

def objet(scene, name, M, loc, uv=None, nface=0):
    """Crée l'objet Blender (couleurs par sommet « Col », UV de face pour les nface premières faces)."""
    mat, matf = materiaux()
    mm = bpy.data.meshes.new(name); mm.from_pydata([tuple(np.array(p) - loc) for p in M.V], [], M.F); mm.update()
    for p in mm.polygons: p.use_smooth = True
    at = mm.color_attributes.new("Col", "FLOAT_COLOR", "POINT"); at.data.foreach_set("color", np.array([(*c, 1) for c in M.C], np.float32).ravel())
    mm.materials.append(mat)
    if uv is not None:
        mm.materials.append(matf); ul = mm.uv_layers.new(name="UVMap")
        for p in mm.polygons:
            if p.index < nface: p.material_index = 1
            for li in p.loop_indices: ul.data[li].uv = uv[mm.loops[li].vertex_index]
    o = bpy.data.objects.new(name, mm); scene.collection.objects.link(o); o.location = Vector(loc); return o
