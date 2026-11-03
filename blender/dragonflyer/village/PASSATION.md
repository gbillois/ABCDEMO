# Passation : village de DragonFlyer (méthode de dragonflyer/CONCEPTION.md § 7 bis)

Fichier tenu à jour à chaque étape, pour qu'une nouvelle session reprenne ici. Marche à suivre : `.claude/skills/modele-3d/`.

## Où on en est
- Matières : `materiaux.py` (fait).
- Kit : `kit.py` : poutre, planche, moellon, mur de moellons (assises communes, chaînage d'angle, pierres coupées au bord
  des ouvertures), toit de chaume (`ToitChaume` : croupes, rangs, mèches, rebord en deux rangs, frange, faîtage posé dans
  la crête), chevrons, arc de claveaux, porte, fenêtre, cheminée (fondation, épaulement, solin).
- Aperçus : `apercu.py` (occlusion cuite, 12 caméras, planche, capsule du joueur, `controle.txt`).
- Objets : `objets/banc.py`, `objets/tas_bois.py`.
- Maisons : `maisons/chaumiere.py` validée (tour 9, tout à 8+), dans le jeu. Les autres maisons sont encore dans l'ancien `../maisons.py`.

## Chaumière : tours de contrôle
- Tour 1 : posé 4, matières 7, formes 6, style 8, lisibilité 7, passage 9, coût 4 → À REFAIRE.
  Faîtage qui flotte, cheminée démesurée et mal posée, chaume « pâte » sans bord, trous de mortier dans les murs,
  toit en coussin vu de dessus, 36 712 triangles.
  Corrigé : faîtage qui suit la crête, nouveau mur (pierres coupées au bord des ouvertures, face cachée supprimée),
  toit à rangs + mèches + rebord en deux rangs + frange + chevrons, coins moins ronds, cheminée à fondation et solin,
  hauteur du faîte + 0,55 m, marche de 12 cm, objets allégés → 18 394 triangles.
