# DragonFlyer : le dragon et son cavalier, modélisés, riggés et texturés dans Blender (4.2 LTS).
# Tout est fabriqué ici par le code (aucun modèle ni image téléchargés) :
#   - corps, cou, tête, mâchoire et queue : surfaces « loftées » le long d'une colonne vertébrale ;
#   - pattes et bras des ailes : modificateur Skin (squelette de sommets), lissé ;
#   - membranes des ailes : carreaux de Coons tendus entre les doigts ;
#   - cornes, piques du dos, dents, griffes, yeux, selle et sangles ;
#   - squelette (armature) et poids calculés le long des chaînes d'os ;
#   - textures d'écailles procédurales (nœuds Cycles) cuites dans un atlas couleur + relief + occlusion.
# Lancer :  blender -b -P dragon.py -- <dossier_de_sortie>
# Produit :  dragon.glb (+ rendus d'aperçu *.png).
import bpy, bmesh, math, os, sys
import numpy as np
from mathutils import Vector, Matrix

OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "/tmp/dragon"
TEX = int(os.environ.get("DRAGON_TEX", "2048"))
APERCU = os.environ.get("DRAGON_APERCU", "1") == "1"
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def srgb(h):
    h = h.lstrip("#"); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4 for x in c)

def lerp(a, b, t): return a + (b - a) * t
def mix3(a, b, t): return tuple(lerp(a[i], b[i], t) for i in range(3))
def smooth(e0, e1, x):
    t = min(1, max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t)
def gauss(x, c, w): return math.exp(-((x - c) / w) ** 2)

# ---------------------------------------------------------------- accumulateur de maillage
class Builder:
    def __init__(s): s.V, s.F, s.M, s.base, s.mask, s.W = [], [], [], [], [], []
    def add(s, verts, faces, mat, base, mask, weights):
        o = len(s.V)
        s.V += [tuple(v) for v in verts]; s.F += [[i + o for i in f] for f in faces]; s.M += [mat] * len(faces)
        s.base += base; s.mask += mask; s.W += weights
B = Builder()
MAT_SCALES, MAT_MEMBRANE, MAT_EYE = 0, 1, 2

def orient(verts, faces):
    """Recalcule le sens des faces (normales vers l'extérieur) d'une pièce fermée."""
    bm = bmesh.new(); vs = [bm.verts.new(v) for v in verts]
    for f in faces:
        try: bm.faces.new([vs[i] for i in f])
        except ValueError: pass
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bm.verts.index_update()
    out = [[v.index for v in f.verts] for f in bm.faces]; bm.free(); return out

