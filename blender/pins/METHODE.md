# Méthode de fabrication 3D du Domaine des Pins : cottages, équipements, mobilier, implantation

Méthode fournie par le propriétaire (celle qui a servi au village de DragonFlyer), adaptée à un complexe de loisirs en
forêt : un hameau de cottages, des équipements (Aquaparc, restaurant, boutiques, salle de jeux…), du mobilier du domaine
(bancs, lampadaires, panneaux, poubelles, tables de pique-nique) et des allées entre les pins. Même logique, mêmes outils :
tout est écrit en Python et exécuté dans Blender sans interface, puis contrôlé par un SECOND modèle d'IA qui ne voit que
des images et des chiffres. Marche à suivre pas à pas : `.claude/skills/modele-3d-pins/`.

---

## 1. Principes

1. **Aucune modélisation à la main.** Chaque modèle est un script Python lancé dans Blender sans interface :
   `blender -b -P batiments/cottage.py -- <dossier_de_sortie> [tout]`. Le script construit la géométrie (bmesh), les
   couleurs, cuit l'occlusion, exporte (GLB) et fait ses propres rendus de contrôle.
2. **Jamais tout d'un coup.** On ne demande pas « le domaine ». On avance par étages, chacun validé avant le suivant :
   1. les **matières** (`materiaux.py` : palette du domaine, nuances, façon de varier) ;
   2. un **kit de pièces** (`kit.py` : bardage à clin, planches à couvre-joints, soubassement de pierres, fenêtre à volets,
      encadrement de porte, auvent, toit de bardeaux, pignon, cheminée, terrasse, garde-corps, marche…) ;
   3. **un objet à la fois** (un cottage, un équipement, un banc, un lampadaire) ;
   4. l'**implantation** (le hameau de cottages, les allées, les abords) seulement quand chaque objet est validé.
3. **Un fichier par objet.** `batiments/<nom>.py` pour un bâtiment, `objets/<nom>.py` pour le mobilier, faits des pièces
   du même kit et des mêmes matières. Chaque fichier se lance seul et produit ses aperçus.
4. **Celui qui fabrique ne se valide pas.** Le contrôle est fait par un second agent, d'un autre modèle, sans le contexte
   du fabricant, qui note sur 10 et exige des corrections précises. Rien ne passe sous 8/10, sur aucun critère.
5. **Si le même défaut revient 3 tours de suite, on change d'approche** au lieu de rafistoler.
6. **Le propriétaire a le dernier mot.** Il voit le résultat quand tout est à 8 ou plus, avec des captures dans le jeu
   (avant / après).
7. **Mesurer plutôt que croire.** Chaque rendu s'accompagne d'un rapport chiffré (`controle.txt` : triangles, capsule).

## 2. Organisation des fichiers

```
blender/pins/
  METHODE.md          # ce texte
  materiaux.py        # étage 1 : la palette du domaine
  kit.py              # étage 2 : les pièces
  apercu.py           # rendus communs : occlusion cuite, 12 caméras, planche, capsule du joueur, rapport
  batiments/<nom>.py  # un fichier par bâtiment (cottage.py…)
  objets/<nom>.py     # un fichier par objet du mobilier
  exporter.py         # fabrique les fichiers du jeu (pins/assets/*.glb, compressés en meshopt)
  implantation.js     # 12 vues fixes du hameau dans le vrai jeu (Playwright)
  PASSATION.md        # où on en est, notes de chaque tour, prochaine étape
```
Chaque objet expose `construire(graine)` et un bloc `if __name__ == "__main__":` qui fait les aperçus.

## 3. Blender par script : la boîte à outils

- **Géométrie** : la classe `Piece` (kit.py) enveloppe un `bmesh` : boîtes, cylindres, sphères, faces orientées,
  recopie d'une autre pièce. Toutes les pièces d'un objet sont fusionnées en un seul maillage (un appel de dessin).
