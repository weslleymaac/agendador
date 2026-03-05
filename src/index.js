import 'dotenv/config';
import app from './app.js';
import './queue.js'; // inicia o worker (apenas fora do Vercel)

const port = parseInt(process.env.PORT || '3000', 10);
const host = process.env.HOST || '0.0.0.0';

// Log de erros não tratados para aparecer nos logs do EasyPanel (evita 502 sem diagnóstico)
process.on('uncaughtException', (err) => {
  console.error('uncaughtException:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('unhandledRejection:', reason, promise);
});

const server = app.listen(port, host, () => {
  console.log(`API rodando em http://${host}:${port}`);
});

// Encerramento limpo ao receber SIGTERM (Docker/EasyPanel); evita "npm error signal SIGTERM"
process.on('SIGTERM', () => {
  console.log('SIGTERM recebido, encerrando...');
  server.close(() => process.exit(0));
});
