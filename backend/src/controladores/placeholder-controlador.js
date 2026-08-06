import { sucesso } from "../utilitarios/resposta.js";

export function endpointPreparado(nome) {
  return (_request, response) =>
    sucesso(
      response,
      {
        mensagem: `Endpoint ${nome} preparado para integracao com PostgreSQL, Supabase e regras de negocio.`,
        status: "pendente_implantacao_incremental",
      },
      501,
    );
}
