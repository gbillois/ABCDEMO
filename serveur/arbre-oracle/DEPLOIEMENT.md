# Oracle du Grand Arbre : déploiement

L'oracle est un Cloudflare Worker qui utilise **Workers AI** (pas de clé d'API : le compte
Cloudflare suffit). L'enfant écrit un animal dans le jeu, le Worker demande au modèle une
« recette » faite seulement de choix dans des listes fermées, et le jeu dessine l'animal en code.

Sans l'oracle (pas encore déployé, pas de réseau, quota atteint), le jeu crée quand même
l'animal avec les mots qu'il connaît.

## Prompt à donner à une IA qui gère Cloudflare

> Déploie un Cloudflare Worker sur mon compte, sans rien ajouter d'autre.
>
> **Source** : le dossier `serveur/arbre-oracle/` du dépôt GitHub `gbillois/ABCDEMO`
> (branche `main`). Il contient `wrangler.toml` et `src/index.js`. Ne modifie pas le code,
> sauf pour me signaler un problème.
>
> **Ce qu'il faut faire**
> 1. Déployer le Worker `arbre-oracle` avec `npx wrangler deploy` (dernière version de
>    wrangler), depuis le dossier `serveur/arbre-oracle/`. Garder exactement :
>    - la liaison Workers AI `AI` ;
>    - la limite de débit `LIMITE` (`[[ratelimits]]`, 5 par 60 s) ;
>    - le Durable Object `Quota` lié sous le nom `QUOTA`, avec la migration
>      `new_sqlite_classes` (classe SQLite, compatible avec l'offre gratuite) ;
>    - les variables `ORIGINES`, `ACTIF`, `MODELE`, `QUOTA_JOUR`, `QUOTA_ADRESSE_JOUR` ;
>    - `[observability] enabled = false`.
> 2. Rester sur l'offre gratuite **Workers Free**. Ne rien activer de payant : au-delà de
>    l'allocation gratuite de Workers AI, l'oracle doit simplement répondre « fatigué ».
> 3. Ne créer **aucun** autre service : pas de KV, D1, R2, Queues, AI Gateway, Analytics
>    Engine, Logpush, Tail Workers, domaine personnalisé ni secret.
> 4. Vérifier dans le tableau de bord que les journaux du Worker (Workers Logs /
>    Observability) sont **désactivés**. Ne pas ouvrir de session `wrangler tail`.
> 5. Garder l'adresse publique `workers.dev` (pas de route sur un domaine).
>
> **Tests à faire après le déploiement**
> - `curl https://arbre-oracle.<sous-domaine>.workers.dev/` doit répondre
>   « Oracle du Grand Arbre : OK ».
> - `curl -X POST https://arbre-oracle.<sous-domaine>.workers.dev/creer -H 'Origin: https://gbillois.github.io' -H 'content-type: application/json' -d '{"texte":"un lapin-dragon violet"}'`
>   doit répondre `{"ok":true,"recette":{...}}`, avec seulement des mots simples
>   (`forme`, `couleur`, `ailes`…).
> - La même requête avec `-H 'Origin: https://exemple.com'` doit être refusée (HTTP 403).
> - Avec `-d '{"texte":"un dragon qui tue"}'`, la réponse doit être `{"ok":false,"raison":"mot"}`.
> - Six requêtes de suite en moins d'une minute : la sixième doit répondre HTTP 429.
>
> **À me rendre** : l'adresse exacte du Worker, sous la forme
> `https://arbre-oracle.<sous-domaine>.workers.dev`, le résultat des tests, et la
> confirmation que les journaux sont désactivés et que rien de payant n'est activé.

## Ensuite, dans le jeu

L'adresse est déjà réglée sur le même sous-domaine que le relais des Pins. Si l'adresse
rendue est différente, la mettre dans `ORACLE_PROD` de `jeux/le-grand-arbre.html` :

```js
const ORACLE_PROD = "https://arbre-oracle.mon-sous-domaine.workers.dev";
```

## Tester en local

```sh
cd serveur/arbre-oracle
npx wrangler dev --port 8788 --remote --var ORIGINES:http://localhost:8099
# dans un autre terminal, à la racine du dépôt :
python3 -m http.server 8099
# puis ouvrir http://localhost:8099/jeux/le-grand-arbre.html?oracle=http://127.0.0.1:8788
```

Workers AI ne fonctionne qu'à distance (`--remote`, qui consomme le quota gratuit).
Le paramètre `?oracle=` n'est accepté que sur `localhost`.
Tests sans réseau : `node --test serveur/arbre-oracle/tests/oracle.test.mjs`.

## Règles de sécurité (dans `src/index.js`)

- **Pas de clé d'API** : Workers AI passe par la liaison `AI` du compte.
- **Origine** : seuls les sites listés dans `ORIGINES` peuvent appeler `/creer` (CORS et 403).
- **Texte de l'enfant** (`filtrerTexte`, identique dans le jeu) : 2 à 160 caractères, lettres,
  chiffres et ponctuation simple ; refus des gros mots (y compris certaines variantes avec
  chiffres ou espaces) et des mots de violence, d'adultes, de drogue ou d'alcool. Le jeu
  filtre avant d'envoyer, le Worker filtre à nouveau. Ce filtre ne garantit pas de tout bloquer.
- **Corps de requête** : 400 octets au plus, JSON `{ "texte": "..." }`.
- **Limiteurs**, dans cet ordre, avant tout appel au modèle :
  1. 5 créations par minute pour une même adresse (Rate Limiting de Cloudflare) → `vite` ;
  2. `QUOTA_ADRESSE_JOUR` (30) créations par jour pour une même adresse → `fatigue` ;
  3. `QUOTA_JOUR` (150) créations par jour en tout → `fatigue`.
  Le total du jour est le seul nombre écrit sur disque. Les comptes par adresse sont une
  empreinte (SHA-256 de l'adresse et du jour, coupée) gardée en mémoire seulement.
- **Interrupteur** : `ACTIF = "non"` endort l'oracle sans toucher au jeu.
- **Sortie du modèle** : schéma JSON imposé, puis `nettoyerRecette` ne garde que les valeurs
  des listes fermées. Aucun texte libre du modèle n'est renvoyé. `max_tokens` = 300.
- **Modèle** : `@cf/nvidia/nemotron-3-120b-a12b` (NVIDIA Nemotron 3 Super), accessible avec
  Workers Free. Le raisonnement interne est désactivé pour réserver la sortie au JSON et
  réduire l'attente. Les formats `response` et `choices[0].message.content` sont acceptés.
- **Bestiaire et détails explicites** : catalogue partagé de plus de 100 profils (animaux réels
  et mythologiques), 12 silhouettes, 18 accessoires, jusqu'à 7 têtes, 9 queues et 8 pattes.
  Les noms inventés sont acceptés ; le modèle compose avec les pièces autorisées. Le mode
  local sait aussi composer des animaux nouveaux. Les caractéristiques d'une espèce connue
  et les précisions de la description priment sur une omission du modèle.
- **Filtre** : les mots voisins ne sont jamais collés pour chercher une injure. Le test
  « une grenouille rouge » doit rester accepté, comme les autres noms d'animaux. Les injures,
  termes violents et adultes restent refusés, y compris plusieurs écritures détournées.
  Ce filtre ne garantit pas de reconnaître toutes les formulations : aucun texte libre du
  modèle ne sort et le rendu ne dispose d'aucune pièce violente ou adulte.
- **Sauvegarde locale** : la description filtrée reste sur l'appareil, avec la recette et le
  nom court, pour conserver les détails lors d'un rechargement. Le Worker ne la conserve pas.
- **Consigne au modèle** : animal toujours mignon et gentil ; toute autre consigne écrite par
  l'enfant est ignorée.
- **Coût** : avec l'offre Workers Free, Workers AI s'arrête à l'allocation gratuite du jour
  (10 000 « neurons ») au lieu de facturer. Le coût varie selon la longueur de la
  description, du schéma et de la réponse. Le quota applicatif de 150
  créations ne garantit donc pas de rester sous l'allocation, partagée avec les autres
  usages Workers AI du compte. Aucune activation de Workers Paid ni d'AI Gateway.
- **Pas de journaux** : `[observability] enabled = false`, aucun `console.log`.
