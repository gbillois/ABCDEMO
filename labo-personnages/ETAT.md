# Refonte des personnages du Domaine des Pins : où on en est

Travail interrompu à la demande du propriétaire (consommation de tokens), pour reprendre plus tard.
**Le jeu n'est pas modifié** : `pins/index.html` est intact. Tout le travail est dans ce dossier, sur la branche
`refonte-personnages` (pas sur `main`).

## Ce que veut le propriétaire (le plus récent l'emporte, voir SPEC.md §11 et §14 à §16)
- Garder le charme des anciens personnages : visage dessiné (grands yeux, sourire, joues roses, clignement).
- Corriger le vrai problème : ils étaient tous « bodybuildés ». Il faut des épaules étroites et tombantes, un corps
  d'enfant mince et naturel, des bras et des jambes fins, et une animation naturelle.
- Style mignon et enfantin, un peu comme les Mii de Nintendo.
- Une tête à peine plus grande que la réalité (+10 % : environ 1/6 de la taille pour un enfant), pas une grosse tête.
- Pudeur absolue (§11) : entrejambe lisse, pas de poitrine chez les enfants, toujours habillé ou en maillot.
- Des pieds avec des orteils, des baskets, et des tongs avec le maillot (enlevées dans l'eau).
- Bonnets et lunettes de natation (photo de la piscine).
- Les adultes ont des proportions d'adulte (la grand-mère).
- Performances : 12 000 triangles au plus par personnage complet, 3 000 pour la foule.

## État des modules (`perso/`)
| fichier | état |
|---|---|
| `squelette.js` | fini : 24 os, 4 types (garcon, fille, femme, homme), pose A, conventions de l'ancien rig |
| `corps.js` | première version réaliste finie : peau continue, cage → Catmull-Clark → champ de distance. **Trop dense** (~15 k triangles pour le corps, ~22 k par personnage). La passe « style Mii + 6 k triangles » a été arrêtée au début. |
| `tete.js`, `visage.js` | première version réaliste (yeux 3D) : **à remplacer** par l'ancien visage dessiné (`atlasVisage` dans `ancien/ancien.js`) sur une tête +10 %. `tete.tmp.js` est un début de cette nouvelle version, inachevé. |
| `anim.js` | fini et bon : marche, course et sprint (pieds posés, IK), repos, nage, sur-place, échelle, toboggan, saut, vélo, kart, pédalo, poney, chaise, bouée, transat. Les changements d'appel à faire dans le jeu sont listés plus bas. |
| `materiaux.js` | fini : peau chaude, tissus, cheveux, accessoires, la foule en un seul appel de dessin (`geoLegere`/`matLegere`) |
| `index.js` | `person()` provisoire : habits peints sur la peau, bonnet et lunettes de natation simples |
| `habits.js`, `cheveux.js` | **pas commencés** (les équipes ont été arrêtées en lisant le cahier des charges) |
| `mannequin.js` | corps de test pour l'animation |

Rendus de référence dans `rendus/` (ancien vs nouveau, piscine, adultes, marche, course, essai dans le vrai jeu).

## Reprendre
1. Le labo a besoin de three.js en local (non versionné) :
   ```
   for f in build/three.module.js examples/jsm/objects/Sky.js examples/jsm/objects/Water.js examples/jsm/geometries/RoundedBoxGeometry.js examples/jsm/utils/BufferGeometryUtils.js; do mkdir -p cdn/three@0.170.0/$(dirname $f); curl -sS -o cdn/three@0.170.0/$f https://cdn.jsdelivr.net/npm/three@0.170.0/$f; done
   ```
2. Les photos de référence des enfants ne sont **pas** dans le dépôt (vie privée) : les remettre dans `ref/`
   (`photo1-enfants-habits.jpg`, `photo2-jeu-actuel.jpg`, `photo3-piscine.jpg`, `photo4-adulte-enfants.jpg`).
3. Voir une scène : `node shot.js "scene=piscine&vue=face" out/essai.png 1400 800` (scènes dans `scenarios*.js`,
   options dans SPEC.md §8). Comparer avec l'ancien : `v=ancien` ou `v=deux`.
4. Essayer dans le vrai jeu : `node integrer.js ../pins/index.html /tmp/essai.html` recopie les modules dans une copie
   du jeu (section « Personnages » remplacée), puis `node jeu-shot.js /tmp/essai.html out/jeu.png "<actions>"`.

## Reste à faire
1. Corps : alléger (≤ 6 k triangles), formes lisses façon figurine, et corriger les défauts relevés (SPEC §13).
2. Visage : remettre l'ancien visage dessiné sur la tête +10 %, avec le clignement.
3. Cheveux (9 coupes, casquette, nœud, bandeau, lunettes, bonnet et lunettes de natation).
4. Vêtements : t-shirts et motifs, sweat, short, pantalon, legging, jean, baskets, tongs, boxer de bain, maillot une
   pièce, combinaison.
5. Intégrer dans le jeu (`integrer.js`) et adapter les appels de `animPerson` :
   - joueur : passer la vitesse (`sp * Math.min(L, 1)`) ;
   - foule et promeneurs : passer `spd` / `w.sp` ;
   - transat : mode `lie` ;
   - sauts et trampoline : mode `jump` ;
   - pédalo : l'angle du pédalier ;
   - poney : `V.ph`, `V.v` ;
   - bras pour manger : `-.45 - k * .65` et `-1 - k * 1.15` ;
   - plateau du Burger Fast : `userData.porter`.
6. Vestiaires (bonnet et lunettes de natation), réseau (champ facultatif), vérifications en jeu, perf sur iPad, puis
   commit sur `main` et republication de l'artefact (CLAUDE.md).