# ---------------------------------------------------------------- courbes
def catmull(pts, per=40):
    P = [pts[0] * 2 - pts[1]] + list(pts) + [pts[-1] * 2 - pts[-2]]
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for k in range(per):
            t = k / per; t2, t3 = t * t, t * t * t
            out.append(.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(P[-2]); return np.array(out)

def resample(dense, xyz_cols, spacing_fn):
    seg = np.linalg.norm(np.diff(dense[:, xyz_cols], axis=0), axis=1)
    S = np.concatenate([[0], np.cumsum(seg)]); L = S[-1]
    ss = [0.0]
    while ss[-1] < L: ss.append(ss[-1] + spacing_fn(ss[-1]))
    ss[-1] = L; ss = np.array(ss)
    return ss, np.stack([np.interp(ss, S, dense[:, j]) for j in range(dense.shape[1])], 1)

# ---------------------------------------------------------------- colonne : y, z, largeur, hauteur, crête
SPINE = np.array([
    (-7.0, 2.04, .09, .07, 0), (-6.86, 2.07, .25, .17, 0), (-6.55, 2.14, .31, .23, 0), (-6.18, 2.26, .37, .3, 0),
    (-5.8, 2.38, .47, .42, 0), (-5.45, 2.36, .47, .43, .03), (-5.08, 2.17, .33, .33, .06), (-4.45, 1.84, .34, .36, .07),
    (-3.85, 1.56, .41, .43, .07), (-3.20, 1.30, .53, .55, .06), (-2.50, 1.10, .74, .74, .04), (-1.60, .98, .93, .89, .03),
    (-0.60, .92, .96, .88, .03), (0.40, .92, .86, .80, .04), (1.30, .95, .68, .64, .05), (2.30, .95, .52, .49, .06),
    (3.40, .92, .40, .37, .07), (4.60, .88, .30, .27, .07), (5.80, .85, .21, .19, .06), (7.00, .82, .14, .13, .05),
    (8.10, .80, .08, .075, .03), (8.90, .80, .022, .022, 0)])
dense = catmull([np.array(r, float) for r in SPINE])
S_HEAD = 1.95                                     # au-delà : cou
SS, SPN = resample(dense, [0, 1], lambda s: .055 if s < S_HEAD + .3 else (.1 if s < 11 else .13))
NSEC = len(SS); NR = 28                           # sections, points par anneau
C = np.stack([np.zeros(NSEC), SPN[:, 0], SPN[:, 1]], 1)
T = np.gradient(C, axis=0); T /= np.linalg.norm(T, axis=1)[:, None]
UP = np.array([0, 0, 1.0])
X = np.cross(T, UP); X /= np.linalg.norm(X, axis=1)[:, None]
N = np.cross(X, T)
def spine_at_y(y):
    i = int(np.argmin(np.abs(C[:, 1] - y))); return i

def section_offset(i, a):
    """Point (x, z) local de l'anneau i à l'angle a (0 = côté gauche, pi/2 = dessus)."""
    s = SS[i]; w, h, ridge = SPN[i, 2], SPN[i, 3], SPN[i, 4]
    ca, sa = math.cos(a), math.sin(a)
    x, z = w * ca, h * sa
    if sa < 0:
        flat = lerp(.42, .86, smooth(1.6, 2.2, s)) if s < 3 else .86
        z *= flat
    z += ridge * max(0, sa) ** 14
    r = math.hypot(x, z) + 1e-9; ux, uz = x / r, z / r
    bump = 0
    if s < 2.6:
        bump += .12 * gauss(s, 1.02, .2) * (gauss(a, math.pi / 2 - .62, .26) + gauss(a, math.pi / 2 + .62, .26))  # arcades
        bump -= .05 * gauss(s, 1.15, .14) * (gauss(a, math.pi / 2 - 1.0, .2) + gauss(a, math.pi / 2 + 1.0, .2))  # orbites
        bump += .06 * gauss(s, 1.5, .3) * (gauss(a, 0, .45) + gauss(a, math.pi, .45) + gauss(a, 2 * math.pi, .45))  # joues
        bump += .05 * gauss(s, .17, .09) * (gauss(a, math.pi / 2 - .5, .22) + gauss(a, math.pi / 2 + .5, .22))  # narines
        bump -= .035 * gauss(s, .2, .06) * (gauss(a, math.pi / 2 - .5, .1) + gauss(a, math.pi / 2 + .5, .1))
        bump += .03 * gauss(s, .55, .25) * gauss(a, math.pi / 2, .25)  # arête du museau
    return x + ux * bump, z + uz * bump

def surf(i, a, off=0.0):
    x, z = section_offset(i, a)
    p = C[i] + X[i] * x + N[i] * z
    if off:
        x2, z2 = section_offset(i, a + .01); x0, z0 = section_offset(i, a - .01)
        tg = X[i] * (x2 - x0) + N[i] * (z2 - z0); nrm = np.cross(tg, T[i]); nrm /= np.linalg.norm(nrm)
        if np.dot(nrm, X[i] * x + N[i] * z) < 0: nrm = -nrm
        p = p + nrm * off
    return p

# ---------------------------------------------------------------- squelette (os)
BONES = {}   # nom -> (tête, queue, parent)
def bone(name, h, t, parent=None): BONES[name] = (np.array(h, float), np.array(t, float), parent)
def cpt(y):  # point de la colonne le plus proche de y
    return C[spine_at_y(y)]
J = {k: cpt(y) for k, y in dict(hips=.4, mid=-1.6, chest=-3.2, n1=-3.85, n2=-4.45, n3=-5.08, n4=-5.45, nose=-6.92).items()}
bone("Body", J["hips"], J["mid"])
bone("Chest", J["mid"], J["chest"], "Body")
bone("Neck1", J["chest"], J["n1"], "Chest"); bone("Neck2", J["n1"], J["n2"], "Neck1")
bone("Neck3", J["n2"], J["n3"], "Neck2"); bone("Neck4", J["n3"], J["n4"], "Neck3")
bone("Head", J["n4"], J["nose"], "Neck4")
tail_y = [.4, 1.3, 2.3, 3.4, 4.6, 5.8, 7.0, 8.1, 8.9]
for k in range(8):
    bone(f"Tail{k + 1}", cpt(tail_y[k]), cpt(tail_y[k + 1]), "Body" if k == 0 else f"Tail{k}")
CHAIN = ["Head", "Neck4", "Neck3", "Neck2", "Neck1", "Chest", "Body"] + [f"Tail{k + 1}" for k in range(8)]

NEIGH = {"Body": ("Tail1", "Chest"), "Chest": ("Body", "Neck1"), "Neck1": ("Chest", "Neck2"), "Neck2": ("Neck1", "Neck3"),
         "Neck3": ("Neck2", "Neck4"), "Neck4": ("Neck3", "Head"), "Head": ("Neck4", None)}
for k in range(8): NEIGH[f"Tail{k + 1}"] = ("Body" if k == 0 else f"Tail{k}", f"Tail{k + 2}" if k < 7 else None)

def chain_weights(p):
    """Poids le long de la chaîne tête-queue : interpolation linéaire entre les centres des os voisins."""
    best = None
    for n in CHAIN:
        h, t, _ = BONES[n]; d = t - h
        u = min(1, max(0, (p - h) @ d / (d @ d))); dist = np.linalg.norm(p - (h + d * u))
        if best is None or dist < best[0]: best = (dist, n, u)
    _, n0, u0 = best
    nb, w = (NEIGH[n0][0], .5 - u0) if u0 < .5 else (NEIGH[n0][1], u0 - .5)
    if nb is None or w <= .01: return {n0: 1.0}
    return {n0: 1 - w, nb: w}

def limb_weights(p, names, sharp=4):
    ws = []
    for n in names:
        h, t, _ = BONES[n]; d = t - h; u = min(1, max(0, (p - h) @ d / (d @ d)))
        ws.append((np.linalg.norm(p - (h + d * u)) + .02, n))
    ws.sort(); ws = ws[:3]
    raw = [(1 / dd ** sharp, n) for dd, n in ws]; tot = sum(r for r, _ in raw)
    return {n: r / tot for r, n in raw if r / tot > .02}

# ---------------------------------------------------------------- couleurs (sRGB -> linéaire)
COL_TOP, COL_SIDE, COL_BELLY = srgb("#163f57"), srgb("#2a7f8f"), srgb("#e2c07e")
COL_HORN, COL_CLAW, COL_MEMB, COL_MEMB2 = srgb("#efe2c4"), srgb("#2c2622"), srgb("#2e6170"), srgb("#c9733e")
COL_LEATHER, COL_STRAP, COL_GOLD = srgb("#7a4424"), srgb("#4f2a16"), srgb("#e2b443")

def body_color(i, a, s):
    sa = math.sin(a)
    c = mix3(COL_SIDE, COL_TOP, smooth(.1, .95, sa))
    belly = smooth(-.3, -.72, sa)
    if s < S_HEAD - .1: belly *= smooth(-.55, -.85, sa)  # dessous de la tête : un peu clair
    c = mix3(c, COL_BELLY, belly)
    # taches claires le long du dos
    return c, belly

# ---------------------------------------------------------------- corps lofté
verts, base, mask, wts, ringidx = [], [], [], [], []
for i in range(NSEC):
    s = SS[i]
    for k in range(NR):
        a = 2 * math.pi * k / NR
        p = surf(i, a); verts.append(p)
        c, belly = body_color(i, a, s)
        dens = .7 if s < S_HEAD else (.6 if s < 4.9 else (.32 if s < 11.5 else .5))
        base.append(c); mask.append((1 - .55 * belly, belly if s > S_HEAD - .2 else 0, dens))
        wts.append(chain_weights(C[i]))
faces = []
for i in range(NSEC - 1):
    for k in range(NR):
        a, b = i * NR + k, i * NR + (k + 1) % NR
        faces.append([a, b, b + NR, a + NR])
# bouchons (nez et bout de queue)
for end, i in (("nose", 0), ("tail", NSEC - 1)):
    ci = len(verts); verts.append(C[i] + T[i] * (-.03 if end == "nose" else .02))
    base.append(base[i * NR]); mask.append(mask[i * NR]); wts.append(wts[i * NR])
    for k in range(NR): faces.append([i * NR + k, i * NR + (k + 1) % NR, ci])
B.add(verts, orient(verts, faces), MAT_SCALES, base, mask, wts)

# ---------------------------------------------------------------- mâchoire inférieure
JAW = np.array([(-6.8, .15, .05), (-6.62, .23, .08), (-6.2, .29, .11), (-5.8, .35, .15), (-5.45, .33, .14), (-5.2, .22, .09)])
jd = catmull([np.array(r, float) for r in JAW], 30)
jv, jb, jm, jw, jf = [], [], [], [], []
NJ = len(jd[::3]); NRJ = 20
jaw_rows = jd[::3]
for r in jaw_rows:
    y, w, h = r
    i = spine_at_y(y); xb, zb = section_offset(i, -math.pi / 2)
    ztop = C[i][2] + zb + .012
    for k in range(NRJ):
        a = 2 * math.pi * k / NRJ; ca, sa = math.cos(a), math.sin(a)
        z = ztop - h * .35 + h * sa * (.35 if sa > 0 else 1)
        jv.append((w * ca * (1 if sa < 0 else .97), y, z))
        lower = sa < -.2
        jb.append(COL_BELLY if lower else srgb("#8a2a2e") if sa > .5 else COL_SIDE)
        jm.append((0 if sa > .5 else .7, .4 if lower else 0, .95))
        jw.append({"Jaw": 1.0})
for i in range(len(jaw_rows) - 1):
    for k in range(NRJ):
        a, b = i * NRJ + k, i * NRJ + (k + 1) % NRJ
        jf.append([a, b, b + NRJ, a + NRJ])
for i in (0, len(jaw_rows) - 1):
    ci = len(jv); jv.append(tuple(np.mean([jv[i * NRJ + k] for k in range(NRJ)], 0)))
    jb.append(jb[i * NRJ]); jm.append(jm[i * NRJ]); jw.append({"Jaw": 1.0})
    for k in range(NRJ): jf.append([i * NRJ + k, i * NRJ + (k + 1) % NRJ, ci])
B.add(jv, orient(jv, jf), MAT_SCALES, jb, jm, jw)
hinge = np.array([0, -5.3, 2.14]); bone("Jaw", hinge, np.array([0, -6.85, 1.98]), "Head")

# ---------------------------------------------------------------- petites pièces rigides
def tube(path, radii, nr=10, cap=True):
    """Tube le long d'un chemin (liste de points), rayon variable ; pointu si le dernier rayon est ~0."""
    path = [np.array(p, float) for p in path]; v, f = [], []
    n = len(path)
    for j, p in enumerate(path):
        t = path[min(j + 1, n - 1)] - path[max(j - 1, 0)]; t /= np.linalg.norm(t)
        ref = np.array([0, 0, 1.0]) if abs(t[2]) < .9 else np.array([1.0, 0, 0])
        x = np.cross(t, ref); x /= np.linalg.norm(x); y = np.cross(t, x)
        for k in range(nr):
            a = 2 * math.pi * k / nr; v.append(p + (x * math.cos(a) + y * math.sin(a)) * radii[j])
    for j in range(n - 1):
        for k in range(nr):
            a, b = j * nr + k, j * nr + (k + 1) % nr; f.append([a, b, b + nr, a + nr])
    if cap:
        for j, sgn in ((0, -1), (n - 1, 1)):
            ci = len(v); v.append(path[j] + (path[j] - path[j - sgn if 0 <= j - sgn < n else j]) * 0 )
            for k in range(nr): f.append([j * nr + k, j * nr + (k + 1) % nr, ci])
    return v, f

def add_rigid(v, f, color, msk, weights, mat=MAT_SCALES):
    cols = color if isinstance(color, list) else [color] * len(v)
    B.add(v, orient(v, f), mat, cols, [msk] * len(v), [weights] * len(v))
COL_HORN_BASE = srgb("#4a3c30")
def horn_cols(nring, nr, extra=1):
    out = []
    for j in range(nring):
        t = j / (nring - 1); out += [mix3(COL_HORN_BASE, COL_HORN, smooth(0, .55, t))] * nr
    return out + [COL_HORN] * extra

def curve_pts(ctrl, n):
    d = catmull([np.array(c, float) for c in ctrl], 20)
    idx = np.linspace(0, len(d) - 1, n).astype(int); return d[idx]

# cornes (deux paires) et petites cornes de joue
hw = chain_weights(BONES["Head"][0] * .3 + BONES["Head"][1] * .7)
hw = {"Head": 1.0}
for sx in (1, -1):
    i = spine_at_y(-5.55)
    root = surf(i, math.pi / 2 - sx * .55) - N[i] * .04
    ctrl = [root, root + np.array([sx * .1, .4, .2]), root + np.array([sx * .26, .95, .36]), root + np.array([sx * .36, 1.55, .36])]
    pts = curve_pts(ctrl, 14); rad = [.11 * (1 - j / 13) ** 1.1 + .004 for j in range(14)]
    v, f = tube(pts, rad, 12); add_rigid(v, f, horn_cols(14, 12, len(v) - 14 * 12), (.15, 0, .3), hw)
    root2 = surf(spine_at_y(-5.75), math.pi / 2 - sx * 1.25)
    ctrl = [root2, root2 + np.array([sx * .14, .35, .02]), root2 + np.array([sx * .26, .8, .1])]
    pts = curve_pts(ctrl, 9); rad = [.07 * (1 - j / 8) + .003 for j in range(9)]
    v, f = tube(pts, rad, 10); add_rigid(v, f, horn_cols(9, 10, len(v) - 90), (.15, 0, .3), hw)
    for yy, aa, ln in ((-5.35, 1.5, .32), (-5.45, 1.75, .24)):   # épines de joue
        r0 = surf(spine_at_y(yy), math.pi / 2 - sx * aa) if sx > 0 else surf(spine_at_y(yy), math.pi / 2 + aa)
        ctrl = [r0, r0 + np.array([sx * .1, ln * .6, -.02]), r0 + np.array([sx * .16, ln * 1.3, .03])]
        v, f = tube(curve_pts(ctrl, 7), [.05 * (1 - j / 6) + .003 for j in range(7)], 8)
        add_rigid(v, f, COL_HORN, (.1, 0, .3), hw)

# dents
for sx in (1, -1):
    for yy, ln in ((-6.82, .08), (-6.58, .12), (-6.3, .06), (-6.05, .07)):
        i = spine_at_y(yy); p = surf(i, -math.pi / 2 + sx * 1.15) + np.array([0, 0, .015])
        v, f = tube([p, p + np.array([0, 0, -ln * .5]), p + np.array([0, .01, -ln])], [.022, .015, .002], 6)
        add_rigid(v, f, COL_HORN, (0, 0, .2), {"Head": 1.0})

# yeux (globe ambre, pupille fendue peinte dans les couleurs)
for sx in (1, -1):
    i = spine_at_y(-5.98); a = math.pi / 2 - sx * .92
    cen = surf(i, a, -.04); out = cen - C[i]; out[1] = 0; out /= np.linalg.norm(out)
    R = .085; v, f = [], []
    nu, nv = 36, 24
    for jv_ in range(nv + 1):
        th = math.pi * jv_ / nv
        for ju in range(nu):
            ph = 2 * math.pi * ju / nu
            d = np.array([math.sin(th) * math.cos(ph), math.sin(th) * math.sin(ph), math.cos(th)])
            v.append(cen + d * R)
    for jv_ in range(nv):
        for ju in range(nu):
            a0, b0 = jv_ * nu + ju, jv_ * nu + (ju + 1) % nu; f.append([a0, b0, b0 + nu, a0 + nu])
    cols = []
    fwd = np.array([0, -1.0, 0]); look = out * .8 + fwd * .6; look /= np.linalg.norm(look)
    for p in v:
        d = (np.array(p) - cen) / R; facing = d @ look
        lat = d - look * facing; up = np.array([0, 0, 1.0]); vert = abs(lat @ up); horiz = np.linalg.norm(lat - up * (lat @ up))
        c = mix3(srgb("#fff07a"), srgb("#e0700f"), smooth(.0, .85, np.linalg.norm(lat)))
        if facing < .2: c = srgb("#1b0f08")
        cols.append(c)
    fo = orient(v, f)
    B.add(v, fo, MAT_EYE, cols, [(0, 0, 0)] * len(v), [{"Head": 1.0}] * len(v))
    # pupille fendue : petit ellipsoïde noir posé sur l'iris
    upv = np.array([0, 0, 1.0]); sidev = np.cross(look, upv); sidev /= np.linalg.norm(sidev); upv = np.cross(sidev, look)
    pc = cen + look * R * .93; pv, pf = [], []
    for jv_ in range(7):
        th = math.pi * jv_ / 6
        for ju in range(10):
            ph = 2 * math.pi * ju / 10
            pv.append(pc + upv * math.cos(th) * .062 + (sidev * math.cos(ph) * .016 + look * math.sin(ph) * .012) * math.sin(th))
    for jv_ in range(6):
        for ju in range(10):
            a0, b0 = jv_ * 10 + ju, jv_ * 10 + (ju + 1) % 10; pf.append([a0, b0, b0 + 10, a0 + 10])
    B.add(pv, orient(pv, pf), MAT_EYE, [srgb("#080404")] * len(pv), [(0, 0, 0)] * len(pv), [{"Head": 1.0}] * len(pv))

# piques du dos (sauf à la selle)
s_list = np.arange(2.0, SS[-1] - .35, .3)
for s in s_list:
    i = int(np.argmin(np.abs(SS - s))); y = C[i][1]
    if -3.5 < y < -1.9: continue
    h = SPN[i, 3]; size = (.09 + .32 * min(1, h / .9)) * (1.15 if 0 < y < 4 else 1)
    top = surf(i, math.pi / 2) - N[i] * .02
    base_len, width = size * .9, max(.025, size * .2)
    tip = top + N[i] * size + T[i] * size * .55
    ring = []
    for k in range(8):
        a = 2 * math.pi * k / 8; ring.append(top + T[i] * math.cos(a) * base_len * .5 + X[i] * math.sin(a) * width)
    v = ring + [tip]; f = [[k, (k + 1) % 8, 8] for k in range(8)] + [list(range(7, -1, -1))]
    add_rigid(v, f, mix3(COL_TOP, COL_HORN, .45), (.2, 0, .5), chain_weights(C[i]))

# pointe de queue en fer de lance
i = NSEC - 4; tipc = C[i]
sv, sf = [], []
prof = [(0, 0), (.15, .2), (.35, .33), (.6, .34), (.85, .22), (1.05, .0)]
rows = []
for (t, w) in prof:
    yc = tipc[1] - .25 + t
    rows.append([(sx * w, yc, tipc[2] + zz) for sx, zz in ((-1, 0), (0, .05), (1, 0), (0, -.04))])
for r in rows: sv += r
for j in range(len(rows) - 1):
    for k in range(4):
        a, b = j * 4 + k, j * 4 + (k + 1) % 4; sf.append([a, b, b + 4, a + 4])
add_rigid(sv, sf, mix3(COL_TOP, COL_HORN, .3), (.4, 0, .6), {"Tail8": .5, "Tail7": .5})

# ---------------------------------------------------------------- membres (modificateur Skin)
def skin_part(name, nodes, edges, radii, colfn, mskfn, wfn, sub=1):
    me = bpy.data.meshes.new(name); me.from_pydata([tuple(p) for p in nodes], edges, []); me.update()
    ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob)
    bm = bmesh.new(); bm.from_mesh(me); lay = bm.verts.layers.skin.verify()
    for v in bm.verts:
        r = radii[v.index]; v[lay].radius = (r, r)
    bm.verts.ensure_lookup_table(); bm.verts[0][lay].use_root = True; bm.to_mesh(me); bm.free()
    m = ob.modifiers.new("skin", "SKIN"); m.use_smooth_shade = True; m.branch_smoothing = .4
    if sub: s = ob.modifiers.new("sub", "SUBSURF"); s.levels = sub; s.render_levels = sub
    dg = bpy.context.evaluated_depsgraph_get(); ev = ob.evaluated_get(dg); m2 = bpy.data.meshes.new_from_object(ev)
    v = [tuple(x.co) for x in m2.vertices]; f = [list(p.vertices) for p in m2.polygons]
    nodes_np = np.array(nodes, float)
    cols, msk, ws = [], [], []
    for p in v:
        j = int(np.argmin(np.linalg.norm(nodes_np - np.array(p), axis=1)))
        cols.append(colfn(j, np.array(p))); msk.append(mskfn(j, np.array(p))); ws.append(wfn(np.array(p)))
    bpy.data.objects.remove(ob); bpy.data.meshes.remove(m2)
    B.add(v, f, MAT_SCALES, cols, msk, ws)
    return v

