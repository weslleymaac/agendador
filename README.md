# API de Agendamento (BullMQ)

API REST para agendar disparos de webhook em uma data e hora definidas. Utiliza Node.js, Express, BullMQ e Redis.

> Fora da Vercel (ex.: EasyPanel), o worker do BullMQ roda continuamente junto da API.  
> Isso elimina a dependência de cron para processar os agendamentos no horário.

## Pré-requisitos

- **Node.js** 18+
- **Redis** em execução (local ou via `REDIS_URL`)

## Redis

### Local (Docker)

O projeto inclui `docker-compose.yml` para subir o Redis com um comando:

```bash
docker compose up -d redis
```

Ou use os scripts npm:

```bash
npm run redis:up    # sobe o Redis em segundo plano
npm run redis:logs  # acompanha os logs (Ctrl+C para sair)
npm run redis:down  # para e remove o container
```

O Redis fica em `localhost:6379`. No `.env` use:

```env
REDIS_URL=redis://localhost:6379
```

### Produção (Vercel) — Upstash Redis

Para o deploy na Vercel, use um Redis gerenciado compatível com serverless. A opção recomendada é o **Upstash Redis** (plano gratuito, integração simples):

1. Acesse [upstash.com](https://upstash.com) e crie uma conta (ou faça login).
2. No dashboard, clique em **Create Database**.
3. Escolha **Regional** (ou Global se quiser baixa latência em várias regiões), selecione a região mais próxima (ex.: `sa-east-1` para São Paulo) e clique em **Create**.
4. Na página do banco, em **REST API** ou **Connect**, copie a **URL** no formato:
   - `rediss://default:SUA_SENHA@seu-endpoint.upstash.io:6379`  
   Ou use a **connection string** que já vem pronta.
5. No projeto na **Vercel** → **Settings** → **Environment Variables**, crie:
   - **Name:** `REDIS_URL`
   - **Value:** a URL copiada do Upstash (ex.: `rediss://default:xxx@xxx.upstash.io:6379`)
   - **Name:** `APP_TIMEZONE_OFFSET` — **Value:** `-3` (para que data/hora sejam em Brasília, UTC-3)
   - Marque os ambientes (Production, Preview, Development) e salve.

O BullMQ e o ioredis funcionam com essa URL. Faça um novo deploy para aplicar a variável.

**Observação:** se o Upstash mostrar apenas uma URL no formato REST (`https://...`), use a aba **Redis Connect** ou **TCP** para obter a URL no formato `rediss://...` — o ioredis usa conexão TCP.

### Subir o Redis com Docker (alternativa ao docker-compose)

```bash
docker run -d -p 6379:6379 --name redis redis:alpine
```

## Instalação

```bash
npm install
cp .env.example .env
# Ajuste .env se necessário (REDIS_URL, PORT)
```

## Execução

```bash
npm start
# ou em desenvolvimento com reload
npm run dev
```

A API sobe em `http://localhost:3000` (ou na porta definida em `PORT`).

**Interface web:** Abra `http://localhost:3000` no navegador para usar a tela de gestão (listar, filtrar, criar, editar e cancelar agendamentos).

## Deploy

**Recomendado: EasyPanel.** No EasyPanel o worker BullMQ roda 24/7 no mesmo processo da API; os jobs são executados no horário exato, sem limite de cron. Na Vercel não há processo contínuo: é preciso usar o Cron da plataforma (plano Hobby: 1x por dia; Pro: a cada minuto).

### Deploy no EasyPanel

O projeto já está preparado para EasyPanel com container Docker.

### Opção 1 (recomendada): Docker Compose no EasyPanel

Use o arquivo `docker-compose.easypanel.yml` deste repositório.

Ele sobe:
- `app` (API + frontend + worker BullMQ em processo contínuo)
- `cron` (chama `/api/cron-process-jobs` a cada minuto, como reforço; protegido por `CRON_SECRET`)
- `redis` (fila/persistência dos jobs)

Variáveis padrão no compose:
- `PORT=3000`
- `REDIS_URL=redis://redis:6379`
- `APP_TIMEZONE_OFFSET=-3`
- `CRON_SECRET` (opcional; se definido no painel, protege o endpoint `/api/cron-process-jobs` — o cron envia o mesmo valor)

Se precisar liberar CORS para um domínio específico, adicione também:
- `CORS_ORIGIN=https://seu-dominio.com`

### Opção 2: App Docker + Redis separado no EasyPanel

Se você preferir criar o Redis como serviço separado no painel:

1. Crie um app Docker apontando para este repositório (`Dockerfile` na raiz).
2. Configure no app as variáveis:
   - `PORT=3000`
   - `REDIS_URL=redis://<host-do-redis>:6379`
   - `APP_TIMEZONE_OFFSET=-3`
   - `CORS_ORIGIN` (opcional)
3. Exponha a porta `3000`.

### Healthcheck no EasyPanel

Use:

```bash
GET /health
```

Resposta esperada:

```json
{"status":"ok"}
```

## Endpoints

Base URL: `/agendamentos`

| Método   | Rota            | Descrição                          |
|----------|-----------------|------------------------------------|
| POST     | /agendamentos   | Cria um agendamento                |
| GET      | /agendamentos   | Lista agendamentos                 |
| GET      | /agendamentos/:id | Retorna um agendamento por id    |
| PUT      | /agendamentos/:id | Atualiza um agendamento          |
| DELETE   | /agendamentos/:id | Remove um agendamento           |

### Criar agendamento (POST /agendamentos)

**Body (JSON):**

- `data` (string): data no formato `YYYY-MM-DD`
- `hora` (string): hora no formato `HH:mm` ou `HH:mm:ss`
- `webhookUrl` (string): URL do webhook (apenas HTTP/HTTPS; URLs internas como localhost são bloqueadas por segurança)
- `dados` (objeto, opcional): payload que será enviado no POST ao disparar o webhook

**Exemplo de request:**

```bash
curl -X POST http://localhost:3000/agendamentos \
  -H "Content-Type: application/json" \
  -d '{
    "data": "2025-12-31",
    "hora": "14:30:00",
    "webhookUrl": "https://webhook.site/seu-uuid",
    "dados": { "mensagem": "Agendado com sucesso" }
  }'
```

**Exemplo de response (201):**

```json
{
  "id": "uuid-do-agendamento",
  "data": "2025-12-31",
  "hora": "14:30:00",
  "webhookUrl": "https://webhook.site/seu-uuid",
  "dados": { "mensagem": "Agendado com sucesso" },
  "agendadoPara": "2025-12-31T14:30:00.000Z",
  "status": "Agendado"
}
```

### Listar agendamentos (GET /agendamentos)

**Status em português:** `Agendado`, `Executado`, `Falhou`, `Cancelado`.

- **Sem filtro:** retorna todos os agendamentos (todos os status).
- **Query params:**
  - `status`: filtra por um status (`Agendado`, `Executado`, `Cancelado`, `Falhou`).
  - `data`: filtra por data no formato `YYYY-MM-DD`.
  - `id`: filtra por id (contém o texto informado).

Exemplos:

```bash
curl http://localhost:3000/agendamentos
curl "http://localhost:3000/agendamentos?status=Executado"
curl "http://localhost:3000/agendamentos?status=Agendado&data=2026-03-10"
curl "http://localhost:3000/agendamentos?id=abc-123"
```

### Buscar por id (GET /agendamentos/:id)

```bash
curl http://localhost:3000/agendamentos/SEU_JOB_ID
```

### Atualizar (PUT /agendamentos/:id)

Body igual ao do POST. O agendamento antigo é removido e um novo é criado com o mesmo `id`.

```bash
curl -X PUT http://localhost:3000/agendamentos/SEU_JOB_ID \
  -H "Content-Type: application/json" \
  -d '{
    "data": "2026-01-15",
    "hora": "10:00",
    "webhookUrl": "https://webhook.site/outro-uuid",
    "dados": { "atualizado": true }
  }'
```

### Remover (DELETE /agendamentos/:id)

Cancela o agendamento (ele passa a aparecer com status `Cancelado` na listagem). Retorna 204 sem body.

```bash
curl -X DELETE http://localhost:3000/agendamentos/SEU_JOB_ID
```

## Segurança

- **Rate limit:** 100 requisições por minuto por IP.
- **CORS:** configurável via `CORS_ORIGIN` no `.env`.
- **Webhook URL:** apenas HTTP/HTTPS; bloqueio de localhost e IPs privados (mitigação SSRF).
- **Validação:** corpo das requisições validado (data, hora, URL, dados). Data/hora devem ser futuras.

## Health check

```bash
curl http://localhost:3000/health
# {"status":"ok"}
```

## Variáveis de ambiente

Consulte `.env.example`. Principais: `PORT`, `REDIS_URL` (ou `REDIS_HOST` e `REDIS_PORT`), `APP_TIMEZONE_OFFSET` (fuso para data/hora, padrão -3 = Brasília), `CORS_ORIGIN`.

## Deploy no Vercel (alternativa)

O projeto também pode rodar na Vercel como serverless:

- **API e frontend:** todas as rotas (`/`, `/agendamentos`, `/health`, arquivos estáticos) são tratadas pela mesma função em `api/index.js`.
- **Fuso horário:** defina **`APP_TIMEZONE_OFFSET=-3`** nas variáveis de ambiente do projeto na Vercel para que a data e a hora do agendamento sejam interpretadas em **Brasília (UTC-3)**. Sem isso, o horário pode ficar incorreto.
- **Cron (processar agendamentos no horário):** o `vercel.json` inclui um Cron que chama `/api/cron-process-jobs` **a cada 1 minuto** (`* * * * *`). Isso exige **plano Pro** na Vercel; no plano **Hobby** o cron só pode rodar **uma vez por dia**. Se você estiver no Hobby e o deploy falhar por causa do cron, altere no `vercel.json` o `schedule` para `"0 0 * * *"` (meia-noite UTC). Quando o cron roda, processa todos os agendamentos cujo horário já passou.

Configure no Vercel: `REDIS_URL`, `APP_TIMEZONE_OFFSET=-3`, `CORS_ORIGIN` (se necessário). Após o deploy, acesse a URL do projeto (ex.: `https://seu-projeto.vercel.app`) para a interface e `/agendamentos` para a API.
