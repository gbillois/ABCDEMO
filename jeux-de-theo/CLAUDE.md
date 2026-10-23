# Les jeux de Théo — règles du dossier

Bac à sable de jeux pour Théo. Tout ce qui concerne les jeux vit dans `jeux-de-theo/` ;
ne pas toucher à l'appli MagicSlider à la racine du dépôt.

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

## Contraintes de publication (artefact claude.ai)

L'accueil `index.html` est publié comme artefact :
https://claude.ai/artifact/Rdck8jNSJYTvgeizMot8QG

- Les jeux sont publiés au même lien via `files` (`"jeux/<nom>.html": "jeux-de-theo/jeux/<nom>.html"`).
- `index.html` n'a pas de `<!doctype>`/`<html>`/`<head>` (le squelette est ajouté à la
  publication). Chaque jeu, lui, est une page complète avec `<!doctype html>`, charset,
  viewport et styles de base.
- Aucune requête réseau à l'exécution hors scripts des CDN ci-dessus (fetch, images,
  sons externes sont bloqués). `alert`/`confirm`/`prompt` ne s'affichent pas : faire ses
  propres écrans.
- Meilleurs scores : `localStorage`, toujours dans un `try/catch` (peut être indisponible).
- Chaque jeu a un bouton retour vers l'accueil (`../index.html`).

## Git et GitHub Pages

À chaque modification (autorisation explicite du propriétaire) : commit, push sur la branche
de travail **et sur `main`** (fast-forward / merge), pour mettre à jour GitHub Pages :
https://gbillois.github.io/ABCDEMO/jeux-de-theo/ — et republier l'artefact.

Les pages sont donc servies à la fois en artefact et par GitHub Pages : garder
`<meta charset>` et `<meta name="viewport">` en haut de `index.html`.

## Ajouter un jeu

1. Créer `jeux/<nom>.html`.
2. Ajouter une entrée dans le tableau `JEUX` de `index.html`
   (`titre`, `description`, `icone`, `fichier`, `couleur` c1…c6).
3. Republier l'artefact (accueil + `files` du jeu), puis commit et push.

## Jouabilité

- Jouable à la souris/clavier **et** au tactile (tablette, téléphone) : commandes à l'écran
  si besoin.
- Écran titre avec règles courtes en français, bouton Pause, bouton Rejouer.
- Textes simples, adaptés à un enfant.