def claw(p, d, ln, r, weights):
    d = np.array(d, float); d /= np.linalg.norm(d); p = np.array(p, float)
    down = np.array([0, 0, -1.0]); pts = [p, p + d * ln * .5 + down * ln * .12, p + d * ln + down * ln * .4]
    v, f = tube(pts, [r, r * .6, .002], 8); add_rigid(v, f, COL_CLAW, (0, 0, .2), weights)

# Ailes : épaule, coude, poignet, doigts (côté gauche = +X)
S_, E_, W_ = np.array([.78, -1.95, 1.62]), np.array([3.25, -1.15, 2.02]), np.array([5.65, -2.35, 2.16])
THUMB = np.array([6.0, -2.95, 2.12])
FING = {2: [W_, np.array([8.3, -2.05, 2.22]), np.array([11.1, -.7, 2.02])],
        3: [W_, np.array([7.9, -.45, 2.1]), np.array([9.6, 2.35, 1.86])],
        4: [W_, np.array([6.75, .55, 2.0]), np.array([6.95, 3.55, 1.74])]}
HIP_ATT = np.array([.62, 1.55, 1.2])
def mirror(p, sx): q = np.array(p, float).copy(); q[0] *= sx; return q

for side, sx in (("L", 1), ("R", -1)):
    bone(f"Arm.{side}", mirror(S_, sx), mirror(E_, sx), "Chest")
    bone(f"Forearm.{side}", mirror(E_, sx), mirror(W_, sx), f"Arm.{side}")
    bone(f"Thumb.{side}", mirror(W_, sx), mirror(THUMB, sx), f"Forearm.{side}")
    for fi, pts in FING.items():
        bone(f"F{fi}a.{side}", mirror(pts[0], sx), mirror(pts[1], sx), f"Forearm.{side}")
        bone(f"F{fi}b.{side}", mirror(pts[1], sx), mirror(pts[2], sx), f"F{fi}a.{side}")
    wing_bones = [f"Arm.{side}", f"Forearm.{side}", f"Thumb.{side}"] + [f"F{fi}{ab}.{side}" for fi in FING for ab in "ab"]
    # os du bras en tube (skin)
    nodes = [mirror((.3, -1.9, 1.35), sx), mirror(S_, sx), mirror((S_ + E_) / 2, sx), mirror(E_, sx), mirror((E_ + W_) / 2, sx), mirror(W_, sx)]
    radii = [.3, .27, .2, .17, .12, .12]; edges = [(k, k + 1) for k in range(5)]
    tp = len(nodes); nodes.append(mirror(THUMB, sx)); radii.append(.06); edges.append((5, tp))
    for fi, pts in FING.items():
        cp = curve_pts(pts, 7)[1:]; prev = 5
        for j, p in enumerate(cp):
            nodes.append(mirror(p, sx)); radii.append(lerp(.085, .022, j / 5) * (1 if fi != 4 else .85)); edges.append((prev, len(nodes) - 1)); prev = len(nodes) - 1
    skin_part(f"wingarm{side}", nodes, edges, radii, lambda j, p: COL_TOP if j < 6 else mix3(COL_TOP, COL_CLAW, .3),
              lambda j, p: (.8, 0, .55), lambda p, wb=wing_bones: limb_weights(p, wb + ["Chest"]))
    claw(mirror(THUMB, sx), mirror((.15, -.6, -.1), sx), .32, .05, {f"Thumb.{side}": 1})
    # membrane : trois carreaux de Coons
    def finger_curve(fi, n):
        return [mirror(p, sx) for p in curve_pts(FING[fi], n)]
    NU, NV = 18, 10
    mv, mf, mb, mm, mw = [], [], [], [], []
    def patch(A, Bc, L0, L1, wfun, camber, sag_dir):
        """Carreau de Coons : A(u) v=0, Bc(u) v=1, L0(v) u=0, L1(v) u=1 (listes de points)."""
        o = len(mv); nu, nv = len(A) - 1, len(L0) - 1
        for iu in range(nu + 1):
            u = iu / nu
            for iv in range(nv + 1):
                v = iv / nv
                P = (1 - v) * A[iu] + v * Bc[iu] + (1 - u) * L0[iv] + u * L1[iv] \
                    - ((1 - u) * (1 - v) * A[0] + u * (1 - v) * A[-1] + (1 - u) * v * Bc[0] + u * v * Bc[-1])
                P = P + np.array([0, 0, 1.0]) * camber * math.sin(math.pi * u) * math.sin(math.pi * v)
                mv.append(P); mw.append(wfun(u, v))
                edge = max(1 - v, v, u) if False else 0
                near_bone = max(math.exp(-v * 9), math.exp(-(1 - v) * 9))
                c = mix3(COL_MEMB, COL_TOP, .55 * near_bone)
                c = mix3(c, COL_MEMB2, .22 * smooth(.3, 1, v * u))
                mb.append(c); mm.append((0, 0, .5 + .5 * u))
        for iu in range(nu):
            for iv in range(nv):
                a = o + iu * (nv + 1) + iv; b = a + nv + 1
                mf.append([a, b, b + 1, a + 1])
    def finger_w(fi, u):
        return {f"F{fi}a.{side}": 1 - smooth(.3, .7, u), f"F{fi}b.{side}": smooth(.3, .7, u)}
    def addw(*pairs):
        out = {}
        for k, d in pairs:
            for n, w in d.items(): out[n] = out.get(n, 0) + k * w
        return {n: w for n, w in out.items() if w > .01}
    def scallop(p0, p1, n, depth):
        mid = (p0 + p1) / 2; d = mirror(W_, sx) - mid; d[2] = 0; d /= np.linalg.norm(d)
        return [lerp(p0, p1, j / n) + d * depth * math.sin(math.pi * j / n) for j in range(n + 1)]
    # carreaux entre doigts 2-3 et 3-4
    for fa, fb in ((2, 3), (3, 4)):
        A = finger_curve(fa, NU + 1); Bc = finger_curve(fb, NU + 1)
        L0 = [mirror(W_, sx)] * (NV + 1); L1 = scallop(A[-1], Bc[-1], NV, 1.1 if fa == 2 else 1.0)
        patch(A, Bc, L0, L1, lambda u, v, fa=fa, fb=fb: addw((1 - v, finger_w(fa, u)), (v, finger_w(fb, u))), .22, None)
    # carreau intérieur : bras (v=0), bord de fuite (v=1), flanc (u=0), doigt 4 (u=1)
    arm = [mirror(p, sx) for p in curve_pts([S_, E_, W_], NU + 1)]
    f4 = finger_curve(4, NV + 1)
    flank = [lerp(mirror(S_, sx), mirror(HIP_ATT, sx), j / NV) for j in range(NV + 1)]
    trail_ctrl = [mirror(HIP_ATT, sx), mirror((2.6, 2.1, 1.55), sx), mirror((5.0, 2.55, 1.66), sx), f4[-1]]
    trail = [np.array(p) for p in curve_pts(trail_ctrl, NU + 1)]
    def inner_w(u, v):
        arm_w = {f"Arm.{side}": 1 - smooth(.35, .65, u), f"Forearm.{side}": smooth(.35, .65, u)}
        trail_w = addw((1 - smooth(.2, .9, u), {"Body": .5, "Chest": .5}), (smooth(.2, .9, u), finger_w(4, 1.0)))
        return addw((1 - v, arm_w), (v, trail_w))
    patch(arm, trail, flank, f4, inner_w, .35, None)
    # soudure des bords communs, orientation vers le haut
    bm = bmesh.new(); bvs = [bm.verts.new(p) for p in mv]
    for fc in mf: bm.faces.new([bvs[i] for i in fc])
    bm.verts.ensure_lookup_table()
    for k, v in enumerate(bm.verts): v.index = k
    keep = {}
    res = bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=.004)
    bm.verts.index_update(); bm.faces.ensure_lookup_table()
    # retrouver couleurs/poids : par position la plus proche dans la liste d'origine
    mvn = np.array(mv)
    nv_, nb_, nm_, nw_ = [], [], [], []
    for v in bm.verts:
        j = int(np.argmin(np.linalg.norm(mvn - np.array(v.co), axis=1)))
        nv_.append(tuple(v.co)); nb_.append(mb[j]); nm_.append(mm[j]); nw_.append(mw[j])
    nf_ = []
    for fc in bm.faces:
        idx = [v.index for v in fc.verts]
        n = fc.normal
        if n.z < 0: idx = idx[::-1]
        nf_.append(idx)
    bm.free()
    B.add(nv_, nf_, MAT_MEMBRANE, nb_, nm_, nw_)

    # pattes avant (repliées sous la poitrine)
    fl = [f"FLeg1.{side}", f"FLeg2.{side}", f"FLeg3.{side}"]
    sh, el, wr, ha = mirror((.62, -1.75, .45), sx), mirror((.74, -1.32, .02), sx), mirror((.62, -1.86, -.26), sx), mirror((.62, -2.08, -.33), sx)
    bone(fl[0], sh, el, "Chest"); bone(fl[1], el, wr, fl[0]); bone(fl[2], wr, ha, fl[1])
    nodes = [mirror((.35, -1.7, .75), sx), sh, el, wr, ha]; radii = [.32, .26, .16, .12, .11]; edges = [(0, 1), (1, 2), (2, 3), (3, 4)]
    toes = [mirror((.52, -2.36, -.36), sx), mirror((.64, -2.42, -.34), sx), mirror((.76, -2.33, -.31), sx)]
    for t in toes: nodes.append(t); radii.append(.055); edges.append((4, len(nodes) - 1))
    skin_part(f"fleg{side}", nodes, edges, radii, lambda j, p: COL_SIDE if j < 3 else mix3(COL_SIDE, COL_BELLY, .3),
              lambda j, p: (.85, 0, .7), lambda p, b=fl: limb_weights(p, b + ["Chest"]))
    for t in toes: claw(t, (0, -1, -.2), .2, .035, {fl[2]: 1})
    # pattes arrière (repliées vers l'arrière)
    bl = [f"BLeg1.{side}", f"BLeg2.{side}", f"BLeg3.{side}"]
    hp, kn, an, ft = mirror((.62, 1.0, .45), sx), mirror((.8, .32, .02), sx), mirror((.72, 1.18, -.3), sx), mirror((.68, 1.58, -.42), sx)
    bone(bl[0], hp, kn, "Body"); bone(bl[1], kn, an, bl[0]); bone(bl[2], an, ft, bl[1])
    nodes = [mirror((.35, .9, .75), sx), hp, kn, an, ft]; radii = [.36, .4, .22, .13, .12]; edges = [(0, 1), (1, 2), (2, 3), (3, 4)]
    toes = [mirror((.57, 2.02, -.46), sx), mirror((.7, 2.08, -.46), sx), mirror((.83, 2.0, -.44), sx)]
    for t in toes: nodes.append(t); radii.append(.055); edges.append((4, len(nodes) - 1))
    skin_part(f"bleg{side}", nodes, edges, radii, lambda j, p: COL_SIDE if j < 3 else mix3(COL_SIDE, COL_BELLY, .3),
              lambda j, p: (.85, 0, .55), lambda p, b=bl: limb_weights(p, b + ["Body"]))
    for t in toes: claw(t, (0, 1, -.25), .2, .035, {bl[2]: 1})

