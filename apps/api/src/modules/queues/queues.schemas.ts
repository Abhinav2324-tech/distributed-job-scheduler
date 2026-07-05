import { z } from "zod";

export const createQueueSchema = z.object({
  name: z.string().min(1).max(100),
  priority: z.number().int().min(0).max(1000).default(0),
  maxConcurrency: z.number().int().min(1).max(1000).default(5),
  retryPolicyId: z.string().uuid().optional(),
});

export const updateQueueSchema = z.object({
  priority: z.number().int().min(0).max(1000).optional(),
  maxConcurrency: z.number().int().min(1).max(1000).optional(),
  retryPolicyId: z.string().uuid().nullable().optional(),
});

export const listQueuesQuerySchema = z.object({
  includeArchived: z.coerce.boolean().default(false),
});

export const listAllQueuesQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  includeArchived: z.coerce.boolean().default(false),
});

export type CreateQueueInput = z.infer<typeof createQueueSchema>;
export type UpdateQueueInput = z.infer<typeof updateQueueSchema>;
export type ListQueuesQuery = z.infer<typeof listQueuesQuerySchema>;
export type ListAllQueuesQuery = z.infer<typeof listAllQueuesQuerySchema>;
