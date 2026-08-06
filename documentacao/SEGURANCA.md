# Seguranca

## Medidas implementadas nesta etapa

- Backend Express isolado do app cliente
- Validacao central de ambiente com Zod
- CORS restrito por `.env`
- `helmet`, `compression` e rate limit
- Middleware global de erros
- Autenticacao backend pensada para validar token do Supabase
- Pluggy mantida apenas no backend
- Variaveis sensiveis movidas para `.env`
- RLS preparada em migrations SQL

## Riscos ainda existentes

- App atual ainda possui fluxo legado local em `App.tsx`
- Senha local do fluxo antigo ainda existe e deve ser removida na migracao de auth
- Supabase self-hosted precisa validacao manual antes de producao
