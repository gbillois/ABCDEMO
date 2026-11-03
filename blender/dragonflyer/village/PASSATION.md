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
- Tour 2 : en cours.

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
