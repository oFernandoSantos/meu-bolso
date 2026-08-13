import { ambiente } from "../configuracoes/ambiente.js";
import { logger } from "../configuracoes/logger.js";
import { HttpError } from "../erros/http-error.js";
import {
  buscarUsuarioPorItemOuClientUserId,
  listarConexoesPluggyPorEmail,
  marcarTransacoesPluggyExcluidas,
  obterOuCriarUsuarioPorEmail,
  salvarEventoWebhookPluggy,
  salvarSincronizacaoPluggy,
} from "../repositorios/pluggy-repositorio.js";

let apiKeyCache = {
  valor: null,
  expiraEm: 0,
};

const webhookEventosProcessados = new Map();

const EVENTOS_COM_SINCRONIZACAO = new Set([
  "item/created",
  "item/updated",
  "transactions/created",
  "transactions/updated",
]);

const EVENTOS_COM_REFRESH = new Set([
  "item/created",
  "item/updated",
  "item/error",
  "item/waiting_user_input",
  "item/waiting_user_action",
  "item/login_succeeded",
  "transactions/created",
  "transactions/updated",
  "transactions/deleted",
]);

function mascararClientId(valor) {
  if (!valor) return null;
  if (valor.length <= 8) return valor;
  return `${valor.slice(0, 4)}...${valor.slice(-4)}`;
}

function garantirConfiguracao() {
  if (!ambiente.PLUGGY_CLIENT_ID || !ambiente.PLUGGY_CLIENT_SECRET) {
    throw new HttpError(
      503,
      "Pluggy nao configurada no backend. Defina PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET.",
    );
  }
}

function urlWebhookPluggy() {
  const baseUrl = ambiente.API_EXTERNAL_URL.trim().replace(/\/$/, "");
  if (!baseUrl) return null;
  if (!baseUrl.startsWith("https://")) return null;
  return `${baseUrl}/api/pluggy/webhook`;
}

function headersWebhookPluggy() {
  if (!ambiente.PLUGGY_WEBHOOK_SECRET) return undefined;
  return {
    Authorization: `Bearer ${ambiente.PLUGGY_WEBHOOK_SECRET}`,
    "X-Webhook-Secret": ambiente.PLUGGY_WEBHOOK_SECRET,
  };
}

function limparEventosAntigos() {
  const limite = Date.now() - 1000 * 60 * 60 * 6;
  for (const [eventId, timestamp] of webhookEventosProcessados.entries()) {
    if (timestamp < limite) webhookEventosProcessados.delete(eventId);
  }
}

function registrarEventoProcessado(eventId) {
  if (!eventId) return;
  limparEventosAntigos();
  webhookEventosProcessados.set(eventId, Date.now());
}

function eventoJaProcessado(eventId) {
  if (!eventId) return false;
  limparEventosAntigos();
  return webhookEventosProcessados.has(eventId);
}

async function requisicaoPluggy(caminho, init = {}, apiKey) {
  const headers = new Headers(init.headers || {});
  headers.set("content-type", "application/json");
  headers.set("accept", "application/json");
  if (apiKey) headers.set("x-api-key", apiKey);

  const resposta = await fetch(`${ambiente.PLUGGY_API_URL}${caminho}`, {
    ...init,
    headers,
  });

  const texto = await resposta.text();
  const dados = texto ? JSON.parse(texto) : null;

  if (!resposta.ok) {
    throw new HttpError(
      resposta.status,
      dados?.message || dados?.error || `Erro Pluggy ${resposta.status}.`,
      dados,
    );
  }

  return dados;
}

async function obterApiKey() {
  garantirConfiguracao();

  if (apiKeyCache.valor && Date.now() < apiKeyCache.expiraEm) {
    return apiKeyCache.valor;
  }

  const autenticacao = await requisicaoPluggy("/auth", {
    method: "POST",
    body: JSON.stringify({
      clientId: ambiente.PLUGGY_CLIENT_ID,
      clientSecret: ambiente.PLUGGY_CLIENT_SECRET,
    }),
  });

  const apiKey =
    autenticacao?.apiKey ||
    autenticacao?.accessToken ||
    autenticacao?.access_token ||
    autenticacao?.token ||
    autenticacao?.apikey;

  if (!apiKey) {
    throw new HttpError(502, "Resposta de autenticacao da Pluggy sem API key.");
  }

  apiKeyCache = {
    valor: apiKey,
    expiraEm: Date.now() + 1000 * 60 * 100,
  };

  return apiKey;
}

