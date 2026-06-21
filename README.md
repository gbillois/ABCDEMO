# MagicSlider

Application **autonome HTML** (single-file) pour créer des présentations avec l'IA, les éditer comme dans PowerPoint, puis les exporter en **PPTX haute qualité** ou en **HTML autonome**.

Inspirée de la logique de la repo *CrisisMaker* (onglets, configuration IA dans les Réglages, sélection de modèles, gestion des erreurs) et du fonctionnement des slides de [`CTI.html`](https://gbillois.github.io/HowToWavestone/CTI.html).

## Lancer
Ouvrez simplement `index.html` dans un navigateur (double-clic). Aucune installation, aucun serveur requis. Tout tourne en local ; les clés API restent dans `localStorage`.

## Onglets

### 1. Create
- Colonne d'options à gauche :
  - **Style graphique** : *Wavestone* (par défaut, [design system](https://gbillois.github.io/HowToWavestone/wavestonedesign.css)), *Dark Cyber*, **charger un CSS** existant, ou **générer une charte** par description textuelle (appel LLM).
  - **Nombre de slides**.
  - Bouton **Create** + zone de log montrant les échanges avec le LLM en streaming.
- Grande zone à droite : aperçu du deck généré (navigation slide à slide).

L'IA configurée dans *Réglages* génère un deck de **slides éditables** (modèle de scène structuré : textes, formes, lignes, images, badges, positionnés en 1280×720).

### 2. Modify — édition type PowerPoint
- Ajout / modification / suppression de blocs, formes, textes.
- Mise à jour des polices, tailles, graisses, couleurs, alignements, opacité, rotation.
- **Sélection multiple** (Maj+clic), déplacement et **redimensionnement** par poignées.
- **Double-clic** sur un texte = édition inline.
- Ajout d'**image depuis URL**.
- Ajout / duplication / suppression de slides, avec **plusieurs templates** proposés (Titre, Titre+contenu, Deux colonnes, En-tête de section, Image+légende, Vierge).
- Miniatures (filmstrip) + panneau de propriétés.

### 3. Export
- **PPTX** : formes et textes natifs + images rastérisées via *html2canvas* (l'astuce du screenshot, comme dans `CTI.html`), assemblées avec *pptxgenjs* (`1280px = 13.333in`, `I(px)=px/96`).
- **HTML autonome** : fichier unique exécutable en local — navigation clavier (←/→, espace, Home/End, F), miniatures, plein écran et bouton d'export PPTX intégré.
- **Projet JSON** : sauvegarde / rechargement du modèle.

### 4. Réglages (IA)
Comme CrisisMaker : choix du **fournisseur** (Anthropic, OpenAI, Google Gemini, Mistral, Azure OpenAI), **sélection dynamique du modèle** (catalogue récupéré via l'API, repli sur des défauts), test de connexion et **gestion des erreurs** (toasts + statut). Clés stockées localement.

## Mécanisme « slides » (repris de CTI.html)
- Stage fixe **1280×720** mis à l'échelle : `scale = min(viewport_w/1280, viewport_h/720)`.
- Navigation : flèches / espace / Home / End / dots / plein écran.
- Export PPTX : capture des photos via `html2canvas` (CORS-safe), reconstruction des slides en formes natives PowerPoint.
