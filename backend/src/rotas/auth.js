import { Router } from "express";
import { obterSessaoAtual } from "../controladores/auth-controlador.js";
import { autenticar } from "../middlewares/autenticacao.js";
import { rateLimitAuth } from "../middlewares/seguranca-http.js";

const router = Router();

router.use(rateLimitAuth);
router.get("/me", autenticar, obterSessaoAtual);

export default router;
