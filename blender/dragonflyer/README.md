# DragonFlyer : fabrication du dragon, du héros et des îles

Tout est fabriqué par le code (aucun modèle, image ou son téléchargé). Les résultats sont embarqués en base64
dans `jeux/dragonflyer.html`, qui reste un seul fichier.

| fichier | rôle |
|---|---|
| `dragon.py` | Blender 4.2 : dragon (corps lofté, ailes en carreaux de Coons, pattes Skin), squelette, poids, textures d'écailles cuites (couleur, relief, occlusion), cavalier assis → `dragon.glb` |
| `manga.py` | le petit héros de manga (tête, cheveux, mains, couleurs), partagé par le cavalier et le marcheur |
| `pieton.py` | Blender 4.2 : le héros debout, avec squelette (marche, course, saut animés dans le jeu) → `pieton.glb` |
| `relief.py` | numpy : îles, modèle « stream power » (FastScape) pour les vallées, érosion par gouttes et thermique → `relief.webp` (hauteur 16 bits + humidité) |
| `integrer.py` | met les trois fichiers en base64 dans le jeu |

Refaire tout :
```
blender -b -P dragon.py -- sortie/          # puis : gltf-transform meshopt sortie/dragon.glb sortie/dragon_opt.glb
blender -b -P pieton.py -- sortie/          # puis : gltf-transform meshopt sortie/pieton.glb sortie/pieton_opt.glb
python3 relief.py sortie/ 2048              # quelques minutes
python3 integrer.py sortie/dragon_opt.glb sortie/pieton_opt.glb sortie/relief.webp
```
Les bornes de hauteur (`H_MIN`, `H_MAX`) et la taille du monde (`SIZE`) de `relief.py` doivent rester celles du jeu
(`HMIN`, `HMAX`, `MONDE`). Le jeu lit les os par leur nom (sans les points : `Arm.L` devient `ArmL`).
