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

1. **Confirme que é o app certo**  
   Este projeto é o **agendador** (API de agendamento com BullMQ), **não é n8n**. Se você criou o app como "n8n" ou a partir de um template n8n, crie um novo app usando o **Docker Compose** com o arquivo `docker-compose.easypanel.yml` deste repositório.

2. **Porta do container**  
   No EasyPanel, no serviço **app**, verifique:
   - **Container Port** ou **Application Port** = **3000**  
   O proxy do painel precisa encaminhar o tráfego para a porta 3000 do container.

3. **Domínio apontando para o serviço correto**  
   O domínio (ex.: `n8n-agendador.pkrrrs.easypanel.host`) deve estar associado ao serviço **app** do seu Compose (agendador), não a outro serviço ou template.

4. **Aguardar o healthcheck**  
   Após o deploy, espere o serviço ficar **Healthy** (cerca de 20–30 segundos). Só então o painel costuma liberar o tráfego. Se continuar "Unhealthy", veja os logs do container para erros na aplicação ou no Redis.

5. **Redeploy após as alterações**  
   Se você alterou o `Dockerfile` ou o `docker-compose.easypanel.yml` (por exemplo, healthcheck com `curl`), faça um **rebuild e redeploy** no EasyPanel para aplicar as mudanças.
