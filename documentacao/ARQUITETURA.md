# Arquitetura Atual e Direcao de Producao

## Visao geral

Projeto atual e um aplicativo de controle financeiro com duas camadas convivendo no mesmo repositorio:

1. `App.tsx`
   Fluxo React Native / Expo com armazenamento local e integracao Pluggy via proxy local.

2. `src/`
   Aplicacao web com TanStack Router, componentes React, armazenamento local em navegador e estrutura de rotas para gastos, cartoes e categorias.

## Tecnologias identificadas

- React 19
- Expo 57
- TypeScript
- React Native Web
- TanStack Router / React Start
- Zustand
- React Hook Form
- Zod
- Vitest
- Vite
- Node.js apenas para proxy Pluggy local (`scripts/pluggy-proxy.mjs`)

## O que ja funciona e deve ser reaproveitado

- Dominio funcional do app financeiro
- Estruturas de dados para cartoes, categorias, gastos e parcelas
- Regras de parcelamento e agregacoes mensais
- Validacao com Zod em componentes web
- Exportacao de dados
- Integracao inicial com Pluggy via backend local
- Rotas web organizadas para CRUD de gastos, cartoes e categorias

## Principais gaps em relacao ao alvo de producao

### Persistencia

- Hoje dados locais usam `window.localStorage`
- Nao existe PostgreSQL de producao
- Nao existe migracao SQL versionada
- Nao existe RLS

### Autenticacao

- `App.tsx` ainda guarda email e senha em texto puro no estado/config local
- Nao existe Supabase Auth integrado
- Nao existe login Google
- Nao existe refresh token seguro nem revogacao

### Backend

- Nao existe backend Express estruturado
- Proxy Pluggy atual e util para desenvolvimento, mas nao e backend de producao
- Nao existem middlewares de seguranca, rate limit, logs estruturados ou padronizacao de API

### Infraestrutura

- Nao existe `docker-compose.yml` de producao
- Nao existe proxy reverso configurado
- Nao existe estrategia de HTTPS, backup, health check ou CI/CD

## Riscos atuais

- Senha local em texto puro
- Persistencia local para dados que deveriam ir ao servidor
- Integracao Pluggy dependente de proxy manual
- Falta de separacao entre app, backend e infraestrutura
- Falta de controle de acesso entre usuarios

## Estrategia recomendada

### Etapa 1

- Congelar regras de negocio existentes
- Padronizar variaveis de ambiente
- Documentar arquitetura atual

### Etapa 2

- Criar backend separado em `backend/`
- Criar banco e migracoes em `banco/`
- Introduzir API segura e `/health`

### Etapa 3

- Migrar autenticacao para Supabase Auth
- Remover senha local em texto puro
- Migrar dados financeiros para PostgreSQL

### Etapa 4

- Adicionar Docker Compose de producao
- Adicionar Nginx/Traefik
- Adicionar backup e monitoramento

## Decisao importante

Como o repositorio hoje mistura app local e app web, a migracao para producao deve ser incremental.

Nao recomendacao:

- apagar `App.tsx`
- mover pastas existentes sem plano
- quebrar telas atuais para reescrever tudo

Recomendacao:

- manter interface atual funcionando
- introduzir backend e banco ao lado
- trocar armazenamento local por API/banco em fases