# ---------------------------------------------------------------- selle et sangles
iS0, iS1 = spine_at_y(-3.2), spine_at_y(-2.3)
SADDLE_Y = -2.75; iSm = spine_at_y(SADDLE_Y)
saddle_top = surf(iSm, math.pi / 2, .07)
sv, sf, sc = [], [], []
na = 12; ilist = list(range(iS0, iS1 + 1)); nrow = len(ilist)
for layer, off in ((0, .015), (1, .085)):
    for r, i in enumerate(ilist):
        tback = r / (nrow - 1)
        for k in range(na + 1):
            a = math.pi / 2 - .95 + 1.9 * k / na
            extra = .0
            if layer: extra = .12 * smooth(.75, 1, tback) * math.sin(math.pi * k / na) + .05 * smooth(.25, 0, tback) * math.sin(math.pi * k / na)
            sv.append(surf(i, a, off + extra))
L = (na + 1)
for layer in (0, 1):
    o = layer * nrow * L
    for r in range(nrow - 1):
        for k in range(na):
            a, b = o + r * L + k, o + r * L + k + 1; sf.append([a, b, b + L, a + L])
o = nrow * L
for r in range(nrow - 1):     # bords latéraux
    for k in (0, na):
        sf.append([r * L + k, (r + 1) * L + k, o + (r + 1) * L + k, o + r * L + k])
