"""Frontières « vues par » chaque pays (Natural Earth, points de vue officiels, domaine public).

Certains pays imposent leur tracé (Cachemire pour l'Inde, Taïwan pour la Chine, Sahara occidental pour le Maroc…).
Le jeu demande où habite l'enfant et applique ces différences sur la carte de base (frontières de fait).

Usage : python3 frontieres.py <dossier des ne_10m_admin_0_countries[_xxx]> <monde/donnees>
Sortie : frontieres.json = { "traces": [tracés partagés], "pov": { "<pays>": { "chg": [{a3, n, t}], "abs": [a3], "rle": [[début, longueur, id], …] } } }
  (t : numéro du tracé dans "traces", un même tracé sert à plusieurs points de vue)
  - chg : pays dont le tracé change (nouveau contour, nom français) ; abs : pays absents de ce point de vue ;
  - rle : pixels de ids.png (canal rouge, 4096×2048) qui changent de pays.
"""
import json, os, sys
import numpy as np
import shapefile
from PIL import Image, ImageDraw
from shapely.geometry import shape, Polygon, MultiPolygon
from shapely.ops import unary_union

SRC, OUT = sys.argv[1:3]
W, H = 4096, 2048
# (pas Taïwan : son point de vue officiel rattache toute la Chine à Taïwan, déroutant pour un enfant)
POVS = "arg bdg bra chn deu egy esp fra gbr grc idn ind isr ita jpn kor mar nep nld pak pol prt pse rus sau swe tur ukr usa vnm".split()

def lire(nom):
    r = shapefile.Reader(os.path.join(SRC, nom, nom), encoding="utf-8")
    d = {}
    for s, rec in zip(r.shapes(), r.records()):
        g = shape(s.__geo_interface__).buffer(0)
        a3 = rec["ADM0_A3"]
        d[a3] = (unary_union([d[a3][0], g]) if a3 in d else g, rec)
    return d

def polys(g):
    if isinstance(g, Polygon): return [g]
    return [p for p in getattr(g, "geoms", []) if isinstance(p, Polygon)]

def px(x, y): return ((x + 180) / 360 * W, (90 - y) / 180 * H)

def traces(g, tol=.04):
    out = []
    for p in polys(g.simplify(tol, preserve_topology=True)):
        for ring in [p.exterior, *p.interiors]:
            c = [[round(x, 2), round(y, 2)] for x, y in ring.coords]
            if len(c) >= 2: out.append(c)
    return out

monde = json.load(open(os.path.join(OUT, "monde.json")))
ID = {p["a3"]: p["id"] for p in monde["pays"]}
ids = np.asarray(Image.open(os.path.join(OUT, "ids.png")).convert("RGB"))
base_r = ids[..., 0].copy(); terre = ids[..., 2] < 10
base = lire("ne_10m_admin_0_countries")
res = {}
TRACES, CLE = [], {}
def ref(tr):
    k = json.dumps(tr)
    if k not in CLE: CLE[k] = len(TRACES); TRACES.append(tr)
    return CLE[k]
for pov in POVS:
    d = lire(f"ne_10m_admin_0_countries_{pov}")
    chg, gagne = [], []
    for a3, (g, rec) in d.items():
        if a3 not in ID: continue
        b = base.get(a3)
        if b is not None:
            diff = g.symmetric_difference(b[0])
            if diff.area < .02: continue
            plus = g.difference(b[0])
        else:
            plus = g
        chg.append(dict(a3=a3, n=rec["NAME_FR"] or rec["NAME"], t=ref(traces(g))))
        if plus.area > .005: gagne.append((ID[a3], plus))
    absents = [a3 for a3 in base if a3 not in d and a3 in ID]
    r = base_r.copy()
    im = Image.new("L", (W, H), 0); dr = ImageDraw.Draw(im)
    for pid, g in gagne:
        for p in polys(g):
            dr.polygon([px(x, y) for x, y in p.exterior.coords], fill=pid)
            for ri in p.interiors: dr.polygon([px(x, y) for x, y in ri.coords], fill=0)
    peint = np.asarray(im)
    m = (peint > 0) & terre
    r[m] = peint[m]
    flat_a, flat_b = base_r.ravel(), r.ravel()
    diff_idx = np.nonzero(flat_a != flat_b)[0]
    rle = []
    for i in diff_idx:
        v = int(flat_b[i])
        if rle and rle[-1][0] + rle[-1][1] == i and rle[-1][2] == v: rle[-1][1] += 1
        else: rle.append([int(i), 1, v])
    res[pov] = dict(chg=chg, abs=absents, rle=rle)
    print(pov, "pays changés :", [c["a3"] for c in chg], "absents :", absents, "pixels :", len(diff_idx))
json.dump(dict(traces=TRACES, pov=res), open(os.path.join(OUT, "frontieres.json"), "w"), ensure_ascii=False, separators=(",", ":"))
print("frontieres.json", os.path.getsize(os.path.join(OUT, "frontieres.json")) // 1024, "Ko")
