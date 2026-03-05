import app from '../src/app.js';

/**
 * Handler serverless do Vercel: encaminha todas as requisições para o app Express.
 * Todas as rotas (/, /agendamentos, /health, arquivos estáticos) são tratadas por este handler.
 */
export default (req, res) => app(req, res);
