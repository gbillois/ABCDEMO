# Cartes de My World Explorer

`monde/donnees/` est fabriqué par ces scripts à partir de **données géographiques du domaine public** :

| Fichier | Contenu | Source |
|---|---|---|
| `relief.webp` | altitude et profondeur (16 bits, sans perte), part de lac | ETOPO1 (NOAA), Natural Earth (côtes, lacs) |
| `couleurs.jpg` | couleurs des paysages, banquise sur la mer | calculées ici (`zones.py` + relief), contours Natural Earth |
| `ids.png` | pays, mers, continents / océans (pour toucher et surligner) | Natural Earth |
| `paysages.png` | type de paysage (forêt, désert, taïga…) | calculé ici |
| `monde.json` | pays (noms français, capitales, population), villes, fleuves, régions de France, montagnes, déserts | Natural Earth |

- **Natural Earth** (naturalearthdata.com) : domaine public. **ETOPO1** (NOAA, via ERDDAP) : domaine public.
- Aucune image n'est téléchargée : les couleurs des paysages sont peintes par `fabriquer.py`, d'après les zones
  dessinées à la main dans `zones.py` (forêts tropicales, savanes, steppes, déserts…), la latitude (taïga, toundra),
  l'altitude (roche, neige) et les glaciers.

Refaire les cartes :

```sh
pip install pyshp shapely scipy numpy pillow
sh telecharger.sh /tmp/geo
python3 fabriquer.py /tmp/geo/ne /tmp/geo/etopo ../../monde/donnees
```

Après une modification des cartes : changer `CACHE` dans `monde/sw.js` et `window.MONDE_VERSION` dans `monde/index.html`.