for r in (0, nrow - 1):       # bords avant/arrière
    for k in range(na):
        sf.append([r * L + k, r * L + k + 1, o + r * L + k + 1, o + r * L + k])
add_rigid(sv, sf, COL_LEATHER, (0, 0, .3), {"Chest": .7, "Body": .3})
# sangles autour du ventre
for yy in (-3.12, -2.38):
    i = spine_at_y(yy); v, f = [], []
    na2 = 40
    for k in range(na2):
        a = 2 * math.pi * k / na2
        for dy in (-.07, .07):
            v.append(surf(i, a, .035) + T[i] * dy)
    for k in range(na2):
        a, b = 2 * k, 2 * ((k + 1) % na2); f.append([a, b, b + 1, a + 1])
    vv = [tuple(p) for p in v]
    B.add(vv, f, MAT_SCALES, [COL_STRAP] * len(vv), [(0, 0, .3)] * len(vv), [chain_weights(C[i])] * len(vv))

# ---------------------------------------------------------------- objet maillage + matériaux d'atlas
me = bpy.data.meshes.new("Dragon")
me.from_pydata(B.V, [], B.F); me.update()
for p, m in zip(me.polygons, B.M): p.material_index = m; p.use_smooth = True
def color_attr(name, vals):
    at = me.color_attributes.new(name, "FLOAT_COLOR", "POINT")
    flat = np.array([(*c, 1.0) for c in vals], np.float32).ravel(); at.data.foreach_set("color", flat)
