import { obterSaude } from "../servicos/saude-servico.js";
import { sucesso } from "../utilitarios/resposta.js";

export async function healthcheck(_request, response) {
  const dados = await obterSaude();
  return sucesso(response, dados);
}
