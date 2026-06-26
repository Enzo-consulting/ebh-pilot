/**
 * dataIsolation.ts
 * Ticket 014  — Fondations de l isolation des donnees et des permissions
 * Ticket 014B — Ajout du niveau BusinessUnit dans la hierarchie
 * Ticket 015  — Integration complete : injectAuthUser() finalise
 *
 * Ce module expose :
 * 1. Les types de roles et leur hierarchie de visibilite
 * 2. buildOwnerFilter() — filtre Prisma WHERE selon le role utilisateur
 * 3. assertCanMutate() — validation CREATE/UPDATE/DELETE
 * 4. requireRole() — middleware Express de protection par role
 * 5. injectAuthUser() — charge le User Prisma complet depuis le authId Supabase
 *
 * Hierarchie complete :
 * Organization -> BusinessUnit -> Region -> Sector -> Site -> User
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';

// ============================================================
// TYPES
// ============================================================

export type UserRole =
     | 'CEO'
  | 'REGIONAL_DIRECTOR'
  | 'SECTOR_DIRECTOR'
  | 'SITE_DIRECTOR'
  | 'SALES_MANAGER'
  | 'SALES_REP';

/**
 * Contexte utilisateur authentifie.
 * Injecte par injectAuthUser() dans req.authUser.
 * businessUnitId est null si l organisation est mono-activite.
 */
export interface AuthenticatedUser {
     id: string;
     authId: string;
     role: UserRole;
     organizationId: string | null;
     businessUnitId: string | null;
     regionId: string | null;
     sectorId: string | null;
     siteId: string | null;
     managerId: string | null;
     subordinateIds?: string[];
}

/**
 * Extension de Request Express pour inclure l utilisateur authentifie.
 */
export interface AuthedRequestWithUser extends Request {
     userId?: string;
     authUser?: AuthenticatedUser;
}

/**
 * Niveaux de visibilite disponibles.
 */
export type VisibilityScope =
     | 'PERSONAL'
  | 'TEAM'
  | 'SITE'
  | 'SECTOR'
  | 'REGION'
  | 'BUSINESS_UNIT'
  | 'ORGANIZATION';

// ============================================================
// HIERARCHIE DES ROLES
// ============================================================

/**
 * Mappe chaque role sur son scope de visibilite naturel.
 */
export const ROLE_VISIBILITY: Record<UserRole, VisibilityScope> = {
     CEO: 'ORGANIZATION',
     REGIONAL_DIRECTOR: 'REGION',
     SECTOR_DIRECTOR: 'SECTOR',
     SITE_DIRECTOR: 'SITE',
     SALES_MANAGER: 'TEAM',
     SALES_REP: 'PERSONAL',
};

/**
 * Ordre de priorite des roles (1 = plus bas, 6 = plus haut).
 */
export const ROLE_LEVEL: Record<UserRole, number> = {
     SALES_REP: 1,
     SALES_MANAGER: 2,
     SITE_DIRECTOR: 3,
     SECTOR_DIRECTOR: 4,
     REGIONAL_DIRECTOR: 5,
     CEO: 6,
};

// ============================================================
// FILTRES DE VISIBILITE PRISMA
// ============================================================

/**
 * Construit le filtre Prisma WHERE a appliquer sur ownerId
 * en fonction du role et du contexte de l utilisateur.
 *
 * Utiliser dans les requetes findMany() pour appliquer
 * automatiquement la hierarchie de visibilite.
 *
 * @param user - L utilisateur authentifie
 * @returns Objet Prisma WHERE compatible avec Prospect, Product, ImportJob
 */
export function buildOwnerFilter(user: AuthenticatedUser): Record<string, unknown> {
     const scope = ROLE_VISIBILITY[user.role];

  switch (scope) {
     case 'PERSONAL':
              return { ownerId: user.id };

     case 'TEAM': {
              const ids = [user.id, ...(user.subordinateIds ?? [])];
              return { ownerId: { in: ids } };
     }

     case 'SITE':
              if (user.siteId) {
                         return { owner: { siteId: user.siteId } };
              }
              return { ownerId: user.id };

case 'SECTOR':
              if (user.sectorId) {
                         return { owner: { sectorId: user.sectorId } };
              }
              return { ownerId: user.id };

     case 'REGION':
              if (user.regionId) {
                         return { owner: { regionId: user.regionId } };
              }
              return { ownerId: user.id };

     case 'BUSINESS_UNIT':
              if (user.businessUnitId) {
                         return { owner: { businessUnitId: user.businessUnitId } };
              }
              return { owner: { organizationId: user.organizationId } };

     case 'ORGANIZATION':
              return { owner: { organizationId: user.organizationId } };

     default:
              return { ownerId: user.id };
  }
}

/**
 * Construit un filtre restreint a une BusinessUnit specifique.
 * Utile pour les requetes de reporting cross-region au niveau BU.
 */
