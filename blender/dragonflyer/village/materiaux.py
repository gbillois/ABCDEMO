# The Dragon Apprentice Chronicles : les matières du village (étape 1 de la méthode, voir dragonflyer/CONCEPTION.md § 7 bis).
# Le village n'a pas de textures : chaque pièce porte des couleurs par sommet (multipliées ensuite par l'occlusion cuite).
# Une matière = quelques teintes proches (couleurs linéaires) et une façon de varier ; toutes les pièces du kit les utilisent.
import random

def lin(h):
    """Couleur « #rrggbb » (sRGB) → linéaire (ce que Blender et le glTF attendent pour les couleurs de sommets)."""
    h = h.lstrip("#"); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4 for x in c)

def melange(a, b, t): return tuple(x + (y - x) * t for x, y in zip(a, b))

class Matiere:
    def __init__(s, nom, teintes, variation=.06, sombre=None):
        s.nom = nom; s.teintes = [lin(t) for t in teintes]; s.variation = variation
        s.sombre = lin(sombre) if sombre else tuple(x * .55 for x in s.teintes[0])
    def couleur(s, R, k=None):
        """Une teinte de la matière, légèrement variée (k : force de la variation)."""
        c = R.choice(s.teintes); f = 1 + R.uniform(-1, 1) * (s.variation if k is None else k)
        return tuple(min(1., x * f) for x in c)

# Palette chaude et lumineuse du jeu (façon Oceanhorn / Wind Waker), mêmes valeurs que l'ancien maisons.py pour rester accordé au village
MATIERES = {
    "moellon":  Matiere("moellon",  ["#a39b8e", "#948b7d", "#b0a690", "#8a8478", "#a8977a"], .07, "#5e5a55"),   # pierres des champs, grises et ocres
    "mortier":  Matiere("mortier",  ["#cfc4ad", "#c4b89e"], .04),
    "chaume":   Matiere("chaume",   ["#cfa75c", "#c39a50", "#d6b16a"], .05, "#8a6a34"),
    "chaume_f": Matiere("chaume_f", ["#a57f3c", "#96713a"], .05),
    "chaume_d": Matiere("chaume_d", ["#9a6438", "#8c5a32", "#a46c3c"], .05),                                # dessous du chaume : brun chaud (un jaune à l'ombre tourne à l'olive)
    "mousse":   Matiere("mousse",   ["#7a8a4a", "#6f8442"], .06),
    "platre":   Matiere("platre",   ["#f0e0bc", "#ead4a6", "#f4e6c6", "#e4cb98", "#efd8ae"], .03),                       # torchis enduit des colombages
    "tuile":    Matiere("tuile",    ["#b0553a", "#a54e36", "#bb5e40", "#9c4a34", "#b86448"], .06, "#6a3424"),   # tuiles de terre cuite
    "tuile_d":  Matiere("tuile_d",  ["#7a4630", "#6e3e2a"], .04),                                             # dessous et tranche du toit (à l'ombre : brun chaud)
    "volet_v":  Matiere("volet_v",  ["#4a7a4a", "#437045"], .04),                                             # volets verts
    "chene":    Matiere("chene",    ["#7a5232", "#6e4a2e", "#84593a"], .08, "#4a3020"),                       # poutres, planches
    "chene_c":  Matiere("chene_c",  ["#a3744a", "#9a6c44"], .08),
    "peint":    Matiere("peint",    ["#3c6a9a", "#36628f"], .04),                                             # porte et volets bleus
    "fer":      Matiere("fer",      ["#3a3836", "#33312f"], .03),
    "vitre":    Matiere("vitre",    ["#2a3a4a"], 0),                                                          # s'éclaire la nuit (objet W_)
    "terre":    Matiere("terre",    ["#b06a42", "#a5603c"], .05),                                             # pots, terre cuite
    "feuillage":Matiere("feuillage",["#5a8a3a", "#4f7d34", "#6a9a44"], .1),
    "fleur":    Matiere("fleur",    ["#c84a3a", "#e8b84a", "#d86aa0", "#f4f0e8"], .05),
    "paille":   Matiere("paille",   ["#d8b860"], .06),
}
def M(nom): return MATIERES[nom]

# ---- ajouts pêcheur (maisons/pecheur.py et ses objets) : planches peintes, pilotis, bardeaux, cordages, bouées
MATIERES.update({
    "clin_rouge": Matiere("clin_rouge", ["#a8452f", "#9e3f2b", "#b04c34", "#a3412d"], .05),   # planches peintes, rouge de Falun
    "clin_bleu":  Matiere("clin_bleu",  ["#4f7fa6", "#48779e", "#5687ae", "#4c7aa0"], .05),
    "clin_vert":  Matiere("clin_vert",  ["#5f9483", "#588b7b", "#66998a", "#5c8f80"], .05),   # vert d'eau
    "blanc":      Matiere("blanc",      ["#e9dfc8", "#e2d6bc"], .03),                          # boiseries peintes : crème chaud, jamais blanc pur
    "goudron":    Matiere("goudron",    ["#4e3c2e", "#47372b"], .05),                          # bas des pieux, goudronné
    "algue":      Matiere("algue",      ["#5d6b3c", "#55633a"], .06),                          # ligne d'eau
    "bardeau":    Matiere("bardeau",    ["#8f7f6c", "#837361", "#9a8a74", "#887866"], .06, "#5a4a3c"),   # bardeaux gris patiné (gris chaud)
    "bardeau_b":  Matiere("bardeau_b",  ["#8a5a3a", "#7e5236", "#946444", "#86583a"], .06, "#54361f"),   # bardeaux bruns
    "bardeau_d":  Matiere("bardeau_d",  ["#5e4430", "#56402e"], .04),                          # dessous du toit (à l'ombre : brun chaud)
    "corde":      Matiere("corde",      ["#c9ae80", "#bea374"], .05),
    "filet":      Matiere("filet",      ["#7a6e52", "#6e634a"], .05),
    "liege":      Matiere("liege",      ["#c08a50", "#b47e48"], .05),                          # flotteurs des filets
    "bouee_r":    Matiere("bouee_r",    ["#c8432f"], .03),
})
