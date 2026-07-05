import type { BackoffStrategy } from "@jobscheduler/db";

/**
 * attemptNumber is 1-indexed and refers to the retry count *after* this
 * failure (i.e. "this is the Nth retry"), not the raw attempt/execution
 * count - so the first retry after the original attempt uses
 * attemptNumber=1, matching how job.retryCount is incremented in
 * handleJobFailure.
 */
export function computeBackoffDelaySeconds(
  strategy: BackoffStrategy,
  attemptNumber: number,
  baseDelaySeconds: number,
  maxDelaySeconds: number,
): number {
  let delay: number;
  switch (strategy) {
    case "FIXED":
      delay = baseDelaySeconds;
      break;
    case "LINEAR":
      delay = baseDelaySeconds * attemptNumber;
      break;
    case "EXPONENTIAL":
      delay = baseDelaySeconds * 2 ** (attemptNumber - 1);
      break;
    default:
      delay = baseDelaySeconds;
  }
  return Math.min(delay, maxDelaySeconds);
}
