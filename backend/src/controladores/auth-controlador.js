import crypto from "node:crypto";
import { promisify } from "node:util";
import jwt from "jsonwebtoken";
import { pool } from "../configuracoes/banco.js";
import { ambiente } from "../configuracoes/ambiente.js";
import { HttpError } from "../erros/http-error.js";
import { sucesso } from "../utilitarios/resposta.js";

const scryptAsync = promisify(crypto.scrypt);

function normalizarEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function obterNomePerfil(email) {
  return String(email || "Meu Bolso").split("@")[0] || "Meu Bolso";
}

function obterUserAgent(request) {
  const userAgent = request.headers["user-agent"];
  return typeof userAgent === "string" ? userAgent.slice(0, 1000) : null;
}

function obterIp(request) {
  const forwardedFor = request.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }

  const realIp = request.headers["x-real-ip"];
  if (typeof realIp === "string" && realIp.trim()) {
    return realIp.trim();
  }

  return request.ip ?? null;
}

function hashTexto(texto) {
  return crypto.createHash("sha256").update(String(texto)).digest("hex");
}

async function gerarHashSenha(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivado = await scryptAsync(password, salt, 64);
  return `${salt}:${Buffer.from(derivado).toString("hex")}`;
}

async function validarSenha(password, hash) {
  if (!hash || !hash.includes(":")) return false;
  const [salt, esperadoHex] = hash.split(":");
  const derivado = await scryptAsync(password, salt, 64);
  const esperado = Buffer.from(esperadoHex, "hex");
  const recebido = Buffer.from(derivado);
  return esperado.length === recebido.length && crypto.timingSafeEqual(esperado, recebido);
}

function assinarTokenAcesso(usuario, sessaoId) {
  return jwt.sign(
    {
      email: usuario.email,
      sid: sessaoId,
      typ: "access",
    },
    ambiente.JWT_SECRET,
    {
      subject: usuario.id,
      expiresIn: ambiente.JWT_EXPIRES_IN,
    },
  );
}

function assinarRefreshToken(usuario, sessaoId) {
  return jwt.sign(
    {
      sid: sessaoId,
      typ: "refresh",
    },
    ambiente.JWT_REFRESH_SECRET,
    {
      subject: usuario.id,
      expiresIn: ambiente.JWT_REFRESH_EXPIRES_IN,
    },
  );
}

function decodificarRefreshToken(token) {
  const payload = jwt.verify(token, ambiente.JWT_REFRESH_SECRET);
  const usuarioId = typeof payload?.sub === "string" ? payload.sub : null;
  const sessaoId = typeof payload?.sid === "string" ? payload.sid : null;
  if (!usuarioId || !sessaoId || payload?.typ !== "refresh") {
    throw new HttpError(401, "Sessao invalida.");
  }
  return { payload, usuarioId, sessaoId };
}

function calcularExpiracao(token) {
  const payload = jwt.decode(token);
  if (!payload || typeof payload !== "object" || typeof payload.exp !== "number") {
    return null;
  }

  return new Date(payload.exp * 1000).toISOString();
}

async function buscarUsuarioPorEmail(email) {
  const resultado = await pool.query(
    `
      select id, email, password_hash, status, excluido_em
      from public.usuarios
      where email = $1
      limit 1
    `,
    [normalizarEmail(email)],
  );
  return resultado.rows[0] ?? null;
}

async function buscarUsuarioPorId(id) {
  const resultado = await pool.query(
    `
      select id, email, status, excluido_em
      from public.usuarios
      where id = $1
      limit 1
    `,
    [id],
  );
  return resultado.rows[0] ?? null;
}

async function criarUsuario({ email, password }) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const passwordHash = await gerarHashSenha(password);
    const insercaoUsuario = await client.query(
      `
        insert into public.usuarios (
          email,
          password_hash,
          password_atualizada_em,
          status,
          ultimo_login_em,
          criado_em,
          atualizado_em
        )
        values ($1, $2, now(), 'ativo', now(), now(), now())
        returning id, email
      `,
      [normalizarEmail(email), passwordHash],
    );
    const usuario = insercaoUsuario.rows[0];
    await client.query(
      `
        insert into public.perfis (usuario_id, nome)
        values ($1, $2)
        on conflict do nothing
      `,
      [usuario.id, obterNomePerfil(usuario.email)],
    );
    await client.query("commit");
    return usuario;
  } catch (error) {
    await client.query("rollback");
    if (String(error?.code) === "23505") {
      throw new HttpError(409, "Ja existe conta com este e-mail.");
    }
    throw error;
  } finally {
    client.release();
  }
}

