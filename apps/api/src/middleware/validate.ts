import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";

// Zod's .parse() throws synchronously on failure; Express 4 catches
// synchronous throws from middleware automatically and routes them to
// errorHandler, which has a dedicated ZodError branch.
export function validateBody(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body);
    next();
  };
}

export function validateQuery(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.validatedQuery = schema.parse(req.query);
    next();
  };
}
