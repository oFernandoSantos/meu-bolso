import { Router } from "express";
import { endpointPreparado } from "../controladores/placeholder-controlador.js";
import { autenticar } from "../middlewares/autenticacao.js";
import { rateLimitPluggy, rateLimitWebhook } from "../middlewares/seguranca-http.js";

const router = Router();

router.post("/webhook", rateLimitWebhook, endpointPreparado("/pluggy/webhook"));
router.use(autenticar, rateLimitPluggy);
router.post("/connect-token", endpointPreparado("/pluggy/connect-token"));
router.post("/sincronizar", endpointPreparado("/pluggy/sincronizar"));
router.get("/conexoes", endpointPreparado("/pluggy/conexoes"));

export default router;