color_attr("Base", B.base); color_attr("Mask", B.mask)
dragon = bpy.data.objects.new("Dragon", me); scene.collection.objects.link(dragon)

# armature
arm_d = bpy.data.armatures.new("DragonRig"); rig = bpy.data.objects.new("DragonRig", arm_d)
scene.collection.objects.link(rig); bpy.context.view_layer.objects.active = rig; rig.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")
eb = {}
for n, (h, t, par) in BONES.items():
    b = arm_d.edit_bones.new(n); b.head = Vector(h); b.tail = Vector(t); eb[n] = b
for n, (h, t, par) in BONES.items():
    if par: eb[n].parent = eb[par]
bpy.ops.object.mode_set(mode="OBJECT")
groups = {n: dragon.vertex_groups.new(name=n) for n in BONES}
for vi, w in enumerate(B.W):
    tot = sum(w.values())
    for n, x in w.items(): groups[n].add([vi], x / tot, "REPLACE")
dragon.parent = rig; mod = dragon.modifiers.new("rig", "ARMATURE"); mod.object = rig

# ---------------------------------------------------------------- cavalier : le jeune Viking (heros.py), assis, une main sur la poignée
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import heros
from heros import SKIN, TUNIC, TUNIC2, VEST, FUR, PANTS, BOOT, BELT, BRACER, SOLE, IRON
def rider():
    zt = saddle_top[2]; y0 = SADDLE_Y
    P = lambda x, y, z: np.array([x, y0 + y, zt + z])
    M = heros.Maillage()
    # corps fin, jambes le long du cou, bras
    nodes = [P(0, .05, .1), P(0, .02, .2), P(0, -.02, .31), P(0, -.05, .42), P(0, -.08, .5)]
    radii = [.135, .13, .13, .142, .058]; cols = [TUNIC, BELT, VEST, VEST, SKIN]; edges = [(0, 1), (1, 2), (2, 3), (3, 4)]
    def chain(pts, rr, cc, start):
        prev = start
        for p, r, c in zip(pts, rr, cc):
            nodes.append(p); radii.append(r); cols.append(c); edges.append((prev, len(nodes) - 1)); prev = len(nodes) - 1
        return prev
    for sx in (1, -1):
        chain([P(sx * .12, .0, .06), P(sx * .25, -.17, .0), P(sx * .37, -.32, -.07), P(sx * .52, -.24, -.25), P(sx * .63, -.12, -.42), P(sx * .66, -.08, -.5)],
              [.088, .082, .075, .07, .074, .07], [TUNIC, PANTS, PANTS, PANTS, BOOT, BOOT], 0)
    # bras gauche (sx = -1) : tient la poignée ; bras droit (sx = +1) : main en visière
    WL = chain([P(-.19, -.06, .45), P(-.24, -.14, .38), P(-.25, -.24, .32), P(-.19, -.35, .28), P(-.13, -.42, .27)],
               [.068, .056, .046, .046, .044], [VEST, TUNIC, TUNIC, BRACER, BRACER], 3)
    WR = chain([P(.19, -.06, .46), P(.27, -.12, .54), P(.32, -.19, .63), P(.27, -.26, .74), P(.2, -.3, .8)],
               [.068, .056, .046, .046, .044], [VEST, TUNIC, TUNIC, BRACER, BRACER], 3)
    M.skin(scene, nodes, radii, cols, edges)
    for sx in (1, -1):   # bottes, semelle, revers de fourrure
        a = P(sx * .67, -.05, -.54)
        M.ellipsoid(a + np.array([0, -.06, -.02]), np.array([.066, 0, 0]), np.array([0, .12, 0]), np.array([0, 0, .062]), BOOT, 16, 10)
        M.ellipsoid(a + np.array([0, -.065, -.065]), np.array([.068, 0, 0]), np.array([0, .124, 0]), np.array([0, 0, .018]), SOLE, 16, 8)
        heros.fourrure(M, [P(sx * .61, -.14, -.355) + np.array([.075 * math.cos(a), .075 * math.sin(a), 0]) for a in np.linspace(0, 2 * math.pi, 7)[:-1]], .03, None, 2)
    # ouverture du gilet (la tunique se voit), col de fourrure, boucle de ceinture, bas de tunique sur la selle
    M.ellipsoid(P(0, -.165, .34), np.array([.045, 0, 0]), np.array([0, .03, 0]), np.array([0, 0, .12]), TUNIC2, 12, 8)
    heros.fourrure(M, [P(.11, -.08, .5), P(.08, .01, .515), P(0, .035, .52), P(-.08, .01, .515), P(-.11, -.08, .5), P(-.05, -.15, .48), P(.05, -.15, .48)], .04)
    M.ellipsoid(P(0, -.145, .2), np.array([.032, 0, 0]), np.array([0, .012, 0]), np.array([0, 0, .026]), IRON, 10, 6)
    M.tube([P(0, .06, .16), P(0, .07, .08), P(0, .1, .02)], [.14, .155, .16], TUNIC, 20)
    for sx in (1, -1):   # épaulettes de cuir
        M.ellipsoid(P(sx * .17, -.06, .46), np.array([.07, 0, 0]), np.array([0, .075, 0]), np.array([0, 0, .035]), VEST, 12, 8)
    heros.main(M, np.array(nodes[WL]), [.25, -1, -.15], [0, 0, 1], -1, "poing")
    # poignée du harnais : la barre passe dans le poing fermé, un montant la fixe à la selle
    fL = heros.nrm([.25, -1, -.15]); uL = heros.nrm(np.array([0, 0, 1.0]) - fL * fL[2])
    grip = np.array(nodes[WL]) + fL * .07 - uL * .028
    GOLD, LEATH = srgb("#e2b443"), srgb("#5a2f18")
    M.tube([grip + np.array([-.1, 0, 0]), np.array([0, grip[1], grip[2]]), np.array([.2, grip[1], grip[2]])], [.024, .026, .024], GOLD, 10)
    for xx in (-.1, .2): M.ellipsoid(np.array([xx, grip[1], grip[2]]), np.array([.03, 0, 0]), np.array([0, .03, 0]), np.array([0, 0, .03]), GOLD, 10, 6)
    post0 = np.array([.05, grip[1], grip[2]]); post1 = np.array([.05, grip[1] + .06, zt - .02])
    M.tube([post0, (post0 + post1) / 2, post1], [.03, .032, .045], LEATH, 10)
    heros.main(M, np.array(nodes[WR]), [-1, -.35, .05], [0, .25, 1], 1, "plat")
    # tête (objet à part, pivot au cou, pour qu'elle regarde dans les virages)
    piv = P(0, -.09, .55)
    H, uv, nface = heros.tete(piv)
    obr = heros.objet(scene, "Rider", M, np.zeros(3))
    obh = heros.objet(scene, "RiderHead", H, piv, uv, nface)
    print("cavalier:", len(M.V) + len(H.V), "sommets")
    # pas de parenté à l'os dans le fichier (l'export glTF le retournait) : le jeu l'attache à l'os « Chest »
    obh.parent = obr; obh.matrix_parent_inverse = Matrix.Identity(4)
    return obr
