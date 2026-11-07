# Les jeux de Théo — règles du dépôt

Ce dépôt est un bac à sable de jeux pour Théo. Ne faire aucune action sur un autre dépôt.

Structure :
- `index.html` — page d'accueil (étagère de cartouches, un bouton par jeu).
- `jeux/<nom>.html` — un fichier par jeu.
- `pins/` — Le Domaine des Pins, en application installable (voir plus bas).
- `dragonflyer/` — DragonFlyer, en application installable (voir plus bas).
- `lueurs/` — Les Trois Lueurs, démo faite avec le moteur Luminati (voir plus bas) ; fabriquée par `outils/lumina/`.
- `balade/` — La Balade de Millépoques, une ville de Millépoques en 2,5D avec le moteur Luminati (voir plus bas) ; fabriquée par `outils/balade/`.
- `village/` — Le Village de Millépoques, un village de Millépoques en vraie 3D (three.js) ; ses images sont cuites par `outils/village/`.
- `monde/` — My World Explorer, le globe terrestre, en application installable (voir plus bas) ; ses cartes sont faites par `outils/monde/`.
- `blender/pins/` — scripts Blender qui fabriquent les modèles du Domaine des Pins (`pins/assets/*.glb`) ; méthode : `blender/pins/METHODE.md`.
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
- Modèles 3D faits par Blender (accord du propriétaire, novembre 2026) : `pins/assets/*.glb` (le cottage d'abord), fabriqués
  par les scripts de `blender/pins/` selon `blender/pins/METHODE.md` (étages matières → kit → un objet à la fois → implantation,
  contrôle par un second agent jusqu'à 8/10 ; marche à suivre : compétence `modele-3d-pins`). Lus depuis le même site, gardés hors
  ligne par `sw.js` (`FICHIERS`) ; sans le fichier, le jeu garde l'ancien modèle dessiné en code.
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
  Pour fabriquer un modèle 3D, suivre la méthode de `CONCEPTION.md` (§ 7 bis : étages matières → kit → un objet à la fois,
  et contrôle qualité des rendus par un second agent séparé, jusqu'à 8/10).
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
Même accord pour les arbres et la petite nature (`dragonflyer/assets/arbres*`, `nature*`) : « Stylized Nature MegaKit » de Quaternius (CC0),
préparés par `blender/dragonflyer/arbres.py` et `nature.py`, couleurs adaptées à la palette du jeu. Toute nouvelle ressource externe doit être CC0
et retravaillée au style du jeu.
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

## Exception : My World Explorer (globe terrestre en PWA)

Accord du propriétaire (novembre 2026) : le globe vit dans `monde/` (https://gbillois.github.io/ABCDEMO/monde/), en application
installable comme le Domaine des Pins (`manifest.webmanifest`, `sw.js`, bouton « Mettre à jour » sur l'écran titre et dans les réglages,
`window.MONDE_VERSION` à changer à chaque modification ; penser à dire d'appuyer sur « Mettre à jour »).
- Données géographiques du **domaine public** (Natural Earth, relief ETOPO 2022 de la NOAA, CC0) : ce ne sont pas des images téléchargées
  mais des mesures (altitudes, contours, noms). Les cartes `monde/donnees/` sont calculées par `outils/monde/fabriquer.py`
  (couleurs des paysages peintes par le script, d'après `zones.py`) ; sources dans `outils/monde/README.md`.
- Lues depuis le même site, gardées hors ligne par `sw.js` (`FICHIERS`). Pas de réseau à l'exécution, pas de serveur.
- Textes en français, programme de géographie du CM1/CM2 (continents, océans, repères, pays, France).
- Détail : la carte du monde (4096 × 2048) plus, autour de l'endroit regardé, une fenêtre de 4 × 4 tuiles fines (`donnees/tuiles/`,
  1 minute d'angle, faites par `outils/monde/tuiles.py`), chargées et gardées au fur et à mesure. Zoom limité (`DMIN`) : pas de vue au ras du sol.
  Les montagnes reçoivent en plus des crêtes et ravines dessinées par le shader (`detailH`), dans la forme et dans l'éclairage.
  Style voulu : jeu vidéo (pas de photos aériennes), reflets du soleil discrets.
- Deux vues dans les réglages : Globe (3D, survol au style de DragonFlyer) et Planisphère (la même carte à plat). Pas d'objets au sol
  (demande du propriétaire) : seulement des textures (motifs de champs, forêts, dunes dessinés par le shader d'après `sols.png`).
- Au premier lancement : « Où habites-tu ? » (France en premier) ; le pays est gardé (`monde:reglages`) et choisit le tracé
  des frontières disputées (`donnees/frontieres.json`, fait par `outils/monde/frontieres.py`). Droits : `monde/LICENCES.md`.

## Exception : Les Trois Lueurs (moteur Luminati)

Demande du propriétaire (novembre 2026) : une démo faite avec le moteur 2.5D **Luminati**
(https://gitlab.com/stubborn-hug/lumina, licence MIT, three.js r186, tout est dessiné et synthétisé par le code),
dans le style des aventures 16 bits vues de dessus (images d'inspiration fournies, jamais recopiées).
- `lueurs/index.html` : page de lancement (règles, commandes, bouton Accueil). `lueurs/jeu/` : le jeu **compilé**
  (Vite) — ne pas le modifier à la main : tout se refait avec `bash outils/lumina/fabriquer.sh`.
- `outils/lumina/` : le commit du moteur utilisé (`COMMIT` dans `fabriquer.sh`), nos retouches au moteur
  (`moteur/luminati.patch` : le français, et un style « retro » — gros pixels, couleurs vives — que le jeu n'utilise pas :
  à la demande du propriétaire, le jeu garde le style « diorama » normal du moteur et sa caméra ; `?look=retro` pour l'essayer ; `moteur/fr.js` : l'interface en français ; `moteur/tactile.js` : joystick et boutons pour tablette,
  bouton Accueil), et la campagne (`make-trois-lueurs.mjs` : trois niveaux, trois styles — prés verts, gorges d'ocre
  au climat aride, marais des brumes au crépuscule — et l'histoire des trois lueurs).
- Le jeu lit ses niveaux (`lueurs/jeu/campaigns/`) depuis le même site : il marche sur GitHub Pages, pas dans l'artefact.
  Les polices viennent de Google Fonts (sinon des copies locales). Pas d'autre réseau. Licence : `lueurs/jeu/LICENCE-Luminati.txt`.
- Sauvegarde : celle du moteur (`localStorage`), « Nouvelle partie » recommence.

## Exception : La Balade de Millépoques (dessins de Millépoques, moteur Luminati)

Demande du propriétaire (novembre 2026) : se promener à pied, en 2,5D, dans un village de **Millépoques**, son jeu
(dépôt privé `gbillois/Millepoques`, tous droits réservés, lu seulement avec son accord, jamais modifié). Exploration seule, pas d'histoire.
- Les images (`balade/ville/`) ne sont pas redessinées : elles sont « cuites » par le code de rendu de Millépoques lui-même
  (`outils/balade/cuisson/`, Playwright) à partir d'une sauvegarde (`outils/balade/ville-theo.json`, sans le profil scolaire de l'enfant) :
  le sol en morceaux, les bâtiments, arbres, drapeaux, bateaux, animaux et habitants en planches, la carte. Ce sont des fichiers servis par le site.
- `balade/jeu/` : le jeu **compilé** (Vite) — ne pas le modifier à la main : `bash outils/balade/fabriquer.sh`. Le moteur est celui des Trois Lueurs
  (même commit, même français) plus `outils/balade/moteur/` (`Balade.js` : la ville posée en panneaux debout, les bâtiments en volume — leur silhouette étirée vers l'arrière —,
  Millie pour héroïne, sans flou ni éclairage étrange, caméra fixe vers le nord ; `balade.patch` ; `tactile.js`).
- Le jeu lit `balade/ville/` depuis le même site : il marche sur GitHub Pages, pas dans l'artefact. Pas d'autre réseau. Musique du moteur (synthétisée).

## Exception : Le Village de Millépoques (dessins de Millépoques, vraie 3D)

Demande du propriétaire (novembre 2026) : se promener en vraie 3D dans un village de **Millépoques** (dépôt privé
`gbillois/Millepoques`, lu seulement avec son accord, jamais modifié), le plus près possible de son style : marcher entre les
maisons, croiser les habitants, entrer dans les bâtiments pour voir comment on y travaille.
- Comme pour la Balade, rien n'est redessiné : les images de `village/donnees/` sont « cuites » par le code de rendu de Millépoques
  (`outils/village/cuisson/`, Playwright) à partir d'une sauvegarde sans le profil de l'enfant (`outils/village/ville.json`, partie
  Renaissance du 24 octobre 2026). Le serveur de cuisson espionne en mémoire les fonctions de toits de Millépoques (bas des toits =
  hauteur des murs), sans toucher au dépôt.
- `village/index.html` + `village/jeu.js` (+ `relief.js`, `gens.js`) : le jeu (three.js 0.170 du CDN). Le sol suit le relief de la carte
  de Millépoques (montagnes, lits des rivières, eau animée) ; les ponts sont en 3D. Les bâtiments sont des volumes taillés dans la
  silhouette de leur dessin, la façade de Millépoques projetée dessus (toits de dos et pignons : couvertures et murs dessinés par
  ses fonctions) ; arbres, animaux et drapeaux sont des images debout ; Millie et les habitants sont en 3D (visage dessiné par
  Millépoques, tenue et chapeau du jeu, marche animée) ; soleil et ombres portées ; dedans, les murs sont dessinés par les fonctions de Millépoques et les ouvriers font leurs gestes du jeu (images de
  `donnees/travail/`), avec le nom, l'explication (`info`) et la recette du bâtiment tirés des données de Millépoques.
- Le jeu lit `donnees/` depuis le même site : il marche sur GitHub Pages, pas dans l'artefact. Pas d'autre réseau. Sons synthétisés.
- Refaire : `node outils/village/cuisson/cuire.mjs <dépôt Millepoques> outils/village/ville.json village/donnees` (voir `outils/village/README.md`).

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
