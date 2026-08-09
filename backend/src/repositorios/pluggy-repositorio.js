import { pool } from "../configuracoes/banco.js";

function normalizarEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function chaveContaExterna(itemId, accountId) {
  return `pluggy-account:${itemId}:${accountId}`;
}

function chaveCartaoExterna(itemId, accountId) {
  return `pluggy-card:${itemId}:${accountId}`;
}

function chaveTransacaoExterna(itemId, transactionId) {
  return `pluggy-transaction:${itemId}:${transactionId}`;
}

function slugCor(tipo) {
  if (tipo === "CREDIT") return "#2563eb";
  if (tipo === "SAVINGS") return "#16a34a";
  return "#0f766e";
}

function tipoContaInterna(account) {
  if (account?.type === "CREDIT") return "cartao_credito";
  const subtipo = String(account?.subtype || "").toUpperCase();
  if (subtipo.includes("SAVINGS")) return "poupanca";
  return "corrente";
}

function tipoCartaoInterno(account) {
  return account?.type === "CREDIT" ? "credito" : "debito";
}

function nomeContaPluggy(account) {
  return (
    account?.name?.trim() ||
    account?.marketingName?.trim() ||
    (account?.type === "CREDIT" ? "Cartao Pluggy" : "Conta Pluggy")
  );
}

function ultimosDigitos(account) {
  const digitos = String(account?.number || "").replace(/\D/g, "");
  return digitos ? digitos.slice(-4) : null;
}

function valorMonetario(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return 0;
  return Math.round(numero * 100) / 100;
}

function tipoTransacaoInterna(transaction) {
  const amount = Number(transaction?.amount || 0);
  if (amount < 0 || transaction?.type === "DEBIT") return "despesa";
  if (amount > 0 || transaction?.type === "CREDIT") return "receita";
  return "transferencia";
}

function formaPagamentoInterna(account, transaction) {
  if (account?.type === "CREDIT") return "cartao_credito";
  const texto = [transaction?.description, transaction?.descriptionRaw, transaction?.category]
    .filter(Boolean)
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (texto.includes("pix")) return "pix";
  if (texto.includes("dinheiro") || texto.includes("saque")) return "dinheiro";
  return "conta";
}

async function executarEmTransacao(execucao) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const resultado = await execucao(client);
    await client.query("commit");
    return resultado;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function obterUsuarioPorEmail(client, email) {
  const resultado = await client.query(
    `
      select id, email
      from public.usuarios
      where email = $1 and excluido_em is null
      limit 1
    `,
    [normalizarEmail(email)],
  );
  return resultado.rows[0] ?? null;
}

async function criarPerfilPadrao(client, usuarioId, email) {
  const nomeBase = String(email || "Meu Bolso").split("@")[0] || "Meu Bolso";
  await client.query(
    `
      insert into public.perfis (usuario_id, nome)
      values ($1, $2)
      on conflict do nothing
    `,
    [usuarioId, nomeBase],
  );
}

async function obterOuCriarUsuarioPorEmailNoClient(client, email) {
  const emailNormalizado = normalizarEmail(email);
  let usuario = await obterUsuarioPorEmail(client, emailNormalizado);
  if (usuario) return usuario;

  const insercao = await client.query(
    `
      insert into public.usuarios (email, status)
      values ($1, 'ativo')
      returning id, email
    `,
    [emailNormalizado],
  );

  usuario = insercao.rows[0];
  await criarPerfilPadrao(client, usuario.id, usuario.email);
  return usuario;
}

export async function obterOuCriarUsuarioPorEmail(email) {
  return executarEmTransacao((client) => obterOuCriarUsuarioPorEmailNoClient(client, email));
}

async function obterOuCriarIntegracao(client, usuarioId) {
  const existente = await client.query(
    `
      select id, usuario_id, provedor, status
      from public.integracoes_bancarias
      where usuario_id = $1
        and provedor = 'pluggy'
        and excluido_em is null
      order by criado_em asc
      limit 1
    `,
    [usuarioId],
  );

  if (existente.rows[0]) return existente.rows[0];

  const criado = await client.query(
    `
      insert into public.integracoes_bancarias (
        usuario_id, provedor, status, criado_em, atualizado_em
      )
      values ($1, 'pluggy', 'pendente', now(), now())
      returning id, usuario_id, provedor, status
    `,
    [usuarioId],
  );

  return criado.rows[0];
}

