# Passation : village de DragonFlyer (méthode de dragonflyer/CONCEPTION.md § 7 bis)

Fichier tenu à jour à chaque étape, pour qu'une nouvelle session reprenne ici. Marche à suivre : `.claude/skills/modele-3d/`.

## Où on en est
- Matières : `materiaux.py` (fait).
- Kit : `kit.py` : poutre, planche, moellon, mur de moellons (assises communes, chaînage d'angle, pierres coupées au bord
  des ouvertures), toit de chaume (`ToitChaume` : croupes, rangs, mèches, rebord en deux rangs, frange, faîtage posé dans
  la crête), chevrons, arc de claveaux, porte, fenêtre, cheminée (fondation, épaulement, solin).
- Aperçus : `apercu.py` (occlusion cuite, 12 caméras, planche, capsule du joueur, `controle.txt`).
- Objets : `objets/banc.py`, `objets/tas_bois.py`.
- Maisons : `maisons/chaumiere.py` en contrôle qualité. Les autres maisons sont encore dans l'ancien `../maisons.py`.

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
- Tour 4 : en cours.

## Prochaine étape
Finir la chaumière (tout à 8+), l'intégrer : `../maisons.py` appelle `village/maisons/chaumiere.py:construire()`,
puis capture dans le jeu, puis montrer au propriétaire. Ensuite : une maison à la fois (colombage, longère…).
