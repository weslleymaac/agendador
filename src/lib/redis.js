/**
 * Opções de conexão Redis para BullMQ (ioredis).
 *
 * Prioridade:
 * 1) REDIS_URL preenchida — usa a URL completa (redis:// ou rediss://).
 * 2) Senão — monta a URL com REDIS_HOST (padrão localhost), REDIS_PORT, REDIS_USERNAME e REDIS_PASSWORD.
 */

function buildUrlFromParts() {
  const host = (process.env.REDIS_HOST || 'localhost').trim();
  const port = String(process.env.REDIS_PORT || '6379').trim();
  const username = process.env.REDIS_USERNAME?.trim() || '';
  const password =
    process.env.REDIS_PASSWORD !== undefined
      ? String(process.env.REDIS_PASSWORD)
      : '';

  const userEnc = encodeURIComponent(username);
  const passEnc = encodeURIComponent(password);

  if (username && password) {
    return `redis://${userEnc}:${passEnc}@${host}:${port}`;
  }
  if (password) {
    return `redis://:${passEnc}@${host}:${port}`;
  }
  if (username) {
    return `redis://${userEnc}@${host}:${port}`;
  }
  return `redis://${host}:${port}`;
}

export function getRedisConnectionOptions() {
  const url = process.env.REDIS_URL?.trim();
  if (url) {
    return { url };
  }
  return { url: buildUrlFromParts() };
}
