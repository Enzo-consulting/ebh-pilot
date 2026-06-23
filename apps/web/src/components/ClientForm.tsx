import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@ebh/ui';
import {
  createClientSchema,
  type Client,
  type ClientStatus,
  type CreateClient,
} from '@ebh/shared';

interface ClientFormProps {
  initial?: Client;
  saving?: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateClient) => void;
}

const STATUSES: { value: ClientStatus; label: string }[] = [
  { value: 'PROSPECT', label: 'Prospect' },
  { value: 'ACTIVE', label: 'Actif' },
  { value: 'INACTIVE', label: 'Inactif' },
];

type FormState = Record<string, string>;

function toState(c?: Client): FormState {
  return {
    company: c?.company ?? '',
    contactName: c?.contactName ?? '',
    email: c?.email ?? '',
    phone: c?.phone ?? '',
    mobile: c?.mobile ?? '',
    website: c?.website ?? '',
    address: c?.address ?? '',
    postalCode: c?.postalCode ?? '',
    city: c?.city ?? '',
    country: c?.country ?? '',
    vatNumber: c?.vatNumber ?? '',
    status: c?.status ?? 'PROSPECT',
    notes: c?.notes ?? '',
  };
}

export function ClientForm({ initial, saving, onCancel, onSubmit }: ClientFormProps) {
  const [form, setForm] = useState<FormState>(() => toState(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  function submit() {
    const payload = {
      company: form.company.trim(),
      contactName: form.contactName.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      mobile: form.mobile.trim() || null,
      website: form.website.trim() || null,
      address: form.address.trim() || null,
      postalCode: form.postalCode.trim() || null,
      city: form.city.trim() || null,
      country: form.country.trim() || null,
      vatNumber: form.vatNumber.trim() || null,
      status: form.status as ClientStatus,
      notes: form.notes.trim() || null,
    };
    const parsed = createClientSchema.safeParse(payload);
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(flat)) if (v && v[0]) next[k] = v[0];
      setErrors(next);
      return;
    }
    setErrors({});
    onSubmit(parsed.data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onCancel} aria-hidden />
      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-surface-2 shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">
            {initial ? 'Modifier le client' : 'Nouveau client'}
          </h2>
          <button
            onClick={onCancel}
            className="rounded-md p-1.5 text-fg-muted hover:bg-surface-3"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Société *" value={form.company} onChange={set('company')} error={errors.company} />
            <Field label="Contact *" value={form.contactName} onChange={set('contactName')} error={errors.contactName} />
            <Field label="Email" value={form.email} onChange={set('email')} error={errors.email} />
            <Field label="Téléphone" value={form.phone} onChange={set('phone')} />
            <Field label="Mobile" value={form.mobile} onChange={set('mobile')} />
            <Field label="Site web" value={form.website} onChange={set('website')} />
            <Field label="Adresse" value={form.address} onChange={set('address')} />
            <Field label="Code postal" value={form.postalCode} onChange={set('postalCode')} />
            <Field label="Ville" value={form.city} onChange={set('city')} />
            <Field label="Pays" value={form.country} onChange={set('country')} />
            <Field label="N° TVA" value={form.vatNumber} onChange={set('vatNumber')} />
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Statut</span>
              <select
                value={form.status}
                onChange={(e) => set('status')(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-brand-500"
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-medium">Notes</span>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes')(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <Button variant="secondary" onClick={onCancel} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? '…' : initial ? 'Enregistrer' : 'Créer'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={
          'h-9 w-full rounded-lg border bg-surface px-3 text-sm outline-none focus:border-brand-500 ' +
          (error ? 'border-red-500' : 'border-border')
        }
      />
      {error && <span className="mt-1 block text-xs text-red-500">{error}</span>}
    </label>
  );
}
