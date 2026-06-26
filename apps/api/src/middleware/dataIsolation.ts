/**
 * dataIsolation.ts
 * Ticket 014 — Fondations de l isolation des donnees et des permissions
 * Ticket 014B — Ajout du niveau BusinessUnit dans la hierarchie
 *
 * Ce module expose :
 * 1. Les types de roles et leur hierarchie de visibilite
 * 2. Une fonction buildOwnerFilter() pour construire les filtres Prisma selon le role
 * 3. Une fonction assertCanMutate() pour valider CREATE/UPDATE/DELETE
 * 4. Un middleware Express requireRole() pour proteger les routes
 *
 * Hierarchie complete :
 * Organization -> BusinessUnit -> Region -> Sector -> Site -> User
 */

import { Request, Response, NextFunction } from 'express';

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
 * Provient du middleware d authentification Supabase.
 * businessUnitId est null si l organisation est mono-activite.
 */
export interface AuthenticatedUser {
   id: string;
   authId: string;
   role: UserRole;
   organizationId: string | null;
   /// Null si l organisation est mono-activite ou si l utilisateur n est pas rattache a une BU
  businessUnitId: string | null;
   regionId: string | null;
   sectorId: string | null;
   siteId: string | null;
   managerId: string | null;
   subordinateIds?: string[];
}

/**
 * Niveaux de visibilite disponibles.
 * BUSINESS_UNIT est le nouveau niveau entre REGION et ORGANIZATION.
 */
export type VisibilityScope =
   | 'PERSONAL'       // Uniquement ses propres donnees
  | 'TEAM'           // Ses donnees + donnees de ses commerciaux directs
  | 'SITE'           // Toutes les donnees du site
  | 'SECTOR'         // Toutes les donnees du secteur
  | 'REGION'         // Toutes les donnees de la region
  | 'BUSINESS_UNIT'  // Toutes les donnees de la business unit (nouveau niveau 014B)
  | 'ORGANIZATION';  // Toutes les donnees de l organisation

// ============================================================
// HIERARCHIE DES ROLES
// ============================================================

/**
 * Mappe chaque role sur son scope de visibilite naturel.
 *
 * CEO              => ORGANIZATION
 * REGIONAL_DIRECTOR => REGION
 * SECTOR_DIRECTOR  => SECTOR
 * SITE_DIRECTOR    => SITE
 * SALES_MANAGER    => TEAM
 * SALES_REP        => PERSONAL
 *
 * Note : BUSINESS_UNIT n est pas mappe a un role specifique.
 * Il est accessible par CEO quand businessUnitId est specifie dans un contexte de filtre.
 * Les directeurs regionaux voient leur region, pas toute la BU.
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
 * Ordre de priorite des roles.
 * Utile pour comparer si un utilisateur peut agir sur une ressource d un autre.
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
 * Hierarchie complete prise en compte :
 * Organization -> BusinessUnit -> Region -> Sector -> Site -> User
 *
 * Si l organisation est mono-activite (businessUnitId = null sur l utilisateur),
 * les filtres se comportent exactement comme sans BusinessUnit.
 *
 * @param user - L utilisateur authentifie
 * @returns Objet Prisma WHERE compatible avec Prospect, Product, etc.
 */
export function buildOwnerFilter(user: AuthenticatedUser): Record<string, unknown> {
   const scope = ROLE_VISIBILITY[user.role];

  switch (scope) {
   case 'PERSONAL':
          return { ownerId: user.id };

   case 'TEAM': {
          const teamIds = [user.id, ...(user.subordinateIds ?? [])];
          return { ownerId: { in: teamIds } };
   }

   case 'SITE':
          return { owner: { siteId: user.siteId } };

   case 'SECTOR':
          return { owner: { sector: { id: user.sectorId } } };

   case 'REGION':
          return { owner: { region: { id: user.regionId } } };

   case 'ORGANIZATION':
          // Si un contexte BusinessUnit est actif (ex: CEO filtrant par BU),
       // on peut restreindre la visibilite a la BU concernee.
       // Par defaut : toute l organisation.
       return { owner: { organizationId: user.organizationId } };

   case 'BUSINESS_UNIT':
          // Scope intermediaire : toutes les donnees de la BusinessUnit de l utilisateur.
       // Utilise quand businessUnitId est renseigne et que la logique metier le requiert.
       if (user.businessUnitId) {
                return { owner: { businessUnitId: user.businessUnitId } };
       }
          // Fallback : si pas de BU, scope organisation entiere
       return { owner: { organizationId: user.organizationId } };

   default:
          return { ownerId: user.id };
  }
}

/**
 * Construit un filtre restreint a une BusinessUnit specifique.
 * Utile pour les requetes de reporting cross-region au niveau BU.
 * Fonctionne meme si l organisation est mono-activite (retourne filtre org entiere).
 */
export function buildBusinessUnitFilter(
   user: AuthenticatedUser,
   businessUnitId?: string
 ): Record<string, unknown> {
   const buId = businessUnitId ?? user.businessUnitId;
   if (!buId) {
        return { owner: { organizationId: user.organizationId } };
   }
   return { owner: { businessUnitId: buId } };
}

// ============================================================
// CONTROLE DES MUTATIONS (CREATE / UPDATE / DELETE)
// ============================================================

/**
 * Verifie si un utilisateur peut modifier ou supprimer une ressource.
 */
export function canMutate(
   currentUser: AuthenticatedUser,
   resourceOwnerId: string
 ): boolean {
   if (currentUser.id === resourceOwnerId) return true;

  const scope = ROLE_VISIBILITY[currentUser.role];

  switch (scope) {
   case 'TEAM':
          return (currentUser.subordinateIds ?? []).includes(resourceOwnerId);

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
 * Lance une erreur si l utilisateur ne peut pas muter la ressource.
 */
export function assertCanMutate(
   currentUser: AuthenticatedUser,
   resourceOwnerId: string
 ): void {
   if (!canMutate(currentUser, resourceOwnerId)) {
        throw new Error('FORBIDDEN: insufficient permissions to modify this resource');
   }
}

// ============================================================
// MIDDLEWARE EXPRESS
// ============================================================

/**
 * Middleware Express : verifie que l utilisateur a au moins le role requis.
 */
export function requireRole(minimumRole: UserRole) {
   return (req: Request, res: Response, next: NextFunction): void => {
        const user = (req as Request & { user?: AuthenticatedUser }).user;

        if (!user) {
               res.status(401).json({ error: 'Unauthorized: no authenticated user' });
               return;
        }

        const userLevel = ROLE_LEVEL[user.role] ?? 0;
        const requiredLevel = ROLE_LEVEL[minimumRole] ?? 0;

        if (userLevel < requiredLevel) {
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
 * Middleware Express : injecte l utilisateur authentifie dans req.user.
 * Implementation complete a faire dans le ticket d integration des routes.
 */
export async function injectAuthUser(
   req: Request,
   res: Response,
   next: NextFunction
 ): Promise<void> {
   next();
}
