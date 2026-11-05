#!/bin/sh
# Télécharge les données géographiques (domaine public) utilisées par fabriquer.py.
# Usage : sh telecharger.sh <dossier>  puis  python3 fabriquer.py <dossier>/ne <dossier>/etopo ../../monde/donnees
set -e
D=${1:-donnees-brutes}; mkdir -p "$D/ne" "$D/etopo"
B=https://naciscdn.org/naturalearth
for f in 50m/cultural/ne_50m_admin_0_countries 50m/physical/ne_50m_lakes 50m/physical/ne_50m_geography_regions_polys \
         50m/physical/ne_50m_geography_marine_polys 50m/cultural/ne_50m_populated_places 50m/physical/ne_50m_glaciated_areas \
         50m/physical/ne_50m_antarctic_ice_shelves_polys 10m/cultural/ne_10m_admin_1_states_provinces 50m/physical/ne_50m_land \
         10m/physical/ne_10m_rivers_lake_centerlines; do
  n=$(basename $f); curl -s -o "$D/ne/$n.zip" "$B/$f.zip"; unzip -oq "$D/ne/$n.zip" -d "$D/ne/$n"
done
# ETOPO1 (NOAA) par bandes de 10° de latitude, un point toutes les 3 minutes d'angle
for la in $(seq -90 10 80); do hi=$((la + 10)); f="$D/etopo/b_$la.nc"; [ -s "$f" ] && continue
  for t in 1 2 3 4; do curl -s -o "$f" "https://coastwatch.pfeg.noaa.gov/erddap/griddap/etopo180.nc?altitude%5B($la):3:($hi)%5D%5B(-180):3:(180)%5D" && [ $(wc -c < "$f") -gt 100000 ] && break; sleep 20; done
done
echo "Données prêtes dans $D"
