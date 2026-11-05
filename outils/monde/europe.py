"""Relief fin de l'Europe (1 minute d'angle, ~1,8 km) pour zoomer sur la France et ses voisins.

Usage : python3 europe.py <dossier Natural Earth> <fichier eu.nc> <dossier de sortie>
  eu.nc : ETOPO1 (NOAA, domaine public), longitudes -12..32, latitudes 35..60, un point par minute
  (voir telecharger.sh). Côtes et lacs : Natural Earth 10m (domaine public).
Sortie : relief_europe.webp, 2640×1500 RGB sans perte, même codage que relief.webp
  (R,G = altitude 16 bits, h = valeur × 2 − 11000 m ; B = part de lac).
"""
import os, sys
import numpy as np
import shapefile
from PIL import Image, ImageDraw
from scipy import ndimage
from scipy.io import netcdf_file
from shapely.geometry import shape, Polygon, MultiPolygon, box

NE, NC, OUT = sys.argv[1:4]
LON0, LON1, LAT0, LAT1 = -12, 32, 35, 60
W, H = 2640, 1500
S = 3

nc = netcdf_file(NC, "r", mmap=False)
alt = nc.variables["altitude"].data.astype(np.float32)[::-1]  # nord en haut
sh, sw = alt.shape
lon = LON0 + (np.arange(W) + .5) / W * (LON1 - LON0)
lat = LAT1 - (np.arange(H) + .5) / H * (LAT1 - LAT0)
LO, LA = np.meshgrid(lon, lat)
h = ndimage.map_coordinates(alt, [(LAT1 - LA) / (LAT1 - LAT0) * (sh - 1), (LO - LON0) / (LON1 - LON0) * (sw - 1)], order=1).astype(np.float32)

cadre = box(LON0 - 1, LAT0 - 1, LON1 + 1, LAT1 + 1)
def frac(nom):
    r = shapefile.Reader(os.path.join(NE, nom, nom))
    im = Image.new("L", (W * S, H * S), 0); d = ImageDraw.Draw(im)
    P = lambda x, y: ((x - LON0) / (LON1 - LON0) * W * S, (LAT1 - y) / (LAT1 - LAT0) * H * S)
    for s in r.shapes():
        g = shape(s.__geo_interface__)
        if not g.intersects(cadre): continue
        g = g.intersection(cadre)
        for p in ([g] if isinstance(g, Polygon) else [x for x in getattr(g, "geoms", []) if isinstance(x, Polygon)]):
            d.polygon([P(x, y) for x, y in p.exterior.coords], fill=255)
            for ri in p.interiors: d.polygon([P(x, y) for x, y in ri.coords], fill=0)
    return np.asarray(im, np.float32).reshape(H, S, W, S).mean((1, 3)) / 255

ft = frac("ne_10m_land"); fl = frac("ne_10m_lakes")
hc = h.copy()
hc[ft >= 1] = np.maximum(h[ft >= 1], 4)
hc[ft <= 0] = np.minimum(h[ft <= 0], -4)
c = (ft > 0) & (ft < 1)
hc[c] = (ft[c] - .5) * 60
fond = hc < -300
hl = ndimage.gaussian_filter(np.where(hc < 0, hc, 0), 2)
hc[fond] = np.minimum(np.round(hl[fond] / 50) * 50, -300)
code = np.clip(np.round((hc + 11000) / 2), 0, 65535).astype(np.uint32)
rel = np.stack([(code >> 8).astype(np.uint8), (code & 255).astype(np.uint8), np.clip(fl * 255, 0, 255).astype(np.uint8)], -1)
Image.fromarray(rel, "RGB").save(os.path.join(OUT, "relief_europe.webp"), lossless=True, method=6)
print("relief_europe.webp", os.path.getsize(os.path.join(OUT, "relief_europe.webp")) // 1024, "Ko")
