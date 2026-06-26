/**
 * getBranding.ts
 * Ticket 014C — White Label Engine : fonction principale de resolution du branding
 *
 * Usage :
 *   import { getBranding } from '@/branding/getBranding';
 *   const branding = getBranding(organization);
 *
 * La fonction prend un objet Organisation (ou sous-ensemble) et retourne
 * une configuration de branding complete, avec fallback sur les valeurs par defaut.
 *
 * Cette approche garantit :
 * - Aucune valeur null dans le resultat (toujours un branding valide)
 * - Un seul point d entree pour toute la configuration visuelle
 * - Une compatibilite totale avec les organisations sans White Label active
 */

import type { BrandingConfig, OrganizationBrandInput, Theme } from './types.js';
import {
    DEFAULT_BRANDING,
    DEFAULT_COLORS,
    DEFAULT_CONTENT,
    DEFAULT_DOMAIN,
    DEFAULT_LOCALE,
    DEFAULT_LOGOS,
    DEFAULT_SUPPORT,
} from './defaults.js';

// ============================================================
// FONCTION PRINCIPALE
// ============================================================

/**
 * Resout la configuration de branding complete pour une organisation.
 *
 * Comportement :
 * - Si isWhiteLabelEnabled = false : retourne le branding par defaut EBH Pilot
 * - Si isWhiteLabelEnabled = true : fusionne les valeurs de l organisation sur les defauts
 * - Les valeurs null ou undefined sont remplacees par les valeurs par defaut
 *
 * @param org - Donnees Organisation (Prisma ou sous-ensemble OrganizationBrandInput)
 * @returns BrandingConfig complete, prete pour le frontend
 */
export function getBranding(org: OrganizationBrandInput): BrandingConfig {
    // Si White Label non active : retourner le branding par defaut avec les infos de domaine
  if (!org.isWhiteLabelEnabled) {
        return {
                ...DEFAULT_BRANDING,
                organizationId: org.id,
                domain: {
                          customDomain: null,
                          slug: org.slug,
                },
        };
  }

  // White Label active : fusionner les valeurs de l organisation avec les defauts
  return {
        organizationId: org.id,
        theme: resolveTheme(org.defaultTheme),
        isWhiteLabel: true,

        colors: {
                primary: org.primaryColor ?? DEFAULT_COLORS.primary,
                secondary: org.secondaryColor ?? DEFAULT_COLORS.secondary,
                accent: org.accentColor ?? DEFAULT_COLORS.accent,
                success: DEFAULT_COLORS.success,
                warning: DEFAULT_COLORS.warning,
                error: DEFAULT_COLORS.error,
                background: DEFAULT_COLORS.background,
                text: DEFAULT_COLORS.text,
        },

        logos: {
                logoUrl: org.logoUrl ?? DEFAULT_LOGOS.logoUrl,
                logoCompactUrl: org.logoCompactUrl ?? DEFAULT_LOGOS.logoCompactUrl,
                faviconUrl: org.faviconUrl ?? DEFAULT_LOGOS.faviconUrl,
                loginImageUrl: org.loginImageUrl ?? DEFAULT_LOGOS.loginImageUrl,
        },

        content: {
                displayName: org.displayName ?? org.name ?? DEFAULT_CONTENT.displayName,
                companyName: org.name ?? DEFAULT_CONTENT.companyName,
                tagline: org.tagline ?? DEFAULT_CONTENT.tagline,
                browserTitle: org.displayName ?? org.name ?? DEFAULT_CONTENT.browserTitle,
                footerText: org.footerText ?? DEFAULT_CONTENT.footerText,
                footerLink: org.footerLink ?? DEFAULT_CONTENT.footerLink,
                privacyPolicyUrl: org.privacyPolicyUrl ?? DEFAULT_CONTENT.privacyPolicyUrl,
                termsUrl: org.termsUrl ?? DEFAULT_CONTENT.termsUrl,
        },

        support: {
                email: org.supportEmail ?? DEFAULT_SUPPORT.email,
                phone: org.supportPhone ?? DEFAULT_SUPPORT.phone,
                website: org.website ?? DEFAULT_SUPPORT.website,
        },

        locale: {
                language: org.language ?? DEFAULT_LOCALE.language,
                timezone: org.timezone ?? DEFAULT_LOCALE.timezone,
                currency: org.currency ?? DEFAULT_LOCALE.currency,
                dateFormat: org.dateFormat ?? DEFAULT_LOCALE.dateFormat,
                numberFormat: org.numberFormat ?? DEFAULT_LOCALE.numberFormat,
        },

        domain: {
                customDomain: org.customDomain ?? DEFAULT_DOMAIN.customDomain,
                slug: org.slug,
        },
  };
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Resout la valeur du theme depuis la chaine stockee en base.
 * Retourne LIGHT par defaut si la valeur est invalide.
 */
function resolveTheme(value: string | null | undefined): Theme {
    if (value === 'DARK' || value === 'LIGHT' || value === 'AUTO') {
          return value;
    }
    return 'LIGHT';
}

/**
 * Genere le titre de l onglet navigateur.
 * Usage : setBrowserTitle(branding, 'Connexion') => "Mon CRM — Connexion"
 *
 * @param branding - Configuration de branding resolue
 * @param pageName - Nom de la page courante (optionnel)
 */
export function getBrowserTitle(branding: BrandingConfig, pageName?: string): string {
    const base = branding.content.browserTitle;
    if (!pageName) return base;
    return `${base} — ${pageName}`;
}

/**
 * Retourne un objet de variables CSS personnalisees a partir du branding.
 * A injecter dans un style tag ou via document.documentElement.style.
 *
 * Exemple d usage dans le frontend :
 *   const cssVars = getCssVariables(branding);
 *   Object.entries(cssVars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
 */
export function getCssVariables(branding: BrandingConfig): Record<string, string> {
    return {
          '--color-primary': branding.colors.primary,
          '--color-secondary': branding.colors.secondary,
          '--color-accent': branding.colors.accent,
          '--color-success': branding.colors.success,
          '--color-warning': branding.colors.warning,
          '--color-error': branding.colors.error,
          '--color-background': branding.colors.background,
          '--color-text': branding.colors.text,
    };
}
