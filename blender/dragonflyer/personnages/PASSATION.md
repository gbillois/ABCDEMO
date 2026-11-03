# Passation : le nouveau héros à pied (jeune Viking)

Méthode : `dragonflyer/CONCEPTION.md` § 7 bis (« Personnages ») et `.claude/skills/modele-3d/SKILL.md`.
Les villageois restent sur l'ancien `../heros.py` et `../pieton.py` (non modifiés).

## Fichiers

| fichier | rôle |
|---|---|
| `materiaux.py` | palette (peau, tunique, cuir, fourrure, cheveux, fer, yeux), grains par matière (tissu, cuir, fourrure, cheveux), rose des joues, matière de rendu |
| `kit.py` | tubes, capsules à rotule, superquadriques, anneaux, coques épaisses ; tête (surface analytique), visage en décalques géométriques, cheveux en mèches, mains, bordures de fourrure ; poids du tronc |
| `heros.py` | le héros assemblé, squelette `../squelette.py`, poids pièce par pièce, ombre cuite → `pieton.glb`, `heros.txt` (faces par pièce) |
| `apercu.py` | les trois planches, caméras fixes (relit le `.glb`) |
| `planche.py` | assemble les rendus en planche (python3 + PIL) |

Commandes (Blender 4.2, `blender -b -P …`) :
```
blender -b -P heros.py -- sortie/
blender -b -P ../animations.py -- <KayKit Animations/gltf/Rig_Medium> sortie/anim/   # animations.glb non compressé (Blender ne lit pas meshopt)
blender -b -P apercu.py -- sortie/pieton.glb sortie/ abc sortie/anim/animations.glb
```

## Choix de construction

- Squelette inchangé (mêmes os, mêmes repos). `animations.glb` est refait au tour 2 pour les retouches de mouvement (voir plus bas), pas pour le squelette.
- Membres en rotules : chaque segment est une capsule dont les bouts sont des demi-sphères centrées sur les pivots ;
  un segment suit un seul os. Pas de torsion « papier de bonbon », jointures toujours fermées.
- Tronc, gilet, revers de fourrure, cou : partage doux Hips → Spine → Chest → Head selon la hauteur (fondus de ±4,5 cm).
  Ceinture rigide sur Hips, col de fourrure rigide sur Chest, tête rigide.
