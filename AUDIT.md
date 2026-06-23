# AUDIT — EBH Pilot

> Audit en lecture seule. Aucun code n'a été modifié.
> Date : 22 juin 2026 · Périmètre : intégralité du dépôt.

---

## 1. Arborescence du projet

```
ebh-pilot/
├── apps/
│   ├── api/                      # API Express + Prisma
│   │   ├── src/
│   │   │   ├── index.ts          # Bootstrap serveur, middlewares, routes
│   │   │   ├── prisma.ts         # Instance PrismaClient
│   │   │   └── routes/
│   │   │       ├── dashboard.ts  # GET /api/dashboard (valeurs en dur)
│   │   │       ├── prospects.ts  # GET/POST /api/prospects
│   │   │       └── products.ts   # GET/POST /api/products
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/                      # Frontend React + Vite
│       ├── src/
│       │   ├── App.tsx           # Routes React Router
│       │   ├── main.tsx          # Providers (Query, Theme, Auth, Router)
│       │   ├── index.css         # Tokens CSS + base Tailwind
│       │   ├── auth/
│       │   │   └── AuthProvider.tsx   # Contexte Supabase + mode démo
│       │   ├── components/
│       │   │   ├── AppLayout.tsx
│       │   │   ├── ProtectedRoute.tsx
│       │   │   ├── Sidebar.tsx
│       │   │   └── Topbar.tsx
│       │   ├── lib/
│       │   │   ├── api.ts         # Client fetch typé
│       │   │   └── supabase.ts    # Client Supabase (nullable)
│       │   ├── pages/
│       │   │   ├── Dashboard.tsx
│       │   │   ├── Login.tsx
│       │   │   ├── Products.tsx
│       │   │   └── Prospects.tsx
│       │   ├── theme/
│       │   │   └── ThemeProvider.tsx  # Clair/sombre persisté
│       │   └── vite-env.d.ts
│       ├── index.html
│       ├── postcss.config.js
│       ├── tailwind.config.js
│       ├── vite.config.ts
│       ├── .env.example
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   ├── shared/                   # Contrats partagés client ↔ serveur
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── schemas.ts        # Schémas Zod (source de vérité)
│   │   │   └── types.ts          # Types inférés depuis Zod
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── ui/                       # Design system
│       ├── src/
│       │   ├── index.ts
│       │   ├── cn.ts             # clsx + tailwind-merge
│       │   ├── Button.tsx
│       │   ├── Card.tsx
│       │   └── Badge.tsx
│       ├── package.json
│       └── tsconfig.json
├── prisma/
│   └── schema.prisma             # User, Prospect, Product, ProspectStatus
├── docs/
│   └── ARCHITECTURE.md
├── .env.example
├── .eslintrc.cjs
├── .gitignore
├── .prettierignore
├── .prettierrc.json
├── tsconfig.base.json
├── tsconfig.json                 # Références de projet TS
├── package.json                  # npm workspaces
├── package-lock.json
└── README.md
```

---

## 2. Technologies utilisées

| Couche             | Technologie                          | Version (déclarée) |
| ------------------ | ------------------------------------ | ------------------ |
| Langage            | TypeScript                           | ^5.4.5             |
| Frontend           | React                                | ^18.3.1            |
| Build front        | Vite                                 | ^5.3.1             |
| Styles             | Tailwind CSS                         | ^3.4.4             |
| Données client     | TanStack Query                       | ^5.45.1            |
| Routing            | React Router DOM                     | ^6.23.1            |
| Icônes             | lucide-react                         | ^0.395.0           |
| Validation         | Zod                                  | ^3.23.8            |
| Backend            | Express                              | ^4.19.2            |
| ORM                | Prisma                               | ^5.15.0            |
| Base de données    | PostgreSQL (via Supabase)            | —                  |
| Auth               | @supabase/supabase-js                | ^2.44.2            |
| Runtime dev API    | tsx                                  | ^4.15.6            |
| Monorepo           | npm workspaces                       | —                  |
| Qualité            | ESLint, Prettier                     | ^8.57 / ^3.3.2     |
| Utilitaires UI     | clsx, tailwind-merge                 | ^2.x               |

---

## 3. Architecture

Monorepo npm workspaces à 4 paquets :

