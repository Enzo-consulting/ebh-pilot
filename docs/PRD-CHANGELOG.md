# PRD-CHANGELOG — EBH Pilot
## Historique des évolutions de la vision produit

---

## v2.0 — 25 juin 2026 — Généralisation de la vision produit

### Contexte de la décision

Le PRD v1.0 (vision initiale, implicitement orientée automobile) a été révisé pour transformer EBH Pilot en une **plateforme SaaS commerciale générique**, utilisable dans tout secteur d'activité.

Cette décision stratégique ne modifie aucun code, aucune route API, aucune base de données. Elle établit le cadre conceptuel et documentaire pour toutes les évolutions futures.

---

### 1. Éléments automobile identifiés et neutralisés

L'analyse du code, des schémas et des documents existants a révélé que la vision automobile était **implicite** plutôt qu'explicitement codée. Les éléments identifiés comme potentiellement restrictifs :

#### Dans le code (vocabulaire générique — aucune modification requise)
| Terme existant | Statut | Commentaire |
|---|---|---|
| `Product` (modèle Prisma) | ✅ Générique | S'applique à tout produit ou service |
| `brand` (champ Product) | ✅ Générique | Marque, applicable à tout produit |
| `supplier` (champ Product) | ✅ Générique | Fournisseur de tout secteur |
| `supplierReference` | ✅ Générique | Référence fournisseur universelle |
| `purchasePrice`, `transportCost` | ✅ Générique | Coûts valides dans tout secteur |
| `preparationCost` | ⚠️ Connotation auto | Peut désigner tout coût de mise en état — conservé tel quel |
| `accessoriesCost` | ⚠️ Connotation auto | Peut désigner tout accessoire ou composant — conservé tel quel |
| `Prospect` / `Client` | ✅ Générique | Universellement applicable |
| `ImportJob` | ✅ Générique | Import de catalogue, tarifs, données |

#### Dans les données de démonstration (à corriger dans un futur ticket)
| Élément | Action recommandée |
|---|---|
| Produits de démo avec noms de véhicules | Remplacer par des produits génériques (Ticket P3) |
| Fournisseurs de démo avec noms constructeurs auto | Remplacer par des fournisseurs fictifs génériques (Ticket P3) |
| URL de démonstration AI Import orientées auto | Remplacer par des URLs d'exemple génériques (Ticket P3) |

#### Dans la documentation
| Document | Statut | Action |
|---|---|---|
| README.md | ✅ Générique — aucune mention auto | Aucune modification nécessaire |
| AUDIT.md | ✅ Générique | Aucune modification nécessaire |
| CHANGELOG.md | ✅ Générique | Aucune modification nécessaire |
| TODO.md | ✅ Générique | Aucune modification nécessaire |
| docs/ARCHITECTURE.md | ✅ Générique | Aucune modification nécessaire |
| docs/PRD.md | ✅ **Créé** — v2.0 générique | Ce fichier |

**Conclusion : aucun code ne nécessite de modification pour la généralisation.** La vision automobile était implicite dans le contexte d'usage et non dans l'implémentation technique.

---

### 2. Nouvelles sections ajoutées au PRD

#### Section 3 — Personnalisation Client (NOUVEAU)
Chaque organisation cliente peut personnaliser :
- **Logo** : import PNG/SVG/JPEG, affiché dans la sidebar et les exports
- **Couleurs** : couleur primaire → génération automatique des nuances
- **Interface** : nom de l'application, modules actifs/masqués, terminologie métier
- **Exports** : en-tête et pied de page personnalisés

**Décision technique :** Les tokens CSS sémantiques existants (`--brand-600`, `--brand-500`, etc.) sont déjà la bonne abstraction. L'implémentation de la personnalisation des couleurs ne nécessitera que l'injection dynamique de ces tokens via JavaScript.

#### Section 4 — Architecture Multi-tenant (NOUVEAU)
- Isolation stricte des données par organisation
- Modèle `Organization` + `OrganizationMember` à créer
- Préparation `Plan` + `Subscription` pour le modèle SaaS
- Migration de `userId` → `organizationId` sur les entités métier

**Décision technique :** Le scoping par `userId` existant est une bonne fondation. La migration vers `organizationId` sera incrémentale et non-breaking.

