import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import * as overviewService from "./overview.service";

export const overviewRouter = Router();
overviewRouter.use(requireAuth);

overviewRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const overview = await overviewService.getOverview(req.user!.orgId);
    res.json(overview);
  }),
);
