import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { ambiente, origensPermitidas } from "../configuracoes/ambiente.js";

function criarRateLimit(windowMs, max) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { erro: "Limite de requisicoes excedido. Tente novamente em instantes." },
  });
}

export const rateLimitComum = criarRateLimit(15 * 60 * 1000, 300);
export const rateLimitAuth = criarRateLimit(15 * 60 * 1000, 15);
export const rateLimitPluggy = criarRateLimit(15 * 60 * 1000, 30);
export const rateLimitWebhook = criarRateLimit(5 * 60 * 1000, 120);

export function aplicarSegurancaHttp(app) {
  app.disable("x-powered-by");
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      hsts: ambiente.NODE_ENV === "production",
    }),
  );
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (origensPermitidas().includes(origin)) return callback(null, true);
        return callback(new Error("Origem nao permitida pelo CORS"));
      },
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      allowedHeaders: ["Authorization", "Content-Type", "Accept", "X-Request-Id"],
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: ambiente.BODY_LIMIT }));
}
