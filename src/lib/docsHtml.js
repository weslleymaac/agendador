/**
 * Página HTML estática da documentação (API sem frontend Next — ex.: EasyPanel).
 * Base pública detectada via proxy (X-Forwarded-*).
 */
export function getPublicBaseUrl(req) {
  const proto = (req.get('x-forwarded-proto') || req.protocol || 'https').split(',')[0].trim();
  const host = (req.get('x-forwarded-host') || req.get('host') || 'localhost:3000').split(',')[0].trim();
  return `${proto}://${host}`;
}

export function renderDocsHtml(req) {
  const apiBase = getPublicBaseUrl(req);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Documentação da API — Agendador</title>
  <style>
    :root { --border:#e2e8f0; --muted:#64748b; --surface:#fff; --radius:12px; }
    body { font-family: system-ui, sans-serif; margin:0; background:#f8fafc; color:#0f172a; line-height:1.5; }
    main { max-width:900px; margin:0 auto; padding:20px; display:grid; gap:16px; }
    header { display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:12px; }
    h1 { font-size:1.75rem; margin:0; }
    h2 { font-size:1.15rem; margin:0 0 8px; }
    section { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); padding:16px; }
    code { background:#f1f5f9; padding:2px 6px; border-radius:6px; font-size:0.9em; }
    pre { background:#f8fafc; border:1px solid var(--border); border-radius:10px; padding:12px; overflow:auto; font-size:13px; margin:0; }
    ul { margin:0; padding-left:18px; display:grid; gap:6px; }
    .muted { color:var(--muted); }
    a.btn { border:1px solid var(--border); border-radius:10px; padding:10px 12px; background:#fff; text-decoration:none; color:inherit; }
    a.btn:hover { background:#f1f5f9; }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>Documentação da API</h1>
        <p class="muted">Endpoint principal: <code>${escapeHtml(apiBase)}</code></p>
      </div>
      <a class="btn" href="/">Início da API</a>
    </header>

    <section>
      <h2>Resumo dos endpoints</h2>
      <ul>
        <li><code>GET /health</code> — status do serviço.</li>
        <li><code>POST /agendamentos</code> — cria agendamento.</li>
        <li><code>GET /agendamentos</code> — lista agendamentos.</li>
        <li><code>GET /agendamentos/:id</code> — busca por id.</li>
        <li><code>PUT /agendamentos/:id</code> — atualiza agendamento.</li>
        <li><code>DELETE /agendamentos/:id</code> — remove o agendamento por completo (não apenas marca como cancelado).</li>
        <li><code>GET /api/cron-process-jobs</code> — processamento via cron.</li>
      </ul>
    </section>

    <section>
      <h2>Criar agendamento</h2>
      <pre>curl -X POST ${apiBase}/agendamentos \\
  -H "Content-Type: application/json" \\
  -d '{
    "data": "2026-12-31",
    "hora": "14:30",
    "webhookUrl": "https://webhook.site/seu-id",
    "tag": "grupo-marketing",
    "dados": { "origem": "dashboard" }
  }'</pre>
      <p>Campos obrigatórios: <code>data</code>, <code>hora</code>, <code>webhookUrl</code>.
      <code>dados</code> e <code>tag</code> são opcionais; <code>tag</code> agrupa agendamentos (texto, máx. 200 caracteres).</p>
    </section>

    <section>
      <h2>Listagem e filtros</h2>
      <pre>curl ${apiBase}/agendamentos
curl "${apiBase}/agendamentos?status=Executado"
curl "${apiBase}/agendamentos?status=Agendado&status=Executado"
curl "${apiBase}/agendamentos?status=Agendado,Executado"
curl "${apiBase}/agendamentos?data=2026-03-24"
curl "${apiBase}/agendamentos?id=parte-do-id"</pre>
      <p>Filtro <code>status</code>: um ou mais valores (Agendado, Executado, Falhou, Cancelado) — repita o parâmetro ou use lista separada por vírgula.</p>
    </section>

    <section>
      <h2>Erros comuns</h2>
      <ul>
        <li><code>400</code> — validação falhou (data/hora/formato/URL inválidos).</li>
        <li><code>401</code> — cron sem segredo correto quando <code>CRON_SECRET</code> está ativo.</li>
        <li><code>404</code> — id não encontrado.</li>
        <li><code>500</code> — erro interno.</li>
      </ul>
    </section>
  </main>
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
