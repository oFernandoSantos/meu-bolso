import { HttpError } from "../erros/http-error.js";

export function validar({ body, params, query } = {}) {
  return (request, _response, next) => {
    try {
      if (body) request.body = body.parse(request.body);
      if (params) request.params = params.parse(request.params);
      if (query) request.query = query.parse(request.query);
      next();
    } catch (error) {
      next(new HttpError(400, "Dados invalidos.", error));
    }
  };
}
