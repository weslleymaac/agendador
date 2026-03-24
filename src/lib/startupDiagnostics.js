import Redis from 'ioredis';
import { getRedisConnectionOptions } from './redis.js';

const LINE = '═'.repeat(76);

function banner(lines) {
  console.error('');
  console.error(LINE);
  for (const line of lines) {
    console.error(line);
  }
  console.error(LINE);
  console.error('');
}

/**
 * Em produção: sem REDIS_URL nem REDIS_HOST, o padrão localhost quase nunca funciona no Docker/EasyPanel.
 */
export function reportMissingEnvVars() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) return;

  const hasUrl = Boolean(process.env.REDIS_URL?.trim());
  const hasHost = Boolean(process.env.REDIS_HOST?.trim());
  if (!hasUrl && !hasHost) {
    banner([
      '[AGENDADOR] ⚠️  VARIÁVEIS DE AMBIENTE AUSENTES',
      '[AGENDADOR] → Defina REDIS_URL (recomendado no EasyPanel) ou REDIS_HOST',
      '[AGENDADOR] → Sem isso, o app usa redis://localhost:6379 e tende a falhar dentro do container.',
    ]);
  }
}

/**
 * Testa Redis antes da fila/worker. Logs amplos para achar rápido no EasyPanel.
 */
export async function verifyRedisReachable({ exitOnFailure }) {
  const { url } = getRedisConnectionOptions();
  const redis = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 10_000,
    retryStrategy: () => null,
    showFriendlyErrorStack: process.env.NODE_ENV !== 'production',
  });
  redis.on('error', () => {}); // evita "Unhandled error event" no console além do nosso banner

  try {
    await redis.connect();
    const pong = await redis.ping();
    if (pong !== 'PONG') {
      throw new Error(`Redis ping inesperado: ${pong}`);
    }
    console.log('[AGENDADOR] Redis: conexão OK (PING).');
    await redis.quit();
  } catch (err) {
    const reason = err?.message || String(err);
    banner([
      '[AGENDADOR] ⚠️  SEM CONEXÃO COM O REDIS',
      `[AGENDADOR] → ${reason}`,
      '[AGENDADOR] → Confira REDIS_URL / REDIS_HOST, firewall, TLS (rediss://) e se o Redis aceita conexões deste container.',
    ]);
    try {
      redis.disconnect();
    } catch {
      /* ignore */
    }
    if (exitOnFailure) {
      process.exit(1);
    }
  }
}

export async function runStartupDiagnostics() {
  reportMissingEnvVars();
  const isProd = process.env.NODE_ENV === 'production';
  await verifyRedisReachable({ exitOnFailure: isProd });
}
