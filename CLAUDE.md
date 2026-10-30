# Les jeux de Théo — règles du dépôt

Ce dépôt est un bac à sable de jeux pour Théo. Ne faire aucune action sur un autre dépôt.

Structure :
- `index.html` — page d'accueil (étagère de cartouches, un bouton par jeu).
- `jeux/<nom>.html` — un fichier par jeu.
- `pins/` — Le Domaine des Pins, en application installable (voir plus bas).
- `dragonflyer/` — DragonFlyer, en application installable (voir plus bas).
- `blender/dragonflyer/` — scripts (Blender, numpy) qui fabriquent le dragon, le héros et le relief de DragonFlyer,
  embarqués en base64 dans `dragonflyer/index.html`, et le kit de village (`dragonflyer/assets/village.glb`) (voir le README du dossier).

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
- Pas de compte ni de vrai prénom demandé. À la connexion, chaque joueur peut choisir
  fille/garçon et un surnom facultatif (2 à 16 caractères), filtré côté client et relais.
  L'animal reste l'identité par défaut. Le profil et la tenue sont transmis aux autres
  joueurs de la salle, seulement en mémoire pendant la connexion. Le relais ne stocke
  rien sur disque et n'a pas de journaux. Une salle accueille au maximum 10 joueurs.
- Messages en liste fermée uniquement (numéros de `PHRASES`) : jamais de texte libre.
  La liste compte les phrases, puis les rendez-vous (lieux et numéros de cottages) : `NB_PHRASES`
  du relais (64) doit rester supérieur ou égal au nombre total de phrases.
- Se donner des objets : message `don` (numéro dans la liste fermée `DONS` du jeu : objets du sac, cadeaux de l'arcade, livres, maillots ; on ajoute à la fin de la liste)
  envoyé à un seul joueur de la salle, qui répond `merci` ; sans réponse, l'objet revient dans le sac. `NB_DONS` du relais (64)
  doit rester supérieur ou égal à la longueur de `DONS`.
- Seule exception au texte libre : le champ `pseudo` du message `profil`, court et filtré.
  Le sexe, la tenue et l'apparence (`look` : numéros dans les listes fermées du créateur de
  personnage, traits du visage compris ; bornes `LOOK_MAX` identiques dans le jeu et le relais) utilisent des listes fermées.
  Les personnages créés restent dans `localStorage` (6 au plus) ; le code de personnage
  (surnom + choix) se recopie à la main d'un appareil à l'autre, sans réseau. Le surnom et le sexe restent fixes
  pendant la connexion ; le maillot peut changer aux vestiaires et suit le personnage.
- Transfert d'une partie vers un autre appareil (comme dans Millepoques) : le même relais, chemin `/transfert/<6 chiffres>`.
  L'appareil qui envoie montre un code à 6 chiffres, l'autre le tape ; le relais passe les messages de l'un à l'autre
  sans rien écrire et coupe au bout de 10 minutes. La partie est chiffrée de bout en bout par le navigateur (ECDH P-256,
  HKDF salé par le code, AES-GCM) : le relais ne voit que des octets illisibles. Sans réseau, on passe par un fichier JSON.
- Le monde de la partie est celui de l'hôte (celui qui crée la salle) : message `monde` envoyé par lui seul,
  au plus une fois par seconde, avec seulement l'heure du jour (`h`, nombre de 0 à 1) et le thème (`th`, 0 ou 1).
  Le relais garde le dernier en mémoire pour les arrivants et l'oublie quand la salle se vide. Chaque invité garde
  son sac, son téléphone, son argent et ses quêtes, et retrouve son heure et son thème en partant.
