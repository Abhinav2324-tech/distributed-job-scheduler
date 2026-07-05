import { prisma, type Prisma } from "@jobscheduler/db";
import { notFound } from "../../lib/errors";
import { computeNextRunAt } from "../../lib/cron";
import type { CreateScheduledJobInput, UpdateScheduledJobInput } from "./scheduledJobs.schemas";

async function assertQueueInOrg(orgId: string, queueId: string) {
  const queue = await prisma.queue.findFirst({ where: { id: queueId, project: { orgId } } });
  if (!queue) throw notFound("Queue not found");
  return queue;
}

export async function createScheduledJob(
  orgId: string,
  queueId: string,
  input: CreateScheduledJobInput,
) {
  await assertQueueInOrg(orgId, queueId);
  const nextRunAt = computeNextRunAt(input.cronExpression, new Date());
  return prisma.scheduledJob.create({
    data: {
      queueId,
      name: input.name,
      cronExpression: input.cronExpression,
      jobType: input.jobType,
      payloadTemplate: input.payloadTemplate as Prisma.InputJsonValue,
      nextRunAt,
    },
  });
}

export async function listScheduledJobs(orgId: string, queueId: string) {
  await assertQueueInOrg(orgId, queueId);
  return prisma.scheduledJob.findMany({ where: { queueId }, orderBy: { createdAt: "desc" } });
}

export async function getScheduledJobOrThrow(orgId: string, id: string) {
  const scheduledJob = await prisma.scheduledJob.findFirst({
    where: { id, queue: { project: { orgId } } },
  });
  if (!scheduledJob) throw notFound("Scheduled job not found");
  return scheduledJob;
}

export async function updateScheduledJob(
  orgId: string,
  id: string,
  input: UpdateScheduledJobInput,
) {
  const scheduledJob = await getScheduledJobOrThrow(orgId, id);
  const { payloadTemplate, ...rest } = input;
  const data: Prisma.ScheduledJobUpdateInput = { ...rest };
  if (payloadTemplate !== undefined) {
    data.payloadTemplate = payloadTemplate as Prisma.InputJsonValue;
  }
  if (input.cronExpression) {
    data.nextRunAt = computeNextRunAt(input.cronExpression, new Date());
  }
  return prisma.scheduledJob.update({ where: { id: scheduledJob.id }, data });
}

export async function deleteScheduledJob(orgId: string, id: string) {
  await getScheduledJobOrThrow(orgId, id);
  await prisma.scheduledJob.delete({ where: { id } });
}