async function salvarIntegracaoStatus(client, integracaoId, status, ultimoErro = null) {
  await client.query(
    `
      update public.integracoes_bancarias
      set status = $2,
          ultimo_erro = $3,
          ultima_sincronizacao_em = case when $2 = 'sincronizada' then now() else ultima_sincronizacao_em end,
          atualizado_em = now()
      where id = $1
    `,
    [integracaoId, status, ultimoErro],
  );
}

async function obterConexaoPorItemId(client, itemId) {
  const resultado = await client.query(
    `
      select *
      from public.conexoes_pluggy
      where pluggy_item_id = $1
        and excluido_em is null
      limit 1
    `,
    [itemId],
  );
  return resultado.rows[0] ?? null;
}

async function salvarConexao(client, {
  usuarioId,
  integracaoBancariaId,
  itemId,
  connectorId,
  status,
  ultimoErro = null,
  ultimoWebhookId = null,
  atualizarSincronizacao = false,
}) {
  const existente = await obterConexaoPorItemId(client, itemId);

  if (existente) {
    const atualizado = await client.query(
      `
        update public.conexoes_pluggy
        set usuario_id = $2,
            integracao_bancaria_id = $3,
            pluggy_connector_id = $4,
            status = $5,
            ultimo_erro = $6,
            ultimo_webhook_id = coalesce($7, ultimo_webhook_id),
            ultima_sincronizacao_em = case when $8 then now() else ultima_sincronizacao_em end,
            atualizado_em = now()
        where id = $1
        returning *
      `,
      [
        existente.id,
        usuarioId,
        integracaoBancariaId,
        connectorId,
        status,
        ultimoErro,
        ultimoWebhookId,
        atualizarSincronizacao,
      ],
    );
    return atualizado.rows[0];
  }

  const criado = await client.query(
    `
      insert into public.conexoes_pluggy (
        usuario_id,
        integracao_bancaria_id,
        pluggy_item_id,
        pluggy_connector_id,
        status,
        ultimo_webhook_id,
        ultima_sincronizacao_em,
        ultimo_erro,
        criado_em,
        atualizado_em
      )
      values (
        $1, $2, $3, $4, $5, $6,
        case when $7 then now() else null end,
        $8,
        now(),
        now()
      )
      returning *
    `,
    [
      usuarioId,
      integracaoBancariaId,
      itemId,
      connectorId,
      status,
      ultimoWebhookId,
      atualizarSincronizacao,
      ultimoErro,
    ],
  );

  return criado.rows[0];
}

async function registrarSincronizacao(client, {
  usuarioId,
  conexaoPluggyId,
  origem,
  idempotenciaChave = null,
}) {
  const criada = await client.query(
    `
      insert into public.sincronizacoes (
        usuario_id,
        conexao_pluggy_id,
        origem,
        status,
        idempotencia_chave,
        iniciada_em,
        criado_em,
        atualizado_em
      )
      values ($1, $2, $3, 'em_andamento', $4, now(), now(), now())
      returning id
    `,
    [usuarioId, conexaoPluggyId, origem, idempotenciaChave],
  );
  return criada.rows[0]?.id ?? null;
}

async function finalizarSincronizacao(client, {
  sincronizacaoId,
  status,
  totalProcessado,
  totalCriado,
  totalAtualizado,
  totalIgnorado,
  detalheErro = null,
}) {
  if (!sincronizacaoId) return;
  await client.query(
    `
      update public.sincronizacoes
      set status = $2,
          finalizada_em = now(),
          total_processado = $3,
          total_criado = $4,
          total_atualizado = $5,
          total_ignorando = $6,
          detalhe_erro = $7,
          atualizado_em = now()
      where id = $1
    `,
    [
      sincronizacaoId,
      status,
      totalProcessado,
      totalCriado,
      totalAtualizado,
      totalIgnorado,
      detalheErro,
    ],
  );
}

async function obterOuCriarCategoria(client, usuarioId, nome) {
  if (!nome) return null;
  const resultado = await client.query(
    `
      select id
      from public.categorias
      where usuario_id = $1
        and lower(nome) = lower($2)
        and excluido_em is null
      limit 1
    `,
    [usuarioId, nome.trim()],
  );

  if (resultado.rows[0]) return resultado.rows[0].id;

  const insercao = await client.query(
    `
      insert into public.categorias (
        usuario_id, nome, icone, cor, tipo, sistema, ativa, criado_em, atualizado_em
      )
      values ($1, $2, 'circle', '#64748b', 'despesa', false, true, now(), now())
      returning id
    `,
    [usuarioId, nome.trim()],
  );

  return insercao.rows[0]?.id ?? null;
}

