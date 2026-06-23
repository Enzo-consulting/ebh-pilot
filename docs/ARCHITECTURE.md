# Architecture — EBH Pilot

## Flux de données

```
React (TanStack Query)  ──fetch──▶  Express API  ──Prisma──▶  PostgreSQL (Supabase)
        │                                                        ▲
        └────────────  Supabase Auth (session JWT)  ─────────────┘
```

## Contrats partagés (Zod)

Tous les schémas vivent dans `packages/shared/src/schemas.ts`. Ils servent à :

- valider les corps de requête côté API (`safeParse`),
- typer et valider les formulaires côté web.

Un seul endroit à modifier quand un champ change.

## Design system

`packages/ui` expose `Button`, `Card`, `Badge` et l'utilitaire `cn`
(clsx + tailwind-merge). Les couleurs passent par des **tokens CSS sémantiques**
(`--bg`, `--surface`, `--fg`, `--border`, …) redéfinis sous `.dark`, ce qui
permet un thème clair/sombre sans dupliquer les classes.

## Authentification

`AuthProvider` enveloppe l'app et écoute `onAuthStateChange` de Supabase.
`ProtectedRoute` redirige vers `/login` si aucune session. Un **mode démo**
permet de découvrir l'app sans configurer Supabase.

## Conventions

- TypeScript strict partout.
- ESLint + Prettier à la racine, partagés par tous les workspaces.
- `tsconfig.base.json` centralise les chemins et options communes.
