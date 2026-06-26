# Module Engine — Architecture SaaS EBH Pilot

> Ticket 016 — Fondations du moteur de modules et de feature flags

## Philosophie

EBH Pilot est une plateforme SaaS generique commercialisable aupres de n importe
quelle entreprise (produits, services, industrie, automobile, immobilier, assurance, etc.)
sans modification du code source.

Le Module Engine repose sur trois principes :

1. **Une seule base de code** — aucun fork, aucune personnalisation technique par client
2. **Activation a la carte** — chaque organisation active uniquement les modules et features dont elle a besoin
3. **Transparence totale** — le systeme sait a tout moment ce qui est actif pour qui

---

## Architecture

```
Organization
    |
        |--- OrganizationModule ---> Module
            |         isEnabled, expiresAt, config
                |
                    |--- OrganizationFeature ---> Feature
                                  isEnabled, expiresAt, quota, usageCount
                                  ```

                                  ### Module

                                  Un module est un ensemble coherent de fonctionnalites metier.
                                  Exemples : CRM, Produits, Stocks, RH, Documents, BI, IA

                                  Champs cles :
                                  - `code` : identifiant technique unique (ex: "crm", "hr")
                                  - `isCore` : si true, toujours actif, non desactivable
                                  - `category` : ModuleCategory (SALES, OPERATIONS, FINANCE, HR, ANALYTICS, AI, etc.)
                                  - `icon` : nom Lucide ou URL (ex: "users", "package")

                                  ### Feature

                                  Une feature est une capacite technique activable independamment d un module.
                                  Exemples : AI_TRANSLATION, PDF_GENERATION, MOBILE_APP, YOUSIGN

                                  Champs cles :
                                  - `code` : valeur de l enum FeatureCode
                                  - `isBeta` : affiche un badge Beta dans l interface
                                  - `quota` sur OrganizationFeature : limite d utilisation (ex: 500 SMS/mois)

                                  ---

                                  ## Modules disponibles

                                  | Code | Nom | Categorie | Core |
                                  |------|-----|-----------|------|
                                  | crm | CRM | SALES | Non |
                                  | products | Produits | SALES | Oui |
                                  | clients | Clients | SALES | Oui |
                                  | purchases | Achats | OPERATIONS | Non |
                                  | stock | Stocks | OPERATIONS | Non |
                                  | documents | Documents | DOCUMENTS | Non |
                                  | hr | Ressources Humaines | HR | Non |
                                  | interventions | Interventions | OPERATIONS | Non |
                                  | planning | Planning | OPERATIONS | Non |
                                  | accounting | Comptabilite | FINANCE | Non |
                                  | bi | Business Intelligence | ANALYTICS | Non |
                                  | ai | Intelligence Artificielle | AI | Non |

                                  ---

                                  ## Activation et desactivation

                                  ### Activer un module pour une organisation

                                  ```sql
                                  INSERT INTO "OrganizationModule" (id, "organizationId", "moduleId", "isEnabled", "enabledAt")
                                  VALUES (gen_random_uuid(), '<org_id>', '<module_id>', true, now());
                                  ```

                                  ### Desactiver un module (sans suppression)

                                  ```sql
                                  UPDATE "OrganizationModule"
                                  SET "isEnabled" = false
                                  WHERE "organizationId" = '<org_id>' AND "moduleId" = '<module_id>';
                                  ```

                                  ### Ajouter une date d expiration

                                  ```sql
                                  UPDATE "OrganizationModule"
                                  SET "expiresAt" = '2027-01-01'
                                  WHERE "organizationId" = '<org_id>' AND "moduleId" = '<module_id>';
                                  ```

                                  ---

                                  ## Utilisation dans les routes API

                                  ```typescript
                                  import { requireModule, requireFeature } from '../middleware/moduleEngine.js';

                                  // Proteger une route par module
                                  router.get('/crm/prospects', requireModule('crm'), handler);

                                  // Proteger par feature
                                  router.post('/ai/translate', requireFeature('AI_TRANSLATION'), handler);

                                  // Combiner module + feature
                                  router.post('/ai/analyze', requireModule('ai'), requireFeature('AI_ANALYSIS'), handler);

                                  // Verifier programmatiquement
                                  const enabled = await hasModule(organizationId, 'hr');
                                  if (enabled.enabled) { /* ... */ }

                                  // Lister tous les modules actifs
                                  const modules = await getEnabledModules(organizationId);
                                  // => ["products", "clients", "crm", "ai"]
                                  ```

                                  ---

                                  ## Montee en gamme (offres SaaS)

                                  | Offre | Modules inclus | Features incluses |
                                  |-------|---------------|-------------------|
                                  | Starter | products, clients | EXPORT_PDF, REPORTING |
                                  | Pro | + crm, documents, planning | + AI_IMPORT, PDF_GENERATION, EMAILING |
                                  | Enterprise | Tout | Tout + API_ACCESS, SSO, WHITE_LABEL |

                                  La montee en gamme se fait uniquement par activation en base de donnees.
                                  Aucune modification du code source n est necessaire.

                                  ---

                                  ## Compatibilite

                                  | Systeme | Impact |
                                  |---------|--------|
                                  | Multi-tenant | Les modules sont scopes par organizationId |
                                  | White Label | Aucun impact (coexistent) |
                                  | Business Units | Aucun impact (scope org, pas BU) |
                                  | Hierarchie | Aucun impact (pas de filtrage par role) |
                                  | Branding | Aucun impact |
                                  | DataIsolation | Aucun impact (layers independants) |

                                  ---

                                  ## Application mobile — Roadmap

                                  Le moteur prepare deja le support de l application mobile via les features :

                                  - `MOBILE_APP` : active l application mobile pour l organisation
                                  - `GPS_TRACKING` : active la geolocalisation
                                  - `QR_SCAN` : active le scan QR code
                                  - `BARCODE_SCAN` : active le scan code barre
                                  - `OFFLINE_MODE` : active le mode hors ligne
                                  - `PUSH_NOTIFICATIONS` : active les notifications push
                                  - `CHALLENGES` : active le module challenges/gamification

                                  L activation de ces features cote backend ne necessite aucune modification du code.
                                  Le frontend mobile interrogera l endpoint `/api/features` pour connaitre ses capacites.

                                  ---

                                  ## Prochaines etapes

                                  - Creer un endpoint `GET /api/modules` retournant les modules actifs de l organisation
                                  - Creer un endpoint `GET /api/features` retournant les features actives
                                  - Creer une interface d administration pour activer/desactiver les modules
                                  - Ajouter le suivi de quota (PATCH usageCount) pour les features avec limite
                                  
