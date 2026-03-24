import { Agendamento } from "./types";

/** Base vazia = mesma origem (rewrites do Next encaminham para a API em Docker). */
function getApiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (raw === undefined) return "http://localhost:3000";
  const b = raw.trim().replace(/\/$/, "");
  return b;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getApiBase();
  const url = path.startsWith("http") ? path : `${base}${path}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = body?.error || `Erro HTTP ${response.status}`;
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function listAgendamentos(): Promise<Agendamento[]> {
  const data = await request<{ agendamentos: Agendamento[] }>("/agendamentos");
  return data.agendamentos || [];
}

export function createAgendamento(payload: Record<string, unknown>): Promise<Agendamento> {
  return request<Agendamento>("/agendamentos", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateAgendamento(id: string, payload: Record<string, unknown>): Promise<Agendamento> {
  return request<Agendamento>(`/agendamentos/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteAgendamento(id: string): Promise<void> {
  return request<void>(`/agendamentos/${id}`, { method: "DELETE" });
}
