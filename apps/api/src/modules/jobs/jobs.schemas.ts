import { z } from "zod";

export const createJobSchema = z.object({
  jobType: z.string().min(1).max(100),
  payload: z.unknown().optional().default({}),
  runAt: z.coerce.date().optional(),
  idempotencyKey: z.string().min(1).max(255).optional(),
});

export const createJobsBatchSchema = z.object({
  jobs: z.array(createJobSchema).min(1).max(500),
});

const JOB_STATUS_VALUES = [
  "QUEUED",
  "SCHEDULED",
  "CLAIMED",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "DEAD_LETTER",
] as const;

export const listJobsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(JOB_STATUS_VALUES).optional(),
  queueId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type CreateJobsBatchInput = z.infer<typeof createJobsBatchSchema>;
export type ListJobsQuery = z.infer<typeof listJobsQuerySchema>;
