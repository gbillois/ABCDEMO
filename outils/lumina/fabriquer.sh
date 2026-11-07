#!/usr/bin/env bash
# Fabrique « Les Trois Lueurs » (dossier lueurs/ du dépôt) à partir du moteur Luminati.
#
#   bash outils/lumina/fabriquer.sh [dossier-de-travail]
#
# 1. récupère le moteur (https://gitlab.com/stubborn-hug/lumina, licence MIT) à la version notée
#    dans COMMIT ci-dessous ;
# 2. applique nos retouches (moteur/luminati.patch : le style « retro », le français) ;
# 3. écrit la campagne (make-trois-lueurs.mjs) et les textes communs en français ;
# 4. compile avec Vite, puis copie dans lueurs/jeu/ seulement ce dont le jeu a besoin.
#
# Il faut Node.js 20.19+ (ou 22.12+) et le réseau (gitlab.com, registre npm).
set -euo pipefail

COMMIT=85efa0456812ca25e5279e9735bb11ec5a1d6979
DEPOT="$(cd "$(dirname "$0")/../.." && pwd)"
ICI="$DEPOT/outils/lumina"
TRAVAIL="${1:-${TMPDIR:-/tmp}/lumina-trois-lueurs}"
SORTIE="$DEPOT/lueurs/jeu"

if [ ! -d "$TRAVAIL/.git" ]; then
  git clone https://gitlab.com/stubborn-hug/lumina.git "$TRAVAIL"
fi
cd "$TRAVAIL"
git fetch --quiet origin || true
git checkout --quiet --force "$COMMIT"
git clean --quiet -fd public src tools
npm ci --no-audit --no-fund || npm install --no-audit --no-fund

git apply "$ICI/moteur/luminati.patch"
cp "$ICI/moteur/fr.js" src/engine/i18n/fr.js
cp "$ICI/make-trois-lueurs.mjs" tools/
node "$ICI/moteur/fr-common.mjs"
node tools/make-trois-lueurs.mjs

npx vite build

# ---- ce que le jeu emporte ----
rm -rf "$SORTIE"
mkdir -p "$SORTIE/campaigns" "$SORTIE/i18n"
cp dist/game.html "$SORTIE/"
cp -r dist/campaigns/trois-lueurs "$SORTIE/campaigns/"
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
# les commandes tactiles et le bouton « Accueil » (moteur/tactile.js), ajoutés à la page du jeu
cp "$ICI/moteur/tactile.js" "$SORTIE/tactile.js"
node -e '
  const fs = require("fs");
  const f = process.argv[1];
  let h = fs.readFileSync(f, "utf8");
  if (!h.includes("tactile.js")) h = h.replace("</body>", "  <script src=\"tactile.js\" defer></script>\n</body>");
  // pas de zoom sur téléphone et tablette (double-tape, pincement)
  h = h.replace(/<meta name="viewport"[^>]*>/, "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover\" />");
  fs.writeFileSync(f, h);
' "$SORTIE/game.html"
cp LICENSE "$SORTIE/LICENCE-Luminati.txt"
echo "commit du moteur : $COMMIT" > "$SORTIE/VERSION-MOTEUR.txt"
du -sh "$SORTIE"
echo "Les Trois Lueurs → $SORTIE"
