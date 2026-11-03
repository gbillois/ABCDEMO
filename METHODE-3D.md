# Méthode de fabrication 3D par IA : personnages, bâtiments, objets, implantation

Ce texte décrit, pour une IA qui code (agent avec accès au terminal), une méthode complète pour fabriquer des modèles 3D
de jeu de qualité « publiable » sans aucune modélisation à la main : tout est écrit en Python et exécuté dans Blender
sans interface, puis contrôlé par un SECOND modèle d'IA qui ne voit que des images et des chiffres. Elle a servi à
refaire les maisons, le héros, les arbres et les villages d'un jeu web three.js pour enfant (style stylisé chaleureux).

---

## 1. Principes

1. **Aucune modélisation à la main.** Chaque modèle est un script Python lancé dans Blender en mode sans interface :
   `blender -b -P mon_script.py -- <dossier_de_sortie> [options]`. Le script construit la géométrie (bmesh), les
   couleurs, le squelette, les poids, cuit l'éclairage, exporte (glTF/GLB) et fait ses propres rendus de contrôle.
2. **Jamais tout d'un coup.** On ne demande pas « un village ». On avance par étages, et chaque étage est validé avant
   le suivant :
   1. les **matières** (palette, nuances, façon de varier) ;
   2. un **kit de pièces** réutilisables (une poutre, un mur, un toit, une porte, une fenêtre, une cheminée…) ;
   3. **un objet à la fois** (une maison, une pièce, un banc, un arbre, un personnage) ;
   4. l'**assemblage** (village, forêt) seulement quand chaque objet est validé.
3. **Un fichier par objet.** Chaque maison et chaque objet a son propre script (`maisons/chaumiere.py`,
   `objets/banc.py`…), fait des pièces du même kit et des mêmes matières. Un métier à tisser est un petit script fait
   des mêmes poutres que les murs. Chaque fichier se lance seul et produit ses aperçus.
4. **Celui qui fabrique ne se valide pas.** Un fabricant est indulgent avec lui-même (« ça flotte un peu, ça ira »).
   Le contrôle est fait par un second agent, d'un autre modèle, sans le contexte du fabricant, qui note sur 10 et
   exige des corrections précises. Rien ne passe sous 8/10, sur aucun critère.
5. **Si le même défaut revient 3 tours de suite, on change d'approche** au lieu de rafistoler (autre construction,
   autre technique). C'est la règle qui débloque les situations : dans ce projet, un chaume « en pâte » a été remplacé
   par des rangs de paille posés le long des courbes de niveau, une jupe en boule par deux pans fendus.
6. **Le propriétaire a le dernier mot.** Il ne voit le résultat que lorsque tout est à 8 ou plus, avec une capture
   dans le jeu (avant / après).
7. **Mesurer plutôt que croire.** Chaque rendu s'accompagne d'un rapport chiffré (triangles, tests automatiques).

---

## 2. Organisation des fichiers

```
blender/<jeu>/village/
  materiaux.py        # étage 1 : les matières (palette)
  kit.py              # étage 2 : les pièces (poutre, mur, toit, porte, fenêtre, cheminée…)
  apercu.py           # rendus de contrôle communs : occlusion cuite, 12 caméras, planche, capsule, rapport
  objets/<nom>.py     # un fichier par objet (banc, tonneau, lanterne, muret…)
  maisons/<nom>.py    # un fichier par bâtiment
  implantation.js     # contrôle de l'implantation des villages dans le vrai jeu (Playwright)
  PASSATION.md        # où on en est, notes de chaque tour, prochaine étape (pour reprendre dans une autre session)
blender/<jeu>/personnages/   # même organisation pour les personnages (matières, kit, héros, aperçus)
.claude/skills/modele-3d/    # la marche à suivre et les grilles des inspecteurs (voir § 8)
```

Chaque objet expose `construire(graine)` qui renvoie ses pièces, et un bloc `if __name__ == "__main__":` qui fait les
aperçus. Le script d'assemblage du jeu appelle `construire()` de chaque objet validé.

---

## 3. Blender par script : la boîte à outils

- **Géométrie** : une classe `Piece` qui enveloppe un `bmesh` et sait ajouter des boîtes (avec chanfrein et
  irrégularité), cylindres, sphères, et recopier une autre pièce transformée (`ajouter(autre, matrice)`).
  Toute pièce d'un objet est fusionnée dans un seul maillage (un appel de dessin dans le jeu).
- **Couleurs par sommet** plutôt que des textures quand le style le permet : un attribut `Col` (couleurs **linéaires** :
  convertir les couleurs sRGB `#rrggbb` en linéaire avant de les écrire). Les faces lisses sont marquées par un
  attribut entier (`lisse`), le reste est en facettes.
