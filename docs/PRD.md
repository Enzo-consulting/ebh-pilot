# PRD — EBH Pilot
## Product Requirements Document — v2.0

> **Version :** 2.0
> **Date :** 25 juin 2026
> **Statut :** Approuvé
> **Auteur :** Enzo Consulting
> **Remplace :** Vision v1.0 (orientée automobile)

---

## 1. Vision Produit

### 1.1 Énoncé de vision

**EBH Pilot est une plateforme SaaS de pilotage commercial destinée à toute entreprise qui commercialise des produits ou des services.**

EBH Pilot donne à ses utilisateurs une vision en temps réel de leur activité commerciale : portefeuille clients, catalogue produits/services, rentabilité, indicateurs de performance, et actions IA pour accélérer les décisions.

### 1.2 Positionnement

| Axe | Définition |
|---|---|
| **Cible** | PME, TPE, commerciaux terrain, dirigeants, managers |
| **Secteurs** | Commerce, industrie, BTP, services, conseil, formation, distribution, négoce, automobile, franchises |
| **Modèle** | SaaS multi-tenant, abonnement mensuel/annuel |
| **Valeur centrale** | Piloter son activité commerciale sans complexité, depuis n'importe quel appareil |

### 1.3 Secteurs cibles

EBH Pilot est conçu pour être utilisé dans tout secteur commercial :

