"""Fabrique les cartes de My World Explorer (monde/donnees/) à partir de données géographiques du domaine public.

Usage : python3 fabriquer.py <dossier Natural Earth> <dossier ETOPO> <dossier de sortie>
  - Natural Earth (naturalearthdata.com, domaine public) : les .zip dézippés (ne_50m_admin_0_countries/...).
  - ETOPO1 (NOAA, domaine public) : bandes b_<lat>.nc téléchargées par telecharger.sh (pas de 3 minutes d'angle).

Sorties :
  relief.webp   4096×2048 RGB sans perte : R,G = altitude sur 16 bits (h = valeur × 2 − 11000 m), B = part de lac (0..255)
  couleurs.jpg  4096×2048     : couleurs des paysages (sur la mer : blanc = banquise)
  ids.png       4096×2048 RGB : R = pays, G = mer / océan nommé, B = continent (1..7) ou océan (10..14)
  paysages.png  2048×1024 L   : type de paysage (voir PAYSAGES), pour le jeu (taper, symboles 3D, quiz)
  monde.json                  : pays, villes, fleuves, frontières, régions de France, noms des lieux
"""
import glob, json, math, os, sys
import numpy as np
import shapefile
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage
from scipy.io import netcdf_file
from shapely.geometry import shape, mapping, Polygon, MultiPolygon, LineString, MultiLineString, Point
from shapely.ops import unary_union, linemerge

sys.path.insert(0, os.path.dirname(__file__))
from zones import ZONES, LIMITE_ARBRES, DEBUT_TAIGA, PRAIRIE, FORET, TAIGA, TOUNDRA, STEPPE, SAVANE, JUNGLE, MEDIT, DESERT

NE, ETO, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(OUT, exist_ok=True)
W, H = 4096, 2048
GLACE, MONTAGNE, VILLE, BANQUISE, LAC, MER = 1, 11, 12, 13, 14, 0
rng = np.random.default_rng(7)

def lire(nom):
    return shapefile.Reader(os.path.join(NE, nom, nom))

def px(lon, lat, w=W, h=H):
    return ((lon + 180) / 360 * w, (90 - lat) / 180 * h)

def polys_de(geom):
    if geom.is_empty: return []
    if isinstance(geom, Polygon): return [geom]
    if isinstance(geom, MultiPolygon): return list(geom.geoms)
    return [g for g in getattr(geom, "geoms", []) if isinstance(g, Polygon)]

def peindre(img, geom, val, w, h, trous=0):
    d = ImageDraw.Draw(img)
    for p in polys_de(geom):
        d.polygon([px(x, y, w, h) for x, y in p.exterior.coords], fill=val)
        if trous is not None:
            for r in p.interiors:
                d.polygon([px(x, y, w, h) for x, y in r.coords], fill=trous)

LON = (np.arange(W) + .5) / W * 360 - 180
LAT = 90 - (np.arange(H) + .5) / H * 180
LONg, LATg = np.meshgrid(LON, LAT)

