import pg from "pg";
import { ambiente } from "./ambiente.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: ambiente.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  ssl: ambiente.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export async function verificarBanco() {
  const resultado = await pool.query("select 1 as ok");
  return resultado.rows[0]?.ok === 1;
}
