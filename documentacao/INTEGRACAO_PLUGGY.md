# Integracao Pluggy

## Regras

- `PLUGGY_CLIENT_ID` e `PLUGGY_CLIENT_SECRET` existem apenas no backend
- Cliente nao deve receber segredo nem token de API
- Webhooks devem validar assinatura e idempotencia

## Estado atual

- App legado usa proxy local para desenvolvimento
- Backend novo ja reserva rotas seguras em `/api/pluggy`
- Tabelas `conexoes_pluggy`, `integracoes_bancarias` e `sincronizacoes` criadas
