# Relais multijoueur du Domaine des Pins : déploiement

Le relais est un Cloudflare Worker avec un Durable Object (`Salle`). Une partie = un code
de 8 caractères = une salle en mémoire. Il transmet seulement des positions, des numéros
de phrases, les profils et le monde de l'hôte (heure du jour, thème) entre 10 joueurs au maximum, n'écrit rien sur disque et n'a
pas de journaux. À la connexion, chaque joueur choisit fille/garçon et, s'il le veut,
un surnom court filtré. Aucun vrai prénom n'est demandé.

## Prompt à donner à une IA qui gère Cloudflare

> Déploie un Cloudflare Worker sur mon compte, sans rien ajouter d'autre.
>
> **Source** : le dossier `serveur/pins-relais/` du dépôt GitHub `gbillois/ABCDEMO`
> (branche `main`). Il contient `wrangler.toml` et `src/index.js`. Ne modifie pas le code,
> sauf pour me signaler un problème.
>
> **Ce qu'il faut faire**
> 1. Déployer le Worker `pins-relais` avec `npx wrangler deploy` (dernière version de
>    wrangler), depuis le dossier `serveur/pins-relais/`. Garder exactement :
>    - le Durable Object `Salle` lié sous le nom `SALLES`, avec la migration
>      `new_sqlite_classes` (classe SQLite, compatible avec l'offre gratuite) ;
>    - la variable `ORIGINES = "https://gbillois.github.io"` ;
>    - `[observability] enabled = false`.
> 2. Rester sur l'offre gratuite **Workers Free**. Ne rien activer de payant.
> 3. Ne créer **aucun** autre service : pas de KV, D1, R2, Queues, Analytics Engine,
>    Logpush, Tail Workers, domaine personnalisé ni secret.
> 4. Vérifier dans le tableau de bord que les journaux du Worker (Workers Logs /
>    Observability) sont **désactivés**. Ne pas ouvrir de session `wrangler tail`.
> 5. Garder l'adresse publique `workers.dev` (pas de route sur un domaine).
>
> **Tests à faire après le déploiement**
> - `curl https://pins-relais.<sous-domaine>.workers.dev/` doit répondre
>   « Relais du Domaine des Pins : OK ».
> - Une connexion WebSocket vers `wss://…/salle/ABCDEFGH?creer=1` avec l'en-tête
>   `Origin: https://gbillois.github.io` doit recevoir un message JSON
>   `{"t":"bienvenue","s":0,"joueurs":[]}`.
> - La même connexion avec `Origin: https://exemple.com` doit être refusée (HTTP 403).
>
> **À me rendre** : l'adresse exacte du Worker, sous la forme
> `wss://pins-relais.<sous-domaine>.workers.dev`, le résultat des trois tests, et la
> confirmation que les journaux sont désactivés et que rien de payant n'est activé.

## Ensuite, dans le jeu

Mettre l'adresse rendue par l'IA dans `RELAIS_PROD`, en haut du bloc « Jeu à plusieurs »
de `pins/index.html`, par exemple :

```js
const RELAIS_PROD = "wss://pins-relais.mon-sous-domaine.workers.dev";
```

## Tester en local

```sh
cd serveur/pins-relais
npx wrangler dev --port 8787 --var ORIGINES:http://localhost:8099
# dans un autre terminal, à la racine du dépôt :
python3 -m http.server 8099
# puis ouvrir http://localhost:8099/pins/?relais=ws://127.0.0.1:8787
```

Le paramètre `?relais=` n'est accepté que sur `localhost`.

## Règles de sécurité du relais (dans `src/index.js`)

- Connexions acceptées seulement depuis les sites listés dans `ORIGINES`.
- Code de partie : 8 caractères parmi `ABCDEFGHJKMNPQRSTUVWXYZ23456789`. Une salle
  n'existe que tant qu'au moins un joueur y est : le code ne sert plus ensuite.
- 10 joueurs au maximum par salle.
- Profil : `{ "t": "profil", "pseudo": "Petit Panda", "sexe": "f", "tenue": null }`.
  `sexe` vaut `f` ou `g` ; `tenue` vaut `null` (habits) ou l'un des identifiants de
  `MAILLOTS`. Le surnom (facultatif) contient 2 à 16 caractères autorisés ; un filtre
  simple refuse les insultes usuelles, y compris certaines variantes avec accents,
  espaces ou chiffres. Ce filtre ne garantit pas de bloquer toutes les insultes.
  Un profil invalide reçoit `{ "t": "profil_refuse" }` et n'est pas diffusé.
  Le relais renvoie le profil validé avec le numéro `s` à tous les joueurs, et les
  profils déjà présents à chaque nouvel arrivant, après le message `bienvenue`.
  Surnom et sexe sont fixes pendant la connexion ; la tenue peut changer. Les profils
  restent uniquement dans les pièces jointes des WebSockets de la salle, sans base de
  données ni journal. Les anciens clients sans profil gardent leur identité d'animal.
- Messages acceptés : position (nombres bornés, 15 par seconde au plus) ou numéro de
  phrase (0 à 63, une toutes les 1,5 s). Tout autre champ est ignoré, tout message de
  plus de 160 caractères ferme la connexion. Seul le surnom validé peut contenir du
  texte libre ; les phrases de discussion restent une liste fermée.
