import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import agendamentosRouter from './routes/agendamentos.js';
import { runCronProcessJobs } from './lib/cronProcessJobs.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json({ limit: '256kb' }));

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    optionsSuccessStatus: 200,
  })
);

app.use(
  rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use('/agendamentos', agendamentosRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

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

// Raiz: serve o frontend (antes do static para prioridade no Vercel/serverless)
app.get('/', (req, res, next) => {
  const p = path.join(__dirname, '..', 'public', 'index.html');
  res.sendFile(p, (err) => {
    if (err) {
      if (!res.headersSent) res.status(500).json({ error: 'Erro ao servir frontend' });
      next(err);
    }
  });
});

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use((err, req, res, next) => {
  console.error(err);
  if (!res.headersSent) res.status(500).json({ error: 'Erro interno do servidor' });
});

export default app;
