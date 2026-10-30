# Le petit héros de manga (style Toriyama, années 80), commun au cavalier (dragon.py) et au marcheur (pieton.py).
# Grosse tête ronde, cheveux roux clair en grosses mèches pointues, tunique bleue, ceinture blanche nouée,
# bracelets rouges. Le visage (yeux, bouche) est dessiné dans le jeu sur une texture (matériau « RiderFace », UV de face).
import bpy, bmesh, math
import numpy as np
from mathutils import Vector

def srgb(h):
    h = h.lstrip("#"); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4 for x in c)

SKIN, GI, SASH, UNDER = srgb("#f8c9a0"), srgb("#2f6fd0"), srgb("#f6f3ea"), srgb("#183a7a")   # tunique bleue
BAND, SHOE, SOLE, HAIR = srgb("#d92f2a"), srgb("#6b3f22"), srgb("#e9e4d6"), srgb("#d0703a")   # cheveux roux clair

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

def main(M, wrist, fwd, up, side_sign, pose, tag=None):
    """Main à quatre doigts et un pouce : « poing » (fermé) ou « plat » (doigts tendus), bracelet rouge."""
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
    M.tube([wrist - f * .035, wrist + f * .005], [.05, .05], BAND, 14, tag)
    return c, f, u

def tete(piv):
    """Tête : crâne (UV de face pour le visage dessiné), oreilles, cheveux en mèches, nez. Renvoie (Maillage, uv, nb faces du visage)."""
    H = Maillage()
    hc = piv + np.array([0, -.035, .21]); R = .205
    ez = np.array([0, 0, 1.0]); ey = np.array([0, 1.0, 0])
    nu, nv = 40, 26; uv = []
    for j in range(nv + 1):
        th = math.pi * j / nv
        for i in range(nu + 1):
            ph = 2 * math.pi * i / nu - math.pi / 2           # couture à l'arrière
            d = np.array([math.sin(th) * math.cos(ph), math.sin(th) * math.sin(ph), math.cos(th)])
            p = d * R * np.array([1.0, .97, 1.0])
            if d[2] < 0: p[2] *= 1.0 + .1 * max(0, -d[1]); p[0] *= 1 + .05 * (-d[2]) - .2 * (-d[2]) ** 3   # joues et menton
            H.V.append(hc + p); H.C.append(SKIN); H.T.append("Head")
            uv.append((.5 + p[0] / (2.2 * R), .5 + p[2] / (2.2 * R)))
    for j in range(nv):
        for i in range(nu):
            a, b = j * (nu + 1) + i, j * (nu + 1) + i + 1; H.F.append([a, a + nu + 1, b + nu + 1, b])
    nface = len(H.F)
    def sur(d, lift=0.0):
        d = nrm(d); return hc + d * (R * .97 + lift), d
    for sx in (1, -1):
        po, no = sur((sx, .08, -.12), -.012); H.ellipsoid(po, no * .028, ey * .045, ez * .06, SKIN, 12, 8, "Head")
    o = len(H.V); keep = []; nu2, nv2 = 32, 20
    for j in range(nv2 + 1):
        th = math.pi * j / nv2
        for i in range(nu2):
            ph = 2 * math.pi * i / nu2
            d = np.array([math.sin(th) * math.cos(ph), math.sin(th) * math.sin(ph), math.cos(th)])
            H.V.append(hc + d * R * 1.05); H.C.append(HAIR); H.T.append("Head")
            keep.append(d[2] > .42 - .6 * max(0, d[1]) - .25 * abs(d[0]) or (d[1] > .2 and d[2] > -.6))
    for j in range(nv2):
        for i in range(nu2):
            a, b = j * nu2 + i, j * nu2 + (i + 1) % nu2
            if all(keep[k] for k in (a, b, b + nu2, a + nu2)): H.F.append([o + a, o + a + nu2, o + b + nu2, o + b])
    SPIKES = [((0, .2, 1), (0, .3, 1), .36, .1), ((.42, .2, .88), (.72, .35, .62), .36, .1), ((.75, .25, .5), (1, .3, .2), .34, .095),
              ((.3, .7, .6), (.45, 1, .35), .34, .1), ((0, .8, .55), (0, 1, .3), .34, .105), ((.6, .7, .1), (.75, .85, -.3), .3, .095),
              ((.2, .97, -.15), (.2, 1, -.55), .26, .09), ((.88, .25, -.05), (1, .25, -.55), .22, .08), ((.25, -.2, .95), (.25, -.05, 1), .3, .095),
              ((.62, -.12, .75), (.85, 0, .55), .28, .09), ((.5, .45, -.4), (.6, .6, -.8), .2, .075)]
    BANGS = [((.05, -.7, .7), (.0, -.6, -.3), .2, .075), ((.3, -.66, .68), (.35, -.55, -.35), .19, .07), ((.55, -.5, .66), (.75, -.4, -.25), .17, .065),
             ((-.2, -.66, .7), (-.3, -.5, -.2), .17, .07), ((-.48, -.52, .68), (-.7, -.4, -.3), .18, .065)]
    for base, tip, ln, r in SPIKES:
        for sx in ((1, -1) if base[0] != 0 else (1,)):
            b = np.array(base, float) * np.array([sx, 1, 1]); t = nrm(np.array(tip, float) * np.array([sx, 1, 1]))
            p0, n0 = sur(b, -.03); mid = p0 + (n0 * .5 + t * .5) * ln * .45
            H.tube([p0, mid, mid + t * ln * .35, p0 + (n0 * .3 + t * .7) * ln + n0 * .02], [r, r * .78, r * .42, .004], HAIR, 8, "Head")
    for base, tip, ln, r in BANGS:
        t = nrm(tip); p0, n0 = sur(base, -.02); mid = p0 + (n0 * .45 + t * .55) * ln * .4
        H.tube([p0, mid, mid + t * ln * .35, p0 + (n0 * .25 + t * .75) * ln + n0 * .03], [r, r * .75, r * .4, .004], HAIR, 7, "Head")
    pn, nn_ = sur((0, -1, -.22), -.004); H.ellipsoid(pn, np.array([.016, 0, 0]), nn_ * .013, ez * .014, SKIN, 10, 6, "Head")
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
