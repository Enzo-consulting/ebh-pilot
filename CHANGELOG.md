# Changelog — EBH Pilot

Toutes les modifications notables du projet sont documentées ici.
Format inspiré de [Keep a Changelog](https://keepachangelog.com/).

## [0.5.0] — Ticket #005 (Module Clients) — 2026-06-22

Transformation du module Prospects en un véritable module Clients (fiches
détaillées, coordonnées complètes, CRUD). Aucune modification du thème, de
l'authentification, du Dashboard ni du module Rentabilité.

### Ajouté

- **Modèle de données** (`prisma/schema.prisma`) — le modèle `Prospect`
  (réutilisé comme magasin Clients) reçoit les champs : `contactName`, `phone`,
  `mobile`, `website`, `address`, `postalCode`, `city`, `country`, `vatNumber`,
  `clientStatus`, `notes`. Nouvel enum `ClientStatus` (`PROSPECT`, `ACTIVE`,
  `INACTIVE`). Les colonnes existantes (`name`, `company`, `email`, `value`,
  `status`, `createdAt`, `updatedAt`) sont conservées ; `name` reste
  synchronisé avec `company` pour compatibilité.
- **Schémas partagés** (`packages/shared/src/schemas.ts`) — `clientSchema`,
  `createClientSchema` (société et contact obligatoires, email validé),
  `updateClientSchema` (partiel), `clientStatusSchema` ; types `Client`,
  `CreateClient`, `UpdateClient`, `ClientStatus`.
- **API Clients** (`apps/api/src/routes/clients.ts`, monté sous
  `/api/clients` derrière `requireAuth`) :
  - `GET /` (liste triée par société), `GET /:id` (fiche),
    `POST /`, `PUT /:id`, `DELETE /:id` ;
  - toutes les opérations scopées par utilisateur (accès inter-comptes → 404) ;
  - mapping `status` (client) ↔ colonne `clientStatus` à l'entrée et à la sortie.
- **Interface Clients** (`apps/web/src/pages/Clients.tsx`) :
  - liste avec colonnes Nom société, Contact, Téléphone, Email, Ville, Statut,
    Actions ;
  - **recherche instantanée** (société, contact, email, ville, téléphone) ;
  - **filtre par statut** (Tous / Prospect / Actif / Inactif) ;
  - **tri alphabétique** sur la société (asc/desc) ;
  - bouton **« Nouveau client »**.
- **Formulaire** (`apps/web/src/components/ClientForm.tsx`) création / modification
  avec validation des champs obligatoires (société, contact) et de l'email.
- **Fiche détaillée** (`apps/web/src/components/ClientDetail.tsx`) en panneau
  latéral, accessible depuis la liste, avec actions Modifier / Supprimer.
- **Client API web** (`apps/web/src/lib/api.ts`) : `clients`, `client`,
  `createClient`, `updateClient`, `deleteClient`. Gestion des réponses `204`
  (corps vide) ajoutée au helper `request`.

### Modifié

- **Navigation** : l'entrée de menu « Prospects » devient « Clients »
  (`/clients`). L'ancienne route `/prospects` redirige vers `/clients`, ce qui
  permet au Dashboard (action « Nouveau client ») de continuer à fonctionner
  sans modification.

### Conservé (compatibilité)

- L'ancienne page `Prospects.tsx` et les routes `/api/prospects` restent en
  place (non utilisées par le nouveau menu) pour ne rien casser.

### Vérifié

- Build web sans erreur TypeScript ; ESLint sans erreur.
- Schémas : société et contact obligatoires, email invalide rejeté, email vide
  accepté (normalisé en `null`), mise à jour partielle valide, statut par
  défaut `PROSPECT`.
- Routes Clients (CRUD) testées sur les handlers réels : création (201) avec
  mapping de statut et synchronisation `name`, validation (400), lecture,
  mise à jour (city + statut), 404 sur id inconnu, suppression (204),
  isolation par utilisateur.

### Non modifié

- Thème et design system (réutilisation de `Button`, `Card`, `Badge`, tokens).
- Authentification (`auth.ts`).
- Dashboard (`Dashboard.tsx`) — fonctionne via la redirection de route.
- Module Rentabilité (`Profitability.tsx`, route API profitability).
- Module Produits.

## [0.4.0] — Ticket #004 (Dashboard, centre de pilotage) — 2026-06-22

Refonte du Dashboard pour qu'il calcule automatiquement les indicateurs à
partir des produits réels. Aucune modification du thème, de l'authentification,
du module Produits ni du CRM.

### Modifié

- **`apps/web/src/pages/Dashboard.tsx`** entièrement repensé autour des produits :
  - **KPI principaux** (4 cartes) calculés automatiquement depuis les produits :
    nombre de produits, valeur totale du stock (somme des prix de revient),
    marge potentielle totale (somme des marges €), marge moyenne %
    (marge totale / chiffre d'affaires).
  - **Tableau « Produits à surveiller »** : produits dont la marge < 15 %,
    triés par marge croissante. Colonnes : Nom, Fournisseur, Prix revient,
    Prix vente, Marge %. État vide explicite si aucun produit sous le seuil.
  - **Tableau « Top rentabilité »** : les 5 produits avec la meilleure marge €.
    Colonnes : Nom, Marge €, Marge %, Prix vente.
  - **Actions rapides** (4 boutons, navigation uniquement) : Nouveau produit
    (→ /products), Nouveau client (→ /prospects), Voir rentabilité
    (→ /profitability), Voir catalogue (→ /products).
  - **Responsive** : grilles adaptatives (1 → 2 → 4 colonnes pour les KPI et
    les actions, 1 → 2 colonnes pour les tableaux), tableaux à défilement
    horizontal — utilisable sur ordinateur portable et tablette.

### Détails techniques

- Les données proviennent de l'endpoint produits existant (`api.products()`,
  lecture seule) ; les KPI et tableaux sont dérivés côté client avec `useMemo`.
- Repli sur des produits de démonstration quand l'API/DB est vide, comme dans
  le reste de l'application.
- Réutilisation des primitives et tokens de thème existants (`Card`, `Badge`,
  couleurs sémantiques) : le thème n'est pas modifié.

### Vérifié

- Build web sans erreur TypeScript ; ESLint sans erreur.
- Calculs validés sur le jeu de démonstration : 5 produits, stock 1 291 €,
  marge potentielle 801 €, marge moyenne 38,3 % ; « à surveiller » = les deux
  produits < 15 % triés croissant ; « Top rentabilité » trié par marge €
  décroissante.

### Non modifié

- Thème et design system.
- Authentification (`auth.ts`) et schéma de données.
- Module Produits (`Products.tsx`, `ProductForm.tsx`, routes API produits).
- CRM (`Prospects.tsx`).
- Le client API (`lib/api.ts`) n'a pas été modifié (réutilisation de l'existant).

