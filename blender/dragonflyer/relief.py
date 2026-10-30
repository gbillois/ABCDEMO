# DragonFlyer : relief de l'archipel (îles façon Lofoten), fabriqué par le code.
#  1. formes des îles (ellipses déformées par du bruit), plaine côtière, plateau sous-marin ;
#  2. montagnes : bruit « ridged multifractal » déformé (crêtes vives), montagne tabulaire, collines ;
#  3. érosion hydraulique par gouttes (des centaines de milliers de gouttes, calcul vectorisé numpy)
#     puis érosion thermique (éboulis) : ravines, cônes de déjection, crêtes réalistes ;
#  4. sortie : relief.png (R = octet haut, G = octet bas de la hauteur sur 16 bits, B = humidité/écoulement)
#     + apercu_relief.png (ombrage) pour vérifier.
# Lancer : python3 relief.py <dossier_de_sortie> [taille_en_pixels]
import sys, os, math, time
import numpy as np
from PIL import Image

OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp/relief"
N = int(sys.argv[2]) if len(sys.argv) > 2 else 1024
os.makedirs(OUT, exist_ok=True)
SIZE = 6144.0                 # côté du monde en mètres
CELL = SIZE / N
H_MIN, H_MAX = -120.0, 1180.0  # bornes d'encodage (doivent rester celles du jeu)
t0 = time.time()

# ---------------------------------------------------------------- bruit de gradient (Perlin) vectorisé
class Perlin:
    def __init__(s, seed):
        r = np.random.default_rng(seed)
        s.p = np.concatenate([r.permutation(256)] * 2)
        a = r.random(256) * 2 * np.pi; s.gx, s.gy = np.cos(a), np.sin(a)
    def __call__(s, x, y):
        xi, yi = np.floor(x).astype(np.int64), np.floor(y).astype(np.int64)
        xf, yf = x - xi, y - yi; xi &= 255; yi &= 255
        def g(ix, iy, dx, dy):
            h = s.p[s.p[ix & 255] + (iy & 255)]; return s.gx[h] * dx + s.gy[h] * dy
        u = xf * xf * xf * (xf * (xf * 6 - 15) + 10); v = yf * yf * yf * (yf * (yf * 6 - 15) + 10)
        n00, n10 = g(xi, yi, xf, yf), g(xi + 1, yi, xf - 1, yf)
        n01, n11 = g(xi, yi + 1, xf, yf - 1), g(xi + 1, yi + 1, xf - 1, yf - 1)
        a = n00 + (n10 - n00) * u; b = n01 + (n11 - n01) * u
        return (a + (b - a) * v) * 1.41

NOISES = [Perlin(100 + k) for k in range(12)]
def fbm(x, y, octaves=6, seed=0, lac=2.0, gain=.5):
    s, amp, f, tot = 0, 1.0, 1.0, 0
    for o in range(octaves):
        s = s + NOISES[(seed + o) % 12](x * f + o * 17.3, y * f - o * 9.1) * amp; tot += amp; amp *= gain; f *= lac
    return s / tot

def ridged(x, y, octaves=7, seed=3, lac=2.05, gain=.52):
    """Ridged multifractal (Musgrave) : crêtes vives, la rugosité dépend des octaves précédentes."""
    s, amp, f, w, tot = 0, 1.0, 1.0, 1.0, 0
    for o in range(octaves):
        n = 1 - np.abs(NOISES[(seed + o) % 12](x * f + o * 31.7, y * f + o * 13.3))
        n = n * n; n = n * w
        w = np.clip(n * 2.0, 0, 1)
        s = s + n * amp; tot += amp; amp *= gain; f *= lac
    return s / tot

def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)

# ---------------------------------------------------------------- grille du monde (x vers l'est, z vers le sud)
c = (np.arange(N) + .5) * CELL - SIZE / 2
X, Z = np.meshgrid(c, c)

# déformation de domaine commune (côtes découpées, crêtes sinueuses)
wx = fbm(X / 1000, Z / 1000, 4, 1) * 420 + fbm(X / 260, Z / 260, 3, 5) * 60
wz = fbm(X / 1000 + 7.7, Z / 1000 - 3.1, 4, 2) * 420 + fbm(X / 260 + 2, Z / 260 + 9, 3, 6) * 60
XW, ZW = X + wx, Z + wz

