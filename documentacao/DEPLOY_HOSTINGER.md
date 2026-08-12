# Deploy na Hostinger

## Preparacao

1. Ubuntu atualizado
2. Usuario administrativo com chave SSH
3. Firewall liberando apenas SSH, 80 e 443
4. Docker e Docker Compose instalados

## Comandos base

```bash
cp .env.example .env
docker compose -f docker-compose.yml -f docker-compose.producao.yml config
docker compose -f docker-compose.yml -f docker-compose.producao.yml up -d --build
```

## HTTPS fixo para Pluggy

Use `DOMINIO_APP`, `DOMINIO_API` e `API_EXTERNAL_URL` com mesmo host publico:

```env
DOMINIO_APP=meubolso.fsconnect.tech
DOMINIO_API=meubolso.fsconnect.tech
API_EXTERNAL_URL=https://meubolso.fsconnect.tech
EMAIL_LETSENCRYPT=seu-email@dominio.com
```

Gerar certificado:

```bash
docker compose up -d nginx
docker compose --profile tls run --rm certbot
docker compose up -d nginx
```

Webhook final Pluggy:

```text
https://meubolso.fsconnect.tech/api/pluggy/webhook
```

## Aviso

Nao alterar DNS ou bloquear root/SSH sem validar acesso alternativo.
