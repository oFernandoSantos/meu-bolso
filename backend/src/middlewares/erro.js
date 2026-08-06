import { logger } from "../configuracoes/logger.js";
import { HttpError } from "../erros/http-error.js";

export function middlewareRotaNaoEncontrada(_request, _response, next) {
  next(new HttpError(404, "Rota nao encontrada."));
}

export function middlewareErro(error, request, response, _next) {
  const status = error instanceof HttpError ? error.status : 500;
  const mensagem = error instanceof HttpError ? error.message : "Erro interno do servidor.";

  logger.erro("erro_api", {
    id: request.id,
    status,
    mensagem,
    detalhes: error instanceof HttpError ? error.detalhes : undefined,
  });

  response.status(status).json({
    sucesso: false,
    erro: mensagem,
    request_id: request.id,
  });
}