async function listarWebhooksPluggy() {
  const apiKey = await obterApiKey();
  const dados = await requisicaoPluggy("/webhooks", { method: "GET" }, apiKey);
  return Array.isArray(dados) ? dados : (dados?.results ?? []);
}

async function criarWebhookPluggy(payload) {
  const apiKey = await obterApiKey();
  return requisicaoPluggy(
    "/webhooks",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    apiKey,
  );
}

async function atualizarWebhookPluggy(id, payload) {
  const apiKey = await obterApiKey();
  return requisicaoPluggy(
    `/webhooks/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    apiKey,
  );
}

async function listarTransacoes(accountId) {
  const apiKey = await obterApiKey();
  const transacoes = [];
  let proximoCaminho = `/v2/transactions?accountId=${encodeURIComponent(accountId)}`;

  while (proximoCaminho) {
    const dados = await requisicaoPluggy(proximoCaminho, { method: "GET" }, apiKey);
    transacoes.push(...(dados?.results || []));
    proximoCaminho = dados?.next || null;
  }

  return transacoes;
}

export function obterStatusConfiguracaoPluggy() {
  const webhookUrl = urlWebhookPluggy();
  return {
    configured: Boolean(ambiente.PLUGGY_CLIENT_ID && ambiente.PLUGGY_CLIENT_SECRET),
    clientIdMasked: mascararClientId(ambiente.PLUGGY_CLIENT_ID),
    apiUrl: ambiente.PLUGGY_API_URL,
    webhookConfigured: Boolean(ambiente.PLUGGY_WEBHOOK_SECRET),
    webhookUrl,
    webhookReady: Boolean(webhookUrl),
  };
}

export async function garantirWebhookPluggy() {
  const webhookUrl = urlWebhookPluggy();
  if (!webhookUrl) {
    return {
      ativo: false,
      motivo: "API_EXTERNAL_URL ausente ou sem HTTPS. O webhook da Pluggy exige URL publica HTTPS.",
    };
  }

  const headers = headersWebhookPluggy();
  const webhooks = await listarWebhooksPluggy();
  const existente = webhooks.find(
    (webhook) => webhook?.url === webhookUrl && webhook?.event === "all",
  );

  if (!existente) {
    const criado = await criarWebhookPluggy({
      url: webhookUrl,
      event: "all",
      ...(headers ? { headers } : {}),
    });
    logger.info("pluggy_webhook_criado", { webhookUrl, event: "all" });
    return { ativo: true, webhook: criado, url: webhookUrl, criado: true };
  }

  const headersAtuais = existente?.headers || null;
  const precisaAtualizarHeaders = JSON.stringify(headersAtuais) !== JSON.stringify(headers || null);
  const precisaReativar = existente?.enabled === false || Boolean(existente?.disabledAt);

  if (precisaAtualizarHeaders || precisaReativar) {
    const atualizado = await atualizarWebhookPluggy(existente.id, {
      ...(precisaAtualizarHeaders ? { headers: headers || null } : {}),
      ...(precisaReativar ? { enabled: true } : {}),
    });
    logger.info("pluggy_webhook_atualizado", { webhookUrl, event: "all" });
    return { ativo: true, webhook: atualizado, url: webhookUrl, atualizado: true };
  }

  return { ativo: true, webhook: existente, url: webhookUrl, existente: true };
}

export async function criarConnectTokenPluggy({ usuarioEmail, itemId, options = {} }) {
  await obterOuCriarUsuarioPorEmail(usuarioEmail);
  const webhookStatus = await garantirWebhookPluggy();
  const apiKey = await obterApiKey();

  const payload = {
    ...(itemId ? { itemId } : {}),
    options: {
      ...options,
      clientUserId: usuarioEmail,
      ...(webhookStatus.ativo && webhookStatus.url ? { webhookUrl: webhookStatus.url } : {}),
    },
  };

  const dados = await requisicaoPluggy(
    "/connect_token",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    apiKey,
  );

  const accessToken = dados?.accessToken || dados?.access_token || dados?.token;
  if (!accessToken) {
    throw new HttpError(502, "Resposta da Pluggy sem connect token.");
  }

  return {
    accessToken,
    webhook: webhookStatus,
  };
}

export async function obterItemPluggy(itemId) {
  const apiKey = await obterApiKey();
  return requisicaoPluggy(`/items/${itemId}`, { method: "GET" }, apiKey);
}

export async function sincronizarItemPluggy(itemId) {
  const apiKey = await obterApiKey();
  const item = await requisicaoPluggy(`/items/${itemId}`, { method: "GET" }, apiKey);
  const contasResposta = await requisicaoPluggy(
    `/accounts?itemId=${encodeURIComponent(itemId)}`,
    { method: "GET" },
    apiKey,
  );
  const accounts = contasResposta?.results || contasResposta || [];
  const transactionsByAccount = {};

  for (const conta of accounts) {
    transactionsByAccount[conta.id] = await listarTransacoes(conta.id);
  }

  return {
    item,
    accounts,
    transactionsByAccount,
  };
}

export async function sincronizarEPersistirItemPluggy({
  usuarioEmail,
  itemId,
  origem,
  idempotenciaChave = null,
  ultimoWebhookId = null,
}) {
  const usuario = await obterOuCriarUsuarioPorEmail(usuarioEmail);
  const payload = await sincronizarItemPluggy(itemId);
  const persistencia = await salvarSincronizacaoPluggy({
    usuarioId: usuario.id,
    item: payload.item,
    accounts: payload.accounts,
    transactionsByAccount: payload.transactionsByAccount,
    origem,
    idempotenciaChave,
    ultimoWebhookId,
  });

  return {
    ...payload,
    persistence: persistencia,
  };
}

export function validarWebhookPluggy(headers = {}) {
  const segredo = ambiente.PLUGGY_WEBHOOK_SECRET.trim();
  if (!segredo) return true;

  const authorization = headers.authorization || headers.Authorization || "";
  const xWebhookSecret = headers["x-webhook-secret"] || headers["X-Webhook-Secret"] || "";

  return authorization === `Bearer ${segredo}` || xWebhookSecret === segredo;
}

export async function listarConexoesPersistidasPluggy(usuarioEmail) {
  return listarConexoesPluggyPorEmail(usuarioEmail);
}

export async function processarWebhookPluggy(payload = {}) {
  const evento = payload.event || "desconhecido";
  const eventId = payload.eventId || null;
  const itemId = payload.itemId || null;
  const clientUserId = payload.clientUserId || null;

  if (eventoJaProcessado(eventId)) {
    logger.info("pluggy_webhook_duplicado", { eventId, evento, itemId });
    return { duplicado: true };
  }

  registrarEventoProcessado(eventId);

  if (evento === "connector/status_updated") {
    logger.info("pluggy_webhook_connector_status", {
      eventId,
      connectorId: payload.connectorId || null,
      status: payload?.data?.status || null,
    });
    return { ok: true };
  }

  if (evento === "transactions/deleted") {
    const removidas = await marcarTransacoesPluggyExcluidas({
      itemId,
      transactionIds: payload.transactionIds || [],
      clientUserId,
    });
    logger.info("pluggy_webhook_transacoes_excluidas", {
      eventId,
      itemId,
      removidas,
    });
    return { ok: true, removidas };
  }

  if (!itemId) {
    logger.aviso("pluggy_webhook_sem_item_id", { eventId, evento, payload });
    return { ok: true };
  }

  if (EVENTOS_COM_REFRESH.has(evento)) {
    const itemAtual = await obterItemPluggy(itemId);
    await salvarEventoWebhookPluggy({
      itemId,
      clientUserId,
      status: itemAtual?.executionStatus || itemAtual?.status || "PENDING",
      ultimoErro: itemAtual?.error?.message || itemAtual?.statusDetail?.description || null,
      ultimoWebhookId: eventId,
    });

    if (EVENTOS_COM_SINCRONIZACAO.has(evento)) {
      const usuario = await buscarUsuarioPorItemOuClientUserId({ itemId, clientUserId });
      if (!usuario?.email) {
        logger.aviso("pluggy_webhook_sem_usuario", { eventId, itemId, clientUserId });
        return { ok: true, pendente: true };
      }

      await sincronizarEPersistirItemPluggy({
        usuarioEmail: usuario.email,
        itemId,
        origem: "webhook",
        idempotenciaChave: eventId,
        ultimoWebhookId: eventId,
      });
    }
  }

  if (evento === "item/deleted") {
    await salvarEventoWebhookPluggy({
      itemId,
      clientUserId,
      status: "DELETED",
      ultimoErro: null,
      ultimoWebhookId: eventId,
    });
  }

  logger.info("pluggy_webhook_recebido", { eventId, evento, itemId });
  return { ok: true };
}
