# Authentification — EBH Pilot

Ce document décrit le fonctionnement de l'authentification de l'API EBH Pilot,
basée sur la vérification des **JWT Supabase**.

> Note : ce mécanisme a été introduit lors du Sprint 1 et est confirmé par le
> Ticket #002. Toutes les routes `/api/*` sont protégées et les données sont
> isolées par utilisateur.

## Vue d'ensemble

```
Navigateur (Supabase Auth)
   │  se connecte → reçoit un access_token (JWT)
   ▼
Frontend  ──── Authorization: Bearer <JWT> ────▶  API Express
                                                    │
                                          requireAuth (middleware)
                                          1. extrait le token
                                          2. supabase.auth.getUser(token)
                                          3. upsert User local (authId)
                                          4. req.userId = user.id
                                                    │
                                                    ▼
                                           Routes scopées : where { userId }
                                                    │
                                                    ▼
                                              PostgreSQL (Prisma)
```

## Le middleware `requireAuth`

Fichier : `apps/api/src/auth.ts`.

Responsabilités :

1. **Extraction** du jeton depuis l'en-tête `Authorization: Bearer <JWT>`.
2. **Vérification** du jeton via `supabase.auth.getUser(token)`. Un jeton absent,
   malformé ou invalide entraîne un rejet.
3. **Résolution de l'utilisateur** : l'utilisateur Supabase (`authId`) est mappé
   à une ligne `User` locale par `upsert` (créée à la première connexion).
4. **Exposition** de `req.userId`, consommé par les routes pour filtrer les données.

### Réponses du middleware

| Situation                                   | Code HTTP | Corps                                            |
| ------------------------------------------- | :-------: | ------------------------------------------------ |
| Supabase non configuré côté serveur         |    503    | `{ "error": "Auth indisponible…" }`              |
| En-tête `Authorization` absent / mal formé  |    401    | `{ "error": "Token manquant." }`                 |
| Jeton invalide ou expiré                    |    401    | `{ "error": "Token invalide." }`                 |
| Jeton valide                                |  passe    | `req.userId` renseigné, requête transmise        |

### Type `AuthedRequest`

```ts
export interface AuthedRequest extends Request {
  userId?: string;
}
```

Les handlers typent `req` comme `AuthedRequest` pour accéder à `req.userId`.

## Protection des routes

Toutes les routes applicatives sont montées derrière `requireAuth` dans
`apps/api/src/index.ts` :

```ts
app.use('/api/dashboard', requireAuth, dashboardRouter);
app.use('/api/prospects', requireAuth, prospectsRouter);
app.use('/api/products', requireAuth, productsRouter);
app.use('/api/profitability', requireAuth, profitabilityRouter);
```

Seul `GET /health` reste public (sonde de disponibilité, ne renvoie aucune donnée).

> **Ajout d'une route** : toute nouvelle route exposant des données doit être
> montée avec `requireAuth` et filtrer par `req.userId`.

## Isolation des données par utilisateur

Chaque requête de données est filtrée sur le `userId` résolu par le middleware.

**Lecture** :
```ts
prisma.product.findMany({ where: { userId: req.userId } });
prisma.prospect.findMany({ where: { userId: req.userId } });
```

**Création** : le `userId` du propriétaire est attaché à la ligne créée.
```ts
prisma.product.create({ data: { ...input, userId: req.userId! } });
```

**Mise à jour / suppression** : l'appartenance est vérifiée via la clause
`where: { id, userId }`. Si aucune ligne ne correspond (ressource inexistante
ou appartenant à un autre utilisateur), l'API renvoie `404`. Un utilisateur ne
peut donc ni lire, ni modifier, ni supprimer les données d'un autre.

## Configuration

Variables d'environnement côté API (voir `.env.example`) :

| Variable             | Rôle                                                        |
| -------------------- | ----------------------------------------------------------- |
| `SUPABASE_URL`       | URL du projet Supabase (vérification des JWT côté serveur). |
| `SUPABASE_ANON_KEY`  | Clé anon Supabase utilisée pour valider les jetons.         |
| `WEB_ORIGIN`         | Origine autorisée par le CORS (le frontend).                |

Si `SUPABASE_URL` / `SUPABASE_ANON_KEY` ne sont pas définies, l'API retombe sur
les valeurs `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. Si aucune n'est
présente, les routes protégées répondent `503`.

## Côté frontend

Le client API (`apps/web/src/lib/api.ts`) récupère la session Supabase et joint
automatiquement l'en-tête `Authorization: Bearer <access_token>` à chaque appel.
Aucune action manuelle n'est requise une fois l'utilisateur connecté.

## Test manuel

```bash
# 1. Obtenir un access_token via le frontend (après connexion) ou l'API Supabase.
TOKEN="<access_token>"

# 2. Sans token -> 401
curl -i http://localhost:4000/api/products

# 3. Avec token -> 200 + données de l'utilisateur uniquement
curl http://localhost:4000/api/products -H "Authorization: Bearer $TOKEN"
```

## Vérifications effectuées (Ticket #002)

- En-tête absent → `401`.
- Jeton invalide → `401`.
- Schéma d'autorisation mal formé → `401`.
- Jeton valide → `200`, `req.userId` correctement résolu.
- Toutes les routes `/api/*` montées derrière `requireAuth`.
- Lecture / écriture / mise à jour / suppression scopées par `userId`
  (accès inter-comptes → `404`).
