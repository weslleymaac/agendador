import express from 'express';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import agendamentosRouter from './routes/agendamentos.js';
import { runCronProcessJobs } from './lib/cronProcessJobs.js';

const app = express();
app.use(express.json({ limit: '256kb' }));

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    optionsSuccessStatus: 200,
  })
);

// Health primeiro, sem rate limit, para o healthcheck do Docker/EasyPanel passar e evitar SIGTERM
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use(
  rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use('/agendamentos', agendamentosRouter);

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

app.use((err, req, res, next) => {
  console.error(err);
  if (!res.headersSent) res.status(500).json({ error: 'Erro interno do servidor' });
});

export default app;
