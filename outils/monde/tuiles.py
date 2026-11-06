"""Tuiles fines de My World Explorer : relief et couleurs à 1 minute d'angle (~1,8 km), 4 fois plus fins que les cartes du monde.

Le monde est découpé en tuiles de 10° × 10° (600 × 600 pixels). Le jeu charge seulement les tuiles autour de l'endroit
regardé (fenêtre de 4 × 4 tuiles). Seules les tuiles qui contiennent de la terre existent ; ailleurs, le jeu garde la carte du monde.

Usage : python3 tuiles.py <dossier Natural Earth> <dossier des t_<lat>_<lon>.nc> <inter.npz> <monde/donnees>
  - t_<lat>_<lon>.nc : ETOPO 2022 (NOAA, CC0), un point par minute d'angle (voir telecharger.sh) ;
  - inter.npz : couleurs des paysages sans relief, faites par fabriquer.py (variable MONDE_INTER) ;
  - Natural Earth 10m (domaine public) : côtes et lacs fins.
Sorties : tuiles/r_<lat>_<lon>.webp (relief, même codage que relief.webp), tuiles/c_<lat>_<lon>.jpg (couleurs),
          tuiles/index.json (liste des tuiles).
"""
import glob, json, os, sys
import numpy as np
import shapefile
from PIL import Image, ImageDraw
from scipy import ndimage
from scipy.io import netcdf_file
from shapely.geometry import shape, box, Polygon
from shapely.strtree import STRtree

NE, NCD, INTER, OUT = sys.argv[1:5]
T = 600            # pixels par tuile (10°)
S = 3              # sur-échantillonnage des côtes
os.makedirs(os.path.join(OUT, "tuiles"), exist_ok=True)
inter = np.load(INTER)
BASE, FINAL = inter["base"].astype(np.float32), inter["final"].astype(np.float32)
GLACE, FVILLE, N3, BANQ = inter["glace"].astype(np.float32), inter["fville"].astype(np.float32), inter["n3"].astype(np.float32), inter["banq"].astype(np.float32)
GH, GW = BASE.shape[:2]
# la carte du monde est noire sur la mer : on y prolonge la couleur de la terre voisine (les côtes fines dépassent les grossières)
_vide = BASE.sum(-1) < 1
_, (_iy, _ix) = ndimage.distance_transform_edt(_vide, return_indices=True)
BASE = BASE[_iy, _ix]

def formes(nom):
    r = shapefile.Reader(os.path.join(NE, nom, nom))
    g = [shape(s.__geo_interface__).buffer(0) for s in r.shapes()]
    return g, STRtree(g)
TERRES, ARB_T = formes("ne_10m_land")
LACS, ARB_L = formes("ne_10m_lakes")
PLATES = [shape(s.__geo_interface__).buffer(0) for s in shapefile.Reader(os.path.join(NE, "ne_50m_antarctic_ice_shelves_polys", "ne_50m_antarctic_ice_shelves_polys")).shapes()]

def fraction(geoms, arbre, la, lo):
    cadre = box(lo - .05, la - .05, lo + 10.05, la + 10.05)
    im = Image.new("L", (T * S, T * S), 0); d = ImageDraw.Draw(im)
    P = lambda x, y: ((x - lo) / 10 * T * S, (la + 10 - y) / 10 * T * S)
    for i in arbre.query(cadre):
        g = geoms[i].intersection(cadre)
        for p in ([g] if isinstance(g, Polygon) else [x for x in getattr(g, "geoms", []) if isinstance(x, Polygon)]):
            if p.is_empty or len(p.exterior.coords) < 3: continue
            d.polygon([P(x, y) for x, y in p.exterior.coords], fill=255)
            for r in p.interiors:
                if len(r.coords) >= 3: d.polygon([P(x, y) for x, y in r.coords], fill=0)
    return np.asarray(im, np.float32).reshape(T, S, T, S).mean((1, 3)) / 255

def global_vers_tuile(A, LA, LO, ordre=1):  # échantillonne une carte du monde 4096×2048 aux pixels de la tuile
    y = (90 - LA) / 180 * GH - .5; x = ((LO + 180) / 360 * GW - .5) % GW
    if A.ndim == 2: return ndimage.map_coordinates(A, [y, x], order=ordre, mode="nearest")
    return np.stack([ndimage.map_coordinates(A[..., c], [y, x], order=ordre, mode="nearest") for c in range(A.shape[2])], -1)

