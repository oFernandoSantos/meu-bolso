create table if not exists public.snapshots_usuario (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null unique references public.usuarios(id),
  schema_version integer not null default 1,
  database_json jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz
);

create index if not exists idx_snapshots_usuario_usuario_id
  on public.snapshots_usuario(usuario_id);
