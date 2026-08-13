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
import { validar } from "../middlewares/validacao.js";
import { rateLimitAuth } from "../middlewares/seguranca-http.js";

const router = Router();
const credenciaisSchema = z.object({
  email: z.string().trim().email("Informe um e-mail valido."),
  password: z.string().min(8, "Senha deve ter ao menos 8 caracteres."),
});
const refreshSchema = z.object({
  refreshToken: z.string().min(1, "refreshToken obrigatorio."),
});

router.use(rateLimitAuth);
router.post("/register", validar({ body: credenciaisSchema }), registrar);
router.post("/login", validar({ body: credenciaisSchema }), iniciarSessao);
router.post("/refresh", validar({ body: refreshSchema }), renovarSessao);
router.get("/me", autenticar, obterSessaoAtual);
router.post("/logout", autenticar, encerrarSessaoAtual);

export default router;
