export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const notFound = (message = "Resource not found") =>
  new HttpError(404, "NOT_FOUND", message);

export const badRequest = (message: string, details?: unknown) =>
  new HttpError(400, "BAD_REQUEST", message, details);

export const unauthorized = (message = "Unauthorized") =>
  new HttpError(401, "UNAUTHORIZED", message);

export const forbidden = (message = "Forbidden") =>
  new HttpError(403, "FORBIDDEN", message);

export const conflict = (message: string, details?: unknown) =>
  new HttpError(409, "CONFLICT", message, details);
