import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { validateBody, validateQuery } from "../../middleware/validate";
import {
  createJobSchema,
  createJobsBatchSchema,
  listJobsQuerySchema,
  type ListJobsQuery,
} from "./jobs.schemas";
import * as jobsService from "./jobs.service";

export const jobsRouterForQueue = Router({ mergeParams: true });
jobsRouterForQueue.use(requireAuth);

jobsRouterForQueue.post(
  "/",
  validateBody(createJobSchema),
  asyncHandler(async (req, res) => {
    const result = await jobsService.createJob(req.user!.orgId, req.params.queueId!, req.body);
    res.status(result.deduped ? 200 : 201).json(result);
  }),
);

jobsRouterForQueue.post(
  "/batch",
  validateBody(createJobsBatchSchema),
  asyncHandler(async (req, res) => {
    const results = await jobsService.createJobsBatch(
      req.user!.orgId,
      req.params.queueId!,
      req.body.jobs,
    );
    res.status(201).json({ results });
  }),
);

export const jobsRouter = Router();
jobsRouter.use(requireAuth);

jobsRouter.get(
  "/",
  validateQuery(listJobsQuerySchema),
  asyncHandler(async (req, res) => {
    const query = req.validatedQuery as ListJobsQuery;
    const result = await jobsService.listJobs(req.user!.orgId, query);
    res.json(result);
  }),
);

jobsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const job = await jobsService.getJobOrThrow(req.user!.orgId, req.params.id!);
    res.json(job);
  }),
);
