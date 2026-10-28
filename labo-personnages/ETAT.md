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

## État des modules (`perso/`) — mis à jour : intégré dans `pins/index.html`
| fichier | état |
|---|---|
| `squelette.js`, `anim.js`, `materiaux.js` | finis |
| `corps.js` | allégé : 5 500 triangles (« plein », corps + tête), 2 566 (« leger ») ; corps mince, épaules étroites |
| `tete.js`, `visage.js` | tête douce +10 % (champ de distance), ancien visage dessiné en décalque (clignement), visage léger pour la foule |
| `cheveux.js` | 9 coupes, casquette, nœud, bandeau, lunettes 1..5, bonnet et lunettes de natation |
| `habits.js` | t-shirt (motifs), sweat, short, pantalon / jean / legging, baskets, tongs, boxer, une-pièce, combinaison |
| `index.js` | `person`, `setOutfit`, `putGlasses`, `putSwimGear` ; foule : un seul maillage (corps + visage + cheveux + accessoire, habits peints dans le shader) |
| `mannequin.js` | corps de test pour l'animation |

Mesures (labo, SwiftShader) : personnage complet 9 000 à 11 500 triangles, 9 à 12 maillages ; foule 2 800 à 3 000 triangles,
1 appel de dessin ; construction d'un type ≈ 110-150 ms la première fois (SwiftShader), puis 1-5 ms par personnage.

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
1. Fait : intégration (`integrer.js`) et appels de `animPerson` (vitesse du joueur, de la foule et des promeneurs, transat
   `lie`, sauts et trampoline `jump`, poney `V.ph`/`V.v`, bras pour manger, `userData.porter` au Burger Fast).
2. Petits défauts vus : marche au coude sur le sweat, lanière des tongs au milieu du pied (pas entre les deux premiers orteils),
   cheveux longs un peu au-dessus de 2 000 triangles.
3. Vestiaires (bonnet et lunettes de natation dans le jeu), réseau (champ facultatif), perf sur iPad (`LOWQ`), puis commit sur
   `main` et republication de l'artefact (CLAUDE.md). Après publication : appuyer sur « Mettre à jour » dans l'application.
