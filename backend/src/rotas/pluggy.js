import { Router } from "express";
import { z } from "zod";
import { logger } from "../configuracoes/logger.js";
import { HttpError } from "../erros/http-error.js";
import { identificarUsuarioAplicacao } from "../middlewares/usuario-aplicacao.js";
import { rateLimitPluggy, rateLimitWebhook } from "../middlewares/seguranca-http.js";
import {
  criarConnectTokenPluggy,
  garantirWebhookPluggy,
  listarConexoesPersistidasPluggy,
  obterItemPluggy,
  obterStatusConfiguracaoPluggy,
  processarWebhookPluggy,
  sincronizarEPersistirItemPluggy,
  validarWebhookPluggy,
} from "../servicos/pluggy-servico.js";
import { sucesso } from "../utilitarios/resposta.js";

const router = Router();

const itemSchema = z.object({
  itemId: z.string().min(1, "itemId obrigatorio."),
});

const connectTokenSchema = z.object({
  itemId: z.string().min(1).optional(),
  options: z
    .object({
      clientUserId: z.string().min(1).optional(),
      avoidDuplicates: z.boolean().optional(),
    })
    .optional(),
});

function validar(schema, entrada) {
  const resultado = schema.safeParse(entrada);
  if (!resultado.success) {
    throw new HttpError(400, "Requisicao invalida.", resultado.error.flatten());
  }
  return resultado.data;
}

router.post("/config/status", (_request, response) => {
  sucesso(response, obterStatusConfiguracaoPluggy());
});

router.post("/webhook/ensure", async (_request, response, next) => {
  try {
    const dados = await garantirWebhookPluggy();
    sucesso(response, dados);
  } catch (error) {
    next(error);
  }
});

router.post("/webhook", rateLimitWebhook, async (request, response, next) => {
  try {
    if (!validarWebhookPluggy(request.headers)) {
      throw new HttpError(401, "Webhook Pluggy nao autorizado.");
    }

    const payload = request.body ?? {};
    const eventId = payload.eventId ?? null;
    const event = payload.event ?? null;

    sucesso(
      response,
      {
        recebido: true,
        event,
        eventId,
      },
      202,
    );

    queueMicrotask(() => {
      void processarWebhookPluggy(payload).catch((error) => {
        logger.erro("pluggy_webhook_processamento_falhou", {
          event,
          eventId,
          erro: error instanceof Error ? error.message : "erro_desconhecido",
        });
      });
    });
  } catch (error) {
    next(error);
  }
});

router.use(rateLimitPluggy);
router.use(identificarUsuarioAplicacao);

router.post("/config/save", (_request, _response) => {
  throw new HttpError(
    410,
    "Credenciais Pluggy nao podem mais ser salvas pelo frontend. Configure PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET no backend.",
  );
});

router.post("/connect-token", async (request, response, next) => {
  try {
    const payload = validar(connectTokenSchema, request.body ?? {});
    const dados = await criarConnectTokenPluggy({
      usuarioEmail: request.usuarioAplicacao.email,
      itemId: payload.itemId,
      options: payload.options || {},
    });
    sucesso(response, dados);
  } catch (error) {
    next(error);
  }
});

router.post("/item", async (request, response, next) => {
  try {
    const { itemId } = validar(itemSchema, request.body ?? {});
    const item = await obterItemPluggy(itemId);
    sucesso(response, { item });
  } catch (error) {
    next(error);
  }
});

router.post("/sync", async (request, response, next) => {
  try {
    const { itemId } = validar(itemSchema, request.body ?? {});
    const dados = await sincronizarEPersistirItemPluggy({
      usuarioEmail: request.usuarioAplicacao.email,
      itemId,
      origem: "manual",
    });
    sucesso(response, dados);
  } catch (error) {
    next(error);
  }
});

router.post("/sincronizar", async (request, response, next) => {
  try {
    const { itemId } = validar(itemSchema, request.body ?? {});
    const dados = await sincronizarEPersistirItemPluggy({
      usuarioEmail: request.usuarioAplicacao.email,
      itemId,
      origem: "manual",
    });
    sucesso(response, dados);
  } catch (error) {
    next(error);
  }
});

router.get("/conexoes", async (request, response, next) => {
  try {
    const dados = await listarConexoesPersistidasPluggy(request.usuarioAplicacao.email);
    sucesso(response, dados);
  } catch (error) {
    next(error);
  }
});

export default router;
