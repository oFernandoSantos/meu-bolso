import { HttpError } from "../erros/http-error.js";

function normalizarEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

export function identificarUsuarioAplicacao(request, _response, next) {
  try {
    const email = normalizarEmail(request.usuario?.email);
    if (!email) {
      throw new HttpError(403, "Conta autenticada sem e-mail valido para operar integracao.");
    }

    request.usuarioAplicacao = {
      id: request.usuario.id,
      email,
    };

    next();
  } catch (error) {
    next(error);
  }
}
