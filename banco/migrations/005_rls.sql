alter table public.usuarios enable row level security;
alter table public.perfis enable row level security;
alter table public.contas enable row level security;
alter table public.contas_bancarias enable row level security;
alter table public.cartoes enable row level security;
alter table public.categorias enable row level security;
alter table public.subcategorias enable row level security;
alter table public.transacoes enable row level security;
alter table public.parcelas enable row level security;
alter table public.faturas enable row level security;
alter table public.orcamentos enable row level security;
alter table public.metas_financeiras enable row level security;
alter table public.contas_a_pagar enable row level security;
alter table public.contas_a_receber enable row level security;
alter table public.assinaturas enable row level security;
alter table public.notificacoes enable row level security;
alter table public.anexos enable row level security;
alter table public.integracoes_bancarias enable row level security;
alter table public.conexoes_pluggy enable row level security;
alter table public.sincronizacoes enable row level security;
alter table public.configuracoes_usuario enable row level security;
alter table public.sessoes enable row level security;
alter table public.logs_auditoria enable row level security;

create or replace function public.auth_uid_safe()
returns uuid
language plpgsql
stable
as $$
declare
  valor uuid;
begin
  if to_regprocedure('auth.uid()') is null then
    return null;
  end if;

  execute 'select auth.uid()' into valor;
  return valor;
end;
$$;

create or replace function public.usuario_atual_id()
returns uuid
language sql
stable
as $$
  select id from public.usuarios where auth_user_id = public.auth_uid_safe() limit 1
$$;

drop policy if exists "usuarios_select_proprio" on public.usuarios;
create policy "usuarios_select_proprio" on public.usuarios
for select using (public.auth_uid_safe() = auth_user_id);

drop policy if exists "usuarios_update_proprio" on public.usuarios;
create policy "usuarios_update_proprio" on public.usuarios
for update using (public.auth_uid_safe() = auth_user_id);

drop policy if exists "usuarios_insert_proprio" on public.usuarios;
create policy "usuarios_insert_proprio" on public.usuarios
for insert with check (public.auth_uid_safe() = auth_user_id);

drop policy if exists "categorias_publicas_ou_proprias" on public.categorias;
create policy "categorias_publicas_ou_proprias" on public.categorias
for select using (usuario_id is null or usuario_id = public.usuario_atual_id());

drop policy if exists "categorias_criar_proprias" on public.categorias;
create policy "categorias_criar_proprias" on public.categorias
for insert with check (usuario_id = public.usuario_atual_id());

drop policy if exists "categorias_alterar_proprias" on public.categorias;
create policy "categorias_alterar_proprias" on public.categorias
for update using (usuario_id = public.usuario_atual_id());

drop policy if exists "categorias_excluir_proprias" on public.categorias;
create policy "categorias_excluir_proprias" on public.categorias
for delete using (usuario_id = public.usuario_atual_id());

drop policy if exists "perfil_proprio" on public.perfis;
create policy "perfil_proprio" on public.perfis
for all using (usuario_id = public.usuario_atual_id())
with check (usuario_id = public.usuario_atual_id());

drop policy if exists "contas_proprias" on public.contas;
create policy "contas_proprias" on public.contas
for all using (usuario_id = public.usuario_atual_id())
with check (usuario_id = public.usuario_atual_id());

drop policy if exists "contas_bancarias_proprias" on public.contas_bancarias;
create policy "contas_bancarias_proprias" on public.contas_bancarias
for all using (usuario_id = public.usuario_atual_id())
with check (usuario_id = public.usuario_atual_id());

drop policy if exists "cartoes_proprios" on public.cartoes;
create policy "cartoes_proprios" on public.cartoes
for all using (usuario_id = public.usuario_atual_id())
with check (usuario_id = public.usuario_atual_id());

drop policy if exists "subcategorias_proprias" on public.subcategorias;
create policy "subcategorias_proprias" on public.subcategorias
for all using (usuario_id = public.usuario_atual_id())
with check (usuario_id = public.usuario_atual_id());

