import cookieParser from "cookie-parser";
import express from "express";
import { aplicarSegurancaHttp, rateLimitComum } from "./middlewares/seguranca-http.js";
import { middlewareErro, middlewareRotaNaoEncontrada } from "./middlewares/erro.js";
import { middlewareRequisicao } from "./middlewares/requisicao.js";
import router from "./rotas/index.js";

export function criarApp() {
  const app = express();

  // Easypanel/Nginx encaminha IP real via X-Forwarded-*; o Express precisa confiar no proxy.
  app.set("trust proxy", true);
  aplicarSegurancaHttp(app);
  app.use(cookieParser());
  app.use(middlewareRequisicao);
  app.use(rateLimitComum);

  app.get("/", (_request, response) => {
    response.json({
      sucesso: true,
      dados: {
        servico: "meu-bolso-backend",
        status: "ok",
      },
    });
  });

  app.use("/api", router);
  app.use(middlewareRotaNaoEncontrada);
  app.use(middlewareErro);

  return app;
}
