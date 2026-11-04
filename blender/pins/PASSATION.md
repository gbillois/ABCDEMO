# Passation : modèles 3D du Domaine des Pins (méthode : blender/pins/METHODE.md)

Fichier tenu à jour à chaque étape, pour qu'une nouvelle session reprenne ici. Marche à suivre : `.claude/skills/modele-3d-pins/`.

## Où on en est
- Matières : `materiaux.py` (fait) : bois miel (clin, planches de l'étage), boiseries crème, bardeaux vert sapin, volets verts,
  pierre, zinc, terrasse, gravier, jardin. Faces à l'ombre en brun chaud ; chant des bardeaux en vert très sombre.
- Kit : `kit.py` (fait) : `Piece`, `Mur` (repère u / z / w, ouvertures), bardage à clin, planches à couvre-joints, soubassement
  de pierres, cornières, ceinture, encadrement, fenêtre à volets (et jardinière), encadrement de porte, auvent, lanterne,
  toit de bardeaux à deux pans (`ToitBardeaux`), pignon (œil-de-bœuf), cheminée, terrasse, garde-corps, marche, gravier, buissons.
- Aperçus : `apercu.py` (occlusion cuite, 12 caméras, planche, capsule du joueur, rapport). Objets `J_<nom>` (couvre-joints)
  cachés pendant la cuisson des autres puis fusionnés dans `<nom>`.
- Bâtiments : `batiments/cottage.py` VALIDÉ (inspecteur du modèle : PASSE au tour 3, re-PASSE aux tours 4 et 5 après les abords).
- Export : `exporter.py` → `pins/assets/cottage.glb` (meshopt, ~360 Ko). Dans le jeu depuis la version 2026.11.03-1 (cache sw v14).
- Implantation : `implantation.js` (12 vues du hameau dans le vrai jeu, petit serveur local ; `PINS_VUES` et `PINS_EVAL` pour
  regarder un endroit ou interroger le jeu).

## Cottage : tours de contrôle du modèle
- Avant contrôle : capsule bloquée (un « fond » derrière le bardage bouchait porte et fenêtres) → fond percé comme le mur.
- Tour 1 : posé 8, matières 7, formes 8, style 8, lisibilité 9, passage 9, coût 8 → À REFAIRE (traits noirs à l'étage,
  traînées sur le clin, étage trop sombre). Note : l'inspecteur a dit ensuite qu'une partie des images ne s'était pas affichée.
  Corrigé : sommets fusionnés de couleurs différentes (plus de `remove_doubles`), planches découpées (occlusion locale),
  étage éclairci, toit allégé.
- Tour 2 : matières 7 (fentes noires à l'étage), coût 7 (28 572, demandé ≤ 24 000) → À REFAIRE.
  Cause trouvée en mesurant (rayons, couleurs avant / après cuisson) : sommets des planches sous les couvre-joints (noirs à la
  cuisson), puis couvre-joints dessinés deux fois près des fenêtres (deux boîtes confondues sortent noires).
  3e tour du même défaut → CHANGEMENT D'APPROCHE : couvre-joints dans une pièce `J_` à part, cachée pendant la cuisson des
  planches ; un seul couvre-joint par joint. Coût : chant des bardeaux en une bande par rang, faces cachées supprimées.
- Tour 3 : posé 8, matières 8, formes 8, style 8, lisibilité 9, passage 9, coût 8 (22 518) → PASSE.
- Tour 4 (abords demandés par l'implantation : gravier, buissons, solin sombre) : tout à 8+, 23 731 triangles → PASSE.
- Tour 5 (clin plus net : chant sombre, plus de partie cachée sous la planche du dessus) : tout à 8+, 23 731 → PASSE.

## Hameau : tours de contrôle de l'implantation (dans le jeu)
- Tour 1 : sol 7, abords 7, le reste 8 → À REFAIRE (terrasse sans pied, panneau trop grand sur la terrasse, murs nus,
  bande claire au toit). Corrigé : gravier et buissons, panneau réduit (× 0,78) et déplacé au bord de l'allée.
- Tour 2 : accord avec le jeu 7 → À REFAIRE (bande claire au toit, bardage strié).
  La bande claire était un vrai défaut d'intégration : la compression meshopt déplace l'origine des nœuds, et le jeu posait le
  toit 1,8 m trop bas (on voyait l'intérieur des murs). La hauteur vient maintenant des extras (`haut_etage`).
  Leçon : ne jamais lire une position de nœud d'un fichier compressé ; tout mettre dans les sommets ou dans les extras.
- Tour 3 : posé 9, accès 8, organisation 8, sol 8, abords 8, accord 8, charme 9 → PASSE.
  Captures avant / après : `avant_apres_cottage.jpg`. Reste au propriétaire de donner son avis (dernier mot).

## Mesures dans le jeu (même vue, rendu logiciel)
- Avant : 831 appels de dessin, 1 359 892 triangles ; cottage de plain-pied 31 970 triangles (avec terrasse et meubles).
- Après : 826 appels de dessin, 1 275 269 triangles.

## Intégration (pins/index.html)
- `COT3D` (chargé avant les cottages) : sans le fichier, le jeu garde l'ancien cottage dessiné en code.
- `C_rdc` + `W_rdc` dans `walls` (les murs s'effacent quand on entre : `wallMat` à couleurs de sommets, une par cottage),
  `C_etage` + `W_etage` dans `upper`, `C_toit` dans `roof` (y = UP + 2,95 ; plain-pied : le jeu le descend sur le rez-de-chaussée),
  `C_terrasse` à la place du plancher et du garde-corps de `terraceTpl`. Les vitres gardent `winGlass` (elles s'allument la nuit).
- Les cotes du jeu sont gardées (L_WALLS, porte, fenêtres, UP) : collisions et intérieur inchangés.

## Prochaine étape
1. Équipements du complexe, un à la fois : Aquaparc (coupole), restaurant / Burger, boutiques, salle de jeux, manoir.
2. Mobilier du domaine (`objets/`) : banc, lampadaire, poubelle, panneau, table de pique-nique.
3. Les pins eux-mêmes (le décor le plus répété) : pin fait par script, imposteur lointain, planche « forêt ».
Suggestions non faites : verre un peu nuancé, coins sombres des petits-bois, détail de vie sur la terrasse, buissons plus clairs.

## Personnages : passe sur les animations (banc `personnages/banc.js`, dans le vrai jeu)
- Banc : planches A (repos, 12 vues dont un portrait par personnage), B (postures du jeu), C (un cycle par allure, côté et face,
  disques sous les pieds posés), `controle.txt` (triangles, foulée, cadence, glissement de chaque appui, enfoncement). 60 images/s.
  `node blender/pins/personnages/banc.js <dossier>` (PINS_CDN = dossier de three@0.170.0 ; PINS_C=1 : animations seules).
- Avant : glissement max 6 / 7 / 23 / 33 cm (promenade adulte / enfant / marche du joueur 4,2 m/s / course 7,5 m/s).
- Corrigé dans `pins/index.html` : `allure()` (au-delà de la longueur de jambe, le pied reste moins longtemps au sol puis la cadence
  monte, au lieu de traîner), pied qui arrive au sol à la vitesse du sol (`mt1`), pivot du pied qui se lève à l'articulation des
  orteils (`d.balle`), pied posé presque à plat et descente franche en courant, bras plus amples et coude plus souple à la marche,
  rebond du bassin, buste un peu plus penché en courant, bras de nage écarté du buste, yeux +13 à 19 %.
- Après (tour 3) : 2,6 / 2,2 / 2,1 / 1,9 cm, tous OK (cible 3 cm), enfoncement ≤ 1,1 cm. Triangles 6 422 à 8 088 par personnage.
- Inspecteur (grille `inspecteur-personnage.md`) : tour 1 → 7/6/7/6/6/7/? ; tour 2 → proportions 7, visage 8, vêtements 8,
  postures 7, animations 7, style 7, coût 8 (À REFAIRE : course à 3,2 cm). Le tour 3 (course corrigée) n'a PAS encore été
  recontrôlé (arrêt demandé par le propriétaire pour ménager son crédit). Prochaine étape : renvoyer `perso_t3` à l'inspecteur.
- Fabricants arbres / Aquaparc / mobilier : lancés puis arrêtés par la limite d'usage avant tout résultat (rien de fait).
  Consigne commune prête à reprendre (voir l'historique) ; vues « avant » de l'Aquaparc et de la forêt dans `implantation.js` (PINS_LIEU).