## [0.3.0] — Ticket #003 (Module Produits & Rentabilité) — 2026-06-22

Évolution du module Produits pour la saisie et le calcul automatique de la
rentabilité côté interface. Aucune modification du design global, du schéma
`Product`, ni des modules CRM / Dashboard.

### Contexte

Le modèle `Product` (champs saisis + champs calculés `costPrice`,
`marginAmount`, `marginPercent`) et l'API (`GET` / `POST` / `PUT /products`)
gèrent déjà ces champs depuis les tickets précédents, avec
`computeProductFinancials` comme source unique de vérité pour les formules :

```
costPrice     = purchasePrice + transportCost + preparationCost
                + accessoriesCost + otherCosts
marginAmount  = sellingPrice - costPrice
marginPercent = (marginAmount / sellingPrice) * 100   // 0 si sellingPrice = 0
```

Ce ticket apporte donc la partie front manquante (formulaire + liste) sans
réécrire le modèle ni l'API, conformément à « ne rien modifier d'autre ».

### Ajouté

- **Formulaire Produit** `apps/web/src/components/ProductForm.tsx` (modale) :
  - tous les champs saisis : `name`, `brand`, `supplier`, `supplierReference`,
    `purchasePrice`, `transportCost`, `preparationCost`, `accessoriesCost`,
    `otherCosts`, `sellingPrice` ;
  - affichage **en temps réel, sans rechargement** du *Prix de revient*, de la
    *Marge €* et de la *Marge %*, recalculés à chaque frappe via
    `computeProductFinancials` (exactement le calcul serveur) ;
  - utilisé en création et en édition.
