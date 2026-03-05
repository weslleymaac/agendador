/**
 * Processa jobs agendados que já venceram (para uso no Vercel Cron).
 * O Worker BullMQ não roda no Vercel; este módulo é chamado pelo endpoint de cron
 * para promover jobs delayed cujo horário já passou e executá-los.
 */
import { Worker, Job } from 'bullmq';
import { agendamentosQueue, processWebhook, connection, QUEUE_NAME } from '../queue.js';

export async function runCronProcessJobs() {
  const now = Date.now();
  const delayed = await agendamentosQueue.getDelayed();
  for (const item of delayed) {
    const job = await Job.fromId(agendamentosQueue, item.id);
    if (job) {
      const runAt = job.timestamp + (job.delay || 0);
      if (runAt <= now) {
        await job.promote();
      }
    }
  }

  const worker = new Worker(QUEUE_NAME, async () => {}, {
    connection,
    concurrency: 1,
  });

  const token = `cron-${now}`;
  let processed = 0;
  let job;
  try {
    while ((job = await worker.getNextJob(token, { block: false }))) {
      try {
        await processWebhook(job);
        await job.moveToCompleted({ ok: true }, token);
        processed++;
      } catch (err) {
        await job.moveToFailed(err, token);
        processed++;
      }
    }
  } finally {
    await worker.close();
  }
  return processed;
}
