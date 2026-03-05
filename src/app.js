import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import agendamentosRouter from './routes/agendamentos.js';

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
