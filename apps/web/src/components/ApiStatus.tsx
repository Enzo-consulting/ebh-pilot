import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

type ApiState = 'loading' | 'connected' | 'unavailable';

/**
 * Non-blocking API health indicator.
 * Performs a single GET /api/health at mount and displays the result.
 * The application renders normally regardless of the result.
 */
export function ApiStatus() {
    const [state, setState] = useState<ApiState>('loading');

  useEffect(() => {
        let cancelled = false;
        api
          .health()
          .then((res) => {
                    if (!cancelled) {
                                setState(res.status === 'ok' ? 'connected' : 'unavailable');
                    }
          })
          .catch(() => {
                    if (!cancelled) setState('unavailable');
          });
        return () => {
                cancelled = true;
        };
  }, []);

  if (state === 'loading') {
        return (
                <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Vérification API…
                </span>span>
              );
  }
  
    if (state === 'connected') {
          return (
                  <span className="inline-flex items-center gap-1.5 text-xs text-green-500">
                          <CheckCircle className="h-3 w-3" />
                          API connectée
                  </span>span>
                );
    }
  
    return (
          <span className="inline-flex items-center gap-1.5 text-xs text-red-500">
                <XCircle className="h-3 w-3" />
                API indisponible
          </span>span>
        );
}
</span>
