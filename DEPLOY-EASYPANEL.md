# Deploy no EasyPanel

O projeto está pronto para rodar no **EasyPanel** com **dois serviços**: **API** (`app`) e **painel Next.js** (`web`).

## O que já está pronto no projeto

- **Dockerfile** – build da API Node.js (BullMQ + Express)
- **Dockerfile.frontend** – build do Next.js (`output: standalone`)
- **docker-compose.easypanel.yml** – `app` + `web` + Redis + cron opcional
- **Proxy no Next** – o navegador chama `/agendamentos` no mesmo domínio do painel; o Next encaminha para `http://app:3000` na rede Docker (sem precisar de `NEXT_PUBLIC_API_BASE_URL` externo nesse modo)
- **Healthchecks** – API em `/health`; painel em `/login`
- **Cron** – continua chamando `http://app:3000/api/cron-process-jobs` dentro da rede

## Arquitetura (resumo)

| Serviço | Função | Porta no host (padrão) |
|---------|--------|-------------------------|
| **web** | Interface (`/`, `/login`, `/docs`) e reverse proxy de `/agendamentos` → API | **3000** (use este no domínio público) |
| **app** | API REST, worker, cron HTTP | só rede interna (`expose: 3000`); opcional publicar `3002:3000` |
| **redis** | Fila BullMQ | interno |
| **cron** | Reforço opcional ao worker | interno |

## Passo a passo no EasyPanel

1. **Crie um app Docker Compose** e use o arquivo **`docker-compose.easypanel.yml`** (Git ou colando o conteúdo).

2. **Domínio e porta (importante)**  
   - Associe o domínio público ao serviço **`web`**, porta **3000**.  
   - É assim que você acessa o **login**: `https://seu-dominio.com/login`.  
   - O serviço **`app`** não precisa de domínio se você só usar o painel e integrações pela mesma URL (`https://seu-dominio.com/agendamentos`).

3. **Credenciais do painel**  
   No serviço **`web`**, defina (ou use os padrões do compose):

   - `LOGIN_USERNAME`
   - `LOGIN_PASSWORD`  

   Em produção, use valores fortes e, se o painel permitir, armazene como **secret**.

4. **Cron com segredo (recomendado)**  
   Defina `CRON_SECRET` no compose / variáveis do projeto. O endpoint da API só aceita o header `x-cron-secret` (ou query `secret`) igual a esse valor.

5. **Deploy**  
   Faça build/redeploy de **todos** os serviços após mudanças no `Dockerfile`, `Dockerfile.frontend` ou no compose.

## API só para integrações (opcional)

Se você quiser uma URL **direta** só para a API (ex.: n8n em outro host), descomente no compose, no serviço **`app`**:

```yaml
ports:
  - "3002:3000"
```

Atribua outro domínio ou porta no EasyPanel para esse mapeamento. Nesse caso configure **`CORS_ORIGIN`** na **`app`** com a origem do front ou da ferramenta que chama a API.

## Rebuild do front após mudar a URL da API interna

O destino do rewrite (`API_INTERNAL_URL`, padrão `http://app:3000`) é definido no **build** da imagem `web`. Se você renomear o serviço da API no compose, ajuste o `build.args` do **`web`** e faça **rebuild** da imagem do front.

## Resumo

| Item | Status |
|------|--------|
| Dockerfile (API) | Pronto |
| Dockerfile.frontend | Pronto |
| Compose (app + web + redis + cron) | Pronto |
| Login em produção | `https://seu-dominio` → serviço **web** → `/login` |
| Chamadas REST pelo mesmo domínio | `POST/GET https://seu-dominio/agendamentos` (via rewrite) |

---

## "Service is not reachable" no navegador

1. **Domínio no serviço certo** – para ver o painel e o login, o domínio deve apontar para **`web`**, porta **3000**, não só para `app`.
2. **Aguarde Healthy** – o `web` depende do healthcheck da `app`; o primeiro deploy pode levar ~1–2 minutos até os dois ficarem verdes.
3. **Logs** – `agendador-web` e `agendador-app` no EasyPanel.

---

## Erro 502 (Bad Gateway)

1. Logs do container **`app`** (Redis, crash na API).  
2. Redis **Healthy**.  
3. Se só o `web` falhar, confira build do Next e healthcheck em `/login`.
