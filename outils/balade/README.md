# La Balade de Millépoques — fabrication

Une ville de **Millépoques** (le village Renaissance de la sauvegarde de Théo du 18 octobre 2026) à parcourir à pied,
en 2,5D, avec le moteur **Luminati** (https://gitlab.com/stubborn-hug/lumina, licence MIT). Pas d'histoire : on explore.

Deux étapes :

```bash
# 1. La cuisson (seulement quand la ville change) : il faut le dépôt privé gbillois/Millepoques, cloné à côté.
node outils/balade/cuisson/cuire.mjs <dépôt Millepoques> outils/balade/ville-theo.json balade/ville [x0 y0 largeur hauteur]
# 2. Le jeu : le moteur, nos retouches, le niveau, la compilation → balade/jeu/
bash outils/balade/fabriquer.sh
```

## 1. La cuisson (`cuisson/`)

`cuire.mjs` ouvre `cuire.html` dans Chromium (Playwright), avec le code de Millepoques servi sous `/mp/`. Rien n'est
redessiné : la sauvegarde est chargée par le vrai `Game` de Millepoques et dessinée par son vrai `Renderer`.
`cuire-page.js` range ce qu'il dessine :

| Sortie (`balade/ville/`) | Contenu |
| --- | --- |
| `sol/<x>-<y>.webp` | Le sol (herbe, routes, eau, champs, ombres des arbres), 16 × 16 cases par image, 40 px par case. |
| `objets-<n>.webp` | Planches de 2048 px : chaque bâtiment, arbre, rocher, drapeau, bateau, animal détouré (2 px par pixel de Millepoques), et les habitants qui marchent (face, dos, profils, 8 images). |
| `carte.webp` | Toute la fenêtre vue de loin (la carte du monde, touche N). |
| `ville.json` | Fenêtre (`x0`, `y0`, `w`, `h` en cases), morceaux du sol, rectangles des images, objets (ancre, ligne de profondeur de Millepoques, échelle), cases (`.` libre, `=` route, `~` eau, `B` bâtiment, `A` arbre, `R` rocher, `#` fermé), routes (pour les passants), départ. |

`ville-theo.json` : la partie Renaissance de la sauvegarde, sans le profil scolaire de l'enfant (ni prénom, ni historique).
Fenêtre par défaut : 80 × 96 cases autour du centre du village (x 92, y 100).

## 2. Le jeu (`fabriquer.sh`)

| Fichier | Rôle |
| --- | --- |
| `moteur/Balade.js` | Copié dans `src/game/balade/`. Cache le monde du moteur et pose la ville : le sol à plat (sans lumière ni brume), les objets en panneaux verticaux sur leur ligne de profondeur (l'ordre de dessin de Millepoques), hauteur × tan(inclinaison) pour garder les proportions des dessins, arbres qui se balancent, bateaux qui dansent, le joueur (un habitant de Millepoques) et 18 passants sur les routes, silhouette du joueur caché derrière une maison, carte du monde. Pas de flou, pas d'éclat, pas d'étalonnage, pas de « tone mapping » : les couleurs de Millepoques telles quelles. La caméra regarde toujours le nord. |
| `moteur/balade.patch` | Trois retouches de `Game.js` : créer la balade après le niveau, la mettre à jour à chaque image, ne pas tourner la caméra de l'écran titre. |
| `make-balade.mjs` | Le niveau Luminati (`levels/balade.json`) : cases libres ou bloquées, départ devant l'hôtel de ville, caméra (distance 18, inclinaison 50°), noms des bâtiments (régions), `environment.millepoques` (chemin de la ville, nombre de passants, vitesse, zoom). |
| `moteur/tactile.js` | Joystick sous le pouce (courir tout au bord), deux doigts pour zoomer, boutons Carte, +, −, bouton Accueil sur l'écran titre. |

Le français vient des retouches des Trois Lueurs (`outils/lumina/moteur/`), au même commit du moteur.
Le jeu lit `../ville/` depuis le même site : il marche sur GitHub Pages, pas dans l'artefact.
