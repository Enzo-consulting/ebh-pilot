/**
 * BrandingProvider.tsx
 * Ticket 014D — White Label Activation
 *
 * Fournit le contexte de branding a toute l application.
 * Charge les valeurs par defaut (Ticket 014C) et prepare
 * le chargement futur depuis l API Organization.
 *
 * Usage :
 * <BrandingProvider>
 * <App />
 * </BrandingProvider>
 *
 * Consommation :
 * const branding = useBranding();
 */

import {
   createContext,
   useContext,
   useEffect,
   useMemo,
   useState,
   type ReactNode,
} from 'react';
import type { BrandingConfig } from './types';
import { DEFAULT_BRANDING } from './defaults';
import { getCssVariables } from './getBranding';

// ============================================================
// CONTEXTE
// ============================================================

interface BrandingContextValue {
   /** Configuration de branding courante */
 branding: BrandingConfig;
   /** Indique si le branding est en cours de chargement depuis l API */
 isLoading: boolean;
   /**
   * Permet de surcharger le branding manuellement.
   * Sera appele par le systeme d auth une fois l organisation chargee.
   */
 setBranding: (config: BrandingConfig) => void;
}

const BrandingContext = createContext<BrandingContextValue | null>(null);

// ============================================================
// PROVIDER
// ============================================================

interface BrandingProviderProps {
   children: ReactNode;
   /**
   * Branding initial optionnel.
   * Si non fourni, utilise DEFAULT_BRANDING (EBH Pilot).
   * Sera remplace au chargement de l organisation.
   */
 initial?: BrandingConfig;
}

export function BrandingProvider({ children, initial }: BrandingProviderProps) {
   const [branding, setBranding] = useState<BrandingConfig>(
      initial ?? DEFAULT_BRANDING,
      );
   const [isLoading, setIsLoading] = useState(false);

 /**
   * Injection automatique des CSS variables a chaque changement de branding.
   * Cela permet a Tailwind et aux composants d utiliser les couleurs dynamiquement.
   */
 useEffect(() => {
    const variables = getCssVariables(branding);
    const root = document.documentElement;
    Object.entries(variables).forEach(([key, value]) => {
       root.style.setProperty(key, value);
    });
 }, [branding]);

 /**
   * Mise a jour du browser title a chaque changement de branding.
   */
 useEffect(() => {
    document.title = branding.content.browserTitle;
 }, [branding.content.browserTitle]);

 const value = useMemo<BrandingContextValue>(
    () => ({
       branding,
       isLoading,
       setBranding: (config: BrandingConfig) => {
          setIsLoading(false);
          setBranding(config);
       },
    }),
    [branding, isLoading],
    );

 return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>BrandingContext.Provider>
    );
}

// ============================================================
// HOOK
// ============================================================

/**
 * Retourne la configuration de branding courante.
 * Doit etre utilise a l interieur de <BrandingProvider>.
 */
export function useBranding(): BrandingConfig {
   const ctx = useContext(BrandingContext);
   if (!ctx) throw new Error('useBranding must be used within <BrandingProvider>');
   return ctx.branding;
}

/**
 * Retourne l objet contexte complet, incluant isLoading et setBranding.
 * A utiliser dans les composants systeme (auth, init) plutot que dans l UI.
 */
export function useBrandingContext(): BrandingContextValue {
   const ctx = useContext(BrandingContext);
   if (!ctx) throw new Error('useBrandingContext must be used within <BrandingProvider>');
   return ctx;
}
