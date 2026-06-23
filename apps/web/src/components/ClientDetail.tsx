import { X, Pencil, Trash2 } from 'lucide-react';
import { Button, Badge } from '@ebh/ui';
import type { Client, ClientStatus } from '@ebh/shared';

const statusLabel: Record<ClientStatus, string> = {
  PROSPECT: 'Prospect',
  ACTIVE: 'Actif',
  INACTIVE: 'Inactif',
};
const statusTone: Record<ClientStatus, 'neutral' | 'success' | 'warning'> = {
  PROSPECT: 'neutral',
  ACTIVE: 'success',
  INACTIVE: 'warning',
};

export function ClientDetail({
  client,
  onClose,
  onEdit,
  onDelete,
  deleting,
}: {
  client: Client;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  deleting?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-border bg-surface-2 shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">{client.company}</h2>
            <p className="text-sm text-fg-muted">{client.contactName ?? '—'}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-fg-muted hover:bg-surface-3"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <Badge tone={statusTone[client.status]}>{statusLabel[client.status]}</Badge>
          <dl className="space-y-3">
            <Row label="Email" value={client.email} />
            <Row label="Téléphone" value={client.phone} />
            <Row label="Mobile" value={client.mobile} />
            <Row label="Site web" value={client.website} />
            <Row label="Adresse" value={client.address} />
            <Row label="Code postal" value={client.postalCode} />
            <Row label="Ville" value={client.city} />
            <Row label="Pays" value={client.country} />
            <Row label="N° TVA" value={client.vatNumber} />
            <Row label="Notes" value={client.notes} />
          </dl>
        </div>

        <div className="flex justify-between gap-2 border-t border-border px-5 py-4">
          <Button variant="danger" onClick={onDelete} disabled={deleting}>
            <Trash2 className="h-4 w-4" />
            Supprimer
          </Button>
          <Button onClick={onEdit}>
            <Pencil className="h-4 w-4" />
            Modifier
          </Button>
        </div>
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs text-fg-muted">{label}</dt>
      <dd className="mt-0.5 text-sm">{value || '—'}</dd>
    </div>
  );
}
