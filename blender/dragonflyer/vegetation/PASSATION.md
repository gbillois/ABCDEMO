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
- Tour 1 (`scratchpad/arbres/t1/`) : sapin 1 892 triangles, feuillu 3 369. Notes (sapin / feuillu) : silhouette 7/8,
  feuillage 7/7, tronc et branches 7/6, matières 7/7, imposteur 7/6, forêt 7, coût 9/9 → À REFAIRE.
  Acquis : plus de branches trouées, plus de bas dégarni, plus de dessous noir.
  Restait : bouts de branches brun-rouge qui percent les étages 3 à 5 ; brins en rangées claires (autocollants), cônes
  en plaques lisses, étages identiques, bords en pointes sèches et en lame ; base trop étroite, cime trop pointue ;
  racines du feuillu en planches à bout plat ; collerette à la fourche ; cœurs des touffes à facettes et rayures de
  texture ; imposteurs plus clairs, plus jaunes, plus plats et plus étroits ; forêt d'un seul arbre dupliqué.
  Corrigé (tour 2) :
  - sapin : étage refait (`etage_aiguilles`) : lobes arrondis (deux sommets par lobe), lèvre de 24 cm sous le bord
    (épaisseur), étages et débords variés (±10 %), brins de tailles (×0,75 à 1,2) et d'angles (±22°) variés, un ton sous
    la pente, 30 % dépassent nettement ; base 3,8 m de rayon, cime de 1,25 m arrondie ; branches seulement sous l'étage
    du bas (vues d'en dessous) ; texture des brins moins contrastée ;
  - feuillu : racines à 8 côtés qui plongent à 45 cm sous le sol en s'effilant ; tronc évasé au pied, aminci dans la
    fourche, maîtresses branches nées dans le tronc (Y continu) ; cœurs à 80 faces, peu bosselés, texture projetée à plat
    par face (plus de pôles ni de rayures), fond de feuilles moins contrasté, 24 bouquets par touffe ; bords au soleil
    plus dorés ;
  - imposteurs : image = éclairage du jeu divisé par celui d'un plan tourné vers le haut (l'imposteur garde les coussins
    ombrés et retrouve de jour la lumière de l'arbre de près), puis étalonnage automatique (`apercu.calibrer`) :
    écart de couleur moyenne < 1 % (dans `controle.txt`) ;
  - forêt : teinte par arbre (`materiaux.teinte_arbre` : luminosité ±8 %, un sur quatre environ plus jaune), penchant
    ±3°, vue 1 recadrée. Tailles et rotations : celles du jeu.
  Dans le jeu (`creerArbres`) : rotation aléatoire et échelle déjà faites (sapins ×0,94 à 1,81, feuillus ×0,83 à 1,6) ;
  teinte d'instance actuelle HSL(0,2 ± 0,05 ; 0,35 ; 0,8 à 0,95), faite pour les textures du MegaKit (assombrit de
  15 % et jaunit) : à remplacer par `teinte_arbre` ; penchant à ajouter dans `matArbre`.
