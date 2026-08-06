import { Router } from "express";
import { endpointPreparado } from "../controladores/placeholder-controlador.js";
import { autenticar } from "../middlewares/autenticacao.js";
import { validar } from "../middlewares/validacao.js";
import { paginacaoQuerySchema } from "../validadores/comuns.js";

const router = Router();
router.use(autenticar);
router.get("/", validar({ query: paginacaoQuerySchema }), endpointPreparado("/transacoes"));
router.post("/", endpointPreparado("/transacoes"));
export default router;
