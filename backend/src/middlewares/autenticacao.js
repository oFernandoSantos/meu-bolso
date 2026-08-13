import jwt from "jsonwebtoken";
import { pool } from "../configuracoes/banco.js";
import { ambiente } from "../configuracoes/ambiente.js";
import { HttpError } from "../erros/http-error.js";

export function extrairBearerToken(request) {
  const authorization = request.headers.authorization ?? "";
  if (!authorization.startsWith("Bearer ")) {
    throw new HttpError(401, "Sessao invalida.");
  }

  return authorization.slice("Bearer ".length).trim();
}

export async function autenticar(request, _response, next) {
  try {
    const token = extrairBearerToken(request);
    const payload = jwt.verify(token, ambiente.JWT_SECRET);
    const usuarioId = typeof payload?.sub === "string" ? payload.sub : null;
    if (!usuarioId) {
      throw new HttpError(401, "Sessao invalida.");
    }

    const resultado = await pool.query(
      `
        select id, email
        from public.usuarios
        where id = $1
          and excluido_em is null
        limit 1
      `,
      [usuarioId],
    );
    const usuario = resultado.rows[0] ?? null;
    if (!usuario) {
      throw new HttpError(401, "Sessao invalida.");
    }

    request.tokenAcesso = token;
    request.tokenAcessoPayload = payload;
    request.usuario = {
      id: usuario.id,
      email: usuario.email ?? null,
    };

    next();
  } catch (error) {
    next(error);
  }
}
