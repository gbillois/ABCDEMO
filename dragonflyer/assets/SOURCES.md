# Sources des fichiers de `dragonflyer/assets/`

Tous les modèles sont faits par les scripts Blender de `blender/dragonflyer/`, sauf les mouvements de `animations.glb` :

| Fichier | Origine | Licence |
|---|---|---|
| `animations.glb` | Mouvements (repos, marche, trot, course, saut, réception, coup d'épée, parler, ramasser) de « KayKit : Character Animations 1.1 » de Kay Lousberg (https://kaylousberg.itch.io/kaykit-character-animations), squelette Rig_Medium, transférés sur le squelette du héros par `blender/dragonflyer/animations.py` (bras ramenés le long du corps). Aucun personnage ni maillage de KayKit n'est utilisé. | CC0 1.0 (domaine public), usage commercial autorisé |
| `arbres.glb`, `arbres_*.webp` | Sapin et feuillu faits maison, de zéro, par les scripts de `blender/dragonflyer/vegetation/` (`exporter.py` : formes construites par règles, textures d'écorce, d'aiguilles et de feuilles peintes par le code, imposteurs rendus dans Blender), puis compressés en meshopt. Plus rien du « Stylized Nature MegaKit » dans ces fichiers. | — |
| `nature.glb`, `nature_*.webp` | Buisson fleuri, fougère, fleurs, plante, champignons, trèfle, rochers et galets du même « Stylized Nature MegaKit » (Quaternius), préparés par `blender/dragonflyer/nature.py` ; teintes adaptées à la palette du jeu. Les galets aplatis font les chemins des villages. | CC0 1.0 (domaine public), usage commercial autorisé |
| tous les autres `.glb` | faits par les scripts Blender du dépôt | — |