async function criarOuAtualizarSessao({ usuario, request, sessaoId = crypto.randomUUID() }) {
  const refreshToken = assinarRefreshToken(usuario, sessaoId);
  const accessToken = assinarTokenAcesso(usuario, sessaoId);
  const refreshTokenHash = hashTexto(refreshToken);
  const userAgent = obterUserAgent(request);
  const ip = obterIp(request);
  const ipHash = ip ? hashTexto(ip) : null;
  const expiraEm = calcularExpiracao(refreshToken);
  if (!expiraEm) {
    throw new HttpError(500, "Falha ao criar sessao.");
  }

  await pool.query(
    `
      insert into public.sessoes (
        id,
        usuario_id,
        refresh_token_hash,
        user_agent,
        ip_hash,
        expira_em,
        revogada_em,
        criado_em,
        atualizado_em
      )
      values ($1, $2, $3, $4, $5, $6, null, now(), now())
      on conflict (id) do update
      set refresh_token_hash = excluded.refresh_token_hash,
          user_agent = excluded.user_agent,
          ip_hash = excluded.ip_hash,
          expira_em = excluded.expira_em,
          revogada_em = null,
          atualizado_em = now()
    `,
    [sessaoId, usuario.id, refreshTokenHash, userAgent, ipHash, expiraEm],
  );

  await pool.query(
    `
      update public.usuarios
      set ultimo_login_em = now(),
          atualizado_em = now()
      where id = $1
    `,
    [usuario.id],
  );

  return {
    usuario: {
      id: usuario.id,
      email: usuario.email,
    },
    sessao: {
      accessToken,
      refreshToken,
      expiresAt: calcularExpiracao(accessToken),
    },
  };
}

async function revogarSessaoPorId(sessaoId) {
  if (!sessaoId) return;
  await pool.query(
    `
      update public.sessoes
      set revogada_em = now(),
          atualizado_em = now()
      where id = $1
        and revogada_em is null
    `,
    [sessaoId],
  );
}

async function revogarSessoesUsuario(usuarioId) {
  await pool.query(
    `
      update public.sessoes
      set revogada_em = now(),
          atualizado_em = now()
      where usuario_id = $1
        and revogada_em is null
    `,
    [usuarioId],
  );
}

export async function registrar(request, response, next) {
  try {
    const { email, password } = request.body;
    const usuarioExistente = await buscarUsuarioPorEmail(email);
    if (usuarioExistente && !usuarioExistente.excluido_em) {
      throw new HttpError(409, "Ja existe conta com este e-mail.");
    }

    const usuario = await criarUsuario({ email, password });
    return sucesso(response, await criarOuAtualizarSessao({ usuario, request }), 201);
  } catch (error) {
    next(error);
  }
}

export async function iniciarSessao(request, response, next) {
  try {
    const { email, password } = request.body;
    const usuario = await buscarUsuarioPorEmail(email);
    if (!usuario || usuario.excluido_em || usuario.status !== "ativo" || !usuario.password_hash) {
      throw new HttpError(401, "E-mail ou senha invalidos.");
    }

    const senhaValida = await validarSenha(password, usuario.password_hash);
    if (!senhaValida) {
      throw new HttpError(401, "E-mail ou senha invalidos.");
    }

    return sucesso(response, await criarOuAtualizarSessao({ usuario, request }));
  } catch (error) {
    next(error);
  }
}

export async function renovarSessao(request, response, next) {
  try {
    const { refreshToken } = request.body;
    const { usuarioId, sessaoId } = decodificarRefreshToken(refreshToken);
    const refreshTokenHash = hashTexto(refreshToken);
    const resultado = await pool.query(
      `
        select id, usuario_id, expira_em, revogada_em
        from public.sessoes
        where id = $1
          and usuario_id = $2
          and refresh_token_hash = $3
        limit 1
      `,
      [sessaoId, usuarioId, refreshTokenHash],
    );
    const sessao = resultado.rows[0] ?? null;
    if (!sessao || sessao.revogada_em || new Date(sessao.expira_em).getTime() <= Date.now()) {
      throw new HttpError(401, "Sessao invalida.");
    }

    const usuario = await buscarUsuarioPorId(usuarioId);
    if (!usuario || usuario.excluido_em || usuario.status !== "ativo") {
      throw new HttpError(401, "Sessao invalida.");
    }

    return sucesso(response, await criarOuAtualizarSessao({ usuario, request, sessaoId }));
  } catch (error) {
    next(error);
  }
}

export async function encerrarSessaoAtual(request, response, next) {
  try {
    const sessaoId =
      typeof request.tokenAcessoPayload?.sid === "string" ? request.tokenAcessoPayload.sid : null;
    if (sessaoId) {
      await revogarSessaoPorId(sessaoId);
    } else {
      await revogarSessoesUsuario(request.usuario.id);
    }
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
