# Integration Engine & Domain Hooks

**Ticket 022 — EBH Pilot**

---

## Philosophie

L'Integration Engine connecte tous les moteurs métier existants via le Domain Event Bus.  
Aucun moteur ne connaît les autres. Le seul point commun est l'événement de domaine.

**Principe fondamental :**
> Un événement émis → tous les moteurs concernés réagissent → indépendamment → sans blocage.

---

## Architecture

```
Route / Worker
    ↓
emitBusinessEvent() / emitSystemEvent()
    ↓
EventBus (InMemoryEventBus)
    ↓
[Promise.allSettled — tous les listeners en parallèle]
    ↓
Hook 1    Hook 2    Hook 3    ...
  KPI      XP      Badges    Leaderboard   Audit   Dashboard   Mobile   IA
```

### Démarrage

```typescript
// apps/api/src/index.ts
bootstrapListeners();  // Ticket 017 — listeners existants
bootstrapHooks();      // Ticket 022 — nouveaux hooks métier
```

---

## Flux d'exécution par événement

### PROSPECT_CREATED
```
PROSPECT_CREATED
  ├── KPI Engine         → recordKpiValue('prospects_created')
  ├── XP Engine          → grantXp(PROSPECT_CREATED)
  ├── Badge Engine       → evaluateBadges('prospects_created')
  ├── Leaderboard Engine → computeLeaderboard('prospects_created')
  ├── Audit Engine       → createAudit(PROSPECT_CREATED)
  └── Notification Hook  → sendNotification('prospect_created')
```

### CLIENT_CREATED
```
CLIENT_CREATED
  ├── KPI Engine         → recordKpiValue('clients_created')
  ├── XP Engine          → grantXp(CLIENT_CREATED)
  ├── Badge Engine       → evaluateBadges('clients_created')
  ├── Leaderboard Engine → computeLeaderboard('clients_created')
  ├── Audit Engine       → createAudit(CLIENT_CREATED)
  └── Notification Hook  → sendNotification('client_created')
```

### LOGIN_SUCCESS
```
LOGIN_SUCCESS
  ├── XP Engine          → grantXp(daily login, 5 XP)
  └── Leaderboard Engine → computeLeaderboard('login_streak')
```

### CHALLENGE_COMPLETED
```
CHALLENGE_COMPLETED
  ├── XP Engine     → grantXp(CHALLENGE_COMPLETED)
  ├── Badge Engine  → evaluateBadges('challenges_completed')
  ├── Audit Engine  → createAudit(CHALLENGE_COMPLETED)
  └── Notification  → sendNotification('challenge_completed')
```

### GOAL_REACHED
```
GOAL_REACHED
  ├── XP Engine          → grantXp(GOAL_REACHED)
  ├── Badge Engine       → evaluateBadges('goals_reached')
  ├── Leaderboard Engine → computeLeaderboard('goals_reached')
  ├── Audit Engine       → createAudit(GOAL_REACHED)
  └── Notification       → sendNotification('goal_reached')
```

### BADGE_EARNED
```
BADGE_EARNED
  ├── Activity Feed      → addActivityFeedEntry(badge_earned)
  ├── Audit Engine       → createAudit(BADGE_EARNED)
  └── Notification       → sendNotification('badge_earned')
```

### USER_LEVEL_UP
```
USER_LEVEL_UP
  ├── Activity Feed      → addActivityFeedEntry(level_up)
  ├── Leaderboard Engine → computeLeaderboard('user_level')
  ├── Audit Engine       → createAudit(USER_LEVEL_UP)
  └── Notification       → sendNotification('level_up')
```

### DOCUMENT_SIGNED / DOCUMENT_GENERATED
```
DOCUMENT_SIGNED / DOCUMENT_GENERATED
  ├── KPI Engine    → recordKpiValue('documents_signed/generated')
  └── Audit Engine  → createAudit(DOCUMENT_*)
```

### IMPORT_COMPLETED
```
IMPORT_COMPLETED
  ├── KPI Engine         → recordKpiValue('imports_completed')
  ├── Leaderboard Engine → computeLeaderboard('imports_completed')
  └── Audit Engine       → createAudit(IMPORT_COMPLETED)
```

---

## Fichiers créés

### Cache Layer (`apps/api/src/cache/`)

| Fichier | Description |
|---------|-------------|
| `types.ts` | ICache interface, CacheNamespace, CacheEntry, CacheOptions |
| `memoryCache.ts` | Implémentation in-memory avec TTL et tags |
| `redisCache.ts` | Stub Redis (non implémenté — interface uniquement) |
| `cacheFactory.ts` | Factory + 5 singletons (dashboard, leaderboard, settings, levels, branding) |
| `index.ts` | Barrel export |

### Event Infrastructure (`apps/api/src/events/`)

| Fichier | Description |
|---------|-------------|
| `eventMetrics.ts` | EventMetrics engine — compteurs, timing, erreurs |
| `emitBusinessEvent.ts` | Helper emitBusinessEvent() + emitSystemEvent() + EVENT_DEBUG |
| `hookRegistry.ts` | bootstrapHooks() — centralise tous les hooks |

### Hooks (`apps/api/src/events/hooks/`)