rng = np.random.default_rng(5)
def bruit(T, cellules, graine):
    g = np.random.default_rng(graine).random((cellules + 3, cellules + 3)).astype(np.float32)
    a = np.asarray(Image.fromarray(g, "F").resize((T * (cellules + 3) // cellules, T * (cellules + 3) // cellules), Image.BICUBIC))[:T, :T]
    return (a - a.mean()) / (a.std() + 1e-6)

index = []
for f in sorted(glob.glob(os.path.join(NCD, "t_*.nc"))):
    la, lo = map(int, os.path.basename(f)[2:-3].split("_"))
    if os.environ.get("MONDE_GARDER") and all(os.path.exists(os.path.join(OUT, "tuiles", f"{k}_{la}_{lo}.{e}")) for k, e in (("r", "webp"), ("c", "jpg"))):
        index.append([la, lo]); continue   # déjà faite (pour reprendre un travail interrompu)
    nc = netcdf_file(f, "r", mmap=False)
    z = nc.variables["z"].data.astype(np.float32); la_, lo_ = nc.variables["latitude"].data, nc.variables["longitude"].data
    lat = la + 10 - (np.arange(T) + .5) / T * 10; lon = lo + (np.arange(T) + .5) / T * 10
    LO, LA = np.meshgrid(lon, lat)
    h = ndimage.map_coordinates(z, [(LA - la_[0]) / ((la_[-1] - la_[0]) / (len(la_) - 1)), (LO - lo_[0]) / ((lo_[-1] - lo_[0]) / (len(lo_) - 1))], order=1, mode="nearest")
    ft = fraction(TERRES, ARB_T, la, lo)
    if la < -55:   # plateformes de glace de l'Antarctique : comptées comme terre gelée
        ft = np.maximum(ft, fraction(PLATES, STRtree(PLATES), la, lo))
    fl = fraction(LACS, ARB_L, la, lo)
    if ft.max() <= 0: continue
    hc = h.copy()
    hc[ft >= 1] = np.maximum(h[ft >= 1], 4); hc[ft <= 0] = np.minimum(h[ft <= 0], -4)
    c = (ft > 0) & (ft < 1); hc[c] = (ft[c] - .5) * 60
    fond = hc < -300
    hl = ndimage.gaussian_filter(np.where(hc < 0, hc, 0), 2); hc[fond] = np.minimum(np.round(hl[fond] / 50) * 50, -300)
    code = np.clip(np.round((hc + 11000) / 2), 0, 65535).astype(np.uint32)
    rel = np.stack([(code >> 8).astype(np.uint8), (code & 255).astype(np.uint8), np.clip(fl * 255, 0, 255).astype(np.uint8)], -1)
    Image.fromarray(rel, "RGB").save(os.path.join(OUT, "tuiles", f"r_{la}_{lo}.webp"), lossless=True, method=6)
    # ---- couleurs : paysages de la carte du monde, relief et côtes fins
    terre = ft >= .5
    col = global_vers_tuile(BASE, LA, LO, 3)
    col = ndimage.gaussian_filter(col, (1.2, 1.2, 0))
    col *= (1 + (bruit(T, 24, (la + 90) * 97 + lo + 180) * .05 + bruit(T, 90, (la + 90) * 31 + lo + 187) * .035))[..., None]
    n3 = global_vers_tuile(N3, LA, LO)
    glace = global_vers_tuile(GLACE, LA, LO) > .5
    hh = np.where(terre, hc, 0)
    # pente (valleys plus vertes, versants raides rocheux)
    dy = 10 / T * 111.0
    gy, gx = np.gradient(hh / 1000.0, dy, dy)
    gx = gx / np.maximum(np.cos(np.radians(LA)), .05)
    pente = np.clip(np.hypot(gx, gy) * 4, 0, 1)
    courb = hh - ndimage.gaussian_filter(hh, 4)
    t1 = np.clip((hh - 1200) / 1600, 0, 1)[..., None] * (~glace)[..., None]
    col = col * (1 - t1 * .75) + np.array([132, 116, 92], np.float32) * t1 * .75
    t2 = np.clip((hh - 3000) / 1500, 0, 1)[..., None] * (~glace)[..., None]
    col = col * (1 - t2 * .7) + np.array([142, 134, 126], np.float32) * t2 * .7
    roc = (np.clip((pente - .35) / .4, 0, 1) * (hh > 300))[..., None] * (~glace)[..., None]
    col = col * (1 - roc * .55) + np.array([120, 112, 102], np.float32) * roc * .55
    col *= (1 + np.clip(-courb / 400, -.12, .12) * .6)[..., None]   # creux un peu plus verts et sombres, crêtes plus claires
    alat = np.abs(LA)
    neige = np.where(alat < 35, 5500 - alat * 5, 5325 - (alat - 35) * 125)
    tn = np.clip((hh - neige) / 450 + n3 * .3 - roc[..., 0] * .5, 0, 1)[..., None] * terre[..., None]
    col = col * (1 - tn) + np.array([246, 248, 251], np.float32) * tn
    gl = np.clip((ndimage.gaussian_filter(global_vers_tuile(GLACE, LA, LO), 3) - .3) / .4, 0, 1)[..., None] * terre[..., None]
    col = col * (1 - gl) + (np.array([234, 241, 247], np.float32) * (1 + n3[..., None] * .025) * (1 - .06 * pente[..., None])) * gl
    fv = (global_vers_tuile(FVILLE, LA, LO) * terre * (~glace))[..., None]
    col = col * (1 - fv * .45) + np.array([150, 140, 128], np.float32) * fv * .45
    mer = ~terre
    col[mer] = global_vers_tuile(FINAL, LA, LO)[mer]
    if mer.any() and terre.any():   # sans banquise, la mer près des côtes prend la couleur de la terre voisine
        banq = global_vers_tuile(BANQ, LA, LO)
        dist, (iy, ix) = ndimage.distance_transform_edt(mer, return_indices=True)
        bord = mer & (banq < .05) & (dist < 10)
        col[bord] = col[iy[bord], ix[bord]]
    Image.fromarray(np.clip(col, 0, 255).astype(np.uint8), "RGB").save(os.path.join(OUT, "tuiles", f"c_{la}_{lo}.jpg"), quality=84)
    index.append([la, lo])
    print(la, lo, flush=True)
json.dump(dict(taille=T, degres=10, tuiles=index), open(os.path.join(OUT, "tuiles", "index.json"), "w"), separators=(",", ":"))
tot = sum(os.path.getsize(p) for p in glob.glob(os.path.join(OUT, "tuiles", "*")))
print(len(index), "tuiles,", tot // 1024 // 1024, "Mo")
