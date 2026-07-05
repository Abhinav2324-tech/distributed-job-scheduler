import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { createScheduledJobSchema, updateScheduledJobSchema } from "./scheduledJobs.schemas";
import * as scheduledJobsService from "./scheduledJobs.service";

export const scheduledJobsRouterForQueue = Router({ mergeParams: true });
scheduledJobsRouterForQueue.use(requireAuth);

scheduledJobsRouterForQueue.post(
  "/",
  validateBody(createScheduledJobSchema),
  asyncHandler(async (req, res) => {
    const scheduledJob = await scheduledJobsService.createScheduledJob(
      req.user!.orgId,
      req.params.queueId!,
      req.body,
    );
    res.status(201).json(scheduledJob);
  }),
);

scheduledJobsRouterForQueue.get(
  "/",
  asyncHandler(async (req, res) => {
    const scheduledJobs = await scheduledJobsService.listScheduledJobs(
      req.user!.orgId,
      req.params.queueId!,
    );
    res.json(scheduledJobs);
  }),
);

export const scheduledJobsRouter = Router();
scheduledJobsRouter.use(requireAuth);

scheduledJobsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const scheduledJob = await scheduledJobsService.getScheduledJobOrThrow(
      req.user!.orgId,
      req.params.id!,
    );
    res.json(scheduledJob);
  }),
);

scheduledJobsRouter.patch(
  "/:id",
  validateBody(updateScheduledJobSchema),
  asyncHandler(async (req, res) => {
    const scheduledJob = await scheduledJobsService.updateScheduledJob(
      req.user!.orgId,
      req.params.id!,
      req.body,
    );
    res.json(scheduledJob);
  }),
);

scheduledJobsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await scheduledJobsService.deleteScheduledJob(req.user!.orgId, req.params.id!);
    res.status(204).send();
  }),
);
