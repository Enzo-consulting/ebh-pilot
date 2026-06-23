import { Router } from 'express';
import {
  createProductSchema,
  updateProductSchema,
  computeProductFinancials,
} from '@ebh/shared';
import { prisma } from '../prisma';
import type { AuthedRequest } from '../auth';

export const productsRouter = Router();

productsRouter.get('/', async (req: AuthedRequest, res) => {
  const products = await prisma.product.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' },
  });
  res.json(products);
});

productsRouter.post('/', async (req: AuthedRequest, res) => {
  const parsed = createProductSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  // Derived fields are computed server-side for consistency.
  const financials = computeProductFinancials(parsed.data);
  const created = await prisma.product.create({
    data: { ...parsed.data, ...financials, userId: req.userId! },
  });
  return res.status(201).json(created);
});

productsRouter.put('/:id', async (req: AuthedRequest, res) => {
  const parsed = updateProductSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  // Fetch the owned row so partial updates can recompute derived fields.
  const existing = await prisma.product.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) {
    return res.status(404).json({ error: 'Produit introuvable.' });
  }

  // Merge incoming changes over current cost inputs, then recompute.
  const merged = {
    purchasePrice: parsed.data.purchasePrice ?? Number(existing.purchasePrice),
    transportCost: parsed.data.transportCost ?? Number(existing.transportCost),
    preparationCost:
      parsed.data.preparationCost ?? Number(existing.preparationCost),
    accessoriesCost:
      parsed.data.accessoriesCost ?? Number(existing.accessoriesCost),
    otherCosts: parsed.data.otherCosts ?? Number(existing.otherCosts),
    sellingPrice: parsed.data.sellingPrice ?? Number(existing.sellingPrice),
  };
  const financials = computeProductFinancials(merged);

  const updated = await prisma.product.update({
    where: { id: req.params.id },
    data: { ...parsed.data, ...financials },
  });
  return res.json(updated);
});

productsRouter.delete('/:id', async (req: AuthedRequest, res) => {
  const result = await prisma.product.deleteMany({
    where: { id: req.params.id, userId: req.userId },
  });
  if (result.count === 0) {
    return res.status(404).json({ error: 'Produit introuvable.' });
  }
  return res.status(204).send();
});
