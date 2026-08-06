import { pool } from "../configuracoes/banco.js";

export async function consultarSaudeBanco() {
  const resultado = await pool.query("select now() as agora");
  return resultado.rows[0] ?? null;
}
