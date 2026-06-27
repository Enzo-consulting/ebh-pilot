# Dashboard Engine — EBH-Pilot

> **Ticket 021D** — Dashboard Engine & Public Profiles
> Dépendances : Ticket 014 (Multi-tenant), 014B (BU), 014C (White Label), 015 (Permissions), 016 (Modules), 017 (Event Bus), 018 (Audit), 019 (Tenant Config), 020 (Performance Engine), 020B (Engagement Engine), 021A (KPI), 021B (Ranking), 021C (Progression)

---

## Philosophie

Le Dashboard Engine est le **moteur d'agrégation central** d'EBH-Pilot.

Son rôle est simple mais essentiel : **collecter, assembler et formater** les données produites par tous les autres moteurs afin de les exposer aux interfaces Web et Mobile sous forme de DTOs prêts à l'emploi.

**Ce moteur ne calcule rien.** Il ne crée pas de KPI, ne classe pas les utilisateurs, n'accorde pas de XP. Il lit, formate, et agrège.

Trois principes fondateurs :

1. **Aggregation over computation** — toute la logique métier reste dans les moteurs amont (021A, 021B, 021C).
2. **Graceful degradation** — un widget défaillant ne casse jamais l'ensemble du dashboard.
3. **White Label by design** — chaque DTO porte une `BrandingConfig` permettant à chaque organisation d'afficher ses propres couleurs, titres et labels.

---

## Architecture

```
apps/api/src/dashboard/
├── types.ts              # DTOs, interfaces, BrandingConfig, AI hooks, Premium interfaces
├── profileService.ts     # Lecture/écriture du profil public
├── widgetService.ts      # Construction de chaque widget
├── activityFeedService.ts # Timeline unifiée (6 sources)
├── dashboardService.ts   # Orchestrateur principal
└── index.ts              # Barrel export
```

### Séparation des responsabilités

| Service | Rôle | Écrit en DB | Sources |
|---|---|---|---|
| `profileService` | Profil public | Oui (UserPublicProfile, ProfileVisit) | UserExperience, LevelDefinition, UserReputationIndex, UserBadge |
| `widgetService` | Widgets individuels | Non | UserKpiValue, LeaderboardEntry, UserExperience, Badge, Challenge, Goal, etc. |
| `activityFeedService` | Timeline unifiée | Non | ActivityFeedEvent, XpTransaction, UserBadge, UserLevelHistory, ProgressionEvent, AuditEvent |
| `dashboardService` | Orchestration | Non | Tous les services ci-dessus |

---

## Widgets

Le Dashboard Engine supporte **17 types de widgets** :

| Widget Type | Source principale | Données clés |
|---|---|---|
| `TODAY_SCORE` | UserKpiValue (021A) | Score du jour + delta vs hier |
| `CURRENT_STREAK` | XpTransaction DAILY_LOGIN (021C) | Jours consécutifs |
| `TODAY_RANKING` | LeaderboardEntry (021B) | Rang actuel + scope |
| `CURRENT_LEVEL` | UserExperience (021C) | Niveau, titre, icône, XP |
| `PROGRESS_BAR` | UserExperience (021C) | Progression % + XP restant |
| `TOP_BADGE` | UserBadge + Badge (020) | Meilleur badge + total |
| `CURRENT_CHALLENGE` | ChallengeParticipant (020) | Avancement + rang |
| `OBJECTIVES` | Goal + GoalProgress (020) | Liste des objectifs actifs |
| `NOTIFICATIONS_SUMMARY` | ProgressionEvent (020B) | Nombre non lus |
| `LEADERBOARD_PREVIEW` | LeaderboardEntry (021B) | Top 5 + rang utilisateur |
| `XP_CARD` | UserExperience (021C) | Widget mobile central |
| `QUICK_ACTIONS` | WidgetConfig.config | Actions configurables |
| `AI_COACH` | DailyCoachMessage (020B) | Message quotidien |
| `REPUTATION_SCORE` | UserReputationIndex (020B) | Score + percentile |
| `AGENDA_SUMMARY` | Futur | Événements à venir |
| `RECENT_DOCUMENTS` | Futur | Derniers documents |
| `RECENT_ACTIVITY` | ActivityFeedService | Timeline embarquée |

### Configuration des widgets (Ticket 019)

