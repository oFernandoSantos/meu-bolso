import { z } from "zod";

export const uuidSchema = z.object({
  id: z.string().uuid(),
});

export const paginacaoQuerySchema = z.object({
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().positive().max(100).default(20),
  ordem: z.enum(["asc", "desc"]).default("desc"),
});
