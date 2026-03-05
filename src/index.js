import 'dotenv/config';
import app from './app.js';
import './queue.js'; // inicia o worker (apenas fora do Vercel)

const port = parseInt(process.env.PORT || '3000', 10);

const host = process.env.HOST || '0.0.0.0';
app.listen(port, host, () => {
  console.log(`API rodando em http://${host}:${port}`);
});
