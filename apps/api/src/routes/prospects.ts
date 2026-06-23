import { Router } from 'express';
import { createProspectSchema, updateProspectSchema } from '@ebh/shared';
import { prisma } from '../prisma';
import type { AuthedRequest } from '../auth';

export const prospectsRouter = Router();

prospectsRouter.get('/', async (req: AuthedRequest, res) => {
  const prospects = await prisma.prospect.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' },
  });
  res.json(prospects);
});

prospectsRouter.post('/', async (req: AuthedRequest, res) => {
  const parsed = createProspectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const created = await prisma.prospect.create({
    data: { ...parsed.data, userId: req.userId! },
  });
  return res.status(201).json(created);
});

prospectsRouter.put('/:id', async (req: AuthedRequest, res) => {
  const parsed = updateProspectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  // Ownership enforced: only updates rows belonging to the current user.
  const result = await prisma.prospect.updateMany({
    where: { id: req.params.id, userId: req.userId },
    data: parsed.data,
  });
  if (result.count === 0) {
    return res.status(404).json({ error: 'Prospect introuvable.' });
  }
  const updated = await prisma.prospect.findUnique({
    where: { id: req.params.id },
  });
  return res.json(updated);
});

prospectsRouter.delete('/:id', async (req: AuthedRequest, res) => {
  const result = await prisma.prospect.deleteMany({
    where: { id: req.params.id, userId: req.userId },
  });
  if (result.count === 0) {
    return res.status(404).json({ error: 'Prospect introuvable.' });
  }
  return res.status(204).send();
});
