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

// Cron Vercel: processa jobs agendados cujo horário já passou (rode a cada minuto no Vercel Cron)
const CRON_SECRET = process.env.CRON_SECRET;
app.get('/api/cron-process-jobs', async (req, res) => {
  const auth = req.headers.authorization;
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
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
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

export default app;
