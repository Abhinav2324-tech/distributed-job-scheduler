import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { validateBody, validateQuery } from "../../middleware/validate";
import {
  createQueueSchema,
  listAllQueuesQuerySchema,
  listQueuesQuerySchema,
  updateQueueSchema,
  type ListAllQueuesQuery,
  type ListQueuesQuery,
} from "./queues.schemas";
import * as queuesService from "./queues.service";

export const queuesRouterForProject = Router({ mergeParams: true });
queuesRouterForProject.use(requireAuth);

queuesRouterForProject.post(
  "/",
  validateBody(createQueueSchema),
  asyncHandler(async (req, res) => {
    const queue = await queuesService.createQueue(req.user!.orgId, req.params.projectId!, req.body);
    res.status(201).json(queue);
  }),
);

queuesRouterForProject.get(
  "/",
  validateQuery(listQueuesQuerySchema),
  asyncHandler(async (req, res) => {
    const query = req.validatedQuery as ListQueuesQuery;
    const queues = await queuesService.listQueues(
      req.user!.orgId,
      req.params.projectId!,
      query.includeArchived,
    );
    res.json(queues);
  }),
);

export const queuesRouter = Router();
queuesRouter.use(requireAuth);

queuesRouter.get(
  "/",
  validateQuery(listAllQueuesQuerySchema),
  asyncHandler(async (req, res) => {
    const query = req.validatedQuery as ListAllQueuesQuery;
    const queues = await queuesService.listAllQueues(req.user!.orgId, query);
    res.json({ data: queues });
  }),
);

queuesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const queue = await queuesService.getQueueOrThrow(req.user!.orgId, req.params.id!);
    res.json(queue);
  }),
);

queuesRouter.patch(
  "/:id",
  validateBody(updateQueueSchema),
  asyncHandler(async (req, res) => {
    const queue = await queuesService.updateQueue(req.user!.orgId, req.params.id!, req.body);
    res.json(queue);
  }),
);

queuesRouter.post(
  "/:id/pause",
  asyncHandler(async (req, res) => {
    const queue = await queuesService.setPaused(req.user!.orgId, req.params.id!, true);
    res.json(queue);
  }),
);

queuesRouter.post(
  "/:id/resume",
  asyncHandler(async (req, res) => {
    const queue = await queuesService.setPaused(req.user!.orgId, req.params.id!, false);
    res.json(queue);
  }),
);

queuesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const queue = await queuesService.archiveQueue(req.user!.orgId, req.params.id!);
    res.json(queue);
  }),
);

queuesRouter.get(
  "/:id/stats",
  asyncHandler(async (req, res) => {
    const stats = await queuesService.getQueueStats(req.user!.orgId, req.params.id!);
    res.json(stats);
  }),
);
