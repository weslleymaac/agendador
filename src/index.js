import 'dotenv/config';
import app from './app.js';
import './queue.js'; // inicia o worker (apenas fora do Vercel)

const port = parseInt(process.env.PORT || '3000', 10);

app.listen(port, () => {
  console.log(`API rodando em http://localhost:${port}`);
});
