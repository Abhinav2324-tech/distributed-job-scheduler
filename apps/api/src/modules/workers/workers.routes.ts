import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { validateQuery } from "../../middleware/validate";
import { listWorkersQuerySchema, type ListWorkersQuery } from "./workers.schemas";
import * as workersService from "./workers.service";

export const workersRouter = Router();
workersRouter.use(requireAuth);

workersRouter.get(
  "/",
  validateQuery(listWorkersQuerySchema),
  asyncHandler(async (req, res) => {
    const query = req.validatedQuery as ListWorkersQuery;
    const workers = await workersService.listWorkers(query);
    res.json({ data: workers });
  }),
);
