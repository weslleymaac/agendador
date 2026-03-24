# Deploy no EasyPanel

O **`Dockerfile` na raiz** gera **uma única imagem** com **API (Express + BullMQ) e painel Next.js**:

- **Porta pública 3000** → Express.
- **Next** escuta só em **127.0.0.1:3001** (não exposto fora do container).
- Com **`PROXY_NEXT_DEV`**, o Express encaminha `/`, `/login`, assets e rotas do Next; rotas da API (`/health`, `/agendamentos`, etc.) continuam no Express.

Assim, no EasyPanel basta **um app** com **build por Dockerfile** e domínio na **porta 3000**.

## Variáveis úteis

| Variável | Onde | Descrição |
|----------|------|-----------|
| `REDIS_URL` | `app` | Ex.: `redis://redis:6379` no compose interno |
| `APP_TIMEZONE_OFFSET` | `app` | Fuso (ex.: `-3`) |
| `CRON_SECRET` | `app` + `cron` | Protege `/api/cron-process-jobs` |
| `LOGIN_USERNAME` / `LOGIN_PASSWORD` | `app` | Login do painel (Next lê do ambiente) |

**Não** use `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000` no container: o browser interpretaria `localhost` como a máquina do usuário. Deixe **vazio** ou omita (o build já usa base vazia = mesma origem).

## Docker Compose (opcional)

O arquivo **`docker-compose.easypanel.yml`** sobe **`app`** (imagem unificada) + **Redis** + **cron**. Associe o domínio ao serviço **`app`**, porta **3000**.

## `Dockerfile.frontend` (opcional)

Serve apenas para **deploy separado** do front (outro serviço). O fluxo recomendado no EasyPanel com **um único Dockerfile** é só o **`Dockerfile` da raiz**.

## Healthcheck

Use **`GET /health`** na porta **3000** (Express). O primeiro deploy pode precisar de **~1–2 min** (`start_period` alto) porque o Next sobe antes da API.

## Erro 502 ou timeout

1. Logs do container: Next não subiu, Redis inacessível ou crash na API.  
2. Aumente `start_period` / timeout do healthcheck se o build for lento no servidor.
