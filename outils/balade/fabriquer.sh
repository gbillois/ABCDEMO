#!/usr/bin/env bash
# Fabrique « La Balade de Millépoques » (dossier balade/jeu/ du dépôt) à partir du moteur Luminati.
#
#   bash outils/balade/fabriquer.sh [dossier-de-travail]
#
# 1. récupère le moteur (https://gitlab.com/stubborn-hug/lumina, licence MIT) au commit noté dans COMMIT
#    (le même que Les Trois Lueurs) ;
# 2. applique les retouches des Trois Lueurs (le français : outils/lumina/moteur/) et les nôtres
#    (moteur/balade.patch : trois lignes dans Game.js ; moteur/Balade.js : la ville de Millepoques) ;
# 3. écrit le niveau (make-balade.mjs) à partir de la ville cuite (balade/ville/ville.json) ;
# 4. compile avec Vite, puis copie dans balade/jeu/ seulement ce dont le jeu a besoin.
#
# La ville elle-même (balade/ville/) est cuite à part, avec le dépôt Millepoques (voir README.md).
# Il faut Node.js 20.19+ (ou 22.12+) et le réseau (gitlab.com, registre npm).
set -euo pipefail

COMMIT=85efa0456812ca25e5279e9735bb11ec5a1d6979
DEPOT="$(cd "$(dirname "$0")/../.." && pwd)"
ICI="$DEPOT/outils/balade"
LUEURS="$DEPOT/outils/lumina"
TRAVAIL="${1:-${TMPDIR:-/tmp}/lumina-balade}"
SORTIE="$DEPOT/balade/jeu"

if [ ! -f "$DEPOT/balade/ville/ville.json" ]; then echo "Pas de ville cuite (balade/ville/ville.json) : voir outils/balade/README.md" >&2; exit 1; fi
if [ ! -d "$TRAVAIL/.git" ]; then
  git clone https://gitlab.com/stubborn-hug/lumina.git "$TRAVAIL"
fi
cd "$TRAVAIL"
git fetch --quiet origin || true
git checkout --quiet --force "$COMMIT"
git clean --quiet -fd public src tools
npm ci --no-audit --no-fund || npm install --no-audit --no-fund

# le français (comme Les Trois Lueurs)
git apply "$LUEURS/moteur/luminati.patch"
cp "$LUEURS/moteur/fr.js" src/engine/i18n/fr.js
node "$LUEURS/moteur/fr-common.mjs"
# la balade
git apply "$ICI/moteur/balade.patch"
mkdir -p src/game/balade
cp "$ICI/moteur/Balade.js" src/game/balade/Balade.js
cp "$ICI/make-balade.mjs" tools/
node tools/make-balade.mjs "$DEPOT/balade/ville/ville.json"

npx vite build

# ---- ce que le jeu emporte ----
rm -rf "$SORTIE"
mkdir -p "$SORTIE/levels" "$SORTIE/i18n"
cp dist/game.html "$SORTIE/"
cp dist/levels/balade.json "$SORTIE/levels/"
cp -r dist/i18n/fr "$SORTIE/i18n/"
node -e '
  const fs = require("fs");
  const idx = JSON.parse(fs.readFileSync("dist/i18n/index.json", "utf8"));
  idx.languages = { fr: idx.languages.fr };
  fs.writeFileSync(process.argv[1], JSON.stringify(idx, null, 2) + "\n");
' "$SORTIE/i18n/index.json"
# le code (sans l'éditeur) et les polices latines (pas les polices japonaises et chinoises)
mkdir -p "$SORTIE/assets"
for f in dist/assets/*; do
  b="$(basename "$f")"
  case "$b" in
    editor-*|noto-sans-*|dotgothic16-*) continue ;;
  esac
  cp "$f" "$SORTIE/assets/"
done
# les commandes tactiles et le bouton « Accueil », ajoutés à la page du jeu
cp "$ICI/moteur/tactile.js" "$SORTIE/tactile.js"
node -e '
  const fs = require("fs");
  const f = process.argv[1];
  let h = fs.readFileSync(f, "utf8");
  if (!h.includes("tactile.js")) h = h.replace("</body>", "  <script src=\"tactile.js\" defer></script>\n</body>");
  h = h.replace(/<meta name="viewport"[^>]*>/, "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover\" />");
  h = h.replace(/<title>[^<]*<\/title>/, "<title>La Balade de Millépoques</title>");
  fs.writeFileSync(f, h);
' "$SORTIE/game.html"
cp LICENSE "$SORTIE/LICENCE-Luminati.txt"
echo "commit du moteur : $COMMIT" > "$SORTIE/VERSION-MOTEUR.txt"
du -sh "$SORTIE" "$DEPOT/balade/ville"
echo "La Balade de Millépoques → $SORTIE"