- **Matières** : une matière = quelques teintes proches + une variation (chaque pierre, planche, tuile tire une nuance).
- **Occlusion ambiante cuite** (Cycles, `bake(type="AO", target="VERTEX_COLORS")`) puis multipliée dans les couleurs :
  `couleur *= 0.35 + 0.65 * ao^0.8`. Les vitres (objet séparé qui s'allume la nuit) ne sont pas assombries.
- **Export** glTF/GLB avec les propriétés utiles au jeu en « extras » (emprise au sol, point de la porte, intérieur…),
  puis compression (meshopt avec `gltf-transform`).
- **Reproductibilité** : chaque objet a sa propre graine aléatoire (un même objet donne toujours le même résultat).
- **Repère** : décider une fois pour toutes (ex. Z vers le haut, façade vers -Y, sol à z = 0, murs qui descendent sous
  le sol pour les pentes) et l'écrire en tête de chaque fichier.

### Le kit (exemples de pièces qui ont servi)
- `poutre(a, b, section)` : tout le bois en est fait (pans de bois, chevrons, banc, tonneau…). Les bois fins ne sont
  pas chanfreinés (économie de triangles).
- `moellon` / `mur_moellons(a, b, z0, z1, ouvertures)` : pierres en assises irrégulières, **coupées au bord des
  ouvertures** (jamais de trou de mortier), chaînage d'angle alterné, face cachée supprimée, assises communes à tous
  les murs d'une maison (les coins se croisent juste), dernier rang jamais en « plaquette ».
- `ToitChaume` : forme lisse (fonction hauteur), puis la paille **posée en rangs qui suivent les courbes de niveau**
  (carrés de marche), chaque rang recouvre le suivant et finit en mèches ; rang de rive en mèches tout autour.
- `ToitTuiles`, `pan_de_bois`, `pignon_platre`, `porte`, `fenetre`, `cheminee`, `escalier`, `auvent`…

---

## 4. Les rendus de contrôle (identiques à chaque tour)

**Bâtiment ou objet : 12 caméras fixes**, toujours les mêmes (à l'échelle de l'objet) :
4 vues à hauteur d'homme (face, droite, dos, gauche), 4 en plongée (aux quatre coins), 1 de près sur la porte,
1 de près sur une fenêtre, 1 de dessus, 1 en contre-plongée sous l'avant-toit. Cycles, petite taille (720 × 480,
une trentaine d'échantillons, débruitage), ciel uni, soleil chaud, **sol terne** (un sol vert vif renvoie du vert sous
les toits et fausse les couleurs). Le cadrage recule automatiquement pour les objets hauts. Une **planche 4 × 3**
réunit les 12 vues.

**Rapport `controle.txt`** :
- triangles (comparés à l'ancienne version et au budget) ;
- **capsule du joueur** (rayon 0,35 m, 1,7 m) qui part de 4,5 m devant la porte et marche jusqu'au seuil : elle bute
  sur tout obstacle, monte des marches de 30 cm au plus, mesure l'ouverture (largeur entre montants, hauteur sous le
  linteau, depuis le plancher). Une porte bouchée, trop basse ou une marche trop haute est trouvée par la machine.

**Personnage : trois planches**, toujours les mêmes caméras :
- (a) 12 vues au repos ;
- (b) **postures et articulations** : chaque articulation pliée à ses limites (cou, épaules, coudes, poignets, colonne,
  hanches, genoux, chevilles) et des poses extrêmes (accroupi, bras levés, torsion, écart, jambe à 90°) ;
