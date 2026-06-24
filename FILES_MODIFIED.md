# FILES_MODIFIED — EBH Pilot

Récapitulatif des fichiers créés ou modifiés par ticket.

## Ticket #009.4 — Déploiement Frontend (2026-06-24)

### Fichiers créés

| Fichier | Description |
|---|---|
| `apps/web/src/components/ApiStatus.tsx` | Indicateur santé API non-bloquant (GET /api/health, affiche connectée/indisponible) |
| `apps/web/src/components/LoadingScreen.tsx` | Écran de chargement full-screen (logo + points animés) |
| `apps/web/src/pages/NotFound.tsx` | Page 404 cohérente avec le design system |

### Fichiers modifiés

| Fichier | Modification |
|---|---|
| `apps/web/vite.config.ts` | Forme fonction, loadEnv, define, proxy dév, build.outDir, manualChunks |
| `apps/web/.env.example` | Ajout VITE_APP_NAME, VITE_ENVIRONMENT, commentaires documentés |
| `apps/web/src/lib/api.ts` | Export BASE, ajout api.health() non-authentifié avec fallback |
| `apps/web/src/components/Topbar.tsx` | Intégration `<ApiStatus />` |
| `apps/web/src/App.tsx` | Route `path="*"` pointe vers `<NotFound />` (au lieu de redirect) |
| `apps/web/src/main.tsx` | `<Suspense fallback={<LoadingScreen />}>` autour de l’arbre |
| `CHANGELOG.md` | Entrée [0.8.0] ajoutée en tête |
| `FILES_MODIFIED.md` | Ce fichier (section 009.4 ajoutée) |

### Fichiers non modifiés

Tous les modules métier sont intacts :
Produits, Rentabilité, Prospects, Clients, AI Import (routes API)
API backend (`apps/api`)
Design system (`packages/ui`)
Schémas partagés (`packages/shared`)
Configuration Prisma

## Ticket #009.3 — API Production-Ready (2026-06-23)

### Fichiers modifiés

| Fichier | Modification |
|---|---|
| `apps/api/src/index.ts` | Route GET /, GET /api/health (Prisma check), CORS étendu avec FRONTEND_URL, middleware d'erreur global, handler 404, logs de démarrage structurés |
| `CHANGELOG.md` | Entrée [0.7.0] ajoutée en tête |
| `FILES_MODIFIED.md` | Ce fichier (section 009.3 ajoutée) |

### Fichiers non modifiés

Tous les modules métier sont intacts :

- Produits, Rentabilité, Prospects, Clients, Imports (routes API)
- - Frontend (apps/web)
  - - Design system (packages/ui)
    - - Schémas partagés (packages/shared)
      - - Configuration Prisma
        -
        ---

        ---

## Ticket #009.1 — AI Import — Interface MVP (2026-06-23)

### Fichiers créés

| Fichier | Description |
|---------|-------------|
| `apps/web/src/pages/AiImport.tsx` | Page AI Import : formulaire URL, validation, historique mocké, badges de statut |

### Fichiers modifiés

| Fichier | Modification |
|---------|--------------|
| `apps/web/src/components/Sidebar.tsx` | Ajout de l'entrée « AI Import » (icône `Wand2`) dans le tableau `nav` |
| `apps/web/src/App.tsx` | Import de `AiImport` + route `/ai-import` dans le layout protégé |
| `CHANGELOG.md` | Entrée `[0.6.0]` ajoutée en tête |
| `FILES_MODIFIED.md` | Ce fichier (créé) |

### Fichiers non modifiés

Tout le reste du projet est intact :
- Design system (`packages/ui`)
- Schémas partagés (`packages/shared`)
- API (`apps/api`)
- Dashboard, Clients, Produits, Rentabilité, Authentification

---

## Ticket #005 — Module Clients (2026-06-22)

| Fichier | Modification |
|---------|--------------|
| `prisma/schema.prisma` | Ajout des champs client au modèle Prospect |
| `packages/shared/src/schemas.ts` | Schémas et types Client |
| `apps/api/src/routes/clients.ts` | Nouveau (CRUD clients) |
| `apps/web/src/pages/Clients.tsx` | Nouveau (liste + filtres + tri) |
| `apps/web/src/components/ClientForm.tsx` | Nouveau (formulaire création/édition) |
| `apps/web/src/components/ClientDetail.tsx` | Nouveau (panneau détail) |
| `apps/web/src/lib/api.ts` | Méthodes clients ajoutées |
| `apps/web/src/components/Sidebar.tsx` | Prospects → Clients |
| `apps/web/src/App.tsx` | Route /clients + redirection /prospects |

---

## Ticket #004 — Dashboard centre de pilotage (2026-06-22)

| Fichier | Modification |
|---------|--------------|
| `apps/web/src/pages/Dashboard.tsx` | Refonte complète avec KPI calculés |

---

## Ticket #003 — Module Produits & Rentabilité (2026-06-22)

| Fichier | Modification |
|---------|--------------|
| `apps/web/src/components/ProductForm.tsx` | Nouveau (formulaire produit) |
| `apps/web/src/pages/Products.tsx` | Liste triable + mutations |
| `apps/web/src/lib/api.ts` | `updateProduct` ajouté |

---

## Ticket #002 — Authentification (2026-06-22)

| Fichier | Modification |
|---------|--------------|
| `docs/AUTHENTICATION.md` | Nouveau (documentation) |

---

## Ticket #001 — Persistance des données (2026-06-22)

| Fichier | Modification |
|---------|--------------|
| `apps/api/src/routes/products.ts` | PUT + DELETE ajoutés |
| `apps/api/src/routes/prospects.ts` | PUT + DELETE ajoutés |
| `packages/shared/src/schemas.ts` | Schémas de mise à jour ajoutés |

---

## Sprint 0 — Initialisation (2026-06-22)

Mise en place complète du monorepo. Voir `README.md` et `AUDIT.md`.