```
React (TanStack Query)  ──fetch──▶  Express API  ──Prisma──▶  PostgreSQL (Supabase)
        │                                                          ▲
        └──────────  Supabase Auth (session côté client)  ─────────┘
```

- **`packages/shared`** est la source de vérité des contrats : les schémas Zod
  y sont définis une fois, les types en sont inférés, et le tout est réutilisé
  côté API (validation des requêtes) et côté web (types + formulaires).
- **`packages/ui`** centralise les primitives visuelles (Button, Card, Badge)
  via des tokens CSS sémantiques pour le thème clair/sombre.
- **`apps/web`** : SPA protégée par `ProtectedRoute`, providers empilés dans
  `main.tsx`, données via TanStack Query avec fallback de démonstration.
- **`apps/api`** : Express, un routeur par ressource, validation Zod sur les POST.

**Observation structurelle importante** : l'authentification est aujourd'hui
**exclusivement côté client** (Supabase dans le navigateur). L'API Express ne
vérifie aucun jeton et ne connaît pas l'utilisateur courant. Les deux moitiés
de l'app sont donc faiblement couplées sur le plan de la sécurité.

---

## 4. Points forts

1. **Séparation des contrats nette** — Zod centralisé dans `shared`, zéro
   duplication de types entre client et serveur.
2. **Typage strict de bout en bout** — `tsconfig.base.json` active `strict`,
   `noUnusedLocals`, `noUnusedParameters` ; le projet compile et lint sans erreur.
3. **Design system cohérent** — tokens CSS sémantiques (`--bg`, `--surface`,
   `--fg`…) qui rendent le thème clair/sombre trivial et non dupliqué.
4. **Monorepo propre** — workspaces, références de projet TS, alias cohérents
   entre Vite et TypeScript.
5. **UX soignée** — layout responsive réel (sidebar coulissante mobile + overlay,
   topbar collante), états de chargement, design sobre conforme à l'intention.
6. **Exécutable immédiatement** — le mode démo permet de lancer l'app sans
   base ni clés, ce qui est excellent pour l'onboarding.
7. **Dégradation gracieuse** — les routes GET renvoient `[]` si la DB est absente.

---

## 5. Points faibles

1. **API non authentifiée** — aucun middleware ne vérifie le JWT Supabase ;
   `/api/prospects` et `/api/products` sont entièrement ouverts.
2. **POST non persistés** — les handlers POST ne font **aucune écriture Prisma** :
   ils renvoient l'objet validé avec un `crypto.randomUUID()`. La création est
   donc factice.
3. **Aucun scoping par utilisateur** — le schéma prévoit `userId` mais les
   requêtes ne filtrent pas par utilisateur (`findMany` sans `where`).
