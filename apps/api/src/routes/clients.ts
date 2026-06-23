import { Router } from 'express';
import { createClientSchema, updateClientSchema } from '@ebh/shared';
import { prisma } from '../prisma';
import type { AuthedRequest } from '../auth';

export const clientsRouter = Router();

// The Clients module is backed by the Prospect table (reused store).
// `company` is required; `name` is kept in sync for backward compatibility
// with the legacy required column. The client-facing `status` maps to the
// `clientStatus` column (ClientStatus enum).
function serialize(row: Record<string, unknown>) {
  const { clientStatus, ...rest } = row as { clientStatus?: string } & Record<string, unknown>;
  return { ...rest, status: clientStatus ?? 'PROSPECT' };
}

function normalizeEmail(email?: string | null) {
  return email === '' ? null : email;
}

clientsRouter.get('/', async (req: AuthedRequest, res) => {
  const clients = await prisma.prospect.findMany({
    where: { userId: req.userId },
    orderBy: { company: 'asc' },
  });
  res.json(clients.map(serialize));
});

clientsRouter.get('/:id', async (req: AuthedRequest, res) => {
  const client = await prisma.prospect.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!client) return res.status(404).json({ error: 'Client introuvable.' });
  return res.json(serialize(client));
});

clientsRouter.post('/', async (req: AuthedRequest, res) => {
  const parsed = createClientSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { status, ...rest } = parsed.data;
  const created = await prisma.prospect.create({
    data: {
      ...rest,
      email: normalizeEmail(rest.email),
      clientStatus: status,
      name: rest.company, // keep legacy required column populated
      userId: req.userId!,
    },
  });
  return res.status(201).json(serialize(created));
});

clientsRouter.put('/:id', async (req: AuthedRequest, res) => {
  const parsed = updateClientSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { status, ...rest } = parsed.data;
  const patch: Record<string, unknown> = { ...rest };
  if ('email' in rest) patch.email = normalizeEmail(rest.email);
  if (status !== undefined) patch.clientStatus = status;
  if (rest.company !== undefined) patch.name = rest.company;

  const result = await prisma.prospect.updateMany({
    where: { id: req.params.id, userId: req.userId },
    data: patch,
  });
  if (result.count === 0) {
    return res.status(404).json({ error: 'Client introuvable.' });
  }
  const updated = await prisma.prospect.findUnique({
    where: { id: req.params.id },
  });
  return res.json(serialize(updated as Record<string, unknown>));
});

clientsRouter.delete('/:id', async (req: AuthedRequest, res) => {
  const result = await prisma.prospect.deleteMany({
    where: { id: req.params.id, userId: req.userId },
  });
  if (result.count === 0) {
    return res.status(404).json({ error: 'Client introuvable.' });
  }
  return res.status(204).send();
});