drop policy if exists "transacoes_proprias" on public.transacoes;
create policy "transacoes_proprias" on public.transacoes
for all using (usuario_id = public.usuario_atual_id())
with check (usuario_id = public.usuario_atual_id());

drop policy if exists "parcelas_proprias" on public.parcelas;
create policy "parcelas_proprias" on public.parcelas
for all using (usuario_id = public.usuario_atual_id())
with check (usuario_id = public.usuario_atual_id());

drop policy if exists "faturas_proprias" on public.faturas;
create policy "faturas_proprias" on public.faturas
for all using (usuario_id = public.usuario_atual_id())
with check (usuario_id = public.usuario_atual_id());

drop policy if exists "orcamentos_proprios" on public.orcamentos;
create policy "orcamentos_proprios" on public.orcamentos
for all using (usuario_id = public.usuario_atual_id())
with check (usuario_id = public.usuario_atual_id());

drop policy if exists "metas_proprias" on public.metas_financeiras;
create policy "metas_proprias" on public.metas_financeiras
for all using (usuario_id = public.usuario_atual_id())
with check (usuario_id = public.usuario_atual_id());

drop policy if exists "contas_pagar_proprias" on public.contas_a_pagar;
create policy "contas_pagar_proprias" on public.contas_a_pagar
for all using (usuario_id = public.usuario_atual_id())
with check (usuario_id = public.usuario_atual_id());

drop policy if exists "contas_receber_proprias" on public.contas_a_receber;
create policy "contas_receber_proprias" on public.contas_a_receber
for all using (usuario_id = public.usuario_atual_id())
with check (usuario_id = public.usuario_atual_id());

drop policy if exists "assinaturas_proprias" on public.assinaturas;
create policy "assinaturas_proprias" on public.assinaturas
for all using (usuario_id = public.usuario_atual_id())
with check (usuario_id = public.usuario_atual_id());

drop policy if exists "notificacoes_proprias" on public.notificacoes;
create policy "notificacoes_proprias" on public.notificacoes
for all using (usuario_id = public.usuario_atual_id())
with check (usuario_id = public.usuario_atual_id());

drop policy if exists "anexos_proprios" on public.anexos;
create policy "anexos_proprios" on public.anexos
for all using (usuario_id = public.usuario_atual_id())
with check (usuario_id = public.usuario_atual_id());

drop policy if exists "integracoes_proprias" on public.integracoes_bancarias;
create policy "integracoes_proprias" on public.integracoes_bancarias
for all using (usuario_id = public.usuario_atual_id())
with check (usuario_id = public.usuario_atual_id());

drop policy if exists "pluggy_propria" on public.conexoes_pluggy;
create policy "pluggy_propria" on public.conexoes_pluggy
for all using (usuario_id = public.usuario_atual_id())
with check (usuario_id = public.usuario_atual_id());

drop policy if exists "sincronizacoes_proprias" on public.sincronizacoes;
create policy "sincronizacoes_proprias" on public.sincronizacoes
for all using (usuario_id = public.usuario_atual_id())
with check (usuario_id = public.usuario_atual_id());

drop policy if exists "configuracoes_usuario_proprias" on public.configuracoes_usuario;
create policy "configuracoes_usuario_proprias" on public.configuracoes_usuario
for all using (usuario_id = public.usuario_atual_id())
with check (usuario_id = public.usuario_atual_id());

drop policy if exists "sessoes_proprias" on public.sessoes;
create policy "sessoes_proprias" on public.sessoes
for all using (usuario_id = public.usuario_atual_id())
with check (usuario_id = public.usuario_atual_id());

drop policy if exists "logs_auditoria_proprios" on public.logs_auditoria;
create policy "logs_auditoria_proprios" on public.logs_auditoria
for select using (usuario_id = public.usuario_atual_id());