async function upsertContaOuCartaoPluggy(client, {
  usuarioId,
  itemId,
  connectorName,
  account,
}) {
  const nome = nomeContaPluggy(account);
  const saldo = valorMonetario(account?.balance ?? account?.currentBalance ?? 0);
  const identificadorConta = chaveContaExterna(itemId, account.id);
  const identificadorCartao = chaveCartaoExterna(itemId, account.id);

  if (account?.type === "CREDIT") {
    let contaId = null;
    const contaExistente = await client.query(
      `
        select conta_id
        from public.cartoes
        where usuario_id = $1
          and identificador_externo = $2
          and excluido_em is null
        limit 1
      `,
      [usuarioId, identificadorCartao],
    );
    contaId = contaExistente.rows[0]?.conta_id ?? null;

    if (contaId) {
      await client.query(
        `
          update public.contas
          set nome = $2,
              tipo = $3,
              saldo_atual = $4,
              instituicao = $5,
              cor = $6,
              ativa = true,
              atualizado_em = now()
          where id = $1
        `,
        [contaId, nome, tipoContaInterna(account), saldo, connectorName, slugCor(account?.type)],
      );
    } else {
      const contaCriada = await client.query(
        `
          insert into public.contas (
            usuario_id, nome, tipo, saldo_inicial, saldo_atual, instituicao, cor, ativa, criado_em, atualizado_em
          )
          values ($1, $2, $3, 0, $4, $5, $6, true, now(), now())
          returning id
        `,
        [usuarioId, nome, tipoContaInterna(account), saldo, connectorName, slugCor(account?.type)],
      );
      contaId = contaCriada.rows[0]?.id ?? null;
    }

    const cartaoExistente = await client.query(
      `
        select id
        from public.cartoes
        where usuario_id = $1
          and identificador_externo = $2
          and excluido_em is null
        limit 1
      `,
      [usuarioId, identificadorCartao],
    );

    if (cartaoExistente.rows[0]) {
      await client.query(
        `
          update public.cartoes
          set conta_id = $2,
              nome = $3,
              tipo = $4,
              ultimos_quatro_digitos = $5,
              limite_total = $6,
              cor = $7,
              ativo = true,
              atualizado_em = now()
          where id = $1
        `,
        [
          cartaoExistente.rows[0].id,
          contaId,
          nome,
          tipoCartaoInterno(account),
          ultimosDigitos(account),
          valorMonetario(account?.creditData?.limit ?? account?.creditLimit ?? 0),
          slugCor(account?.type),
        ],
      );
      return { contaId, cartaoId: cartaoExistente.rows[0].id, contaBancariaId: null };
    }

    const cartaoCriado = await client.query(
      `
        insert into public.cartoes (
          usuario_id,
          conta_id,
          nome,
          tipo,
          ultimos_quatro_digitos,
          limite_total,
          cor,
          ativo,
          identificador_externo,
          criado_em,
          atualizado_em
        )
        values ($1, $2, $3, $4, $5, $6, $7, true, $8, now(), now())
        returning id
      `,
      [
        usuarioId,
        contaId,
        nome,
        tipoCartaoInterno(account),
        ultimosDigitos(account),
        valorMonetario(account?.creditData?.limit ?? account?.creditLimit ?? 0),
        slugCor(account?.type),
        identificadorCartao,
      ],
    );

    return { contaId, cartaoId: cartaoCriado.rows[0]?.id ?? null, contaBancariaId: null };
  }

  let contaId = null;
  const contaBancariaExistente = await client.query(
    `
      select cb.id, cb.conta_id
      from public.contas_bancarias cb
      where cb.usuario_id = $1
        and cb.identificador_externo = $2
        and cb.excluido_em is null
      limit 1
    `,
    [usuarioId, identificadorConta],
  );
  contaId = contaBancariaExistente.rows[0]?.conta_id ?? null;

  if (contaId) {
    await client.query(
      `
        update public.contas
        set nome = $2,
            tipo = $3,
            saldo_atual = $4,
            instituicao = $5,
            cor = $6,
            ativa = true,
            atualizado_em = now()
        where id = $1
      `,
      [contaId, nome, tipoContaInterna(account), saldo, connectorName, slugCor(account?.type)],
    );
  } else {
    const contaCriada = await client.query(
      `
        insert into public.contas (
          usuario_id, nome, tipo, saldo_inicial, saldo_atual, instituicao, cor, ativa, criado_em, atualizado_em
        )
        values ($1, $2, $3, 0, $4, $5, $6, true, now(), now())
        returning id
      `,
      [usuarioId, nome, tipoContaInterna(account), saldo, connectorName, slugCor(account?.type)],
    );
    contaId = contaCriada.rows[0]?.id ?? null;
  }

  if (contaBancariaExistente.rows[0]) {
    await client.query(
      `
        update public.contas_bancarias
        set conta_id = $2,
            banco = $3,
            numero_conta = $4,
            tipo_conta = $5,
            atualizado_em = now()
        where id = $1
      `,
      [
        contaBancariaExistente.rows[0].id,
        contaId,
        connectorName || "Pluggy",
        account?.number || null,
        account?.subtype || account?.type || null,
      ],
    );
    return {
      contaId,
      cartaoId: null,
      contaBancariaId: contaBancariaExistente.rows[0].id,
    };
  }

  const contaBancariaCriada = await client.query(
    `
      insert into public.contas_bancarias (
        usuario_id,
        conta_id,
        banco,
        numero_conta,
        tipo_conta,
        identificador_externo,
        criado_em,
        atualizado_em
      )
      values ($1, $2, $3, $4, $5, $6, now(), now())
      returning id
    `,
    [
      usuarioId,
      contaId,
      connectorName || "Pluggy",
      account?.number || null,
      account?.subtype || account?.type || null,
      identificadorConta,
    ],
  );

  return {
    contaId,
    cartaoId: null,
    contaBancariaId: contaBancariaCriada.rows[0]?.id ?? null,
  };
}

