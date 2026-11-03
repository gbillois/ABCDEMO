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
