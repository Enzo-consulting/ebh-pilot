# Leaderboard Engine — EBH-Pilot

> Ticket 020 — Performance Engine

---

## Philosophie

Un classement EBH-Pilot n'est pas un simple tableau de scores.
C'est un outil de motivation, de pilotage commercial et de gestion d'equipe,
entierement configurable, respectueux de la hierarchie et de la confidentialite.

---

## Types de classement

| Type | Description |
|------|-------------|
| RANKING | Classement ordonne (1er, 2eme, 3eme...) |
| SCORE | Score brut cumule (ex: total CA en euros) |
| POINTS | Points de gamification (XP) |
| STREAK | Serie consecutive (jours/semaines actifs) |
| ACHIEVEMENT | Badges et succes debloques |

---

## Scopes disponibles

| Scope | Qui est classe ? | Exemple |
|-------|-----------------|---------|
| PERSONAL | L'utilisateur vs ses propres periodes | Janvier vs Fevrier |
| TEAM | Les collaborateurs directs d'un manager | Equipe Dupont |
| SITE | Tous les users d'un site | Site Lyon |
| SECTOR | Tous les users d'un secteur | Secteur Sud-Est |
| REGION | Tous les users d'une region | Region Grand-Est |
| BUSINESS_UNIT | Tous les users d'une BU | Division Premium |
| ORGANIZATION | Toute l'organisation | Top France |
| NATIONAL | Multi-organisations, meme pays | Top National |
| INTERNATIONAL | Multi-pays | Top Monde |

---

## Confidentialite

Chaque classement respecte automatiquement :

- **Multi-tenant** : un classement ne melange jamais deux organisations
- **Business Unit** : l'isolement par BU est enforced via scopeEntityId
- **Hierarchie** : un commercial ne voit que son propre scope
- **isPublic = false** : classement visible uniquement par manager et admin
- **Modules** : le module LEADERBOARD (Ticket 016) doit etre active
- **Permissions** : White Label peut rebaptiser et personnaliser les classements

---

## Cycle de vie d'un classement

```
1. Admin cree un Leaderboard (scope, kpiId, aggregation, maxEntries)
2. KPI values sont enregistrees via recordKpiValue()
3. computeLeaderboard() est appele (realtime, deferred, ou cron)
4. LeaderboardEntry[] sont crees avec positions et variations
5. getLeaderboard() retourne les entrees calculees
6. Mobile / Web affichent le classement
7. Recalcul periodique (daily, weekly, monthly selon config)
```

---

## Variation de position

Chaque entree de classement contient un champ variation :
- +2 = monte de 2 places depuis le dernier calcul
- -1 = descend d'une place
- 0 = stable
- null = premiere entree (pas de precedent)

Ce champ permet d'afficher des fleches de tendance dans l'UI et le mobile.

---

## Modes de calcul

| Mode | Quand | Cas d'usage |
|------|-------|-------------|
| REALTIME | Apres chaque KPI value | Orgs < 100 users, classements simples |
| DEFERRED | File de messages (Bull) | Orgs 100-1000 users |
| CRON | Quotidien / Hebdo / Mensuel | Orgs > 1000 users |
| BATCH | Reset de saison, import massif | Volumes > 10 000 users |

---

## Exemples de classements

```
Leaderboard: Top France Mensuel
  scope: ORGANIZATION
  kpi: revenue
  aggregation: MONTHLY
  maxEntries: 10

Leaderboard: Top Region Grand-Est
  scope: REGION
  scopeEntityId: region_grandest_id
  kpi: sales_count
  aggregation: MONTHLY
  maxEntries: 5

Leaderboard: Top Secteur - Janvier 2025
  scope: SECTOR
  kpi: margin_pct
  aggregation: MONTHLY
  seasonId: season_2025_id
  maxEntries: 20
```

---

## Mobile

- Widget 'Votre position' sur l'ecran d'accueil
- Push notification quand la position change
- Animations de montee/descente de position
- Classement complet scrollable
- Filtre par scope (Ma region / Mon equipe / France)

---

## Fonctionnalites Premium

- Historique d'evolution de position (chart ligne sur 12 mois)
- Comparaison cote a cote de deux utilisateurs
- Comparaison de deux agences
- Comparaison multi-regions
- Classements illimites (sans limite de maxEntries)
- Classements filtres (par produit, marque, territoire)
- Classements prives (invite-only)
- Ligues privees (challenge multi-periodes entre equipes selectionnees)

---

*Document cree avec le Ticket 020 — Performance Engine*
