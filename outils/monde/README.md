# Cartes de My World Explorer

`monde/donnees/` est fabriqué par ces scripts à partir de **données géographiques du domaine public** :

| Fichier | Contenu | Source |
|---|---|---|
| `relief.webp` | altitude et profondeur (16 bits, sans perte), part de lac | ETOPO 2022 (NOAA, CC0), Natural Earth (côtes, lacs) |
| `tuiles/` | relief (`r_<lat>_<lon>.webp`) et couleurs (`c_…jpg`) fins, 1′ (~1,8 km), par tuiles de 10° ; le jeu charge les 4 × 4 tuiles autour de l'endroit regardé | ETOPO 2022, Natural Earth 10m (`tuiles.py`) |
| `couleurs.jpg` | couleurs des paysages, banquise sur la mer | calculées ici (`zones.py` + relief), contours Natural Earth |
| `ids.png` | pays, mers, continents / océans (pour toucher et surligner) | Natural Earth |
| `paysages.png` | type de paysage (forêt, désert, taïga…) | calculé ici |
| `sols.png` | familles de sol (forêt, champs, sable) : le jeu y dessine de près parcelles, canopée, dunes | calculé ici |
| `frontieres.json` | frontières « vues par » 30 pays (choix « Où habites-tu ? ») : différences avec la carte de base | Natural Earth 10m, points de vue officiels (`frontieres.py`) |
| `monde.json` | pays (noms français, capitales, population), villes, fleuves, régions de France, montagnes, déserts | Natural Earth |

- **Natural Earth** (naturalearthdata.com) : domaine public. **ETOPO 2022** (NOAA, via ERDDAP) : CC0 (dédicace au domaine public dans le monde entier).
- Aucune image n'est téléchargée : les couleurs des paysages sont peintes par `fabriquer.py`, d'après les zones
  dessinées à la main dans `zones.py` (forêts tropicales, savanes, steppes, déserts…), la latitude (taïga, toundra),
  l'altitude (roche, neige) et les glaciers.

Bilan complet des droits (usage commercial) : `monde/LICENCES.md`.

Refaire les cartes :

```sh
pip install pyshp shapely scipy numpy pillow
sh telecharger.sh /tmp/geo
python3 fabriquer.py /tmp/geo/ne /tmp/geo/etopo ../../monde/donnees   # bandes b_*.nc seulement
# tuiles fines : ETOPO 2022 par tuiles de 10° à 1′ (t_<lat>_<lon>.nc, terres seulement), puis
MONDE_INTER=/tmp/geo/inter.npz python3 fabriquer.py …   # garde les couleurs sans relief
python3 tuiles.py /tmp/geo/ne /tmp/geo/tuiles_nc /tmp/geo/inter.npz ../../monde/donnees
# frontières selon le pays : télécharger ne_10m_admin_0_countries et ne_10m_admin_0_countries_<pays> (fra, ind, chn…) dans un dossier, puis
python3 frontieres.py <dossier> ../../monde/donnees
```

Après une modification des cartes : changer `CACHE` dans `monde/sw.js` et `window.MONDE_VERSION` dans `monde/index.html`.
