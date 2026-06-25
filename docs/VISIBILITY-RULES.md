# Regles de Visibilite des Donnees \u2014 Ticket 014

> Version : 1.0  \n> Date : 2026-06-25  \n> Ticket : 014 \u2014 Architecture Multi-tenant Hierarchique  \n> Statut : Fondations documentees

---

## 1. Principe General

Chaque donnee metier (Prospect, Product, ImportJob) appartient a un utilisateur via le champ `ownerId`.

La visibilite d un utilisateur sur les donnees est determinee par son **role** dans la hierarchie, qui correspond a un **scope de visibilite**.

Un utilisateur ne peut jamais voir des donnees appartenant a un autre tenant (organisation).

---

## 2. Matrice de Visibilite

| Role | Scope | Voit ses donnees | Voit son equipe | Voit son site | Voit son secteur | Voit sa region | Voit toute l organisation |
|------|-------|:---:|:---:|:---:|:---:|:---:|:---:|
| SALES_REP | PERSONAL | Oui | Non | Non | Non | Non | Non |
| SALES_MANAGER | TEAM | Oui | Oui | Non | Non | Non | Non |
| SITE_DIRECTOR | SITE | Oui | Oui | Oui | Non | Non | Non |
| SECTOR_DIRECTOR | SECTOR | Oui | Oui | Oui | Oui | Non | Non |
| REGIONAL_DIRECTOR | REGION | Oui | Oui | Oui | Oui | Oui | Non |
| CEO | ORGANIZATION | Oui | Oui | Oui | Oui | Oui | Oui |

---

## 3. Regles Detaillees par Role

### SALES_REP \u2014 Scope PERSONAL

**Qui voit quoi :**
- Voit UNIQUEMENT les ressources dont il est proprietaire (`ownerId = user.id`)
- Ne peut pas voir les donnees de ses collegues, meme s ils sont au meme site

**Filtre Prisma :**
```typescript
{ ownerId: user.id }
```

**Exemples :**
- Frank (SALES_REP) voit ses 45 prospects et uniquement les siens
- Frank ne peut pas voir les prospects de Grace (autre SALES_REP du meme site)

---

### SALES_MANAGER \u2014 Scope TEAM

**Qui voit quoi :**
- Voit ses propres ressources (`ownerId = user.id`)
- Voit les ressources de ses subordonnes DIRECTS (`ownerId IN subordinateIds`)
- Ne voit pas les subordonnes de ses subordonnes (pas de recursivite au niveau 2)

**Filtre Prisma :**
```typescript
{ ownerId: { in: [user.id, ...user.subordinateIds] } }
```

**Exemples :**
- Eve (SALES_MANAGER) gere Frank et Grace
- Eve voit les 45 prospects de Frank + les 32 prospects de Grace + ses propres prospects
- Eve ne peut pas voir les prospects des commerciaux d un autre manager

---

### SITE_DIRECTOR \u2014 Scope SITE

**Qui voit quoi :**
- Voit toutes les ressources appartenant a des utilisateurs rattaches a son site

**Filtre Prisma :**
```typescript
{ owner: { siteId: user.siteId } }
```

**Exemples :**
- David (SITE_DIRECTOR du site "Agence Paris 8") voit les donnees de tous les utilisateurs de ce site
- Cela inclut Eve (SALES_MANAGER), Frank et Grace (SALES_REP) du site

---

### SECTOR_DIRECTOR \u2014 Scope SECTOR

**Qui voit quoi :**
- Voit toutes les ressources appartenant a des utilisateurs rattaches a son secteur (tous les sites confondus)

**Filtre Prisma :**
```typescript
{ owner: { sector: { id: user.sectorId } } }
```

**Exemples :**
- Carol (SECTOR_DIRECTOR du Secteur Paris) voit les donnees de tous les utilisateurs de tous les sites de son secteur

---

### REGIONAL_DIRECTOR \u2014 Scope REGION

**Qui voit quoi :**
- Voit toutes les ressources appartenant a des utilisateurs rattaches a sa region (tous les secteurs confondus)

**Filtre Prisma :**
```typescript
{ owner: { region: { id: user.regionId } } }
```

**Exemples :**
- Bob (REGIONAL_DIRECTOR Region Nord) voit les donnees de tous les utilisateurs de tous les secteurs de sa region

---

### CEO \u2014 Scope ORGANIZATION

**Qui voit quoi :**
- Voit toutes les ressources de l organisation sans restriction

**Filtre Prisma :**
```typescript
{ owner: { organizationId: user.organizationId } }
```

**Exemples :**
- Alice (CEO) voit les 1,247 prospects de toute l organisation

---

## 4. Regles de Mutation (CREATE / UPDATE / DELETE)

### CREATE

Lors de la creation d une ressource :
1. L `ownerId` est automatiquement fixe a l ID de l utilisateur authentifie
2. Un utilisateur ne peut pas creer une ressource au nom d un autre (sauf roles superieurs avec logique specifique)
3. La validation est faite cote API avant l insertion Prisma

### UPDATE / DELETE

Avant toute modification ou suppression :

