import { z } from "zod";

const WORKER_STATUS_VALUES = ["ALIVE", "DRAINING", "DEAD"] as const;

export const listWorkersQuerySchema = z.object({
  status: z.enum(WORKER_STATUS_VALUES).optional(),
});

export type ListWorkersQuery = z.infer<typeof listWorkersQuerySchema>;