- (c) **animations** du jeu (repos, marche, trot, course, saut, réception, coup d'épée, parler, ramasser) en images
  fixes régulières, de côté et de face, **caméra qui suit** le personnage, **disques au sol** sous chaque pied
  réellement posé (rouge gauche, bleu droit, fixes dans le monde), ligne de repère graduée au sol, objet tenu visible
  (épée).
- Rapport : triangles par pièce, et **glissement des pieds** : pour chaque clip, la vitesse d'avance et, pour CHAQUE
  contact de chaque pied (images de début et de fin), le déplacement d'un point de semelle qui touche le sol
  (à moins de 2 cm). Cible : 3 cm au plus par contact.

**Arbres et végétation** : 12 vues (dont l'imposteur lointain à côté de l'arbre de près) + une planche « forêt ».

---

## 5. Le contrôle qualité (check & challenge)

1. Le fabricant produit un premier jet propre (il corrige lui-même les défauts évidents de construction) et s'arrête.
2. **Un agent inspecteur d'un autre modèle**, lancé sans le contexte du fabricant, reçoit seulement : les chemins des
   images, le rapport, la grille (§ 8), éventuellement une planche d'un modèle déjà validé comme référence de niveau.
3. Il rend : une **note sur 10 par critère**, la liste numérotée des **corrections obligatoires** (pour tout critère
   sous 8), chacune précise et vérifiable (quelle vue, quel endroit, quel défaut, ce qu'il faut obtenir), 3 suggestions
   facultatives au plus, et un verdict « PASSE » seulement si tout est à 8 ou plus.
4. Le fabricant corrige, refait **les mêmes rendus**, et on renvoie au **même inspecteur** (il vérifie ses corrections
   une par une : faite / pas faite, et repère les défauts qui reviennent).
5. **Même défaut 3 tours de suite → changement d'approche obligatoire.**
6. Un agent lancé en parallèle ne peut souvent pas lancer lui-même d'inspecteur : c'est la session principale qui fait
   le relais (planches → inspecteur → corrections → fabricant).
7. Après « PASSE » : intégration dans le jeu, capture dans le jeu (avant / après), décision du propriétaire.

Ordre de grandeur observé : une maison passe en 2 à 9 tours ; un personnage en 5 tours ; la première implantation
d'un village en 3 tours.

---

## 6. Personnages : spécificités

- **Squelette commun** et noms d'os fixes (le jeu et les animations en dépendent) ; tous les personnages s'y attachent.
- **Pas de poids automatiques bâclés.** Membres en segments rigides à rotule (chaque bout est une demi-sphère centrée
  sur le pivot, chaque segment suit un seul os) : ni pli « papier de bonbon » ni trou aux jointures. Le tronc passe en
  douceur d'un os à l'autre selon la hauteur. Les vêtements suivent par poids progressifs (une jupe en deux pans fendus,
  chacun sur sa cuisse, au lieu d'une pièce partagée qui fait une boule entre les jambes).
- **Animations** : mouvements calmes (bibliothèque CC0 transférée sur le squelette, puis retouchées) avec des
  amplitudes et une inclinaison du buste qui distinguent marche < trot < course ; vitesse d'avance mesurée sur le
  squelette (pas devinée) ; **pied d'appui verrouillé** (pied à plat, cheville fixe tant qu'il touche, IK cuisse-tibia
  cuite image par image, bassin à la bonne hauteur) ; un double contact du même pied devient un vrai pas levé en arc,
  jamais une glissade.
- Le jeu mélange les clips selon la vitesse : donner les seuils de mélange qui correspondent aux vitesses mesurées.

---

## 7. Implantation dans le jeu (villages, sol)

Les objets validés ne suffisent pas : il faut contrôler **comment ils sont posés dans le paysage**, dans le vrai jeu.
- Script Playwright (navigateur sans interface, rendu logiciel) qui charge le jeu, cache l'interface et prend pour
  chaque village **12 vues toujours les mêmes** : depuis la place vers les 4 points cardinaux, de dessus, 2 en plongée,
  2 de côté depuis les champs, 2 dans une rue devant une porte, 1 à l'approche (caméras jamais dans le sol).
- **Rapport chiffré** par maison : terrain sous l'emprise, soubassement découvert, hauteur du seuil au-dessus du sol
  devant la porte, pente devant, porte bouchée, écart réel entre emprises (rectangles), maison dans l'eau.
- Inspecteur dédié (grille § 8) : posé, accès, organisation, **sol et chemins**, **dénivelé** (terrasses, murets,
  talus), **abords** (clôtures, potagers, herbes, accessoires), charme.
- Ce qui a été construit pour passer : plan avec place pavée et rues ; maisons alignées le long des rues (façade côté
  rue) ou autour de la place (porte vers la place) ; **relief aplani** sous chaque maison et devant chaque porte puis
  **posé exactement à niveau** ; hauteur des maisons d'une rue sur le profil adouci de la rue ; carte du sol par
  village (terre battue, pavés, terre labourée) lue par le terrain et l'herbe ; murets de soutènement là où la terrasse
  entaille la pente ; potagers et champs clôturés ; trouées sans arbres dans l'axe des rues.

---

## 8. Les grilles des inspecteurs (à donner telles quelles)

### Bâtiment ou objet
> Tu es l'inspecteur qualité, exigeant et impartial, des modèles 3D d'un jeu (style : <décrire>). Tu n'as pas
> fabriqué ce modèle : ne lui fais aucune faveur. Une note de 8 veut dire « je le mettrais dans un jeu publié sans
> gêne ». Sous 8, tu dois dire exactement quoi changer. Regarde CHAQUE image, puis le rapport.
> Note sur 10 : 1. Posé (rien ne flotte, rien ne s'enfonce, rien ne se traverse). 2. Matières et couleurs (chaque
> matière se reconnaît, bonne échelle, pas d'étirement, palette du jeu). 3. Formes (silhouette, proportions à
> l'échelle humaine, pas de trous ni de faces manquantes). 4. Style et charme. 5. Lisibilité de loin. 6. Passage
> (la capsule du joueur atteint le seuil, ouverture assez grande). 7. Coût (triangles comparés à la référence).
> Réponds avec : tableau des notes ; CORRECTIONS OBLIGATOIRES numérotées (vue, endroit, défaut, résultat attendu) ;
> 3 suggestions au plus ; verdict « PASSE » seulement si tout est à 8 ou plus.

### Personnage
> Mêmes règles. Critères : 1. Proportions et silhouette. 2. Visage. 3. Cheveux et vêtements (rien qui flotte ou
> traverse). 4. Articulations et postures (planche B : pas de peau qui traverse, pas de pli papier de bonbon, volumes
> gardés, vêtements qui suivent). 5. Animations (planches C : pieds qui ne glissent pas ni ne s'enfoncent, rien qui
> traverse, poids crédible, allures distinctes). 6. Style et couleurs. 7. Coût. Si un cadrage empêche de juger, c'est
> une correction obligatoire du banc de test.

### Implantation d'un village
> Tu juges comment les bâtiments (déjà validés) sont posés dans le paysage et le sol autour. Critères : 1. Posé
> (rien ne flotte, pas de soubassement nu sur une pente, pas de seuil sans marches). 2. Accès (chaque porte atteignable
> depuis la place, rien ne la bouche). 3. Organisation (place, rues, orientation, espacement). 4. Sol et chemins.
> 5. Dénivelé (terrasses, murets, talus). 6. Abords (clôtures, jardins, herbes, accessoires bien posés). 7. Lisibilité
> et charme. Même format de réponse.

---

## 9. Travailler en parallèle

- Un agent fabricant par objet (ou par paire d'objets), chacun dans **sa propre copie du dépôt** (git worktree).
- Les pièces nouvelles s'ajoutent **à la fin du kit dans une section nommée** (« ajouts longère et forge »…) : la fusion
  se résout en gardant les sections ; on ne modifie pas une pièce existante sans le dire.
- Les fabricants n'intègrent rien au jeu (pas de numéro de version, pas de fichier du jeu partagé) : la session
  principale fusionne, exporte une fois, vérifie dans le jeu et publie.
- Les rendus longs tournent en arrière-plan ; le fichier de passation est mis à jour à chaque tour.
- Ce qui se répète (la marche à suivre, les grilles) est écrit une fois dans une compétence (skill) de l'agent : on ne
  réexplique jamais la méthode.

---

## 10. Leçons apprises (à ajouter à la grille quand une erreur passe)

- Une face qui sera à l'ombre (dessous de toit, tranches) se colore en **brun chaud, jamais en jaune** : un jaune
  assombri se lit vert olive.
- Une simplification automatique (decimate) déchire les feuilles et les branches : simplifier seulement ce qui le
  supporte, comparer avant / après de près.
- Un effet d'image qui lit la profondeur (ex. occlusion ambiante à l'écran) ignore la transparence des cartes d'arbres
  (rectangles noirs) : tester chaque effet dans le jeu, à tous les niveaux de qualité, sur ordinateur et sur tablette.
- Après un changement de modèle, changer le nom du cache hors ligne (service worker), sinon les appareils gardent
  l'ancien fichier, et la mise à jour doit reprendre tous les fichiers, pas seulement la page.
- Après chaque modification d'un fichier par script, vérifier qu'il n'a pas été dupliqué ou tronqué (compter les
  définitions, vérifier la syntaxe) : une modification ratée avait laissé une ancienne version d'une fonction qui
  masquait la correction pendant cinq tours.
- Un commentaire ajouté en fin de ligne dans un remplacement automatique peut avaler la suite de la ligne.
- Le banc de test doit être juste avant le modèle : caméra sous un toit, dans une maison voisine ou dans le sol, mesure
  qui touche une penture au lieu de l'ouverture… se corrigent d'abord.
- Les marches : le joueur monte 30 cm au plus et la capsule a besoin de 40 cm de giron.
- Aplanir le terrain sous des maisons voisines à des hauteurs différentes crée des seuils enterrés : fixer la hauteur
  par rue (profil adouci) puis poser chaque plateforme exactement à niveau après le mélange.