- **Commerce & distribution** — négoce, import/export, grossistes, détaillants
- **Industrie & fabrication** — équipementiers, sous-traitants, fabricants
- **BTP & travaux** — entreprises générales, artisans, prestataires techniques
- **Services & conseil** — cabinets de conseil, agences, prestataires de services
- **Formation** — organismes de formation, formateurs indépendants, CFA
- **Automobile** — concessionnaires, marchands de véhicules, loueurs (secteur parmi d'autres)
- **Franchises** — réseaux franchisés, pilotage multi-entités

---

## 2. Fonctionnalités Actuelles (v0.8)

### 2.1 Modules existants

| Module | Description | Statut |
|---|---|---|
| **Dashboard** | KPI commerciaux, score business, alertes, actions rapides | ✅ Livré |
| **Clients / CRM** | Fiche client complète, CRUD, recherche, filtres, statuts | ✅ Livré |
| **Produits & Services** | Catalogue, coûts, prix de vente, calcul de marge automatique | ✅ Livré |
| **Rentabilité** | Vue globale marges, CA, analyse par produit/service | ✅ Livré |
| **AI Import** | Import intelligent de données depuis une URL fournisseur | 🔄 MVP Interface |
| **Authentification** | Connexion email/mot de passe via Supabase, mode démo | ✅ Livré |
| **Health Check** | Route `/health/db` — supervision base de données | ✅ Livré |

### 2.2 Architecture technique actuelle

- **Frontend :** React 18, TypeScript, Vite, Tailwind CSS
- **Backend :** Express, TypeScript, Prisma, PostgreSQL (Supabase)
- **Auth :** Supabase (@supabase/supabase-js)
- **Structure :** Monorepo npm workspaces (web, api, shared, ui)

---

## 3. Personnalisation Client

### 3.1 Vision

Chaque organisation cliente d'EBH Pilot doit pouvoir adapter la plateforme à son identité visuelle et à ses pratiques métier, sans intervention technique.

### 3.2 Fonctionnalités de personnalisation

#### Logo et identité visuelle
- Import du logo de l'entreprise (formats PNG, SVG, JPEG — max 2 Mo)
- Affichage du logo dans la sidebar, l'écran de connexion et les exports PDF
- Favicon personnalisé par organisation

#### Palette de couleurs
- Choix de la couleur primaire (brand color) via un sélecteur de couleur
- Génération automatique des nuances (600, 500, 400, 300) à partir de la couleur principale
- Aperçu en temps réel des changements de couleur
- Les tokens CSS sémantiques existants (`--brand-*`) sont la cible d'implémentation

#### Interface et navigation
- Personnalisation du nom affiché de l'application (ex. "Pilote Commercial — ACME Corp")
- Choix des modules actifs/masqués dans la sidebar selon les besoins du secteur
- Terminologie métier configurable (ex. "Produit" → "Prestation", "Client" → "Partenaire")
- Densité d'affichage (compacte / normale / confortable)

#### Image de marque dans les exports
- En-tête personnalisé sur les PDF et exports de données
- Pied de page avec coordonnées de l'organisation

### 3.3 Priorité roadmap

| Fonctionnalité | Priorité | Complexité |
|---|---|---|
| Import logo | P1 | Faible |
| Couleur primaire | P1 | Moyenne |
| Nom de l'application | P2 | Faible |
| Modules actifs/masqués | P2 | Moyenne |
| Terminologie métier | P3 | Élevée |
| Exports personnalisés | P3 | Élevée |

---

## 4. Architecture Multi-tenant

### 4.1 Principe

EBH Pilot est une plateforme **multi-tenant** : plusieurs organisations (sociétés clientes) cohabitent sur la même infrastructure, mais leurs données sont strictement isolées les unes des autres.

### 4.2 Isolation des données

**Règle absolue : aucune donnée d'une organisation ne peut être visible, accessible ou modifiée par une autre organisation.**

#### Modèle actuel (v0.8)
L'isolation est déjà implémentée au niveau utilisateur (`userId`) :
- Toutes les entités (Prospect/Client, Product, ImportJob) sont scopées par `userId`
- Le middleware `requireAuth` vérifie le JWT à chaque requête
- Les opérations CRUD filtrent systématiquement par `userId`

#### Évolution vers l'isolation par Organisation
```
User → appartient à → Organization
Organization → possède → Clients, Produits, ImportJobs, Paramètres
```

Chaque requête sera filtrée par `organizationId` (et non plus seulement `userId`), ce qui permettra à plusieurs utilisateurs d'une même organisation de collaborer sur les mêmes données.

### 4.3 Modèle de données cible

```
Organization
  id, name, slug, logoUrl, primaryColor, planId
    createdAt, updatedAt

    OrganizationMember
      organizationId, userId, role (OWNER | ADMIN | MEMBER | READONLY)
        createdAt

        User (existant, étendu)
          id, email, name, authId
            defaultOrganizationId
            ```

            ### 4.4 Préparation gestion des abonnements SaaS

            #### Plans prévus
            | Plan | Utilisateurs | Données | Fonctionnalités |
            |---|---|---|---|
            | **Starter** | 1 | 500 clients / 500 produits | Modules de base |
            | **Pro** | 5 | Illimité | + IA Import, exports |
            | **Business** | 20 | Illimité | + Personnalisation, API |
            | **Enterprise** | Illimité | Illimité | + Multi-entité, SLA |

            #### Modèle de données abonnement
            ```
            Plan
              id, name, maxUsers, maxClients, maxProducts, features[]

              Subscription
                organizationId, planId, status (ACTIVE | TRIALING | PAST_DUE | CANCELED)
                  currentPeriodStart, currentPeriodEnd
                    stripeSubscriptionId (optionnel)
                    ```

                    ### 4.5 Considérations techniques

                    - **Isolation PostgreSQL :** Row-Level Security (RLS) via Supabase pour une couche de sécurité supplémentaire
                    - **Tenant routing :** Identification de l'organisation via JWT claim ou sous-domaine (`acme.ebhpilot.com`)
                    - **Migrations :** Toutes les futures migrations ajouteront `organizationId` sur les tables métier
                    - **Aucune donnée partagée :** Les référentiels globaux (ex. pays, devises) sont en lecture seule et non modifiables par les tenants

                    ---

                    ## 5. Vision Mobile

                    ### 5.1 Objectif

                    Développer une **application mobile native** EBH Pilot, orientée commerciaux terrain, permettant de piloter et d'animer l'activité commerciale depuis n'importe où.

                    ### 5.2 Cibles utilisateurs mobiles

                    - **Commerciaux terrain** — consultation du portefeuille clients, saisie de comptes-rendus de visite, création de devis rapide
                    - **Managers commerciaux** — suivi des objectifs et performances de l'équipe
                    - **Dirigeants** — tableau de bord synthétique, alertes critiques

                    ### 5.3 Fonctionnalités mobiles prévues

                    #### Tableau de bord terrain
                    - Vue synthétique des KPI du jour (CA, nouveaux clients, actions en attente)
                    - Alertes push pour les événements critiques (objectif atteint, client inactif depuis X jours)
                    - Mode hors-ligne avec synchronisation différée

                    #### Gestion des objectifs et challenges
                    - Définition d'objectifs individuels et collectifs (CA, nombre de clients, marge)
                    - Suivi de progression visuel (barres, pourcentages, tendances)
                    - Historique des performances par période

                    #### Gamification
                    - Système de badges pour les accomplissements commerciaux
                    - Classement de l'équipe (optionnel, activable par l'organisation)
                    - Challenges temporaires (ex. "100 appels cette semaine")
                    - Récompenses virtuelles et reconnaissance des performances

                    #### To-do list commerciale
                    - Liste de tâches liées aux clients et opportunités
                    - Rappels intelligents basés sur l'historique client
                    - Intégration avec les actions IA du dashboard
                    - Priorisation automatique par score d'urgence

                    #### Notifications
                    - Push notifications pour les alertes clients, objectifs, et rappels
                    - Notifications contextuelles selon la géolocalisation (si activée)
                    - Résumé quotidien configurable (heure d'envoi, contenu)

                    ### 5.4 Stack technique envisagée

                    | Option | Technologie | Avantages |
                    |---|---|---|
                    | **Option A (recommandée)** | React Native + Expo | Partage de logique avec le web, TypeScript, code natif si nécessaire |
                    | **Option B** | Progressive Web App (PWA) | Pas de store, déploiement immédiat, coût réduit |
                    | **Option C** | Flutter | Performance maximale, UI très personnalisable |

                    > **Recommandation :** Option A (React Native + Expo) pour maximiser la réutilisation du code TypeScript et des schémas Zod partagés (`packages/shared`).

                    ### 5.5 Intégration avec l'API existante

                    L'API Express existante est déjà conçue pour être consommée par des clients mobiles :
                    - Authentification JWT Supabase standard
                    - Réponses JSON typées (schémas Zod partagés)
                    - Routes RESTful cohérentes

                    Les seuls ajouts nécessaires côté API : endpoints de notifications push (Firebase FCM / APNs) et endpoint de synchronisation hors-ligne.

                    ### 5.6 Priorité et timeline estimée

                    | Phase | Contenu | Estimation |
                    |---|---|---|
                    | **Phase M1** | PWA responsive améliorée (base existante) | Déjà disponible |
                    | **Phase M2** | App React Native — Dashboard + Clients (lecture) | À planifier |
                    | **Phase M3** | Objectifs, challenges, gamification | À planifier |
                    | **Phase M4** | Notifications push, mode hors-ligne | À planifier |

                    ---

                    ## 6. Roadmap Produit

                    ### 6.1 Prochains tickets prioritaires (hérités du backlog)

                    Ces points restent valables indépendamment de la vision générique :

                    | Priorité | Ticket | Description |
                    |---|---|---|
                    | P1 | Ticket 012 | Persistance POST (clients, produits) — CRUD réel complet |
                    | P1 | Ticket 013 | Middleware d'authentification API renforcé |
                    | P1 | Ticket 014 | Scoping données par utilisateur (vérification complète) |
                    | P2 | Ticket 015 | Métriques dashboard calculées depuis la base |
                    | P2 | Ticket 016 | Middleware d'erreur centralisé + logs structurés |
                    | P2 | Ticket 017 | Validation des variables d'environnement au démarrage |
                    | P2 | Ticket 018 | Tests (Vitest + Supertest) + CI |
                    | P3 | Ticket 019 | Migration Prisma committée et versionnée |
                    | P3 | Ticket 020 | Pagination des listes |

                    ### 6.2 Nouveaux tickets issus de ce PRD v2.0

                    | Priorité | Ticket | Description |
                    |---|---|---|
                    | P2 | Ticket 021 | Modèle Organization + OrganizationMember (multi-tenant) |
                    | P2 | Ticket 022 | Personnalisation : import logo + couleur primaire |
                    | P2 | Ticket 023 | Plan & Subscription (modèle de données abonnement) |
                    | P3 | Ticket 024 | Terminologie métier configurable |
                    | P3 | Ticket 025 | PWA améliorée (manifest, service worker, hors-ligne partiel) |
                    | P3 | Ticket 026 | Application mobile React Native — Phase M2 |

                    ---

                    ## 7. Contraintes et Non-Objectifs

                    ### 7.1 Ce que EBH Pilot N'est PAS

                    - ❌ Un ERP complet (pas de gestion comptable, pas de paie, pas de stock physique)
                    - ❌ Un outil de gestion de projet (pas de Gantt, pas de kanban générique)
                    - ❌ Un outil de marketing automation (pas de campagnes email, pas de landing pages)
                    - ❌ Exclusivement orienté automobile (le secteur auto est un client parmi d'autres)

                    ### 7.2 Principes de développement

                    - **Aucun code hardcodé** — toutes les valeurs métier passent par les variables d'environnement ou la base de données
                    - **Généricité du vocabulaire** — les termes "Produit", "Client", "Fournisseur" sont des abstractions valables dans tous les secteurs
                    - **API-first** — toute fonctionnalité est d'abord une route API avant d'être une interface
                    - **Mobile-ready** — les nouvelles API doivent être conçues pour être consommées par un client mobile
                    - **Multi-tenant by design** — toute nouvelle entité de données doit inclure `organizationId` dès sa conception

                    ---

                    ## 8. Glossaire Générique

                    | Terme EBH Pilot | Équivalents sectoriels |
                    |---|---|
                    | **Client** | Client, partenaire, patient, adhérent, franchisé |
                    | **Produit** | Produit, service, prestation, formation, véhicule, bien |
                    | **Fournisseur** | Fournisseur, sous-traitant, prestataire, constructeur |
                    | **Prospect** | Prospect, lead, opportunité, candidat |
                    | **Import AI** | Import catalogue fournisseur, import tarifs, import liste |
                    | **Rentabilité** | Marge, rentabilité, profitabilité, taux de marge |
                    | **Score Business** | Score, indicateur, KPI, performance |

                    ---

                    ## 9. Historique des versions du PRD

                    | Version | Date | Auteur | Résumé |
                    |---|---|---|---|
                    | 1.0 | 2026-06-22 | Enzo Consulting | Vision initiale (implicitement automobile) |
                    | 2.0 | 2026-06-25 | Enzo Consulting | Généralisation plateforme — multi-secteurs, multi-tenant, mobile, personnalisation |
