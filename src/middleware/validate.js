import { body, param, query, validationResult } from 'express-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^\d{1,2}:\d{2}(:\d{2})?$/;

function isSafeWebhookUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1') return false;
    if (host.startsWith('10.') || host.startsWith('192.168.') || host.startsWith('172.')) return false;
    return true;
  } catch {
    return false;
  }
}

export const createAgendamentoRules = [
  body('data')
    .trim()
    .matches(DATE_REGEX)
    .withMessage('data deve ser YYYY-MM-DD'),
  body('hora')
    .trim()
    .matches(TIME_REGEX)
    .withMessage('hora deve ser HH:mm ou HH:mm:ss'),
  body('webhookUrl')
    .trim()
    .isURL()
    .withMessage('webhookUrl deve ser uma URL válida')
    .custom((value) => {
      if (!isSafeWebhookUrl(value)) {
        throw new Error('URL do webhook não permitida (apenas HTTP/HTTPS públicos)');
      }
      return true;
    }),
  body('dados')
    .optional()
    .isObject()
    .withMessage('dados deve ser um objeto'),
  body('tag')
    .optional({ values: 'null' })
    .isString()
    .trim()
    .isLength({ min: 0, max: 200 })
    .withMessage('tag deve ser texto com no máximo 200 caracteres'),
];

export const updateAgendamentoRules = [
  param('id').trim().notEmpty().withMessage('id é obrigatório'),
  ...createAgendamentoRules,
];

export const idParamRules = [
  param('id').trim().notEmpty().withMessage('id é obrigatório'),
];

export const listQueryRules = [
  query('status')
    .optional()
    .custom((value, { req }) => {
      const raw = req.query.status;
      if (raw === undefined || raw === null || raw === '') return true;
      const parts = Array.isArray(raw)
        ? raw.flatMap((p) => String(p).split(','))
        : String(raw).split(',');
      const valid = ['Agendado', 'Executado', 'Cancelado', 'Falhou'];
      for (const p of parts) {
        const s = String(p).trim();
        if (!s) continue;
        if (!valid.includes(s)) {
          throw new Error('status inválido. Use: Agendado, Executado, Cancelado ou Falhou');
        }
      }
      return true;
    }),
  query('data')
    .optional()
    .matches(DATE_REGEX)
    .withMessage('filtro data deve ser YYYY-MM-DD'),
  query('id')
    .optional()
    .trim(),
];

function parseDateTime(data, hora) {
  // Normaliza hora para HH:mm:ss
  const parts = hora.split(':').map((p) => p.padStart(2, '0'));
  const timeStr = parts.length === 2 ? `${parts[0]}:${parts[1]}:00` : `${parts[0]}:${parts[1]}:${(parts[2] || '0').padStart(2, '0')}`;
  // Offset do fuso em horas: -12 a +14. Padrão -3 = Brasília (UTC-3). No Vercel defina APP_TIMEZONE_OFFSET=-3.
  let offsetHours = parseInt(process.env.APP_TIMEZONE_OFFSET ?? '-3', 10);
  if (Number.isNaN(offsetHours) || offsetHours < -12 || offsetHours > 14) {
    offsetHours = -3;
  }
  const sign = offsetHours >= 0 ? '+' : '-';
  const offsetStr = `${sign}${String(Math.abs(offsetHours)).padStart(2, '0')}:00`;
  const iso = `${data}T${timeStr}.000${offsetStr}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function parseAndValidateScheduledAt(data, hora) {
  const scheduledAt = parseDateTime(data, hora);
  if (!scheduledAt) return { error: 'Data ou hora inválida' };
  if (scheduledAt.getTime() <= Date.now()) return { error: 'Data e hora devem ser no futuro' };
  return { scheduledAt };
}

export function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validação falhou',
      details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}
