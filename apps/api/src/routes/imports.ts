import { Router } from 'express';
import { createImportJobSchema } from '@ebh/shared';
import { prisma } from '../prisma';
import type { AuthedRequest } from '../auth';

export const importsRouter = Router();

// ─── GET /api/imports ────────────────────────────────────────────────────────
// Returns all import jobs for the authenticated user, newest first.
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

// ─── POST /api/imports ───────────────────────────────────────────────────────
// Creates a new import job, starts it as PROCESSING, then resolves it to
// SUCCESS after a 2-second simulated delay.
// No scraping, no AI — workflow only (Ticket #009.2).
importsRouter.post('/', async (req: AuthedRequest, res) => {
  // 1. Validate the request body.
  const parsed = createImportJobSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    // 2. Create the job with PROCESSING status immediately.
    const job = await prisma.importJob.create({
      data: {
        url: parsed.data.url,
        status: 'PROCESSING',
        userId: req.userId ?? null,
      },
    });

    // 3. Respond immediately so the client can display PROCESSING.
    res.status(201).json(job);

    // 4. Simulate a 2-second analysis delay, then set status to SUCCESS.
    setTimeout(async () => {
      try {
        await prisma.importJob.update({
          where: { id: job.id },
          data: { status: 'SUCCESS' },
        });
      } catch {
        // Best-effort: if the update fails, mark as FAILED.
        await prisma.importJob.update({
          where: { id: job.id },
          data: { status: 'FAILED' },
        }).catch(() => undefined);
      }
    }, 2000);
  } catch {
    return res.status(500).json({ error: "Impossible de créer l'import." });
  }
});
