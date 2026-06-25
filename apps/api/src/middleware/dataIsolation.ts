/**
 * dataIsolation.ts
  * Ticket 014 — Fondations de l isolation des donnees et des permissions
   *
    * Ce module expose :
     * 1. Les types de roles et leur hierarchie de visibilite
      * 2. Une fonction buildOwnerFilter() pour construire les filtres Prisma selon le role
       * 3. Une fonction assertCanMutate() pour valider CREATE/UPDATE/DELETE
        * 4. Un middleware Express requireRole() pour proteger les routes
         *
          * IMPORTANT : ce module ne fait que preparer les fondations.
           * Les routes existantes ne sont PAS modifiees dans ce ticket.
            * L integration effective sera faite dans les tickets suivants.
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
   */
export interface AuthenticatedUser {
    id: string;
    authId: string;
    role: UserRole;
    organizationId: string | null;
    regionId: string | null;
    sectorId: string | null;
    siteId: string | null;
    managerId: string | null;
    /** IDs des subordonnes directs (1 niveau) */
    subordinateIds?: string[];
}

/**
 * Niveaux de visibilite disponibles.
  * Correspondent aux niveaux de la hierarchie organisationnelle.
   */
export type VisibilityScope =
    | 'PERSONAL'      // Uniquement ses propres donnees
    | 'TEAM'          // Ses donnees + donnees de ses commerciaux directs
    | 'SITE'          // Toutes les donnees du site
    | 'SECTOR'        // Toutes les donnees du secteur
    | 'REGION'        // Toutes les donnees de la region
    | 'ORGANIZATION'; // Toutes les donnees de l organisation

// ============================================================
// HIERARCHIE DES ROLES
// ============================================================

/**
 * Mappe chaque role sur son scope de visibilite naturel.
  *
   * CEO              => ORGANIZATION (voit tout)
    * REGIONAL_DIRECTOR => REGION
     * SECTOR_DIRECTOR  => SECTOR
      * SITE_DIRECTOR    => SITE
       * SALES_MANAGER    => TEAM (ses commerciaux + lui-meme)
        * SALES_REP        => PERSONAL (ses donnees uniquement)
         */
export const ROLE_VISIBILITY: Record = {
    CEO: 'ORGANIZATION',
    REGIONAL_DIRECTOR: 'REGION',
    SECTOR_DIRECTOR: 'SECTOR',
    SITE_DIRECTOR: 'SITE',
    SALES_MANAGER: 'TEAM',
    SALES_REP: 'PERSONAL',
};

/**
 * Ordre de priorite des roles (plus la valeur est haute, plus le role est eleve).
  * Utile pour comparer si un utilisateur peut agir sur une ressource d un autre.
   */
export const ROLE_LEVEL: Record = {
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
    * Usage dans une route :
     *   const filter = buildOwnerFilter(currentUser);
      *   const records = await prisma.prospect.findMany({ where: filter });
       *
        * @param user - L utilisateur authentifie avec son role et ses rattachements
         * @returns Un objet Prisma WHERE compatible avec les modeles Prospect, Product, etc.
          */
export function buildOwnerFilter(user: AuthenticatedUser): Record {
    const scope = ROLE_VISIBILITY[user.role];

        switch (scope) {
          case 'PERSONAL':
            // SALES_REP : voit uniquement ses propres donnees
            return { ownerId: user.id };

          case 'TEAM': {
                  // SALES_MANAGER : voit ses donnees + celles de ses subordonnes directs
                  const teamIds = [user.id, ...(user.subordinateIds ?? [])];
                  return { ownerId: { in: teamIds } };
          }

          case 'SITE':
            // SITE_DIRECTOR : voit toutes les donnees du site
            // Necessite une jointure sur owner.siteId — a implementer via include dans la route
            return { owner: { siteId: user.siteId } };

          case 'SECTOR':
            // SECTOR_DIRECTOR : voit toutes les donnees du secteur
            return { owner: { sector: { id: user.sectorId } } };

          case 'REGION':
            // REGIONAL_DIRECTOR : voit toutes les donnees de la region
            return { owner: { region: { id: user.regionId } } };

          case 'ORGANIZATION':
            // CEO : voit toutes les donnees de l organisation
            return { owner: { organizationId: user.organizationId } };

          default:
            // Fallback securise : on ne retourne que les donnees personnelles
            return { ownerId: user.id };
    }
}

// ============================================================
// CONTROLE DES MUTATIONS (CREATE / UPDATE / DELETE)
// ============================================================

/**
 * Verifie si un utilisateur peut modifier ou supprimer une ressource.
  *
   * Regles :
    * - Un utilisateur peut toujours modifier SES PROPRES ressources.
     * - Un utilisateur peut modifier les ressources de ses SUBORDONNES DIRECTS.
      * - Un utilisateur avec un role superieur peut modifier les ressources
       *   de tous les utilisateurs dans son perimetre de visibilite.
        *
         * @param currentUser - L utilisateur qui tente l action
          * @param resourceOwnerId - L ID du proprietaire de la ressource ciblee
           * @returns true si l action est autorisee, false sinon
            */
export function canMutate(
    currentUser: AuthenticatedUser,
    resourceOwnerId: string
  ): boolean {
    // Toujours autoriser les modifications sur ses propres donnees
    if (currentUser.id === resourceOwnerId) return true;

    const scope = ROLE_VISIBILITY[currentUser.role];

        switch (scope) {
          case 'TEAM':
            // SALES_MANAGER peut modifier les donnees de ses subordonnes
            return (currentUser.subordinateIds ?? []).includes(resourceOwnerId);

          case 'SITE':
          case 'SECTOR':
          case 'REGION':
          case 'ORGANIZATION':
            // Les directeurs et le CEO peuvent modifier dans leur perimetre
            // La verification fine (meme site/secteur/region) est faite au niveau de la route
            return true;

          default:
            return false;
    }
}

/**
 * Lance une erreur si l utilisateur ne peut pas muter la ressource.
  * A utiliser dans les routes PUT / DELETE.
   *
    * @throws Error avec message 403
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
  *
   * Usage :
    *   router.delete('/resource/:id', requireRole('SALES_MANAGER'), handler);
     *
      * @param minimumRole - Role minimum requis pour acceder a la route
       */
export function requireRole(minimumRole: UserRole) {
    return (req: Request, res: Response, next: NextFunction): void => {
          // L utilisateur authentifie est injecte par le middleware auth Supabase
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
 * Middleware Express : injecte l utilisateur authentifie dans req.user
  * a partir du contexte Supabase.
   *
    * NOTE : Ce middleware est une fondation.
     * L implementation complete (appel Prisma pour recuperer le User avec ses relations)
      * sera faite dans le ticket d integration des routes.
       *
        * Pour l instant, il prepare l interface et la structure.
         */
export async function injectAuthUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise {
    // Le header Authorization: Bearer <token> est valide en amont par auth.ts
    // Ce middleware recupere ensuite le User Prisma complet avec ses rattachements
    // Implementation a completer lors de l integration des routes (ticket suivant)
    next();
}
