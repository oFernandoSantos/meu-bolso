# Banco de Dados

## Stack alvo

- PostgreSQL 16
- Supabase self-hosted
- RLS em tabelas com dados de usuario

## Migracoes criadas

- `001_extensoes.sql`
- `002_tabelas_principais.sql`
- `003_indices.sql`
- `004_categorias_iniciais.sql`
- `005_rls.sql`

## Observacoes

- Valores financeiros usam `numeric(18,2)`
- IDs usam UUID
- Tabelas suportam exclusao logica via `excluido_em`
