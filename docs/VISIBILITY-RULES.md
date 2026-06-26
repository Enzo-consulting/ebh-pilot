# Regles de Visibilite des Donnees

> Version : 2.0 — mise a jour Ticket 014B (ajout BusinessUnit)
>
> ---
>
> ## 1. Principe General
>
> Chaque donnee metier appartient a un utilisateur via `ownerId`.
> La visibilite est determinee par le **role** de l utilisateur.
> Un utilisateur ne peut jamais voir des donnees d un autre tenant (organisation).
> La BusinessUnit ne change pas les roles — elle est un niveau de filtrage additionnel.
>
> ---
>
> ## 2. Matrice de Visibilite (v2.0)
>
> | Role | Scope | Personnel | Equipe | Site | Secteur | Region | Organisation |
> |------|-------|:---------:|:------:|:----:|:-------:|:------:|:------------:|
> | SALES_REP | PERSONAL | Oui | Non | Non | Non | Non | Non |
> | SALES_MANAGER | TEAM | Oui | Oui | Non | Non | Non | Non |
> | SITE_DIRECTOR | SITE | Oui | Oui | Oui | Non | Non | Non |
> | SECTOR_DIRECTOR | SECTOR | Oui | Oui | Oui | Oui | Non | Non |
> | REGIONAL_DIRECTOR | REGION | Oui | Oui | Oui | Oui | Oui | Non |
> | CEO | ORGANIZATION | Oui | Oui | Oui | Oui | Oui | Oui |
>
> Note BusinessUnit : le CEO voit l organisation entiere (toutes les BusinessUnits confondues).
> Le filtrage par BusinessUnit est une fonctionnalite de reporting, pas un scope de role.
>
> ---
>
> ## 3. Regles par Role (inchangees depuis Ticket 014)
>
> ### SALES_REP — Scope PERSONAL
> Filtre : `{ ownerId: user.id }`
>
> ### SALES_MANAGER — Scope TEAM
> Filtre : `{ ownerId: { in: [user.id, ...subordinateIds] } }`
>
> ### SITE_DIRECTOR — Scope SITE
> Filtre : `{ owner: { siteId: user.siteId } }`
>
> ### SECTOR_DIRECTOR — Scope SECTOR
> Filtre : `{ owner: { sector: { id: user.sectorId } } }`
>
> ### REGIONAL_DIRECTOR — Scope REGION
> Filtre : `{ owner: { region: { id: user.regionId } } }`
>
> ### CEO — Scope ORGANIZATION
> Filtre : `{ owner: { organizationId: user.organizationId } }`
>
> ---
>
> ## 4. Impact BusinessUnit sur la Visibilite
>
> ### Aucun changement sur les scopes existants
>
> La BusinessUnit n introduit pas de nouveau role et ne modifie pas les regles de visibilite des roles existants.
>
> Un REGIONAL_DIRECTOR rattache a une Region de la BusinessUnit "Dacia" voit les donnees de sa Region, pas toutes les donnees de la BU "Dacia". Son scope reste REGION.
>
> ### Scope BUSINESS_UNIT (auxiliaire)
>
> Un scope auxiliaire `BUSINESS_UNIT` est disponible dans `buildOwnerFilter()` pour les requetes de reporting croisees au niveau d une BusinessUnit (ex : KPI consolides de toutes les regions d une meme marque).
>
> Il n est pas associe a un role specifique. Il est utilise via `buildBusinessUnitFilter()`.
>
> ```typescript
> // Pour un rapport CEO filtre par BusinessUnit "Dacia" :
> const filter = buildBusinessUnitFilter(ceoUser, daciaBusinessUnitId);
> // => { owner: { businessUnitId: "uuid-dacia" } }
> ```
>
> ### Compatibilite mono-activite
>
> Si `businessUnitId` est null (organisation mono-activite), tous les filtres se comportent exactement comme avant le Ticket 014B. Aucune regression.
>
> ---
>
> ## 5. Regles de Mutation (inchangees)
>
> | Cas | Autorise |
> |-----|---------|
> | Ses propres donnees | Toujours OUI |
> | SALES_MANAGER : subordonnes directs | OUI |
> | SITE_DIRECTOR : utilisateurs du site | OUI |
> | SECTOR_DIRECTOR : utilisateurs du secteur | OUI |
> | REGIONAL_DIRECTOR : utilisateurs de la region | OUI |
> | CEO : n importe quelle donnee de l organisation | OUI |
> | Donnees d un autre tenant | NON (403) |
>
> ---
>
> ## 6. Isolation Multi-tenant (inchangee)
>
> Un utilisateur ne peut jamais acceder aux donnees d une autre Organisation, quelle que soit sa BusinessUnit.
>
> L isolation BusinessUnit est intra-organisation : deux BU de la meme Organisation appartiennent au meme tenant mais peuvent etre filtrees independamment.
>
> ---
>
> ## 7. Exemples — Filtres avec BusinessUnit
>
> ### CEO consultant les prospects de la BU "Renault" uniquement
>
> ```typescript
> const filter = buildBusinessUnitFilter(ceoUser, renaultBuId);
> // => { owner: { businessUnitId: "uuid-renault" } }
> const prospects = await prisma.prospect.findMany({ where: filter });
> ```
>
> ### CEO consultant tous les prospects du groupe
>
> ```typescript
> const filter = buildOwnerFilter(ceoUser);
> // => { owner: { organizationId: "uuid-renault-group" } }
> // Retourne les prospects de TOUTES les BusinessUnits (Renault + Dacia + Alpine)
> ```
>
> ### REGIONAL_DIRECTOR — comportement identique avec ou sans BusinessUnit
>
> ```typescript
> const filter = buildOwnerFilter(regionalDirector);
> // => { owner: { region: { id: "uuid-region-nord" } } }
> // Identique que la region soit rattachee a "Renault" ou "Dacia" ou null
> ```
>
> ---
>
> ## 8. Evolution Future
>
> Un role futur `BUSINESS_UNIT_DIRECTOR` pourrait etre ajoute pour les groupes necessitant un niveau de management intermediaire entre CEO et REGIONAL_DIRECTOR. Il suffirait d ajouter la valeur a l enum `UserRole` et de mapper `BUSINESS_UNIT_DIRECTOR: 'BUSINESS_UNIT'` dans `ROLE_VISIBILITY`.
>
> ---
>
> *Document produit dans le cadre du Ticket 014B — Ajout du niveau BusinessUnit.*
> 
