import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { notFound } from "../../lib/errors";
import { requireAuth } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { loginSchema, registerSchema } from "./auth.schemas";
import * as authService from "./auth.service";

export const authRouter = Router();

authRouter.post(
  "/register",
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  }),
);

authRouter.post(
  "/login",
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    res.status(200).json(result);
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await authService.getUserById(req.user!.userId);
    if (!user) throw notFound("User not found");
    res.json({ user });
  }),
);
