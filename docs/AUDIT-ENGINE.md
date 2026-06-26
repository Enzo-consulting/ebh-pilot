# Audit Engine — EBH-Pilot

> Ticket 018 — Audit Engine

---

## Objectif

L'Audit Engine d'EBH-Pilot crée un journal immuable de toutes les actions importantes réalisées sur la plateforme. Chaque événement de domaine (Ticket 017) déclenche automatiquement l'écriture d'une entrée d'audit, sans aucune modification des routes métier.

L'audit log sert à :
- **Conformité** : RGPD, ISO 27001, SOC 2, HIPAA
- **Sécurité** : détection d'anomalies, investigation d'incidents
- **Traçabilité** : qui a fait quoi, quand, depuis où
- **Historique** : diff avant/après pour chaque modification
- **Reporting** : statistiques d'activité par organisation, BU, utilisateur

---

## Architecture

```
Domain Event (Ticket 017)
       |
       v
  AuditListener
  (events/listeners/index.ts)
       |
       v
  auditService.createAudit()
  (audit/auditService.ts)
       |
       v
  auditRepository.insertAuditEvent()
  (audit/auditRepository.ts)
       |
       v
  PostgreSQL — table audit_events
  (prisma/schema.prisma)
```

### Principe de découplage

L'Audit Engine ne sait pas quels événements existent.
L'Event Bus ne sait pas que l'audit existe.
Seul le registre de listeners (listenerRegistry.ts) fait la connexion.

Ajouter un nouvel événement au bus (Ticket 017) = il est automatiquement audité sans modifier l'Audit Engine.

---

## Fichiers

```
apps/api/src/audit/
├── index.ts            ← Point d'entrée unique (services + types)
├── auditTypes.ts       ← Interfaces TypeScript
├── auditRepository.ts  ← Couche Prisma (insertAuditEvent, findMany, ...)
└── auditService.ts     ← Logique métier (createAudit, searchAudit, ...)

apps/api/src/events/listeners/index.ts
                    ← AuditListener mis à jour (Ticket 018)

prisma/schema.prisma
                    ← Modèle AuditEvent + enum DomainEventType
```

---

## Modèle Prisma : AuditEvent

### Champs principaux

| Champ | Type | Description |
|-------|------|-------------|
| id | UUID | Identifiant interne |
| eventId | String (unique) | ID de l'événement Event Bus (corrélation) |
| organizationId | String | Organisation (isolation multi-tenant) |
| businessUnitId | String? | Business Unit si applicable |
| userId | String? | Utilisateur déclencheur (null = système) |
| resourceType | String | Type de ressource (prospect, client, ...) |
| resourceId | String | ID de la ressource |
| event | DomainEventType | Type d'événement |
| occurredAt | DateTime | Quand l'événement s'est produit |

### Contexte de sécurité

| Champ | Description |
|-------|-------------|
| ipAddress | Adresse IP du client |
| userAgent | User-Agent complet |
| device | Type d'appareil (desktop, mobile, tablet, api, system) |
| browser | Navigateur (Chrome, Firefox, Safari, mobile-app) |
| country | Code pays ISO 3166-1 alpha-2 (ex: FR) |
| city | Ville (géolocalisation IP) |

### Données de l'événement

| Champ | Description |
|-------|-------------|
| metadata | Métadonnées libres (JSON) de l'émetteur |
| before | Snapshot de l'objet AVANT modification |
| after | Snapshot de l'objet APRÈS modification |
| isSystemEvent | true = système, false = action utilisateur |

### Règle d'immuabilité

Le modèle AuditEvent n'autorise **aucune opération UPDATE ni DELETE**.
Seule l'insertion est permise via createAudit().
Cette contrainte est enforced au niveau du repository.

---

## 11 Index PostgreSQL

Optimisés pour les requêtes les plus fréquentes :

1. organizationId — audit admin par organisation
2. (organizationId, occurredAt) — audit par période
3. (organizationId, event) — audit par type d'événement
4. (organizationId, resourceType, resourceId) — historique d'une ressource
5. userId — audit par utilisateur
6. (userId, occurredAt) — activité d'un utilisateur sur une période
7. (resourceType, resourceId) — cross-organisation (interne)
8. event — comptage par type d'événement
9. occurredAt — archivage et partitionnement
10. businessUnitId — audit par Business Unit
11. isSystemEvent — filtrage des événements système

---

## Cycle de vie d'un événement d'audit