rider_ob = rider()

# ---------------------------------------------------------------- matériaux procéduraux (pour la cuisson)
def proc_material(name, kind):
    mat = bpy.data.materials.new(name); mat.use_nodes = True; nt = mat.node_tree; nd, ln = nt.nodes, nt.links
    nd.clear()
    out = nd.new("ShaderNodeOutputMaterial"); bsdf = nd.new("ShaderNodeBsdfPrincipled"); ln.new(bsdf.outputs[0], out.inputs[0])
    tc = nd.new("ShaderNodeTexCoord")
    ab = nd.new("ShaderNodeAttribute"); ab.attribute_name = "Base"
    am = nd.new("ShaderNodeAttribute"); am.attribute_name = "Mask"
    sep = nd.new("ShaderNodeSeparateColor"); ln.new(am.outputs["Color"], sep.inputs[0])
    def math_(op, *args):
        clamp = isinstance(args[-1], bool) and args[-1]
        if isinstance(args[-1], bool): args = args[:-1]
        m = nd.new("ShaderNodeMath"); m.operation = op; m.use_clamp = clamp
        for idx, x in enumerate(args):
            if x is None: continue
            if isinstance(x, (int, float)): m.inputs[idx].default_value = x
            else: ln.new(x, m.inputs[idx])
        return m.outputs[0]
    def mixc(a, b, fac, blend="MIX"):
        m = nd.new("ShaderNodeMix"); m.data_type = "RGBA"; m.blend_type = blend
        for sock, x in ((0, fac), (6, a), (7, b)):
            if isinstance(x, (int, float)): m.inputs[sock].default_value = x
            elif isinstance(x, tuple): m.inputs[sock].default_value = (*x, 1)
            else: ln.new(x, m.inputs[sock])
        return m.outputs[2]
    bump = nd.new("ShaderNodeBump")
    if kind == "scales":
        dens = math_("MULTIPLY_ADD", sep.outputs[2], 14.0, 4.5)
        nz = nd.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 3.0; ln.new(tc.outputs["Object"], nz.inputs["Vector"])
        warp = mixc(tc.outputs["Object"], nz.outputs["Color"], .06, "LINEAR_LIGHT")
        v1 = nd.new("ShaderNodeTexVoronoi"); v1.feature = "F1"; v1.inputs["Randomness"].default_value = .8
        ln.new(tc.outputs["Object"], v1.inputs["Vector"]); ln.new(dens, v1.inputs["Scale"])
        v2 = nd.new("ShaderNodeTexVoronoi"); v2.feature = "DISTANCE_TO_EDGE"; v2.inputs["Randomness"].default_value = .8
        ln.new(tc.outputs["Object"], v2.inputs["Vector"]); ln.new(dens, v2.inputs["Scale"])
        dome = math_("SUBTRACT", 1.0, math_("POWER", math_("MULTIPLY", v1.outputs["Distance"], 1.6, True), 1.6))
        groove = math_("MULTIPLY", v2.outputs["Distance"], 9.0, True)
        sc_h = math_("MULTIPLY", math_("MULTIPLY", dome, groove), sep.outputs[0])
        # plaques du ventre : bandes le long de Y
        sepxyz = nd.new("ShaderNodeSeparateXYZ"); ln.new(tc.outputs["Object"], sepxyz.inputs[0])
        band = math_("PINGPONG", math_("MULTIPLY", sepxyz.outputs[1], 3.2), .5)
        plate = math_("MULTIPLY", math_("POWER", math_("MULTIPLY", band, 2.0, True), .35), sep.outputs[1])
        fine = nd.new("ShaderNodeTexNoise"); fine.inputs["Scale"].default_value = 60.0; fine.inputs["Detail"].default_value = 4
        ln.new(tc.outputs["Object"], fine.inputs["Vector"])
        height = math_("ADD", math_("ADD", sc_h, plate), math_("MULTIPLY", fine.outputs["Fac"], .15))
        ln.new(height, bump.inputs["Height"]); bump.inputs["Strength"].default_value = .55; bump.inputs["Distance"].default_value = .02
        tint = math_("MULTIPLY_ADD", v1.outputs["Color"], .0, 1.0)
        rnd = nd.new("ShaderNodeSeparateColor"); ln.new(v1.outputs["Color"], rnd.inputs[0])
        var = math_("MULTIPLY_ADD", rnd.outputs[0], .38, .78)
        shade = math_("MULTIPLY_ADD", groove, .55, .45)
        shade = mixc((1, 1, 1), shade, sep.outputs[0])
        col = mixc(ab.outputs["Color"], var, 1.0, "MULTIPLY")
        col = mixc(col, shade, 1.0, "MULTIPLY")
        # reflets turquoise au sommet des écailles
        glint = math_("MULTIPLY", math_("POWER", dome, 3.0), math_("MULTIPLY", sep.outputs[0], .35))
        col = mixc(col, (0.25, 0.75, 0.7), glint, "ADD")
        pl = math_("MULTIPLY_ADD", band, .5, .6)
        col = mixc(col, mixc(col, pl, 1.0, "MULTIPLY"), sep.outputs[1])
        ln.new(col, bsdf.inputs["Base Color"])
    elif kind == "membrane":
        nz = nd.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 1.2; ln.new(tc.outputs["Object"], nz.inputs["Vector"])
        warp = mixc(tc.outputs["Object"], nz.outputs["Color"], .35, "LINEAR_LIGHT")
        vv = nd.new("ShaderNodeTexVoronoi"); vv.feature = "DISTANCE_TO_EDGE"; vv.inputs["Scale"].default_value = .9
        ln.new(warp, vv.inputs["Vector"])
        vein = math_("SUBTRACT", 1.0, math_("MULTIPLY", vv.outputs["Distance"], 14.0, True))
        vv2 = nd.new("ShaderNodeTexVoronoi"); vv2.feature = "DISTANCE_TO_EDGE"; vv2.inputs["Scale"].default_value = 5.0
        ln.new(warp, vv2.inputs["Vector"])
        vein2 = math_("SUBTRACT", 1.0, math_("MULTIPLY", vv2.outputs["Distance"], 22.0, True))
        veins = math_("MAXIMUM", vein, math_("MULTIPLY", vein2, .22))
        fine = nd.new("ShaderNodeTexNoise"); fine.inputs["Scale"].default_value = 25.0; ln.new(tc.outputs["Object"], fine.inputs["Vector"])
        ln.new(math_("ADD", veins, math_("MULTIPLY", fine.outputs["Fac"], .3)), bump.inputs["Height"])
        bump.inputs["Strength"].default_value = .35; bump.inputs["Distance"].default_value = .02
        dark = math_("MULTIPLY_ADD", veins, -.4, 1.0)
        col = mixc(ab.outputs["Color"], dark, 1.0, "MULTIPLY")
        col = mixc(col, math_("MULTIPLY_ADD", fine.outputs["Fac"], .3, .85), 1.0, "MULTIPLY")
        ln.new(col, bsdf.inputs["Base Color"])
    else:
        ln.new(ab.outputs["Color"], bsdf.inputs["Base Color"])
    ln.new(bump.outputs[0], bsdf.inputs["Normal"])
    return mat
