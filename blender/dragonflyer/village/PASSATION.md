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

## Arbres (agent séparé, worktree, `blender/dragonflyer/vegetation/PASSATION.md` sur sa branche)
- Refaits de zéro par scripts (sapin, feuillu), contrôle par 12 caméras et planche « forêt ». Tour 1 en fabrication.

## Prochaine étape
Finir la chaumière (tout à 8+), l'intégrer : `../maisons.py` appelle `village/maisons/chaumiere.py:construire()`,
puis capture dans le jeu, puis montrer au propriétaire. Ensuite : une maison à la fois (colombage, longère…).
