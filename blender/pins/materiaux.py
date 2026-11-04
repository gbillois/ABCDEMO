# Le Domaine des Pins : les matières du domaine (étage 1 de la méthode, voir blender/pins/METHODE.md).
# Les bâtiments n'ont pas de textures : chaque pièce porte des couleurs par sommet (multipliées ensuite par l'occlusion cuite).
# Une matière = quelques teintes proches (écrites en sRGB, converties en linéaire) et une façon de varier.
# Toutes les pièces du kit (kit.py) prennent leurs couleurs ici : pas de couleur en dur ailleurs.
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

# Palette du Domaine des Pins : un village de cottages en bois dans une forêt de pins, gai et chaleureux (jeu d'enfant).
# On garde l'identité des anciens cottages (bois miel, toit vert sapin, volets verts, boiseries crème) en plus riche.
MATIERES = {
    # bois des façades
    "clin":      Matiere("clin",      ["#b8793f", "#b2743c", "#bd7f45", "#ad713b", "#b67a44"], .03),          # bardage à clin du rez-de-chaussée (pin miel)
    "latte":     Matiere("latte",     ["#c8955c", "#c08d55", "#cf9d64", "#bb8850"], .04),                    # planches verticales de l'étage et des pignons (pin doré, plus clair que le clin)
    "couvre":    Matiere("couvre",    ["#9c6638", "#946034"], .04),                                          # couvre-joints de l'étage
    "bois_d":    Matiere("bois_d",    ["#6e4126", "#653c24"], .04),                                          # tranches et dessous en bois (à l'ombre : brun chaud)
    "chant":     Matiere("chant",     ["#4e2d18", "#482916"], .03),                                     # chant du bas des planches à clin (ligne d'ombre nette)
    "creme":     Matiere("creme",     ["#efe4cc", "#e9dcc0", "#f2e9d4"], .025),                              # boiseries : cornières, encadrements, ceinture, rives
    "interieur": Matiere("interieur", ["#e8d3ac", "#e0c99f", "#ecd9b6"], .03),                               # lambris intérieur (clair)
    # toit
    "bardeau":   Matiere("bardeau",   ["#3f5e50", "#38574a", "#466656", "#334f44", "#4a6b5a", "#3b5a4c"], .07),  # bardeaux vert sapin
    "bardeau_d": Matiere("bardeau_d", ["#5c3e2a", "#553925"], .04),                                          # dessous du toit et chevrons (brun chaud, jamais du vert assombri)
    "bardeau_c": Matiere("bardeau_c", ["#263b33", "#22362e"], .04),                                          # chant (bord bas) des bardeaux : vert très sombre
    "faitage":   Matiere("faitage",   ["#2f463c", "#2b4137"], .04),                                          # planches de faîtage, un ton plus sombre
    "zinc":      Matiere("zinc",      ["#8d969a", "#858e92"], .03),                                          # gouttière
    "solin":     Matiere("solin",     ["#4d5558", "#485053"], .03),                                          # solin de la cheminée (sombre : un gris clair se lit comme une dalle sur le toit)
    "gravier":   Matiere("gravier",   ["#a59c8c", "#968e80", "#b1a897", "#8c8577"], .06),                    # liseré de gravier au pied de la terrasse
    # pierre
    "pierre":    Matiere("pierre",    ["#a49d90", "#958e82", "#b0a794", "#8a857b", "#a8987e", "#9c9384"], .07),  # soubassement et cheminée
    "mortier":   Matiere("mortier",   ["#8a8276", "#81796e"], .03),                                          # joints (en retrait, donc plus sombres)
    # ouvertures
    "volet":     Matiere("volet",     ["#2f6b4f", "#2b6449", "#33714f"], .04),                               # volets verts du domaine
    "vitre":     Matiere("vitre",     ["#9fc6dc"], 0),                                                       # vitres (le jeu leur donne sa matière, qui s'allume la nuit)
    "fer":       Matiere("fer",       ["#34322f", "#2e2c2a"], .03),
    "laiton":    Matiere("laiton",    ["#b8913e"], .03),
    # terrasse
    "lame":      Matiere("lame",      ["#a9733e", "#9e6a38", "#b37c45", "#a26e3a", "#ad7742"], .06),          # lames de la terrasse
    "lame_d":    Matiere("lame_d",    ["#6a4227", "#613c24"], .04),                                          # tranches et dessous de la terrasse
    "rambarde":  Matiere("rambarde",  ["#7c4f2e", "#74492b", "#83552f"], .05),                               # garde-corps
    # jardin
    "feuillage": Matiere("feuillage", ["#3f7f43", "#4a8a45", "#367339"], .08),
    "fleur":     Matiere("fleur",     ["#e8505b", "#f7c548", "#f28cb5", "#ffffff", "#9b7fd4"], .04),
    "terre":     Matiere("terre",     ["#b5562f", "#a94f2c"], .04),                                          # pots en terre cuite
    # --- ajouts végétation (pin)
    "aiguilles":   Matiere("aiguilles",   ["#3f6f42", "#46784a", "#3a693f", "#4d7d47"], .06),     # dessus des étages de branches (vert pin)
    "aiguilles_c": Matiere("aiguilles_c", ["#5f8f4f", "#68975a", "#5a884c"], .05),                # pointes et bords éclairés
    "aiguilles_d": Matiere("aiguilles_d", ["#3f6544", "#3a5e40", "#456b47"], .04),                # dessous des étages (à l'ombre : vert très sombre, pas olive)
    "ecorce":      Matiere("ecorce",      ["#8a5434", "#7d4b2f", "#95603b", "#83502f"], .06),     # tronc du pin, brun-roux
    "ecorce_d":    Matiere("ecorce_d",    ["#5a3622", "#52311f"], .04),                           # bas du tronc, branches à l'ombre
    "fougere":     Matiere("fougere",     ["#6a9445", "#64903f", "#70994a", "#62893f"], .05),     # fougères du sous-bois (vert tendre)
    "fougere_c":   Matiere("fougere_c",   ["#8db357", "#95b85c"], .04),                           # pointes des frondes (plus claires : la fougère se détache du sol)
    "fougere_d":   Matiere("fougere_d",   ["#4f7a3a", "#4a7436"], .04),                           # cœur et tiges des fougères (à l'ombre)
    "litiere":     Matiere("litiere",     ["#6e5d3c", "#665637", "#76643f"], .05),                # tapis d'aiguilles de pin sous les arbres (brun doré)
    "litiere_b":   Matiere("litiere_b",   ["#56653a", "#5b6a3d"], .04),                           # bord du tapis, qui se fond dans l'herbe
    "caillou":     Matiere("caillou",     ["#a39a89", "#968d7d", "#aca291", "#8f877a"], .05),     # cailloux du sous-bois
    "mousse_c":    Matiere("mousse_c",    ["#557f3e", "#4f793b"], .04),                           # mousse sur le dessus des cailloux
    "ecorce_p":    Matiere("ecorce_p",    ["#6a3f26", "#633a23"], .04),                           # plaques sombres de l'écorce
}
def M(nom): return MATIERES[nom]
