/**
 * prospects.ts
 * Ticket 015 — Integration complete de l architecture multi-tenant
 *
 * Routes CRUD pour les prospects.
 * - GET  / : filtre par buildOwnerFilter() selon le role de l utilisateur
 * - POST / : associe automatiquement ownerId = req.userId
 * - PUT  /:id : verifies assertCanMutate() avant modification
 * - DELETE /:id : verifie assertCanMutate() avant suppression
 */

import { Router } from 'express';
import { createProspectSchema, updateProspectSchema } from '@ebh/shared';
import { prisma } from '../prisma.js';
import type { AuthedRequest } from '../auth.js';
import {
      buildOwnerFilter,
      assertCanMutate,
      type AuthedRequestWithUser,
} from '../middleware/dataIsolation.js';

export const prospectsRouter = Router();

prospectsRouter.get('/', async (req: AuthedRequestWithUser, res) => {
      try {
              const authUser = req.authUser;
              // Si authUser disponible, applique le filtre hierarchique
        // Sinon fallback sur userId (retro-compatibilite)
        const where = authUser
                ? buildOwnerFilter(authUser)
                  : { ownerId: (req as AuthedRequest).userId };

        const prospects = await prisma.prospect.findMany({
                  where,
                  orderBy: { createdAt: 'desc' },
        });
              res.json(prospects);
      } catch {
              res.status(500).json({ error: 'Impossible de recuperer les prospects.' });
      }
});

prospectsRouter.post('/', async (req: AuthedRequestWithUser, res) => {
      const parsed = createProspectSchema.safeParse(req.body);
      if (!parsed.success) {
              return res.status(400).json({ error: parsed.error.flatten() });
      }
      const ownerId = req.authUser?.id ?? (req as AuthedRequest).userId;
      if (!ownerId) {
              return res.status(401).json({ error: 'Non authentifie.' });
      }
      try {
              const created = await prisma.prospect.create({
                        data: { ...parsed.data, ownerId },
              });
              return res.status(201).json(created);
      } catch {
              return res.status(500).json({ error: 'Impossible de creer le prospect.' });
      }
});

prospectsRouter.put('/:id', async (req: AuthedRequestWithUser, res) => {
      const parsed = updateProspectSchema.safeParse(req.body);
      if (!parsed.success) {
              return res.status(400).json({ error: parsed.error.flatten() });
      }

                      try {
                              const existing = await prisma.prospect.findUnique({
                                        where: { id: req.params.id },
                                        select: { id: true, ownerId: true },
                              });
                              if (!existing) {
                                        return res.status(404).json({ error: 'Prospect introuvable.' });
                              }

        // Verifie les droits de mutation si authUser disponible
        if (req.authUser) {
                  try {
                              assertCanMutate(req.authUser, existing.ownerId);
                  } catch {
                              return res.status(403).json({ error: 'Forbidden: acces refuse.' });
                  }
        } else {
                  // Fallback retro-compatible : verifie ownership strict
                                const userId = (req as AuthedRequest).userId;
                  if (existing.ownerId !== userId) {
                              return res.status(404).json({ error: 'Prospect introuvable.' });
                  }
        }

        const updated = await prisma.prospect.update({
                  where: { id: req.params.id },
                  data: parsed.data,
        });
                              return res.json(updated);
                      } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === '403') {
              return res.status(403).json({ error: 'Forbidden: acces refuse.' });
    }
                              return res.status(500).json({ error: 'Impossible de mettre a jour le prospect.' });
                      }
});

prospectsRouter.delete('/:id', async (req: AuthedRequestWithUser, res) => {
      try {
              const existing = await prisma.prospect.findUnique({
                        where: { id: req.params.id },
                        select: { id: true, ownerId: true },
              });
              if (!existing) {
      return res.status(404).json({ error: 'Prospect introuvable.' });
              }

        if (req.authUser) {
                  try {
                              assertCanMutate(req.authUser, existing.ownerId);
                  } catch {
                              return res.status(403).json({ error: 'Forbidden: acces refuse.' });
                  }
        } else {
                  const userId = (req as AuthedRequest).userId;
                  if (existing.ownerId !== userId) {
                              return res.status(404).json({ error: 'Prospect introuvable.' });
                  }
        }

        await prisma.prospect.delete({ where: { id: req.params.id } });
              return res.status(204).send();
      } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === '403') {
              return res.status(403).json({ error: 'Forbidden: acces refuse.' });
    }
              return res.status(500).json({ error: 'Impossible de supprimer le prospect.' });
      }
});
