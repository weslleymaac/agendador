import 'dotenv/config';
import express from 'express';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import agendamentosRouter from './routes/agendamentos.js';
import './queue.js'; // inicia o worker

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

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

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(port, () => {
  console.log(`API rodando em http://localhost:${port}`);
});