- **Couleurs par sommet** (attribut `Col`, couleurs **linéaires**, converties depuis `#rrggbb`), pas de texture.
- **Matières** : quelques teintes proches + une variation (chaque planche, bardeau, pierre tire sa nuance).
- **Occlusion ambiante cuite** (Cycles, `bake(type="AO", target="VERTEX_COLORS")`), multipliée dans les couleurs :
  `couleur *= 0.35 + 0.65 * ao^0.8`. Les vitres (objets `W_`) ne sont pas assombries : le jeu leur donne sa matière
  de vitre, qui s'allume la nuit.
- **Export** GLB (extras utiles au jeu : seuil de la porte, hauteurs), puis compression meshopt (`gltf-transform`).
- **Reproductibilité** : chaque objet a sa graine.
- **Repère** : Z vers le haut, façade (porte) vers -Y, sol à z = 0. Dans le jeu : x = x, y = z, z = -y.
- **Cotes du jeu** : un bâtiment qu'on refait garde les cotes du jeu (murs de collision `L_WALLS`, places des fenêtres,
  porte, hauteur de l'étage `UP`), pour que les collisions, l'intérieur et les portes du jeu restent justes.
- **Parties séparées** quand le jeu en a besoin : le cottage sort en `C_rdc` (murs qui s'effacent quand on entre),
  `C_etage`, `C_toit` (caché quand on est dedans, posé sur l'étage ou sur le rez-de-chaussée), `C_terrasse`, `W_*`.

## 4. Les rendus de contrôle (identiques à chaque tour)

**Bâtiment ou objet : 12 caméras fixes** (à l'échelle de l'objet) : 4 vues à hauteur d'homme (face, droite, dos,
gauche), 4 en plongée (aux quatre coins), 1 de près sur la porte, 1 de près sur une fenêtre, 1 de dessus, 1 en
contre-plongée sous l'avant-toit. Cycles 720 × 480, 28 échantillons, débruitage, ciel uni, soleil chaud, **sol terne**.
Une **planche 4 × 3** réunit les 12 vues. Un bâtiment à variantes (cottage de plain-pied) a une seconde planche (`pp_`).

**Rapport `controle.txt`** : triangles par partie (comparés au budget et à l'ancien modèle) ; **capsule du joueur**
(rayon 0,35 m, 1,7 m) qui part de 4,5 m devant la porte, monte des marches de 30 cm au plus, et mesure l'ouverture.

## 5. Le contrôle qualité (check & challenge)

1. Le fabricant produit un premier jet propre (il corrige lui-même les défauts évidents) et s'arrête.
2. **Un inspecteur d'un autre modèle**, sans le contexte du fabricant, reçoit seulement : les chemins des images, le
   rapport, la grille (§ 8).
3. Il rend une note sur 10 par critère, les **corrections obligatoires** numérotées (vue, endroit, défaut, résultat
   attendu), 3 suggestions au plus, et « PASSE » seulement si tout est à 8 ou plus.
4. Le fabricant corrige, refait **les mêmes rendus**, et on renvoie au **même inspecteur**, qui vérifie ses corrections
   une par une et repère les défauts qui reviennent.
5. **Même défaut 3 tours de suite → changement d'approche obligatoire.**
6. C'est la session principale qui fait le relais (planches → inspecteur → corrections → fabricant).
7. Après « PASSE » : intégration dans le jeu, captures avant / après, décision du propriétaire.

## 6. Personnages

Les vacanciers, animateurs et animaux du domaine sont aujourd'hui faits en code dans le jeu. S'ils passent par Blender :
même méthode que DragonFlyer (`dragonflyer/CONCEPTION.md` § 7 bis, « Personnages ») : squelette commun et noms d'os fixes,
membres en segments rigides à rotule, trois planches (repos, articulations aux limites, animations), glissement des pieds
mesuré.

## 7. Implantation dans le jeu (le hameau de cottages, les allées)

Les objets validés ne suffisent pas : on contrôle **comment ils sont posés dans le domaine**, dans le vrai jeu.
- `implantation.js` (Playwright, rendu logiciel) charge le jeu, cache l'interface et prend **12 vues toujours les mêmes**
  autour du hameau : depuis l'allée, de trois quarts, de côté, de dos, de dessus, 2 en plongée, sur la terrasse devant
  la porte, un cottage de plain-pied, la rangée de cottages, l'approche depuis le grand chemin.
- Inspecteur dédié (grille § 8) : posé, accès, organisation, **sol et allées**, **abords** (terrasse, massifs, haies,
  panneaux, mobilier), lisibilité et charme.

## 8. Les grilles des inspecteurs

Textes complets à donner tels quels : `.claude/skills/modele-3d-pins/inspecteur.md` (bâtiment ou objet) et
`.claude/skills/modele-3d-pins/inspecteur-implantation.md` (implantation).

## 9. Travailler en parallèle

- Un agent fabricant par objet, chacun dans sa propre copie du dépôt (git worktree) ; les pièces nouvelles s'ajoutent
  **à la fin du kit dans une section nommée** ; on ne modifie pas une pièce existante sans le dire.
- Les fabricants n'intègrent rien au jeu : la session principale fusionne, exporte, vérifie dans le jeu et publie.
- Les rendus longs tournent en arrière-plan ; `PASSATION.md` est mis à jour à chaque tour.

## 10. Leçons apprises (à ajouter à la grille quand une erreur passe)

- Une face à l'ombre (dessous de toit, tranches) se colore en **brun chaud**, jamais en jaune assombri (il tourne à
  l'olive) ; le chant des bardeaux verts est un vert très sombre, pas un brun (il se lit en points rouges sur le toit).
- Un « fond » derrière un bardage doit être percé comme le mur : sinon il bouche portes et fenêtres (trouvé par la capsule).
- Après chaque modification d'un fichier par script, vérifier qu'il n'a pas été dupliqué ou tronqué (`grep -c "^def "`,
  `python3 -c "import ast; ast.parse(open('kit.py').read())"`).
- Le banc de test doit être juste avant le modèle (caméra dans un mur, mesure qui touche la mauvaise pièce…).
- Le joueur monte 30 cm au plus.
- Après un changement de modèle, changer le nom du cache hors ligne (`CACHE` de `pins/sw.js`) et ajouter le fichier à `FICHIERS`.
- Pour charger un fichier dans le jeu, les tests Playwright passent par un petit serveur local (pas `file://` : `fetch` y est refusé).
- L'occlusion est cuite **par sommet** : un sommet caché sous une autre pièce (couvre-joint, planche du dessus) sort noir et
  assombrit toute sa face. Ne pas poser de sommet sous une pièce ; découper les longues faces en carreaux ; une pièce qui en
  couvre d'autres (couvre-joints) peut être un objet `J_` caché pendant la cuisson des autres puis fusionné.
- Deux boîtes confondues (dessinées deux fois au même endroit) se cachent l'une l'autre à la cuisson : traits noirs.
- Ne pas fusionner les sommets proches (`remove_doubles`) quand ils portent des couleurs différentes : les couleurs se mélangent
  sur plusieurs planches (traînées).
- Un fichier compressé en meshopt déplace l'origine des nœuds (l'échelle de quantification y est rangée) : ne jamais lire la
  position d'un nœud dans le jeu ; les hauteurs utiles passent par les extras (`haut_etage`). Le contrôle dans le vrai jeu
  l'a trouvé (un toit enfoncé de 1,8 m) alors que les rendus Blender étaient justes.
- Un commentaire `//` ajouté en fin de ligne par un remplacement automatique avale la suite de la ligne (jeu qui ne se
  charge plus) : après chaque modification du jeu, vérifier la syntaxe du module (`node --check` sur le script extrait).
- Un inspecteur peut ne pas recevoir certaines images (« media removed ») : lui demander de le dire au lieu de juger.
