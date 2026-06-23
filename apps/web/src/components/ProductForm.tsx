import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Button, cn } from '@ebh/ui';
import {
  computeProductFinancials,
  createProductSchema,
  type CreateProduct,
  type Product,
} from '@ebh/shared';

interface ProductFormProps {
  initial?: Product;
  saving?: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateProduct) => void;
}

type FormState = {
  name: string;
  brand: string;
  supplier: string;
  supplierReference: string;
  purchasePrice: string;
  transportCost: string;
  preparationCost: string;
  accessoriesCost: string;
  otherCosts: string;
  sellingPrice: string;
};

function toState(p?: Product): FormState {
  return {
    name: p?.name ?? '',
    brand: p?.brand ?? '',
    supplier: p?.supplier ?? '',
    supplierReference: p?.supplierReference ?? '',
    purchasePrice: p ? String(p.purchasePrice) : '0',
    transportCost: p ? String(p.transportCost) : '0',
    preparationCost: p ? String(p.preparationCost) : '0',
    accessoriesCost: p ? String(p.accessoriesCost) : '0',
    otherCosts: p ? String(p.otherCosts) : '0',
    sellingPrice: p ? String(p.sellingPrice) : '0',
  };
}

const num = (v: string) => {
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

export function ProductForm({ initial, saving, onCancel, onSubmit }: ProductFormProps) {
  const [form, setForm] = useState<FormState>(() => toState(initial));
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof FormState) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Live derived values — same computation as the server (single source of truth).
  const financials = useMemo(
    () =>
      computeProductFinancials({
        purchasePrice: num(form.purchasePrice),
        transportCost: num(form.transportCost),
        preparationCost: num(form.preparationCost),
        accessoriesCost: num(form.accessoriesCost),
        otherCosts: num(form.otherCosts),
        sellingPrice: num(form.sellingPrice),
      }),
    [form],
  );

  function submit() {
    setError(null);
    const payload: CreateProduct = {
      name: form.name.trim(),
      brand: form.brand.trim() || null,
      supplier: form.supplier.trim() || null,
      supplierReference: form.supplierReference.trim() || null,
      purchasePrice: num(form.purchasePrice),
      transportCost: num(form.transportCost),
      preparationCost: num(form.preparationCost),
      accessoriesCost: num(form.accessoriesCost),
      otherCosts: num(form.otherCosts),
      sellingPrice: num(form.sellingPrice),
    };
    const parsed = createProductSchema.safeParse(payload);
    if (!parsed.success) {
      setError('Vérifiez les champs (le nom est requis, montants ≥ 0).');
      return;
    }
    onSubmit(parsed.data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onCancel} aria-hidden />
      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-surface-2 shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">
            {initial ? 'Modifier le produit' : 'Nouveau produit'}
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
            <Field label="Nom" value={form.name} onChange={set('name')} />
            <Field label="Marque" value={form.brand} onChange={set('brand')} />
            <Field label="Fournisseur" value={form.supplier} onChange={set('supplier')} />
            <Field
              label="Référence fournisseur"
              value={form.supplierReference}
              onChange={set('supplierReference')}
            />
          </div>

          <p className="mt-5 mb-2 text-xs font-medium uppercase tracking-wide text-fg-muted">
            Coûts
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Prix d'achat" value={form.purchasePrice} onChange={set('purchasePrice')} numeric />
            <Field label="Transport" value={form.transportCost} onChange={set('transportCost')} numeric />
            <Field label="Préparation" value={form.preparationCost} onChange={set('preparationCost')} numeric />
            <Field label="Accessoires" value={form.accessoriesCost} onChange={set('accessoriesCost')} numeric />
            <Field label="Autres coûts" value={form.otherCosts} onChange={set('otherCosts')} numeric />
            <Field label="Prix de vente" value={form.sellingPrice} onChange={set('sellingPrice')} numeric />
          </div>

          {/* Live computed summary — updates without page reload. */}
          <div className="mt-5 grid gap-3 rounded-lg border border-border bg-surface-3 p-4 sm:grid-cols-3">
            <Computed label="Prix de revient" value={eur.format(financials.costPrice)} />
            <Computed label="Marge €" value={eur.format(financials.marginAmount)} />
            <Computed
              label="Marge %"
              value={`${financials.marginPercent.toFixed(1)} %`}
              tone={financials.marginPercent >= 25 ? 'good' : 'warn'}
            />
          </div>

          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
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
  numeric,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  numeric?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input
        inputMode={numeric ? 'decimal' : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-brand-500"
      />
    </label>
  );
}

function Computed({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'good' | 'warn';
}) {
  return (
    <div>
      <p className="text-xs text-fg-muted">{label}</p>
      <p
        className={cn(
          'mt-0.5 text-lg font-semibold',
          tone === 'good' && 'text-emerald-500',
          tone === 'warn' && 'text-amber-500',
        )}
      >
        {value}
      </p>
    </div>
  );
}
