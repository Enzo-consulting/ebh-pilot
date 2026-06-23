import 'dotenv/config';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { prisma } from './prisma.js';
import { requireAuth } from './auth.js';
import { dashboardRouter } from './routes/dashboard.js';
import { prospectsRouter } from './routes/prospects.js';
import { clientsRouter } from './routes/clients.js';
import { productsRouter } from './routes/products.js';
import { profitabilityRouter } from './routes/profitability.js';
import { importsRouter } from './routes/imports.js';

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------
const PORT = Number(process.env.PORT ?? 4000);
const NODE_ENV = process.env.NODE_ENV ?? 'development';
const FRONTEND_URL = process.env.FRONTEND_URL ?? process.env.WEB_ORIGIN;

// ---------------------------------------------------------------------------
// CORS — allow localhost for dev + any explicit FRONTEND_URL for production.
// ---------------------------------------------------------------------------
const allowedOrigins: (string | RegExp)[] = [
      /^http:\/\/localhost(:\d+)?$/,
      /^http:\/\/127\.0\.0\.1(:\d+)?$/,
    ];
if (FRONTEND_URL) {
      allowedOrigins.push(FRONTEND_URL);
}

const app = express();

app.use(
      cors({
              origin: (origin, callback) => {
                        // Allow requests with no origin (server-to-server, curl, Render health).
                if (!origin) return callback(null, true);
                        const allowed = allowedOrigins.some((pattern) =>
                                    typeof pattern === 'string' ? pattern === origin : pattern.test(origin),
                                                                  );
                        if (allowed) return callback(null, true);
                        callback(new Error(`CORS: origin not allowed — ${origin}`));
              },
              credentials: true,
      }),
    );

app.use(express.json());

// ---------------------------------------------------------------------------
// Routes publiques
// ---------------------------------------------------------------------------

// GET / — racine de l'API
app.get('/', (_req, res) => {
      res.json({
              service: 'EBH Pilot API',
              status: 'online',
              version: '0.1.0',
      });
});

// GET /api/health — healthcheck avec test de connexion Prisma
app.get('/api/health', async (_req, res) => {
      let database: 'connected' | 'disconnected' = 'disconnected';
      try {
              await prisma.$queryRaw`SELECT 1`;
              database = 'connected';
      } catch {
              // Prisma not reachable — degraded but not crashing.
      }
      res.json({
              status: 'ok',
              database,
              timestamp: new Date().toISOString(),
      });
});

// Legacy alias kept for backward compatibility.
app.get('/health', (_req, res) => res.redirect(301, '/api/health'));

// ---------------------------------------------------------------------------
// Routes API (authentifiées)
// ---------------------------------------------------------------------------
app.use('/api/dashboard', requireAuth, dashboardRouter);
app.use('/api/prospects', requireAuth, prospectsRouter);
app.use('/api/clients', requireAuth, clientsRouter);
app.use('/api/products', requireAuth, productsRouter);
app.use('/api/profitability', requireAuth, profitabilityRouter);
app.use('/api/imports', requireAuth, importsRouter);

// ---------------------------------------------------------------------------
// Middleware d'erreur global
// ---------------------------------------------------------------------------
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      const message =
              err instanceof Error ? err.message : 'Une erreur inattendue est survenue.';

          // Don't leak CORS details in production.
          const code =
                  err instanceof Error && err.message.startsWith('CORS:')
          ? 'CORS_BLOCKED'
                    : 'INTERNAL_ERROR';

          const status = code === 'CORS_BLOCKED' ? 403 : 500;

          // eslint-disable-next-line no-console
          if (NODE_ENV !== 'test') console.error('[error]', err);

          res.status(status).json({ success: false, message, code });
});

// 404 pour toutes les routes inconnues
app.use((_req, res) => {
      res.status(404).json({
              success: false,
              message: 'Route introuvable.',
              code: 'NOT_FOUND',
      });
});

// ---------------------------------------------------------------------------
// Démarrage
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
      // eslint-disable-next-line no-console
             console.log('-----------------------------------');
      // eslint-disable-next-line no-console
             console.log('EBH Pilot API');
      // eslint-disable-next-line no-console
             console.log(`Environment : ${NODE_ENV}`);
      // eslint-disable-next-line no-console
             console.log(`Port        : ${PORT}`);
      // eslint-disable-next-line no-console
             console.log('API Ready');
      // eslint-disable-next-line no-console
             console.log('-----------------------------------');
});
