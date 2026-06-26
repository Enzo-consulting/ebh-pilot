/**
 * products.ts
 * Ticket 015 — Integration complete de l architecture multi-tenant
 *
 * Routes CRUD pour les produits.
 * - GET  / : filtre par buildOwnerFilter() selon le role
 * - POST / : associe ownerId = req.authUser.id
 * - PUT  /:id : verifie assertCanMutate() avant modification
 * - DELETE /:id : verifie assertCanMutate() avant suppression
 */

import { Router } from 'express';
import {
      createProductSchema,
      updateProductSchema,
      computeProductFinancials,
} from '@ebh/shared';
import { prisma } from '../prisma.js';
import type { AuthedRequest } from '../auth.js';
import {
      buildOwnerFilter,
      assertCanMutate,
      type AuthedRequestWithUser,
} from '../middleware/dataIsolation.js';

export const productsRouter = Router();

productsRouter.get('/', async (req: AuthedRequestWithUser, res) => {
      try {
              const authUser = req.authUser;
              const where = authUser
                ? buildOwnerFilter(authUser)
                        : { ownerId: (req as AuthedRequest).userId };

        const products = await prisma.product.findMany({
                  where,
                  orderBy: { createdAt: 'desc' },
        });
              res.json(products);
      } catch {
              res.status(500).json({ error: 'Impossible de recuperer les produits.' });
      }
});

productsRouter.post('/', async (req: AuthedRequestWithUser, res) => {
      const parsed = createProductSchema.safeParse(req.body);
      if (!parsed.success) {
              return res.status(400).json({ error: parsed.error.flatten() });
      }
      const ownerId = req.authUser?.id ?? (req as AuthedRequest).userId;
      if (!ownerId) {
              return res.status(401).json({ error: 'Non authentifie.' });
      }
      try {
              const financials = computeProductFinancials(parsed.data);
              const created = await prisma.product.create({
                        data: { ...parsed.data, ...financials, ownerId },
              });
              return res.status(201).json(created);
      } catch {
              return res.status(500).json({ error: 'Impossible de creer le produit.' });
      }
});

productsRouter.put('/:id', async (req: AuthedRequestWithUser, res) => {
      const parsed = updateProductSchema.safeParse(req.body);
      if (!parsed.success) {
              return res.status(400).json({ error: parsed.error.flatten() });
      }
      try {
              const existing = await prisma.product.findUnique({
                        where: { id: req.params.id },
                        select: {
                                    id: true, ownerId: true,
                                    purchasePrice: true, transportCost: true,
                                    preparationCost: true, accessoriesCost: true,
                                    otherCosts: true, sellingPrice: true,
                        },
              });
              if (!existing) return res.status(404).json({ error: 'Produit introuvable.' });

        if (req.authUser) {
                  try { assertCanMutate(req.authUser, existing.ownerId); }
                  catch { return res.status(403).json({ error: 'Forbidden: acces refuse.' }); }
        } else {
                  if (existing.ownerId !== (req as AuthedRequest).userId) {
                              return res.status(404).json({ error: 'Produit introuvable.' });
                  }
        }

        const merged = {
                  purchasePrice: parsed.data.purchasePrice ?? Number(existing.purchasePrice),
                  transportCost: parsed.data.transportCost ?? Number(existing.transportCost),
                  preparationCost: parsed.data.preparationCost ?? Number(existing.preparationCost),
                  accessoriesCost: parsed.data.accessoriesCost ?? Number(existing.accessoriesCost),
                  otherCosts: parsed.data.otherCosts ?? Number(existing.otherCosts),
                  sellingPrice: parsed.data.sellingPrice ?? Number(existing.sellingPrice),
        };
              const financials = computeProductFinancials(merged);

        const updated = await prisma.product.update({
                  where: { id: req.params.id },
                  data: { ...parsed.data, ...financials },
        });
              return res.json(updated);
      } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === '403') {
              return res.status(403).json({ error: 'Forbidden: acces refuse.' });
    }
              return res.status(500).json({ error: 'Impossible de mettre a jour le produit.' });
      }
});

productsRouter.delete('/:id', async (req: AuthedRequestWithUser, res) => {
      try {
              const existing = await prisma.product.findUnique({
                        where: { id: req.params.id },
                        select: { id: true, ownerId: true },
              });
              if (!existing) return res.status(404).json({ error: 'Produit introuvable.' });

        if (req.authUser) {
                  try { assertCanMutate(req.authUser, existing.ownerId); }
                  catch { return res.status(403).json({ error: 'Forbidden: acces refuse.' }); }
        } else {
                  if (existing.ownerId !== (req as AuthedRequest).userId) {
                              return res.status(404).json({ error: 'Produit introuvable.' });
                  }
        }

        await prisma.product.delete({ where: { id: req.params.id } });
              return res.status(204).send();
      } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === '403') {
              return res.status(403).json({ error: 'Forbidden: acces refuse.' });
    }
              return res.status(500).json({ error: 'Impossible de supprimer le produit.' });
      }
});