4. **CORS permissif** — `cors()` sans options autorise toutes les origines.
5. **Dashboard en dur** — les métriques sont des valeurs statiques, non calculées
   depuis la base (pas d'agrégats Prisma).
6. **Mode démo contourne l'auth** — pratique en dev, dangereux s'il atteint la prod
   (aucune barrière d'environnement autour de `signInDemo`).
7. **Aucun test** — pas de tests unitaires, d'intégration ou e2e.
8. **Aucune CI/CD** — pas de pipeline, pas de vérification automatique avant merge.
9. **Pas de gestion d'erreurs serveur centralisée** — aucun middleware d'erreur,
   les `catch` masquent les pannes réelles en renvoyant `[]`.
10. **Pas de validation des variables d'environnement** au démarrage (l'API
    démarre même sans `DATABASE_URL`).
11. **Pas de migration committée** — `prisma/migrations` absent ; seul le schéma existe.

---

## 6. Dette technique

| Élément                                   | Type           | Impact   |
| ----------------------------------------- | -------------- | -------- |
| POST handlers ne persistent pas           | Fonctionnel    | Élevé    |
| Pas de middleware d'auth API              | Sécurité       | Élevé    |
| `catch {}` qui renvoie `[]`               | Observabilité  | Moyen    |
| Métriques dashboard en dur                | Fonctionnel    | Moyen    |
| Absence de tests                          | Qualité        | Élevé    |
| Absence de CI                             | Process        | Moyen    |
| Pas de validation d'env (zod/envsafe)     | Robustesse     | Moyen    |
| Pas de logger structuré (console.log)     | Observabilité  | Faible   |
| Mode démo sans garde d'environnement      | Sécurité       | Moyen    |
| Pas de pagination sur les listes          | Évolutivité    | Faible   |

---

## 7. Scripts disponibles

### Racine (`package.json`)

| Script                    | Action                                       |
| ------------------------- | -------------------------------------------- |
| `npm run dev`             | Lance web + api en parallèle (npm-run-all)   |
| `npm run dev:web`         | Lance uniquement le front                    |
| `npm run dev:api`         | Lance uniquement l'API                       |
| `npm run build`           | Build shared → ui → web → api                |
| `npm run lint`            | ESLint sur `.ts/.tsx`                        |
| `npm run format`          | Prettier en écriture                         |
| `npm run prisma:generate` | Génère le client Prisma                      |
| `npm run prisma:migrate`  | Migration de développement                   |
| `npm run prisma:studio`   | Ouvre Prisma Studio                          |

### Par paquet

- `@ebh/web` : `dev` (vite), `build` (tsc -b && vite build), `preview`
- `@ebh/api` : `dev` (tsx watch), `build` (tsc), `start` (node dist)
- `@ebh/shared` / `@ebh/ui` : `build`, `dev` (tsc --watch)

---

## 8. Procédure de lancement local

Prérequis : **Node ≥ 18**, npm.

```bash
# 1. Installer toutes les dépendances du monorepo
npm install

# 2. Créer le fichier d'environnement
cp .env.example .env
# Renseigner DATABASE_URL, DIRECT_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

# 3. Générer le client Prisma
npm run prisma:generate

# 4. (Optionnel, si une base est configurée) appliquer le schéma
npm run prisma:migrate

# 5. Lancer web + api
npm run dev
```

URLs :
- Web : http://localhost:5173
- API : http://localhost:4000 (santé : http://localhost:4000/health)

**Sans configuration** : l'écran de login propose « Continuer en mode démo » et
les pages affichent des données de démonstration. Aucune base requise pour
explorer l'UI.

---

## 9. Procédure de déploiement

> Aucune configuration de déploiement n'existe actuellement dans le dépôt
> (pas de Dockerfile, pas de fichier CI, pas de manifeste d'hébergeur). La
> procédure ci-dessous décrit la cible recommandée.

**Frontend (`apps/web`)** — hébergeur statique (Vercel / Netlify / Cloudflare Pages) :
```bash
npm run build -w @ebh/web      # produit apps/web/dist
```
- Définir les variables `VITE_*` dans l'hébergeur.
- Servir `apps/web/dist`.

**API (`apps/api`)** — service Node (Railway / Render / Fly.io) :
```bash
npm run build -w @ebh/api      # produit apps/api/dist
node apps/api/dist/index.js
```
- Définir `DATABASE_URL`, `DIRECT_URL`, `PORT`.
- Exécuter `prisma migrate deploy` au démarrage.

**Base de données** — PostgreSQL géré par Supabase (déjà la cible de la stack).

**Manquant pour un déploiement fiable** : Dockerfile(s), pipeline CI, étape de
migration automatisée, configuration CORS restreinte à l'origine du front,
vérification des variables d'environnement.

---

## 10. Scores (sur 10)

| Domaine          | Score | Justification |
| ---------------- | :---: | ------------- |
| Architecture     | **8** | Monorepo propre, contrats partagés, séparation claire. Couplage sécurité front/back faible. |
| Maintenabilité   | **7** | TS strict, lint OK, design system. Pénalisé par l'absence de tests et de CI. |
| UX               | **8** | Responsive réel, thème clair/sombre, design soigné. Manque feedback d'erreurs et états vides explicites. |
| Base de données  | **6** | Schéma correct (relations, index, enum, Decimal). Aucune migration committée, agrégats non utilisés. |
| API              | **4** | Structure claire mais POST non persistés, pas de scoping utilisateur, pas de gestion d'erreurs centralisée. |
| Sécurité         | **3** | Auth uniquement côté client, API ouverte, CORS permissif, mode démo sans garde d'env. |
| Évolutivité      | **6** | Bonnes fondations (workspaces, contrats). Manque pagination, cache serveur, observabilité. |

**Score global moyen : 6.0 / 10** — fondations solides, à fiabiliser côté API et sécurité avant toute mise en production.
