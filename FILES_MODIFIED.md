# FILES_MODIFIED — EBH Pilot

Récapitulatif des fichiers créés ou modifiés par ticket.

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
