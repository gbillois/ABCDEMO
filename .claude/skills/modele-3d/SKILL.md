---
name: modele-3d
description: Fabriquer ou refaire un modèle 3D de DragonFlyer (maison, pièce, objet du village, personnage) par scripts Blender, avec contrôle qualité par un second agent sur 12 rendus fixes, test de la capsule du joueur et fichier de passation. À utiliser dès qu'on crée ou modifie un modèle de blender/dragonflyer/village/.
---

# Fabriquer un modèle 3D de DragonFlyer

Règle complète : `dragonflyer/CONCEPTION.md` § 7 bis. Ici, la marche à suivre.

## 0. Reprendre
Lire `blender/dragonflyer/village/PASSATION.md` : où on en est, notes des tours précédents, prochaine étape.

## 1. Construire (jamais à la main, jamais tout d'un coup)
- Matières : `village/materiaux.py` (ajouter une matière si besoin, pas de couleur en dur ailleurs).
- Kit : `village/kit.py` (poutre, mur de moellons, toit de chaume, porte, fenêtre, cheminée…). Une pièce qui manque
  s'ajoute au kit, pas dans la maison.
- Un fichier par maison (`village/maisons/<nom>.py`) et par objet (`village/objets/<nom>.py`), faits des pièces du kit.
  Chaque fichier a `construire()` et se lance seul :
  `blender -b -P blender/dragonflyer/village/maisons/<nom>.py -- <dossier>` → 12 rendus `cam01.png`… `cam12.png`,
  une planche `planche.png`, le rapport de la capsule `capsule.txt` et `<nom>.glb`.
- Blender : `/opt/blender-dl/blender-4.2.3-linux-x64/blender`.

## 2. Contrôler (un autre agent, un autre modèle)
- Lancer un agent avec `model: "sonnet"`, sans le contexte du fabricant. Lui donner seulement : les chemins des 12 rendus
  (et de la planche), `capsule.txt`, la grille ci-dessous, et le rôle d'inspecteur exigeant qui ne laisse rien passer.
- Il rend : une note sur 10 par critère, et la liste des corrections obligatoires (précises : quelle caméra, quel endroit).
- Grille : Posé (rien ne flotte ni ne s'enfonce), Textures/couleurs (pas d'étirement, bonne échelle, palette du jeu),
  Formes (silhouette, proportions, pas de trous ni de faces à l'envers), Style (stylisé, chaleureux, cohérent avec le
  village), Lisibilité de loin, Passage (la capsule passe la porte), Coût (faces dans le budget, voir le rapport).
- Passe seulement si tout est à 8 ou plus. Sinon corriger, refaire les 12 rendus, recontrôler.
- Même défaut 3 tours de suite → changer d'approche (autre construction), ne plus rafistoler.
- Grille et rôle de l'inspecteur : `inspecteur.md` (à lui donner tel quel). Garder le même inspecteur d'un tour à
  l'autre (SendMessage) : il vérifie ses corrections une par une et repère les défauts qui reviennent.
- Un agent lancé en parallèle ne peut pas lancer d'inspecteur : c'est la session principale qui fait le relais
  (planches → inspecteur → corrections → fabricant).

## 3. Noter et passer la main
- Après chaque tour : ajouter à `PASSATION.md` les notes, les corrections faites, ce qui reste.
- Intégrer au jeu (`maisons.py` appelle `construire()`), vérifier une capture dans le jeu, puis montrer au propriétaire :
  il a le dernier mot.
- Les rendus longs : en arrière-plan (`run_in_background`), pendant qu'on prépare la suite.

## Personnages
Même marche à suivre (CONCEPTION.md § 7 bis, « Personnages ») : fichiers dans `blender/dragonflyer/personnages/`,
squelette commun `squelette.py` (noms d'os inchangés : le jeu et `animations.glb` en dépendent). L'inspecteur reçoit
trois planches : 12 vues au repos, postures et articulations aux limites, animations en images fixes (côté et face).
