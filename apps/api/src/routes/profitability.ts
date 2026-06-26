/**
 * profitability.ts
 * Ticket 015 — Integration complete de l architecture multi-tenant
 *
 * Route de rentabilite : calcule les KPIs sur les produits du perimetre
 * de l utilisateur, en appliquant buildOwnerFilter() pour respecter
 * la hierarchie multi-tenant.
 */

import { Router } from 'express';
import type { ProfitabilityKpis } from '@ebh/shared';
import { prisma } from '../prisma.js';
import type { AuthedRequest } from '../auth.js';
import {
      buildOwnerFilter,
      type AuthedRequestWithUser,
} from '../middleware/dataIsolation.js';

export const profitabilityRouter = Router();

profitabilityRouter.get('/', async (req: AuthedRequestWithUser, res) => {
      try {
              const authUser = req.authUser;
              const where = authUser
                ? buildOwnerFilter(authUser)
                        : { ownerId: (req as AuthedRequest).userId };

        const products = await prisma.product.findMany({
                  where,
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
      } catch {
              res.status(500).json({ error: 'Impossible de calculer la rentabilite.' });
      }
});

function round2(n: number): number {
      return Math.round((n + Number.EPSILON) * 100) / 100;
}
