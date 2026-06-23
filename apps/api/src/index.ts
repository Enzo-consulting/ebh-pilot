import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { requireAuth } from './auth.js';
import { dashboardRouter } from './routes/dashboard.js';
import { prospectsRouter } from './routes/prospects.js';
import { clientsRouter } from './routes/clients.js';
import { productsRouter } from './routes/products.js';
import { profitabilityRouter } from './routes/profitability.js';
import { importsRouter } from './routes/imports.js';

const app = express();
const port = Number(process.env.PORT ?? 4000);

// Restrict CORS to the configured web origin when provided.
const webOrigin = process.env.WEB_ORIGIN;
app.use(cors(webOrigin ? { origin: webOrigin } : undefined));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// All /api routes require a valid Supabase JWT and are scoped to the user.
app.use('/api/dashboard', requireAuth, dashboardRouter);
app.use('/api/prospects', requireAuth, prospectsRouter);
app.use('/api/clients', requireAuth, clientsRouter);
app.use('/api/products', requireAuth, productsRouter);
app.use('/api/profitability', requireAuth, profitabilityRouter);
app.use('/api/imports', requireAuth, importsRouter);

app.listen(port, () => {
    // eslint-disable-next-line no-console
             console.log(`EBH Pilot API running on http://localhost:${port}`);
});
