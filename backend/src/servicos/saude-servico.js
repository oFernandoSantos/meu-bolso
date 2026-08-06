import { consultarSaudeBanco } from "../repositorios/saude-repositorio.js";

export async function obterSaude() {
  const banco = await consultarSaudeBanco();
  return {
    status: "ok",
    servicos: {
      api: "ok",
      banco: banco ? "ok" : "indisponivel",
    },
  };
}
