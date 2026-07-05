import { z } from "zod";

export const listDeadLetterQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  queueId: z.string().uuid().optional(),
  includeResolved: z.coerce.boolean().default(false),
});

export type ListDeadLetterQuery = z.infer<typeof listDeadLetterQuerySchema>;
