/**
 * defaults.ts
  * Ticket 014C — White Label Engine : valeurs de branding par defaut
   *
    * Ces valeurs sont utilisees comme fallback quand une organisation
     * n a pas configure son branding personnalise.
      *
       * Elles representent l identite visuelle d EBH Pilot par defaut.
        * Quand isWhiteLabelEnabled = false, l interface utilise ces valeurs.
         */

import type { BrandColors, BrandContent, BrandDomain, BrandLocale, BrandLogos, BrandSupport, BrandingConfig } from './types.js';

// ============================================================
// COULEURS PAR DEFAUT
// ============================================================

export const DEFAULT_COLORS: BrandColors = {
    primary: '#3B82F6',    // Blue 500
    secondary: '#1E40AF',  // Blue 800
    accent: '#F59E0B',     // Amber 500
    success: '#10B981',    // Emerald 500
    warning: '#F59E0B',    // Amber 500
    error: '#EF4444',      // Red 500
    background: '#F9FAFB', // Gray 50
    text: '#111827',       // Gray 900
};

// ============================================================
// LOGOS PAR DEFAUT
// ============================================================

export const DEFAULT_LOGOS: BrandLogos = {
    logoUrl: null,
    logoCompactUrl: null,
    faviconUrl: null,
    loginImageUrl: null,
};

// ============================================================
// CONTENU PAR DEFAUT
// ============================================================

export const DEFAULT_CONTENT: BrandContent = {
    displayName: 'EBH Pilot',
    companyName: 'EBH Pilot',
    tagline: 'Votre plateforme commerciale',
    browserTitle: 'EBH Pilot',
    footerText: null,
    footerLink: null,
    privacyPolicyUrl: null,
    termsUrl: null,
};

// ============================================================
// SUPPORT PAR DEFAUT
// ============================================================

export const DEFAULT_SUPPORT: BrandSupport = {
    email: null,
    phone: null,
    website: null,
};

// ============================================================
// LOCALE PAR DEFAUT
// ============================================================

export const DEFAULT_LOCALE: BrandLocale = {
    language: 'fr',
    timezone: 'Europe/Paris',
    currency: 'EUR',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: ',',
};

// ============================================================
// BRANDING COMPLET PAR DEFAUT
// ============================================================

/**
 * Configuration de branding complete par defaut.
  * Utilisee quand aucune organisation n est identifiee,
   * ou quand isWhiteLabelEnabled = false.
    */
export const DEFAULT_BRANDING: Omit<BrandingConfig, 'organizationId' | 'domain'> = {
    theme: 'LIGHT',
    isWhiteLabel: false,
    colors: DEFAULT_COLORS,
    logos: DEFAULT_LOGOS,
    content: DEFAULT_CONTENT,
    support: DEFAULT_SUPPORT,
    locale: DEFAULT_LOCALE,
};

/**
 * Domaine par defaut (avant resolution du tenant).
  * Utilise comme placeholder dans les contextes sans organisation.
   */
export const DEFAULT_DOMAIN: BrandDomain = {
    customDomain: null,
    slug: 'default',
};
