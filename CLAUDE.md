# Les jeux de Théo — règles du dépôt

Ce dépôt est un bac à sable de jeux pour Théo. Ne faire aucune action sur un autre dépôt.

Structure :
- `index.html` — page d'accueil (étagère de cartouches, un bouton par jeu).
- `jeux/<nom>.html` — un fichier par jeu.
- `pins/` — Le Domaine des Pins, en application installable (voir plus bas).

## Principes

- **Jeux HTML autonomes, sans backend.** Un jeu = un fichier `jeux/<nom>.html` qui
  s'ouvre seul dans un navigateur : pas de serveur, pas d'API, pas de clé, pas de build.
  Le CSS et le JS du jeu sont dans le fichier.
- **Images faites maison.** Personnages, décors, icônes et textures sont dessinés en code :
  SVG inline, Canvas 2D, dégradés CSS, ou textures générées (Canvas → `CanvasTexture`
  pour la 3D). Si une image doit être un fichier, l'embarquer en `data:` URI.
  Pas d'images téléchargées depuis Internet.
- **Sons faits maison.** Effets et musiques synthétisés avec la Web Audio API
  (oscillateurs, enveloppes, bruit filtré), sans fichiers audio externes.
  Le son ne démarre qu'après un clic/toucher (bouton « Jouer »), avec un bouton couper le son.
- **3D si besoin avec three.js**, chargé depuis un CDN autorisé et en version exacte, par ex. :
  ```html
  <script type="importmap">
  { "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"
  } }
  </script>
  <script type="module">
    import * as THREE from "three";
  </script>
  ```
  Autres bibliothèques possibles de la même façon (ex. un moteur physique) si elles
  font un vrai travail. CDN autorisés pour les scripts : cdnjs.cloudflare.com,
  cdn.jsdelivr.net/npm, unpkg.com. Toujours une version exacte, jamais `@latest`.
  Polices : Google Fonts uniquement.

## Exception : jeu à plusieurs du Domaine des Pins

Accord du propriétaire pour ce seul jeu : `pins/index.html` peut se connecter
à un relais WebSocket hébergé sur Cloudflare (code dans `serveur/pins-relais/`).
- Le jeu reste entièrement jouable seul, sans réseau ; le relais ne sert qu'au mode « À plusieurs ».
- Aucune donnée personnelle : pas de prénom, pas de compte, chaque joueur est un animal.
  Le relais ne stocke rien et n'a pas de journaux.
- Messages en liste fermée uniquement (numéros de `PHRASES`) : jamais de texte libre.
  Si on change la liste, garder `NB_PHRASES` du relais identique au nombre de phrases.
- L'adresse du relais se règle dans `RELAIS_PROD` du jeu ; déploiement : `serveur/pins-relais/DEPLOIEMENT.md`.
- Aucun autre jeu ne doit utiliser le réseau.

## Exception : Le Domaine des Pins en application (PWA)

Accord du propriétaire : le jeu vit dans `pins/` pour avoir sa propre adresse
(https://gbillois.github.io/ABCDEMO/pins/) et s'installer sur l'écran d'accueil.
- `pins/index.html` est le jeu (le modifier lui, pas `jeux/le-domaine-des-pins.html`,
  qui ne fait que rediriger les anciens liens vers `../pins/`).
- `pins/manifest.webmanifest` : nom, icônes, plein écran.
- `pins/sw.js` : garde le jeu sur l'appareil (hors ligne en solo). Le jeu ne change que
  lorsqu'on appuie sur « Mettre à jour » sur son écran d'accueil : penser à le dire à
  l'utilisateur après une modification. Si on ajoute un module three.js, l'ajouter à `FICHIERS`.
- Icônes : fichiers PNG (obligatoires pour une application), générés à partir de
  `pins/icone.svg`, lui-même dessiné en code. Pas d'image téléchargée.
- Dans l'application installée, les liens vers le site des jeux (classe `site`) sont cachés.

## Publication

Les pages sont servies à deux endroits :
- **GitHub Pages** : https://gbillois.github.io/ABCDEMO/ (branche `main`).
- **Artefact claude.ai** : https://claude.ai/artifact/Rdck8jNSJYTvgeizMot8QG
  (republier avec `url` = ce lien pour garder l'adresse ; les jeux passent par `files`,
  `"jeux/<nom>.html": "jeux/<nom>.html"`).

Contraintes communes :
- `index.html` n'a pas de `<!doctype>`/`<html>`/`<head>` (squelette ajouté par l'artefact),
  mais garde `<meta charset>` et `<meta name="viewport">` en haut pour GitHub Pages.
  Chaque jeu est une page complète avec `<!doctype html>`, charset, viewport et styles de base.
- Aucune requête réseau à l'exécution hors scripts des CDN ci-dessus (fetch, images,
  sons externes sont bloqués dans l'artefact). `alert`/`confirm`/`prompt` ne s'affichent pas :
  faire ses propres écrans.
- Meilleurs scores : `localStorage`, toujours dans un `try/catch` (peut être indisponible).
- Chaque jeu a un bouton retour vers l'accueil (`../index.html`).

## Git

À chaque modification (autorisation explicite du propriétaire) : commit, push sur la branche
de travail **et sur `main`** pour mettre à jour GitHub Pages, puis republier l'artefact.

## Ajouter un jeu

1. Créer `jeux/<nom>.html`.
2. Ajouter une entrée dans le tableau `JEUX` de `index.html`
   (`titre`, `description`, `icone`, `fichier`, `couleur` c1…c6).
3. Commit, push (branche + `main`), republier l'artefact (accueil + `files` du jeu).

## Jouabilité

- Jouable à la souris/clavier **et** au tactile (tablette, téléphone) : commandes à l'écran
  si besoin.
- Écran titre avec règles courtes en français, bouton Pause, bouton Rejouer.
- Textes simples, adaptés à un enfant.
