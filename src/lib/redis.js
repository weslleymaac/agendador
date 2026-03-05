/**
 * Opções de conexão Redis para BullMQ.
 * BullMQ aceita connection options compatíveis com ioredis.
 */
export function getRedisConnectionOptions() {
  const url = process.env.REDIS_URL;
  if (url) {
    return { url };
  }
  const host = process.env.REDIS_HOST || 'localhost';
  const port = parseInt(process.env.REDIS_PORT || '6379', 10);
  return { host, port };
}
