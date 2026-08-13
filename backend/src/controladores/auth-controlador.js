import { supabaseAdmin, supabaseAnon } from "../configuracoes/supabase.js";
import { HttpError } from "../erros/http-error.js";
import { sucesso } from "../utilitarios/resposta.js";

function normalizarEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function serializarSessao(data) {
  const usuario = data?.user ?? null;
  const sessao = data?.session ?? null;

  if (!usuario || !sessao?.access_token || !sessao?.refresh_token) {
    throw new HttpError(
      409,
      "Conta criada, mas sessao nao foi iniciada. Verifique confirmacao de e-mail no Supabase.",
    );
  }

  return {
    usuario: {
      id: usuario.id,
      email: usuario.email ?? null,
    },
    sessao: {
      accessToken: sessao.access_token,
      refreshToken: sessao.refresh_token,
      expiresAt:
        typeof sessao.expires_at === "number"
          ? new Date(sessao.expires_at * 1000).toISOString()
          : null,
    },
  };
}

function tratarErroAuth(error, fallbackStatus = 401) {
  if (!error) return;
  const status = error.status && Number.isInteger(error.status) ? error.status : fallbackStatus;
  throw new HttpError(status, error.message || "Falha na autenticacao.");
}

export async function registrar(request, response, next) {
  try {
    const { email, password } = request.body;
    const { data, error } = await supabaseAnon.auth.signUp({
      email: normalizarEmail(email),
      password,
    });

    tratarErroAuth(error, 400);
    return sucesso(response, serializarSessao(data), 201);
  } catch (error) {
    next(error);
  }
}

export async function iniciarSessao(request, response, next) {
  try {
    const { email, password } = request.body;
    const { data, error } = await supabaseAnon.auth.signInWithPassword({
      email: normalizarEmail(email),
      password,
    });

    tratarErroAuth(error, 401);
    return sucesso(response, serializarSessao(data));
  } catch (error) {
    next(error);
  }
}

export async function renovarSessao(request, response, next) {
  try {
    const { refreshToken } = request.body;
    const { data, error } = await supabaseAnon.auth.refreshSession({
      refresh_token: refreshToken,
    });

    tratarErroAuth(error, 401);
    return sucesso(response, serializarSessao(data));
  } catch (error) {
    next(error);
  }
}

export async function encerrarSessaoAtual(request, response, next) {
  try {
    const { error } = await supabaseAdmin.auth.admin.signOut(request.tokenAcesso, "global");
    tratarErroAuth(error, 401);
    return sucesso(response, { encerrada: true });
  } catch (error) {
    next(error);
  }
}

export function obterSessaoAtual(request, response) {
  return sucesso(response, {
    usuario: {
      id: request.usuario.id,
      email: request.usuario.email,
    },
  });
}
