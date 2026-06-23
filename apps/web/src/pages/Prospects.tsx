import { useQuery } from '@tanstack/react-query';
import { Card, CardBody, Badge } from '@ebh/ui';
import type { Prospect, ProspectStatus } from '@ebh/shared';
import { api } from '../lib/api';

const demo: Prospect[] = [
  { id: '1', name: 'Acme SAS', company: 'Acme', email: 'contact@acme.fr', value: 24000, status: 'QUALIFIED', createdAt: '' },
  { id: '2', name: 'Globex', company: 'Globex', email: 'hi@globex.com', value: 12500, status: 'CONTACTED', createdAt: '' },
  { id: '3', name: 'Initech', company: 'Initech', email: 'sales@initech.io', value: 38000, status: 'WON', createdAt: '' },
  { id: '4', name: 'Umbrella', company: 'Umbrella', email: 'lead@umbrella.co', value: 5400, status: 'NEW', createdAt: '' },
];

const tone: Record<ProspectStatus, 'neutral' | 'brand' | 'warning' | 'success' | 'danger'> = {
  NEW: 'neutral',
  CONTACTED: 'warning',
  QUALIFIED: 'brand',
  WON: 'success',
  LOST: 'danger',
};

const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

export function Prospects() {
  const { data = demo } = useQuery({
    queryKey: ['prospects'],
    queryFn: api.prospects,
    placeholderData: demo,
    select: (d) => (d.length ? d : demo),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Prospects</h1>
      <Card>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-fg-muted">
                <th className="px-5 py-3 font-medium">Nom</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Valeur</th>
                <th className="px-5 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface-3/50">
                  <td className="px-5 py-3 font-medium">{p.name}</td>
                  <td className="px-5 py-3 text-fg-muted">{p.email}</td>
                  <td className="px-5 py-3">{eur.format(p.value)}</td>
                  <td className="px-5 py-3">
                    <Badge tone={tone[p.status]}>{p.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