| Fichier | Événements | Moteurs |
|---------|-----------|---------|
| `prospectHooks.ts` | PROSPECT_CREATED/UPDATED/DELETED | KPI, XP, Badge, Leaderboard, Audit |
| `clientHooks.ts` | CLIENT_CREATED/UPDATED | KPI, XP, Badge, Leaderboard, Audit |
| `productHooks.ts` | PRODUCT_CREATED/UPDATED | KPI, Audit |
| `userHooks.ts` | USER_CREATED/UPDATED | Audit |
| `loginHooks.ts` | LOGIN_SUCCESS/FAILED | XP, Leaderboard, Audit |
| `challengeHooks.ts` | CHALLENGE_COMPLETED | XP, Badge, Audit |
| `goalHooks.ts` | GOAL_REACHED | XP, Badge, Leaderboard, Audit |
| `badgeHooks.ts` | BADGE_EARNED | ActivityFeed, Audit |
| `levelHooks.ts` | USER_LEVEL_UP | ActivityFeed, Leaderboard, Audit |
| `documentHooks.ts` | DOCUMENT_SIGNED/GENERATED | KPI, Audit |
| `importHooks.ts` | IMPORT_COMPLETED/FAILED | KPI, Leaderboard, Audit |
| `notificationHooks.ts` | 6 événements cross-domaine | Notification stubs |

---

## Protections & Résilience

### Pattern de protection par hook

```typescript
try {
  await engine.action(...);
} catch (err) {
  errors++;
  console.error('[HookName] Error:', err);
}
// Never throws — logged internally
```

### Garanties

- ✅ Un hook défaillant n'empêche jamais les autres
- ✅ Aucun hook ne bloque la réponse HTTP
- ✅ Aucun hook ne propage d'exception
- ✅ Chaque hook est indépendant et idempotent
- ✅ Promise.allSettled() sur tous les listeners (EventBus)

---

## Mode Debug

Activer avec `EVENT_DEBUG=true` dans l'environnement.

Logs produits :
- Événement reçu (type, resourceId, organizationId, userId)
- Moteur appelé (KPI, XP, Badge, etc.)
- Durée d'exécution (ms)
- Erreurs détaillées
- Succès confirmés

---

## Cache

### Namespaces disponibles

| Singleton | Usage | TTL recommandé |
|-----------|-------|----------------|
| `dashboardCache` | Données dashboard par user | 60-300s |
| `leaderboardCache` | Classements calculés | 60-600s |
| `settingsCache` | Paramètres organisation | 300-3600s |
| `levelsCache` | Définitions de niveaux | 3600s+ |
| `brandingCache` | Branding white-label | 3600s |

### Évolution vers Redis

```typescript
// cacheFactory.ts — Changer le driver:
// CACHE_DRIVER=redis → CacheFactory retourne RedisCache
// Aucun hook ou engine n'a besoin de changer
```

---

## Métriques

`EventMetrics` (singleton) trace automatiquement :

- `totalEvents` — nombre total d'événements émis
- `totalListeners` — nombre total d'exécutions de listeners
- `totalErrors` — erreurs cumulées
- `avgDurationMs` — temps moyen par listener
- `maxDurationMs` — temps maximum observé
- `byEvent` — breakdown par type d'événement

---

## Évolution vers Redis/Kafka

L'architecture est conçue pour un remplacement transparent du bus d'événements :

```typescript
// eventBus.ts — Implémenter IEventBus:
class RedisEventBus implements IEventBus { ... }
class KafkaEventBus implements IEventBus { ... }
class NATSEventBus implements IEventBus { ... }

// index.ts — Remplacer le singleton:
export const eventBus: IEventBus = new RedisEventBus();
// Aucun hook ne change — ils utilisent tous eventBus
```

---

## Compatibilité avec les tickets précédents

| Ticket | Moteur | Intégration |
|--------|--------|-------------|
| 014 | Multi-tenant | organizationId injecté dans tous les payloads |
| 014B | Business Units | businessUnitId dans les payloads |
| 014C | White-label | brandingCache préparé |
| 015 | Module Engine | Feature flags respectés (hooks n'activent pas de modules désactivés) |
| 016 | Mobile | Mobile stubs prêts dans les hooks |
| 017 | EventBus | Même singleton utilisé |
| 018 | Audit Engine | createAudit() appelé dans chaque hook concerné |
| 019 | Tenant Config | settingsCache préparé |
| 020 | Performance | recordKpiValue() + computeLeaderboard() + evaluateBadges() |
| 020B | Challenges | CHALLENGE_COMPLETED hook connecté |
| 021A | XP Engine | grantXp() appelé dans les hooks CRM + gamification |
| 021B | Leaderboard | computeLeaderboard() appelé dans 5 hooks |
| 021C | Progression | grantXp() + resolveXpAmount() depuis xpService |
| 021D | Dashboard | addActivityFeedEntry() depuis activityFeedService |

---

## Bonnes pratiques

1. **Toujours utiliser emitBusinessEvent()** dans les routes (inject context auto)
2. **Ne jamais importer un hook depuis un autre hook** (couplage interdit)
3. **Chaque hook = un fichier = un domaine** (prospectHooks, clientHooks, etc.)
4. **Un hook défaillant = error logged, pas exception propagée**
5. **EVENT_DEBUG=true** pour diagnostiquer les performances en développement
6. **Utiliser emitSystemEvent()** pour les workers/jobs sans Request

---

*Ticket 022 — Implémenté le 2026-06-30*
