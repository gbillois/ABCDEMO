# DragonFlyer : fabrication du dragon, du héros et des îles

Tout est fabriqué par le code (aucun modèle, image ou son téléchargé). Les résultats sont embarqués en base64
dans `dragonflyer/index.html`, qui reste un seul fichier.

| fichier | rôle |
|---|---|
| `dragon.py` | Blender 4.2 : dragon (corps lofté, ailes en carreaux de Coons, pattes Skin), squelette, poids, textures d'écailles cuites (couleur, relief, occlusion), cavalier assis → `dragon.glb` |
| `heros.py` | le jeune Viking (tête, cheveux auburn, mains, tenue, couleurs), partagé par le cavalier et le marcheur |
| `pieton.py` | Blender 4.2 : le héros debout (galons, bourse, grain du tissu, ombre de contact cuite), avec squelette (marche, course, saut animés dans le jeu) → `pieton.glb` ; avec une variante (`-- sortie/ fermier`, `fermiere`, `ancien`, `forgeron`, `pecheuse`, `chef`) → `villageois_<variante>.glb` (même squelette) |
| `relief.py` | numpy : îles, modèle « stream power » (FastScape) pour les vallées, érosion par gouttes et thermique → `relief.webp` (hauteur 16 bits + humidité) |
| `integrer.py` | met les trois fichiers en base64 dans le jeu |
| `maisons.py` | Blender : kit de village (7 maisons, accessoires, 2 intérieurs meublés), occlusion cuite dans les couleurs → `village.glb` (puis meshopt → `dragonflyer/assets/village.glb`) |
| `animaux.py` | Blender : mouton, chèvre, poule, cerf, vache, en corps organiques de metaballs fondues (toison bouclée, encolure, croupe), allégés, coloriés par régions, yeux, cornes, bois et sabots sculptés ; attribut `_TAG` (pattes, tête) animé dans le jeu → `animaux.glb` |
| `paysages.py` | Blender : rochers, arche et tour en ruine, menhir, épave, barque, bois flotté, chou, fleurs → `paysages.glb` (le blé est en cartes dessinées dans le jeu) |
| `caverne.py` | Blender : la Caverne des Braises (galerie en trois salles, lave, cristaux, entrée dans la montagne), grille, brasero, flamme, dalle, socle, Épée de Braise, fourreau et baudrier, rampant de braise (ennemi) ; lumière de lave cuite dans les couleurs → `caverne.glb` (puis meshopt → `dragonflyer/assets/caverne.glb`) |
| `animations.py` | Blender : transfère les mouvements CC0 de KayKit Character Animations (Rig_Medium, https://kaylousberg.itch.io/kaykit-character-animations) sur le squelette du héros (`squelette.py`, commun avec `pieton.py`) : direction et torsion de chaque os, bras ramenés le long du corps → `animations.glb` (puis meshopt → `dragonflyer/assets/animations.glb`) |
| `grimoire_icones.py` | les icônes gravées des menus (SVG) |
| `grimoire_gravure.py` | Blender : le dragon en vol, ailes levées, en blanc avec traits Freestyle (pour les menus) |
| `grimoire_encre.py` | transforme ce rendu en gravure à l'encre brune (traits, hachures, lavis) → `ui-gravure.webp` (estompée à 30 %) |
| `grimoire_textures.py` | numpy : parchemin et cuir grainé raccordables → `ui-parchemin.webp`, `ui-cuir.webp` |

Refaire tout :
```
blender -b -P dragon.py -- sortie/          # puis : gltf-transform meshopt sortie/dragon.glb sortie/dragon_opt.glb
blender -b -P pieton.py -- sortie/          # puis : gltf-transform meshopt sortie/pieton.glb sortie/pieton_opt.glb
python3 relief.py sortie/ 2048              # quelques minutes
python3 integrer.py sortie/dragon_opt.glb sortie/pieton_opt.glb sortie/relief.webp
```
Village (fichier à côté du jeu, chargé au démarrage) :
```
blender -b -P maisons.py -- sortie/          # quelques minutes (cuisson de l'occlusion)
gltf-transform meshopt sortie/village.glb ../../dragonflyer/assets/village.glb
```
Menus (fichiers à côté du jeu, dans `dragonflyer/`) :
```
blender -b sortie/dragon.blend -P grimoire_gravure.py -- sortie/dragon_brut.png
python3 grimoire_encre.py sortie/dragon_brut.png sortie/gravure.webp 620   # puis alpha × 0,3, largeur 420 → ui-gravure.webp
python3 grimoire_textures.py sortie/
```
Les bornes de hauteur (`H_MIN`, `H_MAX`) et la taille du monde (`SIZE`) de `relief.py` doivent rester celles du jeu
(`HMIN`, `HMAX`, `MONDE`). Le jeu lit les os par leur nom (sans les points : `Arm.L` devient `ArmL`).
