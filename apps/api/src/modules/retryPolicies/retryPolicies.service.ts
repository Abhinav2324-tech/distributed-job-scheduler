import { prisma } from "@jobscheduler/db";
import { conflict, notFound } from "../../lib/errors";
import type { CreateRetryPolicyInput, UpdateRetryPolicyInput } from "./retryPolicies.schemas";

export async function assertProjectInOrg(orgId: string, projectId: string) {
  const project = await prisma.project.findFirst({ where: { id: projectId, orgId } });
  if (!project) throw notFound("Project not found");
  return project;
}

export async function createRetryPolicy(
  orgId: string,
  projectId: string,
  input: CreateRetryPolicyInput,
) {
  await assertProjectInOrg(orgId, projectId);
  try {
    return await prisma.retryPolicy.create({ data: { projectId, ...input } });
  } catch (err: unknown) {
    if (isUniqueConstraintError(err)) {
      throw conflict(`A retry policy named "${input.name}" already exists in this project`);
    }
    throw err;
  }
}

export async function listRetryPolicies(orgId: string, projectId: string) {
  await assertProjectInOrg(orgId, projectId);
  return prisma.retryPolicy.findMany({ where: { projectId }, orderBy: { createdAt: "desc" } });
}

export async function updateRetryPolicy(orgId: string, id: string, input: UpdateRetryPolicyInput) {
  const policy = await prisma.retryPolicy.findFirst({ where: { id, project: { orgId } } });
  if (!policy) throw notFound("Retry policy not found");
  return prisma.retryPolicy.update({ where: { id }, data: input });
}

function isUniqueConstraintError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}
