import { config } from "dotenv";
import { resolve } from "node:path";
import { z } from "zod";

const raizProjeto = resolve(process.cwd(), "..");
config({ path: process.env.NODE_ENV === "test" ? ".env.test" : ".env" });
config({ path: ".env.local", override: false });
config({ path: resolve(raizProjeto, process.env.NODE_ENV === "test" ? ".env.test" : ".env"), override: false });
config({ path: resolve(raizProjeto, ".env.local"), override: false });

const esquema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  BACKEND_HOST: z.string().default("0.0.0.0"),
  BACKEND_PORT: z.coerce.number().int().positive().default(3000),
  API_EXTERNAL_URL: z.string().default(""),
  BODY_LIMIT: z.string().default("1mb"),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  ORIGENS_PERMITIDAS: z
    .string()
    .default("http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173,http://localhost:8081"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL obrigatoria"),
  POSTGRES_HOST: z.string().default("postgres"),
  POSTGRES_PORT: z.coerce.number().int().positive().default(5432),
  POSTGRES_DB: z.string().default("meu_bolso"),
  POSTGRES_USER: z.string().default("meu_bolso"),
  POSTGRES_PASSWORD: z.string().default("meu_bolso"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET obrigatorio"),
  JWT_REFRESH_SECRET: z.string().min(1, "JWT_REFRESH_SECRET obrigatorio"),
  SUPABASE_URL: z.string().url("SUPABASE_URL invalida"),
  SUPABASE_ANON_KEY: z.string().min(1, "SUPABASE_ANON_KEY obrigatoria"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY obrigatoria"),
  PLUGGY_CLIENT_ID: z.string().optional().default(""),
  PLUGGY_CLIENT_SECRET: z.string().optional().default(""),
  PLUGGY_API_URL: z.string().url().default("https://api.pluggy.ai"),
  PLUGGY_WEBHOOK_SECRET: z.string().optional().default(""),
  HEALTHCHECK_TOKEN: z.string().optional().default(""),
});

export const ambiente = esquema.parse(process.env);

export function origensPermitidas() {
  return ambiente.ORIGENS_PERMITIDAS.split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
