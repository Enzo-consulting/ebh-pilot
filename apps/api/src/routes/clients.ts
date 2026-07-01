/**
 * clients.ts
 * Ticket 015 — Integration complete de l architecture multi-tenant
 *
 * Routes CRUD pour les clients (vues sur les prospects avec clientStatus).
 * - GET  /   : filtre par buildOwnerFilter() selon le role
 * - GET  /:id : filtre par ownerId ou perimetre hierarchique
 * - POST /   : associe ownerId = req.authUser.id
 * - PUT  /:id : verifie assertCanMutate() avant modification
 * - DELETE /:id : verifie assertCanMutate() avant suppression
 */

import { Router } from 'express';
import { createClientSchema, updateClientSchema } from '@ebh/shared';
import { prisma } from '../prisma.js';
import type { AuthedRequest } from '../auth.js';
import {
      buildOwnerFilter,
      assertCanMutate,
      type AuthedRequestWithUser,
} from '../middleware/dataIsolation.js';

export const clientsRouter = Router();

function serialize(row: Record<string, unknown>) {
      const { clientStatus, ...rest } = row as { clientStatus?: string } & Record<string, unknown>;
      return { ...rest, status: clientStatus ?? 'PROSPECT' };
}

function normalizeEmail(email?: string | null) {
      return email === '' ? null : email;
}

                                                clientsRouter.get('/', async (req: AuthedRequestWithUser, res) => {
                                                      try {
                                                              const authUser = req.authUser;
                                                              const where = authUser
                                                                ? buildOwnerFilter(authUser)
                                                                        : { ownerId: (req as AuthedRequest).userId };

                                                        const clients = await prisma.prospect.findMany({
                                                                  where,
      orderBy: { company: 'asc' },
                                                        });
                                                              res.json(clients.map((c) => serialize(c as Record<string, unknown>)));
                                                      } catch {
                                                              res.status(500).json({ error: 'Impossible de recuperer les clients.' });
                                                      }
                                                });

clientsRouter.get('/:id', async (req: AuthedRequestWithUser, res) => {
      try {
              const authUser = req.authUser;
              const where = authUser
                ? { id: req.params.id, ...buildOwnerFilter(authUser) }
                        : { id: req.params.id, ownerId: (req as AuthedRequest).userId };

        const client = await prisma.prospect.findFirst({ where });
              if (!client) return res.status(404).json({ error: 'Client introuvable.' });
              return res.json(serialize(client as Record<string, unknown>));
      } catch {
              return res.status(500).json({ error: 'Impossible de recuperer le client.' });
      }
});

clientsRouter.post('/', async (req: AuthedRequestWithUser, res) => {
      const parsed = createClientSchema.safeParse(req.body);
      if (!parsed.success) {
              return res.status(400).json({ error: parsed.error.flatten() });
      }
      const ownerId = req.authUser?.id ?? (req as AuthedRequest).userId;
      if (!ownerId) {
              return res.status(401).json({ error: 'Non authentifie.' });
      }
      const { status, ...rest } = parsed.data;
      try {
              const created = await prisma.prospect.create({
                        data: {
                                    ...rest,
                                    email: normalizeEmail(rest.email),
                                    clientStatus: status,
                                    name: rest.company,
                                    ownerId,
                        },
              });
              return res.status(201).json(serialize(created as Record<string, unknown>));
      } catch {
              return res.status(500).json({ error: 'Impossible de creer le client.' });
      }
});

clientsRouter.put('/:id', async (req: AuthedRequestWithUser, res) => {
      const parsed = updateClientSchema.safeParse(req.body);
      if (!parsed.success) {
              return res.status(400).json({ error: parsed.error.flatten() });
      }
      try {
              const existing = await prisma.prospect.findUnique({
                        where: { id: req.params.id },
                        select: { id: true, ownerId: true, sellingPrice: true,
                                         transportCost: true, preparationCost: true, accessoriesCost: true, otherCosts: true },
              });
              if (!existing) {
                        return res.status(404).json({ error: 'Client introuvable.' });
              }

        if (req.authUser) {
                  try { assertCanMutate(req.authUser, existing.ownerId); }
                  catch { return res.status(403).json({ error: 'Forbidden: acces refuse.' }); }
        } else {
                  if (existing.ownerId !== (req as AuthedRequest).userId) {
                              return res.status(404).json({ error: 'Client introuvable.' });
                  }
        }

        const { status, ...rest } = parsed.data;
              const patch: Record<string, unknown> = { ...rest };
              if ('email' in rest) patch.email = normalizeEmail(rest.email);
              if (status !== undefined) patch.clientStatus = status;
              if (rest.company !== undefined) patch.name = rest.company;

        const updated = await prisma.prospect.update({
                  where: { id: req.params.id },
                  data: patch,
        });
              return res.json(serialize(updated as Record<string, unknown>));
      } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === '403') {
              return res.status(403).json({ error: 'Forbidden: acces refuse.' });
    }
              return res.status(500).json({ error: 'Impossible de mettre a jour le client.' });
      }
});

clientsRouter.delete('/:id', async (req: AuthedRequestWithUser, res) => {
      try {
              const existing = await prisma.prospect.findUnique({
                        where: { id: req.params.id },
                        select: { id: true, ownerId: true },
              });
              if (!existing) return res.status(404).json({ error: 'Client introuvable.' });

        if (req.authUser) {
                  try { assertCanMutate(req.authUser, existing.ownerId); }
                  catch { return res.status(403).json({ error: 'Forbidden: acces refuse.' }); }
        } else {
                  if (existing.ownerId !== (req as AuthedRequest).userId) {
                              return res.status(404).json({ error: 'Client introuvable.' });
                  }
        }

        await prisma.prospect.delete({ where: { id: req.params.id } });
              return res.status(204).send();
      } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === '403') {
              return res.status(403).json({ error: 'Forbidden: acces refuse.' });
    }
              return res.status(500).json({ error: 'Impossible de supprimer le client.' });
      }
});
