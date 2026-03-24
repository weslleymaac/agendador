export type AgendamentoStatus = "Agendado" | "Executado" | "Falhou" | "Cancelado";

export type Agendamento = {
  id: string;
  data?: string;
  hora?: string;
  webhookUrl?: string;
  dados?: Record<string, unknown>;
  agendadoPara?: string;
  status: AgendamentoStatus;
};
