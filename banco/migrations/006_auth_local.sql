alter table public.usuarios
  add column if not exists password_hash varchar(255),
  add column if not exists password_atualizada_em timestamptz;

create index if not exists idx_sessoes_usuario_id on public.sessoes(usuario_id);
