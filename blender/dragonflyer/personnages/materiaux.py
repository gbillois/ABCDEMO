# Matières des personnages de DragonFlyer (étape 1 de la méthode, CONCEPTION.md § 7 bis).
# Dans le jeu, un personnage n'a qu'une matière (« Rider » : couleurs par sommet, rugosité 0,82, lumière de contour) :
# une « matière » est donc ici une couleur de base, ses variantes (ombre, lumière) et un grain propre (tissu, cuir,
# fourrure, cheveux, peau, métal) calculé sur les positions des sommets. Aucune couleur en dur ailleurs.
import math
import numpy as np

def srgb(h):
    """Couleur « #rrggbb » (sRGB) en couleur linéaire (ce que Blender et le glTF attendent pour les couleurs de sommets)."""
    h = h.lstrip("#"); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return np.array([x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4 for x in c])

# Palette du héros : couleurs chaudes et franches (esprit Wind Waker), jamais de noir pur ni de blanc pur.
PALETTE = {
    "peau":        "#f3c39c", "peau_ombre": "#d99a76", "joues": "#f09a86", "levres": "#b4594a", "rousseur": "#c97c58",
    "cheveux":     "#97401c", "cheveux_clair": "#c4622c", "cheveux_fonce": "#5f2410",
    "tunique":     "#5e9440", "tunique_fonce": "#4a7834", "galon": "#e0b84e",
    "cuir":        "#7a4a26", "cuir_fonce": "#4e2e17", "cuir_clair": "#a06a3a",
    "botte":       "#62391c", "semelle": "#3a2516",
    "pantalon":    "#6f5640",
    "fourrure":    "#b49a76", "fourrure_fonce": "#7e6648", "fourrure_clair": "#e2cfa8",
    "fer":         "#a49c8e", "laiton": "#d2a04a",
    "oeil_blanc":  "#f7f2e6", "iris": "#3f9a52", "iris_clair": "#8ad07a", "pupille": "#241a14", "reflet": "#fffaf0",
    "cil":         "#3a1e12", "sourcil": "#7a3418",
}
COUL = {k: srgb(v) for k, v in PALETTE.items()}

# Rugosité (rendus de contrôle seulement ; le jeu garde sa matière unique)
RUGOSITE = .8

# ---------------------------------------------------------------- bruit déterministe (sans Blender : testable seul)
def _hash(ix, iy, iz):
    with np.errstate(over="ignore"):
        h = (ix * 73856093) ^ (iy * 19349663) ^ (iz * 83492791)
        h = (h ^ (h >> 13)) * 1274126177
    return ((h ^ (h >> 16)) & 0xffff) / 65535.0

def bruit(p, f):
    """Bruit de valeur lissé en 3D (entre -1 et 1), fréquence f (par mètre)."""
    q = np.asarray(p, float) * f; i = np.floor(q).astype(np.int64); t = q - i; t = t * t * (3 - 2 * t)
    out = np.zeros(len(q))
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                w = (t[:, 0] if dx else 1 - t[:, 0]) * (t[:, 1] if dy else 1 - t[:, 1]) * (t[:, 2] if dz else 1 - t[:, 2])
                h = _hash(i[:, 0] + dx, i[:, 1] + dy, i[:, 2] + dz)
                out += w * h
    return out * 2 - 1

# ---------------------------------------------------------------- grains : (positions, paramètre libre) -> couleurs
def teinte(matiere, P, t=None, graine=0):
    """Couleurs des sommets P (n×3) pour une matière. t : paramètre de la pièce (0 à la racine, 1 au bout) si utile."""
    P = np.asarray(P, float); n = len(P)
    t = np.zeros(n) if t is None else np.asarray(t, float)
    rng = np.random.default_rng(graine)
    if matiere in ("tunique", "pantalon", "galon", "tunique_fonce"):            # tissu : trame fine, plis doux
        base = COUL[matiere]; k = 1 + .045 * bruit(P, 35) + .03 * bruit(P + 7, 120)
    elif matiere in ("cuir", "botte", "cuir_fonce", "cuir_clair"):              # cuir : marbré, patiné
        base = COUL[matiere]; k = 1 + .09 * bruit(P, 22) + .04 * bruit(P + 3, 90)
    elif matiere == "fourrure":                                                 # fourrure : touffes plus claires au bout
        base = COUL["fourrure_fonce"] * (1 - t[:, None]) + COUL["fourrure_clair"] * t[:, None]
        return base * (1 + .08 * bruit(P, 60))[:, None] * (.92 + .16 * rng.random())
    elif matiere == "cheveux":                                                  # cheveux : racine foncée, pointes cuivrées
        c = COUL["cheveux_fonce"] * (1 - t[:, None]) ** 2 + COUL["cheveux"] * 2 * t[:, None] * (1 - t[:, None]) + COUL["cheveux_clair"] * t[:, None] ** 2
        return c * (.93 + .14 * rng.random())
    elif matiere == "peau":
        base = COUL["peau"]; k = 1 + .02 * bruit(P, 30)
    elif matiere in ("fer", "laiton"):
        base = COUL[matiere]; k = 1 + .05 * bruit(P, 50)
    else:
        base = COUL[matiere]; k = np.ones(n)
    return np.clip(base[None, :] * k[:, None], 0, 1)

def joues(P, centres, rayon):
    """Rose des joues : fondu doux de la peau vers « joues » autour des centres donnés."""
    P = np.asarray(P, float); w = np.zeros(len(P))
    for c in centres: w = np.maximum(w, np.exp(-(np.linalg.norm(P - c, axis=1) / rayon) ** 2))
    return w * .55

# ---------------------------------------------------------------- matière de rendu (Blender), la même idée que dans le jeu
def materiau_blender(nom="Rider"):
    import bpy
    m = bpy.data.materials.get(nom)
    if m: return m
    m = bpy.data.materials.new(nom); m.use_nodes = True; nt = m.node_tree
    b = nt.nodes["Principled BSDF"]; c = nt.nodes.new("ShaderNodeVertexColor"); c.layer_name = "Col"
    nt.links.new(c.outputs["Color"], b.inputs["Base Color"]); b.inputs["Roughness"].default_value = RUGOSITE
    return m
