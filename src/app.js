import express from 'express';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import agendamentosRouter from './routes/agendamentos.js';
import { runCronProcessJobs } from './lib/cronProcessJobs.js';

const app = express();
const isNextProxy = process.env.PROXY_NEXT_DEV === '1' || process.env.PROXY_NEXT_DEV === 'true';

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    optionsSuccessStatus: 200,
  })
);

/** Em dev com proxy, json() não pode ser global — senão consome o body antes de repassar ao Next. */
app.use('/agendamentos', express.json({ limit: '256kb' }));

// Health primeiro, sem rate limit, para o healthcheck do Docker/EasyPanel passar e evitar SIGTERM
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/agendamentos', apiLimiter, agendamentosRouter);

// Cron Vercel / EasyPanel: processa jobs agendados cujo horário já passou.
// Se CRON_SECRET estiver definido, exige header x-cron-secret ou query secret com o mesmo valor (401 caso contrário).
app.get('/api/cron-process-jobs', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided = req.get('x-cron-secret') || req.query.secret;
    if (provided !== secret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
  try {
    const processed = await runCronProcessJobs();
    return res.json({ ok: true, processed });
  } catch (err) {
    console.error('Cron process jobs error:', err);
    return res.status(500).json({ error: err.message || 'Erro ao processar jobs' });
  }
});

/** Proxy para o Next (dev interno em 3001): uma única porta pública (ex.: 3000). Suporte a WebSocket (HMR). */
export const nextDevProxy = isNextProxy
  ? createProxyMiddleware({
      target: process.env.NEXT_DEV_PROXY_TARGET || 'http://127.0.0.1:3001',
      ws: true,
      changeOrigin: true,
    })
  : null;

if (nextDevProxy) {
  app.use(nextDevProxy);
} else {
  app.get('/', (req, res) => {
    res.json({
      service: 'agendador-api',
      docs: '/docs',
      endpoints: ['/health', '/agendamentos', '/api/cron-process-jobs'],
    });
  });

  app.get('/docs', (req, res) => {
    res.json({
      message: 'Use o frontend Next.js para documentação completa.',
      frontendDocsPath: '/docs (app Next.js)',
      apiBase: '/agendamentos',
    });
  });
}

app.use((err, req, res, next) => {
  console.error(err);
  if (!res.headersSent) res.status(500).json({ error: 'Erro interno do servidor' });
});

export default app;
