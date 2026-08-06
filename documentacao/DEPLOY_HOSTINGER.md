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

## Aviso

Nao alterar DNS ou bloquear root/SSH sem validar acesso alternativo.
