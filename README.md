# MagicSlider

Application **autonome HTML** (single-file `index.html`) pour créer des présentations avec l'IA, les retoucher, puis les exporter en **PPTX** ou en **HTML autonome**. Onglets, configuration IA, sélection de modèles et gestion d'erreurs dans l'esprit de *CrisisMaker* ; mécanisme de slides inspiré de `CTI.html`.

## Lancer
Ouvrez `index.html` dans un navigateur (double-clic). Aucune installation, aucun serveur. Les clés API restent dans `localStorage`.

## Tester
Les tests navigateur utilisent Playwright :

```bash
npm test
```

## Principe
L'IA génère un **deck HTML/CSS libre** (comme un prompt direct dans l'app Claude) — pas un modèle de boîtes contraint. Chaque slide est un `<section class="slide">` de **1280×720**, rendu dans une **iframe isolée**. C'est ce qui permet d'atteindre un rendu « keynote premium » (dégradés, photos avec overlays, flat icons, timelines, typo fine).

## Onglets

### 1. Create
- **Style graphique** : Wavestone (défaut), Dark Cyber, **charte par description IA**, et **import d'un CSS** (ex. `wavestonedesign.css`) que l'IA réutilise (ses classes sont injectées).
- **Nombre de slides**, **slider de densité de photos** (0–100 %), **Extended thinking** (Anthropic) pour la qualité maximale.
- Bouton **Create** → un appel LLM produit le HTML complet du deck, streamé dans le log ; aperçu live à droite.

### 2. Modify (allégé, HTML libre)
- Filmstrip de miniatures (réordonner ↑/↓, dupliquer, supprimer, **＋ ajouter une slide via IA**).
- **Éditer le texte** : édition inline directement dans la slide (contenteditable).
- **HTML** : édition du HTML brut de la slide.
- **Retoucher (IA)** : décrivez une modification (« plus épuré », « ajoute une photo », « palette plus sombre »…), l'IA réécrit la slide en conservant la cohérence.

### 3. Export
- **PPTX éditable (IA / rapide)** : reconstruction en objets PowerPoint via PptxGenJS, avec option de nettoyage IA.
- **PPTX éditable (dom-to-pptx)** : nouveau moteur DOM/CSS dédié, chargé depuis `assets/dom-to-pptx.bundle.js`, utile pour comparer les rendus sur gradients, ombres, arrondis et SVG.
- **PPTX éditable (html2pptx local)** : moteur navigateur chargé depuis `assets/html2pptx-browser.js`, qui exporte directement depuis le HTML local sans serveur ni exécution Node.
- **PPTX image** : chaque slide est **capturée en image haute résolution** (icônes Iconify converties en SVG avant capture) via une iframe isolée + html2canvas → 1 image plein cadre par slide. Fonctionne même sur des slides très complexes.
- **HTML autonome** : fichier unique — navigation clavier (←/→, espace, Home/End, F), miniatures (dots), plein écran, et **export PPTX intégré**.
- **Projet `.json`** : sauvegarde / rechargement (thème, CSS, slides).

### 4. Réglages (IA)
Multi-fournisseurs : **Anthropic, OpenAI, Google Gemini, Mistral, Azure OpenAI**. Sélection dynamique du modèle (catalogue via API, repli sur défauts), test de connexion, gestion d'erreurs (toasts + repli non-streaming si le flux SSE est coupé). Pour un rendu proche de l'app Claude : modèle **Opus** + **Extended thinking** activé.

## Mécanisme « slides » (repris de CTI.html)
Stage fixe 1280×720, `scale = min(vw/1280, vh/720)`, navigation flèches / espace / dots / plein écran ; export PPTX par capture (html2canvas) — `1280px = 13.333in`.
