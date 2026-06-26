# Integration Multi-tenant — Architecture Complete

> Ticket 015 — Documentation technique de l integration de la hierarchie multi-tenant dans les routes API

## Objectif

Ce document decrit comment l architecture multi-tenant definie aux Tickets 014 et 014B
a ete integree dans les routes API existantes. Il couvre le cycle complet :
authentification, chargement du contexte utilisateur, application des filtres
de visibilite, et controle des mutations.

---

## Architecture de l integration

```
Requete HTTP
    |
        v
        requireAuth()          -- auth.ts : valide JWT Supabase, cree/met a jour User, injecte req.userId
            |
                v
                injectAuthUser()       -- dataIsolation.ts : charge User Prisma complet avec toutes les relations
                                          injecte req.authUser (AuthenticatedUser)
                                              |
                                                  v
                                                  Route handler          -- routes/*.ts : utilise req.authUser pour filtrer et controler
                                                      |                     buildOwnerFilter()  => WHERE clause
                                                          |                     assertCanMutate()   => validation PUT/DELETE
                                                              v
                                                              Reponse JSON
                                                              ```

                                                              ---

                                                              ## Cycle de chargement de req.authUser

                                                              ### 1. requireAuth() — auth.ts

                                                              - Verifie le token JWT Bearer dans Authorization header
                                                              - Valide le token aupres de Supabase Auth
                                                              - Fait un upsert Prisma User (premiere connexion = creation automatique)
                                                              - Injecte `req.userId = user.id` (Prisma User id, pas Supabase authId)

                                                              ### 2. injectAuthUser() — dataIsolation.ts

                                                              - Charge le User Prisma complet depuis `req.userId`
                                                              - Relations chargees : organizationId, businessUnitId, regionId, sectorId, siteId, managerId, subordinates[]
                                                              - Construit l objet `AuthenticatedUser` avec `subordinateIds` extrait
                                                              - Injecte `req.authUser` dans la requete
                                                              - Si le chargement echoue : ne bloque pas, la route utilise `req.userId` comme fallback

                                                              ---

                                                              ## Fonctions de filtrage et controle

                                                              ### buildOwnerFilter(user: AuthenticatedUser)

                                                              Retourne un objet Prisma WHERE base sur le scope de visibilite du role :

                                                              | Role | Scope | Filtre applique |
                                                              |------|-------|----------------|
                                                              | CEO | ORGANIZATION | owner.organizationId |
                                                              | REGIONAL_DIRECTOR | REGION | owner.regionId |
                                                              | SECTOR_DIRECTOR | SECTOR | owner.sectorId |
                                                              | SITE_DIRECTOR | SITE | owner.siteId |
                                                              | SALES_MANAGER | TEAM | ownerId IN [user.id, ...subordinateIds] |
                                                              | SALES_REP | PERSONAL | ownerId = user.id |

                                                              ### assertCanMutate(user, resourceOwnerId)

                                                              Valide qu un utilisateur a le droit de modifier/supprimer une ressource.
                                                              Lance une erreur avec code `403` si non autorise.
                                                              A utiliser dans les routes PUT, PATCH, DELETE.

                                                              ---

                                                              ## Routes mises a jour

                                                              | Fichier | GET | POST | PUT | DELETE |
                                                              |---------|-----|------|-----|--------|
                                                              | prospects.ts | buildOwnerFilter() | ownerId auto | assertCanMutate() | assertCanMutate() |
                                                              | clients.ts | buildOwnerFilter() | ownerId auto | assertCanMutate() | assertCanMutate() |
                                                              | products.ts | buildOwnerFilter() | ownerId auto | assertCanMutate() | assertCanMutate() |
                                                              | imports.ts | buildOwnerFilter() | ownerId auto | N/A | N/A |
                                                              | profitability.ts | buildOwnerFilter() | N/A | N/A | N/A |

                                                              ---

                                                              ## Retro-compatibilite

                                                              Toutes les routes implementent un fallback sur `req.userId` si `req.authUser`
                                                              n est pas disponible (utilisateur sans role configure, ancienne session, etc.).

                                                              Cela garantit :
                                                              - Aucune regression pour les utilisateurs existants
                                                              - Transition douce vers le systeme multi-tenant
                                                              - Fonctionnement identique en l absence de contexte hierarchique

                                                              ---

                                                              ## Prochaines etapes

                                                              - **Ticket 016** : Prisma migration — executer `prisma migrate dev` pour appliquer le schema
                                                              - **Ticket 017** : Ajouter `injectAuthUser` dans le middleware global de l API (index.ts)
                                                              - **Ticket 018** : Tests d integration pour les filtres de visibilite
                                                              - **Ticket 019** : Supabase Row Level Security en complement
                                                              
