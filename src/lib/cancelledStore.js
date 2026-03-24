import Redis from 'ioredis';
import { getRedisConnectionOptions } from './redis.js';

/** Mapeia estado BullMQ para status em português. */
export function statusParaPortugues(state) {
  const map = {
    waiting: 'Agendado',
    delayed: 'Agendado',
    active: 'Agendado',
    completed: 'Executado',
    failed: 'Falhou',
    'waiting-children': 'Agendado',
    unknown: 'Agendado',
  };
  return map[state] ?? 'Agendado';
}

const KEY = 'agendamentos:cancelled';
let client;

function getClient() {
  if (!client) {
    const opts = getRedisConnectionOptions();
    client = opts.url ? new Redis(opts.url) : new Redis(opts);
  }
  return client;
}

/**
 * Salva um agendamento como cancelado (antes de remover da fila).
 * @param {string} id
 * @param {object} snapshot - { id, data, hora, webhookUrl, dados, agendadoPara }
 */
export async function addCancelled(id, snapshot) {
  const redis = getClient();
  await redis.hset(KEY, id, JSON.stringify(snapshot));
}

/**
 * Lista todos os agendamentos cancelados.
 * @returns {Promise<object[]>}
 */
export async function listCancelled() {
  const redis = getClient();
  const raw = await redis.hgetall(KEY);
  if (!raw || Object.keys(raw).length === 0) return [];
  return Object.entries(raw).map(([id, json]) => {
    try {
      return { ...JSON.parse(json), id, status: 'Cancelado' };
    } catch {
      return { id, status: 'Cancelado', dados: {} };
    }
  });
}

/**
 * Remove um agendamento da coleção de cancelados.
 * @param {string} id
 * @returns {Promise<boolean>} true se removeu
 */
export async function removeCancelled(id) {
  const redis = getClient();
  const removed = await redis.hdel(KEY, id);
  return removed > 0;
}
