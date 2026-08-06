import { criarApp } from "./app.js";
import { ambiente } from "./configuracoes/ambiente.js";
import { logger } from "./configuracoes/logger.js";

const app = criarApp();

app.listen(ambiente.BACKEND_PORT, ambiente.BACKEND_HOST, () => {
  logger.info("backend_iniciado", {
    host: ambiente.BACKEND_HOST,
    porta: ambiente.BACKEND_PORT,
    ambiente: ambiente.NODE_ENV,
  });
});
