import { Router } from "express";
import { healthcheck } from "../controladores/saude-controlador.js";

const router = Router();

router.get("/", healthcheck);

export default router;
