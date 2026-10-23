# Les jeux de Théo — règles du dépôt

Ce dépôt est un bac à sable de jeux pour Théo. Ne faire aucune action sur un autre dépôt.

Structure :
- `index.html` — page d'accueil (étagère de cartouches, un bouton par jeu).
- `jeux/<nom>.html` — un fichier par jeu.

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
