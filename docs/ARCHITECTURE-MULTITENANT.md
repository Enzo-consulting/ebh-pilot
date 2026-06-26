# Architecture Multi-tenant Hierarchique

> Version : 2.0
> > Date : 2026-06-25
> > > Ticket 014 — Architecture Multi-tenant Hierarchique et Securisation des Donnees
> > > > Ticket 014B — Ajout du niveau BusinessUnit
> > > > > Statut : Fondations implementees
> > > > >
> > > > > ---
> > > > >
> > > > > ## 1. Contexte et Objectif
> > > > >
> > > > > EBH Pilot evolue vers une plateforme SaaS generique multi-tenant.
> > > > >
> > > > > Le Ticket 014B ajoute un niveau "BusinessUnit" entre l Organisation et les Regions, permettant de gerer des groupes possedant plusieurs marques, enseignes, divisions ou activites.
> > > > >
> > > > > ---
> > > > >
> > > > > ## 2. Hierarchie Complete (v2.0)
> > > > >
> > > > > ### Structure organisationnelle
> > > > >
> > > > > ```
> > > > > Organization (tenant SaaS)
> > > > >   └── BusinessUnit (marque / division / enseigne / activite)
> > > > >         └── Region
> > > > >               └── Sector
> > > > >                     └── Site
> > > > >                           └── User
> > > > > ```
> > > > >
> > > > > ### Hierarchie manageriale
> > > > >
> > > > > ```
> > > > > CEO (vision organisation entiere)
> > > > >   └── REGIONAL_DIRECTOR (rattache a une Region)
> > > > >         └── SECTOR_DIRECTOR (rattache a un Sector)
> > > > >               └── SITE_DIRECTOR (rattache a un Site)
> > > > >                     └── SALES_MANAGER (rattache a un Site)
> > > > >                           ├── SALES_REP A
> > > > >                           ├── SALES_REP B
> > > > >                           └── SALES_REP C
> > > > > ```
> > > > >
> > > > > ---
> > > > >
> > > > > ## 3. Modeles Prisma
> > > > >
> > > > > ### Organization
> > > > >
> > > > > Entreprise cliente (tenant SaaS). Completement isolee des autres organisations.
> > > > >
> > > > > Champs : id, name, slug (unique), logoUrl, primaryColor, secondaryColor, isActive
> > > > >
> > > > > Relations : businessUnits[], regions[], users[]
> > > > >
> > > > > ### BusinessUnit (nouveau — Ticket 014B)
> > > > >
> > > > > Division, marque, enseigne ou filiale appartenant a une organisation.
> > > > >
> > > > > Champs : id, name, code (optionnel), description (optionnel), isActive, organizationId
> > > > >
> > > > > Relations : organization, regions[], users[]
> > > > >
> > > > > Caracteristiques :
> > > > > - Totalement generique
> > > > > - - code optionnel pour identification rapide (ex: "DACIA", "BU_TOURISME", "RUNNING")
> > > > >   - - isActive permet de desactiver une BU sans la supprimer
> > > > >     - - Une organisation mono-activite possede une seule BU
> > > > >       - - Tout le reste de l application fonctionne sans modification dans les deux cas
> > > > >        
> > > > >         - ### Region
> > > > >        
> > > > >         - Region geographique. Rattachement a BusinessUnit optionnel pour compatibilite ascendante.
> > > > >        
> > > > >         - Champs : id, name, organizationId, businessUnitId (optionnel)
> > > > >
> > > > > ### Sector, Site
> > > > >
> > > > > Inchanges depuis Ticket 014.
> > > > >
> > > > > ### User
> > > > >
> > > > > Enrichi avec businessUnitId (optionnel).
> > > > >
> > > > > Champs supplementaires v014B : businessUnitId (nullable)
> > > > >
> > > > > ---
> > > > >
> > > > > ## 4. Cas d Usage
> > > > >
> > > > > ### Cas 1 — Groupe Automobile (multi-marques)
> > > > >
> > > > > ```
> > > > > Organization: Renault Group
> > > > >   ├── BusinessUnit: Renault (code: RENAULT)
> > > > >   │     ├── Region: Region Nord
> > > > >   │     │     └── Sector: Secteur Lille
> > > > >   │     │           └── Site: Concession Lille Centre
> > > > >   │     └── Region: Region Sud
> > > > >   │           └── Sector: Secteur Marseille
> > > > >   │                 └── Site: Concession Marseille Est
> > > > >   ├── BusinessUnit: Dacia (code: DACIA)
> > > > >   │     └── Region: Region France Entiere
> > > > >   │           └── Sector: Secteur Distribution
> > > > >   │                 └── Site: Partenaire Lyon
> > > > >   └── BusinessUnit: Alpine (code: ALPINE)
> > > > >         └── Region: Region Haute Performance
> > > > >               └── Sector: Sport
> > > > >                     └── Site: Showroom Paris 8
> > > > > ```
> > > > >
> > > > > ### Cas 2 — Groupe Industriel (divisions metier)
> > > > >
> > > > > ```
> > > > > Organization: Michelin
> > > > >   ├── BusinessUnit: Tourisme (code: BU_TOURISME)
> > > > >   │     └── Region: ...
> > > > >   ├── BusinessUnit: Poids Lourds (code: BU_PL)
> > > > >   │     └── Region: ...
> > > > >   └── BusinessUnit: Agricole (code: BU_AGRI)
> > > > >         └── Region: ...
> > > > > ```
> > > > >
> > > > > ### Cas 3 — Groupe de Distribution (enseignes)
> > > > >
> > > > > ```
> > > > > Organization: Groupe Adeo
> > > > >   ├── BusinessUnit: Leroy Merlin (code: LM)
> > > > >   │     └── Region: ...
> > > > >   ├── BusinessUnit: Bricoman (code: BRICOMAN)
> > > > >   │     └── Region: ...
> > > > >   └── BusinessUnit: Weldom (code: WELDOM)
> > > > >         └── Region: ...
> > > > > ```
> > > > >
> > > > > ### Cas 4 — Societe Mono-activite
> > > > >
> > > > > ```
> > > > > Organization: PME Beauvais Distribution
> > > > >   └── BusinessUnit: Principal (code: MAIN)
> > > > >         └── Region: Region Oise
> > > > >               └── Sector: Secteur Beauvais
> > > > >                     └── Site: Agence Beauvais
> > > > > ```
> > > > >
> > > > > Dans ce cas, businessUnitId peut etre null ou pointer vers l unique BU.
> > > > > L application se comporte exactement comme sans BusinessUnit.
> > > > >
> > > > > ---
> > > > >
> > > > > ## 5. Systeme de Roles (inchange depuis Ticket 014)
> > > > >
> > > > > | Role | Niveau | Scope | Voit |
> > > > > |------|--------|-------|------|
> > > > > | CEO | 6 | ORGANIZATION | Toute l organisation |
> > > > > | REGIONAL_DIRECTOR | 5 | REGION | Sa region |
> > > > > | SECTOR_DIRECTOR | 4 | SECTOR | Son secteur |
> > > > > | SITE_DIRECTOR | 3 | SITE | Son site |
> > > > > | SALES_MANAGER | 2 | TEAM | Son equipe |
> > > > > | SALES_REP | 1 | PERSONAL | Ses donnees |
> > > > >
> > > > > Note : Il n existe pas de role "BusinessUnitDirector" dans cette version.
> > > > > Le CEO voit l organisation entiere. Le reporting par BU sera une fonctionnalite de filtrage, pas un niveau de role supplementaire.
> > > > >
> > > > > ---
> > > > >
> > > > > ## 6. Module dataIsolation.ts (v014B)
> > > > >
> > > > > ### Modifications
> > > > >
> > > > > - `AuthenticatedUser` : ajout de `businessUnitId: string | null`
> > > > > - - `VisibilityScope` : ajout de `BUSINESS_UNIT` entre REGION et ORGANIZATION
> > > > >   - - `buildOwnerFilter()` : gestion du scope BUSINESS_UNIT
> > > > >     - - `buildBusinessUnitFilter()` : nouvelle fonction helper pour les requetes de reporting par BU
> > > > >       - - `canMutate()` : ajout du cas BUSINESS_UNIT dans les roles autorises a muter
> > > > >        
> > > > >         - ### buildOwnerFilter() — Comportement BusinessUnit
> > > > >        
> > > > >         - ```typescript
> > > > >           // Scope BUSINESS_UNIT (cas intermediaire) :
> > > > >           if (user.businessUnitId) {
> > > > >             return { owner: { businessUnitId: user.businessUnitId } };
> > > > >           }
> > > > >           // Fallback si pas de BU : scope organisation entiere
> > > > >           return { owner: { organizationId: user.organizationId } };
> > > > >           ```
> > > > >
> > > > > ---
> > > > >
> > > > > ## 7. Compatibilite Ascendante
> > > > >
> > > > > La BusinessUnit est optionnelle partout :
> > > > >
> > > > > - `Region.businessUnitId` — nullable (les regions existantes ne sont pas impactees)
> > > > > - - `User.businessUnitId` — nullable (les utilisateurs existants ne sont pas impactes)
> > > > >   - - `buildOwnerFilter()` — si businessUnitId est null, le comportement est identique a Ticket 014
> > > > >     - - Aucune route API n a ete modifiee
> > > > >      
> > > > >       - ---
> > > > >
> > > > > ## 8. Impacts sur les Fonctionnalites Futures
> > > > >
> > > > > ### Reporting
> > > > >
> > > > > La BusinessUnit devient un niveau de segmentation naturel pour les KPI :
> > > > > - KPI par BusinessUnit (cross-regions d une meme marque)
> > > > > - - Comparaison de performance entre BusinessUnits
> > > > >   - - Consolidation des KPI au niveau groupe
> > > > >    
> > > > >     - ### Personnalisation
> > > > >    
> > > > >     - Chaque BusinessUnit peut avoir sa propre identite visuelle (logo, couleurs) independamment de l Organisation. Cette fonctionnalite sera ajoutee dans un ticket dedie (logoUrl, primaryColor, secondaryColor sur BusinessUnit).
> > > > >    
> > > > >     - ### Application Mobile
> > > > >
> > > > > Les challenges commerciaux pourront etre scopes par BusinessUnit, permettant des competitions inter-equipes au niveau d une marque ou division.
> > > > >
> > > > > ### Multi-tenant
> > > > >
> > > > > L isolation reste au niveau Organisation. Deux BusinessUnits de la meme Organisation partagent le meme tenant mais peuvent etre filtrees independamment.
> > > > >
> > > > > ---
> > > > >
> > > > > ## 9. Migrations a Prevoir
> > > > >
> > > > > Aucune migration executee dans ce ticket.
> > > > >
> > > > > Lors de la premiere migration, les champs businessUnitId etant nullable, l impact sur les donnees existantes est nul. Les utilisateurs et regions sans BusinessUnit continueront de fonctionner normalement.
> > > > >
> > > > > ---
> > > > >
> > > > > ## 10. Checklist du Ticket 014B
> > > > >
> > > > > - [x] Analyse du schema existant
> > > > > - [ ] - [x] Modele BusinessUnit cree (id, name, code, description, isActive, organizationId)
> > > > > - [ ] - [x] Organization.businessUnits[] ajoute
> > > > > - [ ] - [x] Region.businessUnitId (optionnel) ajoute
> > > > > - [ ] - [x] User.businessUnitId (optionnel) ajoute
> > > > > - [ ] - [x] Index Prisma sur businessUnitId (Region, User)
> > > > > - [ ] - [x] AuthenticatedUser.businessUnitId ajoute dans dataIsolation.ts
> > > > > - [ ] - [x] VisibilityScope.BUSINESS_UNIT ajoute
> > > > > - [ ] - [x] buildOwnerFilter() mis a jour pour BUSINESS_UNIT
> > > > > - [ ] - [x] buildBusinessUnitFilter() ajoute (helper reporting)
> > > > > - [ ] - [x] canMutate() mis a jour pour inclure BUSINESS_UNIT
> > > > > - [ ] - [x] Documentation mise a jour (ARCHITECTURE-MULTITENANT.md)
> > > > > - [ ] - [x] Documentation mise a jour (VISIBILITY-RULES.md)
> > > > > - [ ] - [x] Cas d usage documentes (4 exemples)
> > > > > - [ ] - [x] Compatibilite ascendante verifiee
> > > > > - [ ] - [x] Impacts futurs documentes
> > > > > - [ ] - [x] Commits propres crees
> > > > > - [ ] - [ ] Migration executee (hors scope)
> > > > > - [ ] - [ ] Routes API mises a jour (hors scope)
> > > > > - [ ] 
