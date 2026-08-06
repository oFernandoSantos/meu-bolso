create table if not exists public.usuarios (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email varchar(255) not null unique,
  status varchar(30) not null default 'ativo',
  ultimo_login_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz
);

create table if not exists public.perfis (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id),
  nome varchar(120) not null,
  avatar_url text,
  fuso_horario varchar(60) default 'America/Sao_Paulo',
  moeda varchar(10) not null default 'BRL',
  idioma varchar(10) not null default 'pt-BR',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz
);

create table if not exists public.contas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id),
  nome varchar(120) not null,
  tipo varchar(30) not null,
  saldo_inicial numeric(18,2) not null default 0,
  saldo_atual numeric(18,2) not null default 0,
  instituicao varchar(120),
  cor varchar(20),
  ativa boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz
);

create table if not exists public.contas_bancarias (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id),
  conta_id uuid not null references public.contas(id),
  banco varchar(120) not null,
  agencia varchar(20),
  numero_conta varchar(50),
  tipo_conta varchar(30),
  identificador_externo varchar(255),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz
);

create table if not exists public.cartoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id),
  conta_id uuid references public.contas(id),
  nome varchar(120) not null,
  bandeira varchar(30),
  tipo varchar(30) not null,
  ultimos_quatro_digitos varchar(4),
  limite_total numeric(18,2) default 0,
  dia_fechamento smallint,
  dia_vencimento smallint,
  cor varchar(20),
  ativo boolean not null default true,
  identificador_externo varchar(255),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz
);

create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.usuarios(id),
  nome varchar(120) not null,
  icone varchar(80),
  cor varchar(20),
  tipo varchar(20) not null default 'despesa',
  sistema boolean not null default false,
  ativa boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz
);

create table if not exists public.subcategorias (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id),
  categoria_id uuid not null references public.categorias(id),
  nome varchar(120) not null,
  ativa boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz
);

create table if not exists public.transacoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id),
  conta_id uuid references public.contas(id),
  cartao_id uuid references public.cartoes(id),
  categoria_id uuid references public.categorias(id),
  subcategoria_id uuid references public.subcategorias(id),
  descricao varchar(255) not null,
  valor numeric(18,2) not null,
  tipo varchar(20) not null,
  forma_pagamento varchar(30) not null,
  data_transacao date not null,
  data_competencia date,
  status varchar(30) not null default 'confirmada',
  observacoes text,
  identificador_externo varchar(255),
  idempotencia_chave varchar(255),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz
);

create table if not exists public.parcelas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id),
  transacao_id uuid not null references public.transacoes(id),
  numero_parcela integer not null,
  total_parcelas integer not null,
  valor numeric(18,2) not null,
  competencia_mes varchar(7) not null,
  status varchar(30) not null default 'aberta',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz
);

create table if not exists public.faturas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id),
  cartao_id uuid not null references public.cartoes(id),
  referencia_mes varchar(7) not null,
  valor_total numeric(18,2) not null default 0,
  vencimento_em date,
  fechamento_em date,
  status varchar(30) not null default 'aberta',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz
);

create table if not exists public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id),
  categoria_id uuid references public.categorias(id),
  referencia_mes varchar(7) not null,
  valor_planejado numeric(18,2) not null,
  valor_utilizado numeric(18,2) not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz
);

create table if not exists public.metas_financeiras (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id),
  nome varchar(120) not null,
  descricao text,
  valor_objetivo numeric(18,2) not null,
  valor_atual numeric(18,2) not null default 0,
  data_limite date,
  status varchar(30) not null default 'ativa',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz
);

create table if not exists public.contas_a_pagar (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id),
  conta_id uuid references public.contas(id),
  categoria_id uuid references public.categorias(id),
  descricao varchar(255) not null,
  valor numeric(18,2) not null,
  vencimento_em date not null,
  pago_em date,
  status varchar(30) not null default 'pendente',
  recorrente boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz
);

create table if not exists public.contas_a_receber (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id),
  conta_id uuid references public.contas(id),
  categoria_id uuid references public.categorias(id),
  descricao varchar(255) not null,
  valor numeric(18,2) not null,
  vencimento_em date not null,
  recebido_em date,
  status varchar(30) not null default 'pendente',
  recorrente boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz
);

create table if not exists public.assinaturas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id),
  conta_id uuid references public.contas(id),
  cartao_id uuid references public.cartoes(id),
  categoria_id uuid references public.categorias(id),
  nome varchar(120) not null,
  valor numeric(18,2) not null,
  recorrencia varchar(20) not null,
  proxima_cobranca_em date,
  status varchar(30) not null default 'ativa',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz
);

create table if not exists public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id),
  titulo varchar(160) not null,
  mensagem text not null,
  tipo varchar(40) not null,
  lida_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz
);

create table if not exists public.anexos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id),
  transacao_id uuid references public.transacoes(id),
  nome_arquivo varchar(255) not null,
  mime_type varchar(120) not null,
  tamanho_bytes bigint not null,
  caminho_storage text not null,
  hash_arquivo varchar(128),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz
);

create table if not exists public.integracoes_bancarias (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id),
  provedor varchar(60) not null,
  status varchar(30) not null default 'pendente',
  ultimo_erro text,
  ultima_sincronizacao_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz
);

create table if not exists public.conexoes_pluggy (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id),
  integracao_bancaria_id uuid references public.integracoes_bancarias(id),
  pluggy_item_id varchar(255) not null unique,
  pluggy_connector_id varchar(255),
  status varchar(40) not null,
  ultimo_webhook_id varchar(255),
  ultima_sincronizacao_em timestamptz,
  ultimo_erro text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz
);

create table if not exists public.sincronizacoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id),
  conexao_pluggy_id uuid references public.conexoes_pluggy(id),
  origem varchar(40) not null,
  status varchar(30) not null,
  iniciada_em timestamptz not null default now(),
  finalizada_em timestamptz,
  total_processado integer not null default 0,
  total_criado integer not null default 0,
  total_atualizado integer not null default 0,
  total_ignorando integer not null default 0,
  detalhe_erro text,
  idempotencia_chave varchar(255),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz
);

create table if not exists public.configuracoes_usuario (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id),
  tema varchar(20) not null default 'system',
  moeda varchar(10) not null default 'BRL',
  idioma varchar(10) not null default 'pt-BR',
  notificacoes_push boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz
);

create table if not exists public.sessoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id),
  refresh_token_hash varchar(255) not null,
  user_agent text,
  ip_hash varchar(255),
  expira_em timestamptz not null,
  revogada_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz
);

create table if not exists public.logs_auditoria (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.usuarios(id),
  entidade varchar(80) not null,
  entidade_id uuid,
  acao varchar(80) not null,
  descricao text,
  ip_hash varchar(255),
  user_agent text,
  metadados jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz
);
