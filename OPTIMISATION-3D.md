# Rendre un jeu 3D fluide (three.js, navigateur, iPad)

Principes tirés de l'optimisation du Domaine des Pins (octobre 2026). Ils valent pour tout jeu
3D de ce dépôt. Chaque principe dit **pourquoi**, **comment le voir** et **comment faire**.

Règle d'or : **mesurer avant et après**, sur la même vue et avec le même tirage au hasard.
Une optimisation qui change l'image n'en est pas une, sauf si on le décide exprès.

---

## 1. Les à-coups : rien ne doit se fabriquer pendant qu'on joue

Un à-coup (le jeu se fige une fraction de seconde), c'est presque toujours quelque chose qui se
**prépare pour la première fois** au moment où on le voit. Sur iPad (Safari, Metal), c'est
beaucoup plus long que sur ordinateur.

### 1.1 Programmes de couleurs (shaders)
three.js fabrique un programme par combinaison de réglages. Une nouvelle combinaison en plein
jeu bloque l'image. Ce qui en crée une :
- **le nombre de lumières** (allumer ou éteindre une lampe change *tous* les programmes de la scène) ;
- `transparent` qui change sur une matière (mur qui s'efface quand on entre) ;
- dessiner **dans une image à part** (reflet d'eau, `WebGLRenderTarget`) : autres réglages de couleurs ;
- une matière ou un objet qui n'était pas dans la scène au chargement.

**Ce qu'on fait :**
- **Nombre de lumières fixe.** Les lampes des bâtiments ne sont que des repères (`visible = false`).
  Deux vraies `PointLight`, toujours présentes, se posent sur les deux repères les plus proches et
  s'allument ou s'éteignent en douceur (intensité 0 ⇄ normale). Une lampe ajoutée plus tard est
  prise en charge automatiquement, à condition d'exister **au chargement**.
- **Tout préparer au chargement**, derrière l'écran de chargement :
  `renderer.compileAsync(scene, camera)` ; puis, pour chaque matière qui changera de réglage,
  la mettre dans son autre état, recompiler, la remettre ; puis la même chose avec une
  `WebGLRenderTarget` active pour les versions « reflet ».
- **Mettre dans la scène, dès le chargement**, tout ce qui sera montré plus tard (intérieurs,
  décors cachés) : `compile` prépare aussi les objets invisibles.
- **Terminer chaque programme au chargement** : `program.getUniforms()` sur
  `renderer.info.programs` (sinon Safari finit le travail au premier usage, en plein jeu).

**Comment le voir :** compter les `linkProgram` (envelopper `WebGL2RenderingContext.prototype.linkProgram`)
en se téléportant d'un lieu à l'autre. Il faut 0 en jeu.

### 1.2 Images (textures)
Une texture part dans la carte graphique la première fois qu'elle est dessinée.
**Ce qu'on fait :** `renderer.initTexture(t)` pour toutes les textures au chargement, puis une
image de « répétition générale » (tout le domaine vu du ciel, ombres comprises) avant d'enlever
l'écran de chargement.

### 1.3 Autres causes d'à-coups
- **Changer la taille de l'image** (`setPixelRatio`) réalloue le canevas : à-coup. Une
  résolution adaptative ne doit pas faire le yoyo : baisser seulement après plusieurs mesures
  lentes, remonter rarement, s'arrêter de remonter après quelques baisses, ignorer les très
  longues images (pause, changement d'appli).
- **Sons** : ne pas fabriquer un tampon de bruit à chaque effet ; en garder un et le réutiliser.

---

## 2. Les appels de dessin : moins d'objets séparés

Chaque objet dessiné séparément coûte du temps au processeur (programme, uniformes, état), même
s'il est minuscule. Sur iPad, c'est souvent **la** limite, avant le nombre de triangles.
`renderer.info.render.calls` donne le compte.

### 2.1 Ne pas dessiner ce qui est caché derrière des murs
Les intérieurs (meubles, jeux, gens qui jouent dedans) ne se voient pas de dehors : les mettre
dans un groupe à part, affiché seulement quand la **caméra** est à moins d'une vingtaine de mètres
des murs. Garder dehors ce qui se voit : murs, toit, enseigne, portes, vitres (elles brillent la nuit).
C'est la plus grosse économie (−50 % d'appels autour des bâtiments).

### 2.2 Fusionner ce qui ne bouge jamais
Les ensembles faits de dizaines de petites pièces fixes (barrières, lignes de parking, rayons de
vélo, massifs de fleurs, pontons) : fusionner leurs géométries **matière par matière**
(`mergeGeometries`) en gardant à part les pièces qui bougent (roues, portail, balançoires).
Vérifier ce que le code anime avant de fusionner.

### 2.3 Regrouper le reste du décor (BatchedMesh)
Pour les objets isolés de même matière : `THREE.BatchedMesh`, un seul appel pour tout un lot.
Principes pour que ce soit sûr :
- un lot par **matière** (la couleur peut varier : `setColorAt`) **et par quartier** (cases de
  ~64 m) : le quartier entier est gardé ou écarté (`perObjectFrustumCulled = false`), sans test
  objet par objet à chaque image ;
- l'objet d'origine reste dans la scène mais n'est plus dessiné (`layers.mask = 0`) ; à chaque
  image, on recopie dans le lot sa position et sa visibilité s'il a changé ;
- un objet qui **change de matière** ou **bouge sans arrêt** quitte son lot et redevient normal ;
- pas de matière transparente dans un lot, ni de matière qui le deviendra ;
- seulement si l'appareil sait le faire : `renderer.extensions.has("WEBGL_multi_draw")`.

### 2.4 Ce qu'il ne faut pas faire
- Toucher au **double passage des vitres courbes** (coupole) : three.js dessine une vitre
  transparente visible des deux côtés en deux passes. C'est nécessaire pour une vitre courbe, et
  inutile pour une vitre plate ou un décor d'une seule couche (yeux, bouche) :
  `material.forceSinglePass = true` pour ceux-là seulement.

---

## 3. Le processeur à chaque image

### 3.1 Ne pas recalculer la position de ce qui ne bouge pas
three.js recalcule la place de chaque objet à chaque image. Un objet immobile depuis 1 s passe
en `matrixAutoUpdate = false`. À chaque image on compare position, rotation, taille et parent avec
ce qu'ils étaient ; au moindre changement, il redevient normal avant le dessin. La scène elle-même
est figée (sinon elle oblige tout le monde à se recalculer), et un groupe où tout est figé n'est
même plus parcouru. Les personnages (os animés), les lumières et la caméra ne sont pas concernés.

### 3.2 Animer seulement ce qu'on voit
- Ce qui est **derrière la caméra** ou **dans un bâtiment vu de loin** : pas d'animation.
- Au-delà de 30 m : une image sur deux ; au-delà de 80 m : une sur trois. Chacun son tour, pour
  répartir le travail.
- Ce qui dépend seulement de l'heure (drapeau, jets d'eau) : ne rien calculer quand c'est loin,
  il n'y a rien à rattraper en revenant.

### 3.3 Collisions : ne tester que les obstacles proches
Ranger les obstacles fixes dans une **grille** (cases de 8 m, chaque obstacle dans toutes les
cases qu'il touche, avec de la marge). Les obstacles qui bougent (promeneurs) sont testés à part.
Vérifier que le résultat est **identique** sur quelques milliers de points avant et après.

### 3.4 Ne pas jeter de mémoire à chaque image
Le ramasse-miettes fait des à-coups. Dans la boucle de jeu : pas de `[...a, ...b]`, pas de
`.map/.filter` sur de grandes listes, pas de `new Vector3()`, pas de tableaux renvoyés par des
petites fonctions appelées en boucle. Sortir tôt des boucles (un cottage lointain : `continue`
avant tout calcul). Préférer comparer des nombres (`c.r !== r`) plutôt que des conversions
(`getHex()` fait des conversions de couleurs).

---

## 4. La carte graphique et la mémoire

- **Géométrie à la bonne finesse** : sur iPad, courbes un peu moins découpées (toboggans, arceaux)
  et petites sphères nombreuses en icosaèdre simple **avec des normales lissées**
  (normale = position / rayon) : même aspect, quatre fois moins de triangles.
- **Textures peintes** : sur iPad, moitié de côté (quatre fois moins de mémoire).
- **Ombres** : boîte d'ombre serrée autour du joueur ; les tout petits objets ne font pas d'ombre ;
  au-delà de quelques dizaines de mètres, pas d'ombre.
- **Reflets** (eau) : seulement près de l'eau.
- Ne pas libérer les canevas des textures : Safari peut perdre le contexte WebGL quand l'appli
  passe en arrière-plan, et three.js en a besoin pour tout renvoyer.

---

## 5. Mesurer

- **Dans le jeu** : un compteur caché dans le menu (images par seconde, pire image des 2 dernières
  secondes, nombre d'à-coups > 50 ms sur 10 s, appels de dessin, triangles, programmes). C'est la
  seule mesure qui vaut pour l'iPad.
- **En test automatique** (Playwright + Chromium sans carte graphique, SwiftShader) : se téléporter
  de lieu en lieu (`window.__pins`) et compter programmes fabriqués, textures envoyées, appels de
  dessin ; profiler le processeur (`Profiler` de CDP) et la mémoire (`HeapProfiler.startSampling`).
  Les images par seconde de ce navigateur ne valent rien ; les **comptes** et les **profils**, si.
- **Comparer en images** : même vue, même tirage au hasard (remplacer `Math.random` par une suite
  fixe), différence pixel par pixel. Seuls les gens qui marchent doivent différer.
- Garder des interrupteurs dans l'adresse pour comparer (`?sanslots`, `?sansgel`).

## 6. Pour un nouveau bâtiment ou un nouvel objet dans le Domaine des Pins

- Une lampe : la créer **au chargement** (pas en cours de partie) ; elle sera gérée toute seule.
- Un mur qui s'efface quand on entre : l'ajouter à `MURS_FONDUS` (sa version transparente sera
  préparée au chargement).
- Un bâtiment avec un intérieur : l'ajouter aux `INTERIEURS` (appel `bat(...)`).
- Un ensemble de pièces fixes : `fondre(groupe, [pièces qui bougent])`.
- Ce qui bouge sans arrêt : ne rien faire, il sortira de son lot tout seul.
- Après une modification : regarder le compteur de fluidité (menu ⚙️) aux endroits touchés.
