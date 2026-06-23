import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button, Card, CardBody, Badge } from '@ebh/ui';
import type { Product, CreateProduct } from '@ebh/shared';
import { api } from '../lib/api';
import { ProductForm } from '../components/ProductForm';

const demo: Product[] = [
  {
    id: '1', name: 'Vélo électrique City', brand: 'Velar', supplier: 'BikeDist',
    supplierReference: 'VLR-CITY-01', purchasePrice: 780, transportCost: 45,
    preparationCost: 30, accessoriesCost: 25, otherCosts: 10, costPrice: 890,
    sellingPrice: 1490, marginAmount: 600, marginPercent: 40.27, createdAt: '',
  },
  {
    id: '2', name: 'Trottinette Pro', brand: 'Scootio', supplier: 'UrbanMove',
    supplierReference: 'SCT-PRO-22', purchasePrice: 240, transportCost: 18,
    preparationCost: 12, accessoriesCost: 8, otherCosts: 4, costPrice: 282,
    sellingPrice: 449, marginAmount: 167, marginPercent: 37.19, createdAt: '',
  },
  {
    id: '3', name: 'Casque connecté', brand: 'SafeRide', supplier: 'GearCo',
    supplierReference: 'SR-HLM-09', purchasePrice: 58, transportCost: 6,
    preparationCost: 3, accessoriesCost: 0, otherCosts: 2, costPrice: 69,
    sellingPrice: 99, marginAmount: 30, marginPercent: 30.3, createdAt: '',
  },
];

const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

type SortKey =
  | 'name'
  | 'purchasePrice'
  | 'costPrice'
  | 'sellingPrice'
  | 'marginAmount'
  | 'marginPercent';
type SortDir = 'asc' | 'desc';

export function Products() {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | undefined>(undefined);
  const [sortKey, setSortKey] = useState<SortKey>('marginAmount');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const { data = demo } = useQuery({
    queryKey: ['products'],
    queryFn: api.products,
    placeholderData: demo,
    select: (d) => (d.length ? d : demo),
  });

  const createMut = useMutation({
    mutationFn: (input: CreateProduct) => api.createProduct(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['profitability'] });
      closeForm();
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, input }: { id: string; input: CreateProduct }) =>
      api.updateProduct(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['profitability'] });
      closeForm();
    },
  });

  const saving = createMut.isPending || updateMut.isPending;

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }
  function openEdit(p: Product) {
    setEditing(p);
    setFormOpen(true);
  }
  function closeForm() {
    setFormOpen(false);
    setEditing(undefined);
  }
  function handleSubmit(values: CreateProduct) {
    if (editing) updateMut.mutate({ id: editing.id, input: values });
    else createMut.mutate(values);
  }

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  }

  const sorted = useMemo(() => {
    const rows = [...data];
    rows.sort((a, b) => {
      let cmp: number;
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
      else cmp = (a[sortKey] as number) - (b[sortKey] as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [data, sortKey, sortDir]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Produits</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nouveau produit
        </Button>
      </div>

      <Card>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-fg-muted">
                  <Th label="Produit" k="name" {...{ sortKey, sortDir, toggleSort }} />
                  <Th label="Prix achat" k="purchasePrice" align="right" {...{ sortKey, sortDir, toggleSort }} />
                  <Th label="Prix revient" k="costPrice" align="right" {...{ sortKey, sortDir, toggleSort }} />
                  <Th label="Prix vente" k="sellingPrice" align="right" {...{ sortKey, sortDir, toggleSort }} />
                  <Th label="Marge €" k="marginAmount" align="right" {...{ sortKey, sortDir, toggleSort }} />
                  <Th label="Marge %" k="marginPercent" align="right" {...{ sortKey, sortDir, toggleSort }} />
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-border last:border-0 hover:bg-surface-3/50"
                  >
                    <td className="px-5 py-3">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-fg-muted">
                        {p.brand ?? '—'}
                        {p.supplierReference ? ` · ${p.supplierReference}` : ''}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">{eur.format(p.purchasePrice)}</td>
                    <td className="px-5 py-3 text-right">{eur.format(p.costPrice)}</td>
                    <td className="px-5 py-3 text-right">{eur.format(p.sellingPrice)}</td>
                    <td className="px-5 py-3 text-right font-medium">
                      {eur.format(p.marginAmount)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Badge tone={p.marginPercent >= 25 ? 'success' : 'warning'}>
                        {p.marginPercent.toFixed(1)} %
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => openEdit(p)}
                        className="rounded-md p-1.5 text-fg-muted hover:bg-surface-3 hover:text-fg"
                        aria-label="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {formOpen && (
        <ProductForm
          initial={editing}
          saving={saving}
          onCancel={closeForm}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

function Th({
  label,
  k,
  align,
  sortKey,
  sortDir,
  toggleSort,
}: {
  label: string;
  k: SortKey;
  align?: 'right';
  sortKey: SortKey;
  sortDir: SortDir;
  toggleSort: (k: SortKey) => void;
}) {
  const active = sortKey === k;
  const Icon = !active ? ArrowUpDown : sortDir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th className={align === 'right' ? 'px-5 py-3 text-right font-medium' : 'px-5 py-3 font-medium'}>
      <button
        onClick={() => toggleSort(k)}
        className={
          'inline-flex items-center gap-1.5 hover:text-fg ' +
          (align === 'right' ? 'flex-row-reverse' : '') +
          (active ? ' text-fg' : '')
        }
      >
        {label}
        <Icon className="h-3.5 w-3.5" />
      </button>
    </th>
  );
}