mats = [proc_material("Scales", "scales"), proc_material("Membrane", "membrane"), proc_material("Eye", "eye")]
for m in mats: me.materials.append(m)

# ---------------------------------------------------------------- UV d'atlas
bpy.ops.object.select_all(action="DESELECT"); bpy.context.view_layer.objects.active = dragon; dragon.select_set(True)
bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=.004, area_weight=0.0, scale_to_bounds=True)
bpy.ops.object.mode_set(mode="OBJECT")
print("dragon:", len(me.vertices), "sommets", sum(len(p.vertices) - 2 for p in me.polygons), "triangles")

# ---------------------------------------------------------------- cuisson
scene.render.engine = "CYCLES"; scene.cycles.device = "CPU"; scene.cycles.samples = 8
scene.render.bake.margin = 8
def new_img(name, non_color=False):
    im = bpy.data.images.new(name, TEX, TEX, alpha=False, float_buffer=False)
    if non_color: im.colorspace_settings.name = "Non-Color"
    return im
img_col, img_ao, img_nrm = new_img("dragon_col"), new_img("dragon_ao", True), new_img("dragon_nrm", True)
def set_target(img):
    for m in mats:
        nt = m.node_tree; n = nt.nodes.get("bake") or nt.nodes.new("ShaderNodeTexImage"); n.name = "bake"
        n.image = img; nt.nodes.active = n; n.select = True
dragon.select_set(True); bpy.context.view_layer.objects.active = dragon
# pose neutre pour la cuisson (le cavalier reste là, il fait de l'ombre douce sur la selle)
set_target(img_col); bpy.ops.object.bake(type="DIFFUSE", pass_filter={"COLOR"}, use_clear=True)
set_target(img_nrm); bpy.ops.object.bake(type="NORMAL", normal_space="TANGENT", use_clear=True)
scene.cycles.samples = 48
set_target(img_ao); bpy.ops.object.bake(type="AO", use_clear=True)
# couleur finale = couleur x occlusion douce
col = np.empty(TEX * TEX * 4, np.float32); ao = np.empty_like(col)
img_col.pixels.foreach_get(col); img_ao.pixels.foreach_get(ao)
col = col.reshape(-1, 4); ao = ao.reshape(-1, 4)
col[:, :3] *= (.3 + .7 * ao[:, :1]) ** .9
img_col.pixels.foreach_set(col.ravel()); img_col.update()

# ---------------------------------------------------------------- matériaux d'export (images cuites)
for m, rough in zip(mats, (.45, .62, .12)):
    nt = m.node_tree; nd, ln = nt.nodes, nt.links; nd.clear()
    out = nd.new("ShaderNodeOutputMaterial"); bsdf = nd.new("ShaderNodeBsdfPrincipled"); ln.new(bsdf.outputs[0], out.inputs[0])
    tci = nd.new("ShaderNodeTexImage"); tci.image = img_col; ln.new(tci.outputs["Color"], bsdf.inputs["Base Color"])
    tni = nd.new("ShaderNodeTexImage"); tni.image = img_nrm
    nm = nd.new("ShaderNodeNormalMap"); ln.new(tni.outputs["Color"], nm.inputs["Color"]); ln.new(nm.outputs[0], bsdf.inputs["Normal"])
    bsdf.inputs["Roughness"].default_value = rough
    if m.name == "Eye":
        ln.new(tci.outputs["Color"], bsdf.inputs["Emission Color"]); bsdf.inputs["Emission Strength"].default_value = 1.0
    if m.name == "Membrane": m.use_backface_culling = False
for n in ("Base", "Mask"):
    a = me.color_attributes.get(n)
    if a: me.color_attributes.remove(a)
img_col.filepath_raw = os.path.join(OUT, "dragon_col.png"); img_col.file_format = "PNG"; img_col.save()
img_nrm.filepath_raw = os.path.join(OUT, "dragon_nrm.png"); img_nrm.file_format = "PNG"; img_nrm.save()

# ---------------------------------------------------------------- export glTF
bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.triangulate(bm, faces=bm.faces[:]); bm.to_mesh(me); bm.free()
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, "dragon.glb"), export_format="GLB", use_selection=True,
                          export_skins=True, export_animations=False, export_morph=False, export_tangents=True,
                          export_image_format=os.environ.get("DRAGON_FMT", "WEBP"), export_image_quality=int(os.environ.get("DRAGON_Q", "80")), export_yup=True, export_apply=False)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "dragon.blend"))
print("GLB:", os.path.getsize(os.path.join(OUT, "dragon.glb")) // 1024, "Ko")

# ---------------------------------------------------------------- rendus d'aperçu
if APERCU:
    world = bpy.data.worlds.new("Ciel"); scene.world = world; world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (.55, .7, .95, 1); world.node_tree.nodes["Background"].inputs[1].default_value = .8
    sun = bpy.data.objects.new("Soleil", bpy.data.lights.new("Soleil", "SUN")); scene.collection.objects.link(sun)
    sun.data.energy = 4; sun.rotation_euler = (math.radians(40), math.radians(15), math.radians(-30))
    cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam")); scene.collection.objects.link(cam); scene.camera = cam
    scene.render.resolution_x, scene.render.resolution_y = 960, 600; scene.cycles.samples = 24; scene.cycles.use_denoising = True
    def shoot(name, loc, target, lens=35):
        cam.location = loc; d = Vector(target) - Vector(loc); cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler(); cam.data.lens = lens
        scene.render.filepath = os.path.join(OUT, name); bpy.ops.render.render(write_still=True)
    shoot("apercu_34.png", (-14, -16, 9), (0, -1, 1.2))
    shoot("apercu_tete.png", (-3.2, -9.5, 3.2), (0, -6, 2.1), 50)
    shoot("apercu_dessus.png", (0, 2, 28), (0, 0, 1), 35)
    shoot("apercu_cavalier.png", (-2.2, -4.9, 2.6), (0, -2.85, 2.2), 45)
    shoot("apercu_cavalier_dos.png", (.6, 1.2, 3.3), (0, -2.8, 2.2), 40)
    shoot("apercu_arriere.png", (0, 14, 6), (0, -2, 2), 40)
    # test du rig : ailes levées, cou tourné
    bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode="POSE")
    for side, sg in (("L", 1), ("R", -1)):
        pb = rig.pose.bones[f"Arm.{side}"]; pb.rotation_mode = "XYZ"
    for pb in rig.pose.bones: pb.rotation_mode = "XYZ"
    rig.pose.bones["Arm.L"].rotation_euler = (0, math.radians(-40), 0)
    rig.pose.bones["Arm.R"].rotation_euler = (0, math.radians(40), 0)
    rig.pose.bones["Neck2"].rotation_euler = (0, 0, math.radians(15))
    rig.pose.bones["Jaw"].rotation_euler = (math.radians(20), 0, 0)
    bpy.ops.object.mode_set(mode="OBJECT")
    shoot("apercu_pose.png", (-14, -16, 9), (0, -1, 1.2))
