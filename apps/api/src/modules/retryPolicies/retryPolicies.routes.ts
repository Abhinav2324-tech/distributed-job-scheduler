import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { createRetryPolicySchema, updateRetryPolicySchema } from "./retryPolicies.schemas";
import * as retryPoliciesService from "./retryPolicies.service";

export const retryPoliciesRouterForProject = Router({ mergeParams: true });
retryPoliciesRouterForProject.use(requireAuth);

retryPoliciesRouterForProject.post(
  "/",
  validateBody(createRetryPolicySchema),
  asyncHandler(async (req, res) => {
    const policy = await retryPoliciesService.createRetryPolicy(
      req.user!.orgId,
      req.params.projectId!,
      req.body,
    );
    res.status(201).json(policy);
  }),
);

retryPoliciesRouterForProject.get(
  "/",
  asyncHandler(async (req, res) => {
    const policies = await retryPoliciesService.listRetryPolicies(
      req.user!.orgId,
      req.params.projectId!,
    );
    res.json(policies);
  }),
);

export const retryPoliciesRouter = Router();
retryPoliciesRouter.use(requireAuth);

retryPoliciesRouter.patch(
  "/:id",
  validateBody(updateRetryPolicySchema),
  asyncHandler(async (req, res) => {
    const policy = await retryPoliciesService.updateRetryPolicy(
      req.user!.orgId,
      req.params.id!,
      req.body,
    );
    res.json(policy);
  }),
);
