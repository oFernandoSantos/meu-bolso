import { Router } from "express";
import { autenticar } from "../middlewares/autenticacao.js";
import {
  obterDatabaseSincronizado,
  salvarDatabaseSincronizado,
} from "../controladores/sync-controlador.js";

const router = Router();

router.use(autenticar);
router.get("/database", obterDatabaseSincronizado);
router.put("/database", salvarDatabaseSincronizado);

export default router;
