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

- Squelette inchangé (mêmes os, mêmes repos) : `animations.glb` n'a pas besoin d'être refait.
- Membres en rotules : chaque segment est une capsule dont les bouts sont des demi-sphères centrées sur les pivots ;
  un segment suit un seul os. Pas de torsion « papier de bonbon », jointures toujours fermées.
- Tronc, gilet, revers de fourrure, cou : partage doux Hips → Spine → Chest → Head selon la hauteur (fondus de ±4,5 cm).
  Ceinture rigide sur Hips, col de fourrure rigide sur Chest, tête rigide.
- Jupe de la tunique : Hips en haut, jusqu'à 60 % sur la cuisse du même côté vers l'ourlet (devant surtout).
- Visage en géométrie colorée (yeux à iris vert et double reflet, cils, sourcils, nez, bouche, taches de rousseur) :
  plus de matière « RiderFace », une seule matière « Rider » (couleurs de sommets), un seul appel de dessin.
- Coût : 28 748 triangles (l'ancien héros : ~39 000).

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
- coût à réduire vers 20 000 triangles (fourrure, bottes et mèches sont les plus chers, voir `heros.txt`).

## Prochaine étape

1. Lancer l'inspecteur (autre modèle, sans contexte) sur les quatre planches avec la grille.
2. Corriger, refaire les planches, recontrôler jusqu'à 8/10 partout.
3. Ensuite seulement : meshopt (`gltf-transform meshopt`), remplacer le bloc `data-pieton` de `dragonflyer/index.html`,
   vérifier dans le jeu (Playwright), changer `DRAGONFLYER_VERSION`.
