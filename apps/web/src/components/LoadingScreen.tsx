import { Sparkles } from 'lucide-react';

/**
 * Full-screen loading screen displayed while the application initialises.
 * Uses the same design tokens as the rest of the app (bg-bg, text-fg-*,
 * brand-600) so it feels native regardless of the active theme.
 */
export function LoadingScreen() {
    return (
          <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg">
            {/* Logo mark */}
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 shadow-lg">
                        <Sparkles className="h-6 w-6 text-white" />
                </div>div>
          
            {/* App name */}
                <span className="text-lg font-semibold tracking-tight text-fg">
                        EBH Pilot
                </span>span>
          
            {/* Animated dots */}
                <div className="flex items-center gap-1.5" aria-label="Chargement en cours">
                        <span
                                    className="h-2 w-2 rounded-full bg-brand-600 opacity-75"
                                    style={{ animation: 'bounce 1s infinite 0ms' }}
                                  />
                        <span
                                    className="h-2 w-2 rounded-full bg-brand-600 opacity-75"
                                    style={{ animation: 'bounce 1s infinite 150ms' }}
                                  />
                        <span
                                    className="h-2 w-2 rounded-full bg-brand-600 opacity-75"
                                    style={{ animation: 'bounce 1s infinite 300ms' }}
                                  />
                </div>div>
          
                    <p className="text-sm text-fg-muted">Chargement…</p>p>
          </div>div>
        );
}
</div>
