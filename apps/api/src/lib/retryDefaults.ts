import type { BackoffStrategy } from "@jobscheduler/db";

// Applied when a queue has no retryPolicyId set. Mirrors RetryPolicy's own
// column defaults in packages/db/prisma/schema.prisma.
export const SYSTEM_DEFAULT_RETRY = {
  maxRetries: 3,
  backoffStrategy: "EXPONENTIAL" as BackoffStrategy,
  baseDelaySeconds: 30,
  maxDelaySeconds: 3600,
};

interface RetryPolicyLike {
  maxRetries: number;
  backoffStrategy: BackoffStrategy;
  baseDelaySeconds: number;
  maxDelaySeconds: number;
}

/**
 * Jobs snapshot their retry contract from the queue's policy at creation
 * time (see schema.prisma design notes) so later edits to the policy don't
 * retroactively change in-flight jobs' behavior.
 */
export function retryFieldsFromPolicy(policy: RetryPolicyLike | null) {
  if (!policy) return SYSTEM_DEFAULT_RETRY;
  return {
    maxRetries: policy.maxRetries,
    backoffStrategy: policy.backoffStrategy,
    baseDelaySeconds: policy.baseDelaySeconds,
    maxDelaySeconds: policy.maxDelaySeconds,
  };
}
