import { Router } from 'express';
import type { DashboardMetrics } from '@ebh/shared';

export const dashboardRouter = Router();

// In production these are computed from Prisma aggregates.
// Demo values keep the project runnable without a seeded DB.
dashboardRouter.get('/', (_req, res) => {
  const metrics: DashboardMetrics = {
    businessScore: 78,
    revenue: 184250,
    margin: 32.4,
    prospectsCount: 142,
    productsCount: 38,
    aiActions: [
      {
        id: '1',
        title: 'Relancer 12 prospects qualifiés',
        description: 'Inactifs depuis 14 jours, fort potentiel de conversion.',
        impact: 'high',
      },
      {
        id: '2',
        title: 'Ajuster la marge sur 3 produits',
        description: 'Marge sous le seuil cible de 25 %.',
        impact: 'medium',
      },
      {
        id: '3',
        title: 'Optimiser le tunnel de vente',
        description: 'Taux de chute élevé à l’étape "Qualifié".',
        impact: 'low',
      },
    ],
  };
  res.json(metrics);
});
