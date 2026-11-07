# Le Village de Millépoques — fabrication

Un village de **Millépoques** (la partie Renaissance d'une sauvegarde du 24 octobre 2026, sans le profil de l'enfant :
`ville.json`) à parcourir en **vraie 3D** (three.js), au plus près du style de Millépoques. Le jeu : `village/`.

```bash
# il faut le dépôt privé gbillois/Millepoques, cloné à côté, et Playwright (Chromium)
node outils/village/cuisson/cuire.mjs <dépôt Millepoques> outils/village/ville.json village/donnees [x0 y0 largeur hauteur]
```
Fenêtre par défaut : 80 × 128 cases à partir de (88, 62), soit 234 bâtiments. Environ une minute.

## La cuisson (`cuisson/`)

`cuire.mjs` ouvre `cuire.html` dans Chromium avec le code de Millépoques servi sous `/mp/` par `serveur.mjs`. Rien n'est
redessiné : la sauvegarde est chargée par le vrai `Game` de Millépoques et dessinée par son vrai `Renderer` et ses fonctions de
dessin. Retouches, en mémoire seulement : les fonctions qui dessinent les toits (`hipRoof`, `gableRoof`, `mansard`, `roofHD`,
`coneHD`, `hallRoof`…) et les cheminées (`chimney`) appellent d'abord `globalThis.__toit` (bas et matière de chaque toit,
cheminées en blocs 3D) ; la tête d'un habitant prévient `globalThis.__tete` et peut se dessiner sans chapeau ; les ponts peints
du sol peuvent être omis. `--voir=<type>` écrit le dessin, le masque et la silhouette d'un bâtiment (débogage).

| Sortie (`village/donnees/`) | Contenu |
| --- | --- |
| `sol/<x>-<y>.webp` | Le sol (herbe, routes, eau, champs, ombres des arbres), sans les ponts peints (ils sont en 3D), 16 × 16 cases par image, 40 px par case. |
| `loin.webp` | Tout le pays, 4 px par case (le sol au loin). `carte.webp` : la fenêtre, 8 px par case (touche M). |
| `objets-<n>.webp` | Planches de 2048 px : façades des bâtiments et leurs découpes, arbres, rochers, drapeaux, bateaux, animaux (3 px par pixel de Millépoques), icônes des marchandises. |
| `tetes.webp` | La tête de chaque habitant dessinée par Millépoques, de face et de dos, sans chapeau, 10 px par pixel, centrée dans sa case de 200 px (projetée sur la tête 3D). |
| `dedans-toit-*.webp` | Les couvertures (ardoise de tuffeau, ardoise, tuiles, chaume, bardeaux…) dessinées par `hipRoof` et `roofHD` : toits vus de dos et croupes. |
| `dedans-pont-*.webp` | Pierre (romaine, médiévale, Renaissance) aux couleurs de `render/bridges.js`, dalles, planches : les ponts 3D. |
| `travail/<type>.webp` | Pour chaque sorte de bâtiment : les pièces qui bougent quand on y travaille (ouvriers, presses, métiers…), 16 images à 10 par seconde, chargées en entrant. |
| `dedans-*.webp` | Murs (tuffeau, brique, colombage, bois, pierre), sols (pavé, planches) et plafond, dessinés par les fonctions de `tuffeau.js`. |
| `village.json` | Relief (`relief` : altitude `elev` de toute la carte aux coins des cases, nature et ponts des cases, en base64), ponts (`ponts`), apparence des habitants (`habitants` : tenue, couleurs, chapeau tirés de `lookOf`), fenêtre, morceaux du sol, images (rectangle, décalage par rapport au pied), objets, modèles, bâtiments, habitants, intérieurs (nom, `info`, recette de Millépoques), cases (`.` libre, `=` route, `P` pont, `~` eau, `B` bâtiment, `R` rocher, `#` fermé), routes, départ. |

### Le volume d'un bâtiment

1. Le dessin de Millépoques est une **élévation** (la façade vue de face, le toit au-dessus) : exactement ce qu'on voit debout devant.
2. Silhouette pleine (ouverture de 5 pixels : sans mâts, cordes, cheminées ; trous bouchés), puis la hauteur de chaque colonne.
3. Les colonnes hautes (40 % de la plus haute) forment des **corps**. Hauteur des murs : le bas du toit dessiné par Millépoques
   au-dessus du corps (sinon, la ligne la plus basse où la silhouette est la plus large : le débord du toit).
4. Dans le jeu, chaque colonne devient une tranche : mur de devant, pente de devant jusqu'au faîtage (au milieu de la
   profondeur), pente et mur de derrière ; aux deux bouts, un pignon où la façade est étalée sur la profondeur. La façade de
   Millépoques est projetée de face : de devant, on voit le dessin tel quel ; de côté et de derrière, les mêmes couleurs.
5. Ce qui dépasse du toit (cheminées, mâts, fanions) est posé debout sur le faîtage ; ce qui est à côté (enclos, établis, tas
   de bois) debout devant ; ce qui est sous la ligne du sol (cour, ombre, chemin) à plat devant (Millépoques dessine le sol vu de dessus).

## Le jeu (`village/`)

| Fichier | Rôle |
| --- | --- |
| `jeu.js` | La scène : sol, bâtiments (volume, débord du toit, cheminées, couverture répétée sur les pans vus de dos et les croupes, maçonnerie des pignons, trait des arêtes), images debout, soleil et ombres, ciel, caméra (monte puis se rapproche devant le relief et les bâtiments), portes, intérieurs, sons. |
| `relief.js` | Le relief (`elev` de Millépoques : prés presque plats, montagnes, lits des rivières, plateaux sous les bâtiments), l'eau qui bouge, les ponts 3D (pierre à arches, avant-becs, demi-lunes ; bois à pieux et garde-corps). |
| `gens.js` | Les personnages 3D : pièces partagées (InstancedMesh, une copie par personnage), ombrage en trois tons, contour gonflé, tête au visage de Millépoques, chapeaux modelés, marche, course, repos. |

Contrôle : 15 vues fixes (départ, ponts, rue, vue plongeante, ferme, intérieurs…) relues par un inspecteur exigeant à chaque tour.