async function upsertTransacaoPluggy(client, {
  usuarioId,
  conexaoPluggyId,
  itemId,
  account,
  referenciasConta,
  transaction,
}) {
  const identificadorExterno = chaveTransacaoExterna(itemId, transaction.id);
  const categoriaId = await obterOuCriarCategoria(client, usuarioId, transaction?.category || "Outros");
  const valorAbsoluto = Math.abs(valorMonetario(transaction?.amount || 0));
  const tipo = tipoTransacaoInterna(transaction);
  const formaPagamento = formaPagamentoInterna(account, transaction);

  const existente = await client.query(
    `
      select id
      from public.transacoes
      where usuario_id = $1
        and identificador_externo = $2
        and excluido_em is null
      limit 1
    `,
    [usuarioId, identificadorExterno],
  );

  if (existente.rows[0]) {
    await client.query(
      `
        update public.transacoes
        set conta_id = $2,
            cartao_id = $3,
            categoria_id = $4,
            descricao = $5,
            valor = $6,
            tipo = $7,
            forma_pagamento = $8,
            data_transacao = $9,
            data_competencia = $10,
            status = 'confirmada',
            observacoes = $11,
            idempotencia_chave = $12,
            atualizado_em = now()
        where id = $1
      `,
      [
        existente.rows[0].id,
        referenciasConta.contaId,
        referenciasConta.cartaoId,
        categoriaId,
        transaction?.description?.trim() ||
          transaction?.descriptionRaw?.trim() ||
          "Transacao Pluggy",
        valorAbsoluto,
        tipo,
        formaPagamento,
        String(transaction?.date || "").slice(0, 10),
        String(transaction?.date || "").slice(0, 10),
        JSON.stringify({
          pluggyAccountId: account?.id || null,
          originalAmount: transaction?.amount ?? null,
        }),
        identificadorExterno,
      ],
    );
    return { criado: false, atualizado: true };
  }

  await client.query(
    `
      insert into public.transacoes (
        usuario_id,
        conta_id,
        cartao_id,
        categoria_id,
        descricao,
        valor,
        tipo,
        forma_pagamento,
        data_transacao,
        data_competencia,
        status,
        observacoes,
        identificador_externo,
        idempotencia_chave,
        criado_em,
        atualizado_em
      )
      values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        'confirmada', $11, $12, $13, now(), now()
      )
    `,
    [
      usuarioId,
      referenciasConta.contaId,
      referenciasConta.cartaoId,
      categoriaId,
      transaction?.description?.trim() ||
        transaction?.descriptionRaw?.trim() ||
        "Transacao Pluggy",
      valorAbsoluto,
      tipo,
      formaPagamento,
      String(transaction?.date || "").slice(0, 10),
      String(transaction?.date || "").slice(0, 10),
      JSON.stringify({
        pluggyAccountId: account?.id || null,
        originalAmount: transaction?.amount ?? null,
      }),
      identificadorExterno,
      identificadorExterno,
    ],
  );

  return { criado: true, atualizado: false };
}

