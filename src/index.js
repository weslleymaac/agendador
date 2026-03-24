import 'dotenv/config';
import { runStartupDiagnostics } from './lib/startupDiagnostics.js';

// Log de erros não tratados para aparecer nos logs do EasyPanel (evita 502 sem diagnóstico)
process.on('uncaughtException', (err) => {
  console.error('uncaughtException:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('unhandledRejection:', reason, promise);
});

await runStartupDiagnostics();

const { default: app, nextDevProxy } = await import('./app.js');
await import('./queue.js'); // inicia o worker (apenas fora do Vercel)

const port = parseInt(process.env.PORT || '3000', 10);
const host = process.env.HOST || '0.0.0.0';

const server = app.listen(port, host, () => {
  const hint = process.env.PROXY_NEXT_DEV ? ' (Next via proxy → use esta URL no navegador)' : '';
  console.log(`API rodando em http://${host}:${port}${hint}`);
});

if (nextDevProxy?.upgrade) {
  server.on('upgrade', nextDevProxy.upgrade);
}

// Encerramento limpo ao receber SIGTERM (Docker/EasyPanel); evita "npm error signal SIGTERM"
process.on('SIGTERM', () => {
  console.log('SIGTERM recebido, encerrando...');
  server.close(() => process.exit(0));
});