- Tour 2 (`scratchpad/arbres/t2/`) : sapin 2 197 triangles, feuillu 3 706. Notes (sapin / feuillu) : silhouette 8/8,
  feuillage 7/7, tronc 8/6, matières 8/7, imposteur 8/7, forêt 8, coût 9/9 → À REFAIRE.
  Faits : moignons, silhouette du sapin, imposteur du sapin, variation en forêt.
  Restait : racines du feuillu (piliers plats, bout tranché : 2e échec), bourrelet à la fourche (2e échec), coques
  anguleuses et nues, tige verte étirée ; imposteur du feuillu (trait vertical au centre, lobes en miroir) ; lèvre du
  sapin en dalle à coins droits ; poils sombres isolés ; sapin coupé dans foret_1.
  Corrigé (tour 3) :
  - CHANGEMENT D'APPROCHE pour la charpente du feuillu (règle des 3 tours) : tronc, racines, maîtresses branches et
    flèche sont un seul maillage continu (`kit.Charpente` : squelette d'arêtes → modificateur Skin → subdivision ×2 →
    allègement à 10 %, les normales reprises de la surface dense) ; l'écorce suit le segment le plus proche, face par face
    (orientée dans le sens de chaque branche, pas de zigzag). Les racines naissent dans le tronc et plongent à 55 cm ;
    le bout des maîtresses branches se prolonge dans une touffe. Les rameaux (cachés dans les touffes) restent des tubes ;
  - houppier : cœurs ×0,9, 26 bouquets par touffe, aussi sur le dessous ;
  - cartes vues par la tranche effacées (région des cartes seulement) : plus de « tiges » ni de « poils » ;
    aiguilles sombres des brins raccourcies ;
  - sapin : lobes à trois sommets (milieu plus avancé et plus bas), bord arrondi : la lèvre de 13 cm part des mêmes
    sommets que le dessus et la normale y tourne en douceur ; 4 à 9 lobes par étage (budget) ;
  - imposteurs : trois vues dans une seule image (chaque plan porte la vue prise face à lui, plus de miroir),
    plans vus par la tranche effacés ; écarts de couleur < 1 % ;
  - foret_1 : cadrage choisi automatiquement (aucun arbre proche coupé par le bord).
  À reprendre dans le jeu à l'intégration : effacement des cartes et des plans d'imposteur vus par la tranche
  (normale de face par dFdx/dFdy de la position), imposteur en trois vues (u de k/3 à (k+1)/3).
