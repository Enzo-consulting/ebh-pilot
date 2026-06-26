# White Label Engine — Ticket 014C

> Version : 1.0
> Date : 2026-06-26
> Ticket : 014C — White Label Engine (Fondations Architecture SaaS)
> Statut : Fondations implementees

---

## 1. Philosophie White Label

EBH Pilot est une plateforme SaaS destinee a etre commercialisee aupres de multiples entreprises.

Chaque client doit avoir la sensation d utiliser son propre logiciel : son logo, ses couleurs, son nom, son domaine. Pourtant, il n existe qu une seule base de code, qu une seule architecture, et qu une seule maintenance.

Le White Label Engine repose sur 3 principes fondamentaux :

**1 — Un seul code, plusieurs identites.** Le code applicatif ne change pas d un client a l autre. Seule la configuration visuelle varie. Cela garantit la maintenabilite et la scalabilite.

**2 — La personnalisation est controlee.** Chaque client peut modifier son apparence, pas son comportement. Les fonctionnalites, les permissions, les regles metier restent identiques pour tous.

**3 — Le fallback est toujours valide.** Si un client n a pas configure son branding, l application reste fonctionnelle avec l identite visuelle EBH Pilot par defaut. Aucune interface ne peut etre cassee par une configuration manquante.

---

## 2. Architecture

### 2.1 Vue d ensemble