- Bas de la tunique (tour 3) : deux moitiés, gauche et droite, fendues devant et derrière à partir de mi-hauteur ;
  chacune ne suit que sa cuisse (90 % devant, 60 % sur le côté, 35 % derrière vers l'ourlet), jamais un partage
  gauche/droite. Ourlet roulé du même tissu.
- Calotte de cheveux fondue dans le crâne (la peau gonfle de 6 % et prend la couleur des cheveux au-dessus de la ligne) ;
  chaque mèche a sa racine fermée et enfoncée dans la calotte.
- Aisselles : un coussin de tissu partagé 50/50 entre Chest et UpperArm garde le volume bras levés.
- Visage en géométrie colorée (yeux à iris vert et double reflet, cils, sourcils, nez, bouche, taches de rousseur) :
  plus de matière « RiderFace », une seule matière « Rider » (couleurs de sommets), un seul appel de dessin.
- Coût : 14 784 triangles au tour 3 (tour 2 : 14 728) (tour 1 : 28 748 ; l'ancien héros : ~39 000).

## Tour 1 (planches faites, contrôle non fait)

Planches : `sortie/planche_a.png`, `planche_b.png`, `planche_c1.png`, `planche_c2.png` ; avant : `avant/planche_a.png`.
Corrections faites avant ces planches (auto-relecture, ne vaut pas contrôle) : touffes du col en « dents » remplacées
par deux rangs bosselés, revers en perles remplacés par un boudin continu, mèches « antennes » supprimées, frange
allongée, nœud de la tresse rattaché, tête (R 0,205), mains (×1,22) et cou plus gros.

Contrôle par un second agent : **pas fait**, l'agent fabricant n'avait pas d'outil pour lancer un sous-agent.

Points faibles déjà repérés :
- tache sombre au sommet du crâne (racines des mèches qui convergent), visible de la caméra du jeu (vue 11) ;
- frange un peu « casque » de face, petite ligne sombre entre frange et calotte ;
- revers de fourrure qui ressemblent à une corde ;
- jupe à vérifier dans l'écart et l'accroupi (planche B, cases 16, 19, 20) ;
- les bras serrés par les animations (SERRE de `animations.py`) peuvent frôler la jupe : planche C à regarder ;
- l'épée dans le dos et le baudrier (jeu, `majEpeeDos`) sont réglés pour l'ancien buste : à vérifier dans le jeu ;
- planche C : pour trot et course, le personnage sort à moitié du cadre de côté (images 1 et 6) et grossit de face
  (il s'approche de la caméra) : élargir le cadre ou faire suivre la caméra en gardant le quadrillage ;
- coût à réduire vers 20 000 triangles (fourrure, bottes et mèches sont les plus chers, voir `heros.txt`).

## Tour 1 : contrôle (inspecteur d'un autre modèle) : À REFAIRE

Notes : proportions 8, visage 8, cheveux et vêtements 6, articulations 7, animations 5, style 8, coût 6.
Corrections demandées : trou noir sur le crâne, revers en « bretelles », liseré jaune et jupe (boule entre les jambes,
jambe à 90°), avant-bras croisés qui se traversent et aisselle pincée bras levés, banc d'animation (cadre, échelle),
saut raide en T, épée absente du banc, marche/trot/course trop proches et repos figé, coût (viser ≤ 18 000).

## Tour 2 (planches dans `t2/`)

Corrections faites :
1. Crâne : la cause du trou noir était l'intérieur des tubes de mèches, ouverts à la racine. Racines fermées et
   enfoncées ; calotte fusionnée au crâne (volume plein, pas de bord) ; mèches du dessus nées plus près de l'épi.
2. Bord de fourrure du gilet refait : bande large au col (châle, ~10 cm), fine vers le bas (~2 cm), arrêtée à la
   poitrine, bord intérieur en vagues irrégulières, épaisseur et teinte bruitées. Plus de chaîne de boudins.
3. Liseré jaune supprimé (ourlet roulé du même tissu, un ton plus foncé). Jupe d'une pièce, poids progressifs par angle
   (essai de pans fendus abandonné : de face, ils faisaient une culotte bouffante). Jupe raccourcie (ourlet à 0,49 m au
   lieu de 0,43) et moins évasée : moins de tissu tendu entre les jambes dans l'écart (case B16).
4. Banc : pose « bras croisés » remplacée par « bras ramenés devant, mains qui se rejoignent » (angle limité) ; coussin
   d'aisselle contre le pincement bras levés.
5. Banc d'animation : la caméra suit le héros (sol et repères qui défilent), même distance de face ; disques au sol sous
   chaque pied posé (rouge gauche, bleu droit), gardés d'une image à l'autre : un pied qui glisse quitte son disque.
   8 images par clip au lieu de 6.
6. et 8. `animations.py` (table `RETOUCHE`) : buste penché 2° (marche), 7° (trot), 13° (course), 9-10° (saut), la tête se
   redresse à moitié ; respiration au repos (2,2°) et en parlant ; en l'air, bras ramenés vers 30-45° avec un
   balancement doux, cuisses relevées de 28°, genoux pliés de 48° ; réception genoux fléchis et bras ramenés (plus de T au début de « saut_fin »). Refaire le fichier du jeu :
   `blender -b -P animations.py -- <KayKit>/Animations/gltf/Rig_Medium sortie/` puis
   `gltf-transform meshopt sortie/animations.glb dragonflyer/assets/animations.glb` (les villageois en profitent aussi).
   Fait : `dragonflyer/assets/animations.glb` remplacé, cache de `sw.js` → `dragonflyer-v10`,
   `DRAGONFLYER_VERSION` → `2026.11.03-1` (appuyer sur « Update »). Le héros lui-même n'est pas encore intégré.
7. Épée tenue au banc pour le clip « epee » : poignée au creux de la main, garde au bout du poing, lame dans le
   prolongement épaule → main relevée (même direction que le jeu).
9. Coût : 14 728 triangles (crâne 864 faces calotte comprise, mèches 1 218, bottes 728, fourrure ~700, mains 380,
   oreilles 80 ; voir `heros.txt`).

À changer dans le jeu (`dragonflyer/index.html`) au moment de l'intégration :
- `animerClips` mélange le repos à 50 % avec sa pose figée (`reposFixe`) : la respiration n'y vaut que la moitié ;
  garder ou baisser ce mélange.
- Épée en main (`majEpeeMain`, branche `if (ANIMS)`) : le jeu met la garde 14 cm *derrière* le poignet (vers l'épaule),
  donc la poignée dans l'avant-bras et la lame dans le poing. Mettre la garde au bout du poing :
  position = poignet + 0,55 × (bout de l'os HandR − poignet) + 0,1 × direction de la lame.
- `matHeros` : le héros n'a plus de matière « RiderFace » (visage en géométrie) ; rien à changer, la branche ne sert plus
  qu'aux villageois.
- `majEpeeDos` : baudrier mis à l'échelle (1,28 ; 1 ; 1,18) pour l'ancien buste : à vérifier sur le nouveau.

Limites connues : la vitesse naturelle du trot (2,12 m/s) et de la course (2,26 m/s) viennent des clips KayKit et sont
proches ; la différence se joue surtout sur le penché et l'amplitude. La phase de vol de la course est celle de la
source (courte).

Défauts encore visibles sur les planches t2 (relecture du fabricant, avant contrôle) :
- B16 (écart 45°) : le devant de la jupe reste tendu entre les jambes (moins long qu'au tour 1, mais encore une forme
  ronde). C'est la 2e fois : si l'inspecteur le relève encore, changer d'approche (par ex. jupe en deux pans avant
  séparés au milieu, chacun sur sa cuisse, ou jupe encore plus courte sur pantalon).
- C1 marche (côté) : les disques des pieds posés restent un peu derrière le pied d'une image à l'autre : la vitesse
  « naturelle » calculée par `animations.py` (0,93 m/s) ne colle peut-être pas exactement à la foulée ; à mesurer.
- C1 saut_debut images 7-8 : bras encore écartés en fin de clip (vient de la source) ; à serrer comme saut_air si besoin.

## Tour 2 : contrôle : À REFAIRE (de justesse)

Notes : proportions 8, visage 8, cheveux et vêtements 8, articulations 7, animations 7, style 8, coût 9.
Corrections 1, 2, 4, 6, 9 du tour 1 validées. Restait : dôme de jupe en écart (3e fois : changer d'approche),
disques de pied illisibles et glissement à vérifier, marche trop énergique, épée en « fil » trop long.

## Tour 3 (planches dans `t3/`)

1. Jupe : nouvelle approche (deux moitiés fendues devant et derrière, chacune sur sa cuisse, voir plus haut). Le pan
   unique à partage gauche/droite est abandonné : c'est ce partage qui faisait le dôme.
2. Banc : disques de 11 cm, opaques et lumineux (rouge gauche, bleu droit), au milieu de la semelle du pied qui
   touche le sol, fixes dans le monde ; ligne jaune au sol et traits blancs tous les 50 cm. Mesure du glissement
   (4 positions par image) écrite dans `t3/glissement.txt`.
   `animations.py` choisit maintenant la vitesse de chaque clip de déplacement en mesurant NOTRE squelette : la
   vitesse qui rend la plus petite la pire dérive d'un pied posé. Résultat : marche 0,61 m/s (dérive 4,8 cm, surtout le
   roulé talon-pointe), trot 3,63 m/s (4,2 cm), course 3,14 m/s (2,3 cm). Avant : 0,93 / 2,12 / 2,26 (calcul sur la source).
3. Marche calme : amplitude réduite vers la pose moyenne du clip (jambes 72 %, bras 45 %, buste 40 %, tête 30 %,
   bassin 50 %), buste penché 1,5°. Trot (7°) et course (13°) inchangés.
4. Épée au banc : poignée en travers du poing fermé (main droite en poing), garde au-dessus du pouce, lame de 65 cm ×
   3,2 cm ; géométrie recalculée dans le monde à chaque image.
Glissement mesuré au banc (`t3/glissement.txt`, avec les vitesses du jeu) : marche 5,1 cm, trot 3,1 cm, course 1,4 cm
(la marche garde surtout le roulé talon-pointe du pied, compté comme glissement par cette mesure).
Vérifié par le fabricant : B16 (écart) le bas de la tunique s'ouvre en V, plus de dôme ; B15 le pan avant suit la cuisse.
Facultatif fait : respiration du repos 3,2°, bord de fourrure un peu plus étroit, mains ×1,36.

À changer dans le jeu en plus :
- les vitesses mesurées donnent trot (3,63) plus rapide que course (3,14) : ce sont les foulées des clips KayKit.
  `animerClips` règle la cadence par v / V (bornée de 0,7 à 1,8) et mélange trot entre 1,1 et 1,9 m/s : à ces vitesses
  le trot sera joué au plus lent (0,7) et glissera un peu. Revoir les seuils (ou n'utiliser le trot que vers 2,5-3,5 m/s).
- l'épée en main doit suivre la même prise que le banc (axe du pouce de HandR, garde au-dessus du pouce), au lieu de
  la direction épaule → main.
- la main droite est en poing au repos (elle tient l'épée) ; si on la veut ouverte hors combat, il faudra deux mains.

## Tour 3 : contrôle : À REFAIRE (de très peu)

Notes : proportions 8, visage 8, cheveux et vêtements 8, articulations 8 (jupe validée), animations 7, style 8, coût 9.
Restait (animations) : trot et course trop proches et vitesses inversées, glissement de la marche 5,1 cm, disques
qui apparaissent sans pied posé, coup d'épée raide (bras en croix 3 images), lame peu contrastée.

## Tour 4 (planches dans `t4/`)

Tout est dans `animations.py` (le héros n'a pas changé depuis le tour 3, sauf la lame de l'épée du banc) :
1. Trot et course refaits : trot léger (amplitude des jambes 74 %, bras 70 %, buste penché 8°), course ample (jambes
   115 %, bras 135 %, bassin 135 %, penché 17°). Les amplitudes sont multipliées autour de la pose moyenne du clip (par
   l'angle : au-delà de 100 % le mouvement s'agrandit). Vitesses naturelles mesurées : marche 0,64 < trot 1,81 <
   course 3,64 m/s.
2. Pieds au sol, trois passes après les retouches : (a) pied d'appui remis à plat (le transfert enfonçait la pointe
   de 6 cm et relevait le talon au milieu de l'appui) ; à la marche, la pointe du pied qui passe se relève de 22° ;
   (b) pieds verrouillés : pendant chaque appui, la cheville suit une droite à vitesse constante, par une IK à deux
   os cuite image par image (appuis à cheval sur la boucle recousus ; à la marche le verrou commence une image avant
   et se relâche sur deux images après) ; les clips sur place (repos, parler, ramasser, épée, sauts) sont verrouillés
   à vitesse nulle ; (c) bassin à la hauteur qui pose la semelle sur le sol (réception comprise).
   Mesure (la même dans `animations.py` et au banc) : un point de semelle (talon, plante, bout) qui touche le sol
   (< 2 cm) ne doit pas bouger tant qu'il le touche. Glissement maximal : marche 3,0 cm, trot 0,5 cm, course 0,8 cm.
   Interpolation linéaire entre les images, comme dans le jeu.
3. Banc : disque seulement sous un pied qui touche vraiment le sol (au milieu des points qui touchent) ; `t4/glissement.txt`
   donne pour chaque clip la vitesse, le glissement et les images où chaque pied touche le sol.
4. Coup d'épée : le buste arme (28° vers la droite, bras droit levé de 35°), frappe (62° de l'autre côté), revient,
   bras qui redescend aussitôt (plus de bras tendu immobile) ; la tête garde la cible. Lame du banc en acier bleuté
   foncé avec un liseré sombre.

À changer dans le jeu (`animerClips`), avec ces vitesses (le héros marche jusqu'à 2,6 m/s, court jusqu'à 4,6 m/s) :
- poids : repos → marche `lisse(.06, .3, v)` ; marche → trot `lisse(.9, 1.4, v)` (au lieu de 1,1-1,9) ;
  trot → course `lisse(2.6, 3.4, v)` (au lieu de 3,3-4,6) ;
- la cadence v / V reste bornée à 0,7-1,8 : marche jusqu'à 1,15 m/s, trot 1,27-3,26 m/s, course dès 2,55 m/s : les
  plages se recouvrent, aucun clip n'est joué hors de ses bornes avec ces seuils.

## Tour 4 : contrôle : À REFAIRE (un seul point)

Tout à 8 (coût 9) sauf animations 7. Restait : réception du saut (10,5 cm), glissement par contact du coup d'épée,
lame qui pend contre la cuisse au retour.

## Tour 5 (planches dans `t5/`)

1. Clips sur place (repos, parler, ramasser, épée, réception, début de saut) : verrou par appui RÉEL, avec la même
   règle que le banc (un point de semelle sous 2 cm). Le pied qui touche est mis à plat et sa cheville reste là où il
   s'est posé jusqu'à ce qu'il se lève (IK cuite, deux passes, bassin reposé ensuite). Entre deux contacts d'un même
   pied, un pas se fait en levant le pied (il se soulève d'abord, avance en arc de 7 cm, se repose, reste à plat).
   Coup d'épée : bassin gardé au-dessus des pieds et deux pieds plantés tout le geste (le pas glissé de la source est
   supprimé). Résultat (`t5/glissement.txt`) : réception 2,3 cm au pire, épée 1,9 cm, ramasser 0,1 cm, repos et
   parler 0 cm ; marche 3,0 / trot 0,5 / course 0,8 cm inchangés.
2. `glissement.txt` donne maintenant le glissement de CHAQUE contact de chaque pied (images de début et de fin,
   au quart d'image).
3. Retour de l'épée : coude plié de 50° vers l'avant et poignet tourné vers l'extérieur : la lame reste devant le corps,
   loin de la cuisse et de la ceinture. Facultatif fait : fil clair sur la lame du banc.

## Prochaine étape

1. Faire contrôler les planches `t2/` par l'inspecteur.
2. Corriger, refaire les planches, recontrôler jusqu'à 8/10 partout.
3. Ensuite seulement : meshopt (`gltf-transform meshopt`), remplacer le bloc `data-pieton` de `dragonflyer/index.html`,
   vérifier dans le jeu (Playwright), changer `DRAGONFLYER_VERSION`.
