# Règles habituelles des jeux de Théo

Ce que le propriétaire applique d'un jeu à l'autre (Domaine des Pins, The Dragon Learner Chronicles…).
À relire avant de créer ou de modifier un jeu. Les règles techniques du dépôt restent dans `CLAUDE.md`.

## 1. Publication et versions

- Chaque modification : commit, push sur la branche de travail **et** sur `main` (GitHub Pages), puis republier l'artefact.
- Un gros jeu devient une **application installable** (PWA) dans son propre dossier : `manifest.webmanifest`, `sw.js`
  (cache d'abord, le jeu marche hors ligne), icônes PNG, nom court lisible sur l'écran d'accueil (13 caractères au plus).
- Le jeu ne change que lorsqu'on appuie sur **« Update »** (écran titre et réglages). Un numéro de version
  (`window.<JEU>_VERSION`) change à chaque modification ; toujours rappeler à l'utilisateur d'appuyer sur « Update ».
- Tout fichier ajouté (texture, module three.js, son) va dans la liste `FICHIERS` du service worker.
- L'ancien lien `jeux/<nom>.html` ne fait que rediriger vers le dossier de l'application.

## 2. Organisation des menus

- **Peu de texte, des images.** Icônes dessinées (SVG gravé, jamais d'émojis), titres courts, une idée par bouton.
- **Écran titre** : le blason, le titre, un gros bouton « Jouer », puis une rangée de médaillons ronds
  (parties, jouer à plusieurs, réglages, mise à jour, accueil du site). Le nom de la partie choisie est rappelé.
- **Pause** : 4 ou 5 grands boutons au plus (Reprendre, Quêtes, Carte, Ensemble, Réglages), et les actions rares
  en petits médaillons en bas (revenir au départ, parties, accueil).
- **Réglages en onglets** (médaillon + nom) : Son, Caméra, Image, Commandes. Deux à quatre lignes par onglet ;
  le livre garde la même taille d'un onglet à l'autre.
- Chaque sous-menu a une **croix** en haut à droite. Un sous-menu ouvert depuis la Pause **revient à la Pause**.
- Le **haut de l'écran** reste dégagé et sous la barre d'état du téléphone (`safe-area-inset-top` + marge) :
  l'objectif à gauche **seulement si une quête est lancée**, Pause et mini-carte à droite. Le reste est dans la Pause.
- Le panneau de performances est un réglage (masqué par défaut), placé sous les objectifs.
- Style des menus d'un jeu médiéval : livre relié de cuir, page de parchemin, cadre gravé, plaques à bouts roulés,
  médaillons de bronze, sceau de cire pour le bouton principal. Pas de gemmes « plastiques ».
- Pas d'`alert`/`confirm`/`prompt` : nos propres écrans ; une action qui efface demande un second appui.

## 3. Sauvegardes (« parties »)

- Plusieurs **parties** par appareil. Chacune a un **numéro unique à 6 chiffres** et un **nom** (le prénom du héros,
  filtré comme un surnom). Liste dans `<jeu>:parties`, partie choisie dans `<jeu>:active`.
- Les données d'une partie sont rangées sous `<jeu>@<numéro>:<clé>` ; les **réglages de l'appareil** (qualité,
  son, caméra, surnom en ligne…) restent communs, dans une liste `CLES_APPAREIL`.
- La partie se garde **toute seule** : régulièrement (toutes les 10 s en jeu), à la pause, quand on quitte l'appli.
  Au retour, on reprend où on était (« Welcome back »).
- Écran « parties » en deux onglets :
  - **Liste** : choisir une partie (le jeu redémarre dessus), en créer une avec un nom, en effacer une (deux appuis).
  - **Partager** : cocher les parties, puis
    - **Fichier** : export JSON (`{ jeu, version, date, parties: [{ id, nom, maj, donnees }] }`) par la feuille de partage
      sur tablette ou téléchargement ; import qui vérifie tout (clés connues, tailles, nom filtré) avant « Charger » ;
    - **Transfert direct** : l'appareil qui envoie montre un code à 6 chiffres, l'autre le tape. Relais Cloudflare
      `/transfert/<code>`, chiffrement de bout en bout par le navigateur (ECDH P-256, HKDF salé par le code, AES-GCM),
      10 minutes au plus, le relais ne voit que des octets illisibles.
  - Une partie reçue avec le même numéro remplace l'ancienne ; on montre ce qu'on va charger avant de le faire.
- Attention iPhone/iPad : supprimer l'icône de l'écran d'accueil efface les parties ; exporter d'abord.

## 4. Jeu à plusieurs

- Toujours **jouable seul et sans réseau** ; le réseau ne sert qu'au mode à plusieurs et au transfert.
- Un **Cloudflare Worker + Durable Object** par jeu (`serveur/<jeu>-relais/`), offre gratuite, `ORIGINES` limité au
  site, **pas de journaux, rien sur disque**, salle en mémoire qui disparaît quand elle est vide.
- **Salle = code de 8 caractères** (`ABCDEFGHJKMNPQRSTUVWXYZ23456789`), créée par un joueur, rejointe par les autres ;
  nombre de joueurs limité (8 à 10).
- **Pas de compte, pas de vrai prénom.** Surnom facultatif de 2 à 16 caractères, filtré par la **même fonction**
  `filtrerSurnom` dans le jeu et le relais (vérifié par un test).
- **Listes fermées uniquement** : phrases (`PHRASES`, numéros), objets, couleurs, apparence ; le relais vérifie les
  bornes (`NB_PHRASES`…) et le débit (positions 15/s, une phrase toutes les 1,5 s). Jamais de texte libre.
- Le monde partagé est celui de l'hôte (celui qui crée la salle) quand il y en a un (heure, thème).
- Les autres joueurs sont préparés à l'avance (pas de création d'objets 3D pendant qu'on joue), interpolés,
  visibles sur la mini-carte, avec leur surnom au-dessus de la tête.
- Un `DEPLOIEMENT.md` contient le prompt complet à donner à une IA qui gère Cloudflare, avec les tests.
- Tests du relais avec `node --test` (filtre identique, listes fermées, bornes, débit, transfert).

## 5. Commandes

- Clavier/souris **et** tactile (joystick virtuel qui apparaît sous le doigt, boutons ronds à droite) **et**
  manette Bluetooth (sticks analogiques en jeu, croix + A/B dans les menus, `window.MANETTE`).
- Glisser pour tourner la caméra, bouton pour la recentrer ; recul et suivi de la caméra dans les réglages.

## 6. Images, sons, langue

- Images et modèles faits maison (code, Blender en script, numpy), sauf les images fournies par le propriétaire.
- Sons synthétisés (Web Audio) ; fichiers audio seulement avec l'accord écrit dans `CLAUDE.md`.
- Langue : français pour les jeux de Théo, **anglais** pour The Dragon Learner Chronicles (demande du propriétaire).
- Textes simples pour un enfant ; jeux éducatifs : défis de calcul, de logique, de langue intégrés au jeu.

## 7. Performances

- Lire `OPTIMISATION-3D.md`. Mesurer avant et après.
- Qualité réglable (Ultra / High / Medium / Fast), résolution qui baisse toute seule si l'appareil peine.
- **Journal des performances** dans les réglages (« Perf log » : Record puis Save) : une mesure par seconde
  (fps, temps d'image moyen, 95e centile, pire, appels de dessin, triangles, résolution, mode) avec l'appareil et la
  carte graphique, enregistré en JSON pour être transmis. `?perflog` le démarre à l'ouverture, `?fps` montre le panneau.
