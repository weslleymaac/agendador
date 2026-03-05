# Deploy no EasyPanel

O projeto está pronto para rodar no **EasyPanel**. Resumo do que já existe e o que fazer no painel.

## O que já está pronto no projeto

- **Dockerfile** – build da API Node.js
- **docker-compose.easypanel.yml** – app + Redis com healthcheck
- **Variáveis de ambiente** – PORT, REDIS_URL, APP_TIMEZONE_OFFSET (e opcional CORS_ORIGIN)
- **Bind em 0.0.0.0** – app escuta em todas as interfaces (necessário em container)
- **Healthcheck** – GET `/health` para o painel marcar o serviço como saudável

## Passo a passo no EasyPanel

1. **Acesse o EasyPanel** no seu servidor (ex.: `https://painel.seudominio.com`).

2. **Criar novo Compose / Stack**
   - Em **Apps** (ou **Compose**), crie um novo **Docker Compose**.
   - Nome sugerido: `agendador`.

3. **Usar o compose do projeto**
   - Opção A: **Import from GitHub** – conecte o repositório e escolha o arquivo **`docker-compose.easypanel.yml`** como compose file (se o EasyPanel permitir escolher o arquivo).
   - Opção B: **Colar o conteúdo** – copie todo o conteúdo de `docker-compose.easypanel.yml` e cole no editor do EasyPanel.

4. **Variáveis de ambiente (opcional)**
   - No serviço **app**, você pode sobrescrever ou adicionar:
     - `CORS_ORIGIN` = `https://seu-dominio.com` (se o front chamar a API de outro domínio)
     - Mantenha `REDIS_URL=redis://redis:6379` (já está no compose).

5. **Domínio e porta**
   - Atribua um **domínio** ao serviço **app** (ex.: `agendador.seudominio.com`) ou use o IP + porta **3000**.
   - Habilite **HTTPS** no EasyPanel se disponível (certificado automático).

6. **Deploy**
   - Clique em **Deploy** / **Start**. O EasyPanel vai:
     - Subir o Redis primeiro (com healthcheck).
     - Depois buildar e subir o container da API (com healthcheck em `/health`).

## O que NÃO falta

- Não é necessário criar Redis manualmente: o compose já inclui o serviço `redis`.
- Não precisa de `.env` no servidor: as variáveis usadas em produção estão no `docker-compose.easypanel.yml` (e você pode ajustar no painel).
- O worker do BullMQ roda no mesmo processo da API, então não há serviço extra para agendar.
- **Cron não é obrigatório:** o worker já processa os jobs no momento exato (o BullMQ dispara quando o delay expira). Se quiser um reforço, o compose pode incluir um serviço `cron` que chama `/api/cron-process-jobs` a cada minuto (veja abaixo).

## Cron opcional (reforço a cada minuto)

O worker sozinho já executa os jobs no horário certo. Se você quiser um **cron a cada minuto** como fallback (por exemplo, para promover jobs atrasados), o `docker-compose.easypanel.yml` pode incluir um serviço `cron` que chama o endpoint `/api/cron-process-jobs`.

Nesse caso, defina a variável **`CRON_SECRET`** (valor secreto qualquer) no compose e no painel. O endpoint só processa a requisição se o header `x-cron-secret` ou o query `secret` bater com `CRON_SECRET`; assim apenas o serviço cron interno consegue chamar o endpoint. Se `CRON_SECRET` não estiver definido, o endpoint continua aberto (comportamento compatível com a Vercel).

## Resumo

| Item                    | Status        |
|-------------------------|---------------|
| Dockerfile              | Pronto        |
| Docker Compose (app+redis) | Pronto    |
| Listen 0.0.0.0          | Pronto        |
| Healthcheck             | Pronto        |
| Variáveis no compose    | Pronto        |
| CORS (opcional)         | Definir no painel se precisar |

Depois do deploy, acesse `https://seu-dominio.com` para a interface e `https://seu-dominio.com/agendamentos` para a API.

---

## "Service is not reachable" no navegador

Se a API sobe nos logs (`API rodando em http://0.0.0.0:3000`) mas ao abrir a página aparece **"Service is not reachable"**:

1. **Vincule o domínio ao serviço correto**  
   No EasyPanel, em **Domains** (ou configuração de domínio do app), confira que o domínio (ex.: `n8n-agenda.pkrrrs.easypanel.host`) está vinculado ao serviço **`app`** — e **não** ao cron, ao redis ou a outro template (ex.: n8n). O tráfego HTTP deve ir para o serviço **app**.

2. **Porta 3000**  
   Para o serviço **app**, a porta deve ser **3000**. No painel, onde você configura o domínio ou o proxy, defina **porta do container / application port = 3000**.

3. **Aguarde o status Healthy**  
   Após o deploy, o serviço **app** pode levar até ~1 minuto para ficar **Healthy** (o healthcheck espera até 45s para o app subir). Enquanto estiver "Unhealthy", o EasyPanel pode não encaminhar tráfego. Espere o ícone verde/Healthy antes de acessar a URL.

4. **Confira os logs do container `app`**  
   Se continuar inacessível, abra os **logs** do container **agendador-app** no EasyPanel. Erros comuns:
   - **Redis connection refused** — o Redis ainda não estava pronto; o compose já usa `depends_on` com healthcheck, então um redeploy costuma resolver.
   - **EADDRINUSE** ou erro de porta — improvável com a configuração atual.
   - Qualquer stack trace — envie o trecho para depuração.

5. **Este projeto é o agendador, não n8n**  
   Se você criou o app a partir de um template "n8n", crie um **novo** app do tipo **Docker Compose** e use apenas o arquivo `docker-compose.easypanel.yml` deste repositório (agendador). O domínio deve apontar para esse compose e para o serviço **app**.

6. **Redeploy após alterações**  
   Se alterou o `Dockerfile` ou o `docker-compose.easypanel.yml`, faça **rebuild e redeploy** no EasyPanel para aplicar as mudanças.

---

## Erro 502 (Bad Gateway)

Se o navegador ou a API retornam **502**:

1. **Veja os logs do container `app`** no EasyPanel. O projeto registra `uncaughtException` e `unhandledRejection` no console; a mensagem que aparecer ali costuma ser a causa (ex.: Redis inacessível, arquivo não encontrado, erro de código).
2. **Redis:** confira se o serviço **redis** está **Healthy**. Se o app subir antes do Redis, as primeiras requisições podem falhar; um **Redeploy** do Compose costuma resolver.
3. **Timeout do proxy:** em alguns painéis o proxy encerra a requisição após poucos segundos. Se a primeira resposta do app demorar (ex.: muitos jobs na listagem), pode dar 502. Se os logs do app mostrarem resposta 200 mas o browser 502, aumente o timeout no EasyPanel se houver opção.
4. Depois de corrigir a causa, faça **Redeploy** do Compose.