# cx, cz, rx, rz, rotation (deg), hauteur des sommets, type
ISLANDS = [
    (-250, 150, 2050, 1000, 28, 1010, "alpes"),
    (1750, -1550, 820, 600, -20, 600, "table"),
    (-1950, 1650, 820, 600, 40, 600, "alpes"),
    (950, 1550, 560, 400, 10, 380, "alpes"),
    (-1600, -1450, 620, 430, -35, 470, "alpes"),
    (2350, 650, 360, 280, 0, 190, "colline"),
    (-2550, 50, 330, 240, 0, 170, "colline"),
    (250, -2250, 420, 280, 15, 300, "alpes"),
]
rng = np.random.default_rng(7)

def island_dist(cx, cz, rx, rz, rot):
    a = math.radians(rot); dx, dz = XW - cx, ZW - cz
    u = (dx * math.cos(a) + dz * math.sin(a)) / rx; v = (-dx * math.sin(a) + dz * math.cos(a)) / rz
    return np.sqrt(u * u + v * v)

# vallées glaciaires en U (longues, sinueuses) : là où le bruit passe par zéro ; noyées près des côtes = fjords
XV, ZV = X + wx * 1.6, Z + wz * 1.6
v1 = np.abs(fbm(XV / 2100, ZV / 2100, 3, 20)); v2 = np.abs(fbm(XV / 1100 + 5.3, ZV / 1100 - 2.1, 3, 21))
VALLEY = np.maximum(1 - smooth(0, .11, v1), .75 * (1 - smooth(0, .075, v2)))

H = np.full((N, N), -95.0) + fbm(X / 1500, Z / 1500, 3, 8) * 20
INLAND = np.full((N, N), -1.0)
MOUNT = np.zeros((N, N))      # montagnes non érodées par le modèle (table, collines)
UPL = np.zeros((N, N))        # soulèvement (mètres visés) des massifs alpins, sculptés ensuite par les rivières
for (cx, cz, rx, rz, rot, hp, kind) in ISLANDS:
    d = island_dist(cx, cz, rx, rz, rot) * (1 + .22 * fbm(X / 520 + cx, Z / 520 + cz, 5, 9))
    m_in = 1 - d                                            # 0 à la côte, 1 au centre
    INLAND = np.maximum(INLAND, m_in)
    edge = .02 + .3 * smooth(-.4, .5, fbm(X / 800 - cx, Z / 800 + cz, 3, 12))   # montagnes parfois jusqu'à la mer
    if kind == "alpes":
        mp = smooth(edge, edge + .42, m_in)
        big = .5 + .5 * smooth(-.35, .45, fbm(X / 1300 + cx, Z / 1300 - cz, 3, 10))
        r = ridged(XW / 1150, ZW / 1150, 8, 3)
        UPL = np.maximum(UPL, hp * smooth(0, .35, mp) * big * (.75 + .5 * r))
        m = 0 * mp
    elif kind == "table":
        m2 = 1 - island_dist(cx, cz, rx, rz, rot) * (1 + .07 * fbm(X / 200, Z / 200, 3, 2))
        top = hp * (.93 + .07 * fbm(X / 400, Z / 400, 4, 5))
        m = top * smooth(.2, .34, m2) + hp * .15 * smooth(.02, .3, m2) * ridged(X / 300, Z / 300, 5, 6)
    else:
        m = hp * smooth(.02, .8, m_in) ** 2 * (.6 + .4 * fbm(X / 350 + cx, Z / 350, 5, 7))
    MOUNT = np.maximum(MOUNT, m)

# plaine côtière (strandflat) de largeur variable, plateau sous-marin, fjords
low = np.where(INLAND > 0, 2.5 + 15 * smooth(0, .22, INLAND) + 5 * fbm(X / 300, Z / 300, 4, 4) * smooth(0, .1, INLAND),
               -np.minimum(95, -INLAND * 650 * .16) - 1.5)
fj = VALLEY * smooth(-.05, .25, INLAND) * (1 - smooth(.35, .6, INLAND))
low = low - 48 * fj

# ---------------------------------------------------------------- modèle « stream power » (FastScape, Braun & Willett 2013)
# Les massifs se soulèvent ; chaque rivière creuse selon la surface qu'elle draine (A^0.5) et la pente :
# réseau de vallées ramifiées, crêtes en arêtes, couloirs. Calcul sur une grille de 512 (mailles de 12 m).
def down(a, f): n = a.shape[0] // f; return a.reshape(n, f, n, f).mean(axis=(1, 3))
def up(a, f):
    n = a.shape[0]; c = (np.arange(n * f) + .5) / f - .5
    i0 = np.clip(np.floor(c).astype(int), 0, n - 1); i1 = np.clip(i0 + 1, 0, n - 1); t = np.clip(c - np.floor(c), 0, 1)
    rows = a[i0] * (1 - t)[:, None] + a[i1] * t[:, None]
    return rows[:, i0] * (1 - t)[None, :] + rows[:, i1] * t[None, :]