async function excluirTransacoesPluggy(client, usuarioId, itemId, transactionIds = []) {
  if (!transactionIds.length) return 0;
  const identificadores = transactionIds.map((transactionId) =>
    chaveTransacaoExterna(itemId, transactionId),
  );
  const resultado = await client.query(
    `
      update public.transacoes
      set excluido_em = now(),
          atualizado_em = now()
      where usuario_id = $1
        and identificador_externo = any($2::text[])
        and excluido_em is null
    `,
    [usuarioId, identificadores],
  );
  return resultado.rowCount || 0;
}

export async function salvarSincronizacaoPluggy({
  usuarioId,
  item,
  accounts,
  transactionsByAccount,
  origem,
  idempotenciaChave = null,
  ultimoWebhookId = null,
}) {
  return executarEmTransacao(async (client) => {
    const integracao = await obterOuCriarIntegracao(client, usuarioId);
    const conexao = await salvarConexao(client, {
      usuarioId,
      integracaoBancariaId: integracao.id,
      itemId: item.id,
      connectorId: item?.connector?.id ? String(item.connector.id) : null,
      status: item?.executionStatus || item?.status || "SYNCING",
      ultimoErro: null,
      ultimoWebhookId,
      atualizarSincronizacao: true,
    });

    const sincronizacaoId = await registrarSincronizacao(client, {
      usuarioId,
      conexaoPluggyId: conexao.id,
      origem,
      idempotenciaChave,
    });

    let totalCriado = 0;
    let totalAtualizado = 0;
    let totalIgnorado = 0;
    let totalProcessado = 0;

    for (const account of accounts) {
      const referenciasConta = await upsertContaOuCartaoPluggy(client, {
        usuarioId,
        itemId: item.id,
        connectorName: item?.connector?.name || null,
        account,
      });

      const transacoes = transactionsByAccount[account.id] ?? [];
      for (const transaction of transacoes) {
        totalProcessado += 1;
        const resultado = await upsertTransacaoPluggy(client, {
          usuarioId,
          conexaoPluggyId: conexao.id,
          itemId: item.id,
          account,
          referenciasConta,
          transaction,
        });
        if (resultado.criado) totalCriado += 1;
        else if (resultado.atualizado) totalAtualizado += 1;
        else totalIgnorado += 1;
      }
    }

    await finalizarSincronizacao(client, {
      sincronizacaoId,
      status: "sucesso",
      totalProcessado,
      totalCriado,
      totalAtualizado,
      totalIgnorado,
    });

    await salvarIntegracaoStatus(client, integracao.id, "sincronizada", null);

    return {
      conexaoId: conexao.id,
      totalProcessado,
      totalCriado,
      totalAtualizado,
      totalIgnorado,
    };
  });
}

export async function salvarEventoWebhookPluggy({
  itemId,
  clientUserId,
  status,
  ultimoErro = null,
  ultimoWebhookId = null,
}) {
  return executarEmTransacao(async (client) => {
    let conexao = itemId ? await obterConexaoPorItemId(client, itemId) : null;
    let usuarioId = conexao?.usuario_id ?? null;

    if (!usuarioId && clientUserId) {
      const usuario = await obterOuCriarUsuarioPorEmailNoClient(client, clientUserId);
      usuarioId = usuario.id;
    }

    if (!usuarioId || !itemId) {
      return null;
    }

    const integracao = await obterOuCriarIntegracao(client, usuarioId);
    conexao = await salvarConexao(client, {
      usuarioId,
      integracaoBancariaId: integracao.id,
      itemId,
      connectorId: conexao?.pluggy_connector_id ?? null,
      status,
      ultimoErro,
      ultimoWebhookId,
      atualizarSincronizacao: status === "SUCCESS",
    });

    await salvarIntegracaoStatus(
      client,
      integracao.id,
      status === "SUCCESS" ? "sincronizada" : "pendente",
      ultimoErro,
    );

    return conexao;
  });
}

