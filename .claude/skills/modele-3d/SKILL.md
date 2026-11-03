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

## Intérieurs
Même marche à suivre : objets du kit un par un (`village/objets/`), puis une pièce à la fois (`village/interieurs/<nom>.py`),
contrat du jeu inchangé (objets I_<nom> et IL_<nom>, propriétés « taille » et « porte »). Banc `apercu_interieur` :
12 caméras fixes DANS la pièce (porte à hauteur d'homme, 4 coins, hauteur d'enfant vers le foyer, vers la porte, 2 gros
plans, charpente, vue en coupe de dessus, lumière du soir), carte d'accès de la capsule (grille de 25 cm depuis la porte :
foyer, lits, tables atteignables, passages de 0,9 m au moins). Grille : `inspecteur_interieur.md`.

## Vues aériennes
Le joueur vole : chaque village se contrôle aussi vu du ciel, dans le vrai jeu, avec
`blender/dragonflyer/village/vues_aeriennes.js` (12 vues fixes, le dragon en vol à l'endroit de la caméra pour que le jeu
charge ce qu'il chargerait vraiment : arrivées depuis 4 côtés, plongée, très haut, rase-mottes, verticale, forêt,
rivage, soir, horizon ; rapport des appels de dessin et triangles). Grille : `inspecteur_aerien.md`. À refaire après
tout changement des arbres, du terrain, des villages ou des détails lointains.
