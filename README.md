# EBH Pilot

Application SaaS moderne (pilotage business + actions IA) construite en monorepo.
Design premium inspiré de **Stripe**, **Notion** et **Linear** — sans Bootstrap, sans effets superflus.

## Stack

| Domaine        | Technologie                                  |
| -------------- | -------------------------------------------- |
| Frontend       | React 18, TypeScript, Vite, Tailwind CSS     |
| Données client | TanStack Query, React Router                 |
| Validation     | Zod (partagée client ↔ serveur)              |
| Backend        | Express, TypeScript                          |
| ORM / DB       | Prisma, PostgreSQL                           |
| Auth           | Supabase (`@supabase/supabase-js`)           |

## Structure du monorepo

```
ebh-pilot/
├── apps/
│   ├── web/            # Frontend React + Vite
│   └── api/            # API Express + Prisma
├── packages/
│   ├── ui/             # Design system (Button, Card, Badge, cn)
│   └── shared/         # Schémas Zod + types partagés
├── prisma/             # schema.prisma (User, Prospect, Product)
├── docs/               # Documentation
└── package.json        # npm workspaces
```

## Démarrage rapide

> Prérequis : **Node ≥ 18** et npm.

```bash
# 1. Installer
npm install

# 2. Variables d'environnement
cp .env.example .env       # remplir Supabase + DATABASE_URL

# 3. Générer le client Prisma
npm run prisma:generate

# 4. (optionnel) Appliquer le schéma à la base
npm run prisma:migrate

# 5. Lancer web + api en parallèle
npm run dev
```

- Web : http://localhost:5173
- API : http://localhost:4000

### Mode démo (sans configuration)

L'application est **exécutable immédiatement**. Sans clés Supabase, l'écran de
connexion propose **« Continuer en mode démo »** et les pages affichent des
données de démonstration. Aucune base de données n'est requise pour explorer l'UI.

## Fonctionnalités

- **Layout responsive** : sidebar coulissante (mobile) + topbar collante.
- **Thème clair / sombre** : bascule persistée (localStorage), tokens CSS sémantiques.
- **Dashboard** : Business Score, CA, Marge, Actions IA, Prospects, Produits.
- **Auth Supabase** : connexion / inscription par email + mot de passe (prête à l'emploi).
- **Pages** : Prospects (table) et Produits (cartes).

## Scripts

| Commande                  | Effet                                  |
| ------------------------- | -------------------------------------- |
| `npm run dev`             | Lance web + api                        |
| `npm run build`           | Build complet du monorepo              |
| `npm run lint`            | ESLint sur tout le code                |
| `npm run format`          | Prettier                               |
| `npm run prisma:generate` | Génère le client Prisma                |
| `npm run prisma:migrate`  | Migration de dev                       |
| `npm run prisma:studio`   | Ouvre Prisma Studio                    |

## Configuration Supabase

1. Créez un projet sur [supabase.com](https://supabase.com).
2. Dans **Project Settings → API**, copiez l'URL et la clé `anon` vers `.env`
   (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
3. Dans **Database → Connection string**, copiez la chaîne Postgres vers
   `DATABASE_URL` / `DIRECT_URL`.
4. L'auth email/mot de passe est gérée par Supabase ; Prisma gère les tables
   métier (`Prospect`, `Product`) reliées à l'utilisateur via `authId`.

## Architecture

- `packages/shared` est la **source de vérité** des contrats de données : les
  schémas Zod y sont définis une fois et réutilisés côté API (validation des
  requêtes) et côté web (types + validation des formulaires).
- `packages/ui` centralise les primitives visuelles pour une cohérence stricte.
- L'API expose `/api/dashboard`, `/api/prospects`, `/api/products` et tombe
  proprement en données vides si la base n'est pas configurée.

## Licence

MIT
