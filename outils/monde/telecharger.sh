#!/bin/sh
# Télécharge les données géographiques (domaine public) utilisées par fabriquer.py.
# Usage : sh telecharger.sh <dossier>  puis  python3 fabriquer.py <dossier>/ne <dossier>/etopo ../../monde/donnees
#                                    et  python3 europe.py <dossier>/ne <dossier>/etopo/eu.nc ../../monde/donnees
set -e
D=${1:-donnees-brutes}; mkdir -p "$D/ne" "$D/etopo"
B=https://naciscdn.org/naturalearth
for f in 50m/cultural/ne_50m_admin_0_countries 50m/physical/ne_50m_lakes 50m/physical/ne_50m_geography_regions_polys \
         50m/physical/ne_50m_geography_marine_polys 50m/cultural/ne_50m_populated_places 50m/physical/ne_50m_glaciated_areas \
         50m/physical/ne_50m_antarctic_ice_shelves_polys 10m/cultural/ne_10m_admin_1_states_provinces 50m/physical/ne_50m_land \
         10m/physical/ne_10m_rivers_lake_centerlines 10m/physical/ne_10m_land 10m/physical/ne_10m_lakes; do
  n=$(basename $f); curl -s -o "$D/ne/$n.zip" "$B/$f.zip"; unzip -oq "$D/ne/$n.zip" -d "$D/ne/$n"
done
# ETOPO 2022 (NOAA, CC0) par bandes de 10° de latitude, un point toutes les 3 minutes d'angle (1 sur 12 de la grille à 15")
E=https://coastwatch.pfeg.noaa.gov/erddap/griddap/ETOPO_2022_v1_15s.nc
for la in $(seq -90 10 80); do hi=$((la + 10)); f="$D/etopo/b_$la.nc"; [ -s "$f" ] && [ $(wc -c < "$f") -gt 100000 ] && continue
  for t in 1 2 3 4 5; do curl -s -o "$f" "$E?z%5B($la):12:($hi)%5D%5B(-180):12:(180)%5D" && [ $(wc -c < "$f") -gt 100000 ] && break; sleep 30; done
done
# Europe en plus fin (1 minute d'angle) pour europe.py
f="$D/etopo/eu.nc"; [ -s "$f" ] || curl -s -o "$f" "$E?z%5B(35):4:(60)%5D%5B(-12):4:(32)%5D"
echo "Données prêtes dans $D"
