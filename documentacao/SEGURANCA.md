# Seguranca

## Medidas implementadas nesta etapa

- Backend Express isolado do app cliente
- Validacao central de ambiente com Zod
- CORS restrito por `.env`
- `helmet`, `compression` e rate limit
- Middleware global de erros
- Autenticacao backend validando token do Supabase
- Endpoints dedicados de login, cadastro, refresh e logout global
- Integracao Pluggy vinculada ao usuario autenticado, sem confiar em `X-User-Email`
- Pluggy mantida apenas no backend
- Variaveis sensiveis movidas para `.env`
- RLS preparada em migrations SQL
- Senha do usuario nao deve mais ser persistida no banco local do app

## Riscos ainda existentes

- App atual ainda possui fluxo legado local em `App.tsx`
- Supabase self-hosted precisa validacao manual antes de producao
- Persistencia principal de gastos ainda e local por dispositivo; login sincroniza identidade, nao todos dados financeiros
