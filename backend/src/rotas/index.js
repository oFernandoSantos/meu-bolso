import { Router } from "express";
import authRouter from "./auth.js";
import healthRouter from "./health.js";
import usuariosRouter from "./usuarios.js";
import perfisRouter from "./perfis.js";
import contasRouter from "./contas.js";
import cartoesRouter from "./cartoes.js";
import categoriasRouter from "./categorias.js";
import transacoesRouter from "./transacoes.js";
import faturasRouter from "./faturas.js";
import orcamentosRouter from "./orcamentos.js";
import metasRouter from "./metas.js";
import assinaturasRouter from "./assinaturas.js";
import notificacoesRouter from "./notificacoes.js";
import integracoesRouter from "./integracoes.js";
import pluggyRouter from "./pluggy.js";
import syncRouter from "./sync.js";

const router = Router();

router.use("/health", healthRouter);
router.use("/auth", authRouter);
router.use("/usuarios", usuariosRouter);
router.use("/perfis", perfisRouter);
router.use("/contas", contasRouter);
router.use("/cartoes", cartoesRouter);
router.use("/categorias", categoriasRouter);
router.use("/transacoes", transacoesRouter);
router.use("/faturas", faturasRouter);
router.use("/orcamentos", orcamentosRouter);
router.use("/metas", metasRouter);
router.use("/assinaturas", assinaturasRouter);
router.use("/notificacoes", notificacoesRouter);
router.use("/integracoes", integracoesRouter);
router.use("/pluggy", pluggyRouter);
router.use("/sync", syncRouter);

export default router;
