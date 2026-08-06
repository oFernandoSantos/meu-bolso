export function sucesso(response, dados = {}, status = 200) {
  return response.status(status).json({
    sucesso: true,
    dados,
  });
}