R = min(512, N); FR = N // R; cR = SIZE / R
lowR = down(low, FR); uR = down(UPL * (1 - .75 * VALLEY), FR)
fixe = (lowR <= 0.5) | (uR < 1)
hR = lowR + np.where(fixe, 0, np.random.default_rng(3).random((R, R)) * 3)
OFFS = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
DOFF = [math.hypot(a, b) * cR for a, b in OFFS]
idx = np.arange(R * R).reshape(R, R)
K = float(os.environ.get("FS_K", "0.035")); ETAPES = int(os.environ.get("FS_ETAPES", "260"))
taux = uR / ETAPES * 2.2                    # soulèvement par étape
fixl = fixe.ravel().tolist()
talusR = math.tan(math.radians(44)) * cR
for etape in range(ETAPES):
    hR = np.where(fixe, hR, hR + taux)
    hp_ = np.pad(hR, 1, mode="edge")
    best = np.zeros((R, R)); rec = idx.copy(); drec = np.full((R, R), cR)
    for (dy, dx), dd in zip(OFFS, DOFF):
        sl = (hR - hp_[1 + dy:R + 1 + dy, 1 + dx:R + 1 + dx]) / dd
        m = sl > best; best = np.where(m, sl, best); rec = np.where(m, np.clip(idx + dy * R + dx, 0, R * R - 1), rec); drec = np.where(m, dd, drec)
    order = np.argsort(hR.ravel(), kind="stable").tolist()
    rl = rec.ravel().tolist(); dl = drec.ravel().tolist()
    A = [cR * cR] * (R * R)
    for i in reversed(order):
        r_ = rl[i]
        if r_ != i: A[r_] += A[i]
    hl = hR.ravel().tolist()
    for i in order:
        r_ = rl[i]
        if r_ == i or fixl[i]: continue
        f = K * math.sqrt(A[i]) / dl[i]
        hl[i] = (hl[i] + f * hl[r_]) / (1 + f)
    hR = np.array(hl).reshape(R, R)
    # versants : pas plus raides que l'éboulis
    for (oy, ox) in ((0, 1), (1, 0), (0, -1), (-1, 0)):
        d = hR - np.roll(hR, (oy, ox), (0, 1)); mv = np.where((d > talusR) & ~fixe, (d - talusR) * .25, 0)
        hR = hR - mv + np.where(np.roll(fixe, (-oy, -ox), (0, 1)), 0, np.roll(mv, (-oy, -ox), (0, 1)))
    if etape % 40 == 0: print(f"  FastScape {etape}/{ETAPES} : max {hR.max():.0f} m ({time.time() - t0:.0f}s)")
AREA = np.array(A).reshape(R, R)
mont = np.maximum(hR - lowR, 0)
cible = min(860.0, np.percentile(UPL[UPL > 0], 99.7))
mont *= cible / max(1, np.percentile(mont, 99.9))
print(f"FastScape : {time.time() - t0:.1f}s, sommets {mont.max():.0f} m")
monts = up(mont, FR)
# détail fin sur les massifs (arêtes, petits ressauts)
detail = (ridged(XW / 260, ZW / 260, 5, 13) - .45) * 34 + fbm(X / 90, Z / 90, 4, 14) * 9
MOUNT = np.maximum(MOUNT, monts + detail * smooth(15, 120, monts))
H = np.maximum(H, low + MOUNT)
LAND = smooth(0, .45, INLAND)

# rochers isolés : écueils et aiguilles (stacks)
for k in range(46):
    cx, cz = rng.uniform(-2900, 2900, 2)
    near = H[int((cz + SIZE / 2) / CELL), int((cx + SIZE / 2) / CELL)]
    if not (-45 < near < -4): continue
    stack = k % 4 == 0
    r = rng.uniform(25, 60) if stack else rng.uniform(40, 130)
    hh = rng.uniform(55, 150) if stack else rng.uniform(3, 18)
    d = np.sqrt((XW - cx - wx * .5) ** 2 + (ZW - cz - wz * .5) ** 2) / r
    prof = smooth(1.0, .55, d) if stack else smooth(1.0, .1, d) ** 1.5
    H = np.maximum(H, np.where(prof > 0, -6 + (hh + 6) * prof * (1 + .15 * fbm(X / 40, Z / 40, 3, k)), -1e9))

print(f"formes : {time.time() - t0:.1f}s  min {H.min():.0f}  max {H.max():.0f}")

