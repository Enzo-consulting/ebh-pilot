import { Router } from 'express';
import type { ProfitabilityKpis } from '@ebh/shared';
import { prisma } from '../prisma';
import type { AuthedRequest } from '../auth';

export const profitabilityRouter = Router();

// Returns the user's products plus aggregated profitability KPIs.
profitabilityRouter.get('/', async (req: AuthedRequest, res) => {
  const products = await prisma.product.findMany({
    where: { userId: req.userId },
    orderBy: { marginAmount: 'desc' },
  });

  const totals = products.reduce(
    (acc, p) => {
      acc.totalCost += Number(p.costPrice);
      acc.totalRevenue += Number(p.sellingPrice);
      acc.totalMargin += Number(p.marginAmount);
      return acc;
    },
    { totalCost: 0, totalRevenue: 0, totalMargin: 0 },
  );

  const kpis: ProfitabilityKpis = {
    productsCount: products.length,
    totalCost: round2(totals.totalCost),
    totalRevenue: round2(totals.totalRevenue),
    totalMargin: round2(totals.totalMargin),
    averageMarginPercent:
      totals.totalRevenue > 0
        ? round2((totals.totalMargin / totals.totalRevenue) * 100)
        : 0,
  };

  res.json({ products, kpis });
});

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
