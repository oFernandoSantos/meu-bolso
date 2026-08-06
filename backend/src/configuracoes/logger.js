function sanitizarMeta(meta = {}) {
  const texto = JSON.stringify(meta)
    .replace(/("authorization"\s*:\s*")([^"]+)(")/gi, "$1***$3")
    .replace(/("token"\s*:\s*")([^"]+)(")/gi, "$1***$3")
    .replace(/("password"\s*:\s*")([^"]+)(")/gi, "$1***$3")
    .replace(/("clientSecret"\s*:\s*")([^"]+)(")/gi, "$1***$3");
  return JSON.parse(texto);
}

function registrar(nivel, mensagem, meta) {
  const payload = {
    nivel,
    mensagem,
    timestamp: new Date().toISOString(),
    ...(meta ? { meta: sanitizarMeta(meta) } : {}),
  };
  const linha = JSON.stringify(payload);
  if (nivel === "erro") {
    console.error(linha);
    return;
  }
  console.log(linha);
}

export const logger = {
  info: (mensagem, meta) => registrar("info", mensagem, meta),
  aviso: (mensagem, meta) => registrar("aviso", mensagem, meta),
  erro: (mensagem, meta) => registrar("erro", mensagem, meta),
};
