import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Wallet, Percent, Package } from 'lucide-react';
import { Card, CardBody, Badge } from '@ebh/ui';
import type { Product, ProfitabilityKpis } from '@ebh/shared';
import { api, type ProfitabilityResponse } from '../lib/api';

const demoProducts: Product[] = [
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

function buildDemoKpis(products: Product[]): ProfitabilityKpis {
  const totalCost = products.reduce((s, p) => s + p.costPrice, 0);
  const totalRevenue = products.reduce((s, p) => s + p.sellingPrice, 0);
  const totalMargin = products.reduce((s, p) => s + p.marginAmount, 0);
  return {
    productsCount: products.length,
    totalCost: r2(totalCost),
    totalRevenue: r2(totalRevenue),
    totalMargin: r2(totalMargin),
    averageMarginPercent: totalRevenue > 0 ? r2((totalMargin / totalRevenue) * 100) : 0,
  };
}
function r2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

const demo: ProfitabilityResponse = {
  products: demoProducts,
  kpis: buildDemoKpis(demoProducts),
};

const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const eur0 = new Intl.NumberFormat('fr-FR', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
});

export function Profitability() {
  const { data = demo } = useQuery({
    queryKey: ['profitability'],
    queryFn: api.profitability,
    placeholderData: demo,
    select: (d) => (d.products.length ? d : demo),
  });

  const { products, kpis } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Rentabilité</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Coût de revient, marges et performance globale du catalogue
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Marge totale" value={eur0.format(kpis.totalMargin)} icon={TrendingUp} accent />
        <Kpi label="Chiffre d’affaires" value={eur0.format(kpis.totalRevenue)} icon={Wallet} />
        <Kpi label="Marge moyenne" value={`${kpis.averageMarginPercent.toFixed(1)} %`} icon={Percent} />
        <Kpi label="Produits" value={String(kpis.productsCount)} icon={Package} />
      </div>

      <Card>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-fg-muted">
                  <th className="px-5 py-3 font-medium">Produit</th>
                  <th className="px-5 py-3 font-medium">Marque</th>
                  <th className="px-5 py-3 font-medium text-right">Coût de revient</th>
                  <th className="px-5 py-3 font-medium text-right">Prix de vente</th>
                  <th className="px-5 py-3 font-medium text-right">Marge €</th>
                  <th className="px-5 py-3 font-medium text-right">Marge %</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-border last:border-0 hover:bg-surface-3/50"
                  >
                    <td className="px-5 py-3 font-medium">{p.name}</td>
                    <td className="px-5 py-3 text-fg-muted">{p.brand ?? '—'}</td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
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
  icon: typeof TrendingUp;
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