- Tour 3 (`scratchpad/arbres/t3/`) : sapin 2 436 triangles, feuillu 3 779. Notes (sapin / feuillu) : silhouette 8/8,
  feuillage 7/7, tronc 8/6, matières 8/7, imposteur 8/7, forêt 8, coût 9/9 → À REFAIRE.
  Faits : poils, cadrage, trait vertical de l'imposteur feuillu, fourche d'une seule peau, tige verte.
  Restait : pied du feuillu à facettes, plis en V d'écorce, racine tronquée (3e tour sur les racines) ; encoche noire
  à la fourche ; bouts de branches carrés et coques d'ombre unie vues de dessous ; imposteur feuillu rayé, tronc fin ;
  bord des étages du sapin en dalles, dessus plat (3e tour sur ce bord) ; arête au milieu de l'imposteur du sapin,
  plan trop étroit ; tiges brun-rouge dans les brins ; tronc rouge-orangé sous la jupe.
  Corrigé (tour 4) :
  - CHANGEMENT D'APPROCHE pour le pied du feuillu (la peau Skin allégée faisait des facettes et des coutures) :
    `kit.pied_sculpte` : un seul cylindre de 28 colonnes et 13 anneaux, du sous-sol jusque dans la fourche, dont le
    rayon est sculpté par 5 contreforts en bosse arrondie (cos²), surtout au ras du sol et plus loin dessous : les
    racines naissent du fût et s'enfoncent, une seule peau, normales continues, écorce continue (v = longueur le long
    de chaque colonne). Le haut du pied se referme en douceur au-dessus de la fourche ;
  - maîtresses branches : des tubes nés dans le haut du pied (deux un peu plus bas), qui en sortent comme d'un fût et
    finissent, arrondis, au centre d'une touffe : plus de bout de tronc fermé (collerette), plus de nœud à 6 branches
    (encoche), plus de bouts carrés. `kit.Charpente` (Skin) est retirée ;
  - touffes : cœurs ×0,8, 30 bouquets ×1,2, aussi vers l'intérieur ;
  - CHANGEMENT D'APPROCHE pour le bord des étages du sapin : un anneau d'arrondi au-dessus du bord (13 cm plus haut,
    4,5 % en dedans) en plus de la lèvre dessous, et des normales prises sur la forme réelle (65 %) mêlées à la normale
    stylisée (35 %) : bourrelet arrondi, dessus bombé. 4 à 8 lobes par étage (budget) ; racines du sapin allégées ;
  - tige des brins courte, fine, brun-vert ; écorce du sapin plus sombre ;
  - imposteurs : seul le plan qui fait à peu près face au regard (horizontal) se montre (seuil 0,66 à 0,78 ; il y en a
    toujours un au-dessus de 0,87) : plus d'image écrasée de biais (rayures) ni d'arête ; silhouette élargie de 2 px.
  Dans le jeu, la matière de loin devra faire pareil (normale de face par dFdx/dFdy, regard ramené à l'horizontale).
- Tour 4 (`scratchpad/arbres/t4/`) : sapin 2 452 triangles, feuillu 3 773. Notes (sapin / feuillu) : silhouette 8/8,
  feuillage 7/7, tronc 8/7, matières 8/7, imposteur 8/8, forêt 8, coût 9/9 → À REFAIRE.
  Faits : pied du feuillu (à 85 %), imposteurs, nervures rouges, tronc sous la jupe, encoche noire.
  Restait : « œufs » verts lisses dans le houppier et coques sombres vues de dessous (3e tour : la cause était
  l'effacement des cartes vues par la tranche, qui découvrait les cœurs) ; étranglement en anneau à la fourche ;
  bords du sapin en dalles à coins vifs (4e tour : la cause est la géométrie du bord, que les brins ne cachaient pas) ;
  moignon sous l'étage du bas ; brin coupé par le sol ; bout de racine en lame.
  Corrigé (tour 5) :
  - CHANGEMENT D'APPROCHE pour les touffes : surtout des cartes (60 bouquets par touffe, répartis de 45 à 85 % du
    rayon), avec un petit cœur sombre de 20 faces (0,55 × rayon) qui ne sert que de fond ; effacement par la tranche
    réduit aux cartes presque de profil (0,03 à 0,1) ;
  - fourche : le fût s'élargit un peu jusqu'à l'écartement des branches et ne se referme qu'au-dessus ; les branches
    naissent plus bas, déjà décalées vers leur côté, et sortent du fût progressivement ;
  - racines : le bout plonge avant de s'amincir ;
  - sapin : anneau d'arrondi retiré ; un brin sur CHAQUE sommet du bord (frange continue qui cache le bord), lobes
    plus ronds ; brins relevés ou raccourcis pour rester au-dessus du sol ; branches sous l'étage du bas retirées ;
  - imposteurs : seul le meilleur plan se montre (seuil 0,8 à 0,9).
- Tour 5 (`scratchpad/arbres/t5/`) : sapin 2 272 triangles, feuillu 3 829. Tout à 8 ou plus sauf le feuillage du sapin (7).
  Feuillu réglé (œufs, coques, fourche) ; imposteur du sapin à 85 % accepté.
  Restait : bord d'étage du sapin en plaque hexagonale, abat-jour à facettes, dessus plat (5e tour : changement
  d'approche obligatoire) ; dessous de jupe à plis anguleux ; petit moignon sombre ; bouts de racines du feuillu pointus.
  Corrigé (tour 6) :
  - CHANGEMENT D'APPROCHE pour l'étage du sapin : `etage_aiguilles` refait comme une surface de révolution et non
    comme un polygone : profil sommet → milieu bombé (58 % du rayon, mi-hauteur) → bourrelet à section ronde (tore
    aplati : dessus, avant, dessous) → dessous qui remonte au tronc ; le rayon et la retombée ondulent en grappes
    (sinusoïde, six points par grappe, petit bruit, chaque grappe un peu différente) ; normales de la surface lisse,
    relevées vers le ciel ; un brin au bout de chaque grappe et un dans chaque creux. 4 à 8 grappes par étage ;
  - sapin sans racines (la jupe les cache ; c'était le moignon) ;
  - racines du feuillu : dos rond (cos^1,3 au lieu de cos²), plus larges, un peu plus courtes, et sous le sol elles ne
    s'allongent presque plus : le bout, arrondi, plonge presque droit (plus de lame ni de pointe).
- Tour 6 (`scratchpad/arbres/t6/`) : sapin 2 456 triangles, feuillu 3 829 → PASSE (tout à 8 ou plus, coût 9/9).
  Réserves mineures non faites : plis légers entre grappes de l'étage du milieu du sapin (08), bouts de racines du
  feuillu encore un peu anguleux (07), petite arête à droite de la cime de l'imposteur du sapin (11).

## Intégration au jeu (faite, version 2026.11.03-7, cache sw dragonflyer-v13)
- `exporter.py` : construit les deux arbres, cuit l'occlusion, fait et étalonne les imposteurs, exporte `arbres.glb`
  (T_pin_0/1, T_feuillu_0/1 ; noms des maillages « maillage_<nom>_pres/loin », distincts des noms d'objets : le GLTFLoader
  nomme les morceaux d'un maillage à deux matières « <maillage>_0/_1 », et « T_feuillu_1 » était pris pour l'imposteur)
  et les WebP (écorce 512², aiguilles et feuilles 1024², imposteurs en trois vues 512 de haut).
  Puis `gltf-transform meshopt` → `dragonflyer/assets/arbres.glb` (141 Ko, contre 716 Ko).
- `chargerArbresKit()` : décodeur meshopt ; attributs quantifiés remis en flottants AVANT d'appliquer la matrice du nœud
  (sinon les positions sont rabotées à ±1 : arbres écrasés) ; couleurs des sommets gardées (écorce : sans la teinte de
  l'arbre ; feuillage : avec) ; textures d'écorce, d'aiguilles et de feuilles en RepeatWrapping ; plus d'avecBoule sur le
  feuillage (normales déjà choisies) ; cartes effacées seulement presque de profil (normale de face par dFdx/dFdy) ;
  imposteur : normale non retournée, seul le plan qui fait face au regard horizontal se montre (smoothstep 0,8 à 0,9).
- `creerArbres()` : teinte de chaque arbre = règle de `teinte_arbre` (même nombre de tirages : les arbres restent aux
  mêmes places) ; penchant ±3° tiré d'un hachage de la position (`matArbre`). Ombres peintes au sol aux nouvelles largeurs.
- Mesures (Playwright, SwiftShader, qualité haute, mêmes vues ; `scratchpad/arbres/jeu.js`, captures dans
  `scratchpad/arbres/jeu/`) : appels de dessin identiques (forêt 108, lisière 83, vol 103, village 98) ; triangles
  forêt 2,62 → 2,08 M, lisière 1,31 → 1,27 M, vol 1,81 → 1,58 M, village 1,93 → 1,79 M ; 0 programme fabriqué pendant le
  jeu ; aucune erreur de console. Les arbres de près pèsent moins que ceux du MegaKit (sapin 2 456 contre 3 947 triangles,
  feuillu 3 829 contre 6 265). Textures un peu plus lourdes (≈ 520 Ko de WebP contre ≈ 100 Ko).

## Ce qui reste
- Les réserves mineures du tour 6 ; un 2e sapin et un feuillu ovale (facultatif).
- Voir les arbres sur iPad (le compteur caché du jeu) : les feuillus paraissent un peu plus clairs et plus jaunes que
  dans les aperçus de Blender (pas d'avecBoule, translucidité du jeu) ; à juger par le propriétaire.
- Vue de dessus des imposteurs (version 2026.11.03-9, cache v14) : 4e plan horizontal (cime vue d'en haut, 4e case de l'atlas,
  à la hauteur moyenne du feuillage) qui prend le relais quand le regard plonge (pente 0,5 à 0,7), les plans verticaux
  s'effaçant ; imposteur à 8 triangles ; étalonnage sur trois vues dont une plongeante. Vérifié : Mistholm 08 (couvert de cimes).