| Cas | Autorise ? |
|-----|-----------|
| Modifier SES PROPRES donnees | Toujours OUI |
| SALES_MANAGER modifie donnees de ses subordonnes directs | OUI |
| SITE_DIRECTOR modifie donnees d un utilisateur de son site | OUI |
| SECTOR_DIRECTOR modifie donnees d un utilisateur de son secteur | OUI |
| REGIONAL_DIRECTOR modifie donnees d un utilisateur de sa region | OUI |
| CEO modifie n importe quelle donnee de l organisation | OUI |
| SALES_REP modifie donnees d un autre SALES_REP | NON (403) |
| Tout utilisateur modifie donnees d un autre tenant | NON (403) |

**Fonction de validation :**
```typescript
assertCanMutate(currentUser, resource.ownerId);
// Lance Error('FORBIDDEN: insufficient permissions') si non autorise
```

---

## 5. Isolation Multi-tenant

**Regle absolue : un utilisateur ne peut JAMAIS acceder aux donnees d un autre tenant.**

Cette regle s applique quel que soit le role. Meme un CEO d une organisation A ne peut pas voir les donnees de l organisation B.

La garantie est assur\u00e9e par le filtre `organizationId` applique au niveau de l organisation du proprietaire.

**A implementer dans les routes :**
- Toujours inclure `owner.organizationId = currentUser.organizationId` dans les filtres
- Ne jamais faire confiance a un `organizationId` fourni par le client
- Toujours derivier l `organizationId` depuis le token JWT / l utilisateur authentifie

---

## 6. Cas Particuliers

### Utilisateur sans organisation (organizationId = null)

- Situation : utilisateur cree avant la mise en place du multi-tenant, ou compte systeme
- Comportement : voit uniquement SES propres donnees (fallback PERSONAL)
- Action recommandee : rattacher ces utilisateurs a une organisation lors de la migration

### Ressource sans proprietaire (ownerId = null)

- Concerne uniquement ImportJob (ownerId nullable)
- Ces ressources ne sont visibles que par les CEO ou les administrateurs systeme
- Les SALES_REP et SALES_MANAGER ne les voient pas

### Manager sans subordonnes

- Un SALES_MANAGER sans subordonnes ne voit que ses propres donnees
- `subordinateIds = []` dans le contexte, donc filtre equivalent au scope PERSONAL

---

## 7. Implementation dans les Routes (Ticket suivant)

Les routes API devront integrer ces regles. Exemple pour `GET /api/prospects` :

```typescript
import { buildOwnerFilter } from '../middleware/dataIsolation.js';

router.get('/', async (req, res) => {
  const currentUser = req.user; // injecte par injectAuthUser middleware
    const filter = buildOwnerFilter(currentUser);

      const prospects = await prisma.prospect.findMany({
          where: filter,
              include: { owner: { select: { name: true, role: true } } },
                });

                  res.json(prospects);
                  });
                  ```

                  ---

                  ## 8. Exemples Concrets

                  ### Scenario : Consultation des prospects

                  | Utilisateur | Role | Resultat de buildOwnerFilter | Prospects vus |
                  |-------------|------|------------------------------|---------------|
                  | Frank | SALES_REP | `{ ownerId: frank.id }` | Ses 45 prospects |
                  | Eve | SALES_MANAGER | `{ ownerId: { in: [eve, frank, grace] } }` | 45 + 32 + 12 = 89 |
                  | David | SITE_DIRECTOR | `{ owner: { siteId: paris8.id } }` | Tous les prospects du site Paris 8 |
                  | Carol | SECTOR_DIRECTOR | `{ owner: { sector: { id: paris.id } } }` | Tous les prospects du Secteur Paris |
                  | Bob | REGIONAL_DIRECTOR | `{ owner: { region: { id: nord.id } } }` | Tous les prospects de la Region Nord |
                  | Alice | CEO | `{ owner: { organizationId: acme.id } }` | Tous les prospects de ACME Corp |

                  ### Scenario : Suppression d un prospect

                  - Frank tente de supprimer un prospect de Grace : **INTERDIT (403)**
                  - Eve tente de supprimer un prospect de Frank : **AUTORISE (equipe directe)**
                  - David tente de supprimer un prospect de Frank : **AUTORISE (meme site)**
                  - Alice tente de supprimer n importe quel prospect de ACME : **AUTORISE (CEO)**
                  - Alice tente de supprimer un prospect de l organisation Competitor Corp : **INTERDIT (autre tenant)**

                  ---

                  ## 9. Evolution Future

                  ### Permissions Granulaires

                  Dans une version future, un systeme de permissions granulaires pourra etre introduit :

                  - `can_view_all_site_prospects` : permission specifique
                  - `can_export_data` : permission d export
                  - `can_manage_users` : permission de gestion des utilisateurs

                  Ces permissions completeront le systeme de roles sans le remplacer.

                  ### Delegation Temporaire

                  Possibilite future : un utilisateur peut deleguer temporairement ses permissions a un autre (ex : pendant les conges).

                  ### Audit Log

                  Chaque action de mutation pourra etre enregistree dans un modele `AuditLog` :
                  - userId de l acteur
                  - action (CREATE / UPDATE / DELETE)
                  - resourceType
                  - resourceId
                  - timestamp
                  - IP

                  ---

                  *Document produit dans le cadre du Ticket 014 \u2014 Architecture Multi-tenant Hierarchique et Securisation des Donnees.*
                  