- Tour 2 : posé 7, matières 7, formes 7, style 8, lisibilité 7, passage 9, coût 7 → À REFAIRE.
  Cheminée trop haute en vue 04, taches noires sur le solin, frange en dents de scie, toit lisse en 01/02/05,
  toit en cône (vue 02) et en coussin (vue 11).
  Corrigé (changement d'approche pour la forme) : pignons droits à demi-croupe (z_demi) fermés de planches
  (kit : pignon_planches), mèches en relief, rangs plus marqués, haut du chaume plus clair, frange groupée irrégulière,
  solin en dalles posées sur le chaume, cheminée au faîte + 0,45 m, cadrage des 12 caméras relevé → 22 322 triangles.
- Tour 3 : posé 7, matières 6, formes 7, style 7, lisibilité 8, passage 9, coût 6 → À REFAIRE.
  Pignon : bonne idée. Chaume lisse puis matelassé depuis 3 tours → CHANGEMENT D'APPROCHE : le chaume est posé en
  rangs qui suivent les courbes de niveau du toit (carrés de marche), chacun recouvre le suivant et finit en mèches ;
  la coque n'est plus que la forme. Aussi : pierres d'angle et de mur arrêtées au bord des volets (revenait depuis
  3 tours), planches de pignon jointives, collerette basse à la cheminée → 19 228 triangles.
- Tour 4 : posé 7, matières 7, formes 7, style 8, lisibilité 8, passage 9, coût 7 → À REFAIRE.
  Chaume en rangs : « vraie réussite ». Restaient : bourrelet lisse au bord, plaquettes près de la cheminée (venaient
  de la bosse du chaume autour du conduit : contours en petites boucles), bande lisse sous le faîtage, sommet de
  demi-croupe en désordre, pierre sur un volet, 19 228 triangles.
  Corrigé : pignons droits, plus de bosse autour de la cheminée, rebord mince, frange = mèches longues du rang du bas,
  dessous en paille, rangs depuis le sommet, fenêtres décalées, 18 208 triangles.
- Tour 5 : posé 8, matières 7, formes 8, style 8, lisibilité 9, passage 9, coût 8 → À REFAIRE (matières seulement).
  Dessous du toit et bord des pignons vert olive et lisses, frange en dents de scie, pierre de l'arc de la porte sur
  un volet, petites plaquettes à la cheminée (bouts de rangs contre le conduit).
  Corrigé : dessous et rebord en paille dorée, frange douce, rangs coupés autour de la cheminée, fenêtres à ±1,72 m,
  18 016 triangles.
- Tour 6 : posé 8, matières 7, formes 8, style 8, lisibilité 9, passage 9, coût 8 → À REFAIRE (matières).
  Frange, volets, cheminée : faits. Bord olive lisse depuis 3 tours → CHANGEMENT D'APPROCHE : rebord de coque supprimé,
  « rang de rive » en mèches tout autour du toit, dessous très clair (l'occlusion le ramène au doré).
  Banc de test : sol des rendus vert-brun terne comme le jeu (le vert vif teintait les dessous de toit), ciel un peu
  plus fort comme le jeu de jour. 18 764 triangles.
- Tour 7 : posé 8, matières 7, formes 8, style 8, lisibilité 9, passage 9, coût 8 → À REFAIRE (matières).
  Rang de rive : progrès. Dessous du toit toujours olive (4e tour). Cause : un jaune assombri par l'ombre se lit olive.
  Corrigé : matière « chaume_d » (brun de paille chaud) pour le dessous et la tranche, rive au ton des rangs,
  mèches courtes aux coins. Leçon pour le kit : toute face qui sera à l'ombre (dessous, tranches) se colore en brun
  chaud, jamais en jaune.
- Tour 8 : posé 8, matières 7, formes 8, style 8, lisibilité 9, passage 9, coût 8 → À REFAIRE (matières).
  Olive : disparu. Restaient une bande orange sous le faîtage (dessus de la coque passé au brun) et un dessous lisse.
  Corrigé : dessus de coque en paille sombre, dessous en bandes contrastées, chevrons tous les 55 cm. 18 684 triangles.
- Tour 9 : posé 8, matières 8, formes 8, style 8, lisibilité 9, passage 9, coût 8 → PASSE.
  Intégrée au jeu (village.glb refait par `../maisons.py`, meshopt 3,2 Mo), capture avant/après dans le jeu,
  version 2026.11.03-1, cache sw v10. Reste au propriétaire de donner son avis (dernier mot).
  Suggestions non faites : bandes plus claires entre les chevrons, plaquettes sous la collerette, mousse, marche.

## Correction du kit (important)
Une modification ratée avait laissé dans `kit.py` une deuxième copie de la fin du fichier (pignon, porte, fenêtre,
cheminée) : Python prenait la dernière, avec l'ancien solin à quatre dalles. D'où les « plaquettes » de cheminée que
l'inspecteur voyait à chaque tour. Doublon supprimé ; la chaumière du jeu sera refaite avec la bonne collerette au
prochain export du village. Leçon : après chaque modification par script, vérifier `grep -c "^def " kit.py`.

## Maison à colombages (`maisons/colombage.py`)
Nouvelles pièces du kit : pan de bois (sablières, poteaux, décharges, croix de Saint-André, panneaux de torchis),
toit de tuiles (`ToitTuiles` : rangs de tuiles bombées, faîtières, planches de rive, dessous brun), pignon en enduit et
bois (prisme qui suit le toit), escalier, porte droite à linteau de bois, volets d'une autre couleur.
- Avant contrôle : capsule bloquée par 3 marches de 30 cm (le joueur monte 30 cm au plus) → 4 marches de 22,5 cm et
  40 cm de profondeur ; enduit de pignon rectangulaire qui perçait le toit → prisme ; caméras qui reculent pour les
  maisons hautes. 30 468 triangles (ancienne : 40 560).
- Tour 1 : posé 7, matières 7, formes 8, style 7, lisibilité 8, passage 9, coût 6 → À REFAIRE.
  Cadrage qui coupe le pied, enduit gris froid, porte nue, dalles fines dans le soubassement, 30 468 triangles.
  Corrigé : caméras reculées, enduit crème-ocre (5 nuances, bas sali), auvent (kit), lanterne, tonneau et pot de
  fleurs (objets/), dernier rang de pierres jamais en plaquette (kit : assises), bois fins sans chanfrein → 25 060.
- Tour 2 : posé 8, matières 8, formes 8, style 8, lisibilité 8, passage 9, coût 8 → PASSE.
  Dans le jeu (village.glb refait, la chaumière a aussi sa vraie collerette), version 2026.11.03-2, cache sw v11.
  Suggestions non faites : pignons un peu plus chauds, mousse au soubassement, chevrons sous l'avant-toit.

## Implantation des villages (`implantation.js`)
Outil prêt (12 vues par village dans le jeu + rapport chiffré + planche). Premier constat chiffré à Mistholm : un
colombage avec le seuil à 2,05 m au-dessus du sol (marches jusqu'à 0,9 m seulement), soubassements découverts jusqu'à
1,4 m, une porte bouchée. Nouveau plan dans le jeu (batirVillage) : place pavée (9,5 m), trois rues vers le terrain le plus doux,
jusqu'à six maisons autour de la place (porte vers la place), les autres le long des rues (façade côté rue), relief
aplani sous les maisons et devant les portes (aplanir, puis texturesRelief refait), maisons d'une rue au profil
adouci de la rue, carte du sol par village (SOL : terre battue rouge, pavés et dalles vert ; terrain et herbe la
lisent), accessoires hors des rues et des portes, seuil gardé pour toutes les maisons (forge).
- Mistholm : tour 1 (2 à 6) → tour 2 (7-8) → tour 3 PASSE (tout à 8). Suggestions : clôtures et potagers, axe
  d'approche dégagé, palier devant la chaumière n°8, marche de la forge.
- Saltcliff, Fernhollow, Stonebrook : en contrôle.
## Longère et forge (agent séparé, worktree)
Deux fichiers : `maisons/longere.py` puis `maisons/forge.py`. Emprise, point « porte » et intérieur gardés comme dans
l'ancien `../maisons.py` (le jeu les lit) : longère (7,4 × 14,6), (0, -7.6, 1.0), « halle » ; forge (7,4 × 6,4), (0, -3.6, 0.5), sans intérieur.
- Kit, section « ajouts longère et forge » (fin de `kit.py`, aucune pièce existante modifiée) : `ToitTourne` (un toit à
  faîte selon X tourné d'un quart de tour : faîte selon Y, porte dans le pignon), `planches_verticales` (bardage ou pignon,
  haut de chaque planche qui suit la pente, trous pour porte et fenêtres), `dalles`, `tete_dragon`, `rives_croisees`
  (planches de rive croisées au faîte + têtes de dragon + volige sous le débord), `mousse` (plaque posée selon la pente),
  `fumoir` (lanterneau à fumée), `foyer_forge`, `poteau`. Matières ajoutées : cuir, eau, braise, charbon, bois_s (bois goudronné).
- Objets : `objets/bouclier.py` (rond peint, trois motifs).
- Longère, avant contrôle : chaume `ToitChaume` (égout à 0,85 m, faîte 5,8 m, pignons droits), soubassement de moellons
  jusqu'au plancher (1 m), pignons de planches goudronnées, porte à linteau de bois + 4 marches de 25 cm, rives croisées
  en têtes de dragon, lanterneau, mousse, boucliers, banc, tonneau, tas de bois. Corrigé soi-même avant contrôle : petit
  toit du lanterneau en V (sens de rotation), têtes trop petites et trop sombres (× 1,5, bois clair), dessous de chaume
  jaune sous le débord des pignons (volige de planches). 25 124 triangles (ancienne : 50 932). Capsule : passe (sol au
  seuil 0,75 m) ; ouverture mesurée 0,86 × 2,06 m (la mesure bute sur l'anneau de la porte, à 1 m ; 1,2 m entre les montants).
  Rendus : `scratchpad/qc/longere1/`.
- Longère, tour 1 : posé 8, matières 7, formes 8, style 7, lisibilité 8, passage 8 (sous réserve), coût 9 → À REFAIRE.
  Pignons presque noirs, mousse en « autocollants », longs côtés vides, entrée trop sombre, sol au seuil 0,75 m,
  largeur mesurée sur l'anneau, rives lourdes et chevilles isolées.
  Corrigé : bois_s en brun chaud (3 teintes, 14 % de planches plus claires), porte rouge (matière peint_r) à cadre clair
  (`porte` et `fenetre` du kit ont un paramètre `mat_cadre`, « chene » par défaut : les autres maisons ne changent pas),
  lanterne près de la porte, rives en bois clair chanfreiné avec bandes peintes rouge et ocre, chevilles supprimées,
  mousse supprimée, chaume vieilli (`ToitTourne.construire(vieilli=…)` : chaque rang sa nuance, gris et brun vers le bas),
  fumée stylisée au lanterneau (kit : `fumee`, matière fumee), sur chaque long côté tas de bois, tonneaux, banc, pots,
  lanterne sur poteau, cailloux, herbe (kit : `cailloux`, `herbe`) posés juste au-delà de la frange (0,3 à 0,9 m hors de
  l'emprise : pas de collision dans le jeu pour eux). Palier de pierre au niveau du plancher devant la porte, puis 3 marches
  de 25 cm : le point « porte » est sur le palier (sol au seuil 1,00 m). Banc de test commun (`apercu.py`) : la largeur de
  porte est mesurée à 0,6 m et à 1,4 m au-dessus du plancher, on garde la plus grande (une poignée ne la réduit plus).
  29 300 triangles, capsule passe, porte 1,20 × 2,06 m. Rendus : `scratchpad/qc/longere2/`.
- Longère, tour 2 : posé 8, matières 8, formes 8, style 8, lisibilité 8, passage 9, coût 8 → PASSE.
  Après : fumée en géométrie retirée (en boules figées elle se lit comme des blocs ; le jeu la fera s'il le faut ; la pièce
  `fumee` reste au kit mais n'est plus utilisée), chaume un peu plus vieilli en bas (vieilli 0,7).
  **Pied changé** : 9,2 × 14,6 m (avant 7,4 × 14,6) pour couvrir les objets des longs côtés (posés à ±4,25 à ±4,32 m) :
  à reporter dans la table MAISONS de `../maisons.py` à la fusion. Point « porte » (0, -7.6, 1.0) et intérieur « halle » inchangés.
  Contrôle final : `scratchpad/qc/longere3/`. À intégrer au jeu à la fusion (pas fait ici).

## Forge (`maisons/forge.py`)
- Objets : `objets/enclume.py`, `soufflet.py`, `etabli.py` (et `fer_a_cheval`), `ratelier.py`, `baquet.py`, `enseigne.py`.
- Premier jet : plateforme de pierre à 0,5 m (dalles, 2 marches de 25 cm), façade ouverte entre quatre poteaux sur dés,
  grosse poutre et aisseliers, entraits et poinçons, toit de tuiles (`ToitTuiles`), mur du fond en pierre avec le foyer de
  forge (braises dans W_), hotte sur manteau de bois et cheminée, murets de pierre et planches sur les côtés, fenêtre à
  droite, enseigne pendue sous la poutre. Emprise 7,4 × 6,4 m inchangée. **Point « porte » changé** : (0, -2.0, 0.5) sur le
  sol de la forge (avant (0, -3.6, 0.5), dans le vide devant la plateforme) ; sans intérieur, le jeu ne le lit pas.
  `controle.txt` : la mesure de porte commune (montants, arc) est remplacée par « sans objet », et une ligne mesure le
  côté ouvert (largeur entre les poteaux du milieu, hauteur libre sous l'enseigne).
  Corrigé soi-même avant contrôle : intérieur presque noir (seule la façade éclairait) → côté droit ouvert au-dessus du
  muret (poteau, sablière, aisseliers, pignon de planches seulement en haut), la fenêtre de ce côté est supprimée.
  18 288 triangles (ancienne : 26 352, soit 69 %). Capsule : passe (sol au seuil 0,50 m) ; côté ouvert 2,21 m de large,
  1,95 m sous l'enseigne. Rendus : `scratchpad/qc/forge1/`. En attente du tour 1 de contrôle.
  Points faibles connus : dessous du toit très sombre en vue 12, grand mur du fond en pierre nu (vue 03).
- Forge, tour 1 : posé 8, matières 8, formes 8, style 7, lisibilité 8, passage 8, coût 9 → À REFAIRE (style).
  Intérieur presque noir, feu en petite tache, mur arrière vide, pignon gauche lisse avec un bloc isolé (bout de la
  poutre de façade), losange noir sous le faîtage (entaille en V entre les deux pans de la coque de tuiles), métier peu lisible depuis la rue.
  Corrigé : foyer plus grand (1,8 × 1,2 m), tas de braises bombé visible de face et de côté, six flammes, plaques de
  lueur orange (dans W_, matières flamme et lueur), margelle basse devant ; intérieur éclairci en brun chaud
  (kit : `eclaircir`, avec une condition `garde` pour ne toucher que le dessous du toit) ; chevrons clairs sous les
  tuiles ; panne faîtière qui ferme le faîte ; poutre de façade qui traverse les pignons ; aérations aux deux pignons
  (kit : `aeration`), fers à cheval cloués et échelle appuyée (objets/echelle.py) au pignon gauche ; soufflet à gauche
  du feu et râtelier de marteaux et pinces au mur du fond (vus de la rue), enclume plus en avant ; fer à cheval
  au-dessus de l'enseigne ; suie en haut de la cheminée ; au pied du mur du fond : tas de bois, tas de charbon et pelle,
  tonneau, herbe. **Pied changé** : 7,4 × 7,6 m (avant 7,4 × 6,4) pour couvrir les objets au pied du mur du fond.
  21 368 triangles (81 % de l'ancienne), capsule passe, côté ouvert 2,22 × 1,95 m. Rendus : `scratchpad/qc/forge2/`.
- Forge, tour 2 : posé 8, matières 8, formes 7, style 8, lisibilité 8, passage 8, coût 9 → À REFAIRE (formes).
  Le losange noir à la pointe des pignons revenait (2e fois). Vérifié en agrandissant ses propres rendus 02 et 04 : le
  jour passait par l'encoche en V entre les deux planches de rive de `ToitTuiles`, sous le bout de la faîtière (la
  panne, plus bas, ne pouvait pas le fermer). Corrigé : about de faîtage en bois (disque brun) à chaque pignon, qui
  couvre l'encoche et le bout de la faîtière. Aussi : lueur chaude au sol devant le feu (dans W_).
  Leçon : vérifier soi-même chaque défaut signalé en agrandissant la zone du rendu avant de le corriger. La maison à
  colombages a les mêmes planches de rive : à regarder de près si l'inspecteur y voit un jour.
  21 452 triangles, capsule passe. Rendus : `scratchpad/qc/forge3/`.
## Pêcheur (`maisons/pecheur.py`, agent séparé, worktree)
Maison de Saltcliff (répétée 8 fois) : planches peintes à clin sur un plancher porté par 12 pilotis, terrasse côté terre
avec garde-corps et escalier de bois, coursives, ponton et échelle côté mer, barque amarrée, filet qui sèche, casiers,
bouée, rames, rouleau de corde, tonneau, lanterne. Trois variantes (`construire(graine, variante)`, défaut graine % 3) :
rouge (bardeaux gris, porte et volets bleus), bleue (tuiles, porte rouge, volets crème), verte (bardeaux bruns, bois naturel).
- Gardé de l'ancienne : emprise « pied » 6 × 7, point « porte » (0, -4.0, 1.45) sur la terrasse, intérieur « maison ».
  Dépassent de l'emprise (comme l'ancienne terrasse) : l'escalier et sa dalle côté terre (jusqu'à y = -7,2) ; le ponton
  (jusqu'à y = 6,2) et la barque (x jusqu'à 4,0, y jusqu'à 6,5) côté mer. Ils ne sont pas dans le rectangle de collision du jeu.
- Eau : le jeu pose la maison à y = 0,2 au-dessus de la mer → eau à z = -0,2 dans le repère de la maison. La barque
  flotte à z = -0,2. Aperçus : `apercu.py: apercu_maison_eau` (rivage en pente, terre à z = 0 côté porte, plan d'eau,
  occlusion cuite avec le sol au niveau de l'eau) ; `apercu_maison` des autres est inchangée.
- Kit (« # ---- ajouts pêcheur » à la fin de kit.py) : face_vers, plaque, mur_clins, coin_planches, encadrement,
  ToitBardeaux (sous-classe de ToitTuiles, même forme), pilotis, plancher, garde_corps, escalier_bois, tore, tuyau_poele.
  Aucune pièce existante modifiée. Matières ajoutées à la fin de materiaux.py (clin_*, blanc, goudron, algue, bardeau*, corde, filet, liege, bouee_r).
- Objets : ponton, echelle, casier, filet, bouee, rame, barque, corde (objets/*.py).
- Avant contrôle (corrigé par le fabricant) : aileron brun qui perçait le toit (plaque de cœur de comble supprimée) ;
  filet en bâche → vrais fils en losanges ; capsule bloquée par la 2e contremarche (marches de 33 cm moins profondes que
  le rayon de la capsule, 35 cm) → marches de 38 cm, escalier décalé devant la planche de rive ; mesure de la porte faussée
  par l'anneau du kit (même hauteur que la mesure, 1 m) → porte de 1,2 m ; joint de plancher dans l'axe de la porte → 25 planches ;
  caméras 09 et 12 ancrées à 0,6 m devant la porte (le point « porte » est 1,4 m devant, sur la terrasse) ; 14 308 → 12 214 triangles.
- Premier jet : 12 214 triangles (ancienne : 5 620), capsule PASSE (5 marches de 24 cm), porte 0,86 × 2,06 m mesurés.
  Rendus : scratchpad `qc/pecheur1/` (variantes dans `variante_bleue/`, `variante_verte/`). En attente de l'inspecteur.
- Tour 1 (rouge) : posé 6, matières 8, formes 7, style 8, lisibilité 8, passage 8, coût 6 (12 214) → À REFAIRE.
  Pied d'escalier qui flotte au-dessus du sable, pilotis et escalier mêlés à la plage, décrochage ponton / terrasse,
  poteau de garde-corps qui cache le seuil en 09, façade arrière et pignon côté mer vides, porte brune de la verte
  qui se perd, plus de 10 500 triangles.
  Corrigé : marche du bas en pierre enterrée (kit : escalier_bois, 4 marches de bois + 1 de pierre, 24 cm) et dalle
  d'approche ; aperçu avec la terre jusque sous la terrasse (y_rive -4,2), pieux de devant sur des plots de pierre,
  contreventements à 30 cm au-dessus du sable et de l'eau ; ponton avec les mêmes planches de rive que le plancher
  (dessus au même niveau) ; garde-corps de 80 cm (on voit le seuil par-dessus), bouée déplacée ; côté mer : lanterne,
  caisse, bouée sur le pignon ; planches plus nuancées (passées, plus foncées) ; porte rouge pour la verte ;
  allègements (bardeaux et tuiles plus grands, pilotis à 6 pans, rames, barque, corde, bouée, jardinière légère,
  un tonneau en moins, chevrons tous les 70 cm). Mesure de la porte à 0,6 et 1,4 m dans `apercu_maison_eau`
  (`ouverture_porte`, même logique que la correction faite ailleurs dans `capsule`).
- Tour 2 : rouge 10 476, bleue 10 420, verte 10 476 triangles (vitres comprises) ; capsule PASSE, porte 1,20 × 2,05 m.
  Objets nommés M_pecheur / M_pecheur_b / M_pecheur_c (et W_) ; .glb de chacun dans le dossier de ses rendus
  (scratchpad `qc/pecheur2/`, `variante_bleue/`, `variante_verte/`). En attente de l'inspecteur.
- À la fusion : `../maisons.py` doit appeler `construire(variante=0, 1, 2)` pour les trois maisons ; le jeu les répartit.

## Héros (agent séparé, worktree `worktree-agent-adb19e9034e46bb45`, voir `blender/dragonflyer/personnages/PASSATION.md` sur cette branche)
- Tour 1 : proportions 8, visage 8, cheveux et vêtements 6, articulations 7, animations 5, style 8, coût 6 → À REFAIRE.
  Trou sur le crâne, fourrure en bretelles, jupe en boule, manche pincée, banc d'animation mal cadré, saut en T,
  épée absente du banc, allures trop proches, 28 748 triangles. Tour 2 demandé.
- Tour 2 : proportions 8, visage 8, cheveux et vêtements 8, articulations 7, animations 7, style 8, coût 9 (14 728) →
  À REFAIRE. Restent : dôme de jupe en écart (3e fois : changement d'approche imposé), disques de pied illisibles,
  marche trop énergique, épée en fil trop long. Note : animations.glb du worktree est déjà refait (retouches des
  allures) ; à la fusion, prendre version et cache sw après ceux de la chaumière (2026.11.03-1, v10). Tour 3 demandé.
- Tour 3 : tout à 8 sauf animations 7 (jupe en deux pans : réglée). Restent : trot et course trop proches et vitesses
  inversées, glissement de la marche 5,1 cm, contacts de pieds à prouver, coup d'épée raide et lame peu visible. Tour 4 demandé.

- Tour 4 : animations 7 (réception du saut 10,5 cm, épée à prouver par contact). Tour 5 : PASSE (tout à 8 ou plus,
  coût 9, 14 784 triangles). Intégration au jeu demandée à l'agent (fusion de la branche de travail d'abord).

## Arbres (agent séparé, worktree, `blender/dragonflyer/vegetation/PASSATION.md` sur sa branche)
- Refaits de zéro par scripts (sapin, feuillu), contrôle par 12 caméras et planche « forêt ». Tour 1 en fabrication.

## Pierre et moulin (agent séparé, worktree ; à fusionner)
Nouvelles matières (fin de `materiaux.py`) : pierre_s (pierre sombre, gris chaud), ardoise, ardoise_d (dessous brun),
lichen, volet_r, bardeau, bardeau_d, toile, jute. Nouvelles pièces (fin de `kit.py`, section « ajouts pierre et moulin ») :
`teinter` (repeint des moellons dans une autre matière, en gardant les écarts de clarté), `rogner` (pignon de pierre :
pierres au-dessus du toit supprimées, les autres rabotées selon la pente), `prisme_pignon` (cœur plein du pignon),
`ToitArdoises` (rangs d'ardoises soulevées en bas, joints décalés, deux rangs d'écailles, lichen rare, dessous en planches
brunes, rives, faîtage en ardoises croisées), `tour_pierres` (tour ronde qui s'affine), `cone_bardeaux` (chapeau conique
bombé), `cheminee_pignon` (cheminée maçonnée sur 3 ou 4 faces avec `mur_moellons`, glacis, chapeau, deux pots).
Aucune pièce existante modifiée. Objets : `objets/sacs_grain.py`, `objets/meule.py`.

### Maison de pierre (`maisons/pierre.py`)
Même emprise (6,8 × 7,6), même point « porte » (0, -4.3, 0), intérieur « maison ». Murs 6,4 × 7,2, toit à 42°
(égout 3,0 m, faîte 6,7 m), cheminée contre le pignon droit jusqu'à 7,6 m. `construire(graine, variante)` :
0 = cheminée à droite, volets rouges, banc, tas de bois, lanterne ; 1 = miroir (cheminée à gauche), volets verts,
tonneau, pot ; 2 = volets bleus, banc sur le côté, deux pots. Le jeu n'a qu'un type « pierre » (une seule géométrie
instanciée) : pour varier il faudrait exporter M_pierre_1, M_pierre_2… (à décider à la fusion).
- Premier jet (pierre0) : joints presque noirs, cheminée du kit en « pile d'assiettes » vue de côté (une pierre par rang
  sur la face latérale), lichen trop régulier, vides sombres autour des fenêtres. Corrigé : cœur en mortier gris-brun,
  `cheminee_pignon`, lichen 3 %, ouvertures serrées au bord des volets et de l'appui.
- Tour 1 (`qc/pierre1/`, 21 371 triangles) : posé 8, matières 7, formes 8, style 7, lisibilité 8, passage 9, coût 8
  → À REFAIRE. Murs d'un seul gris froid, façade austère, faîtage nu et plat, point noir au sommet du pignon, pierres en
  rouleaux qui dépassent à l'angle de la cheminée, points blancs au bord des ardoises (vue 12).
  Corrigé : pierre_s en gris chauds, beiges, bruns-ocre (8 teintes), une pierre sur huit nettement plus claire ou plus
  foncée, pied des murs plus chaud (`teinter`) ; soubassement plus saillant de 12 cm ; paillasson, pot et plante
  grimpante qui fait le tour de l'arc, seau et balai (objets/seau.py, objets/balai.py), pots sur le banc ; faîtières de
  pierre (13 cm) sur le faîtage ; épi de bois au sommet du pignon libre ; `cheminee_pignon` refaite : vraies pierres
  d'angle alternées longue/courte, mêmes assises que les murs, rangs du sol plus saillants ; dernier rang d'ardoises
  arrêté au bord de la coque (le jour passait entre les ardoises qui dépassaient) ; 5 % d'ardoises teintées vert ou brun.
  Variantes nommées M_pierre, M_pierre_1, M_pierre_2 ; `pierre.py -- <dossier> --variantes` fait `variantes.png`.
- Tour 2 à inspecter : `qc/pierre2/` (+ `variantes.png`), 22 247 triangles (62 % de l'ancienne), capsule PASSE, porte
  0,86 × 2,14 m. Ajout en cours de tour : planche d'égout le long des égouts (`ToitArdoises`), le bord ne brille plus en vue 12.

### Moulin (`maisons/moulin.py`)
Même emprise (6,2 × 6,2), même point « porte » (0, -3.6, 0), pas d'intérieur. Tour ronde de pierre qui s'affine (rayon
2,8 → 2,05 m, haut 8 m), couronne de bois sur corbeaux, chapeau de bardeaux bombé (pointe à 11,5 m avec l'épi), nez
qui abrite l'arbre, queue de manœuvre (borne au sol à y = 3,75 : hors emprise). Ailes `A_moulin` : même convention que
l'ancien (`axe` en repère Blender, objet placé à l'axe, maillage centré, rotation autour de l'axe Y de Blender) ; axe
déplacé de (0, -3.15, 8.4) à (0, -3.4, 9.0) et ailes de 5,8 m au lieu de 6,6 m : le bout passe à 3,2 m du sol et
0,6 m devant la tour (avant, il balayait la porte à hauteur du joueur). Sacs de grain et meule (objets/).
- Premier jet vu par moi : porte de 1,1 m mesurée à 0,78 m (la mesure bute sur l'anneau) → 1,2 m ; tour d'un gris
  uniforme → `teinter` (écarts de clarté, pied plus chaud) ; chapeau un peu juste → débord 0,62 m.
- Tour 1 (`qc/moulin1/`, 8 956 triangles) : posé 7, matières 8, formes 7, style 7, lisibilité 8, passage 7, coût 8
  → À REFAIRE. Ailes non prouvées sans danger, nez quasi absent, couronne lisse sans corbeaux, queue trop maigre qui
  cachait la fenêtre du dos, sacs et meule timides, pied nu, porte et fenêtres petites, sac enfoncé dans le mur.
  Corrigé : contrôle des ailes sur un tour complet dans `controle.txt` (bord le plus bas, et rayons le long de chaque
  arête des ailes contre le moulin, 120 positions) ; casquette de bardeaux à deux pans qui sort du chapeau, pignon de
  planches d'où sort l'arbre, moyeu plus petit et bout en pointe ; 16 corbeaux de pierre à deux assises sous une
  couronne de bois plus large ; queue de perches de 15 cm vers l'arrière gauche (dans l'emprise : borne à 3,9 m de l'axe,
  en (-2.76, 2.76)), traverse, barre du treuil, borne sur une pierre d'appui ; tas de 5 sacs ocre (un ouvert plein de
  grain), tonnelet près du seuil, posé tangent à la tour ; touffes d'herbe et fleurs au pied du mur, lanterne à gauche de
  la porte ; porte 1,15 × 2,3 m, fenêtres 0,6 × 0,74 m, pierres coupées en deux autour de la porte (`tour_pierres`,
  paramètre `fines`) ; cœur en mortier gris-brun, ouvertures resserrées. Budget tenu en allégeant (corbeaux sans
  biseau, tour en pierres de 1 m, bardeaux plus larges, 8 barreaux par aile).
- Tour 2 à inspecter : `qc/moulin2/`, 9 306 triangles (M 8 494 + vitres 72 + ailes 740), capsule PASSE, porte mesurée
  0,82 × 2,29 m (la mesure va du montant à l'anneau ; l'ouverture réelle fait 1,15 m), ailes : bord le plus bas à
  3,11 m, aucun contact.
- Tour 2 : posé 8, matières 8, formes 8, style 7, lisibilité 8, passage 8, coût 8 → À REFAIRE (style, au pied).
  Sacs lus comme des pots ou des cailloux, tonnelet en étoile (douelles écartées : `tonneau` à 8 douelles et petit
  rayon), fleurs invisibles.
  Corrigé : sacs refaits en cylindres renflés plus hauts que larges, col plissé, ficelle et houppe, toile crème-ocre
  plus claire ; tas de deux sacs couchés, un troisième dessus, un debout noué, un debout ouvert ; tonnelet : le tonneau
  du village réduit restait en étoile (avec `poutre`, chaque douelle prend sa propre orientation au lieu d'être tangente :
  à surveiller aussi sur `objets/tonneau.py`), d'où `objets/tonnelet.py` (fût bombé lisse, 2 cerclages, fond, joints) ; trois massifs fleuris (rose, blanc, rouge, 12 fleurs) de chaque côté de la porte et au pied
  du mur ; mesure de largeur de la porte à 0,6 et 1,4 m dans le rapport. Pour le budget : 12 corbeaux au lieu de 16,
  7 barreaux par aile, bardeaux plus larges, la fenêtre la plus haute retirée, moins de touffes.
- Tour 3 à inspecter : `qc/moulin3/`, 9 288 triangles (M 8 536 + vitres 60 + ailes 692), capsule PASSE, porte 1,15 m
  entre les montants (à 0,6 et 1,4 m), ailes : bord le plus bas à 3,11 m, aucun contact.
- Maison de pierre : PASSE au tour 2 (tout à 8, passage 9). Suggestions non faites : pierres d'encadrement autour des
  fenêtres latérales, épi plus épais, pied du mur moins régulier.

## Prochaine étape
Finir la chaumière (tout à 8+), l'intégrer : `../maisons.py` appelle `village/maisons/chaumiere.py:construire()`,
puis capture dans le jeu, puis montrer au propriétaire. Ensuite : une maison à la fois (colombage, longère…).

## Fusion des maisons validées (3 novembre, fin de journée)
- Forge (tour 3), longère (tour 2), maison de pierre et ses 2 variantes, moulin (tour 3), maison de pêcheur et ses 2 variantes
  (tour 2) : toutes PASSE, fusionnées dans la branche de travail. `../maisons.py` les fabrique toutes (`NOUVELLES`, `VARIANTES`),
  avec l'emprise, la porte et l'intérieur de leur propre fichier ; les ailes du moulin viennent de `moulin.py` (axe `AXE`).
- Conflits de fusion réglés : la matière « bardeau » du pêcheur s'appelle maintenant `bardeau_p` / `bardeau_pd` (celle du moulin
  garde « bardeau ») ; l'échelle du quai est `objets/echelle_quai.py` (celle de la forge reste `objets/echelle.py`).
- Le jeu répartit les variantes (`VARIANTES_MAISON`) ; `ENFONCE` est vide (la longère et la forge ont leurs marches).
- Barques au large : `objets/barque.py` exportée en P_barque, P_barque_r, P_barque_v (avant : des boîtes de couleur).

## Implantation, tours suivants
- Cabanes de pêcheur : le pied de l'escalier (7,3 m devant le centre) sur la terre ferme, palier aplani devant et sous
  l'escalier, rang continu (3,5 m entre deux cabanes). Le rapport mesure le « pied de l'escalier » au lieu du seuil.
- La place n'était pas plate : les paliers des maisons voisines plus hautes la rognaient (jusqu'à 3 m à Stonebrook). Désormais
  la place et le dessous de chaque maison ne sont jamais rognés par la marge d'un autre plat (`coeur` dans `aplanirExact`),
  et une maison à moins de 8 m du bord de la place est à son niveau ; pas de voisines proches à des étages différents.
- Herbe : sa largeur suit sa hauteur (plus de brins couchés à plat sur les pavés).
- Bordure basse de pierres autour de la place (muret à 20 %), 3 bancs et 3 lanternes, murets de place jamais isolés,
  accessoires hors d'un couloir de 4,5 m devant chaque seuil (selon leur taille), caméras 08/09 jamais dans un mur.
- Résultat : les quatre villages PASSENT (tout à 8 ou plus) : Mistholm (non-régression), Fernhollow tour 6, Saltcliff tour 4,
  Stonebrook tour 8. Derniers changements : rampe droite et exacte au départ de chaque rue (pavée seulement si douce),
  murets contre les maisons avec la terre relevée derrière (jamais sur un palier), anciens pas japonais vers les portes
  supprimés, galets jamais sur une rue, rues en pente aussi claires que les plates.
  Suggestions non faites : rocher vert clair voyant à Stonebrook, rampe de l'ouest un peu plus beige, fleurs le long de la
  bordure, banc de Mistholm dans l'axe d'une porte (hors du couloir de 4,5 m), bout des rues en fondu plus long.
- Reste : les arbres (agent séparé, tour 6 en fabrication), puis leur intégration au jeu (arbres.glb).

## Intérieurs (agent séparé, worktree ; à fusionner)
Les deux anciens intérieurs (`../maisons.py` : `interieur`, `meubler_maison`, `meubler_halle`) sont refaits par la méthode,
une pièce à la fois, dans `interieurs/<nom>.py`, faits seulement du kit et des objets. Contrat du jeu gardé (`creerInterieurs`) :
objets I_<nom> et IL_<nom> (ce qui brille), propriétés « taille » [l, p, h] et « porte » (0,9 m devant la porte), plus
« foyer » (position du feu, aujourd'hui écrite en dur dans le jeu) et « obstacles » (rectangles des meubles, à plat :
x, y, demi-largeur x, demi-largeur y ; le jeu ne bloque pas encore les meubles, `I.bloquer` pourra les lire).
- Matières (fin de `materiaux.py`) : platre_i, plancher, laine_r/o/b, lin, faience, faience_b, pain, herbe_s, lavande, cire, cuivre, pomme, fenetre_j.
- Kit (section « ajouts intérieurs » à la fin de `kit.py`, 60 définitions) : boite_douce (arêtes arrondies, faces lisses),
  boite_effilee (hotte), pile_moellons, mur_interieur (torchis entre poteaux, sablière, plinthe, bas sali, haut enfumé,
  ouvertures), plafond_solives (planches, solives, poutre maîtresse), porte_interieure, fenetre_interieure (vitre claire
  dans I_, pas dans IL_ : elle ne brille pas la nuit), feu_de_bois (chenets, bûches, braises et flammes dans V).
- Objets (`objets/`) : table, banc_interieur, tabouret, lit, coffre, tapis, etagere (vaisselier), vaisselle (assiettes,
  bols, cruche, pots, pain, pommes), chandelle, herbes (bouquets pendus), panier_buches, cheminee_interieure ; réutilisés :
  tonnelet, caisse, seau, balai, pot_fleurs, sacs_grain.sac.
- Banc de test (`apercu.py`, fin) : `apercu_interieur` (12 caméras fixes dans la pièce, lumière du feu + jour par les
  fenêtres + ambiance douce, vue 11 en coupe orthographique sans plafond, vue 12 feu seul), `carte_acces` (capsule 0,35 m
  × 1,7 m sur grille de 25 cm, reste à 0,45 m des murs comme `garderDansPiece`, capsule large de 0,9 m pour les passages,
  cibles à moins de 1 m, carte_acces.png), `controle_poses` (flotte, s'enfonce, dans le mur, meubles qui se traversent :
  boîtes puis vrai contact des triangles), occlusion cuite courte (0,8 m : dans une pièce fermée, tout serait à l'ombre).
  Grille de l'inspecteur : `.claude/skills/modele-3d/inspecteur_interieur.md`.
- Maison (`interieurs/maison.py`, 7 × 6 × 3 m) : cheminée au fond au milieu (le foyer du jeu), coin du lit au fond à
  gauche (lit, coffre), coin cuisine au fond à droite (bûches, vaisselier, tonnelet), table et deux bancs à droite, tapis
  et tabouret devant le feu, herbes sous la poutre maîtresse, près de la porte caisse, sac, seau, balai, banc et pommes,
  deux fenêtres (façade à gauche avec un pot de fleurs, mur droit).
  Tour 1 à inspecter : `qc/interieur_maison1/` (scratchpad de la session). Accès PASSE, posé PASSE. Triangles : voir
  controle.txt (ancien : 6 972 + 60). Allègements faits avant : poteaux sans chanfrein, contrecœur sans chanfrein,
  bouts de bûches retirés du feu, moins de vaisselle, plancher en planches de 40 cm, tonnelet à 8 côtés.
- Ensuite : la halle (`interieurs/halle.py`, 9 × 13 × 4,2 m : piliers, foyer rond central, longues tables et bancs,
  trône, boucliers ; objets à faire : foyer_rond, trone ; à réutiliser : bouclier, tonneau, table, banc_interieur).
- Intégration (après PASSE, par la session principale) : `../maisons.py` remplace `interieur("maison", …)` par
  `interieurs/maison.py:construire()` (joindre C à P), et `creerInterieurs` lit `k.foyer` si présent.
