import { sucesso } from "../utilitarios/resposta.js";

export function obterSessaoAtual(request, response) {
  return sucesso(response, {
    usuario: {
      id: request.usuario.id,
      email: request.usuario.email,
    },
  });
}
