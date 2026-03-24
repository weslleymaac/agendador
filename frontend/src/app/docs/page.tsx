import Link from "next/link";

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

export default function DocsPage() {
  return (
    <main style={{ padding: 20, display: "grid", gap: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 28 }}>Documentação da API</h1>
          <p style={{ color: "var(--muted)" }}>
            Endpoint principal: <code>{apiBase}</code>
          </p>
        </div>
        <Link href="/" style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", background: "#fff" }}>
          Voltar ao dashboard
        </Link>
      </header>

      <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 16, display: "grid", gap: 10 }}>
        <h2>Resumo dos endpoints</h2>
        <ul style={{ display: "grid", gap: 6, paddingLeft: 18 }}>
          <li>
            <code>GET /health</code> - status do serviço.
          </li>
          <li>
            <code>POST /agendamentos</code> - cria agendamento.
          </li>
          <li>
            <code>GET /agendamentos</code> - lista agendamentos.
          </li>
          <li>
            <code>GET /agendamentos/:id</code> - busca por id.
          </li>
          <li>
            <code>PUT /agendamentos/:id</code> - atualiza agendamento.
          </li>
          <li>
            <code>DELETE /agendamentos/:id</code> - remove o agendamento (fila Redis/BullMQ e registro em cancelados, se houver).
          </li>
          <li>
            <code>GET /api/cron-process-jobs</code> - processamento via cron.
          </li>
        </ul>
      </section>

      <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 16, display: "grid", gap: 12 }}>
        <h2>Criar agendamento</h2>
        <pre style={{ background: "#f8fafc", border: "1px solid var(--border)", borderRadius: 10, padding: 12, overflowX: "auto" }}>{`curl -X POST ${apiBase}/agendamentos \\
  -H "Content-Type: application/json" \\
  -d '{
    "data": "2026-12-31",
    "hora": "14:30",
    "webhookUrl": "https://webhook.site/seu-id",
    "tag": "grupo-marketing",
    "dados": { "origem": "dashboard" }
  }'`}</pre>
        <p>
          Campos obrigatórios: <code>data</code>, <code>hora</code>, <code>webhookUrl</code>.{" "}
          <code>dados</code> e <code>tag</code> são opcionais; <code>tag</code> agrupa agendamentos (texto, máx. 200 caracteres).
        </p>
      </section>

      <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 16, display: "grid", gap: 12 }}>
        <h2>Listagem e filtros</h2>
        <pre style={{ background: "#f8fafc", border: "1px solid var(--border)", borderRadius: 10, padding: 12, overflowX: "auto" }}>{`curl ${apiBase}/agendamentos
curl "${apiBase}/agendamentos?status=Executado"
curl "${apiBase}/agendamentos?status=Agendado&status=Executado"
curl "${apiBase}/agendamentos?status=Agendado,Executado"
curl "${apiBase}/agendamentos?data=2026-03-24"
curl "${apiBase}/agendamentos?id=parte-do-id"`}</pre>
        <p>
          Filtro <code>status</code>: um ou mais valores (Agendado, Executado, Falhou, Cancelado) — repita o parâmetro ou use lista separada por
          vírgula.
        </p>
      </section>

      <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 16, display: "grid", gap: 12 }}>
        <h2>Erros comuns</h2>
        <ul style={{ display: "grid", gap: 6, paddingLeft: 18 }}>
          <li>
            <code>400</code> validação falhou (data/hora/formato/URL inválidos).
          </li>
          <li>
            <code>401</code> cron sem segredo correto quando <code>CRON_SECRET</code> está ativo.
          </li>
          <li>
            <code>404</code> id não encontrado.
          </li>
          <li>
            <code>500</code> erro interno.
          </li>
        </ul>
      </section>
    </main>
  );
}