export async function buscarUsuarioIdPorItemOuClientUserId({ itemId, clientUserId }) {
  const client = await pool.connect();
  try {
    if (itemId) {
      const conexao = await obterConexaoPorItemId(client, itemId);
      if (conexao?.usuario_id) return conexao.usuario_id;
    }

    if (clientUserId) {
      const usuario = await obterUsuarioPorEmail(client, clientUserId);
      if (usuario?.id) return usuario.id;
    }

    return null;
  } finally {
    client.release();
  }
}

export async function buscarUsuarioPorItemOuClientUserId({ itemId, clientUserId }) {
  const client = await pool.connect();
  try {
    if (itemId) {
      const resultado = await client.query(
        `
          select u.id, u.email
          from public.conexoes_pluggy cp
          inner join public.usuarios u on u.id = cp.usuario_id
          where cp.pluggy_item_id = $1
            and cp.excluido_em is null
            and u.excluido_em is null
          limit 1
        `,
        [itemId],
      );
      if (resultado.rows[0]) return resultado.rows[0];
    }

    if (clientUserId) {
      const usuario = await obterUsuarioPorEmail(client, clientUserId);
      if (usuario) return usuario;
    }

    return null;
  } finally {
    client.release();
  }
}

export async function marcarTransacoesPluggyExcluidas({ itemId, transactionIds, clientUserId }) {
  const usuarioId = await buscarUsuarioIdPorItemOuClientUserId({ itemId, clientUserId });
  if (!usuarioId) return 0;

  return executarEmTransacao(async (client) =>
    excluirTransacoesPluggy(client, usuarioId, itemId, transactionIds),
  );
}

export async function listarConexoesPluggyPorEmail(email) {
  const usuario = await obterOuCriarUsuarioPorEmail(email);
  const client = await pool.connect();
  try {
    const conexoesResultado = await client.query(
      `
        select cp.id,
               cp.pluggy_item_id,
               cp.status,
               cp.ultimo_erro,
               cp.ultima_sincronizacao_em,
               cp.atualizado_em,
               ib.status as integracao_status
        from public.conexoes_pluggy cp
        left join public.integracoes_bancarias ib on ib.id = cp.integracao_bancaria_id
        where cp.usuario_id = $1
          and cp.excluido_em is null
        order by cp.atualizado_em desc
      `,
      [usuario.id],
    );

    const conexoes = [];
    for (const conexao of conexoesResultado.rows) {
      const contas = await client.query(
        `
          select c.nome, c.tipo, c.saldo_atual, c.instituicao
          from public.contas_bancarias cb
          inner join public.contas c on c.id = cb.conta_id
          where cb.usuario_id = $1
            and cb.identificador_externo like $2
            and cb.excluido_em is null
            and c.excluido_em is null
          order by c.nome asc
        `,
        [usuario.id, `pluggy-account:${conexao.pluggy_item_id}:%`],
      );

      const cartoes = await client.query(
        `
          select c.nome, c.saldo_atual, ct.limite_total, ct.ultimos_quatro_digitos
          from public.cartoes ct
          left join public.contas c on c.id = ct.conta_id
          where ct.usuario_id = $1
            and ct.identificador_externo like $2
            and ct.excluido_em is null
          order by ct.nome asc
        `,
        [usuario.id, `pluggy-card:${conexao.pluggy_item_id}:%`],
      );

      const transacoes = await client.query(
        `
          select count(*)::int as total
          from public.transacoes
          where usuario_id = $1
            and identificador_externo like $2
            and excluido_em is null
        `,
        [usuario.id, `pluggy-transaction:${conexao.pluggy_item_id}:%`],
      );

      conexoes.push({
        id: conexao.id,
        itemId: conexao.pluggy_item_id,
        status: conexao.status,
        lastError: conexao.ultimo_erro,
        lastSyncAt: conexao.ultima_sincronizacao_em,
        updatedAt: conexao.atualizado_em,
        integrationStatus: conexao.integracao_status,
        accounts: contas.rows.map((conta) => ({
          nome: conta.nome,
          tipo: conta.tipo,
          saldoAtual: Number(conta.saldo_atual || 0),
          instituicao: conta.instituicao,
        })),
        cards: cartoes.rows.map((cartao) => ({
          nome: cartao.nome,
          saldoAtual: Number(cartao.saldo_atual || 0),
          limiteTotal: Number(cartao.limite_total || 0),
          ultimosQuatroDigitos: cartao.ultimos_quatro_digitos,
        })),
        transactionsCount: transacoes.rows[0]?.total ?? 0,
      });
    }

    return { usuarioId: usuario.id, conexoes };
  } finally {
    client.release();
  }
}
