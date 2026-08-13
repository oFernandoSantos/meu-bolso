import { Router } from "express";
import { z } from "zod";
import {
  encerrarSessaoAtual,
  iniciarSessao,
  obterSessaoAtual,
  registrar,
  renovarSessao,
} from "../controladores/auth-controlador.js";
import { autenticar } from "../middlewares/autenticacao.js";
import { rateLimitAuthCritico, rateLimitSessao } from "../middlewares/seguranca-http.js";
import { validar } from "../middlewares/validacao.js";

const router = Router();
const credenciaisSchema = z.object({
  email: z.string().trim().email("Informe um e-mail valido."),
  password: z.string().min(8, "Senha deve ter ao menos 8 caracteres."),
});
const refreshSchema = z.object({
  refreshToken: z.string().min(1, "refreshToken obrigatorio."),
});

router.post("/register", rateLimitAuthCritico, validar({ body: credenciaisSchema }), registrar);
router.post("/login", rateLimitAuthCritico, validar({ body: credenciaisSchema }), iniciarSessao);
router.post("/refresh", rateLimitSessao, validar({ body: refreshSchema }), renovarSessao);
router.get("/me", rateLimitSessao, autenticar, obterSessaoAtual);
router.post("/logout", rateLimitSessao, autenticar, encerrarSessaoAtual);

export default router;
