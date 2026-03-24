export type AgendamentoStatus = "Agendado" | "Executado" | "Falhou" | "Cancelado";

export type Agendamento = {
  id: string;
  data?: string;
  hora?: string;
  webhookUrl?: string;
  /** Etiqueta opcional para agrupar agendamentos */
  tag?: string | null;
  dados?: Record<string, unknown>;
  agendadoPara?: string;
  status: AgendamentoStatus;
};
