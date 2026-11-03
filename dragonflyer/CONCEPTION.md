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

## 7 bis. Méthode de fabrication des modèles 3D (règle)

Ne jamais demander « un village » d'un coup : on avance par étages, et chaque étage est vérifié avant de passer au suivant.

1. **Matières d'abord** : écorce, pierre, chaume, bois, tissu… (couleurs de la palette, textures cuites, échelle en mètres).
2. **Kit de pièces réutilisables** : poutres, murs, toits, portes, fenêtres, marches… chacune avec son pied à l'origine,
   ses dimensions exactes et ses matières. Les objets se construisent à partir du kit, jamais à main levée.
3. **Un objet à la fois** (une maison, une pièce, un arbre, un rocher), puis l'assemblage (village, forêt) seulement
   quand chaque objet est validé.

**Aucune modélisation à la main** : tout est construit par des scripts Python lancés dans Blender. **Chaque maison et
chaque objet est son propre fichier** (`blender/dragonflyer/village/maisons/<nom>.py`, `.../objets/<nom>.py`), fait avec
les pièces du même kit (`village/kit.py`) et les mêmes matières (`village/materiaux.py`) : un métier à tisser est son
petit script, fait des mêmes poutres que les murs. Chaque fichier se lance seul et fait ses propres aperçus.

**Boucle fabrication → contrôle qualité, avec deux agents séparés.** L'agent qui écrit les scripts Blender ne valide
pas son propre travail (on est indulgent avec soi-même). Un **second agent, d'un autre modèle**, sans le contexte du
fabricant, fait l'essentiel du contrôle :
- chaque maison est rendue depuis **les mêmes 12 caméras** (`village/apercu.py` : 8 autour à hauteur d'homme et en
  plongée, 2 de près sur la porte et une fenêtre, 1 de dessus, 1 en contre-plongée sous l'avant-toit) ;
- l'inspecteur reçoit seulement ces 12 rendus et la grille, donne une **note sur 10 par critère** et une **liste de
  corrections obligatoires**, précises et vérifiables ;
- ça ne passe pas tant qu'un critère est **sous 8** ; le fabricant corrige, refait les 12 rendus, et on recommence ;
- si **le même défaut revient 3 tours de suite**, on ne le rafistole plus : on **change d'approche** (autre construction,
  autre technique) ;
- une **capsule de la taille du joueur** (rayon 0,35 m, 1,7 m) marche jusqu'à chaque porte et la franchit
  (`village/capsule.py`) : une porte bouchée, trop basse ou une marche trop haute est trouvée avant le propriétaire ;
- **le propriétaire a le dernier mot** : il voit le résultat seulement quand tout est à 8 ou plus.

Ce qui se répète est écrit une fois dans une compétence Claude Code (`.claude/skills/modele-3d/SKILL.md`) : on ne
réexplique jamais la méthode. Les rendus longs tournent en arrière-plan ; le fichier de passation
`blender/dragonflyer/village/PASSATION.md` (où on en est, notes de chaque tour, prochaine étape) est tenu à jour à
chaque étape, pour qu'une nouvelle session reprenne là où la précédente s'est arrêtée.

Grille de l'inspecteur :
- **Posé** : rien ne flotte, rien ne s'enfonce, pas d'objets qui se traversent, pieds bien sur le sol.
- **Textures** : pas d'étirement ni de couture visible, bonne échelle (une planche ≈ 20 cm), pas de moiré.
- **Formes** : silhouette lisible de loin, proportions justes, pas de trous, pas de faces à l'envers,
  pas de morceaux arrachés par une simplification (cartes de feuilles, branches).
- **Style** : couleurs de la palette du jeu, lumière cuite cohérente, pas de noir pur ni de blanc brûlé.
- **Coût** : nombre de faces et de matières dans le budget (`OPTIMISATION-3D.md`), version de loin prévue.

**Personnages : même méthode, plus les postures et les animations.** Étages : matières (peau, tissu, cuir, cheveux),
kit (tête, mains, tronc, membres, pièces de vêtements), puis un personnage à la fois, chacun son fichier
(`blender/dragonflyer/personnages/<nom>.py`), tous sur le squelette commun (`squelette.py`, noms d'os lus par le jeu).
Le contrôle se fait sur trois planches, toujours les mêmes caméras :
- **12 vues** au repos (comme une maison) ;
- **postures et articulations** : chaque articulation pliée à ses limites (cou, épaules, coudes, poignets, hanches,
  genoux, chevilles, colonne) et des poses extrêmes (accroupi, bras levés, torsion) : pas de peau qui traverse,
  pas de pli « papier de bonbon » au coude ou à l'épaule, pas de vêtement qui passe à travers le corps, volumes gardés ;
- **animations** : chaque mouvement du jeu (repos, marche, course, saut, coup d'épée, salut…) en images fixes
  régulières, vues de côté et de face : pieds qui ne glissent pas et ne s'enfoncent pas, rien qui traverse,
  poids crédible, mouvement calme et lisible.
Les mêmes notes sur 10 (8 au moins partout), le même inspecteur séparé, le même « 3 fois le même défaut = autre approche ».

**Leçons déjà apprises** (à ajouter à la grille quand une nouvelle erreur passe) :
- Une simplification automatique casse les feuilles et les branches : simplifier seulement ce qui le supporte, et
  comparer avant/après sur un rendu de près.
- Tout effet d'image qui lit la profondeur (ex. GTAO) ignore la transparence des cartes d'arbres : rectangles noirs.
  Vérifier chaque effet dans le jeu, à tous les niveaux de qualité (Ultra compris) et sur ordinateur comme sur tablette.
- Après un changement de modèle, changer le nom du cache de `sw.js`, sinon les appareils gardent l'ancien fichier.

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