# ---------- bruit lisse, raccordé à 180° ----------
def bruit(cellules, graine):
    g = np.random.default_rng(graine).random((cellules // 2 + 3, cellules + 3)).astype(np.float32)
    g[:, -3:] = g[:, :3]  # raccord en longitude
    im = Image.fromarray(g, "F").resize(((cellules + 3) * W // cellules, (cellules // 2 + 3) * H // (cellules // 2)), Image.BICUBIC)
    a = np.asarray(im)[:H, :W]
    return (a - a.mean()) / (a.std() + 1e-6)

def fbm(graine, octaves=((8, 1), (24, .5), (64, .25), (160, .12))):
    return sum(bruit(c, graine + i) * amp for i, (c, amp) in enumerate(octaves))

# ---------- relief (ETOPO1) ----------
print("relief…")
bandes = []
for f in sorted(glob.glob(os.path.join(ETO, "b_*.nc")), key=lambda s: int(s.split("_")[-1][:-3])):
    nc = netcdf_file(f, "r", mmap=False)
    a = nc.variables["altitude"].data.astype(np.float32)
    bandes.append(a if not bandes else a[1:])
alt = np.concatenate(bandes, 0)[::-1]  # nord en haut, 3601 × 7201
alt = ndimage.gaussian_filter(alt, .7)
sh, sw = alt.shape
yy = (90 - LATg) / 180 * (sh - 1)
xx = (LONg + 180) / 360 * (sw - 1)
h = ndimage.map_coordinates(alt, [yy, xx], order=1).astype(np.float32)

# ---------- terres, lacs, banquises de glace ----------
print("terres…")
S = 4  # sur-échantillonnage pour des côtes nettes
def fraction(geoms, s=S):
    im = Image.new("L", (W * s, H * s), 0)
    for g in geoms: peindre(im, g, 255, W * s, H * s)
    a = np.asarray(im, np.float32).reshape(H, s, W, s).mean((1, 3)) / 255
    return a

terres = [shape(s.__geo_interface__) for s in lire("ne_50m_land").shapes()]
plateformes = [shape(s.__geo_interface__) for s in lire("ne_50m_antarctic_ice_shelves_polys").shapes()]
fterre = fraction(terres + plateformes)
fplate = fraction(plateformes, 2)
lacs_r = lire("ne_50m_lakes")
lacs = [shape(s.__geo_interface__) for s in lacs_r.shapes()]
flac = fraction(lacs)
fglace = fraction([shape(s.__geo_interface__) for s in lire("ne_50m_glaciated_areas").shapes()], 2)

terre = fterre >= .5
hc = h.copy()
hc[fterre >= 1] = np.maximum(h[fterre >= 1], 6)
hc[fterre <= 0] = np.minimum(h[fterre <= 0], -6)
cote = (fterre > 0) & (fterre < 1)
hc[cote] = (fterre[cote] - .5) * 80
hc[(fplate > .5) & (fterre >= 1)] = np.maximum(hc[(fplate > .5) & (fterre >= 1)], 40)
# grands fonds : lissés et arrondis à 50 m (seule la couleur de la mer en dépend) ; fichier bien plus léger
fond = hc < -300
hl = ndimage.gaussian_filter(np.where(hc < 0, hc, 0), 2)
hc[fond] = np.minimum(np.round(hl[fond] / 50) * 50, -300)
code = np.clip(np.round((hc + 11000) / 2), 0, 65535).astype(np.uint32)
rel = np.stack([(code >> 8).astype(np.uint8), (code & 255).astype(np.uint8), np.clip(flac * 255, 0, 255).astype(np.uint8)], -1)
Image.fromarray(rel, "RGB").save(os.path.join(OUT, "relief.webp"), lossless=True, method=6)

# ---------- pays, mers, continents ----------
print("pays…")
pays_r = lire("ne_50m_admin_0_countries")
CONT = {"Africa": 1, "North America": 2, "South America": 3, "Asia": 4, "Europe": 5, "Oceania": 6, "Antarctica": 7}
NOMS_CONT = {1: "Afrique", 2: "Amérique du Nord", 3: "Amérique du Sud", 4: "Asie", 5: "Europe", 6: "Océanie", 7: "Antarctique"}
def continent_partie(rec, p):
    c = p.representative_point(); x, y = c.x, c.y
    k = CONT.get(rec["CONTINENT"], 0)
    a3 = rec["ADM0_A3"]
    if a3 == "RUS": return 5 if (x < 59 or (x < 66 and y > 66)) and y > 41 else 4
    if a3 == "TUR": return 5 if x < 29.5 and y > 40.5 else 4
    if a3 in ("FRA", "NLD", "GBR", "ESP", "PRT", "NOR", "USA", "CHL", "ECU", "AUS", "NZL", "DNK"):
        if x < -30 and y < 13 and y > -60 and x > -95: return 3  # Guyane, Galápagos…
        if -95 < x < -50 and y >= 13: return 2  # Antilles, Saint-Pierre
        if x < -140 or x > 160 or (x < -100 and y < 25): return 6  # Pacifique, Hawaï
        if 30 < x < 60 and y < 0: return 1  # Réunion, Mayotte
        if -20 < x < -10 and 27 < y < 30: return 1  # Canaries
        if -32 < x < -24 and 36 < y < 40: return 5  # Açores
    if a3 == "IDN" and x > 134: return 6  # Nouvelle-Guinée occidentale
    return k

ids_p = Image.new("L", (W, H), 0)
cont = Image.new("L", (W, H), 0)
PAYS = []
for i, (sr, rec) in enumerate(zip(pays_r.shapes(), pays_r.records())):
    g = shape(sr.__geo_interface__)
    pid = i + 1
    peindre(ids_p, g, pid, W, H, None)
    for p in polys_de(g): peindre(cont, p, continent_partie(rec, p), W, H, None)
    PAYS.append(dict(id=pid, rec=rec, geom=g))
ids_p = np.asarray(ids_p).copy()
cont = np.asarray(cont).copy()
ids_p[~terre] = 0
cont[~terre] = 0
# terres sans pays (petits îlots) : continent le plus proche
manque = terre & (cont == 0)
if manque.any():
    _, (iy, ix) = ndimage.distance_transform_edt(cont == 0, return_indices=True)
    cont[manque] = cont[iy[manque], ix[manque]]

print("mers…")
mers_r = lire("ne_50m_geography_marine_polys")
mers = []
for sr, rec in zip(mers_r.shapes(), mers_r.records()):
    if rec["featurecla"] in ("river", "reef"): continue
    mers.append((shape(sr.__geo_interface__), rec))
mers.sort(key=lambda t: -t[0].area)
ids_m = Image.new("L", (W, H), 0)
oce = Image.new("L", (W, H), 0)
OCEANS = {"Arctic Ocean": 10, "North Atlantic Ocean": 11, "South Atlantic Ocean": 11, "North Pacific Ocean": 12, "South Pacific Ocean": 12,
          "INDIAN OCEAN": 13, "SOUTHERN OCEAN": 14}
MERS = []
for j, (g, rec) in enumerate(mers):
    peindre(ids_m, g, j + 1, W, H, None)
    if rec["name"] in OCEANS: peindre(oce, g, OCEANS[rec["name"]], W, H, None)
    MERS.append(dict(id=j + 1, rec=rec, geom=g))
ids_m = np.asarray(ids_m).copy(); oce = np.asarray(oce).copy()
_, (iy, ix) = ndimage.distance_transform_edt(oce == 0, return_indices=True)
oce = oce[iy, ix]
# mers rattachées à un océan à la main (sinon : océan le plus proche)
PARENT = {"Mediterranean Sea": 11, "Black Sea": 11, "Caribbean Sea": 11, "Gulf of Mexico": 11, "North Sea": 11, "Baltic Sea": 11,
          "Red Sea": 13, "Persian Gulf": 13, "Arabian Sea": 13, "Bay of Bengal": 13, "Hudson Bay": 10, "Caspian Sea": 0,
          "South China Sea": 12, "Coral Sea": 12, "Tasman Sea": 12, "Sea of Japan": 12, "Bering Sea": 12, "Sea of Okhotsk": 12}
for m in MERS:
    k = PARENT.get(m["rec"]["name"])
    if k is not None: oce[ids_m == m["id"]] = k
ids_m[terre] = 0
codes = np.where(terre, cont, oce).astype(np.uint8)
Image.fromarray(np.stack([ids_p.astype(np.uint8), ids_m.astype(np.uint8), codes], -1), "RGB").save(os.path.join(OUT, "ids.png"), optimize=True)

# ---------- paysages ----------
print("paysages…")
def interp_lon(table, lon):
    xs, ys = zip(*table)
    return np.interp(lon, xs, ys)

n1, n2 = fbm(11), fbm(23)
# déformation des bords : les zones dessinées à la main deviennent organiques
dlon = n1 * 2.6 + fbm(13, ((40, 1), (120, .5))) * .7; dlat = n2 * 1.8 + fbm(17, ((40, 1), (120, .5))) * .5
classe = np.zeros((H, W), np.uint8)
la = LATg + dlat * .6; lo = LONg + dlon * .6
arbres = interp_lon(LIMITE_ARBRES, lo); taiga = interp_lon(DEBUT_TAIGA, lo)
classe[:] = FORET
classe[(la > 0) & (la >= taiga)] = TAIGA
classe[(la > 0) & (la >= arbres)] = TOUNDRA
classe[np.abs(la) < 23.5] = SAVANE
classe[np.abs(la) < 8] = JUNGLE
classe[(la < -40)] = FORET
classe[(la < -55)] = TOUNDRA
classe[(la > 23.5) & (la < 40)] = PRAIRIE
classe[(la < -23.5) & (la > -40)] = PRAIRIE
# zones dessinées, peintes sur une grande image puis lues avec la déformation
zim = Image.new("L", (W, H), 0)
for k, pts in ZONES:
    ImageDraw.Draw(zim).polygon([px(x, y) for x, y in pts], fill=k)
z = np.asarray(zim)
zy = np.clip(np.round((90 - (LATg + dlat)) / 180 * H - .5), 0, H - 1).astype(int)
zx = np.round((LONg + dlon + 180) / 360 * W - .5).astype(int) % W
zw = z[zy, zx]
classe[zw > 0] = zw[zw > 0]
# pourtour de la Méditerranée
med_ids = [m["id"] for m in MERS if m["rec"]["name"] in ("Mediterranean Sea", "Adriatic Sea", "Aegean Sea", "Tyrrhenian Sea", "Ionian Sea",
           "Balearic Sea", "Golfe du Lion")]
med = np.isin(ids_m, med_ids)
dmed = ndimage.distance_transform_edt(~med) * (40000 / W)  # km (à l'équateur ; assez juste vers 40°)
pres = (dmed < 120 + n1 * 50) & (LATg > 30) & (LATg < 45.5) & terre & (classe != DESERT)
classe[pres] = MEDIT
# glaces
glace = (fglace > .4) | ((LATg < -60) & terre) | (fplate > .5)
classe[glace] = GLACE
classe[~terre] = MER
classe[(flac > .5)] = LAC

# villes : taches grises autour des grandes villes
places = lire("ne_50m_populated_places")
VILLES = []
vim = Image.new("L", (W, H), 0); dv = ImageDraw.Draw(vim)
for rec in places.records():
    pop = rec["POP_MAX"] or 0
    if pop < 2000000: continue
    x, y = px(rec["LONGITUDE"], rec["LATITUDE"])
    r = .4 + math.sqrt(pop / 1e6) * .9
    dv.ellipse([x - r, y - r, x + r, y + r], fill=255)
fville = np.asarray(vim.filter(ImageFilter.GaussianBlur(.8)), np.float32) / 255
classe[(fville > .45) & terre & (classe != GLACE)] = VILLE

# altitude : hautes montagnes
neige = np.where(np.abs(LATg) < 35, 5500 - np.abs(LATg) * 5, 5325 - (np.abs(LATg) - 35) * 125)
neige = np.maximum(neige, 300)
montagne = terre & (hc > 2600) & (classe != GLACE)
classe[montagne] = MONTAGNE
Image.fromarray(classe[::2, ::2], "L").save(os.path.join(OUT, "paysages.png"), optimize=True)

# ---------- couleurs ----------
print("couleurs…")
PAL = {GLACE: (234, 241, 247), TOUNDRA: (146, 148, 112), TAIGA: (48, 84, 56), FORET: (66, 116, 50), PRAIRIE: (128, 164, 78),
       STEPPE: (178, 166, 108), DESERT: (226, 194, 136), SAVANE: (166, 162, 84), JUNGLE: (32, 92, 38), MEDIT: (130, 146, 82),
       MONTAGNE: (120, 108, 90), VILLE: (168, 160, 150), MER: (0, 0, 0), LAC: (60, 110, 140)}
base = classe.copy(); base[base == MONTAGNE] = 0
# sous les montagnes : le paysage d'à côté
if (classe == MONTAGNE).any():
    _, (iy, ix) = ndimage.distance_transform_edt(np.isin(classe, [MONTAGNE, MER]), return_indices=True)
    mm = classe == MONTAGNE
    base[mm] = classe[iy[mm], ix[mm]]
col = np.zeros((H, W, 3), np.float32)
for k, c in PAL.items():
    col[base == k] = c
n3, n4 = fbm(41, ((48, 1), (128, .6), (300, .35))), fbm(57, ((16, 1), (60, .5)))
# variations dans chaque paysage
var = {DESERT: ((212, 152, 98), n4), PRAIRIE: ((158, 170, 88), n3), STEPPE: ((160, 150, 96), n3), SAVANE: ((140, 150, 74), n3),
       FORET: ((88, 128, 56), n3), JUNGLE: ((44, 108, 46), n3), TAIGA: ((40, 72, 54), n3), TOUNDRA: ((122, 128, 100), n3), MEDIT: ((152, 150, 96), n3)}
for k, (c2, n) in var.items():
    m = base == k
    t = np.clip(.5 + n[m] * .35, 0, 1)[:, None]
    col[m] = col[m] * (1 - t) + np.array(c2, np.float32) * t
# dunes plus claires au cœur des déserts
dd = ndimage.distance_transform_edt(base == DESERT) * (40000 / W)
m = base == DESERT
col[m] = col[m] + np.clip((dd[m] - 150) / 400, 0, 1)[:, None] * np.array([14, 12, 6], np.float32)
# adoucir les bords entre paysages (sur terre seulement), avant le relief
lis = np.stack([ndimage.gaussian_filter(col[..., c] * terre, 2.4) for c in range(3)], -1)
poids = ndimage.gaussian_filter(terre.astype(np.float32), 2.4)[..., None]
col = np.where(terre[..., None], lis / np.maximum(poids, 1e-3), 0)
col *= (1 + fbm(61, ((200, 1), (500, .6))) * .035)[..., None]  # grain fin
# altitude : vert → brun → roche → neige
hh = np.where(terre, hc, 0)
t1 = np.clip((hh - 1200) / 1600, 0, 1)[..., None] * (~glace)[..., None]
col = col * (1 - t1 * .75) + np.array([132, 116, 92], np.float32) * t1 * .75
t2 = np.clip((hh - 3000) / 1500, 0, 1)[..., None] * (~glace)[..., None]
col = col * (1 - t2 * .7) + np.array([142, 134, 126], np.float32) * t2 * .7
tn = np.clip((hh - neige) / 500 + n3 * .3, 0, 1)[..., None] * terre[..., None]
col = col * (1 - tn) + np.array([246, 248, 251], np.float32) * tn
# glaciers un peu bleutés et veinés
m = glace & terre
col[m] = np.array(PAL[GLACE], np.float32) * (1 + n3[m, None] * .025) - np.array([4, 2, 0], np.float32) * np.clip(n4[m, None], 0, 1)
# villes
fv = (fville * terre * (~glace))[..., None]
col = col * (1 - fv * .45) + np.array([150, 140, 128], np.float32) * fv * .45
col = np.where(terre[..., None], col, 0)
nb = fbm(77, ((20, 1), (70, .5), (200, .3)))
dterre = ndimage.distance_transform_edt(~terre) * (40000 / W)
ban = ((LATg > 79.5 + nb * 1.6) | ((LATg > 72.5 + nb) & (LONg > -125) & (LONg < -70))
       | ((LATg > 75.5 + nb) & (LONg > -80) & (LONg < -55)) | ((LATg > 66 + nb) & (LONg > -35) & (LONg < -8) & (dterre < 220 + nb * 60))
       | (LATg < -67.2 + nb * 1.3) | ((LATg < -64 + nb) & (LONg > -62) & (LONg < -18)) | ((LATg < -73 + nb) & (LONg > 160)) | ((LATg < -73 + nb) & (LONg < -150)))
banq = ndimage.gaussian_filter(ban.astype(np.float32), 1.5)
grain = np.clip(.9 + fbm(91, ((60, 1), (160, .5))) * .05, 0, 1)
mer = ~terre
col[mer] = (np.array([240, 245, 250], np.float32) * (banq[mer] * grain[mer])[:, None])
classe_b = classe.copy(); classe_b[mer & (banq > .5)] = BANQUISE
Image.fromarray(classe_b[::2, ::2], "L").save(os.path.join(OUT, "paysages.png"), optimize=True)
Image.fromarray(np.clip(col, 0, 255).astype(np.uint8), "RGB").save(os.path.join(OUT, "couleurs.jpg"), quality=88, subsampling=0)

# ---------- données vectorielles ----------
print("vecteurs…")
def q(v): return round(v, 2)
def lignes_de(geom, tol):
    g = geom.simplify(tol, preserve_topology=True)
    out = []
    def ajoute(coords):
        c = [[q(x), q(y)] for x, y in coords]
        if len(c) >= 2: out.append(c)
    for p in polys_de(g):
        ajoute(p.exterior.coords)
        for r in p.interiors: ajoute(r.coords)
    if isinstance(g, (LineString,)): ajoute(g.coords)
    if isinstance(g, MultiLineString):
        for l in g.geoms: ajoute(l.coords)
    return out

capitales = {}
for rec in places.records():
    if rec["FEATURECLA"] in ("Admin-0 capital", "Admin-0 capital alt") or rec["ADM0CAP"] == 1:
        a3 = rec["ADM0_A3"]
        if a3 not in capitales or rec["FEATURECLA"] == "Admin-0 capital":
            capitales[a3] = [rec["NAME_FR"] or rec["NAME"], q(rec["LONGITUDE"]), q(rec["LATITUDE"])]
pays_json = []
for P in PAYS:
    r = P["rec"]; g = P["geom"]
    grand = max(polys_de(g), key=lambda p: p.area)
    lab = [q(r["LABEL_X"]), q(r["LABEL_Y"])] if r["LABEL_X"] else [q(grand.representative_point().x), q(grand.representative_point().y)]
    pc = continent_partie(r, grand)
    pays_json.append(dict(id=P["id"], n=r["NAME_FR"] or r["NAME"], a3=r["ADM0_A3"], c=pc, pop=int(r["POP_EST"] or 0),
                          cap=capitales.get(r["ADM0_A3"]), l=lab, r=int(r["LABELRANK"]), aire=round(grand.area, 1),
                          bb=[q(v) for v in grand.bounds], col=int(r["MAPCOLOR7"]),
                          tr=lignes_de(g, .04)))

mers_json = []
for m in MERS:
    r = m["rec"]; p = max(polys_de(m["geom"]), key=lambda p: p.area).representative_point()
    mers_json.append(dict(id=m["id"], n=r["name_fr"] or r["name"], en=r["name"], k=r["featurecla"], r=int(r["scalerank"]), l=[q(p.x), q(p.y)]))

villes = []
for rec in places.records():
    pop = int(rec["POP_MAX"] or 0)
    cap = 1 if rec["FEATURECLA"] == "Admin-0 capital" else 0
    if pop < 1500000 and not cap and rec["ADM0_A3"] != "FRA": continue
    villes.append(dict(n=rec["NAME_FR"] or rec["NAME"], l=[q(rec["LONGITUDE"]), q(rec["LATITUDE"])], pop=pop, cap=cap, a3=rec["ADM0_A3"]))

# fleuves : les grands du monde et ceux de France
FLEUVES = {"Nile": "Nil", "Amazonas": "Amazone", "Mississippi": "Mississippi", "Missouri": "Missouri", "Yangtze": "Yangzi Jiang",
           "Huang": "fleuve Jaune", "Mekong": "Mékong", "Ganges": "Gange", "Indus": "Indus", "Danube": "Danube", "Volga": "Volga",
           "Congo": "Congo", "Niger": "Niger", "Zambezi": "Zambèze", "Ob": "Ob", "Lena": "Léna", "Yenisey": "Ienisseï",
           "St. Lawrence": "Saint-Laurent", "Paraná": "Paraná", "Orinoco": "Orénoque", "Rhine": "Rhin", "Rhin": "Rhin", "Murray": "Murray",
           "Euphrates": "Euphrate", "Tigris": "Tigre", "Amur": "Amour", "Mackenzie": "Mackenzie", "Yukon": "Yukon", "Colorado": "Colorado",
           "Rio Grande": "Rio Grande", "Brahmaputra": "Brahmapoutre", "Irrawaddy": "Irrawaddy", "Dnieper": "Dniepr", "Elbe": "Elbe",
           "Seine": "Seine", "Loire": "Loire", "Garonne": "Garonne", "Rhône": "Rhône", "Dordogne": "Dordogne", "Meuse": "Meuse",
           "Moselle": "Moselle", "Saône": "Saône", "Tagus": "Tage", "Po": "Pô", "Thames": "Tamise", "Vistula": "Vistule", "Don": "Don",
           "Okavango": "Okavango", "Orange": "Orange", "Limpopo": "Limpopo", "São Francisco": "São Francisco", "Madeira": "Madeira",
           "Darling": "Darling", "Columbia": "Columbia", "Senegal": "Sénégal", "Ohio": "Ohio", "Blue Nile": "Nil Bleu", "White Nile": "Nil Blanc"}
FRANCE_FL = {"Seine", "Loire", "Garonne", "Rhône", "Dordogne", "Meuse", "Moselle", "Saône", "Rhin"}
fl_r = lire("ne_10m_rivers_lake_centerlines")
par_nom = {}
for sr, rec in zip(fl_r.shapes(), fl_r.records()):
    nom = rec["name"] or ""
    cle = None
    for k in FLEUVES:
        if nom == k or nom == k + " River" or (rec["name_en"] or "") in (k, k + " River"):
            cle = k; break
    if not cle: continue
    if rec["featurecla"] not in ("River", "Lake Centerline"): continue
    par_nom.setdefault(FLEUVES[cle], []).append(shape(sr.__geo_interface__))
fleuves = []
for n, gs in par_nom.items():
    u = unary_union(gs)
    g = linemerge(u) if isinstance(u, MultiLineString) else u
    lg = lignes_de(g, .03)
    long_ = sum(len(l) for l in lg)
    if not lg: continue
    toutes = list(g.geoms) if hasattr(g, "geoms") else [g]
    plus = max(toutes, key=lambda l: l.length)
    m = plus.interpolate(.5, normalized=True)
    fleuves.append(dict(n=n, fr=1 if n in FRANCE_FL else 0, l=[q(m.x), q(m.y)], tr=lg, lg=round(sum(t.length for t in toutes), 1)))

# régions de France (départements fusionnés)
adm = lire("ne_10m_admin_1_states_provinces")
reg = {}
for sr, rec in zip(adm.shapes(), adm.records()):
    if rec["adm0_a3"] != "FRA" or rec["type_en"] != "Metropolitan department": continue
    reg.setdefault(rec["region"], []).append(shape(sr.__geo_interface__).buffer(0))
regions = []
for n, gs in reg.items():
    g = unary_union(gs).buffer(.002).buffer(-.002)
    p = max(polys_de(g), key=lambda p: p.area).representative_point()
    regions.append(dict(n=n, l=[q(p.x), q(p.y)], tr=lignes_de(g, .01)))

# lieux : montagnes, déserts, plaines… (Natural Earth, noms français)
gr = lire("ne_50m_geography_regions_polys")
lieux = []
TYPES = {"Range/mtn": "m", "Desert": "d", "Plateau": "p", "Plain": "pl", "Basin": "b", "Tundra": "t", "Island": "i", "Island group": "i",
         "Pen/cape": "pe", "Peninsula": "pe", "Delta": "de", "Wetlands": "w", "Lowland": "pl", "Geoarea": "g", "Valley": "v"}
for sr, rec in zip(gr.shapes(), gr.records()):
    t = TYPES.get(rec["FEATURECLA"])
    if not t or rec["SCALERANK"] > 3: continue
    g = shape(sr.__geo_interface__).buffer(0)
    p = max(polys_de(g), key=lambda p: p.area)
    c = p.representative_point()
    # axe principal (pour écrire le nom le long des chaînes de montagnes)
    lieux.append(dict(n=rec["NAME_FR"] or rec["NAME"], en=rec["NAME"], t=t, r=int(rec["SCALERANK"]), l=[q(c.x), q(c.y)],
                      bb=[q(v) for v in p.bounds], tr=lignes_de(p, .15) if t in ("m", "d") else []))

json.dump(dict(pays=pays_json, mers=mers_json, villes=villes, fleuves=fleuves, regions=regions, lieux=lieux,
               continents={str(k): v for k, v in NOMS_CONT.items()}),
          open(os.path.join(OUT, "monde.json"), "w"), ensure_ascii=False, separators=(",", ":"))
for f in sorted(os.listdir(OUT)):
    print(f, os.path.getsize(os.path.join(OUT, f)) // 1024, "Ko")