```
Supabase (base de donnees)
  └── Organization.isWhiteLabelEnabled
    └── Organization.primaryColor, logoUrl, etc.
              |
                        v
                        API / Frontend : getBranding(organization)
                                  |
                                            v
                                                 BrandingConfig
                                                   ├── colors     (BrandColors)
                                                     ├── logos      (BrandLogos)
                                                       ├── content    (BrandContent)
                                                         ├── support    (BrandSupport)
                                                           ├── locale     (BrandLocale)
                                                             └── domain     (BrandDomain)
                                                                       |
                                                                                 v
                                                                                 Frontend (React + Tailwind)
                                                                                   ├── CSS custom properties via getCssVariables()
                                                                                     ├── Titre navigateur via getBrowserTitle()
                                                                                       ├── Logo via branding.logos.logoUrl
                                                                                         └── Couleurs via branding.colors.primary
                                                                                         ```

                                                                                         ### 2.2 Fichiers du module

                                                                                         | Fichier | Role |
                                                                                         |---------|------|
                                                                                         | `apps/web/src/branding/types.ts` | Interfaces TypeScript (BrandingConfig, BrandColors, etc.) |
                                                                                         | `apps/web/src/branding/defaults.ts` | Valeurs par defaut EBH Pilot (fallback) |
                                                                                         | `apps/web/src/branding/getBranding.ts` | Fonction principale de resolution + helpers |

                                                                                         ### 2.3 Modele Prisma

                                                                                         Le modele `Organization` est le cœur du White Label.

                                                                                         Nouveaux champs (Ticket 014C) :

                                                                                         | Champ | Type | Defaut | Role |
                                                                                         |-------|------|--------|------|
                                                                                         | displayName | String? | null | Nom affiche dans l interface |
                                                                                         | tagline | String? | null | Slogan ou baseline |
                                                                                         | logoCompactUrl | String? | null | Logo compact (sidebar, mobile) |
                                                                                         | faviconUrl | String? | null | Favicon du navigateur |
                                                                                         | loginImageUrl | String? | null | Image page de connexion |
                                                                                         | accentColor | String? | #F59E0B | Couleur d accent |
                                                                                         | defaultTheme | Theme | LIGHT | Theme par defaut (LIGHT/DARK/AUTO) |
                                                                                         | supportEmail | String? | null | Email de support |
                                                                                         | supportPhone | String? | null | Telephone de support |
                                                                                         | customDomain | String? | null | Domaine personnalise (unique) |
                                                                                         | language | String | fr | Code langue ISO 639-1 |
                                                                                         | timezone | String | Europe/Paris | Fuseau horaire IANA |
                                                                                         | currency | String | EUR | Code devise ISO 4217 |
                                                                                         | dateFormat | String | DD/MM/YYYY | Format de date |
                                                                                         | numberFormat | String | , | Separateur decimal |
                                                                                         | privacyPolicyUrl | String? | null | URL politique de confidentialite |
                                                                                         | termsUrl | String? | null | URL des CGU |
                                                                                         | footerLink | String? | null | URL du footer |
                                                                                         | footerText | String? | null | Texte du footer |
                                                                                         | isWhiteLabelEnabled | Boolean | false | Activation du White Label |

                                                                                         ---

                                                                                         ## 3. Fonctionnement

                                                                                         ### 3.1 Activation du White Label

                                                                                         Par defaut, `isWhiteLabelEnabled = false`.

                                                                                         L interface utilise alors l identite visuelle EBH Pilot (couleurs, logo, nom).

                                                                                         Quand l equipe EBH active le White Label pour un client (`isWhiteLabelEnabled = true`), l application applique automatiquement les configurations du client.

                                                                                         **Aucun deploiement n est necessaire pour activer le White Label d un client.**

                                                                                         ### 3.2 Resolution du branding

                                                                                         ```typescript
                                                                                         import { getBranding } from '@/branding/getBranding';

                                                                                         // Exemple dans un composant React ou une route API :
                                                                                         const organization = await prisma.organization.findUnique({ where: { slug } });
                                                                                         const branding = getBranding(organization);

                                                                                         // branding est toujours valide, meme si l organisation n a pas configure son branding
                                                                                         // Les valeurs manquantes sont remplacees par les defauts EBH Pilot
                                                                                         ```

                                                                                         ### 3.3 Application des couleurs

                                                                                         ```typescript
                                                                                         import { getCssVariables } from '@/branding/getBranding';

                                                                                         // Dans le composant racine (App.tsx ou BrandingProvider) :
                                                                                         const cssVars = getCssVariables(branding);
                                                                                         Object.entries(cssVars).forEach(([key, value]) => {
                                                                                           document.documentElement.style.setProperty(key, value);
                                                                                           });

                                                                                           // Puis dans les composants Tailwind :
                                                                                           // bg-[var(--color-primary)] text-[var(--color-text)]
                                                                                           ```

                                                                                           ### 3.4 Titre navigateur

                                                                                           ```typescript
                                                                                           import { getBrowserTitle } from '@/branding/getBranding';

                                                                                           // Dans un composant de page :
                                                                                           document.title = getBrowserTitle(branding, 'Prospects');
                                                                                           // => "Mon CRM — Prospects" (White Label)
                                                                                           // => "EBH Pilot — Prospects" (defaut)
                                                                                           ```

                                                                                           ### 3.5 Domaine personnalise

                                                                                           Le champ `customDomain` est prevu pour les futurs deployements multi-domaines.

                                                                                           Fonctionnement futur :
                                                                                           1. L equipe EBH configure un CNAME sur l hebergeur du client
                                                                                           2. L equipe EBH renseigne `customDomain = "crm.monentreprise.fr"` dans la base
                                                                                           3. Le middleware Nginx/Vercel/Render route les requetes vers le bon tenant
                                                                                           4. Le frontend identifie le tenant via `window.location.hostname`

                                                                                           Cette logique est hors scope Ticket 014C. La structure est prete.

                                                                                           ---

                                                                                           ## 4. Personnalisation Autorisee

                                                                                           | Element | Autorise | Notes |
                                                                                           |---------|---------|-------|
                                                                                           | Logo principal | Oui | URL vers un fichier stocke |
                                                                                           | Logo compact | Oui | Version reduite |
                                                                                           | Favicon | Oui | Format .ico ou .png |
                                                                                           | Image de connexion | Oui | Background page login |
                                                                                           | Couleur principale | Oui | Hex uniquement |
                                                                                           | Couleur secondaire | Oui | Hex uniquement |
                                                                                           | Couleur d accent | Oui | Hex uniquement |
                                                                                           | Theme (light/dark/auto) | Oui | Par defaut uniquement |
                                                                                           | Nom affiche | Oui | displayName |
                                                                                           | Slogan | Oui | tagline |
                                                                                           | Email de support | Oui | supportEmail |
                                                                                           | Telephone de support | Oui | supportPhone |
                                                                                           | Domaine personnalise | Oui | customDomain (futur) |
                                                                                           | Langue | Oui | language (ISO 639-1) |
                                                                                           | Fuseau horaire | Oui | timezone (IANA) |
                                                                                           | Devise | Oui | currency (ISO 4217) |
                                                                                           | Format de date | Oui | dateFormat |
                                                                                           | Footer | Oui | footerText + footerLink |
                                                                                           | CGU / Confidentialite | Oui | URLs seulement |

                                                                                           ---

                                                                                           ## 5. Personnalisation Volontairement Interdite

                                                                                           | Element | Interdit | Raison |
                                                                                           |---------|---------|--------|
                                                                                           | Fonctionnalites metier | Interdit | Une seule base de code |
                                                                                           | Roles et permissions | Interdit | Architecture de securite commune |
                                                                                           | Structure des donnees | Interdit | Schema Prisma partage |
                                                                                           | Routes API | Interdit | Backend commun |
                                                                                           | Composants UI | Interdit | Pas de fork de composants |
                                                                                           | Logique metier | Interdit | Memes regles pour tous |
                                                                                           | Couleurs de statut (success/error) | Interdit | Coherence UX |
                                                                                           | Police de caracteres | Interdit (v1) | A considerer en v2 |
                                                                                           | Layout et structure | Interdit | Navigation identique |

                                                                                           ---

                                                                                           ## 6. Compatibilite SaaS

                                                                                           ### 6.1 Multi-tenant

                                                                                           Le White Label est entierement base sur le modele `Organization`. Chaque tenant possede sa propre configuration. Il n y a aucun partage de configuration entre tenants.

                                                                                           ### 6.2 Scalabilite

                                                                                           La configuration branding est legere (quelques champs texte). Elle peut etre chargee en memoire ou mise en cache (Redis, CDN edge cache) sans impact sur les performances.

                                                                                           Pour plusieurs centaines d organisations simultanees :
                                                                                           - Mise en cache de `getBranding(org)` par `organizationId`
                                                                                           - TTL de quelques minutes (invalidation lors d une mise a jour)
                                                                                           - Pas de redeploiement necessaire lors d un changement de branding

                                                                                           ### 6.3 Domaines personnalises

                                                                                           La resolution du tenant via `customDomain` se fera a l edge (Vercel/Cloudflare) :
                                                                                           1. Requete sur `crm.acme.fr`
                                                                                           2. Edge lookup : `Organization WHERE customDomain = 'crm.acme.fr'`
                                                                                           3. Injection du `organizationId` dans les headers
                                                                                           4. Le frontend consomme `getBranding(org)`

                                                                                           ---

                                                                                           ## 7. Evolutions Prevues

                                                                                           ### Version 1.1 — Thème dynamique complet

                                                                                           Implementer un `BrandingProvider` React qui injecte le branding dans le contexte et applique les CSS custom properties automatiquement.

                                                                                           ### Version 1.2 — Police personnalisee

                                                                                           Permettre l import d une Google Font ou d une police custom par organisation.

                                                                                           ### Version 1.3 — Upload des logos

                                                                                           Integrer Supabase Storage pour l upload direct des logos et favicons. Generer automatiquement les versions redimensionnees (logo compact, favicon).

                                                                                           ### Version 1.4 — Domaines personnalises

                                                                                           Implementer la resolution multi-domaines a l edge. Documenter le processus CNAME pour les clients.

                                                                                           ### Version 1.5 — Page d administration branding

                                                                                           Creer une interface permettant au client de configurer son branding lui-meme (dans les limites autorisees), avec apercu en temps reel.

                                                                                           ### Version 2.0 — Theme sombre

                                                                                           Permettre la definition de palettes completes pour le theme sombre, avec basculement automatique selon les preferences systeme.

                                                                                           ---

                                                                                           ## 8. Checklist du Ticket 014C

                                                                                           - [x] Analyse de l existant (Tickets 014, 014B, schema, documentation)
                                                                                           - [x] Enum Theme cree (LIGHT, DARK, AUTO)
                                                                                           - [x] Organization etendu : displayName, tagline, logoCompactUrl, faviconUrl, loginImageUrl
                                                                                           - [x] Organization etendu : accentColor, defaultTheme
                                                                                           - [x] Organization etendu : supportEmail, supportPhone
                                                                                           - [x] Organization etendu : customDomain (unique, nullable)
                                                                                           - [x] Organization etendu : language, timezone, currency, dateFormat, numberFormat
                                                                                           - [x] Organization etendu : privacyPolicyUrl, termsUrl, footerLink, footerText
                                                                                           - [x] Organization etendu : isWhiteLabelEnabled
                                                                                           - [x] Index Prisma sur customDomain
                                                                                           - [x] apps/web/src/branding/types.ts cree
                                                                                           - [x] BrandColors interface definie
                                                                                           - [x] BrandLogos interface definie
                                                                                           - [x] BrandContent interface definie
                                                                                           - [x] BrandSupport interface definie
                                                                                           - [x] BrandLocale interface definie
                                                                                           - [x] BrandDomain interface definie
                                                                                           - [x] BrandingConfig interface definie
                                                                                           - [x] OrganizationBrandInput type defini
                                                                                           - [x] apps/web/src/branding/defaults.ts cree
                                                                                           - [x] DEFAULT_COLORS, DEFAULT_LOGOS, DEFAULT_CONTENT definis
                                                                                           - [x] DEFAULT_SUPPORT, DEFAULT_LOCALE, DEFAULT_DOMAIN definis
                                                                                           - [x] DEFAULT_BRANDING complet defini
                                                                                           - [x] apps/web/src/branding/getBranding.ts cree
                                                                                           - [x] getBranding() : resolution complete avec fallback
                                                                                           - [x] getBrowserTitle() helper cree
                                                                                           - [x] getCssVariables() helper cree
                                                                                           - [x] docs/WHITE-LABEL-ENGINE.md cree
                                                                                           - [x] Philosophie documentee
                                                                                           - [x] Architecture documentee
                                                                                           - [x] Personnalisation autorisee documentee
                                                                                           - [x] Personnalisation interdite documentee
                                                                                           - [x] Compatibilite SaaS documentee
                                                                                           - [x] Evolutions futures documentees
                                                                                           - [x] Commits propres crees
                                                                                           - [ ] BrandingProvider React (hors scope — v1.1)
                                                                                           - [ ] Upload logos Supabase Storage (hors scope — v1.3)
                                                                                           - [ ] Resolution domaines personnalises (hors scope — v1.4)
                                                                                           - [ ] Page administration branding (hors scope — v1.5)
                                                                                           
