import { v4 as uuidv4 } from 'uuid';
import { agendamentosQueue } from '../queue.js';
import { parseAndValidateScheduledAt } from '../middleware/validate.js';
import { statusParaPortugues, addCancelled, listCancelled } from '../lib/cancelledStore.js';

async function getJobState(job) {
  try {
    const state = await job.getState();
    return state;
  } catch {
    return 'unknown';
  }
}

function jobToItem(job, state) {
  const d = job.data || {};
  const agendadoPara = job.timestamp
    ? new Date(job.timestamp).toISOString()
    : d.data && d.hora
      ? `${d.data}T${(d.hora.length <= 5 ? d.hora + ':00' : d.hora)}`
      : null;
  return {
    id: job.id,
    data: d.data,
    hora: d.hora,
    webhookUrl: d.webhookUrl,
    dados: d.dados,
    agendadoPara,
    status: statusParaPortugues(state),
  };
}

function applyFilters(items, filters) {
  let out = items;
  if (filters.data) {
    const dataStr = String(filters.data).trim();
    out = out.filter((i) => (i.data && i.data === dataStr) || (i.agendadoPara && i.agendadoPara.startsWith(dataStr)));
  }
  if (filters.id) {
    const idStr = String(filters.id).trim().toLowerCase();
    out = out.filter((i) => i.id && i.id.toLowerCase().includes(idStr));
  }
  return out;
}

export async function create(req, res) {
  const { data, hora, webhookUrl, dados } = req.body;
  const parsed = parseAndValidateScheduledAt(data, hora);
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }
  const { scheduledAt } = parsed;
  const delay = Math.max(0, scheduledAt.getTime() - Date.now());
  const jobId = uuidv4();
  const jobData = {
    webhookUrl,
    dados: dados ?? {},
    data,
    hora,
  };
  try {
    const job = await agendamentosQueue.add('webhook', jobData, {
      jobId,
      delay,
    });
    const state = await getJobState(job);
    return res.status(201).json({
      id: job.id,
      data,
      hora,
      webhookUrl,
      dados: jobData.dados,
      agendadoPara: scheduledAt.toISOString(),
      status: statusParaPortugues(state),
    });
  } catch (err) {
    console.error('Erro ao criar agendamento:', err);
    return res.status(500).json({ error: 'Erro ao criar agendamento' });
  }
}

export async function list(req, res) {
  const { status: statusFilter, data: dataFilter, id: idFilter } = req.query;
  try {
    let items = [];

    const statusNorm = statusFilter ? String(statusFilter).trim() : '';

    if (!statusNorm || statusNorm === 'Agendado') {
      const jobs = await agendamentosQueue.getJobs(['waiting', 'delayed', 'active'], 0, 999, true);
      for (const job of jobs) {
        const state = await getJobState(job);
        items.push(jobToItem(job, state));
      }
    }
    if (!statusNorm || statusNorm === 'Executado') {
      const jobs = await agendamentosQueue.getJobs(['completed'], 0, 999, true);
      for (const job of jobs) {
        items.push(jobToItem(job, 'completed'));
      }
    }
    if (!statusNorm || statusNorm === 'Falhou') {
      const jobs = await agendamentosQueue.getJobs(['failed'], 0, 999, true);
      for (const job of jobs) {
        items.push(jobToItem(job, 'failed'));
      }
    }
    if (!statusNorm || statusNorm === 'Cancelado') {
      const cancelled = await listCancelled();
      items = items.concat(cancelled);
    }

    items = applyFilters(items, { data: dataFilter, id: idFilter });
    return res.json({ agendamentos: items });
  } catch (err) {
    console.error('Erro ao listar agendamentos:', err);
    return res.status(500).json({ error: 'Erro ao listar agendamentos' });
  }
}

export async function getById(req, res) {
  const { id } = req.params;
  try {
    const job = await agendamentosQueue.getJob(id);
    if (!job) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    const state = await getJobState(job);
    const d = job.data || {};
    return res.json({
      id: job.id,
      data: d.data,
      hora: d.hora,
      webhookUrl: d.webhookUrl,
      dados: d.dados,
      agendadoPara: job.timestamp ? new Date(job.timestamp).toISOString() : null,
      status: statusParaPortugues(state),
    });
  } catch (err) {
    console.error('Erro ao buscar agendamento:', err);
    return res.status(500).json({ error: 'Erro ao buscar agendamento' });
  }
}

export async function update(req, res) {
  const { id } = req.params;
  const { data, hora, webhookUrl, dados } = req.body;
  const parsed = parseAndValidateScheduledAt(data, hora);
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }
  const { scheduledAt } = parsed;
  try {
    const existing = await agendamentosQueue.getJob(id);
    if (!existing) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    await agendamentosQueue.remove(id);
    const delay = Math.max(0, scheduledAt.getTime() - Date.now());
    const jobData = {
      webhookUrl,
      dados: dados ?? {},
      data,
      hora,
    };
    const job = await agendamentosQueue.add('webhook', jobData, {
      jobId: id,
      delay,
    });
    const state = await getJobState(job);
    return res.json({
      id: job.id,
      data,
      hora,
      webhookUrl,
      dados: jobData.dados,
      agendadoPara: scheduledAt.toISOString(),
      status: statusParaPortugues(state),
    });
  } catch (err) {
    console.error('Erro ao atualizar agendamento:', err);
    return res.status(500).json({ error: 'Erro ao atualizar agendamento' });
  }
}

export async function remove(req, res) {
  const { id } = req.params;
  try {
    const job = await agendamentosQueue.getJob(id);
    if (!job) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    const d = job.data || {};
    const agendadoPara = job.timestamp ? new Date(job.timestamp).toISOString() : `${d.data || ''}T${d.hora || ''}`;
    await addCancelled(id, {
      id,
      data: d.data,
      hora: d.hora,
      webhookUrl: d.webhookUrl,
      dados: d.dados,
      agendadoPara,
    });
    await agendamentosQueue.remove(id);
    return res.status(204).send();
  } catch (err) {
    console.error('Erro ao remover agendamento:', err);
    return res.status(500).json({ error: 'Erro ao remover agendamento' });
  }
}
