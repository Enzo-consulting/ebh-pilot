import { Router } from 'express';
import { createImportJobSchema } from '@ebh/shared';
import { prisma } from '../prisma.js';
import type { AuthedRequest } from '../auth.js';

export const importsRouter = Router();

// GET /api/imports — Returns all import jobs for the user, newest first.
importsRouter.get('/', async (req: AuthedRequest, res) => {
    try {
          const jobs = await prisma.importJob.findMany({
                  where: { userId: req.userId },
                  orderBy: { createdAt: 'desc' },
          });
          res.json(jobs);
    } catch {
          res.status(500).json({ error: 'Impossible de récupérer les imports.' });
    }
});

// POST /api/imports — Creates a job (PROCESSING), responds, then resolves to SUCCESS.
importsRouter.post('/', async (req: AuthedRequest, res) => {
    const parsed = createImportJobSchema.safeParse(req.body);
    if (!parsed.success) {
          return res.status(400).json({ error: parsed.error.flatten() });
    }

                     try {
                           const job = await prisma.importJob.create({
                                   data: {
                                             url: parsed.data.url,
                                             status: 'PROCESSING',
                                             userId: req.userId ?? null,
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
                           return res.status(500).json({ error: "Impossible de créer l'import." });
                     }
});
