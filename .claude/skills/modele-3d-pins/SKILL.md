---
name: modele-3d-pins
description: Fabriquer ou refaire un modèle 3D du Domaine des Pins (cottage, équipement du complexe, mobilier du domaine) par scripts Blender, avec contrôle qualité par un second agent sur 12 rendus fixes, test de la capsule du joueur, contrôle de l'implantation dans le vrai jeu et fichier de passation. À utiliser dès qu'on crée ou modifie un modèle de blender/pins/ ou un fichier de pins/assets/.
---

# Fabriquer un modèle 3D du Domaine des Pins

Méthode complète : `blender/pins/METHODE.md`. Ici, la marche à suivre.

## 0. Reprendre
Lire `blender/pins/PASSATION.md` : où on en est, notes des tours précédents, prochaine étape.
Outils : Blender 4.2 (`/opt/blender-dl/blender-4.2.3-linux-x64/blender` ; sinon le télécharger depuis download.blender.org,
`blender-4.2.3-linux-x64.tar.xz`), `gltf-transform` (`npm i -g @gltf-transform/cli@4.1.1`), three.js local pour les tests
(`npm pack three@0.170.0`, dossier `three@0.170.0/` dans le dossier donné par `PINS_CDN`).

## 1. Construire (jamais à la main, jamais tout d'un coup)
- Matières : `blender/pins/materiaux.py` (pas de couleur en dur ailleurs).
- Kit : `blender/pins/kit.py`. Une pièce qui manque s'ajoute au kit (à la fin, dans une section nommée), pas dans l'objet.
- Un fichier par bâtiment (`batiments/<nom>.py`) et par objet (`objets/<nom>.py`) avec `construire()`, qui se lance seul :
  `blender -b -P blender/pins/batiments/<nom>.py -- <dossier> tout` → 12 rendus, `planche.png` (et `pp_planche.png` pour
  le plain-pied du cottage), `controle.txt` (triangles, capsule), `<nom>.glb`.
- Un bâtiment qu'on refait garde les cotes du jeu (murs de collision, fenêtres, porte, étage) : lire le code du jeu avant.
- Après chaque modification par script : `python3 -c "import ast; ast.parse(open('kit.py').read())"` et `grep -c "^def " kit.py`.

## 2. Contrôler (un autre agent, un autre modèle)
- Lancer un agent avec `model: "sonnet"`, sans le contexte du fabricant. Lui donner seulement : les chemins des 12 rendus et
  de la planche (et de la seconde planche s'il y en a une), `controle.txt`, et le texte de `inspecteur.md` tel quel.
- Passe seulement si tout est à 8 ou plus. Sinon corriger, refaire les mêmes rendus, renvoyer au MÊME inspecteur
  (SendMessage) : il vérifie ses corrections une par une.
- Même défaut 3 tours de suite → changer d'approche.

## 3. Intégrer, implanter, passer la main
- `blender -b -P blender/pins/exporter.py -- pins/assets` (GLB des modèles validés, puis meshopt).
- Le jeu charge `pins/assets/*.glb` (GLTFLoader + MeshoptDecoder, modules ajoutés à `FICHIERS` de `pins/sw.js`, comme les
  GLB), changer `CACHE` de `sw.js` et `window.PINS_VERSION`.
- Implantation : `node blender/pins/implantation.js <dossier>` (12 vues du hameau dans le vrai jeu, via un petit serveur
  local) ; inspecteur d'implantation (`inspecteur-implantation.md`), même règle des 8/10.
- Captures avant / après dans le jeu pour le propriétaire : il a le dernier mot. Lui rappeler d'appuyer sur « Mettre à jour ».
- Après chaque tour : `PASSATION.md` (notes, corrections faites, ce qui reste).
