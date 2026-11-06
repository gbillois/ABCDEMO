# My World Explorer — droits et licences (bilan du 6 novembre 2026)

But : savoir si l'application peut être vendue (App Store, Google Play, site payant).
Ce bilan a été fait à partir des conditions publiées par chaque source. Ce n'est pas un avis juridique :
avant une vraie commercialisation, le faire relire par un juriste (surtout les points « à faire » en bas).

## Ce que contient l'application

| Élément | Origine | Licence | Usage commercial | Obligation |
|---|---|---|---|---|
| Relief et fonds marins (`donnees/relief.webp`, `relief_europe.webp`) | **ETOPO 2022**, NOAA NCEI (États-Unis), grille à 15″ ré-échantillonnée | **CC0 1.0** : « NOAA waives any potential copyright and related rights in these data worldwide through the Creative Commons Zero 1.0 Universal Public Domain Dedication » (fiche ISO du jeu de données `gov.noaa.ngdc.mgg.dem:etopo_2022`) | Oui | Aucune. Citation conseillée : *NOAA National Centers for Environmental Information, 2022 : ETOPO 2022 15 Arc-Second Global Relief Model. doi:10.25921/fd45-gt74* |
| Frontières, côtes, lacs, fleuves, noms des pays, capitales, villes, populations, régions de France, mers, montagnes, déserts (`monde.json`, `ids.png`, contours de `couleurs.jpg`) | **Natural Earth** (naturalearthdata.com), échelles 1:10m et 1:50m | **Domaine public** : « All versions of Natural Earth raster + vector map data … are in the public domain … invites you to use them for personal, educational, and commercial purposes. No permission is needed … Crediting the authors is unnecessary. » | Oui | Aucune (mention « Made with Natural Earth » facultative) |
| Frontières selon le pays de l'enfant (`donnees/frontieres.json`) | **Natural Earth** 1:10m, « points de vue » officiels de 30 pays | **Domaine public** (mêmes conditions) | Oui | Aucune |
| Couleurs des paysages, banquise, zones de forêts/déserts/savanes (`couleurs.jpg`, `paysages.png`) | Calculées par nos scripts (`outils/monde/fabriquer.py`, zones dessinées à la main dans `zones.py`) | Création propre | Oui | — |
| Code du jeu, shaders (rendu inspiré de DragonFlyer, même propriétaire), icônes SVG, emblème, sons et musique (Web Audio) | Écrits pour ce dépôt | Création propre | Oui | — |
| Icône de l'application (`icone*.png`) | `icone.svg`, dessinée en code | Création propre | Oui | — |
| three.js 0.170.0 (moteur 3D) | jsDelivr / npm | **MIT** | Oui | Garder la mention de copyright MIT si on embarque la bibliothèque dans l'application |
| Polices Cinzel, Cinzel Decorative, Nunito | Google Fonts | **SIL Open Font License 1.1** | Oui (on ne vend pas la police seule) | Si on embarque les fichiers de police, joindre la licence OFL |

Le relief utilisé avant le 6 novembre 2026 (ETOPO1, 2009) était diffusé « librement, utilisation et redistribution gratuites »,
mais sans dédicace CC0 explicite et avec des données de contributeurs tiers : il a été **remplacé par ETOPO 2022 (CC0)** pour lever tout doute.

## Conclusion

Toutes les données et tous les visuels peuvent être utilisés dans une application commerciale, sans payer ni demander d'autorisation.
Rien n'oblige à citer les sources, mais l'écran Réglages les mentionne (bonne pratique, et utile en cas de question).

## À faire avant une commercialisation

1. **Nom « My World Explorer »** : vérifier qu'il n'est pas déjà une marque déposée dans la catégorie des logiciels/jeux éducatifs
   (bases INPI, EUIPO, USPTO, et recherche dans l'App Store et Google Play). Ce bilan ne couvre pas les marques.
2. **Frontières disputées** : la carte de base montre les frontières « de fait ». Au premier lancement, l'appli demande où habite
   l'enfant et applique alors le tracé officiel de ce pays (points de vue Natural Earth : Inde, Chine, Maroc, Pakistan… 30 pays ;
   Taïwan exclu). Ces tracés sont ceux de Natural Earth, pas des textes de loi : en cas de vente dans un pays qui contrôle
   les cartes (Inde, Chine…), faire valider par un spécialiste local.
3. **Polices** : aujourd'hui chargées depuis les serveurs de Google (l'adresse IP de l'appareil leur est transmise).
   Pour une appli payante destinée aux enfants (RGPD, catégorie « Enfants » de l'App Store), embarquer les fichiers de police
   dans l'application (permis par l'OFL) et three.js aussi, pour ne contacter aucun serveur tiers.
4. **Vie privée** : l'application ne collecte rien (pas de compte, pas de statistiques ; seuls les réglages et les records
   restent dans l'appareil). Le dire tel quel dans la fiche de confidentialité des magasins d'applications.
5. **Exactitude** : les fournisseurs ne garantissent pas l'exactitude des données. Les populations sont des estimations
   Natural Earth (vers 2019) ; les mettre à jour si l'appli est vendue comme référence.
