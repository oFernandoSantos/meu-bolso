import { supabaseAdmin } from "../configuracoes/supabase.js";
import { HttpError } from "../erros/http-error.js";

export async function autenticar(request, _response, next) {
  try {
    const authorization = request.headers.authorization ?? "";
    if (!authorization.startsWith("Bearer ")) {
      throw new HttpError(401, "Sessao invalida.");
    }

    const token = authorization.slice("Bearer ".length).trim();
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      throw new HttpError(401, "Sessao invalida.");
    }

    request.usuario = {
      id: data.user.id,
      email: data.user.email ?? null,
    };

    next();
  } catch (error) {
    next(error);
  }
}
