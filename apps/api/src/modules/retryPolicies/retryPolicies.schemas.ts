import { z } from "zod";

export const createRetryPolicySchema = z.object({
  name: z.string().min(1).max(100),
  maxRetries: z.number().int().min(0).max(50).default(3),
  backoffStrategy: z.enum(["FIXED", "LINEAR", "EXPONENTIAL"]).default("EXPONENTIAL"),
  baseDelaySeconds: z.number().int().min(1).max(86400).default(30),
  maxDelaySeconds: z.number().int().min(1).max(86400).default(3600),
});

export const updateRetryPolicySchema = createRetryPolicySchema.partial();

export type CreateRetryPolicyInput = z.infer<typeof createRetryPolicySchema>;
export type UpdateRetryPolicyInput = z.infer<typeof updateRetryPolicySchema>;
