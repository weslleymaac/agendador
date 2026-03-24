import express from 'express';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import agendamentosRouter from './routes/agendamentos.js';
import { runCronProcessJobs } from './lib/cronProcessJobs.js';
import { renderDocsHtml } from './lib/docsHtml.js';

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
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(renderDocsHtml(req));
  });

  // Quem aponta o domínio só para a API vê "Cannot GET /login" — explica o serviço correto (Next `web`).
  app.get('/login', (req, res) => {
    res.status(404).type('html').send(`<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Login — domínio na API</title></head>
<body style="font-family:system-ui,sans-serif;max-width:42rem;margin:2rem auto;padding:0 1rem;line-height:1.5">
<h1>Domínio apontando para a API</h1>
<p>A rota <code>/login</code> é do <strong>frontend (serviço <code>web</code></strong> — Next.js). Este endereço está respondendo pela <strong>API (serviço <code>app</code>)</strong>, que não tem tela de login.</p>
<p><strong>No EasyPanel:</strong> associe o domínio público ao serviço <code>web</code>, porta do container <strong>3000</strong> (não ao <code>app</code>). Depois acesse de novo <code>/login</code>.</p>
<p>Documentação em <code>/docs</code> nesta mesma API continua funcionando.</p>
</body></html>`);
  });
}

app.use((err, req, res, next) => {
  console.error(err);
  if (!res.headersSent) res.status(500).json({ error: 'Erro interno do servidor' });
});

export default app;
