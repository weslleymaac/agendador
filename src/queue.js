import { Queue, Worker } from 'bullmq';
import { getRedisConnectionOptions } from './lib/redis.js';

const QUEUE_NAME = 'agendamentos';
const connection = getRedisConnectionOptions();

export const agendamentosQueue = new Queue(QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 1000 },
  },
});

async function processWebhook(job) {
  const { webhookUrl, dados } = job.data;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados ?? {}),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      throw new Error(`Webhook respondeu ${res.status}: ${res.statusText}`);
    }
    return { ok: true, status: res.status };
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

// Worker só inicia fora do Vercel (serverless não mantém processo em background)
if (!process.env.VERCEL) {
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => processWebhook(job),
    {
      connection,
      concurrency: 10,
    }
  );

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} falhou:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('Worker error:', err);
  });
}
