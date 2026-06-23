import { useState } from 'react';
import { Link2, X, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button, Card, CardBody, Badge } from '@ebh/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Statuts possibles d'un import IA */
type ImportStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';

/** Entrée de l'historique des imports */
interface ImportEntry {
  id: string;
  date: string;
  url: string;
  status: ImportStatus;
  user: string;
}

// ─── Données mockées ──────────────────────────────────────────────────────────

/** Historique fictif pour démonstration (aucun appel API) */
const MOCK_HISTORY: ImportEntry[] = [
  {
    id: '1',
    date: '23/06/2026 14:32',
    url: 'https://fournisseur-exemple.fr/produits/velo-cargo-x200',
    status: 'SUCCESS',
    user: 'alice@ebhpilot.fr',
  },
  {
    id: '2',
    date: '23/06/2026 11:15',
    url: 'https://grossiste-sport.com/catalogue/trottinette-pro-v3',
    status: 'FAILED',
    user: 'bob@ebhpilot.fr',
  },
  {
    id: '3',
    date: '22/06/2026 17:08',
    url: 'https://import-direct.eu/ref/casque-connex-09',
    status: 'PROCESSING',
    user: 'alice@ebhpilot.fr',
  },
  {
    id: '4',
    date: '22/06/2026 09:45',
    url: 'https://fournisseur-exemple.fr/produits/batterie-42ah',
    status: 'PENDING',
    user: 'charlie@ebhpilot.fr',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Retourne le tone du Badge selon le statut */
function statusTone(
  status: ImportStatus,
): 'neutral' | 'success' | 'danger' | 'warning' | 'brand' {
  switch (status) {
    case 'PENDING':
      return 'neutral';
    case 'PROCESSING':
      return 'brand';
    case 'SUCCESS':
      return 'success';
    case 'FAILED':
      return 'danger';
  }
}

/** Retourne le libellé français du statut */
function statusLabel(status: ImportStatus): string {
  switch (status) {
    case 'PENDING':
      return 'En attente';
    case 'PROCESSING':
      return 'En cours';
    case 'SUCCESS':
      return 'Succès';
    case 'FAILED':
      return 'Échec';
  }
}

/** Icône associée au statut */
function StatusIcon({ status }: { status: ImportStatus }) {
  const cls = 'h-3.5 w-3.5';
  switch (status) {
    case 'PENDING':
      return <Clock className={cls} />;
    case 'PROCESSING':
      return <Loader2 className={`${cls} animate-spin`} />;
    case 'SUCCESS':
      return <CheckCircle2 className={cls} />;
    case 'FAILED':
      return <XCircle className={cls} />;
  }
}

// ─── Validation URL ───────────────────────────────────────────────────────────

/** Valide que la valeur est une URL commençant par http:// ou https:// */
function validateUrl(value: string): string | null {
  if (!value.trim()) return "L'URL est obligatoire.";
  if (!/^https?:\/\//.test(value.trim()))
    return "L'URL doit commencer par http:// ou https://";
  return null;
}

// ─── Composant principal ──────────────────────────────────────────────────────

/**
 * Page AI Import — TICKET 009.1
 * Interface uniquement : aucune logique de scraping ni appel OpenAI.
 * Prête à être connectée aux tickets suivants.
 */
export function AiImport() {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  /** Valide en temps réel une fois le champ touché */
  function handleChange(value: string) {
    setUrl(value);
    if (touched) setError(validateUrl(value));
  }

  /** Déclenche la validation au blur */
  function handleBlur() {
    setTouched(true);
    setError(validateUrl(url));
  }

  /** Réinitialise le formulaire */
  function handleClear() {
    setUrl('');
    setError(null);
    setTouched(false);
  }

  /**
   * Soumission : valide l'URL uniquement.
   * Aucun appel API — le branchement IA viendra au ticket suivant.
   */
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    const err = validateUrl(url);
    setError(err);
    if (err) return;
    // TODO : déclencher le scraping + génération IA (ticket suivant)
    alert('Interface prête — la logique IA sera branchée au ticket suivant.');
  }

  return (
    <div className="space-y-8">
      {/* ── En-tête ───────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI Import</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Collez une URL fournisseur pour générer automatiquement une fiche produit.
        </p>
      </div>

      {/* ── Formulaire ────────────────────────────────────────────────────── */}
      <Card>
        <CardBody>
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Champ URL fournisseur */}
            <div className="space-y-1.5">
              <label
                htmlFor="supplier-url"
                className="block text-sm font-medium text-fg"
              >
                URL fournisseur
              </label>
              <div className="relative">
                <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
                <input
                  id="supplier-url"
                  type="url"
                  value={url}
                  onChange={(e) => handleChange(e.target.value)}
                  onBlur={handleBlur}
                  placeholder="https://..."
                  aria-invalid={!!error}
                  aria-describedby={error ? 'url-error' : undefined}
                  className={`h-9 w-full rounded-lg border bg-surface-2 pl-9 pr-3 text-sm outline-none
                    placeholder:text-fg-muted transition-colors
                    ${
                      error
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-border focus:border-brand-500'
                    }`}
                />
              </div>
              {/* Message d'erreur accessible */}
              {error && (
                <p
                  id="url-error"
                  role="alert"
                  className="flex items-center gap-1.5 text-xs text-red-500"
                >
                  <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  {error}
                </p>
              )}
            </div>

            {/* Boutons d'action */}
            <div className="flex items-center gap-3">
              <Button type="submit" variant="primary">
                Analyser
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleClear}
                disabled={!url && !error}
              >
                <X className="h-4 w-4" />
                Effacer
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* ── Historique des imports ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">
          Historique des imports
        </h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-fg-muted">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-fg-muted">
                    URL
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-fg-muted">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-fg-muted">
                    Utilisateur
                  </th>
                </tr>
              </thead>
              <tbody>
                {MOCK_HISTORY.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors"
                  >
                    {/* Date */}
                    <td className="whitespace-nowrap px-4 py-3 text-fg-muted">
                      {entry.date}
                    </td>
                    {/* URL tronquée avec tooltip */}
                    <td className="max-w-xs px-4 py-3">
                      <span className="block truncate text-fg" title={entry.url}>
                        {entry.url}
                      </span>
                    </td>
                    {/* Badge de statut coloré */}
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(entry.status)}>
                        <span className="flex items-center gap-1">
                          <StatusIcon status={entry.status} />
                          {statusLabel(entry.status)}
                        </span>
                      </Badge>
                    </td>
                    {/* Utilisateur */}
                    <td className="whitespace-nowrap px-4 py-3 text-fg-muted">
                      {entry.user}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