- **Liste Produits** (`apps/web/src/pages/Products.tsx`) refondue en tableau
  triable avec les colonnes demandées : *Prix achat*, *Prix revient*,
  *Prix vente*, *Marge €*, *Marge %* (plus *Produit*). Tri ascendant/descendant
  au clic sur chaque en-tête.
- Bouton « Nouveau produit » et action d'édition par ligne, branchés sur
  l'API via des mutations TanStack Query (invalidation des caches `products`
  et `profitability` après enregistrement).
- **Client API** (`apps/web/src/lib/api.ts`) : ajout de `updateProduct(id, …)`
  (PUT) ; `createProduct` existait déjà.

### Vérifié

- Build web sans erreur TypeScript ; ESLint sans erreur sur les fichiers modifiés.
- Calcul live conforme : (780+45+30+25+10)=890 de revient, 600 de marge,
  40,27 % ; division par zéro neutralisée (prix de vente 0 → 0 %).

### Non modifié

- Schéma `Product` (déjà complet) et migrations.
- Routes API `products` (GET/POST/PUT/DELETE déjà en place).
- Modules CRM (Prospects) et Dashboard.
- Design global, design system, thème.

## [0.2.2] — Ticket #002 (Authentification) — 2026-06-22

Authentification Supabase JWT : protection de toutes les routes API et
isolation des données par utilisateur. Aucun design modifié, schéma `Product`
inchangé, aucune autre modification fonctionnelle.

### Contexte

Le middleware d'authentification (`requireAuth`) et le scoping par utilisateur
ont été introduits lors du Sprint 1. Ce ticket les **audite, vérifie et
documente** comme exigence dédiée. L'audit a confirmé que les trois exigences
du ticket étaient déjà satisfaites par le code en place ; aucune réécriture
n'a donc été nécessaire (conformément à « ne rien modifier d'autre »).

### Ajouté

- **Documentation** `docs/AUTHENTICATION.md` décrivant :
  - le fonctionnement du middleware `requireAuth` (extraction, vérification du
    JWT via `supabase.auth.getUser`, résolution de l'utilisateur local,
    exposition de `req.userId`) et ses codes de réponse (401 / 503) ;
  - la protection de toutes les routes `/api/*` ;
  - l'isolation des données par `userId` (lecture, création, mise à jour,
    suppression ; accès inter-comptes → 404) ;
  - la configuration (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `WEB_ORIGIN`) ;
  - la procédure de test manuel.

### Vérifié (aucun changement de code requis)

- **Middleware auth** (`apps/api/src/auth.ts`) — testé sur le code réel :
  en-tête absent → 401, jeton invalide → 401, schéma mal formé → 401,
  jeton valide → 200 avec `req.userId` résolu vers l'utilisateur local.
- **Protection de toutes les routes** (`apps/api/src/index.ts`) — `dashboard`,
  `prospects`, `products` et `profitability` sont montées derrière
  `requireAuth` ; seul `GET /health` (sans donnée) reste public.
