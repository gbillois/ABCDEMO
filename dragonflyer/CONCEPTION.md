# The Dragon Apprentice Chronicles — document de conception

Un jeu d'aventure en monde ouvert, à la profondeur d'un *Zelda : Ocarina of Time*, dans l'archipel déjà construit,
avec l'ambiance des films *Dragons* (Vikings, dresseurs, dragons attachants) et un fil éducatif : le héros devient
dresseur **en apprenant** (calcul, logique, langues). Textes du jeu en anglais ; ce document est en français.
Les règles communes (menus, sauvegardes, jeu à plusieurs, PWA) sont dans `REGLES-JEUX.md`.

---

## 1. Piliers

1. **Explorer** un archipel magnifique, à dos de dragon et à pied : chaque île cache quelque chose.
2. **Dresser** des dragons d'espèces différentes, les soigner, les connaître (encyclopédie).
3. **Apprendre** : chaque grande porte du jeu s'ouvre avec une idée (un calcul, un raisonnement, un mot).
   Les défis sont des **énigmes du monde** (blocs, balances, cadrans, runes) ou des **pages du grimoire**.
4. **Grandir** : le scénario avance avec ce que le héros sait faire ; rien n'est punitif, tout se réessaie.

## 2. Histoire

**Le héros** (nom choisi par le joueur, apprenti de 12 ans) vit à **Mistholm**, le village des dresseurs.
**Runa**, la vieille maîtresse des dragons, le prend comme apprenti le jour où un jeune dragon bleu (le nôtre)
le choisit.

**La menace** : la **Brume Grise** monte de la mer. Les dragons qu'elle touche oublient tout et deviennent sauvages.
Une légende dit que les premiers dresseurs l'avaient repoussée avec les **quatre Pierres du Savoir**, cachées par
eux dans l'archipel, chacune gardée par une épreuve d'esprit :

