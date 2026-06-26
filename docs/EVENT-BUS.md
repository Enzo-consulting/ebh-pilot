# Event Bus — EBH-Pilot

> Ticket 017 — Core Event Bus & Domain Events

---

## Philosophie

EBH-Pilot est une plateforme SaaS multi-tenant conçue pour évoluer vers une architecture de microservices ou de modules découplés. Pour y parvenir sans réécrire le code métier, nous utilisons un **Event Bus** (bus d'événements) comme colonne vertébrale de communication interne.

Le principe fondamental est le suivant :

> **Les modules ne se parlent pas directement. Ils parlent à travers des événements.**

Un module qui crée un prospect n'a pas besoin de savoir qu'un autre module va envoyer une notification, écrire un journal d'audit, déclencher un workflow ou synchroniser une application mobile. Il émet simplement un événement `PROSPECT_CREATED` et son travail est terminé.

---

## Architecture

```
Route HTTP (Express)
       │
       ▼
  Business Logic
  (création, modification, suppression)
       │
       ▼
  emitEvent()      ← fire-and-forget, ne bloque pas la réponse HTTP
       │
       ▼
  EventBus.emit()
       │
       ├──▶ NotificationListener   (in-app, email, push, SMS, WhatsApp)
       ├──▶ AuditListener          (journal d'audit immuable)
       ├──▶ WorkflowListener       (séquences automatisées)
       ├──▶ StatisticsListener     (compteurs, BI, reporting)
       ├──▶ AIListener             (routage IA, usage, quota)
       ├──▶ MobileSyncListener     (sync React Native / Flutter)
       └──▶ DocumentListener       (archivage, signatures)
```

Chaque listener est **totalement indépendant**. Aucun listener ne connaît les autres. Chaque listener peut être activé, désactivé, remplacé ou étendu sans modifier les routes ni les autres listeners.

---

## Découplage

Le découplage est l'objectif principal du bus d'événements.

**Avant le bus (couplage fort) :**
```typescript
// La route doit connaître toutes les conséquences de sa propre action
await createProspect(data);
await sendNotification(userId, 'New prospect');
await writeAuditLog('PROSPECT_CREATED', ...);
await triggerWorkflow('prospect-onboarding', ...);
await updateStatistics('prospects', organizationId);
await syncMobile(userId, 'prospect', prospect.id);
```

**Après le bus (couplage faible) :**
```typescript
// La route ne connaît que son propre travail
const prospect = await createProspect(data);
emitEvent(req, DomainEvent.PROSPECT_CREATED, {
  resourceType: 'prospect',
  resourceId: prospect.id,
  metadata: { prospectName: prospect.name },
});
```

La route est passée de 6 dépendances à 1. Les 5 autres peuvent être ajoutées, modifiées ou supprimées sans toucher la route.

---

## Fichiers

```
apps/api/src/events/
├── index.ts              ← Point d'entrée unique + singleton + helpers
├── types.ts              ← DomainEvent enum + DomainEventPayload interface
├── eventBus.ts           ← IEventBus interface + InMemoryEventBus
├── listenerRegistry.ts   ← registerListener() + bootstrapListeners()
└── listeners/
    └── index.ts          ← 7 listeners squelettes
```

---

## Événements disponibles

| Événement | Déclencheur |
|-----------|-------------|
| `USER_CREATED` | Création d'un utilisateur |
| `USER_UPDATED` | Modification d'un utilisateur |
| `USER_DELETED` | Suppression d'un utilisateur |
| `PROSPECT_CREATED` | Création d'un prospect |
| `PROSPECT_UPDATED` | Modification d'un prospect |
| `PROSPECT_DELETED` | Suppression d'un prospect |
| `CLIENT_CREATED` | Création d'un client |
| `CLIENT_UPDATED` | Modification d'un client |
| `PRODUCT_CREATED` | Création d'un produit |
| `PRODUCT_UPDATED` | Modification d'un produit |
| `IMPORT_STARTED` | Démarrage d'un import |
| `IMPORT_COMPLETED` | Fin d'un import réussi |
| `IMPORT_FAILED` | Échec d'un import |
| `DOCUMENT_GENERATED` | Document généré (PDF, Excel) |
| `DOCUMENT_SIGNED` | Document signé électroniquement |
| `TASK_CREATED` | Création d'une tâche |
| `TASK_COMPLETED` | Tâche terminée |
| `AI_REQUESTED` | Requête IA initiée |
| `AI_COMPLETED` | Requête IA terminée |
| `WORKFLOW_STARTED` | Workflow démarré |
| `WORKFLOW_FINISHED` | Workflow terminé |
| `NOTIFICATION_CREATED` | Notification créée |
| `LOGIN_SUCCESS` | Connexion réussie |
| `LOGIN_FAILED` | Connexion échouée |
| `MODULE_ENABLED` | Module activé (Ticket 016) |
| `FEATURE_ENABLED` | Fonctionnalité activée (Ticket 016) |

---

## Listeners disponibles

| Listener | Statut | Rôle futur |
|----------|--------|------------|
| `NotificationListener` | Squelette | In-app, email, push, SMS, WhatsApp |
| `AuditListener` | Squelette | Journal d'audit immuable (RGPD, ISO 27001) |
| `WorkflowListener` | Squelette | Séquences automatisées, approbations, SLA |
| `StatisticsListener` | Squelette | Compteurs temps réel, BI, reporting |
| `AIListener` | Squelette | Routage IA, usage, quota, cache |
| `MobileSyncListener` | Squelette | Sync React Native / Flutter, push, GPS |
| `DocumentListener` | Squelette | Archivage, signatures, expiry |

---

## Utilisation (future)

### Émettre un événement depuis une route

```typescript
import { emitEvent, DomainEvent } from '../events/index.js';

router.post('/', injectAuthUser, async (req, res) => {
  const prospect = await prisma.prospect.create({ data: { ... } });

  res.status(201).json(prospect);

  // Fire-and-forget — ne pas await
  emitEvent(req, DomainEvent.PROSPECT_CREATED, {
    resourceType: 'prospect',
    resourceId: prospect.id,
    metadata: { prospectName: prospect.name, source: 'manual' },
  });
});
```

### Créer un nouveau listener

```typescript
// 1. Ajouter dans listeners/index.ts
export async function MyNewListener(payload: DomainEventPayload): Promise<void> {
  const { event, organizationId, userId, resourceId, metadata } = payload;
  // Votre logique ici
  return Promise.resolve();
}

// 2. Enregistrer dans listenerRegistry.ts
import { MyNewListener } from './listeners/index.js';
registerListener(DomainEvent.PROSPECT_CREATED, MyNewListener);
```

C'est tout. Aucune route ne change.

### Ajouter un nouvel événement

```typescript
// Dans types.ts, ajouter dans l'enum :
export enum DomainEvent {
  // ...
  QUOTE_CREATED = 'QUOTE_CREATED',
}

// Puis l'émettre depuis la route concernée
emitEvent(req, DomainEvent.QUOTE_CREATED, { ... });

// Et enregistrer les listeners dans listenerRegistry.ts
registerListener(DomainEvent.QUOTE_CREATED, AuditListener);
registerListener(DomainEvent.QUOTE_CREATED, NotificationListener);
```

---

## Démarrage (bootstrapListeners)

L'enregistrement des listeners doit être appelé **une seule fois** au démarrage de l'application, avant que les routes ne soient servies.

```typescript
// Dans apps/api/src/index.ts
import { bootstrapListeners } from './events/index.js';

bootstrapListeners();

// Ensuite, démarrer le serveur HTTP
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
```

---

## Performance

### Comportement actuel (InMemoryEventBus)

- Tous les listeners sont appelés en parallèle via `Promise.allSettled()`
- Un listener lent ne bloque pas les autres
- Une erreur dans un listener ne se propage pas
- La réponse HTTP est envoyée AVANT que les listeners ne se terminent

### Limitations actuelles

- **Non-durable** : les événements sont perdus en cas de crash du processus
- **Non-distribué** : les événements ne sont pas partagés entre plusieurs instances

### Évolution vers un bus distribué

L'interface `IEventBus` permet de remplacer `InMemoryEventBus` sans modifier le code métier.

| Transport | Cas d'usage |
|-----------|-------------|
| `InMemoryEventBus` | Monolithe, développement, faible trafic |
| `RedisEventBus` | Multi-instances, partage d'événements |
| `RabbitMQEventBus` | Microservices, routage complexe |
| `KafkaEventBus` | Très haut volume, stream processing |
| `NATSEventBus` | Edge computing, IoT, mobile |

Pour migrer vers Redis par exemple :

```typescript
// Créer apps/api/src/events/redisEventBus.ts
export class RedisEventBus implements IEventBus {
  // Implémenter les mêmes méthodes
}

// Dans events/index.ts, remplacer simplement :
// export const eventBus = new InMemoryEventBus();
// par :
// export const eventBus = new RedisEventBus(redisClient);
```

Aucune route, aucun listener ne change.

---

## Liens avec les autres moteurs

### Workflow Engine (futur ticket)

Le `WorkflowListener` recevra les événements et déclenchera des séquences automatisées. Le Workflow Engine pourra lui-même émettre des événements (`WORKFLOW_STARTED`, `WORKFLOW_FINISHED`) pour que d'autres listeners réagissent.

### Notification Engine (futur ticket)

Le `NotificationListener` sera l'interface entre le bus d'événements et tous les canaux de notification. Il lira les préférences de l'utilisateur et de l'organisation pour choisir le bon canal (in-app, email, push, SMS, WhatsApp).

### Audit Engine (futur ticket)

Le `AuditListener` sera enregistré sur TOUS les événements du bus. Il écrira une entrée immuable dans une table `AuditLog` pour chaque action. Cette table servira pour la conformité (RGPD, ISO 27001, SOC 2) et pour les fonctionnalités d'historique et d'annulation.

### Mobile (Ticket 016 préparation)

Le `MobileSyncListener` poussera les changements de données vers les clients mobiles (React Native / Flutter). Il gérera :
- Synchronisation en temps réel (WebSockets)
- Synchronisation hors ligne (queue)
- Notifications push (FCM, APNs)
- GPS, QR, code-barre (données contextuelles)

### IA (futur ticket)

L'`AIListener` routera les requêtes IA vers le bon fournisseur (OpenAI, Anthropic, Mistral) selon la feature flag activée. Il loguera l'usage pour la facturation et le quota.

### Documents (futur ticket)

Le `DocumentListener` archivera les documents générés, notifiera les utilisateurs, et tracera les signatures électroniques (YouSign, DocuSign).

---

## Compatibilité avec l'architecture existante

| Composant | Compatibilité |
|-----------|---------------|
| Multi-tenant (Ticket 014) | ✅ — `organizationId` dans chaque payload |
| Business Units (Ticket 014B) | ✅ — `businessUnitId` dans chaque payload |
| White Label (Ticket 014C) | ✅ — listeners peuvent lire le branding |
| Module Engine (Ticket 016) | ✅ — listeners peuvent vérifier `hasModule()` / `hasFeature()` |
| Auth / Supabase | ✅ — `userId` dans chaque payload |
| Prisma | ✅ — listeners peuvent interroger Prisma |

---

*Document créé avec le Ticket 017 — Core Event Bus & Domain Events*
