# Progression Engine — EBH-Pilot

> **Ticket 021C** — XP Engine & Progression
> Dépendances : Ticket 014 (Multi-tenant), 014B (BU), 014C (White Label), 015 (Permissions), 016 (Modules), 017 (Event Bus), 018 (Audit), 019 (Tenant Config), 020 (Performance Engine), 021A (KPI), 021B (Ranking)

---

## Philosophie

Le Progression Engine transforme la **performance brute** en **expérience engageante**.

L'idée centrale : chaque action positive d'un utilisateur dans EBH-Pilot mérite une récompense symbolique. Cette récompense prend la forme d'**expérience (XP)**, qui fait progresser l'utilisateur à travers des **niveaux** visibles sur son profil.

Ce mécanisme s'appuie sur trois ressorts psychologiques éprouvés :

1. **Progression visible** — l'utilisateur voit sa barre XP avancer en temps réel.
2. **Jalons clairs** — chaque niveau a un nom, une couleur, une icône. Passer de "Junior" à "Expert" est un événement mémorable.
3. **Historique permanent** — le parcours est conservé dans `UserLevelHistory`. L'utilisateur peut voir d'où il vient.

Le moteur est **totalement générique** : il ne contient aucune logique automobile, immobilière ou sectorielle. Il fonctionne pour tout métier, toute organisation, tout pays.

---

## Architecture

```
apps/api/src/progression/
├── types.ts             # Contrats TypeScript, constantes, valeurs par défaut
├── xpService.ts         # Mutations XP (grantXp, removeXp)
├── levelService.ts      # Résolution des niveaux (lecture seule)
├── promotionService.ts  # Détection promotion/rétrogradation, UserLevelHistory
└── index.ts             # Barrel export + Event Bus hooks commentés
```

### Séparation des responsabilités

| Service | Rôle | Écrit en DB | Émet des events |
|---|---|---|---|
| `xpService` | Mutations XP | Oui (XpTransaction, UserExperience) | Oui (XP_GAINED, XP_REMOVED) |
| `levelService` | Résolution niveaux | Non | Non |
| `promotionService` | Promotion/rétrogradation | Oui (UserLevelHistory, UserExperience) | Oui (USER_LEVEL_UP) |

**Règle absolue** : `xpService` appelle toujours `promotionService` après chaque mutation XP. Jamais l'inverse.

---

## Modèles Prisma

### UserExperience

Un seul enregistrement par utilisateur (`@unique userId`).

| Champ | Type | Description |
|---|---|---|
| totalXp | Int | XP cumulé sur la période courante |
| currentLevel | Int | Niveau actuel (mis à jour par PromotionService) |
| currentLevelXp | Int | XP depuis le début du niveau courant (snapshot) |
| nextLevelXp | Int | XP requis pour le prochain niveau (snapshot) |
| lifetimeXp | Int | XP total historique (jamais réinitialisé) |

> **lifetimeXp** ne descend jamais. C'est un compteur définitif de la somme de toutes les contributions positives de l'utilisateur.

### LevelDefinition

Définition d'un niveau. Peut être :
- **Système** (`isDefault = true`, `organizationId = null`) — partagé par toutes les orgs non personnalisées
- **Personnalisé** (`organizationId = orgId`) — override complet pour une organisation

