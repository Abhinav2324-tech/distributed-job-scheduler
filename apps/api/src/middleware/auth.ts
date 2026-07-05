import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../lib/jwt";
import { forbidden, unauthorized } from "../lib/errors";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(unauthorized("Missing bearer token"));
    return;
  }
  const token = header.slice("Bearer ".length);
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    next(unauthorized("Invalid or expired token"));
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(forbidden("Insufficient permissions for this action"));
      return;
    }
    next();
  };
}