export function buildBusinessUnitFilter(
     user: AuthenticatedUser,
     targetBusinessUnitId?: string,
   ): Record<string, unknown> {
     const buId = targetBusinessUnitId ?? user.businessUnitId;
     if (buId) {
            return { owner: { businessUnitId: buId } };
     }
     return { owner: { organizationId: user.organizationId } };
}

// ============================================================
// CONTROLES DE MUTATION
// ============================================================

/**
 * Verifie si un utilisateur peut modifier/supprimer une ressource.
 *
 * Regles :
 * - Un utilisateur peut toujours modifier ses propres ressources (ownerId === user.id)
 * - Un manager peut modifier les ressources de ses subordonnees directs
 * - Un directeur peut modifier les ressources de son perimetre (site, secteur, region)
 * - Un CEO peut tout modifier dans son organisation
 *
 * @param user - L utilisateur authentifie
 * @param resourceOwnerId - L ownerId de la ressource ciblee
 * @returns true si l action est autorisee
 */
export function canMutate(user: AuthenticatedUser, resourceOwnerId: string): boolean {
     if (resourceOwnerId === user.id) return true;

  const scope = ROLE_VISIBILITY[user.role];

  switch (scope) {
     case 'TEAM':
              return (user.subordinateIds ?? []).includes(resourceOwnerId);
     case 'SITE':
     case 'SECTOR':
     case 'REGION':
     case 'BUSINESS_UNIT':
     case 'ORGANIZATION':
              return true;
     default:
              return false;
  }
}

/**
 * Lance une erreur HTTP 403 si l utilisateur n a pas le droit de muter la ressource.
 * A utiliser dans les routes PUT, PATCH et DELETE.
 *
 * @throws { status: 403, message: string } si non autorise
 */
export function assertCanMutate(
     user: AuthenticatedUser,
     resourceOwnerId: string,
   ): void {
     if (!canMutate(user, resourceOwnerId)) {
            const err = new Error('Forbidden: vous ne pouvez pas modifier cette ressource.');
            (err as NodeJS.ErrnoException).code = '403';
            throw err;
     }
}

// ============================================================
// MIDDLEWARES EXPRESS
// ============================================================

/**
 * Middleware Express : verifie que l utilisateur a au moins le role minimum.
 *
 * @param minimumRole - Role minimum requis
 */
export function requireRole(minimumRole: UserRole) {
     return (req: AuthedRequestWithUser, res: Response, next: NextFunction): void => {
            const user = req.authUser;
            if (!user) {
                     res.status(401).json({ error: 'Non authentifie.' });
                     return;
            }
            if (ROLE_LEVEL[user.role] < ROLE_LEVEL[minimumRole]) {
                     res.status(403).json({
                                error: `Forbidden: requires role ${minimumRole} or higher`,
                                yourRole: user.role,
                     });
                     return;
            }
            next();
     };
}

/**
 * Middleware Express : charge le User Prisma complet depuis le authId Supabase.
 *
 * Ticket 015 — Implementation complete.
 *
 * Ce middleware doit etre utilise APRES requireAuth() (qui injecte req.userId).
 * Il enrichit la requete avec req.authUser (AuthenticatedUser) contenant
 * toutes les relations de la hierarchie multi-tenant.
 *
 * Relations chargees :
 * - organization, businessUnit, region, sector, site
 * - manager (id seulement via managerId)
 * - subordinates (ids extraits pour canMutate / buildOwnerFilter TEAM scope)
 *
 * Si l utilisateur n existe pas encore en base (premiere connexion avant upsert),
 * passe au middleware suivant sans bloquer.
 */
export async function injectAuthUser(
     req: AuthedRequestWithUser,
     _res: Response,
     next: NextFunction,
   ): Promise<void> {
     const userId = req.userId;
     if (!userId) {
            next();
            return;
     }

  try {
         const user = await prisma.user.findUnique({
                  where: { id: userId },
                  select: {
                             id: true,
                             authId: true,
                             role: true,
                             organizationId: true,
                             businessUnitId: true,
                             regionId: true,
                             sectorId: true,
                             siteId: true,
                             managerId: true,
                             subordinates: {
                                          select: { id: true },
                             },
                  },
         });

       if (user) {
                req.authUser = {
                           id: user.id,
                           authId: user.authId,
                           role: (user.role as UserRole) ?? 'SALES_REP',
                           organizationId: user.organizationId,
                           businessUnitId: user.businessUnitId,
                           regionId: user.regionId,
                           sectorId: user.sectorId,
                           siteId: user.siteId,
                           managerId: user.managerId,
                           subordinateIds: user.subordinates.map((s) => s.id),
                };
       }
  } catch {
         // Ne pas bloquer la requete si le chargement echoue
       // La route utilisera req.userId comme fallback
  }

  next();
}
