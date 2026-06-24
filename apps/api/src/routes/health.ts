import { Router } from 'express';
import { prisma } from '../prisma.js';

  export const healthRouter = Router();

/**
 * GET /health/db
   * Checks database connectivity by executing a lightweight SELECT 1 via Prisma.
   * Returns { status: "ok", database: "connected" } on success,
 * or a 503 with { status: "error", database: "disconnected", detail } on failure.
 */
healthRouter.get('/db', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected' });
} catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      detail,
});
}
});
