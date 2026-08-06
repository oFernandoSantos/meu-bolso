import { Router } from "express";
import { endpointPreparado } from "../controladores/placeholder-controlador.js";
import { autenticar } from "../middlewares/autenticacao.js";

const router = Router();
router.use(autenticar);
router.get("/", endpointPreparado("/assinaturas"));
export default router;