```
1. Route HTTP reçoit une requête (ex: POST /prospects)
2. Middleware injectAuthUser() charge l'utilisateur (Ticket 015)
3. La route crée le prospect dans la BDD
4. La route émet: emitEvent(req, DomainEvent.PROSPECT_CREATED, { ... })
5. EventBus distribue l'événement à tous les listeners enregistrés
6. AuditListener reçoit le payload de manière asynchrone (fire-and-forget)
7. AuditListener construit un CreateAuditInput depuis le payload
8. createAudit() appelle insertAuditEvent()
9. insertAuditEvent() écrit dans la table audit_events
10. En cas d'erreur d'écriture: log uniquement, jamais de propagation
```

La réponse HTTP (étape 3) est envoyée AVANT que l'audit ne soit écrit (étape 9).
L'audit est fire-and-forget — il ne ralentit jamais la réponse HTTP.

---

## Services disponibles

| Service | Statut | Usage |
|---------|--------|-------|
| createAudit() | OK | Appelé par AuditListener |
| searchAudit() | Squelette | Dashboard admin audit |
| getAuditByUser() | Squelette | Page profil, RH |
| getAuditByResource() | Squelette | Historique prospect/client |
| getAuditByOrganization() | Squelette | Dashboard admin |
| getAuditStatistics() | Squelette | Reporting, BI |
| exportAudit() | Squelette | Exports conformité |

---

## Conformité

### RGPD

| Article | Couverture |
|---------|-----------|
| Art. 5 — Licéité, minimisation | Seules les données nécessaires sont stockées |
| Art. 15 — Droit d'accès | getAuditByUser() fournit l'activité complète |
| Art. 17 — Droit à l'effacement | Logs exemptés (intérêt légitime). Pseudonymisation possible. |
| Art. 20 — Droit à la portabilité | exportAudit() — CSV, Excel |
| Art. 30 — Registre des traitements | Audit log = preuve de traitement |
| Art. 32 — Sécurité | Immuabilité, accès restreint |
| Art. 33 — Notification de violation | Les logs permettent de documenter une violation |

### ISO 27001

| Contrôle | Couverture |
|----------|-----------|
| A.12.4.1 — Journalisation des événements | Tous les événements de domaine journalisés |
| A.12.4.2 — Protection des journaux | Immuabilité, pas de suppression |
| A.12.4.3 — Journaux administrateur | isSystemEvent distingue actions système |
| A.9.4.2 — Connexion sécurisée | LOGIN_SUCCESS, LOGIN_FAILED tracés |
| A.16.1.1 — Gestion des incidents | AuditExportResult pour dossiers d'incident |

### SOC 2

| Critère | Couverture |
|---------|-----------|
| CC6.1 — Accès logique | Toutes les connexions auditées |
| CC6.2 — Nouvelles ressources | USER_CREATED, MODULE_ENABLED tracés |
| CC6.3 — Modifications d'accès | USER_UPDATED tracé |
| CC7.2 — Monitoring de la sécurité | LOGIN_FAILED, ipAddress pour anomalies |
| CC7.3 — Incident management | Export signé pour dossiers d'incident |
| CC9.2 — Gestion des changements | before/after diff pour chaque modification |

---

## Performance et volumes

### Estimation de volume

- 50 utilisateurs actifs par organisation : ~250 000 lignes/an
- 100 organisations : ~25 000 000 lignes/an

### Stratégies

**Partitionnement PostgreSQL (RANGE par mois)**
Permet de supprimer des partitions entières pour l'archivage sans toucher aux données récentes.

**Index composites**
Les 11 index sont choisis pour les requêtes les plus fréquentes.

**Pagination obligatoire**
Maximum 500 résultats par page sur toutes les méthodes de lecture.

**Archivage progressif**
- 0–3 mois : table principale (lecture rapide)
- 3–12 mois : partition froide (index réduit)
- > 12 mois : archivage S3 / Supabase Storage (format Parquet)
- > 7 ans : suppression légale (selon réglementation locale)

**Compression**
Les colonnes metadata, before, after (JSONB) sont compressées automatiquement par PostgreSQL (TOAST).

---

## Compatibilité avec l'architecture existante

| Composant | Compatibilité |
|-----------|---------------|
| Event Bus (Ticket 017) | OK — AuditListener branché sur tous les événements |
| Multi-tenant (Ticket 014) | OK — organizationId dans chaque AuditEvent |
| Business Units (Ticket 014B) | OK — businessUnitId dans chaque AuditEvent |
| White Label (Ticket 014C) | OK — exports peuvent être brandés |
| Module Engine (Ticket 016) | OK — AUDIT_LOG feature flag, REPORTING module |
| Auth / Supabase | OK — userId dans chaque AuditEvent |
| Prisma | OK — modèle AuditEvent dans schema.prisma |

---

*Document créé avec le Ticket 018 — Audit Engine*