- L'adresse du relais se règle dans `RELAIS_PROD` du jeu ; déploiement : `serveur/pins-relais/DEPLOIEMENT.md`.
- Aucun autre jeu ne doit utiliser le réseau (sauf l'Oracle du Grand Arbre et DragonFlyer, ci-dessous).

## Exception : l'Oracle des animaux du Grand Arbre

Accord du propriétaire pour ce seul jeu : `jeux/le-grand-arbre.html` peut appeler l'oracle,
un Worker Cloudflare avec Workers AI (code dans `serveur/arbre-oracle/`, sans clé d'API).
- L'enfant écrit un animal ; le Worker renvoie seulement une « recette » faite de choix dans des
  listes fermées (`RECETTE`, `EXTRAS`). L'animal est dessiné en code dans le jeu. Le texte libre
  du modèle n'est jamais renvoyé ni affiché.
- La partie commune (`RECETTE`, `nettoyerRecette`, `filtrerTexte`) est identique dans le jeu et
  le Worker (vérifié par `serveur/arbre-oracle/tests/`). Le texte de l'enfant est filtré des deux
  côtés (court, sans gros mots ni violence).
- Limiteurs : origine autorisée, 5 créations par minute et par adresse, quota par adresse et
  total par jour (`QUOTA_JOUR`, `QUOTA_ADRESSE_JOUR`), interrupteur `ACTIF`. Offre Workers Free :
  au-delà du gratuit, l'oracle s'endort, sans rien payer. Pas de journaux ; seul le total du jour
  est stocké.
- Le jeu reste jouable sans réseau : il crée alors l'animal avec les mots qu'il connaît
  (`recetteLocale`). Les animaux de l'enfant restent dans `localStorage` (6 au plus).
- L'adresse se règle dans `ORACLE_PROD` du jeu ; déploiement : `serveur/arbre-oracle/DEPLOIEMENT.md`.

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
- Version affichée dans Réglages → Plus : `window.PINS_VERSION` (en bas de `pins/index.html`), à changer à chaque modification.
- Parties : chaque partie a un numéro unique à 6 chiffres et un surnom (liste `pins-parties`, partie choisie `pins-active`).
  Dans le module du jeu, `localStorage` est remplacé par une version qui range les clés de la partie sous
  `pins@<numéro>:<clé>` ; seuls les réglages de l'appareil (`CLES_APPAREIL`) restent communs. L'export et le transfert
  envoient les parties cochées (format version 2 : `parties: [{ id, nom, donnees }]`).

## Exception : DragonFlyer en application (PWA)

Accord du propriétaire (octobre 2026) : DragonFlyer vit dans `dragonflyer/` (https://gbillois.github.io/ABCDEMO/dragonflyer/),
comme le Domaine des Pins (`manifest.webmanifest`, `sw.js`, bouton « Update » sur l'écran titre et dans les réglages).
- `jeux/dragonflyer.html` ne fait que rediriger vers `../dragonflyer/`.
- Les nouveaux modèles (kit de village…) sont des fichiers de `dragonflyer/assets/` faits par les scripts Blender,
  lus depuis le même site et gardés hors ligne par `sw.js` (`FICHIERS`). Conception du jeu : `dragonflyer/CONCEPTION.md`.
- Le jeu est en anglais (demande du propriétaire).
- L'icône et le blason (`icone-*.png`, `apple-touch-icon.png`, `blason.webp`) viennent d'une image fournie par le propriétaire.
- Nom affiché : « The Dragon Apprentice Chronicles » (sur l'écran d'accueil : « Dragon Apprentice ») ; le dossier reste `dragonflyer/`. Menus en grimoire : `ui-cuir.webp`, `ui-parchemin.webp`, `ui-gravure.webp`
  sont faits par les scripts `grimoire_*.py` de `blender/dragonflyer/` (à ajouter à `FICHIERS` de `sw.js` s'il y en a d'autres).
- `window.DRAGONFLYER_VERSION` (en bas de `dragonflyer/index.html`) est à changer à chaque modification ;
  penser à dire à l'utilisateur d'appuyer sur « Update ». Si on ajoute un module three.js, l'ajouter à `FICHIERS` de `sw.js`.
- Pour l'instant, le jeu n'est pas dans le menu des jeux (`index.html`), à la demande du propriétaire.

## Exception : animations des personnages de DragonFlyer

Accord du propriétaire (octobre 2026) : les mouvements du héros et des villageois (`dragonflyer/assets/animations.glb`)
viennent de « KayKit : Character Animations » de Kay Lousberg (CC0, usage commercial libre), transférés sur notre squelette
(commun : `blender/dragonflyer/squelette.py`) par `blender/dragonflyer/animations.py`. Seulement des mouvements calmes ;
aucun personnage de la bibliothèque. Nos personnages gardent leur style, avec des proportions inspirées de KayKit.
Source et licence dans `dragonflyer/assets/SOURCES.md` (à tenir à jour). Tout le reste reste fait maison.

## Exception : DragonFlyer à plusieurs et transfert de partie

Accord du propriétaire (octobre 2026) : `dragonflyer/index.html` peut se connecter à son relais WebSocket Cloudflare
(code dans `serveur/dragonflyer-relais/`, déploiement : `serveur/dragonflyer-relais/DEPLOIEMENT.md`), mêmes règles que
le Domaine des Pins (voir aussi `REGLES-JEUX.md`) :
- Le jeu reste entièrement jouable seul et sans réseau ; le relais ne sert qu'à « Together » et au transfert.
- Salle = code de 8 caractères, 8 joueurs au plus. Profil : surnom facultatif (2 à 16 caractères, filtre
  `filtrerSurnom` identique dans le jeu et le relais) et couleur du dragon (numéro de `COULEURS_DRAGON`).
- Messages en listes fermées seulement : positions bornées, numéros de `PHRASES` (`NB_PHRASES` du relais ≥ longueur).
- Rien n'est stocké sur disque, pas de journaux. Adresse dans `RELAIS_PROD`.
- Parties : numéro à 6 chiffres et nom du cavalier (`dragonflyer:parties`, `dragonflyer:active`) ; données sous
  `dragonflyer@<numéro>:<clé>`, réglages de l'appareil dans `CLES_APPAREIL`. Export/import en JSON
  (`{ jeu: "dragonflyer", version: 1, parties: [{ id, nom, maj, donnees }] }`) et transfert chiffré
  (`/transfert/<6 chiffres>`, ECDH P-256, HKDF salé par le code, AES-GCM, 10 minutes).
- Tests : `node --test serveur/dragonflyer-relais/tests/relais.test.mjs`.

## Exception : sons enregistrés du Domaine des Pins

Accord du propriétaire (octobre 2026) pour ce seul jeu : `pins/sons/` contient des fichiers MP3.
- `foret.mp3` et `oiseau-*.mp3` viennent du dépôt TheNewLearners du propriétaire (ambiances, lecture seule) ;
  `piscine.mp3` (ambiance de l'Aquaparc), `magasin.mp3` (musique des magasins), `accueil.mp3` (musique de l'accueil) et `manoir.mp3` (musique d'Halloween du manoir hanté) sont générés avec ElevenLabs.
- `boum.mp3` (pool party de l'Aquaparc, « Big Bump Dive »), `chanteur.mp3` (chanteur de la salle des fêtes, « Haven by the Hearth ») , `pedalo.mp3` (sur le pédalo, « Paddlewheel Panic »), `arcade.mp3` (salle de jeux vidéo), `depart.mp3` (écran de départ, « Steps Along the Mossy Trail »), `multiparc.mp3` (salle de jeux du Multi Parcs, « Midday at the Cove ») et les `j-*.mp3` (enceinte)
  sont fournis par le propriétaire ; `anniversaire.mp3` et `anniv-foule.mp3` (salles d'anniversaire) sont en CC0 ;
  la source et la licence de chaque fichier sont dans `pins/sons/SOURCES.md` (à tenir à jour). Les morceaux longs sont réencodés en mono 32 kHz (moins de mémoire sur iPad). L'enceinte des cottages fait écouter toutes les musiques.
- Ils sont chargés après le premier toucher, depuis le même site (pas d'autre serveur), et gardés hors ligne
  par `pins/sw.js` (liste `FICHIERS`). Sans eux, le jeu garde ses sons faits maison.
- Les autres jeux restent entièrement synthétisés (Web Audio API).

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

## Règles habituelles du propriétaire

Avant de créer ou de modifier un jeu, lire `REGLES-JEUX.md` (organisation des menus, sauvegardes, jeu à plusieurs,
applications installables, manette, mesures de performance).

## Fluidité des jeux 3D

Avant de créer ou modifier un jeu 3D, lire `OPTIMISATION-3D.md` (principes : rien ne se fabrique
pendant qu'on joue, peu d'appels de dessin, intérieurs cachés de loin, mesurer avant et après).

## Jouabilité

- Jouable à la souris/clavier **et** au tactile (tablette, téléphone) : commandes à l'écran
  si besoin.
- Écran titre avec règles courtes en français, bouton Pause, bouton Rejouer.
- Textes simples, adaptés à un enfant.