#### Section 5 — Vision Mobile (NOUVEAU)
- Application React Native + Expo (recommandée)
- Fonctionnalités : dashboard terrain, objectifs, challenges, gamification, to-do, notifications
- Réutilisation de `packages/shared` (schémas Zod, types TypeScript)
- API existante déjà compatible (JWT Supabase, JSON, REST)

**Décision technique :** Aucune modification de l'API actuelle requise pour la Phase M1 (PWA). Les phases M2-M4 nécessiteront des endpoints de notification push et de synchronisation hors-ligne.

---

### 3. Impacts identifiés sur la roadmap

#### Impacts immédiats (aucun blocage)
- ✅ Tous les tickets P1 existants (012-014) restent valables sans modification
- ✅ Le modèle de données actuel est générique et ne nécessite pas de refactoring
- ✅ L'API existante est déjà compatible mobile (REST + JWT)

#### Nouveaux tickets créés par ce PRD v2.0

| Ticket | Titre | Priorité | Dépendances |
|---|---|---|---|
| **021** | Modèle Organization + OrganizationMember | P2 | Tickets 012-014 terminés |
| **022** | Personnalisation : logo + couleur primaire | P2 | Ticket 021 terminé |
| **023** | Plan & Subscription (abonnements SaaS) | P2 | Ticket 021 terminé |
| **024** | Terminologie métier configurable | P3 | Ticket 022 terminé |
| **025** | PWA améliorée (manifest, service worker) | P3 | Aucune |
| **026** | Application mobile React Native — Phase M2 | P3 | API stable + Ticket 025 |
| **027** | Données de démo génériques (remplacer auto) | P3 | Aucune |

#### Impacts sur la roadmap existante

| Ticket existant | Impact | Détail |
|---|---|---|
| Ticket 012 (Persistance POST) | ✅ Inchangé | CRUD standard, générique |
| Ticket 013 (Auth API) | ✅ Inchangé | JWT Supabase, universel |
| Ticket 014 (Scoping utilisateur) | ⚠️ À anticiper | Prévoir une migration vers organizationId lors du Ticket 021 |
| Ticket 015 (Métriques dashboard) | ✅ Inchangé | Calculs génériques |
| Ticket 018 (Tests + CI) | ✅ Inchangé | Tests standard |
| Ticket 019 (Migration Prisma) | ⚠️ À anticiper | La première migration committée doit prévoir le champ organizationId comme nullable pour la transition |

---

### 4. Décisions prises

| # | Décision | Rationale |
|---|---|---|
| D1 | Aucun code modifié dans ce ticket | La généralisation est conceptuelle — le code est déjà générique |
| D2 | Conservation de `preparationCost` et `accessoriesCost` | Ces termes sont assez génériques pour tout secteur |
| D3 | Recommandation React Native + Expo pour le mobile | Maximise la réutilisation du code TypeScript existant |
| D4 | Isolation par `organizationId` (et non par schéma DB séparé) | Approche pragmatique, compatible PostgreSQL + Supabase RLS |
| D5 | Tokens CSS sémantiques comme cible de personnalisation | L'architecture design tokens est déjà en place |
| D6 | Le secteur automobile reste un secteur cible parmi d'autres | Pas d'exclusion, juste une non-exclusivité |
| D7 | Données de démo à migrer vers le générique (Ticket 027, P3) | Non-bloquant, bas impact fonctionnel |

---

### 5. Ce qui NE change PAS

- ✅ Architecture monorepo (web, api, shared, ui)
- ✅ Stack technique (React, Express, Prisma, Supabase, TypeScript)
- ✅ Modèle de données existant (User, Prospect/Client, Product, ImportJob)
- ✅ Routes API existantes
- ✅ Design system et tokens CSS
- ✅ Authentification Supabase
- ✅ Processus de déploiement (Render)
- ✅ Tous les tickets P1 en cours

---

## v1.0 — 22 juin 2026 — Vision initiale

Vision implicitement orientée automobile (jamais formalisée dans un PRD dédié). Remplacée par v2.0.

Caractéristiques de la v1.0 (reconstituées depuis le code et l'audit) :
- Produits avec champs connotés automobile (`preparationCost`, `accessoriesCost`, `transportCost`)
- Données de démonstration probablement orientées automobile
- Pas de section personnalisation, multi-tenant ou mobile dans la documentation
- Pas de PRD formel — vision distribuée dans README.md et AUDIT.md