| Pierre | Domaine | Lieu | Objet gagné |
|---|---|---|---|
| Pierre des **Nombres** | calcul, mesures, suites | **Caverne des Braises** (volcan du nord) | **l'Épée de Braise** |
| Pierre de la **Logique** | déduction, ordre, motifs | **Caverne des Marées** (falaises de l'ouest, à marée basse) | **le Bouclier de Corail** |
| Pierre des **Mots** | langues, runes, lecture | **Tour des Runes** (île aux falaises) | **le Cor des Vents** (appelle les dragons) |
| Pierre des **Étoiles** | temps, ciel, nature | **Observatoire du phare** (la nuit seulement) | **la Lanterne d'Aube** (dissipe la brume) |

**Actes**
1. **L'apprenti** (Mistholm et environs) : premier vol, soins du dragon, apprendre les commandes en jouant,
   premières petites énigmes au village (compter les moutons, peser le poisson au marché, lire l'affiche).
   Fin : la brume avale le phare ; Runa raconte la légende.
2. **Les deux cavernes** (ordre libre) : épée puis bouclier, ou l'inverse. Chaque caverne : 3 salles d'énigmes,
   un gardien (dragon sauvage à calmer, pas à tuer), un trésor. L'épée coupe les ronces de brume ;
   le bouclier renvoie les rayons et protège des souffles.
3. **Les dresseurs perdus** : trois villages à aider (la brume a touché leurs dragons). On calme et on **dresse**
   de nouvelles espèces, on remplit l'encyclopédie, on gagne le **Cor des Vents** à la Tour des Runes.
4. **L'aube** : la nuit, à l'observatoire, on aligne les étoiles ; la Lanterne d'Aube permet d'entrer dans le
   **Cœur de la Brume**, où dort le **Dragon Ancien**. Le final n'est pas un combat : on lui rend la mémoire en
   résolvant une dernière grande énigme qui reprend les quatre savoirs. La brume se lève, les dragons reviennent.

Après la fin : l'archipel reste ouvert (quêtes secondaires, défis du jour, dragons rares, courses, jeu à plusieurs).

## 3. Le monde

- **Mistholm** (village principal) : port, marché, forge (améliorations), écurie à dragons (changer de dragon),
  maison de Runa (le grimoire), la maison du héros (lit = sauvegarde, coffre), place avec l'arène de dressage.
- **Trois autres villages** aux styles différents : **Fernhollow** (champs, moulin, maisons à colombages),
  **Saltcliff** (village de pêcheurs sur pilotis, plages), **Stonebrook** (village de montagne en pierre).
- **Paysages** : plages de sable et de galets, champs cultivés (blé, choux), prairies à moutons, forêts de pins,
  falaises à oiseaux, cascades, lac, volcan endormi, îlots sauvages, épaves, ruines anciennes, nids de dragons.
- **Vie** : cycle **jour/nuit** (lanternes, fenêtres éclairées, étoiles, lucioles), météo (pluie légère, brume),
  **villageois** avec des journées (marché le matin, maison le soir), **animaux** (moutons, chèvres, poules, cerfs,
  mouettes, poissons, dauphins), **dragons sauvages** qui volent en groupe dans le ciel ou dorment sur les sommets.
- **Maisons visitables** : on entre par la porte (fondu), intérieur meublé (âtre, table, lits, étagères, tonneaux),
  habitants dedans le soir. Collisions avec les maisons, clôtures, rochers, arbres.

## 4. Ce qu'on fait

**En vol** : voler, piquer, souffler le feu, se poser, pêcher, transporter (paniers, poissons, pierres),
courses d'anneaux, allumer les feux d'alerte. **À pied** : marcher, courir, sauter, parler, ouvrir,
pousser des blocs, tirer des leviers, nager un peu ; plus tard **épée** (couper, frapper les cristaux),
**bouclier** (renvoyer, se protéger), **cor** (appeler / calmer).

**Ennemis** (jamais cruels) : les **feux follets** de la Brume Grise rôdent dans la nature (plus nombreux la nuit) ;
les **rampants de braise** gardent les cavernes. Un coup d'épée ou le feu du dragon les dissout ou les renvoie dans la lave.
Le héros a trois cœurs ; s'il les perd, il se réveille à l'abri, sans rien perdre. Les cœurs reviennent seuls.

**Dresser un dragon** (inspiré des « livres de dragons » des films, espèces originales) :
1. **Observer** (le trouver, lire sa page d'encyclopédie, comprendre ce qu'il aime) ;
2. **Approcher** (nourriture qu'il aime, calme, mains vides, petite énigme de rythme) ;
3. **Gagner sa confiance** (une épreuve liée à son caractère : course, motif de lumière, calcul de nourriture) ;
4. **Voler ensemble** : il rejoint l'écurie ; chaque espèce a ses qualités et ses défauts.

## 5. Défis éducatifs

- **Deux formes** : *dans le monde* (comme les énigmes de Zelda) ou *dans le grimoire* (fenêtre parchemin).
- **Nombres** : calcul mental (additions → multiplications), poids et balances, monnaie au marché, mesures,
  suites (rythme de dalles), fractions de gâteau / de cercle (cadrans), coordonnées sur la carte.
- **Logique** : interrupteurs et portes, blocs à pousser (Sokoban), miroirs et rayons, ordre et déduction
  (« le dragon rouge n'est pas à côté du bleu »), motifs, pesées, labyrinthes.
- **Mots** : runes qui sont des lettres (alphabet à découvrir), mots anglais et français (images ↔ mots),
  épeler pour ouvrir une porte, lire une consigne, phrases à remettre en ordre.
- **Étoiles et nature** : lire l'heure (cadran solaire), saisons, constellations, chaîne alimentaire des dragons.
- **Niveau qui s'adapte** : trois niveaux par compétence ; on monte après des réussites, on redescend après
  des erreurs, sans le dire ; indices progressifs (Runa, puis le dragon), jamais de « perdu ».
- Un **carnet de progrès** (dans la Pause) montre ce que le héros sait faire.

## 6. Les dragons (espèces originales)

| Espèce | Classe | Qualités | Où |
|---|---|---|---|
| **Skyfin** (le nôtre) | Vent | équilibré, rapide | Mistholm |
| **Emberback** | Feu | souffle puissant, lent | volcan |
| **Tidewhisker** | Mer | nage, plonge, pêche | Saltcliff |
| **Mossclaw** | Forêt | discret, soigne les plantes | forêts |
| **Frostmane** | Glace | gèle l'eau (ponts de glace) | sommets |
| **Glimmerwing** | Lumière | éclaire la nuit, petit | lucioles du lac |
| **Stonehide** | Roche | casse les rochers, robuste | Stonebrook |
| **Duskglider** | Ombre (rare) | très rapide, invisible la nuit | Cœur de la Brume |

**Encyclopédie** (« Dragon Manual ») : livre relié, une double page par espèce : gravure tirée du modèle Blender
(traits + hachures, comme la gravure du menu), jauges (vitesse, feu, armure, discrétion, endurance), ce qu'il aime,
où le trouver, comment le dresser, notes du héros qui se remplissent en jouant.

## 7. Direction artistique

- Rendu **stylisé et lumineux** façon *Oceanhorn* / *Zelda Wind Waker* plus riche : formes douces, couleurs franches,
  lumière chaude, contours légers sur les personnages, eau turquoise, ciel peint.
- Tout est fabriqué **en Blender par script** (kits modulaires de maisons : soubassement en pierre, colombages,
  toits de chaume ou de bardeaux, portes, fenêtres, cheminées ; meubles ; objets ; dragons ; personnages),
  en s'inspirant des modèles médiévaux libres de droits sans les copier, cuisson de textures (couleur, occlusion).
- Animations « à la main » en code (principes des animateurs : anticipation, chevauchement, rebond, arcs),
  cycles de marche, vol, idle vivants.

## 8. Technique

- Garder `dragonflyer/` (PWA). Les modèles sortent de `index.html` pour devenir des fichiers (`assets/*.glb`,
  compressés meshopt, textures webp) gardés hors ligne par `sw.js` et **chargés au fil de l'exploration**.
- **Collisions** : formes simples (boîtes, cylindres) fabriquées avec les modèles ; grille d'accélération.
- **Intérieurs** : petites scènes séparées sous le monde, chargées en entrant (fondu au noir), rien de dessiné de loin.
- **Monde vivant** : PNJ et animaux instanciés, mis à jour seulement près du joueur ; dragons du ciel en boids.
- **Jour/nuit** : soleil, ciel, brouillard et lumières des fenêtres pilotés par une seule horloge.
- **Sauvegarde** : la progression grandit (quêtes, objets, dragons dressés, pages, compétences), même format de partie.
- Budgets : 60 i/s sur iPad récent en High, 30 i/s au moins sur téléphone en Fast ; mesurés avec le Perf log.

## 9. Étapes (chacune publiée et jouable)

| # | Étape | Contenu |
|---|---|---|
| 1 | **Villages vivants** | kit de maisons Blender, 4 villages, collisions, portes, intérieurs visitables |
| 2 | **Le monde respire** | jour/nuit, villageois, animaux, dragons sauvages dans le ciel, lanternes |
| 3 | **Paysages** | plages, champs, prairies, cascades, ruines, épaves |
| 4 | **Aventure à pied** | inventaire, dialogues, journal de quêtes, énigmes du monde (blocs, leviers, balances) |
| 5 | **Caverne des Braises** | épée, salles d'énigmes de nombres, gardien, grimoire de calcul |
| 6 | **Caverne des Marées** | bouclier, énigmes de logique (miroirs, interrupteurs), gardien |
| 7 | **Dressage** | 3 nouvelles espèces, écurie, encyclopédie illustrée |
| 8 | **Tour des Runes** | alphabet runique, mots, cor des vents, 2 espèces de plus |
| 9 | **L'aube** | observatoire, Lanterne d'Aube, Cœur de la Brume, final, générique |
| 10 | **Finitions** | musique, sons, cinématiques, défis du jour, réglages fins, performances |