| Champ | Type | Description |
|---|---|---|
| level | Int | Numéro de niveau (1-based) |
| title | String | Libellé affiché ("Expert", "Champion"...) |
| minXp | Int | XP minimum pour atteindre ce niveau |
| icon | String? | Emoji, nom d'icône ou URL |
| color | String? | Couleur HEX (#6366F1) |
| rewardJson | Json | Récompenses déclenchées à l'atteinte (Ticket 020B) |
| isDefault | Boolean | True = niveau système |

### UserLevelHistory

Historique immuable des montées/baisses de niveau. **Jamais supprimé.**

| Champ | Type | Description |
|---|---|---|
| oldLevel | Int | Niveau avant changement |
| newLevel | Int | Niveau après changement |
| xpAtPromotion | Int | XP total au moment du changement |
| promotedAt | DateTime | Horodatage précis |

### XpTransaction

Audit log complet de chaque gain ou perte de XP.

| Champ | Type | Description |
|---|---|---|
| sourceEvent | XpSourceEvent | Événement déclencheur |
| sourceResource | String? | Type de ressource (ex. "Badge", "Goal") |
| sourceResourceId | String? | ID de la ressource pour traçabilité complète |
| xp | Int | Montant (positif = gain, négatif = retrait) |
| balanceAfter | Int | XP total après cette transaction |
| reason | String? | Motif lisible par un humain |
| metadata | Json | Contexte libre (pour debug, stats, IA) |

---

## Calcul XP

### Source des montants

Tous les montants XP sont configurables par organisation via `OrganizationSetting` (Ticket 019).

```
Clé de setting           Valeur par défaut
────────────────────────────────────────────
xp_prospect_created      10
xp_client_created        25
xp_sale_completed        50
xp_goal_reached          100
xp_challenge_completed   75
xp_badge_common          15
xp_badge_rare            30
xp_badge_epic            60
xp_badge_legendary       150
xp_daily_login           5
xp_streak_bonus          20
```

Si aucun setting n'est défini pour l'organisation, les valeurs ci-dessus s'appliquent.

### Exemples

```typescript
// Accorder 50 XP pour une vente conclue
await grantXp({
  organizationId: 'org-123',
  userId: 'user-456',
  xp: 50,
  sourceEvent: 'SALE_COMPLETED',
  sourceResource: 'Prospect',
  sourceResourceId: 'prospect-789',
  reason: 'Vente conclue — Prospect ACME Corp',
  seasonId: 'season-2024-Q1',
});

// Lire le snapshot complet
const snapshot = await getUserExperience('org-123', 'user-456');
// {
//   totalXp: 450, currentLevel: 3, progressPercent: 62,
//   remainingXp: 150, currentLevelTitle: 'Confirmé', ...
// }
```

---

## Niveaux & Progression

### Niveaux système par défaut

| Niveau | Titre | XP minimum | Icône | Couleur |
|---|---|---|---|---|
| 1 | Recrue | 0 | 🌱 | #94A3B8 |
| 2 | Junior | 100 | ⚡ | #60A5FA |
| 3 | Confirmé | 400 | 🔥 | #34D399 |
| 4 | Senior | 900 | 💪 | #FBBF24 |
| 5 | Expert | 1 600 | 🎯 | #F97316 |
| 6 | Spécialiste | 2 500 | 🏆 | #EF4444 |
| 7 | Référent | 3 600 | 🌟 | #8B5CF6 |
| 8 | Leader | 4 900 | 👑 | #EC4899 |
| 9 | Champion | 6 400 | ⚔️ | #F59E0B |
| 10 | Légende | 8 100 | 🦁 | #6366F1 |

**Formule** : `minXp(level) = (level - 1)² × 100` — progression quadratique intentionnelle. Les premiers niveaux se gagnent vite (engagement immédiat), les derniers nécessitent un investissement long terme (rétention).

### Personnalisation White Label (Ticket 014C)

Chaque organisation peut remplacer les niveaux système par son propre référentiel :

```prisma
// Exemple : organisation automobile avec une progression métier
LevelDefinition { level: 1, title: "Stagiaire",   minXp: 0,    organizationId: "org-auto" }
LevelDefinition { level: 2, title: "Conseiller",  minXp: 100,  organizationId: "org-auto" }
LevelDefinition { level: 3, title: "Expert Auto", minXp: 400,  organizationId: "org-auto" }
```

La résolution se fait en deux passes : org-spécifique d'abord, fallback système ensuite.

---

## Promotions automatiques

### Algorithme

```
grantXp()
  └─► applyXpDelta()        — Prisma transaction atomique
        ├─ upsert UserExperience (totalXp, lifetimeXp)
        └─ create XpTransaction
  └─► recalculateLevel()    — PromotionService
        ├─ computeProgress() — LevelService
        ├─ [si changement] Prisma transaction
        │     ├─ update UserExperience (currentLevel, currentLevelXp, nextLevelXp)
        │     └─ create UserLevelHistory
        └─ [si promotion] emit USER_LEVEL_UP — Event Bus (Ticket 017)
  └─► emit XP_GAINED        — Event Bus (Ticket 017)
```

### Idempotence

`recalculateLevel()` est **idempotente** : si le niveau calculé est identique au niveau stocké, aucune écriture ne se produit. Cela permet de l'appeler après une correction de XP ou un recalcul batch sans effet de bord.

### Rétrogradetion

Si du XP est retiré (`removeXp()`) et que l'utilisateur repasse sous le seuil de son niveau actuel, `recalculateLevel()` détectera la rétrogradation et créera un `UserLevelHistory` avec `{ promoted: false, demoted: true }`.

---

## DomainEvents émis

| Event | Quand | Payload clé |
|---|---|---|
| `XP_GAINED` | Après chaque `grantXp()` | userId, xp, balanceAfter, sourceEvent |
| `XP_REMOVED` | Après chaque `removeXp()` | userId, xp (négatif), balanceAfter |
| `USER_LEVEL_UP` | Lors d'une promotion | userId, previousLevel, newLevel, newLevelTitle |
| `USER_NEW_TITLE` | Réservé future (nouveau badge de titre) | — |

Ces events sont consommables par : NotificationEngine, ActivityFeedEngine, CoachEngine, LeagueEngine.

---

## Event Bus Hooks (futurs — Ticket 022)

Les abonnements suivants sont **préparés mais non connectés** dans `index.ts` :

| DomainEvent reçu | Action déclenchée |
|---|---|
| `PROSPECT_CREATED` | `grantXp({ sourceEvent: 'PROSPECT_CREATED', xp: config.xp_prospect_created })` |
| `CLIENT_CREATED` | `grantXp({ sourceEvent: 'CLIENT_CREATED', xp: config.xp_client_created })` |
| `SALE_COMPLETED` | `grantXp({ sourceEvent: 'SALE_COMPLETED', xp: config.xp_sale_completed })` |
| `GOAL_REACHED` | `grantXp({ sourceEvent: 'GOAL_REACHED', xp: config.xp_goal_reached })` |
| `BADGE_EARNED` | `grantXp({ sourceEvent: 'BADGE_EARNED', xp: config.xp_badge_* })` |
| `CHALLENGE_COMPLETED` | `grantXp({ sourceEvent: 'CHALLENGE_COMPLETED', xp: config.xp_challenge_completed })` |
| `USER_CREATED` | `initializeUserExperience()` (level 1, 0 XP) |

Pour activer ces hooks, décommenter le bloc dans `index.ts` et créer un `ProgressionListener` dans `events/listeners/`.

---

## Compatibilité avec les autres tickets

| Ticket | Compatibilité | Détail |
|---|---|---|
| **014** Multi-tenant | ✅ | `organizationId` sur tous les modèles, toutes les queries |
| **014B** Business Units | ✅ | `organizationId` couvre l'arborescence BU→Site→Secteur |
| **014C** White Label | ✅ | `LevelDefinition` org-spécifique (titres, icônes, couleurs) |
| **015** Permissions | ✅ | Aucune route exposée (pas d'API REST dans ce ticket) |
| **016** Modules | ✅ | Le module `LEADERBOARD` peut conditionner l'accès XP |
| **017** Event Bus | ✅ | Émet `XP_GAINED`, `USER_LEVEL_UP`. Hooks préparés pour PROSPECT_CREATED etc. |
| **018** Audit | ✅ | `XpTransaction` est le registre d'audit du moteur XP |
| **019** Tenant Config | ✅ | Montants XP lus depuis `OrganizationSetting` via `getXpAmount()` |
| **020** Performance Engine | ✅ | Les badges, challenges, goals peuvent appeler `grantXp()` |
| **020B** Engagement Engine | ✅ | `UserExperience.totalXp` alimente `UserPublicProfile.totalXp` et `currentLevel` |
| **021A** KPI Engine | ✅ | `KPI_RECORDED` peut déclencher `grantXp()` via hook |
| **021B** Ranking Engine | ✅ | `getTopXpUsers()` expose un leaderboard XP natif |

---

## Mobile (React Native)

Les données sont préparées pour les composants suivants :

| Composant | Données exposées par |
|---|---|
| **Barre XP** circulaire | `getUserExperience().progressPercent`, `currentLevelXp`, `nextLevelXp` |
| **Animation Level Up** | `XpOperationResult.leveledUp`, `newLevelTitle` |
| **Carte profil** | `UserExperienceSnapshot.currentLevelTitle`, `currentLevelIcon`, `currentLevelColor` |
| **Historique XP** | `XpTransaction[]` (pagination à implémenter) |
| **Top classement XP** | `getTopXpUsers()` |
| **Prochaine récompense** | `getNextReward()` |

Aucune interface n'est implémentée dans ce ticket — uniquement les services qui alimenteront les composants React Native.

---

## Intégration IA (futur)

`XpTransaction.metadata` est un champ JSON libre qui permet au futur moteur IA de :
- Analyser les patterns de progression (vitesse, régularité, sources de XP)
- Générer des insights pour le Coach quotidien (Ticket 020B)
- Détecter des anomalies (gain de XP anormal = possible correction requise)

---

## Évolutions futures

| Priorité | Feature | Description |
|---|---|---|
| 🔴 Haute | Connecter les Event Bus hooks | Activer les abonnements PROSPECT_CREATED, etc. |
| 🔴 Haute | API REST XP | `GET /users/:id/experience`, `GET /organizations/:id/xp-leaderboard` |
| 🟡 Moyenne | Saisons XP | Réinitialiser `totalXp` en fin de saison, conserver `lifetimeXp` |
| 🟡 Moyenne | Cache LevelDefinitions | TTL 5 min pour éviter les requêtes répétées (hot path) |
| 🟡 Moyenne | XP négatif configuré | Option pour désactiver les rétrogradeations par org |
| 🟢 Basse | XP bonus de streak | Logique de streak quotidienne |
| 🟢 Basse | Classement XP global | Cross-organisation pour les tops annuels |
| 🟢 Basse | Niveaux infinis | Algorithme de génération pour levels > 10 |

---

## Garanties de non-régression

Ce ticket :
- ✅ N'a modifié **aucune route API existante**
- ✅ N'a modifié **aucun service existant** (performance, audit, events)
- ✅ N'a ajouté que des modèles Prisma **additifs** (aucune colonne supprimée/modifiée)
- ✅ Les nouvelles relations sur `User`, `Organization`, `Season` sont **optionnelles** (nullable / array)
- ✅ Les nouveaux `DomainEventType` sont **additifs** (aucun enum existant modifié)
