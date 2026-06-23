import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, ArrowUp, ArrowDown } from 'lucide-react';
import { Button, Card, CardBody, Badge } from '@ebh/ui';
import type { Client, ClientStatus, CreateClient } from '@ebh/shared';
import { api } from '../lib/api';
import { ClientForm } from '../components/ClientForm';
import { ClientDetail } from '../components/ClientDetail';

const demo: Client[] = [
  {
    id: '11111111-1111-1111-1111-111111111111', company: 'Acme SAS', contactName: 'Marie Dupont',
    email: 'contact@acme.fr', phone: '01 23 45 67 89', mobile: null, website: 'acme.fr',
    address: '12 rue des Lilas', postalCode: '59000', city: 'Lille', country: 'France',
    vatNumber: 'FR12345678901', status: 'ACTIVE', notes: null, createdAt: '',
  },
  {
    id: '22222222-2222-2222-2222-222222222222', company: 'Globex', contactName: 'Jean Martin',
    email: 'hi@globex.com', phone: '04 56 78 90 12', mobile: null, website: null,
    address: null, postalCode: '69002', city: 'Lyon', country: 'France',
    vatNumber: null, status: 'PROSPECT', notes: null, createdAt: '',
  },
  {
    id: '33333333-3333-3333-3333-333333333333', company: 'Initech', contactName: 'Sophie Bernard',
    email: 'sales@initech.io', phone: null, mobile: '06 11 22 33 44', website: 'initech.io',
    address: null, postalCode: '75008', city: 'Paris', country: 'France',
    vatNumber: null, status: 'INACTIVE', notes: null, createdAt: '',
  },
];

const statusLabel: Record<ClientStatus, string> = {
  PROSPECT: 'Prospect', ACTIVE: 'Actif', INACTIVE: 'Inactif',
};
const statusTone: Record<ClientStatus, 'neutral' | 'success' | 'warning'> = {
  PROSPECT: 'neutral', ACTIVE: 'success', INACTIVE: 'warning',
};
const STATUS_FILTERS: ('ALL' | ClientStatus)[] = ['ALL', 'PROSPECT', 'ACTIVE', 'INACTIVE'];

export function Clients() {
  const qc = useQueryClient();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ClientStatus>('ALL');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | undefined>(undefined);
  const [selected, setSelected] = useState<Client | undefined>(undefined);

  const { data = demo } = useQuery({
    queryKey: ['clients'],
    queryFn: api.clients,
    placeholderData: demo,
    select: (d) => (d.length ? d : demo),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['clients'] });

  const createMut = useMutation({
    mutationFn: (input: CreateClient) => api.createClient(input),
    onSuccess: () => { invalidate(); closeForm(); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, input }: { id: string; input: CreateClient }) =>
      api.updateClient(id, input),
    onSuccess: () => { invalidate(); closeForm(); setSelected(undefined); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => api.deleteClient(id),
    onSuccess: () => { invalidate(); setSelected(undefined); },
  });

  const saving = createMut.isPending || updateMut.isPending;

  function openCreate() { setEditing(undefined); setFormOpen(true); }
  function openEdit(c: Client) { setEditing(c); setFormOpen(true); }
  function closeForm() { setFormOpen(false); setEditing(undefined); }
  function handleSubmit(values: CreateClient) {
    if (editing) updateMut.mutate({ id: editing.id, input: values });
    else createMut.mutate(values);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = data;
    if (q) {
      rows = rows.filter((c) =>
        [c.company, c.contactName, c.email, c.city, c.phone, c.mobile]
          .filter(Boolean)
          .some((v) => (v as string).toLowerCase().includes(q)),
      );
    }
    if (statusFilter !== 'ALL') rows = rows.filter((c) => c.status === statusFilter);
    return [...rows].sort((a, b) => {
      const cmp = a.company.localeCompare(b.company);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, query, statusFilter, sortDir]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nouveau client
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher (société, contact, email, ville…)"
            className="h-9 w-full rounded-lg border border-border bg-surface-2 pl-9 pr-3 text-sm outline-none placeholder:text-fg-muted focus:border-brand-500"
          />
        </div>
        <div className="flex gap-1.5">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={
                'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ' +
                (statusFilter === s
                  ? 'border-brand-500 bg-brand-600/10 text-fg'
                  : 'border-border text-fg-muted hover:bg-surface-3')
              }
            >
              {s === 'ALL' ? 'Tous' : statusLabel[s]}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-fg-muted">
                  <th className="px-5 py-3 font-medium">
                    <button
                      onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                      className="inline-flex items-center gap-1.5 hover:text-fg"
                    >
                      Nom société
                      {sortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                    </button>
                  </th>
                  <th className="px-5 py-3 font-medium">Contact</th>
                  <th className="px-5 py-3 font-medium">Téléphone</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Ville</th>
                  <th className="px-5 py-3 font-medium">Statut</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-fg-muted">
                      Aucun client ne correspond.
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setSelected(c)}
                      className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-3/50"
                    >
                      <td className="px-5 py-3 font-medium">{c.company}</td>
                      <td className="px-5 py-3 text-fg-muted">{c.contactName ?? '—'}</td>
                      <td className="px-5 py-3 text-fg-muted">{c.phone ?? c.mobile ?? '—'}</td>
                      <td className="px-5 py-3 text-fg-muted">{c.email ?? '—'}</td>
                      <td className="px-5 py-3 text-fg-muted">{c.city ?? '—'}</td>
                      <td className="px-5 py-3">
                        <Badge tone={statusTone[c.status]}>{statusLabel[c.status]}</Badge>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                          className="text-sm font-medium text-brand-500 hover:underline"
                        >
                          Modifier
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {formOpen && (
        <ClientForm
          initial={editing}
          saving={saving}
          onCancel={closeForm}
          onSubmit={handleSubmit}
        />
      )}

      {selected && !formOpen && (
        <ClientDetail
          client={selected}
          deleting={deleteMut.isPending}
          onClose={() => setSelected(undefined)}
          onEdit={() => openEdit(selected)}
          onDelete={() => deleteMut.mutate(selected.id)}
        />
      )}
    </div>
  );
}
