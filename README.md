# Meu Bolso

Projeto de controle financeiro pessoal com base legada local e fundacao de producao preparada para migracao incremental.

## O que existe hoje

- aplicativo React / Expo existente
- aplicacao web existente em `src/`
- regras de negocio de gastos, cartoes, categorias e parcelas
- integracao Pluggy de desenvolvimento

## O que foi adicionado agora

- backend Express em `backend/`
- migrations PostgreSQL em `banco/migrations/`
- RLS inicial em `banco/migrations/005_rls.sql`
- Docker Compose base e producao
- proxy reverso Nginx
- scripts operacionais
- workflow CI
- documentacao de arquitetura, seguranca, banco, deploy e backup

## Estrutura

```text
backend/
banco/
documentacao/
infraestrutura/
src/
App.tsx
docker-compose.yml
docker-compose.producao.yml
.env.example
```

## Execucao local atual

```bash
npm install
npm run dev
```

## Backend local

```bash
cd backend
npm install
npm run dev
```

## Docker

```bash
cp .env.example .env
docker compose -f docker-compose.yml config
docker compose up -d --build
```

## Testes executados nesta etapa

- nao executei testes de producao do backend porque dependencias novas ainda nao foram instaladas neste ambiente
- app atual continuou com validacoes locais existentes

## Proximos passos recomendados

1. instalar dependencias do backend
2. validar compose
3. migrar autenticacao local para Supabase Auth
4. migrar persistencia local para PostgreSQL/API
5. finalizar rotas financeiras reais no backend
