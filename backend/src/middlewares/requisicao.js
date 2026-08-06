import { randomUUID } from "node:crypto";
import { ambiente } from "../configuracoes/ambiente.js";
import { logger } from "../configuracoes/logger.js";

export function middlewareRequisicao(request, response, next) {
  request.id = request.headers["x-request-id"] || randomUUID();
  response.setHeader("x-request-id", request.id);

  request.setTimeout(ambiente.REQUEST_TIMEOUT_MS);
  response.setTimeout(ambiente.REQUEST_TIMEOUT_MS);

  const inicio = Date.now();
  response.on("finish", () => {
    logger.info("requisicao_finalizada", {
      id: request.id,
      metodo: request.method,
      rota: request.originalUrl,
      status: response.statusCode,
      duracao_ms: Date.now() - inicio,
    });
  });

  next();
}
