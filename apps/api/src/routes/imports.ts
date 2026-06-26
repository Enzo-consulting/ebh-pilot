/**
 * imports.ts
 * Ticket 015 — Integration complete de l architecture multi-tenant
 *
 * Routes pour les jobs d import IA.
 * - GET  / : filtre par buildOwnerFilter() selon le role
 * - POST / : associe ownerId = req.authUser.id (nullable)
 */

import { Router } from 'express';
import { createImportJobSchema } from '@ebh/shared';
import { prisma } from '../prisma.js';
import type { AuthedRequest } from '../auth.js';
import {
      buildOwnerFilter,
      type AuthedRequestWithUser,
} from '../middleware/dataIsolation.js';

export const importsRouter = Router();

// GET /api/imports — Retourne tous les jobs de l utilisateur selon son perimetre
importsRouter.get('/', async (req: AuthedRequestWithUser, res) => {
      try {
              const authUser = req.authUser;
              // ImportJob.ownerId est nullable : on filtre uniquement si authUser disponible
        const where = authUser
                ? buildOwnerFilter(authUser)
                  : { ownerId: (req as AuthedRequest).userId ?? null };

        const jobs = await prisma.importJob.findMany({
                  where,
                  orderBy: { createdAt: 'desc' },
        });
              res.json(jobs);
      } catch {
              res.status(500).json({ error: 'Impossible de recuperer les imports.' });
      }
});

// POST /api/imports — Cree un job (PROCESSING), repond, puis resout en SUCCESS
importsRouter.post('/', async (req: AuthedRequestWithUser, res) => {
      const parsed = createImportJobSchema.safeParse(req.body);
      if (!parsed.success) {
              return res.status(400).json({ error: parsed.error.flatten() });
      }

                     const ownerId = req.authUser?.id ?? (req as AuthedRequest).userId ?? null;

                     try {
                             const job = await prisma.importJob.create({
                                       data: {
                                                   url: parsed.data.url,
                                                   status: 'PROCESSING',
                                                   ownerId,
                                       },
                             });

        res.status(201).json(job);

        setTimeout(async () => {
                  try {
                              await prisma.importJob.update({
                                            where: { id: job.id },
                                            data: { status: 'SUCCESS' },
                              });
                  } catch {
                              await prisma.importJob
                                .update({ where: { id: job.id }, data: { status: 'FAILED' } })
                                .catch(() => undefined);
                  }
        }, 2000);
                     } catch {
                             return res.status(500).json({ error: "Impossible de creer l'import." });
                     }
});