# ---------------------------------------------------------------- érosion hydraulique (gouttes, vectorisée)
def erode(H, n_drops, steps=70, seed=1, scale=300.0, cell=None):
    cell = cell or CELL; W = H.shape[0]
    scale = scale * cell / 6.0
    h = (H / scale).astype(np.float64).ravel().copy()
    flow = np.zeros_like(h); dep = np.zeros_like(h)
    inertia, cap_k, min_cap, dep_k, ero_k, evap, grav = .06, 5.0, .006, .25, .35, .015, 6.0
    r = np.random.default_rng(seed); batch = 30000; done = 0; max_step = 1.5 / scale
    land_idx = np.flatnonzero(H.ravel() > 4)
    while done < n_drops:
        nb = min(batch, n_drops - done); done += nb
        pick = land_idx[r.integers(0, len(land_idx), nb)]
        px = (pick % W) + r.random(nb); py = (pick // W) + r.random(nb)
        dx = np.zeros(nb); dy = np.zeros(nb); vel = np.ones(nb); water = np.ones(nb); sed = np.zeros(nb)
        alive = np.ones(nb, bool)
        for _ in range(steps):
            ix = np.clip(px.astype(np.int64), 0, W - 2); iy = np.clip(py.astype(np.int64), 0, W - 2)
            fx, fy = px - ix, py - iy; i00 = iy * W + ix
            h00, h10, h01, h11 = h[i00], h[i00 + 1], h[i00 + W], h[i00 + W + 1]
            gx = (h10 - h00) * (1 - fy) + (h11 - h01) * fy; gy = (h01 - h00) * (1 - fx) + (h11 - h10) * fx
            hcur = h00 * (1 - fx) * (1 - fy) + h10 * fx * (1 - fy) + h01 * (1 - fx) * fy + h11 * fx * fy
            dx = dx * inertia - gx * (1 - inertia); dy = dy * inertia - gy * (1 - inertia)
            ln = np.sqrt(dx * dx + dy * dy); ok = ln > 1e-9
            dx = np.where(ok, dx / np.maximum(ln, 1e-9), 0); dy = np.where(ok, dy / np.maximum(ln, 1e-9), 0)
            nx, ny = px + dx, py + dy
            out = (nx < 1) | (ny < 1) | (nx > W - 2) | (ny > W - 2) | ~ok
            alive &= ~out
            if not alive.any(): break
            nix = np.clip(nx.astype(np.int64), 0, W - 2); niy = np.clip(ny.astype(np.int64), 0, W - 2)
            nfx, nfy = nx - nix, ny - niy; j00 = niy * W + nix
            hnew = h[j00] * (1 - nfx) * (1 - nfy) + h[j00 + 1] * nfx * (1 - nfy) + h[j00 + W] * (1 - nfx) * nfy + h[j00 + W + 1] * nfx * nfy
            dh = hnew - hcur
            cap = np.maximum(-dh * vel * water * cap_k, min_cap)
            w4 = np.stack([(1 - fx) * (1 - fy), fx * (1 - fy), (1 - fx) * fy, fx * fy])
            idx4 = np.stack([i00, i00 + 1, i00 + W, i00 + W + 1])
            depo = (sed > cap) | (dh > 0)
            amt_dep = np.where(dh > 0, np.minimum(dh * .5, sed), (sed - cap) * dep_k)
            amt_dep = np.where(depo & alive, amt_dep, 0)
            amt_ero = np.where(~depo & alive, np.minimum(np.minimum((cap - sed) * ero_k, np.maximum(-dh, 0) * .5), max_step), 0)
            # au bord de la mer, la goutte se perd (pas de creusement sous l'eau)
            sea = hcur * scale < 0.5
            amt_ero = np.where(sea, 0, amt_ero); amt_dep = np.where(sea & alive, sed * .5, amt_dep)
            sed = sed + amt_ero - amt_dep
            delta = (amt_dep - amt_ero)[None, :] * w4
            np.add.at(h, idx4.ravel(), delta.ravel())
            np.add.at(dep, idx4.ravel(), np.maximum(delta, 0).ravel())
            np.add.at(flow, i00[alive], water[alive])
            vel = np.sqrt(np.maximum(vel * vel - dh * grav, 0)); water *= (1 - evap)
            px, py = np.where(alive, nx, px), np.where(alive, ny, py)
    return (h * scale).reshape(W, W), flow.reshape(W, W), (dep * scale).reshape(W, W)

def blur(a, r=1):
    out = a.copy()
    for _ in range(r):
        out = (out + np.roll(out, 1, 0) + np.roll(out, -1, 0) + np.roll(out, 1, 1) + np.roll(out, -1, 1)) / 5
    return out

def down(a, f): n = a.shape[0] // f; return a.reshape(n, f, n, f).mean(axis=(1, 3))
def up(a, f):
    n = a.shape[0]; c = (np.arange(n * f) + .5) / f - .5
    i0 = np.clip(np.floor(c).astype(int), 0, n - 1); i1 = np.clip(i0 + 1, 0, n - 1); t = np.clip(c - np.floor(c), 0, 1)
    rows = a[i0] * (1 - t)[:, None] + a[i1] * t[:, None]
    return rows[:, i0] * (1 - t)[None, :] + rows[:, i1] * t[None, :]

H0 = H.copy()
# 2) érosion fine à pleine résolution
n_drops = int(N * N * float(os.environ.get("GOUTTES", "0.9")))
H, FLOW, DEP = erode(H, n_drops)
FLOW += up(np.log1p(AREA / (cR * cR)), FR) * 40
print(f"érosion : {time.time() - t0:.1f}s, {n_drops} gouttes, variation max {np.abs(H - H0).max():.1f} m")
# petite seconde passe, gouttes plus fines (ravines)
H, FLOW2, DEP2 = erode(H, n_drops // 2, 40, 2, 120.0)
FLOW += FLOW2; DEP += DEP2

# érosion thermique : les pentes trop raides s'éboulent un peu (talus)
talus = math.tan(math.radians(50)) * CELL
for it in range(25):
    for (oy, ox) in ((0, 1), (1, 0), (0, -1), (-1, 0)):
        nb = np.roll(H, (oy, ox), (0, 1)); d = H - nb
        move = np.where(d > talus, (d - talus) * .2, 0)
        H = H - move + np.roll(move, (-oy, -ox), (0, 1))
H = np.where(H0 < -2, np.minimum(H, H0 * .3 + H * .7), H)   # fond marin : rester proche
print(f"thermique : {time.time() - t0:.1f}s  min {H.min():.0f}  max {H.max():.0f}")

# ---------------------------------------------------------------- humidité / écoulement
wet = np.log1p(FLOW) / np.log1p(np.percentile(FLOW[FLOW > 0], 99.5))
wet = np.clip(np.maximum(blur(wet, 2), np.clip(DEP / 2.0, 0, 1) * .6), 0, 1)

# ---------------------------------------------------------------- écriture
q = np.clip(np.round((H - H_MIN) / (H_MAX - H_MIN) * 65535), 0, 65535).astype(np.uint16)
img = np.zeros((N, N, 3), np.uint8)
img[..., 0] = q >> 8; img[..., 1] = q & 255; img[..., 2] = np.round(wet * 255).astype(np.uint8)
Image.fromarray(img, "RGB").save(os.path.join(OUT, "relief.png"), optimize=True)
Image.fromarray(img, "RGB").save(os.path.join(OUT, "relief.webp"), lossless=True, quality=100, method=6)
np.save(os.path.join(OUT, "relief.npy"), H.astype(np.float32))

# aperçu : ombrage + couleurs
gy, gx = np.gradient(H, CELL)
nx_, ny_, nz_ = -gx, np.ones_like(H), -gy
ln = np.sqrt(nx_ ** 2 + ny_ ** 2 + nz_ ** 2); nx_, ny_, nz_ = nx_ / ln, ny_ / ln, nz_ / ln
L = np.array([-.5, .6, -.6]); L /= np.linalg.norm(L)
shade = np.clip(nx_ * L[0] + ny_ * L[1] + nz_ * L[2], 0, 1)
col = np.zeros((N, N, 3))
slope = 1 - ny_
grass = np.array([.38, .5, .22]); rock = np.array([.45, .44, .42]); sand = np.array([.8, .75, .6]); snow = np.array([.95, .96, 1]); sea = np.array([.05, .2, .35])
w_rock = smooth(.18, .35, slope)
base = grass * (1 - w_rock[..., None]) + rock * w_rock[..., None]
base = np.where((H < 4)[..., None], sand, base)
base = np.where(((H > 650) & (slope < .35))[..., None], snow, base)
col = base * (.25 + .85 * shade[..., None])
col = np.where((H < 0)[..., None], sea * (1 + H[..., None] / 200) + np.array([0, .25, .25]) * np.clip(1 + H / 15, 0, 1)[..., None], col)
Image.fromarray((np.clip(col, 0, 1) ** (1 / 1.4) * 255).astype(np.uint8)).save(os.path.join(OUT, "apercu_relief.png"))
print(f"fini : {time.time() - t0:.1f}s ; png {os.path.getsize(os.path.join(OUT, 'relief.png')) // 1024} Ko, webp {os.path.getsize(os.path.join(OUT, 'relief.webp')) // 1024} Ko")
