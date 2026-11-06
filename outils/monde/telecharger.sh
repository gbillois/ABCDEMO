#!/bin/sh
# Télécharge les données géographiques (domaine public) utilisées par fabriquer.py.
# Usage : sh telecharger.sh <dossier>  puis  python3 fabriquer.py <dossier>/ne <dossier>/etopo ../../monde/donnees
#                                    et  python3 tuiles.py <dossier>/ne <dossier>/tuiles <inter.npz> ../../monde/donnees
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
# tuiles fines (1 minute d'angle) des carrés de 10° qui contiennent de la terre, pour tuiles.py
mkdir -p "$D/tuiles"
python3 - "$D" <<'PY'
import sys, shapefile
from shapely.geometry import shape, box
from shapely.ops import unary_union
D = sys.argv[1]
terre = unary_union([shape(s.__geo_interface__).buffer(0) for s in shapefile.Reader(f"{D}/ne/ne_10m_land/ne_10m_land").shapes()])
open(f"{D}/tuiles/liste.txt", "w").write("\n".join(f"{la} {lo}" for la in range(-90, 90, 10) for lo in range(-180, 180, 10) if terre.intersects(box(lo, la, lo + 10, la + 10))))
PY
while read la lo; do f="$D/tuiles/t_${la}_${lo}.nc"; [ -s "$f" ] && continue
  curl -s -o "$f" "$E?z%5B($la):4:($((la + 10)))%5D%5B($lo):4:($((lo + 10)))%5D"
done < "$D/tuiles/liste.txt"
echo "Données prêtes dans $D"
