/**
 * moduleEngine.ts
  * Ticket 016 — Module Engine & Feature Flags
   *
    * Ce module expose les fonctions et middlewares pour controler l acces
     * aux modules et fonctionnalites d EBH Pilot par organisation.
      *
       * Architecture :
        * Organization -> OrganizationModule -> Module
         * Organization -> OrganizationFeature -> Feature
          *
           * Usage dans les routes :
            * router.get('/ai', requireModule('ai'), requireFeature('AI_ANALYSIS'), handler)
             *
              * Compatibilite :
               * - Multi-tenant (par organizationId)
                * - White Label (aucun impact)
                 * - Business Units (aucun impact)
                  * - Hierarchie (aucun impact)
                   * - Branding (aucun impact)
                    */

import { Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import type { AuthedRequestWithUser } from './dataIsolation.js';

// ============================================================
// TYPES
// ============================================================

/** Code d un module (valeur libre, ex: "crm", "products", "hr") */
export type ModuleCode = string;

/** Code d une feature (doit correspondre a l enum FeatureCode en base) */
export type FeatureCode = string;

/** Resultat d une verification de module */
export interface ModuleCheckResult {
  enabled: boolean;
  module: { code: string; name: string; isCore: boolean } | null;
  organizationModule: { isEnabled: boolean; expiresAt: Date | null } | null;
}

/** Resultat d une verification de feature */
export interface FeatureCheckResult {
  enabled: boolean;
  feature: { code: string; name: string; isBeta: boolean } | null;
  organizationFeature: { isEnabled: boolean; expiresAt: Date | null; quota: number | null; usageCount: number } | null;
}

// ============================================================
// HELPERS — VERIFICATION
// ============================================================

/**
 * Verifie si un module est actif pour une organisation.
  *
   * Un module est accessible si :
    * - Il est marque isCore = true (toujours actif)
     * - OU l organisation possede une entree OrganizationModule avec isEnabled = true
      *   et sans date d expiration depassee
       *
        * @param organizationId - ID de l organisation
         * @param moduleCode - Code du module (ex: "crm", "products")
          * @returns ModuleCheckResult
           */
export async function hasModule(
  organizationId: string,
  moduleCode: ModuleCode,
): Promise<ModuleCheckResult> {
  const module = await prisma.module.findUnique({
    where: { code: moduleCode },
    select: { id: true, code: true, name: true, isCore: true, isActive: true },
  });

  if (!module || !module.isActive) {
    return { enabled: false, module: null, organizationModule: null };
  }

  // Module core : toujours actif
  if (module.isCore) {
    return {
      enabled: true,
      module: { code: module.code, name: module.name, isCore: true },
      organizationModule: null,
    };
  }

  // Verifier la souscription de l organisation
  const orgModule = await prisma.organizationModule.findUnique({
    where: { organizationId_moduleId: { organizationId, moduleId: module.id } },
    select: { isEnabled: true, expiresAt: true },
  });

  if (!orgModule || !orgModule.isEnabled) {
    return {
      enabled: false,
      module: { code: module.code, name: module.name, isCore: false },
      organizationModule: orgModule,
    };
  }

  // Verifier l expiration
  const isExpired = orgModule.expiresAt ? orgModule.expiresAt < new Date() : false;

  return {
    enabled: !isExpired,
    module: { code: module.code, name: module.name, isCore: false },
    organizationModule: { isEnabled: orgModule.isEnabled, expiresAt: orgModule.expiresAt },
  };
}

/**
 * Verifie si une feature est active pour une organisation.
  *
   * Une feature est accessible si :
    * - L organisation possede une entree OrganizationFeature avec isEnabled = true
     * - La date d expiration n est pas depassee
      * - Le quota n est pas depasse (si quota != null)
       *
        * @param organizationId - ID de l organisation
         * @param featureCode - Code de la feature (enum FeatureCode)
          * @returns FeatureCheckResult
           */
export async function hasFeature(
  organizationId: string,
  featureCode: FeatureCode,
): Promise<FeatureCheckResult> {
  const feature = await prisma.feature.findUnique({
    where: { code: featureCode as never },
    select: { id: true, code: true, name: true, isBeta: true, isActive: true },
  });

  if (!feature || !feature.isActive) {
    return { enabled: false, feature: null, organizationFeature: null };
  }

  const orgFeature = await prisma.organizationFeature.findUnique({
    where: { organizationId_featureId: { organizationId, featureId: feature.id } },
    select: { isEnabled: true, expiresAt: true, quota: true, usageCount: true },
  });

  if (!orgFeature || !orgFeature.isEnabled) {
    return {
      enabled: false,
      feature: { code: String(feature.code), name: feature.name, isBeta: feature.isBeta },
      organizationFeature: orgFeature
        ? { isEnabled: orgFeature.isEnabled, expiresAt: orgFeature.expiresAt, quota: orgFeature.quota, usageCount: orgFeature.usageCount }
        : null,
    };
  }

  const isExpired = orgFeature.expiresAt ? orgFeature.expiresAt < new Date() : false;
  const isQuotaExceeded = orgFeature.quota != null && orgFeature.usageCount >= orgFeature.quota;

  return {
    enabled: !isExpired && !isQuotaExceeded,
    feature: { code: String(feature.code), name: feature.name, isBeta: feature.isBeta },
    organizationFeature: {
      isEnabled: orgFeature.isEnabled,
      expiresAt: orgFeature.expiresAt,
      quota: orgFeature.quota,
      usageCount: orgFeature.usageCount,
    },
  };
}

/**
 * Retourne la liste de tous les modules actives pour une organisation.
  * Inclut automatiquement les modules core.
   *
    * @param organizationId - ID de l organisation
     * @returns Liste des codes de modules actifs
      */
export async function getEnabledModules(organizationId: string): Promise<string[]> {
  // Modules core : toujours actifs
  const coreModules = await prisma.module.findMany({
    where: { isCore: true, isActive: true },
    select: { code: true },
  });

  // Modules souscrits par l organisation
  const orgModules = await prisma.organizationModule.findMany({
    where: {
      organizationId,
      isEnabled: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { module: { select: { code: true, isActive: true } } },
  });

  const subscribedCodes = orgModules
    .filter((om) => om.module.isActive)
    .map((om) => om.module.code);

  const coreCodes = coreModules.map((m) => m.code);

  // Deduplication
  return [...new Set([...coreCodes, ...subscribedCodes])];
}

/**
 * Retourne la liste de toutes les features actives pour une organisation.
  *
   * @param organizationId - ID de l organisation
    * @returns Liste des codes de features actives
     */
export async function getEnabledFeatures(organizationId: string): Promise<string[]> {
  const orgFeatures = await prisma.organizationFeature.findMany({
    where: {
      organizationId,
      isEnabled: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: {
      feature: { select: { code: true, isActive: true } },
      quota: true,
      usageCount: true,
    },
  });

  return orgFeatures
    .filter((of) => of.feature.isActive)
    .filter((of) => of.quota == null || of.usageCount < of.quota)
    .map((of) => String(of.feature.code));
}

// ============================================================
// MIDDLEWARES EXPRESS
// ============================================================

/**
 * Middleware Express : verifie qu un module est actif pour l organisation courante.
  *
   * Necessite req.authUser (injecte par injectAuthUser()).
    * Si l organisation n est pas configuree, laisse passer (fallback permissif).
     *
      * Usage :
       * router.get('/crm', requireModule('crm'), handler)
        *
         * @param moduleCode - Code du module requis
          */
export function requireModule(moduleCode: ModuleCode) {
  return async (
    req: AuthedRequestWithUser,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const organizationId = req.authUser?.organizationId;

    // Si pas d organisation configuree : mode permissif (dev / onboarding)
    if (!organizationId) {
      next();
      return;
    }

    try {
      const result = await hasModule(organizationId, moduleCode);
      if (!result.enabled) {
        res.status(403).json({
          error: `Module '${moduleCode}' non actif pour votre organisation.`,
          code: 'MODULE_DISABLED',
          module: moduleCode,
        });
        return;
      }
      next();
    } catch {
      // En cas d erreur de BD : ne pas bloquer (fail open)
      next();
    }
  };
}

/**
 * Middleware Express : verifie qu une feature est active pour l organisation courante.
  *
   * Usage :
    * router.post('/ai/translate', requireFeature('AI_TRANSLATION'), handler)
     *
      * @param featureCode - Code de la feature requise (FeatureCode enum)
       */
export function requireFeature(featureCode: FeatureCode) {
  return async (
    req: AuthedRequestWithUser,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const organizationId = req.authUser?.organizationId;

    if (!organizationId) {
      next();
      return;
    }

    try {
      const result = await hasFeature(organizationId, featureCode);
      if (!result.enabled) {
        const isQuotaIssue =
          result.organizationFeature?.quota != null &&
          result.organizationFeature.usageCount >= (result.organizationFeature.quota ?? 0);

        res.status(403).json({
          error: isQuotaIssue
            ? `Quota de la fonctionnalite '${featureCode}' atteint.`
            : `Fonctionnalite '${featureCode}' non activee pour votre organisation.`,
          code: isQuotaIssue ? 'FEATURE_QUOTA_EXCEEDED' : 'FEATURE_DISABLED',
          feature: featureCode,
        });
        return;
      }
      next();
    } catch {
      next();
    }
  };
}
