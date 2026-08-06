export class HttpError extends Error {
  constructor(status, mensagem, detalhes = null) {
    super(mensagem);
    this.name = "HttpError";
    this.status = status;
    this.detalhes = detalhes;
  }
}
