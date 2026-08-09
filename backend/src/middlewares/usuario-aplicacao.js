import { HttpError } from "../erros/http-error.js";

function normalizarEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

export function identificarUsuarioAplicacao(request, _response, next) {
  try {
    const email = normalizarEmail(request.headers["x-user-email"]);
    if (!email) {
      throw new HttpError(
        401,
        "Informe o e-mail do usuario em X-User-Email para operar a integracao Pluggy.",
      );
    }

    request.usuarioAplicacao = {
      email,
    };

    next();
  } catch (error) {
    next(error);
  }
}
