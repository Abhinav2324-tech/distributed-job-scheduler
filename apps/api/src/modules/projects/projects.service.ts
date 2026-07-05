import { prisma } from "@jobscheduler/db";
import { notFound } from "../../lib/errors";
import { buildPaginationResult } from "../../lib/pagination";
import { slugify } from "../../lib/slug";
import type { CreateProjectInput, UpdateProjectInput } from "./projects.schemas";

async function generateUniqueProjectSlug(orgId: string, name: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  let attempt = 0;
  // eslint-disable-next-line no-await-in-loop
  while (await prisma.project.findUnique({ where: { orgId_slug: { orgId, slug } } })) {
    attempt += 1;
    slug = `${base}-${attempt}`;
  }
  return slug;
}

export async function createProject(orgId: string, input: CreateProjectInput) {
  const slug = await generateUniqueProjectSlug(orgId, input.name);
  return prisma.project.create({
    data: { orgId, name: input.name, description: input.description, slug },
  });
}

export async function listProjects(
  orgId: string,
  opts: { page: number; pageSize: number; includeArchived: boolean },
) {
  const where = { orgId, ...(opts.includeArchived ? {} : { archivedAt: null }) };
  const [data, totalItems] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (opts.page - 1) * opts.pageSize,
      take: opts.pageSize,
    }),
    prisma.project.count({ where }),
  ]);
  return buildPaginationResult(data, totalItems, opts.page, opts.pageSize);
}

export async function getProjectOrThrow(orgId: string, id: string) {
  const project = await prisma.project.findFirst({ where: { id, orgId } });
  if (!project) throw notFound("Project not found");
  return project;
}

export async function updateProject(orgId: string, id: string, input: UpdateProjectInput) {
  await getProjectOrThrow(orgId, id);
  return prisma.project.update({ where: { id }, data: input });
}

/**
 * "Deleting" a project never issues SQL DELETE - it archives the project and
 * cascades that archive flag to its non-archived queues. The Queue -> Job FK
 * is RESTRICT at the DB level, so job history can never be lost this way.
 */
export async function archiveProject(orgId: string, id: string) {
  await getProjectOrThrow(orgId, id);
  const now = new Date();
  const [project] = await prisma.$transaction([
    prisma.project.update({ where: { id }, data: { archivedAt: now } }),
    prisma.queue.updateMany({
      where: { projectId: id, archivedAt: null },
      data: { archivedAt: now },
    }),
  ]);
  return project;
}
