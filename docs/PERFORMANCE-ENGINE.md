# Performance Engine — EBH-Pilot

> Ticket 020 — Performance Engine (KPI, Leaderboards & Gamification)

---

## Objectif

Le Performance Engine est le moteur universel de mesure, de comparaison et de motivation des collaborateurs d'EBH-Pilot.

Il est concu pour fonctionner avec n'importe quel metier : automobile, remorque, immobilier, assurance, BTP, industrie, services — sans modifier une ligne de code.

---

## Architecture

```
Domain Event (Ticket 017)
       |
       v
  PerformanceListener (futur)
       |
       v
  performanceEngine.recordKpiValue()
       |
       +---> badgeEngine.evaluateBadges()
       +---> goalEngine.updateGoalProgress()
       +---> challengeEngine.updateChallengeScore()
       +---> leaderboardEngine.computeLeaderboard() [async]
```

### Independance totale du CRM

Le moteur ne connait pas Prospect, Client, ni Product.
Les valeurs KPI lui sont injectees par les Domain Events.

Exemples de mapping :

| Domain Event | KPI code | Valeur |
|--------------|----------|--------|
| PROSPECT_CREATED | leads_created | 1 |
| CLIENT_CREATED | clients_won | 1 |
| IMPORT_COMPLETED | imports_done | 1 |
| PRODUCT_UPDATED (avec valeur) | revenue | montant |

Ce mapping sera configure dans PerformanceListener (futur ticket).
Aucune route n'a besoin de connaitre le Performance Engine.

---

## Fichiers

```
apps/api/src/performance/
├── index.ts              ← Point d'entree unique + re-exports
├── performanceEngine.ts  ← Core: recordKpiValue, getKpiSummary, getKpiHistory + tous les types
├── leaderboardEngine.ts  ← Classements: getLeaderboard, computeLeaderboard
├── badgeEngine.ts        ← Gamification: evaluateBadges, awardBadge, getUserBadges
├── challengeEngine.ts    ← Competitions: getActiveChallenges, joinChallenge, updateScore
├── goalEngine.ts         ← Objectifs: getUserGoals, getGoalProgress, updateGoalProgress
├── rankingEngine.ts      ← Scores: rankUsers, getUserRank, getTopN, compareUsers
└── statisticsEngine.ts   ← Analyses: getKpiStatistics, getTrend, getComparison, getSeasonSummary
```

---

## Modeles Prisma

| Modele | Lignes | Role |
|--------|--------|------|
| KpiDefinition | ~30 | Catalogue des KPI (code, unit, calculationType) |
| UserKpiValue | ~20 | Historique brut des valeurs par utilisateur |
| Leaderboard | ~25 | Definition d'un classement (scope, kpi, periode) |
| LeaderboardEntry | ~15 | Entrees calculees d'un classement |
| Badge | ~25 | Definition d'un badge (trigger, rarete, XP) |
| UserBadge | ~10 | Attribution d'un badge a un utilisateur |
| Challenge | ~20 | Competition temporaire avec recompense |
| ChallengeParticipant | ~15 | Score + position d'un participant |
| Goal | ~20 | Objectif individuel sur une periode |
| GoalProgress | ~10 | Snapshots de progression |
| Season | ~15 | Periode de reference (annee, saison, challenge) |

---

## KPI

### Unites supportees
COUNT, CURRENCY, PERCENTAGE, DURATION, SCORE, RATIO, CUSTOM

### Methodes de calcul
SUM, AVERAGE, COUNT, MAX, MIN, LAST, WEIGHTED, CUSTOM

### Aggregations temporelles
DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY, SEASON, CUSTOM

### Exemples de KPI universels

| Code | Nom | Unite | Calcul |
|------|-----|-------|--------|
| sales_count | Nombre de ventes | COUNT | SUM |
| revenue | Chiffre d'affaires | CURRENCY | SUM |
| margin_pct | Marge % | PERCENTAGE | AVERAGE |
| calls_made | Appels passes | COUNT | SUM |
| meetings_done | RDV realises | COUNT | SUM |
| conversion_rate | Taux de transformation | PERCENTAGE | AVERAGE |
| response_time | Temps de reponse | DURATION | AVERAGE |
| deals_closed | Contrats signes | COUNT | SUM |
| avg_deal_value | Panier moyen | CURRENCY | AVERAGE |

---

## Scopes de classement

