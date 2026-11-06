# Les Trois Lueurs — fabrication

Démo faite avec le moteur **Luminati** (https://gitlab.com/stubborn-hug/lumina, licence MIT).

```bash
bash outils/lumina/fabriquer.sh            # dossier de travail : $TMPDIR/lumina-trois-lueurs
```

Le script récupère le moteur au commit noté dans `fabriquer.sh`, applique nos retouches, écrit la campagne,
compile avec Vite et copie le résultat dans `lueurs/jeu/` (sans l'éditeur ni les polices japonaises et chinoises).

| Fichier | Rôle |
| --- | --- |
| `make-trois-lueurs.mjs` | La campagne : 3 niveaux (Bourg des Prés, Gorges d'Ocre, Marais des Brumes) et l'histoire. Copié dans `tools/` du moteur. |
| `moteur/luminati.patch` | Retouches du moteur : style `retro` (campagne `look: "retro"`, `?look=retro`), langue `fr` par défaut. |
| `moteur/fr.js` | Les textes de l'interface en français (copié dans `src/engine/i18n/`). |
| `moteur/fr-common.mjs` | Les textes communs du moteur en français (`public/i18n/fr/common.json`). |
| `moteur/tactile.js` | Joystick et boutons sur écran tactile, bouton « Accueil » sur l'écran titre. |

Pour changer un niveau ou l'histoire : modifier `make-trois-lueurs.mjs`, relancer `fabriquer.sh`.
Le générateur vérifie la campagne (`checkCampaign` du moteur) avant d'écrire.
Pour jouer sans compiler : dans le dossier du moteur, `npx vite`, puis
`http://127.0.0.1:5173/game.html?campaign=trois-lueurs`.
