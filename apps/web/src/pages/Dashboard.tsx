import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Wallet,
  TrendingUp,
  Percent,
  Plus,
  UserPlus,
  BarChart3,
  Boxes,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardBody, Badge } from '@ebh/ui';
import type { Product } from '@ebh/shared';
import { api } from '../lib/api';

// Demo products keep the page populated when the API/DB is empty,
// consistent with the rest of the app's demo-fallback pattern.
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
  {
    id: '4', name: 'Antivol U éco', brand: 'LockIt', supplier: 'GearCo',
    supplierReference: 'LK-U-02', purchasePrice: 22, transportCost: 3,
    preparationCost: 1, accessoriesCost: 0, otherCosts: 1, costPrice: 27,
    sellingPrice: 29, marginAmount: 2, marginPercent: 6.9, createdAt: '',
  },
  {
    id: '5', name: 'Sacoche standard', brand: 'CarryOn', supplier: 'BikeDist',
    supplierReference: 'CO-BAG-11', purchasePrice: 19, transportCost: 2,
    preparationCost: 1, accessoriesCost: 0, otherCosts: 1, costPrice: 23,
    sellingPrice: 25, marginAmount: 2, marginPercent: 8.0, createdAt: '',
  },
];

const eur = new Intl.NumberFormat('fr-FR', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
});
const eur2 = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

const WATCH_THRESHOLD = 15; // marge % en dessous de laquelle un produit est "à surveiller"

export function Dashboard() {
  const navigate = useNavigate();

  const { data: products = demo } = useQuery({
    queryKey: ['products'],
    queryFn: api.products,
    placeholderData: demo,
    select: (d) => (d.length ? d : demo),
  });

  // KPIs computed automatically from the products.
  const kpis = useMemo(() => {
    const productsCount = products.length;
    const stockValue = products.reduce((s, p) => s + p.costPrice, 0);
    const potentialMargin = products.reduce((s, p) => s + p.marginAmount, 0);
    const totalRevenue = products.reduce((s, p) => s + p.sellingPrice, 0);
    const averageMarginPercent =
      totalRevenue > 0 ? (potentialMargin / totalRevenue) * 100 : 0;
    return { productsCount, stockValue, potentialMargin, averageMarginPercent };
  }, [products]);

  const toWatch = useMemo(
    () =>
      products
        .filter((p) => p.marginPercent < WATCH_THRESHOLD)
        .sort((a, b) => a.marginPercent - b.marginPercent),
    [products],
  );

  const topMargin = useMemo(
    () => [...products].sort((a, b) => b.marginAmount - a.marginAmount).slice(0, 5),
    [products],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Centre de pilotage — vue d’ensemble du catalogue
        </p>
      </div>

      {/* 1. KPI principaux */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Produits" value={String(kpis.productsCount)} icon={Package} />
        <Kpi label="Valeur du stock" value={eur.format(kpis.stockValue)} icon={Wallet} />
        <Kpi
          label="Marge potentielle"
          value={eur.format(kpis.potentialMargin)}
          icon={TrendingUp}
          accent
        />
        <Kpi
          label="Marge moyenne"
          value={`${kpis.averageMarginPercent.toFixed(1)} %`}
          icon={Percent}
        />
      </div>

      {/* 4. Actions rapides */}
      <Card>
        <CardBody>
          <h2 className="mb-3 text-sm font-semibold">Actions rapides</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction
              label="Nouveau produit"
              icon={Plus}
              onClick={() => navigate('/products')}
            />
            <QuickAction
              label="Nouveau client"
              icon={UserPlus}
              onClick={() => navigate('/prospects')}
            />
            <QuickAction
              label="Voir rentabilité"
              icon={BarChart3}
              onClick={() => navigate('/profitability')}
            />
            <QuickAction
              label="Voir catalogue"
              icon={Boxes}
              onClick={() => navigate('/products')}
            />
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 2. Produits à surveiller */}
        <Card>
          <CardBody className="p-0">
            <div className="flex items-center justify-between px-5 py-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Produits à surveiller
              </h2>
              <Badge tone="warning">Marge &lt; {WATCH_THRESHOLD} %</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-border text-left text-fg-muted">
                    <th className="px-5 py-2.5 font-medium">Nom</th>
                    <th className="px-5 py-2.5 font-medium">Fournisseur</th>
                    <th className="px-5 py-2.5 text-right font-medium">Revient</th>
                    <th className="px-5 py-2.5 text-right font-medium">Vente</th>
                    <th className="px-5 py-2.5 text-right font-medium">Marge %</th>
                  </tr>
                </thead>
                <tbody>
                  {toWatch.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-6 text-center text-fg-muted">
                        Aucun produit sous le seuil. 👍
                      </td>
                    </tr>
                  ) : (
                    toWatch.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-border last:border-0 hover:bg-surface-3/50"
                      >
                        <td className="px-5 py-2.5 font-medium">{p.name}</td>
                        <td className="px-5 py-2.5 text-fg-muted">{p.supplier ?? '—'}</td>
                        <td className="px-5 py-2.5 text-right">{eur2.format(p.costPrice)}</td>
                        <td className="px-5 py-2.5 text-right">{eur2.format(p.sellingPrice)}</td>
                        <td className="px-5 py-2.5 text-right">
                          <Badge tone="danger">{p.marginPercent.toFixed(1)} %</Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        {/* 3. Top rentabilité */}
        <Card>
          <CardBody className="p-0">
            <div className="flex items-center justify-between px-5 py-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                Top rentabilité
              </h2>
              <Badge tone="success">Top 5</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-border text-left text-fg-muted">
                    <th className="px-5 py-2.5 font-medium">Nom</th>
                    <th className="px-5 py-2.5 text-right font-medium">Marge €</th>
                    <th className="px-5 py-2.5 text-right font-medium">Marge %</th>
                    <th className="px-5 py-2.5 text-right font-medium">Vente</th>
                  </tr>
                </thead>
                <tbody>
                  {topMargin.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-border last:border-0 hover:bg-surface-3/50"
                    >
                      <td className="px-5 py-2.5 font-medium">{p.name}</td>
                      <td className="px-5 py-2.5 text-right font-medium">
                        {eur2.format(p.marginAmount)}
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <Badge tone={p.marginPercent >= 25 ? 'success' : 'warning'}>
                          {p.marginPercent.toFixed(1)} %
                        </Badge>
                      </td>
                      <td className="px-5 py-2.5 text-right">{eur2.format(p.sellingPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: typeof Package;
  accent?: boolean;
}) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between">
          <span className="text-sm text-fg-muted">{label}</span>
          <Icon className={accent ? 'h-4 w-4 text-brand-500' : 'h-4 w-4 text-fg-muted'} />
        </div>
        <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      </CardBody>
    </Card>
  );
}

function QuickAction({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: typeof Plus;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-left text-sm font-medium transition-colors hover:border-brand-500/50 hover:bg-surface-3"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600/15">
        <Icon className="h-4 w-4 text-brand-500" />
      </span>
      {label}
    </button>
  );
}
