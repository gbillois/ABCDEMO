# Passation : arbres de DragonFlyer (méthode de dragonflyer/CONCEPTION.md § 7 bis)

Fichier tenu à jour à chaque étape, pour qu'une nouvelle session reprenne ici. Marche à suivre : `.claude/skills/modele-3d/`.

## But
Remplacer les deux arbres du « Stylized Nature MegaKit » (préparés par `../arbres.py` : branches qui se trouaient,
sapins dégarnis du bas, feuillage sombre par dessous) par nos propres arbres, faits de zéro par scripts.
Le jeu attend toujours deux espèces : sapin (`T_pin_*`) et feuillu (`T_feuillu_*`), voir `chargerArbresKit()` de
`dragonflyer/index.html`.

## Fichiers
- `materiaux.py` : textures peintes par le code (numpy), rien de téléchargé : `arbres_ecorce` (512², se répète),
  `arbres_pin` et `arbres_feuilles` (1024² : en haut deux cartes détourées, brin de sapin ou bouquet de feuilles ;
  en bas un fond opaque d'aiguilles ou de feuilles serrées qui habille les cônes et le cœur des touffes).
  Palette chaude façon Wind Waker / Oceanhorn ; matières de rendu des aperçus (texture × couleur des sommets,
  détourage à 0,5 comme le jeu, un peu de lumière qui traverse).
- `kit.py` : `Arbre` (bmesh, coordonnées de texture, couleur « Col » par sommet, normales choisies), `tube` (tronc,
  branche, rameau, racine ; écorce sans étirement), `racines`, `courbe`, `touffe` (cœur opaque + bouquets en cartes
  penchés vers l'extérieur), `etage_aiguilles` (cône bombé à bord festonné, dessous fermé, frange de brins en cartes).
  Les faces du feuillage sont tournées du côté de leur normale choisie (le jeu ne retourne pas la normale des cartes).
- `apercu.py` : occlusion cuite dans « Col », imposteur (rendu de côté, trois plans croisés, 6 triangles, normales vers
  le haut), 12 caméras, planche, `controle.txt`, export .glb.
- `arbres/sapin.py`, `arbres/feuillu.py` : `construire()` ; lancés seuls, ils font leurs 12 aperçus.
- `foret.py` : planche « forêt » (64 instances aux tailles du jeu, de près jusqu'à 90 m, imposteurs au-delà).

Commandes (Blender : `/opt/blender-dl/blender-4.2.3-linux-x64/blender`) :
`blender -b -P arbres/sapin.py -- <dossier>`, `blender -b -P arbres/feuillu.py -- <dossier>`, `blender -b -P foret.py -- <dossier>`.

## Les 12 caméras d'un arbre
01-03 hauteur d'homme (0°, 120°, 240°), 04-06 plongée (60°, 180°, 300°), 07 au pied, 08 de près à hauteur d'homme,
09 de dessus, 10 contre-plongée sous le feuillage, 11 imposteur (à droite) à côté de l'arbre de près, 12 les deux à 75 m.

## Banc d'essai (ce qu'il faut savoir avant de lire les rendus)
- Les arbres sont éclairés dans les aperçus par leur matière (`materiaux.eclairage_jeu`, en émission) et non par Cycles :
  vu de dessous, Cycles n'éclaire pas une face par le soleil placé de l'autre côté de sa face, quelle que soit la normale
  (cartes et dessous des étages sortaient noirs). Le jeu, lui, éclaire selon la normale choisie, des deux côtés, et
  l'arbre ne reçoit pas d'ombre (il en projette au sol) : les aperçus font pareil. Le soleil de la scène ne sert plus
  qu'aux ombres au sol.
- Imposteur : image rendue avec des matières « à plat » (couleur × occlusion × léger relief, `PLAT_GAIN`), le soleil
  vient ensuite de l'éclairage du jeu (normales vers le haut). Dans le jeu il faudra aussi enlever `normal *= faceDirection`
  de la matière de loin (sinon la face arrière d'un plan s'assombrit).
- `create_icosphere(subdivisions=1)` de Blender 4.2 donne 20 faces : les touffes utilisent 2 (80 faces).

## Tours de contrôle
- Tour 1 (planches dans `scratchpad/arbres/t1/`) : sapin 1 972 triangles (budget 2 500), feuillu 3 369 (budget 4 000),
  imposteurs 6 triangles. En attente de l'inspection.

## Intégration (quand tout est à 8+)
Prévu : `arbres.glb` (T_pin_0/1, T_feuillu_0/1, matières écorce puis feuillage, `userData.matieres`) et les mêmes
textures `arbres_*.webp`. Adaptations de `chargerArbresKit()` à faire et à signaler : garder l'attribut `color`
(occlusion et lumière peintes, `vertexColors`), écorce et feuillage en `RepeatWrapping` (textures qui se répètent).
