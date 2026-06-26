/**
 * types.ts
 * Ticket 014C — White Label Engine : definitions de types centralisees
 *
 * Ce module definit toutes les interfaces TypeScript du systeme de branding.
 * Ces types sont utilises par getBranding() et consommes par le frontend.
 *
 * Architecture :
 * Organization (Prisma) -> getBranding() -> BrandingConfig (UI)
 */

// ============================================================
// THEME
// ============================================================

/** Theme d interface disponibles */
export type Theme = 'LIGHT' | 'DARK' | 'AUTO';

// ============================================================
// COULEURS
// ============================================================

/**
 * Palette de couleurs de la marque.
 * Toutes les couleurs sont des valeurs hex (#RRGGBB).
 * Le frontend les applique via CSS custom properties.
 */
export interface BrandColors {
    /** Couleur principale — boutons primaires, liens actifs */
  primary: string;
    /** Couleur secondaire — elements de support, gradients */
  secondary: string;
    /** Couleur d accent — badges, highlights, CTAs secondaires */
  accent: string;
    /** Couleur de succes — alertes positives, confirmations */
  success: string;
    /** Couleur d avertissement — alertes warning */
  warning: string;
    /** Couleur d erreur — alertes d erreur, validations */
  error: string;
    /** Couleur de fond principal de l application */
  background: string;
    /** Couleur du texte principal */
  text: string;
}

// ============================================================
// LOGOS ET IMAGES
// ============================================================

/**
 * URLs des assets visuels de la marque.
 * Toutes les URLs sont optionnelles — des fallbacks sont appliques si null.
 * Les fichiers eux-memes sont stockes dans Supabase Storage (hors scope Ticket 014C).
 */
export interface BrandLogos {
    /** Logo principal — format rectangle, recommande 400x100px, fond transparent */
  logoUrl: string | null;
    /** Logo compact — carre ou icone, recommande 64x64px (sidebar collapsed, mobile) */
  logoCompactUrl: string | null;
    /** Favicon — format .ico ou .png 32x32 */
  faviconUrl: string | null;
    /** Image de fond de la page de connexion — recommande 1920x1080px */
  loginImageUrl: string | null;
}

// ============================================================
// CONTENU ET TEXTES
// ============================================================

/**
 * Textes et contenus editoriaux de la marque.
 * Personnalise les labels et textes affiches dans l interface.
 */
export interface BrandContent {
    /** Nom affiche dans l interface (ex: "Mon CRM", "Pilot Renault") */
  displayName: string;
    /** Nom legal complet de l entreprise */
  companyName: string;
    /** Slogan ou baseline (ex: "Votre outil commercial") */
  tagline: string | null;
    /** Titre affiché dans l onglet navigateur (ex: "Mon CRM — Connexion") */
  browserTitle: string;
    /** Texte du footer (ex: "2026 Acme Corp. Tous droits reserves.") */
  footerText: string | null;
    /** URL du footer */
  footerLink: string | null;
    /** URL de la politique de confidentialite */
  privacyPolicyUrl: string | null;
  /** URL des CGU */
  termsUrl: string | null;
}

// ============================================================
// CONTACT ET SUPPORT
// ============================================================

/**
 * Informations de contact affichees dans l interface.
 */
export interface BrandSupport {
    /** Email de support (affiche dans les pages d erreur, aide) */
  email: string | null;
    /** Telephone de support */
  phone: string | null;
    /** Site web institutionnel */
  website: string | null;
}

// ============================================================
// PARAMETRES REGIONAUX
// ============================================================

/**
 * Parametres de localisation de l organisation.
 * Utilises pour le formatage des dates, montants et langues.
 */
export interface BrandLocale {
    /** Code langue ISO 639-1 (ex: "fr", "en", "es") */
  language: string;
    /** Fuseau horaire IANA (ex: "Europe/Paris") */
  timezone: string;
    /** Code devise ISO 4217 (ex: "EUR", "USD") */
  currency: string;
    /** Format de date (ex: "DD/MM/YYYY") */
  dateFormat: string;
    /** Format des nombres — separateur decimal (ex: "," ou ".") */
  numberFormat: string;
}

// ============================================================
// DOMAINE
// ============================================================

/**
 * Configuration du domaine personnalise.
 * La gestion DNS est hors scope — ce type prepare simplement la structure.
 */
export interface BrandDomain {
    /** Domaine personnalise (ex: "crm.monentreprise.fr") ou null si defaut EBH */
  customDomain: string | null;
    /** Slug interne du tenant (ex: "acme-corp") */
  slug: string;
}

// ============================================================
// CONFIGURATION COMPLETE
// ============================================================

/**
 * Configuration complete de branding pour une organisation.
 * Produite par getBranding(organization) et consommee par le frontend.
 *
 * Usage :
 *   const branding = getBranding(organization);
 *   // -> branding.colors.primary, branding.logos.faviconUrl, etc.
 */
export interface BrandingConfig {
    /** Identifiant de l organisation */
  organizationId: string;
    /** Theme d interface par defaut */
  theme: Theme;
    /** White Label active pour cette organisation */
  isWhiteLabel: boolean;
    /** Palette de couleurs */
  colors: BrandColors;
    /** Assets visuels (logos, images) */
  logos: BrandLogos;
    /** Contenus editoriaux */
  content: BrandContent;
    /** Informations de support */
  support: BrandSupport;
    /** Parametres de localisation */
  locale: BrandLocale;
    /** Configuration du domaine */
  domain: BrandDomain;
}

// ============================================================
// TYPE MINIMAL ORGANISATION (pour eviter import circulaire)
// ============================================================

/**
 * Sous-ensemble des champs Organization necessaires au branding.
 * Permet d utiliser getBranding() sans importer le client Prisma.
 * Les champs optionnels correspondent aux nouvelles colonnes White Label.
 */
export interface OrganizationBrandInput {
    id: string;
    name: string;
    displayName?: string | null;
    slug: string;
    tagline?: string | null;
    logoUrl?: string | null;
    logoCompactUrl?: string | null;
    faviconUrl?: string | null;
    loginImageUrl?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    accentColor?: string | null;
    defaultTheme?: string | null;
    website?: string | null;
    supportEmail?: string | null;
    supportPhone?: string | null;
    customDomain?: string | null;
    language?: string | null;
    timezone?: string | null;
    currency?: string | null;
    dateFormat?: string | null;
    numberFormat?: string | null;
    privacyPolicyUrl?: string | null;
    termsUrl?: string | null;
    footerLink?: string | null;
    footerText?: string | null;
    isWhiteLabelEnabled?: boolean | null;
}
