import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateBody, validateQuery } from "../../middleware/validate";
import { queuesRouterForProject } from "../queues/queues.routes";
import { retryPoliciesRouterForProject } from "../retryPolicies/retryPolicies.routes";
import {
  createProjectSchema,
  listProjectsQuerySchema,
  updateProjectSchema,
  type ListProjectsQuery,
} from "./projects.schemas";
import * as projectsService from "./projects.service";

export const projectsRouter = Router();
projectsRouter.use(requireAuth);

projectsRouter.post(
  "/",
  validateBody(createProjectSchema),
  asyncHandler(async (req, res) => {
    const project = await projectsService.createProject(req.user!.orgId, req.body);
    res.status(201).json(project);
  }),
);

projectsRouter.get(
  "/",
  validateQuery(listProjectsQuerySchema),
  asyncHandler(async (req, res) => {
    const query = req.validatedQuery as ListProjectsQuery;
    const result = await projectsService.listProjects(req.user!.orgId, query);
    res.json(result);
  }),
);

projectsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const project = await projectsService.getProjectOrThrow(req.user!.orgId, req.params.id!);
    res.json(project);
  }),
);

projectsRouter.patch(
  "/:id",
  validateBody(updateProjectSchema),
  asyncHandler(async (req, res) => {
    const project = await projectsService.updateProject(req.user!.orgId, req.params.id!, req.body);
    res.json(project);
  }),
);

// Archiving a project is destructive-ish (cascades to queues), so it's the
// one action in this module gated by role rather than open to any org member.
projectsRouter.delete(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const project = await projectsService.archiveProject(req.user!.orgId, req.params.id!);
    res.json(project);
  }),
);

projectsRouter.use("/:projectId/queues", queuesRouterForProject);
projectsRouter.use("/:projectId/retry-policies", retryPoliciesRouterForProject);