Chaque widget peut être personnalisé par organisation via le modèle `WidgetConfig` :
- **label** : libellé affiché ("Mon score du jour")
- **icon** : émoji ou nom d'icône
- **color** : couleur HEX de la carte
- **config** : JSON libre (ex. nombre d'entrées, seuils, actions)
- **isEnabled** : activation/désactivation par org

---

## Dashboard Web

### Sales Rep Dashboard (`getDashboard()`)

Dashboard principal pour les commerciaux. Agrège **14 widgets en parallèle** via `Promise.all()`.

```typescript
const dashboard = await getDashboard({
  organizationId: 'org-123',
  userId: 'user-456',
  activityLimit: 10,
});
// → DashboardDto { widgets: WidgetDto[], recentActivity: ActivityDto[], profile: {...}, branding: BrandingConfig }
```

### Manager Dashboard (`getManagerDashboard()`)

Agrège les données de l'équipe (commerciaux ayant le manager en `managerId`).
- KPI par membre de l'équipe
- Leaderboard de l'équipe
- Activité récente agrégée

### Executive Dashboard (`getExecutiveDashboard()`)

Vue organisation complète :
- Totaux et moyennes de KPI par type
- Top performeurs
- Activité récente

---

## Dashboard Mobile

### Mobile Dashboard (`getMobileDashboard()`)

Optimisé pour les contraintes mobiles :
- **topWidgets** : XpCard + Ranking + Streak (les 3 widgets les plus importants)
- **quickActions** : actions rapides configurable
- **objectives** : objectifs actifs
- **notifications** : résumé non-lus
- **aiCoach** : message du jour

Toutes les données sont pré-formatées pour React Native (pas de transformation frontend nécessaire).

### Realtime Snapshot (`getRealtimeSnapshot()`)

Conçu pour le polling (30s) ou WebSocket push :
```typescript
// Réponse légère
{
  xp: { total: 450, delta: null },
  level: { current: 3, title: 'Confirmé' },
  rank: { current: 7, delta: null },
  streak: { current: 5 },
  unreadNotifications: 2,
  pendingGoals: 1
}
```

---

## Profils Publics

### Modèle `UserPublicProfile` (étendu depuis Ticket 020B)

Champs ajoutés dans ce ticket :

| Champ | Type | Description |
|---|---|---|
| displayName | String? | Nom affiché (distinct du nom de compte) |
| coverImageUrl | String? | Image de couverture du profil |
| currentRank | Int? | Snapshot du classement actuel |
| reputationScore | Decimal? | Score de réputation (020B) |
| totalSales | Int | Ventes totales (snapshot) |
| totalClients | Int | Clients totaux (snapshot) |
| totalProspects | Int | Prospects totaux (snapshot) |
| badgesVisible | Boolean | Contrôle la visibilité des badges |
| achievementsVisible | Boolean | Contrôle la visibilité des réalisations |
| statisticsVisible | Boolean | Contrôle la visibilité des stats |
| profileViews | Int | Compteur de vues |
| lastProfileView | DateTime? | Dernière visite du profil |
| isPublicInsideOrganization | Boolean | Profil visible aux collègues |
| lifetimeXp | Int | XP total historique |

### Fonctions de profil

```typescript
// Lire un profil enrichi
const profile = await getUserProfile(organizationId, userId, viewerUserId);

// Mettre à jour le profil
await updateProfile({ organizationId, userId, displayName: 'Marie D.', badgesVisible: true });

// Enregistrer une visite (fire-and-forget)
await recordProfileView(organizationId, profileUserId, visitorUserId);

// Vue Premium : qui a consulté mon profil
const premium = await getProfileViewers(organizationId, userId);
```

---

## Feed d'activité

### Sources (6 en parallèle)

```
Source              Modèle Prisma          Exemple
──────────────────────────────────────────────────────────
ActivityFeedEvent   activity_feed_events   "Thomas passe Top 10 France"
XpTransaction       xp_transactions        "+150 XP — Vente conclue"
UserBadge           user_badges            "Badge Expert débloqué"
UserLevelHistory    user_level_history     "Passage au niveau Expert"
ProgressionEvent    progression_events     "Entrée Top 10"
AuditEvent          audit_events           "Nouveau client créé"
```

### Pagination curseur

```typescript
// Page 1
const feed = await getActivityFeed({ organizationId, userId, limit: 20 });
// → { items: ActivityDto[], hasMore: true, nextCursor: '2024-01-15T10:42:00.000Z' }

// Page 2
const page2 = await getActivityFeed({ organizationId, userId, limit: 20, cursor: feed.nextCursor });
```

---

## White Label (Ticket 014C)

Chaque DTO porte une `BrandingConfig` lue depuis `OrganizationSetting` :

```typescript
interface BrandingConfig {
  primaryColor:   string;  // clé: branding_primary_color
  secondaryColor: string;  // clé: branding_secondary_color
  accentColor:    string;  // clé: branding_accent_color
  logoUrl:        string | null;
  appName:        string;  // clé: branding_app_name (ex. "MonCRM Performance")
  levelLabel:     string;  // clé: branding_level_label (ex. "Rang" ou "Niveau")
  xpLabel:        string;  // clé: branding_xp_label (ex. "Points" ou "XP")
}
```

---

## IA — Hooks préparés (aucun appel OpenAI)

Les interfaces suivantes sont définies dans `types.ts` et prêtes à être implémentées :

```typescript
// Message du coach (structure pour le futur moteur IA)
interface AiCoachMessageDto {
  type: 'DAILY_SUMMARY' | 'GOAL_REMINDER' | 'ENCOURAGEMENT' | ...
  title: string | null;
  body: string;
  cta: { label: string; route: string } | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

// Recommandations personnalisées (structure pour GPT-4 / Claude API)
interface AiRecommendationsDto {
  recommendedObjective: { description, kpiCode, targetValue } | null;
  clientToContact: { clientId, clientName, reason } | null;
  documentToFollow: { documentId, name, daysAgo } | null;
  churnRisk: { clientId, clientName, riskScore } | null;
  motivationMessage: string | null;
}
```

---

## Premium — Hooks préparés

```typescript
interface PremiumProfileStatsDto {
  profileViewers: Array<{ userId, userName, avatarUrl, viewedAt }> | null;
  popularityScore: number | null;   // normalisé sur 100
  influenceScore: number | null;    // rang + XP + badges
  followerCount: number | null;     // futur: système de follow
  mentionCount: number | null;      // futur: système de mention
  engagementScore: number | null;   // futur: algorithme d'engagement
}
```

La fonctionnalité "Qui a vu mon profil" est gérée par `getProfileViewers()` et conditionnée par `ProfileVisitConfig.isPremiumOnly` (Ticket 020B).

---

## Compatibilité

| Ticket | Compatibilité | Détail |
|---|---|---|
| **014** Multi-tenant | ✅ | organizationId sur tous les modèles et queries |
| **014B** Business Units | ✅ | Couvert par l'arborescence Organisation |
| **014C** White Label | ✅ | BrandingConfig lue depuis OrganizationSetting, présente sur tous les DTOs |
| **015** Permissions | ✅ | Aucune route API dans ce ticket — gating au niveau route |
| **016** Modules | ✅ | WidgetConfig.isEnabled permet de désactiver des widgets par org |
| **017** Event Bus | ✅ | ActivityFeedEvent consommé par activityFeedService |
| **018** Audit | ✅ | AuditEvent lu par activityFeedService pour la timeline |
| **019** Tenant Config | ✅ | BrandingConfig + WidgetConfig lus via OrganizationSetting |
| **020** Performance | ✅ | Badge, Challenge, Goal, Season lus par widgetService |
| **020B** Engagement | ✅ | UserPublicProfile étendu, ProfileVisit, DailyCoachMessage, UserReputationIndex |
| **021A** KPI | ✅ | UserKpiValue lu par buildTodayScoreWidget |
| **021B** Ranking | ✅ | LeaderboardEntry lu par buildTodayRankingWidget et buildLeaderboardPreviewWidget |
| **021C** Progression | ✅ | UserExperience + LevelDefinition lus par 5 widgets XP/niveau |

---

## Mobile (React Native)

Données pré-calculées exposées par le Dashboard Engine pour React Native :

| Composant React Native | Données fournies par |
|---|---|
| **Écran Home** | `getMobileDashboard()` → `MobileDashboardDto` |
| **Carte XP** (circulaire) | `XpCardWidget.progressPercent`, `currentLevelXp`, `nextLevelXp` |
| **Animation Level Up** | `XpOperationResult.leveledUp` → déclenché depuis 021C |
| **Feed activité** | `getActivityFeed()` → cursor paginated |
| **Classements** | `LeaderboardPreviewWidget.entries` |
| **Profil** | `getUserProfile()` → `UserProfileDto` |
| **Notifications** | `NotificationSummaryWidget.unreadCount` |
| **Actions rapides** | `QuickActionsWidget.actions` |
| **Objectifs** | `ObjectivesWidget.goals` |

Aucun calcul dans React Native — toutes les données arrivent pré-formatées avec labels, couleurs et icônes.

---

## Roadmap

| Priorité | Feature | Description |
|---|---|---|
| 🔴 Haute | Routes API REST | `GET /dashboard`, `GET /dashboard/mobile`, `GET /profile/:userId` |
| 🔴 Haute | Mise en cache | TTL 30s sur `getDashboard()`, TTL 5min sur `getLevelDefinitions()` |
| 🟡 Moyenne | WebSocket | Push `getRealtimeSnapshot()` via Socket.io ou Supabase Realtime |
| 🟡 Moyenne | AI Coach réel | Brancher OpenAI / Claude API sur `AiCoachMessageDto` |
| 🟡 Moyenne | Agenda widget | Brancher un calendrier métier |
| 🟢 Basse | Documents widget | Brancher le moteur documentaire |
| 🟢 Basse | Premium viewers | Activer `getProfileViewers()` via feature flag |

---

## Garanties de non-régression

- ✅ Aucune route API modifiée
- ✅ Aucun service existant modifié
- ✅ Modifications de `UserPublicProfile` uniquement additives (nouveaux champs nullable ou avec defaults)
- ✅ `DashboardPreference` et `WidgetConfig` sont de nouveaux modèles sans impact sur les existants
- ✅ Les nouveaux enums (`WidgetType`, `DashboardType`) n'affectent aucun enum existant
