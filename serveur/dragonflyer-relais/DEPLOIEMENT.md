# Relais de The Dragon Apprentice Chronicles : déploiement

Le relais est un Cloudflare Worker avec un Durable Object (`Salle`), construit comme celui du Domaine des Pins.
- **Jouer à plusieurs** : une salle = un code de 8 caractères, 8 joueurs au plus. Il transmet seulement les positions
  (dragon ou cavalier à pied), le profil (surnom court filtré + numéro de couleur du dragon) et des numéros de phrases.
- **Transfert d'une partie** : `/transfert/<6 chiffres>`, deux appareils, chiffré de bout en bout par le navigateur ;
  le relais ne voit que des octets illisibles et coupe au bout de 10 minutes.
- Il n'écrit rien sur disque et n'a pas de journaux. Aucun vrai prénom n'est demandé.

## Prompt à donner à une IA qui gère Cloudflare

> Déploie un Cloudflare Worker sur mon compte, sans rien ajouter d'autre.
>
> **Source** : le dossier `serveur/dragonflyer-relais/` du dépôt GitHub `gbillois/ABCDEMO` (branche `main`).
> Il contient `wrangler.toml` et `src/index.js`. Ne modifie pas le code, sauf pour me signaler un problème.
>
> **Ce qu'il faut faire**
> 1. Déployer le Worker `dragonflyer-relais` avec `npx wrangler deploy` (dernière version de wrangler), depuis le
>    dossier `serveur/dragonflyer-relais/`. Garder exactement : le Durable Object `Salle` lié sous le nom `SALLES`
>    avec la migration `new_sqlite_classes` (offre gratuite) ; la variable `ORIGINES = "https://gbillois.github.io"` ;
>    `[observability] enabled = false`.
> 2. Rester sur l'offre gratuite **Workers Free**. Ne rien activer de payant.
> 3. Ne créer **aucun** autre service : pas de KV, D1, R2, Queues, Analytics Engine, Logpush, Tail Workers,
>    domaine personnalisé ni secret.
> 4. Vérifier que les journaux du Worker (Workers Logs / Observability) sont **désactivés**.
> 5. Garder l'adresse publique `workers.dev`.
>
> **Tests après le déploiement**
> - `curl https://dragonflyer-relais.<sous-domaine>.workers.dev/` répond « Relais de The Dragon Apprentice Chronicles : OK ».
> - Une connexion WebSocket vers `wss://…/salle/ABCDEFGH?creer=1` avec `Origin: https://gbillois.github.io`
>   reçoit `{"t":"bienvenue","s":0,"joueurs":[]}`.
> - La même connexion avec `Origin: https://exemple.com` est refusée (HTTP 403).
>
> **À me rendre** : l'adresse exacte `wss://dragonflyer-relais.<sous-domaine>.workers.dev`, le résultat des trois tests,
> et la confirmation que les journaux sont désactivés et que rien de payant n'est activé.

## Ensuite, dans le jeu

L'adresse est dans `RELAIS_PROD` (bloc « jouer à plusieurs » de `dragonflyer/index.html`). Elle vaut déjà
`wss://dragonflyer-relais.gerome-billois.workers.dev`, le même sous-domaine que le relais des Pins : à changer
seulement si l'IA rend une autre adresse.

## Tester

```sh
node --test serveur/dragonflyer-relais/tests/relais.test.mjs     # filtre identique jeu/relais, listes fermées, bornes, débit
cd serveur/dragonflyer-relais && npx wrangler dev --port 8787 --var ORIGINES:http://localhost:8099
# à la racine du dépôt : python3 -m http.server 8099, puis http://localhost:8099/dragonflyer/?relais=ws://127.0.0.1:8787
```
Le paramètre `?relais=` n'est accepté que sur `localhost`.

## Règles du relais (dans `src/index.js`)

- Connexions acceptées seulement depuis les sites listés dans `ORIGINES`.
- Code de salle : 8 caractères parmi `ABCDEFGHJKMNPQRSTUVWXYZ23456789` ; une salle n'existe que tant qu'un joueur y est.
- 8 joueurs au plus par salle.
- Profil : `{ "t": "profil", "pseudo": "Astrid", "couleur": 3 }`, une seule fois par connexion. Surnom facultatif,
  2 à 16 caractères autorisés, filtre d'insultes identique dans le jeu et le relais (vérifié par les tests) ;
  `couleur` est un numéro de `COULEURS_DRAGON` (moins de `NB_COULEURS`).
- Position : `{ "t": "p", x, y, z, r, a, b, m, f }` (nombres bornés au monde, 15 par seconde au plus ;
  `m` 0 en vol, 1 posé, 2 à pied ; `f` 1 si le dragon crache du feu).
- Phrase : `{ "t": "m", "i": 0…31 }`, une toutes les 1,5 s, numéro dans `PHRASES` du jeu. Jamais de texte libre.
- Tout message de plus de 220 caractères ferme la connexion ; tout autre champ est ignoré.