| Scope | Description |
|-------|-------------|
| PERSONAL | L'utilisateur compare ses propres periodes |
| TEAM | Les collaborateurs directs d'un manager |
| SITE | Tous les users d'un site |
| SECTOR | Tous les users d'un secteur |
| REGION | Tous les users d'une region |
| BUSINESS_UNIT | Tous les users d'une BU |
| ORGANIZATION | Toute l'organisation |
| NATIONAL | Multi-organisations meme pays |
| INTERNATIONAL | Multi-pays |

---

## Modes de calcul

| Mode | Declencheur | Usage |
|------|-------------|-------|
| REALTIME | Apres chaque recordKpiValue() | Petites orgs (<100 users) |
| DEFERRED | File de messages (Bull/BullMQ) | Orgs moyennes |
| CRON | Planifie (quotidien, hebdo, mensuel) | Grandes orgs |
| QUEUE | Job queue avec retry | High-reliability |
| BATCH | Recalcul complet (reset saison, import) | Tres grands volumes |

---

## Confidentialite et multi-tenant

- Toutes les donnees sont strictement isolees par organizationId
- Les classements respectent la hierarchie Business Unit
- isPublic = false → visible uniquement par le manager et l'utilisateur
- Mode anonyme possible (afficher la position sans le nom)
- Les KPI prives (isPublic=false) ne sont pas visibles dans les classements publics

---

## Fonctionnalites Premium

| Fonctionnalite | Feature Flag | Status |
|----------------|-------------|--------|
| Historique de position dans un classement | LEADERBOARD | Squelette |
| Comparaison de deux utilisateurs | ADVANCED_ANALYTICS | Squelette |
| Comparaison de deux agences | ADVANCED_ANALYTICS | Squelette |
| Comparaison multi-regions | ADVANCED_ANALYTICS | Squelette |
| Voir qui consulte son profil | (futur) | Non commence |
| Statistiques avancees (ecart-type, percentile) | ADVANCED_ANALYTICS | Squelette |
| Export PDF | EXPORT_PDF | Non commence |
| Export Excel | EXPORT_EXCEL | Non commence |
| Classements illimites | (config) | Architecture prete |
| Classements filtres | (config) | Architecture prete |
| Badges exclusifs | (config) | Architecture prete |
| Challenges prives | (config) | Architecture prete |
| Ligues privees | (config) | Non commence |

---

## Roadmap Mobile (Ticket 016 preparation)

| Fonctionnalite | Modele | Statut |
|----------------|--------|--------|
| Widget score du jour | UserKpiValue | Architecture prete |
| Notifications de classement | LeaderboardEntry + DomainEvent | Architecture prete |
| Barre de progression objectif | GoalProgress | Architecture prete |
| Badges debloques | UserBadge + push notification | Architecture prete |
| Classements mobiles | Leaderboard | Architecture prete |
| Defis actifs | Challenge + ChallengeParticipant | Architecture prete |
| Animations deblocage | Via NOTIFICATION_CREATED event | A implementer |

---

## Roadmap IA

Le moteur est concu pour alimenter les fonctionnalites IA futures :

- Analyse predive de performance (tendances, projections)
- Recommandations personnalisees (KPI a ameliorer, activites prioritaires)
- Detection d'anomalies (chute soudaine de performance)
- Generation automatique de rapports narratifs (saison, trimestre)
- Coach virtuel base sur les donnees de performance
docs(performance): create PERFORMANCE-ENGINE.md — architecture, KPI, scopes, premium, mobile, IA, SaaS roadmapTous les donnees sont disponibles via statisticsEngine et historisees dans UserKpiValue.

---

## Compatibilite SaaS

| Composant | Compatibilite |
|-----------|---------------|
| Multi-tenant (Ticket 014) | OK — organizationId partout |
| Business Units (Ticket 014B) | OK — scopeEntityId pour les classements |
| White Label (Ticket 014C) | OK — badges aux couleurs de l'organisation |
| Module Engine (Ticket 016) | OK — LEADERBOARD, CHALLENGES, REPORTING feature flags |
| Event Bus (Ticket 017) | OK — injection via DomainEvents |
| Audit Engine (Ticket 018) | OK — KPI records auditables |
| Tenant Config (Ticket 019) | OK — workflows et integrations compatibles |

---

*Document cree avec le Ticket 020 — Performance Engine*
