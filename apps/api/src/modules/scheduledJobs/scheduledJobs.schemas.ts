import { z } from "zod";

export const createScheduledJobSchema = z.object({
  name: z.string().min(1).max(100),
  cronExpression: z.string().min(1).max(100),
  jobType: z.string().min(1).max(100),
  payloadTemplate: z.unknown().optional().default({}),
});

export const updateScheduledJobSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  cronExpression: z.string().min(1).max(100).optional(),
  jobType: z.string().min(1).max(100).optional(),
  payloadTemplate: z.unknown().optional(),
  isActive: z.boolean().optional(),
});

export type CreateScheduledJobInput = z.infer<typeof createScheduledJobSchema>;
export type UpdateScheduledJobInput = z.infer<typeof updateScheduledJobSchema>;
