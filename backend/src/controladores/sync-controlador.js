import { z } from "zod";
import { pool } from "../configuracoes/banco.js";
import { HttpError } from "../erros/http-error.js";
import { sucesso } from "../utilitarios/resposta.js";

const snapshotSchema = z.object({
  cards: z.array(z.record(z.any())),
  categories: z.array(z.record(z.any())),
  expenses: z.array(z.record(z.any())),
  installments: z.array(z.record(z.any())),
  settings: z.record(z.any()),
});

async function buscarSnapshotUsuario(usuarioId) {
  const resultado = await pool.query(
    `
      select database_json, atualizado_em
      from public.snapshots_usuario
      where usuario_id = $1
        and excluido_em is null
      limit 1
    `,
    [usuarioId],
  );

  return resultado.rows[0] ?? null;
}

export async function obterDatabaseSincronizado(request, response, next) {
  try {
    const snapshot = await buscarSnapshotUsuario(request.usuario.id);
    return sucesso(response, {
      database: snapshot?.database_json ?? null,
      updatedAt: snapshot?.atualizado_em ?? null,
    });
  } catch (error) {
    next(error);
  }
}

export async function salvarDatabaseSincronizado(request, response, next) {
  try {
    const body = z.object({ database: snapshotSchema }).parse(request.body);

    const database = {
      ...body.database,
      settings: {
        ...body.database.settings,
        auth: {
          user_id: request.usuario.id,
          email: request.usuario.email,
          access_token: null,
          refresh_token: null,
          expires_at: null,
          session_active: true,
        },
      },
    };

    const resultado = await pool.query(
      `
        insert into public.snapshots_usuario (
          usuario_id,
          schema_version,
          database_json,
          criado_em,
          atualizado_em
        )
        values ($1, 1, $2::jsonb, now(), now())
        on conflict (usuario_id) do update
        set database_json = excluded.database_json,
            atualizado_em = now(),
            excluido_em = null
        returning atualizado_em
      `,
      [request.usuario.id, JSON.stringify(database)],
    );

    return sucesso(response, {
      saved: true,
      updatedAt: resultado.rows[0]?.atualizado_em ?? null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new HttpError(400, "Database de sincronizacao invalido.", error.issues));
      return;
    }
    next(error);
  }
}
