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
dessin. Seule retouche, en mémoire : les fonctions qui dessinent les toits (`hipRoof`, `gableRoof`, `mansard`, `roofHD`,
`coneHD`, `hallRoof`…) appellent d'abord `globalThis.__toit`, pour que la cuisson connaisse le bas de chaque toit.

| Sortie (`village/donnees/`) | Contenu |
| --- | --- |
| `sol/<x>-<y>.webp` | Le sol (herbe, routes, eau, champs, ombres des arbres), 16 × 16 cases par image, 32 px par case. |
| `loin.webp` | Tout le pays, 4 px par case (le sol au loin). `carte.webp` : la fenêtre, 8 px par case (touche M). |
| `objets-<n>.webp` | Planches de 2048 px : façades des bâtiments et leurs découpes, arbres, rochers, drapeaux, bateaux, animaux, habitants (3 px par pixel de Millépoques), icônes des marchandises. |
| `travail/<type>.webp` | Pour chaque sorte de bâtiment : les pièces qui bougent quand on y travaille (ouvriers, presses, métiers…), 16 images à 10 par seconde, chargées en entrant. |
| `dedans-*.webp` | Murs (tuffeau, brique, colombage, bois, pierre), sols (pavé, planches) et plafond, dessinés par les fonctions de `tuffeau.js`. |
| `village.json` | Fenêtre, morceaux du sol, images (rectangle, décalage par rapport au pied), objets, modèles, bâtiments, habitants, intérieurs (nom, `info`, recette de Millépoques), cases (`.` libre, `=` route, `P` pont, `~` eau, `B` bâtiment, `R` rocher, `#` fermé), routes, départ. |

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