- **Isolation par utilisateur** — toutes les requêtes de données filtrent sur
  `where: { userId }` ; les mises à jour/suppressions vérifient l'appartenance
  (`where: { id, userId }`) et renvoient 404 pour une ressource non possédée
  (vérifié au Ticket #001).

### Non modifié

- Aucun fichier frontend (le client joint déjà le `Bearer <token>`).
- Aucun changement de design.
- Schéma `Product` (et `Prospect`) inchangé.
- Logique métier des routes inchangée.

## [0.2.1] — Ticket #001 (Persistance des données) — 2026-06-22

Confirme et complète le cycle CRUD persistant pour les produits et les
prospects via Prisma / PostgreSQL. Aucune nouvelle fonctionnalité hors de ce
périmètre, aucun changement d'architecture ni de design, frontend non modifié.

### Contexte

`POST` et `GET` persistaient déjà réellement depuis le Sprint 1
(`prisma.*.create` / `findMany` scopés par utilisateur). Ce ticket ajoute les
opérations manquantes `PUT` et `DELETE` et vérifie l'ensemble du cycle.

### Ajouté

- **`PUT /api/products/:id`** (`apps/api/src/routes/products.ts`)
  - Mise à jour partielle, scopée à l'utilisateur propriétaire.
  - Recalcule les champs dérivés (`costPrice`, `marginAmount`, `marginPercent`)
    à partir des valeurs fusionnées (existant + modifications) via
    `computeProductFinancials`.
  - `404` si le produit n'existe pas ou n'appartient pas à l'utilisateur.
- **`DELETE /api/products/:id`** — suppression scopée, `204` si succès,
  `404` sinon.
- **`PUT /api/prospects/:id`** (`apps/api/src/routes/prospects.ts`)
  - Mise à jour partielle scopée, `404` si introuvable.
- **`DELETE /api/prospects/:id`** — suppression scopée, `204` / `404`.
- **Schémas de mise à jour** (`packages/shared/src/schemas.ts`)
  - `updateProspectSchema` et `updateProductSchema` (versions partielles des
    schémas de création) + types `UpdateProspect` / `UpdateProduct`.

### Sécurité

- `PUT` et `DELETE` n'agissent que sur les lignes appartenant à l'utilisateur
  courant (`where: { id, userId }`), empêchant toute modification ou
  suppression inter-comptes (renvoie `404` sinon).

### Vérification

Le cycle complet a été testé sur les handlers réels (POST → GET → PUT →
DELETE) avec un magasin Prisma en mémoire :
- POST persiste et calcule `costPrice=890`, `marginAmount=600`,
  `marginPercent=40.27` ;
- GET renvoie les données persistées ;
- PUT met à jour et recalcule les marges (prix de vente 2000 → marge 1110) ;
- DELETE supprime (GET vide ensuite) ;
- accès par un autre utilisateur → `404` (scoping vérifié).

### Non modifié

- Aucun fichier frontend.
- Architecture, design, schéma `Product`/`Prospect` (déjà en place).
- Dashboard et autres modules.

## [0.2.0] — Sprint 1 (MVP utilisable) — 2026-06-22

Première version réellement utilisable : persistance des données, API
authentifiée et scopée par utilisateur, et nouveau module Rentabilité.
Aucune modification de l'architecture, aucune nouvelle technologie,
pas de Docker ni CI/CD.

### Ajouté

- **Module Rentabilité**
  - Nouvelle page `apps/web/src/pages/Profitability.tsx` : tableau des produits
    (coût de revient, prix de vente, marge €, marge %) + 4 KPI globaux
    (marge totale, chiffre d'affaires, marge moyenne %, nombre de produits).
  - Route `/profitability` ajoutée dans `App.tsx` et entrée « Rentabilité »
    (icône `TrendingUp`) dans la sidebar.
  - Nouvel endpoint API `GET /api/profitability`
    (`apps/api/src/routes/profitability.ts`) renvoyant les produits de
    l'utilisateur et les KPI agrégés calculés en base.
- **Authentification API (Supabase JWT)**
  - Middleware `apps/api/src/auth.ts` (`requireAuth`) : vérifie le header
    `Authorization: Bearer <jwt>` via Supabase, mappe l'utilisateur Supabase
    à une ligne `User` locale (upsert sur `authId`) et expose `req.userId`.
  - Appliqué à toutes les routes `/api/*` dans `apps/api/src/index.ts`.
- **Contrats partagés** (`packages/shared/src/schemas.ts`)
  - `computeProductFinancials()` : source unique de vérité pour le calcul
    `costPrice`, `marginAmount`, `marginPercent`.
  - `profitabilityKpisSchema` + type `ProfitabilityKpis`.
- **Client web** (`apps/web/src/lib/api.ts`)
  - Le token d'accès Supabase est désormais joint à chaque requête.
  - Méthodes ajoutées : `createProspect`, `createProduct`, `profitability`.
- **Configuration** (`.env.example`)
  - `WEB_ORIGIN` (origine autorisée par le CORS), `SUPABASE_URL`,
    `SUPABASE_ANON_KEY` (vérification serveur des JWT).

### Modifié

- **Modèle `Product`** (`prisma/schema.prisma`) entièrement revu :
  - Champs saisis : `name`, `brand`, `supplier`, `supplierReference`,
    `purchasePrice`, `transportCost`, `preparationCost`, `accessoriesCost`,
    `otherCosts`, `sellingPrice`.
  - Champs calculés automatiquement et persistés : `costPrice`,
    `marginAmount`, `marginPercent`.
  - Anciens champs `sku`, `price`, `margin`, `stock` supprimés.
- **`POST /api/products`** (`apps/api/src/routes/products.ts`)
  - Persiste réellement via `prisma.product.create` (avant : renvoyait un
    objet factice avec un UUID aléatoire).
  - Les champs financiers sont calculés côté serveur avant insertion.
- **`POST /api/prospects`** (`apps/api/src/routes/prospects.ts`)
  - Persiste réellement via `prisma.prospect.create` rattaché à `userId`.
- **Lecture scopée par utilisateur** : `GET /api/products`,
  `GET /api/prospects` et `GET /api/profitability` filtrent désormais sur
  `where: { userId }`.
- **CORS** (`apps/api/src/index.ts`) restreint à `WEB_ORIGIN` quand la
  variable est définie (sinon ouvert, pour le développement).
- **Pages produits** (`apps/web/src/pages/Products.tsx`) mises à jour pour
  le nouveau modèle (affichage marque, coût de revient, marge %).
- **Schéma Zod `productSchema` / `createProductSchema`** alignés sur le
  nouveau modèle ; `createProductSchema` ne reçoit que les coûts saisis et
  le prix de vente, les champs dérivés étant calculés serveur.

### Sécurité

- L'API n'est plus ouverte : tout accès à `/api/*` exige un JWT Supabase valide.
- Les données sont isolées par utilisateur (plus de fuite inter-comptes).
- CORS configurable par origine.

### Notes de migration

- Le modèle `Product` ayant changé, exécuter une migration Prisma :
  ```bash
  npm run prisma:generate
  npm run prisma:migrate -- --name sprint1_product_costs
  ```
- Renseigner `SUPABASE_URL` et `SUPABASE_ANON_KEY` côté API (ou laisser
  l'API réutiliser les `VITE_*` correspondantes) pour activer la
  vérification des JWT.

### Non inclus (hors périmètre de ce sprint)

- Formulaire de création de produit/prospect côté UI (les endpoints POST
  sont prêts ; le câblage UI viendra dans un sprint suivant).
- Calcul des métriques du Dashboard depuis la base (toujours des valeurs
  d'exemple, conformément au périmètre).
- Docker, CI/CD, tests automatisés (explicitement exclus).

## [0.1.0] — Sprint 0 (initialisation)

- Mise en place du monorepo (apps/web, apps/api, packages/ui,
  packages/shared, prisma, docs), design system, thème clair/sombre,
  Dashboard, authentification Supabase côté client, pages Prospects et
  Produits. Voir `README.md` et `docs/ARCHITECTURE.md`.
