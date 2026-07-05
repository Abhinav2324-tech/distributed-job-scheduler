import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import type { ApiErrorBody } from "@jobscheduler/shared";
import { HttpError } from "../lib/errors";
import { logger } from "../lib/logger";

export function notFoundHandler(req: Request, res: Response) {
  const body: ApiErrorBody = {
    error: { code: "NOT_FOUND", message: `No route for ${req.method} ${req.path}` },
  };
  res.status(404).json(body);
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    const body: ApiErrorBody = {
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: err.flatten(),
      },
    };
    res.status(400).json(body);
    return;
  }

  if (err instanceof HttpError) {
    const body: ApiErrorBody = {
      error: { code: err.code, message: err.message, details: err.details },
    };
    res.status(err.status).json(body);
    return;
  }

  logger.error({ err, path: req.path }, "Unhandled error");
  const body: ApiErrorBody = {
    error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
  };
  res.status(500).json(body);
}
