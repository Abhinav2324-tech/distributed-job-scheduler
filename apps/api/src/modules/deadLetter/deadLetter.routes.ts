import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { validateQuery } from "../../middleware/validate";
import { listDeadLetterQuerySchema, type ListDeadLetterQuery } from "./deadLetter.schemas";
import * as deadLetterService from "./deadLetter.service";

export const deadLetterRouter = Router();
deadLetterRouter.use(requireAuth);

deadLetterRouter.get(
  "/",
  validateQuery(listDeadLetterQuerySchema),
  asyncHandler(async (req, res) => {
    const query = req.validatedQuery as ListDeadLetterQuery;
    const result = await deadLetterService.listDeadLetterEntries(req.user!.orgId, query);
    res.json(result);
  }),
);

deadLetterRouter.post(
  "/:id/retry",
  asyncHandler(async (req, res) => {
    const job = await deadLetterService.retryDeadLetterEntry(req.user!.orgId, req.params.id!);
    res.json(job);
  }),
);
